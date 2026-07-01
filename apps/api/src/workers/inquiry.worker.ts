import { Worker } from 'bullmq';
import { runAgentChain } from '@inbox-pilot/agent';
import { prisma } from '@inbox-pilot/db';
import { redisConnection, followupQueue } from './queue.js';
import { broadcast } from '../ws/broadcaster.js';
import { renderQuotePdf } from '../pdf/renderer.js';
import { sendEmail } from '../email/sender.js';
import { config } from '../config.js';
import { getConfidenceThreshold } from '../routes/settings.js';
import type { AgentStepEvent } from '@inbox-pilot/agent';

export function startInquiryWorker() {
  const worker = new Worker(
    'inquiry',
    async (job) => {
      const { inquiryId } = job.data as { inquiryId: string };
      const inquiry = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiryId } });

      await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'PROCESSING' } });
      broadcast({ type: 'INQUIRY_PROCESSING', payload: { id: inquiryId, fromEmail: inquiry.fromEmail, subject: inquiry.subject } });

      const agentRun = await prisma.agentRun.create({ data: { inquiryId } });

      // Broadcast each step the moment it starts/completes — this is what drives the live UI
      const onStep = (event: AgentStepEvent) => {
        broadcast({ type: 'AGENT_STEP', payload: event });
      };

      try {
        const confidenceThreshold = await getConfidenceThreshold();
        const output = await runAgentChain(
          {
            inquiryId,
            fromEmail: inquiry.fromEmail,
            fromName: inquiry.fromName ?? undefined,
            subject: inquiry.subject,
            bodyText: inquiry.bodyText,
          },
          { onStep, confidenceThreshold },
        );

        // Persist full step traces to DB for the reasoning trace viewer
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
          broadcast({ type: 'INQUIRY_ESCALATED', payload: { id: inquiryId, reason: output.escalateReason, confidence: output.confidence } });
          return;
        }

        // Generate PDF
        const quote = await prisma.quote.findUnique({ where: { inquiryId } });
        if (quote && output.draftQuote) {
          try {
            const pdfPath = await renderQuotePdf(quote, inquiry, output.draftQuote);
            await prisma.quote.update({ where: { id: quote.id }, data: { pdfPath, coverEmail: output.email?.body } });
            broadcast({ type: 'QUOTE_PDF_READY', payload: { inquiryId, quoteId: quote.id } });
          } catch (pdfErr) {
            console.error('[pdf] render failed:', pdfErr);
            // Non-fatal — proceed without PDF
          }
        }

        // Auto-send the quote
        console.log(`[worker] output.email=${!!output.email} output.draftQuote=${!!output.draftQuote}`);
        if (output.email && output.draftQuote) {
          await sendEmail({
            to: inquiry.fromEmail,
            toName: inquiry.fromName ?? undefined,
            subject: output.email.subject,
            body: output.email.body,
          });

          await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'SENT' } });
          if (quote) {
            await prisma.quote.update({ where: { id: quote.id }, data: { status: 'SENT', sentAt: new Date() } });
          }
          await prisma.activityLog.create({ data: { inquiryId, eventType: 'QUOTE_SENT', payload: { to: inquiry.fromEmail, total: output.draftQuote.total } } });
          broadcast({
            type: 'QUOTE_SENT',
            payload: {
              id: inquiryId,
              quoteId: quote?.id,
              total: output.draftQuote.total,
              currency: output.draftQuote.currency,
              to: inquiry.fromEmail,
            },
          });

          // Schedule follow-up (non-fatal — Redis hiccups shouldn't un-send a quote)
          try {
            await followupQueue.add(
              'followup',
              { inquiryId, sequenceNum: 1 },
              { delay: config.FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000 },
            );
          } catch (fErr) {
            console.warn('[worker] followup queue enqueue failed (non-fatal):', fErr);
          }
        } else {
          console.warn(`[worker] inquiry ${inquiryId} — agent completed but no email/quote output. Marking FAILED.`);
          await prisma.inquiry.update({ where: { id: inquiryId }, data: { status: 'FAILED' } });
          await prisma.activityLog.create({ data: { inquiryId, eventType: 'AGENT_FAILED', payload: { error: 'Agent returned no email output after completing all steps' } } });
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

  worker.on('failed', (job, err) => console.error('[inquiry-worker] Job failed:', job?.id, err.message));
  console.log('[inquiry-worker] Started');
  return worker;
}
