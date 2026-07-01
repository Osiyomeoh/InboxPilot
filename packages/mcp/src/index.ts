import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { toolManifest } from './manifest.js';
import { getPricing } from './tools/get-pricing.js';
import { lookupCustomer } from './tools/lookup-customer.js';
import { createQuote } from './tools/create-quote.js';
import { checkCalendar } from './tools/check-calendar.js';
import { flagForHuman } from './tools/flag-for-human.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.addHook('preHandler', (req, reply, done) => {
  const key = req.headers['x-mcp-key'];
  if (key !== process.env.MCP_API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  done();
});

app.get('/tools', async () => toolManifest);

app.post<{ Params: { toolName: string }; Body: Record<string, unknown> }>(
  '/call/:toolName',
  async (req, reply) => {
    const { toolName } = req.params;
    const args = req.body;

    try {
      let result: unknown;

      switch (toolName) {
        case 'get_pricing': {
          // Qwen sometimes sends sku/productName/product_name instead of product
          const product = (args.product ?? args.sku ?? args.productName ?? args.product_name ?? 'UNKNOWN') as string;
          const qty = Number(args.qty ?? args.quantity ?? args.qty_requested ?? 1);
          result = getPricing(product, qty);
          break;
        }
        case 'lookup_customer': {
          // Qwen sometimes sends customerEmail instead of email — accept either
          const email = (args.email ?? args.customerEmail ?? args.customer_email ?? '') as string;
          result = lookupCustomer(email);
          break;
        }
        case 'create_quote':
          result = await createQuote(
            args.inquiryId as string,
            args.lineItems as Parameters<typeof createQuote>[1],
            args.currency as string | undefined,
          );
          break;
        case 'check_calendar':
          result = checkCalendar(args.startDate as string, args.endDate as string);
          break;
        case 'flag_for_human':
          result = await flagForHuman(
            args.inquiryId as string,
            args.reason as string,
            args.confidence as number,
          );
          break;
        default:
          reply.code(404).send({ error: `Unknown tool: ${toolName}` });
          return;
      }

      return { ok: true, result };
    } catch (err) {
      reply.code(500).send({ ok: false, error: String(err) });
    }
  },
);

const port = Number(process.env.MCP_PORT ?? 4001);
await app.listen({ port, host: '0.0.0.0' });
console.log(`MCP server listening on port ${port}`);
