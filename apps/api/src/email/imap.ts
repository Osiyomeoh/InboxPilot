import Imap from 'imap';
import { parseMime } from './mime-parser.js';
import { isDedup } from './dedup.js';
import { inquiryQueue } from '../workers/queue.js';
import { prisma } from '@inbox-pilot/db';
import { broadcast } from '../ws/broadcaster.js';

let imapInstance: Imap | null = null;

export function startImapPolling() {
  const host = process.env.IMAP_HOST;
  if (!host) {
    console.log('[imap] IMAP_HOST not set — skipping IMAP polling');
    return;
  }

  const imap = new Imap({
    user: process.env.IMAP_USER!,
    password: process.env.IMAP_PASS!,
    host,
    port: Number(process.env.IMAP_PORT ?? 993),
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  });

  imapInstance = imap;

  imap.once('ready', () => {
    console.log('[imap] Connected');
    checkInbox(imap);
    setInterval(() => checkInbox(imap), 60_000);
  });

  imap.once('error', (err: Error) => console.error('[imap] Error:', err));
  imap.once('end', () => console.log('[imap] Connection ended'));

  imap.connect();
}

function checkInbox(imap: Imap) {
  imap.openBox('INBOX', false, (err, box) => {
    if (err) { console.error('[imap] openBox error:', err); return; }

    imap.search(['UNSEEN'], async (err, results) => {
      if (err || !results?.length) return;

      const fetch = imap.fetch(results, { bodies: '' });

      fetch.on('message', (msg) => {
        const buffers: Buffer[] = [];

        msg.on('body', (stream) => {
          stream.on('data', (chunk: Buffer) => buffers.push(chunk));
          stream.on('end', async () => {
            const raw = Buffer.concat(buffers);
            try {
              const email = await parseMime(raw);
              if (await isDedup(email.messageId)) return;

              const inquiry = await prisma.inquiry.create({ data: email });
              await inquiryQueue.add('process', { inquiryId: inquiry.id }, { jobId: inquiry.id, removeOnComplete: true, removeOnFail: true });
              broadcast({ type: 'EMAIL_RECEIVED', payload: { id: inquiry.id, fromEmail: email.fromEmail, subject: email.subject } });
              console.log('[imap] Queued inquiry', inquiry.id);
            } catch (e) {
              console.error('[imap] parse error:', e);
            }
          });
        });
      });
    });
  });
}
