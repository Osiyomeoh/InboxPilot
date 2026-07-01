interface SendOptions {
  to: string;
  toName?: string;
  subject: string;
  body: string;
}

export async function sendEmail(opts: SendOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? 'noreply@inboxpilot.dev';

  if (!apiKey || apiKey.startsWith('re_...') || apiKey === 'placeholder') {
    console.log('[email] RESEND_API_KEY not set — logging email instead:');
    console.log(`  To: ${opts.to}\n  Subject: ${opts.subject}\n  Body:\n${opts.body}`);
    return { id: `mock-${Date.now()}` };
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const result = await resend.emails.send({
    from,
    to: opts.toName ? `${opts.toName} <${opts.to}>` : opts.to,
    subject: opts.subject,
    text: opts.body,
  });

  return result;
}
