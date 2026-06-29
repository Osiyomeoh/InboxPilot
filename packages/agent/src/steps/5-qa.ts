import { chat, parseJson } from '../qwen-client.js';
import type { AgentInput, IntakeResult, DraftQuoteResult, QAResult, StepTrace } from '../types.js';

export async function stepQA(
  input: AgentInput,
  intake: IntakeResult,
  draftQuote: DraftQuoteResult,
): Promise<{ result: QAResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are a senior sales quality assurance reviewer. Critically evaluate this draft quote against the original customer inquiry.

Original email:
Subject: ${input.subject}
Body: ${input.bodyText}

Parsed intent: ${intake.intent}
Products requested: ${JSON.stringify(intake.products)}

Draft quote:
${JSON.stringify(draftQuote, null, 2)}

Check all of the following:
1. Does the quote cover all products the customer requested?
2. Are the quantities correct?
3. Do the line item totals add up correctly (qty × unitPrice = total)?
4. Does subtotal + tax = total?
5. Is the quote professionally structured with terms and validity date?
6. Are there any obvious pricing errors or anomalies?

Return JSON:
{
  "passed": true | false,
  "issues": ["list specific issues found, empty array if none"],
  "overallQuality": "excellent" | "good" | "needs_revision"
}

Be strict. A quote fails if math is wrong or products are missing.`;

  const { content, usage } = await chat('qwen-max', [{ role: 'user', content: prompt }]);
  const result = parseJson<QAResult>(content);

  return {
    result,
    trace: {
      stepNumber: 5,
      stepName: 'qa',
      model: 'qwen-max',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { subject: input.subject, draftQuote },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
