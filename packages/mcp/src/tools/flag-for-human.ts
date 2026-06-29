import { prisma } from '@inbox-pilot/db';

export async function flagForHuman(
  inquiryId: string,
  reason: string,
  confidence: number,
) {
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status: 'AWAITING_APPROVAL' },
  });

  await prisma.agentRun.updateMany({
    where: { inquiryId },
    data: { escalated: true, escalateReason: reason, confidence },
  });

  await prisma.activityLog.create({
    data: {
      inquiryId,
      eventType: 'ESCALATED_TO_HUMAN',
      payload: { reason, confidence },
    },
  });

  return { escalated: true, inquiryId, reason, confidence };
}
