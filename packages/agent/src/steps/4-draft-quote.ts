import { chat, parseJson } from '../qwen-client.js';
import type { VerifyResult, DraftQuoteResult, StepTrace } from '../types.js';

export async function stepDraftQuote(
  verify: VerifyResult,
  customerData: unknown,
): Promise<{ result: DraftQuoteResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are a professional sales quoting specialist. Generate a complete, accurate quote based on the verified line items.

Verified line items:
${JSON.stringify(verify.resolvedLineItems, null, 2)}

Customer data:
${JSON.stringify(customerData, null, 2)}

Generate a professional quote. Apply any applicable volume discounts or tier-based pricing for gold/silver customers.

Return JSON:
{
  "lineItems": [{"sku": string, "description": string, "qty": number, "unitPrice": number, "total": number}],
  "subtotal": number,
  "tax": number,
  "total": number,
  "currency": "USD",
  "validUntil": "ISO date 30 days from now",
  "terms": "Net 30. Quote valid for 30 days. Prices subject to availability."
}

Tax rate: 8%. Round all currency values to 2 decimal places.`;

  const { content, usage } = await chat('qwen3.7-plus', [{ role: 'user', content: prompt }]);
  const result = parseJson<DraftQuoteResult>(content);

  // Ensure validUntil is set
  if (!result.validUntil) {
    result.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return {
    result,
    trace: {
      stepNumber: 4,
      stepName: 'draft-quote',
      model: 'qwen3.7-plus',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { lineItems: verify.resolvedLineItems },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
