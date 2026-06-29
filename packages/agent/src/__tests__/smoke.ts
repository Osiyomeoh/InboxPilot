import 'dotenv/config';
import { runAgentChain } from '../index.js';

const sampleEmail = {
  inquiryId: 'test-inquiry-001',
  fromEmail: 'alice@acmecorp.com',
  fromName: 'Alice Johnson',
  subject: 'Price quote needed for WIDGET-A x50',
  bodyText: `Hi team,

We need a quote for 50 units of WIDGET-A as soon as possible.
We have a project deadline in 3 weeks and need to confirm pricing today.

Please include delivery timeline.

Thanks,
Alice Johnson
Procurement Manager, Acme Corp`,
};

console.log('[smoke] Starting agent chain with sample email...\n');

try {
  const output = await runAgentChain(sampleEmail);
  console.log('\n[smoke] Agent chain complete!');
  console.log('  Escalated:', output.escalated);
  console.log('  Confidence:', output.confidence);
  console.log('  Steps completed:', output.traces.length);
  console.log('\nStep traces:');
  for (const t of output.traces) {
    console.log(`  Step ${t.stepNumber} (${t.stepName}): ${t.durationMs}ms — ${t.model}`);
  }
  if (output.email) {
    console.log('\nCover email subject:', output.email.subject);
  }
  if (output.draftQuote) {
    console.log('Quote total: $' + output.draftQuote.total);
  }
} catch (err) {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
}
