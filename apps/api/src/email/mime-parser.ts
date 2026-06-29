import { simpleParser } from 'mailparser';

export interface EmailPayload {
  messageId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
}

export async function parseMime(raw: Buffer | string): Promise<EmailPayload> {
  const parsed = await simpleParser(raw);

  const from = Array.isArray(parsed.from?.value) ? parsed.from!.value[0] : parsed.from?.value;
  const fromEmail = from?.address ?? 'unknown@unknown.com';
  const fromName = from?.name ?? undefined;

  const messageId = parsed.messageId ?? `generated-${Date.now()}@inboxpilot`;

  return {
    messageId,
    fromEmail,
    fromName,
    subject: parsed.subject ?? '(no subject)',
    bodyText: parsed.text ?? '',
    bodyHtml: parsed.html || undefined,
    receivedAt: parsed.date ?? new Date(),
  };
}
