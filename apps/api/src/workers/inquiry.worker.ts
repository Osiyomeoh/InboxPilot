import { Worker } from 'bullmq';
import { runAgentChain } from '@inbox-pilot/agent';
import { prisma } from '@inbox-pilot/db';
import { redisConnection, followupQueue } from './queue.js';
import { broadcast } from '../ws/broadcaster.js';
import { renderQuotePdf } from '../pdf/renderer.js';
import { sendEmail } from '../email/sender.js';
import { config } from '../config.js';

export function startInquiryWorker() {
  const worker = new Worker(
    'inquiry',
    async (job) => {
      const { inquiryId } = job.data as { inquiryId: string };

      const inquiry = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });

      // Mark as processing
      await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'PROCESSING' } });
      broadcast({ type: 'INQUIRY_PROCESSING', payload: { id: inquiryId } });

      // Create agent run record
      const agentRun = await prisma.agentRun.create({ data: { inquiryId } });

      try {
        const output = await runAgentChain({
          inquiryId,
          fromEmail: inquiry.fromEmail,
          fromName: inquiry.fromName ?? undefined,
          subject: inquiry.subject,
          bodyText: inquiry.bodyText,
        });

        // Persist step traces
        for (const trace of output.traces) {
          await prisma.stepTrace.create({
            data: {
              agentRunId: agentRun.id,
              stepNumber: trace.stepNumber,
              stepName: trace.stepName,
              model: trace.model,
              promptTokens: trace.promptTokens,
              completionTokens: trace.completionTokens,
              inputJson: trace.inputJson as object,
              outputJson: trace.outputJson as object,
              durationMs: trace.durationMs,
            },
          });
        }

        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: 'COMPLETE',
            currentStep: output.traces.length,
            escalated: output.escalated,
            escalateReason: output.escalateReason ?? null,
            confidence: output.confidence,
            completedAt: new Date(),
          },
        });

        if (output.escalated) {
          await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'AWAITING_APPROVAL' } });
          await prisma.activityLog.create({ data: { inquiryId, eventType: 'AWAITING_APPROVAL', payload: { reason: output.escalateReason } } });
          broadcast({ type: 'INQUIRY_ESCALATED', payload: { id: inquiryId, reason: output.escalateReason } });
          return;
        }

        // Generate PDF
        const quote = await prisma.quote.findUnique({ where: { inquiryId } });
        if (quote) {
          const pdfPath = await renderQuotePdf(quote, inquiry, output.draftQuote!);
          await prisma.quote.update({ where: { id: quote.id }, data: { pdfPath, coverEmail: output.email?.body } });
        }

        // Auto-send
        if (output.email && output.draftQuote) {
          await sendEmail({
            to: inquiry.fromEmail,
            toName: inquiry.fromName ?? undefined,
            subject: output.email.subject,
            body: output.email.body,
          });

          await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'SENT' } });
          if (quote) await prisma.quote.update({ where: { id: quote.id }, data: { status: 'SENT', sentAt: new Date() } });
          await prisma.activityLog.create({ data: { inquiryId, eventType: 'QUOTE_SENT', payload: { to: inquiry.fromEmail } } });
          broadcast({ type: 'QUOTE_SENT', payload: { id: inquiryId } });

          // Schedule follow-up
          await followupQueue.add(
            'followup',
            { inquiryId, sequenceNum: 1 },
            { delay: config.FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000 },
          );
        }
      } catch (err) {
        await prisma.agentRun.update({ where: { id: agentRun.id }, data: { status: 'FAILED', completedAt: new Date() } });
        await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'FAILED' } });
        await prisma.activityLog.create({ data: { inquiryId, eventType: 'AGENT_FAILED', payload: { error: String(err) } } });
        broadcast({ type: 'INQUIRY_FAILED', payload: { id: inquiryId, error: String(err) } });
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 5 },
  );

  worker.on('failed', (job, err) => {
    console.error('[inquiry-worker] Job failed:', job?.id, err.message);
  });

  console.log('[inquiry-worker] Started');
  return worker;
}
