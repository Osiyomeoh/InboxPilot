import OpenAI from 'openai';

// Qwen Cloud exposes an OpenAI-compatible API
export const qwenMax = new OpenAI({
  apiKey: process.env.QWEN_API_KEY!,
  baseURL: process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const qwenPlus = qwenMax; // Same client, different model string

export type QwenModel = 'qwen-max' | 'qwen-plus' | 'qwen-turbo';

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
  const match = content.match(/```json\s*([\s\S]*?)```/) ?? content.match(/(\{[\s\S]*\})/);
  const raw = match ? match[1] : content;
  return JSON.parse(raw.trim()) as T;
}
