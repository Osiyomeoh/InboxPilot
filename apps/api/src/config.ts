import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  QWEN_API_KEY: z.string(),
  QWEN_BASE_URL: z.string().default('https://dashscope.aliyuncs.com/compatible-mode/v1'),
  IMAP_HOST: z.string().optional(),
  IMAP_PORT: z.coerce.number().default(993),
  IMAP_USER: z.string().optional(),
  IMAP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  FROM_EMAIL: z.string().default('noreply@inboxpilot.dev'),
  MCP_SERVER_URL: z.string().default('http://localhost:4001'),
  MCP_API_KEY: z.string().default('internal-secret'),
  JWT_SECRET: z.string().default('dev-secret'),
  PDF_OUTPUT_DIR: z.string().default('/tmp/inbox-pilot/pdfs'),
  CONFIDENCE_THRESHOLD: z.coerce.number().default(0.8),
  FOLLOWUP_DELAY_DAYS: z.coerce.number().default(2),
  FOLLOWUP_MAX_COUNT: z.coerce.number().default(2),
  PORT: z.coerce.number().default(3001),
});

export const config = schema.parse(process.env);
