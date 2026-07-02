import OpenAI from 'openai';

// Qwen Cloud exposes an OpenAI-compatible API
export const qwenMax = new OpenAI({
  apiKey: process.env.QWEN_API_KEY!,
  baseURL: process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const qwenPlus = qwenMax; // Same client, different model string

export type QwenModel = 'qwen3.7-max' | 'qwen3.7-plus' | 'qwen3.6-flash';

export async function chat(
  model: QwenModel,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: {
    responseFormat?: 'json' | 'text';
    tools?: OpenAI.Chat.ChatCompletionTool[];
    maxRetries?: number;
  } = {},
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }> {
  const { responseFormat = 'json', tools, maxRetries = 3 } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await qwenMax.chat.completions.create({
        model,
        messages,
        tools,
        response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
        temperature: 0.2,
      });

      const choice = res.choices[0];
      const content = choice.message.content ?? '';

      return {
        content,
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
        },
      };
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export function parseJson<T>(content: string): T {
  // Strip markdown fences
  let raw = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  // Extract the outermost JSON object
  const objMatch = raw.match(/\{[\s\S]*\}/);
  if (objMatch) raw = objMatch[0];

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Best-effort cleanup: trailing commas, single quotes
    raw = raw.replace(/,(\s*[}\]])/g, '$1').replace(/'/g, '"');
    return JSON.parse(raw) as T;
  }
}
