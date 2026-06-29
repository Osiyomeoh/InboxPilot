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

  const prompt = `You are an intelligent sales automation agent. Based on this parsed inquiry, decide which tools to call to fulfill the request.

Customer: ${intake.customerEmail}
Intent: ${intake.intent}
Products requested: ${JSON.stringify(intake.products)}
Urgency: ${intake.urgency}
Ambiguities: ${JSON.stringify(intake.ambiguities)}
Inquiry ID: ${input.inquiryId}

${TOOL_MANIFEST}

Rules:
- ALWAYS call lookup_customer first to understand who this customer is
- Call get_pricing for EACH product in the products list
- Call check_calendar if the customer mentions any specific dates or delivery windows
- Call flag_for_human if confidence < 0.8 OR deal value is likely > $10,000 OR there are 3+ critical ambiguities
- Do NOT call create_quote — that happens after verification

Return JSON:
{
  "action": "proceed" | "escalate",
  "toolCalls": [{"tool": "tool_name", "args": {...}}],
  "reasoning": "step-by-step explanation of why you chose these tools",
  "confidence": 0.0-1.0
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
