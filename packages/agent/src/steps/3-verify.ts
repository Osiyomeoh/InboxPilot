import { chat, parseJson } from '../qwen-client.js';
import type { IntakeResult, VerifyResult, StepTrace } from '../types.js';

export async function stepVerify(
  intake: IntakeResult,
  toolResults: Record<string, unknown>,
): Promise<{ result: VerifyResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are a sales operations analyst. Review tool results and confirm we can generate a quote.

Original request:
- Intent: ${intake.intent}
- Products: ${JSON.stringify(intake.products)}

Tool results:
${JSON.stringify(toolResults, null, 2)}

Rules — set complete=false ONLY if:
1. A product has NO pricing data at all (missing from get_pricing results entirely)
2. The customer is completely unknown AND the deal is > $5000

Do NOT flag as incomplete for: missing delivery address, payment terms, shipping method, or configurations. Those are clarified after sending the quote.

Build resolvedLineItems from the get_pricing results. If get_pricing returned an array, use all entries.

Return JSON only, no extra text:
{
  "complete": true,
  "gaps": [],
  "resolvedLineItems": [
    {
      "sku": "WIDGET-A",
      "description": "Widget A",
      "qty": 50,
      "unitPrice": 22.49,
      "total": 1124.50
    }
  ]
}`;

  const { content, usage } = await chat('qwen-max', [{ role: 'user', content: prompt }]);
  const result = parseJson<VerifyResult>(content);

  return {
    result,
    trace: {
      stepNumber: 3,
      stepName: 'verify',
      model: 'qwen-max',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { intake, toolResults },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
