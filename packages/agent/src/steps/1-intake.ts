import { chat, parseJson } from '../qwen-client.js';
import type { AgentInput, IntakeResult, StepTrace } from '../types.js';

export async function stepIntake(
  input: AgentInput,
): Promise<{ result: IntakeResult; trace: StepTrace }> {
  const start = Date.now();

  const prompt = `You are an expert sales intake analyst. Analyze this inbound sales inquiry email and extract structured information.

Email Details:
- From: ${input.fromName ?? 'Unknown'} <${input.fromEmail}>
- Subject: ${input.subject}
- Body:
${input.bodyText}

Return a JSON object with this exact structure:
{
  "intent": "brief description of what the customer wants",
  "products": [{"name": "product name or SKU", "qty": number}],
  "urgency": "low" | "medium" | "high",
  "ambiguities": ["list of unclear points that need clarification or assumptions"],
  "customerEmail": "${input.fromEmail}"
}

Rules:
- If quantity is not mentioned, assume 1
- If multiple products are mentioned, list all of them
- Urgency is "high" if they mention deadline, ASAP, urgent, rush, or similar
- List any ambiguities that would affect pricing or feasibility`;

  const { content, usage } = await chat('qwen3.7-plus', [{ role: 'user', content: prompt }]);

  const result = parseJson<IntakeResult>(content);

  return {
    result,
    trace: {
      stepNumber: 1,
      stepName: 'intake',
      model: 'qwen3.7-plus',
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      inputJson: { fromEmail: input.fromEmail, subject: input.subject },
      outputJson: result,
      durationMs: Date.now() - start,
    },
  };
}
