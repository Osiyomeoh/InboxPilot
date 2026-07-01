import { chat, parseJson } from '../qwen-client.js';
import type { AgentInput, IntakeResult, DecideResult, StepTrace } from '../types.js';

const TOOL_MANIFEST = `Available tools:
- get_pricing(product: string, qty: number): Returns price, availability, lead time
- lookup_customer(email: string): Returns CRM data — tier, credit limit, order history
- create_quote(inquiryId: string, lineItems: array): Persists quote to database
- check_calendar(startDate: string, endDate: string): Checks delivery/service availability
- flag_for_human(inquiryId: string, reason: string, confidence: number): Escalates to human review`;

export async function stepDecide(
  input: AgentInput,
  intake: IntakeResult,
): Promise<{ result: DecideResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are an intelligent sales automation agent. Based on this parsed inquiry, decide which tools to call.

Customer email: ${intake.customerEmail}
Intent: ${intake.intent}
Products requested: ${JSON.stringify(intake.products)}
Urgency: ${intake.urgency}
Inquiry ID: ${input.inquiryId}

${TOOL_MANIFEST}

Rules:
- ALWAYS include lookup_customer in toolCalls
- Include get_pricing for EACH product in the products list
- Include check_calendar only if customer mentions specific dates
- Set action to "escalate" ONLY if there are 3+ critical ambiguities that make quoting impossible
- Do NOT include flag_for_human or create_quote in toolCalls — those are handled automatically
- Set confidence based on PRODUCT and QUANTITY clarity only:
  * 0.85-0.95: specific named products with exact quantities → can auto-quote
  * 0.65-0.84: products identified but quantities vague ("maybe 5 could be 500") → needs review
  * 0.4-0.64: no specific products or wildly undefined scope → escalate

Critical ambiguities that LOWER confidence:
${JSON.stringify((intake.ambiguities ?? []).filter((a: string) =>
  /quantity|product|what|which|unclear|unknown|undefined/i.test(a)
))}

Minor ambiguities (delivery, payment terms, config) do NOT lower confidence — they are resolved post-quote.

You MUST return valid JSON in exactly this format — no extra text, no markdown:
{
  "action": "proceed",
  "toolCalls": [
    {"tool": "lookup_customer", "args": {"email": "${intake.customerEmail}"}},
    {"tool": "get_pricing", "args": {"product": "PRODUCT_SKU", "qty": 1}}
  ],
  "reasoning": "Brief explanation of your confidence score and tool choices",
  "confidence": 0.9
}`;

  const { content, usage } = await chat('qwen-max', [{ role: 'user', content: prompt }]);
  const result = parseJson<DecideResult>(content);

  return {
    result,
    trace: {
      stepNumber: 2,
      stepName: 'decide',
      model: 'qwen-max',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { intake },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
