import { Worker } from 'bullmq';
import { prisma } from '@inbox-pilot/db';
import { redisConnection, followupQueue } from './queue.js';
import { sendEmail } from '../email/sender.js';
import { config } from '../config.js';
import { broadcast } from '../ws/broadcaster.js';

export function startFollowupWorker() {
  const worker = new Worker(
    'followup',
    async (job) => {
      const { inquiryId, sequenceNum } = job.data as { inquiryId: string; sequenceNum: number };

      const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      if (!inquiry || inquiry.status !== 'SENT') return; // already replied or cancelled

      if (sequenceNum > config.FOLLOWUP_MAX_COUNT) return;

      const followupText = sequenceNum === 1
        ? `Hi ${inquiry.fromName?.split(' ')[0] ?? 'there'},\n\nJust following up on the quote we sent a couple of days ago. Happy to answer any questions or adjust anything. Let us know!\n\nBest,\nThe Sales Team`
        : `Hi ${inquiry.fromName?.split(' ')[0] ?? 'there'},\n\nThis is our final follow-up regarding your recent inquiry. The quote is still valid — feel free to reach out anytime.\n\nBest,\nThe Sales Team`;

      await sendEmail({
        to: inquiry.fromEmail,
        subject: `Re: ${inquiry.subject} — Following Up`,
        body: followupText,
      });

      await prisma.followUp.create({
        data: { inquiryId, sequenceNum, scheduledAt: new Date(), sentAt: new Date(), status: 'SENT' },
      });
      await prisma.activityLog.create({
        data: { inquiryId, eventType: 'FOLLOWUP_SENT', payload: { sequenceNum } },
      });
      broadcast({ type: 'FOLLOWUP_SENT', payload: { inquiryId, sequenceNum } });

      // Queue next follow-up if under max
      if (sequenceNum < config.FOLLOWUP_MAX_COUNT) {
        await followupQueue.add(
          'followup',
          { inquiryId, sequenceNum: sequenceNum + 1 },
          { delay: config.FOLLOWUP_DELAY_DAYS * 24 * 60 * 60 * 1000 },
        );
      }
    },
    { connection: redisConnection },
  );

  console.log('[followup-worker] Started');
  return worker;
}
