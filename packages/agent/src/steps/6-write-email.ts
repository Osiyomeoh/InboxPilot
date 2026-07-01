import { chat, parseJson } from '../qwen-client.js';
import type { AgentInput, IntakeResult, DraftQuoteResult, WriteEmailResult, StepTrace } from '../types.js';

export async function stepWriteEmail(
  input: AgentInput,
  intake: IntakeResult,
  quote: DraftQuoteResult,
  customerData: unknown,
): Promise<{ result: WriteEmailResult; trace: StepTrace }> {
  const start = Date.now();

  const customer = customerData as Record<string, unknown>;
  const firstName = (customer?.name as string)?.split(' ')[0] ?? input.fromName?.split(' ')[0] ?? 'there';

  const prompt = `You are a professional B2B sales representative. Write a warm, concise cover email to accompany a price quote.

Customer: ${firstName} (${input.fromEmail})
Their original request subject: "${input.subject}"
Quote total: $${quote.total} ${quote.currency}
Number of line items: ${quote.lineItems.length}
Quote valid until: ${quote.validUntil}
Customer tier: ${(customer?.tier as string) ?? 'new'}

Guidelines:
- Address them by first name
- Reference their specific inquiry (don't be generic)
- Mention the quote is attached
- State the total and validity date
- Invite questions and offer to jump on a call
- Keep it under 150 words
- Tone: professional but warm, not overly formal

Return JSON:
{
  "subject": "Re: [their subject line] — Quote #[short ID]",
  "body": "email body text (no HTML, use line breaks)",
  "tone": "professional-warm" | "formal" | "casual"
}`;

  const { content, usage } = await chat('qwen-plus', [{ role: 'user', content: prompt }]);
  const result = parseJson<WriteEmailResult>(content);

  return {
    result,
    trace: {
      stepNumber: 6,
      stepName: 'write-email',
      model: 'qwen-plus',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { firstName, quoteTotal: quote.total },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
