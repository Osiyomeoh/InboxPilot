import { chat, parseJson } from '../qwen-client.js';
import type { AgentInput, IntakeResult, DraftQuoteResult, QAResult, StepTrace } from '../types.js';

export async function stepQA(
  input: AgentInput,
  intake: IntakeResult,
  draftQuote: DraftQuoteResult,
): Promise<{ result: QAResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are a sales quality assurance reviewer. Check this draft quote against the original customer inquiry.

Original email subject: ${input.subject}
Products requested: ${JSON.stringify(intake.products)}

Draft quote:
${JSON.stringify(draftQuote, null, 2)}

Check ONLY:
1. Does the quote include ALL products the customer requested? (fail if any product is completely missing)
2. Are quantities reasonable for each product?
3. Is the quote professionally structured (has line items, currency, validity date)?

Do NOT check arithmetic — pricing is handled by our pricing engine and is correct.
Do NOT fail for minor formatting issues.

Return JSON only:
{
  "passed": true,
  "issues": [],
  "overallQuality": "excellent"
}`;

  const { content, usage } = await chat('qwen-turbo', [{ role: 'user', content: prompt }]);
  const result = parseJson<QAResult>(content);

  return {
    result,
    trace: {
      stepNumber: 5,
      stepName: 'qa',
      model: 'qwen-turbo',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { subject: input.subject, draftQuote },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
