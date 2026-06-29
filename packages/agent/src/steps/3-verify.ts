import { chat, parseJson } from '../qwen-client.js';
import type { IntakeResult, VerifyResult, StepTrace } from '../types.js';

export async function stepVerify(
  intake: IntakeResult,
  toolResults: Record<string, unknown>,
): Promise<{ result: VerifyResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are a meticulous sales operations analyst. Review the tool results and determine if we have enough information to generate a complete, accurate quote.

Original request:
- Intent: ${intake.intent}
- Products: ${JSON.stringify(intake.products)}
- Ambiguities: ${JSON.stringify(intake.ambiguities)}

Tool results:
${JSON.stringify(toolResults, null, 2)}

Your job:
1. Verify each product has pricing data
2. Verify the customer record was found
3. Identify any gaps that would make the quote incomplete or inaccurate
4. Build the resolved line items array with final prices

Return JSON:
{
  "complete": true | false,
  "gaps": ["list of missing information if any"],
  "resolvedLineItems": [
    {
      "sku": "SKU string",
      "description": "human-readable product name",
      "qty": number,
      "unitPrice": number,
      "total": number
    }
  ]
}

If complete is false, gaps must be non-empty. If all products have pricing, complete should be true.`;

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
