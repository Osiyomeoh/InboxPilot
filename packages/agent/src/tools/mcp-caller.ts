export async function callMcpTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const baseUrl = process.env.MCP_SERVER_URL ?? 'http://localhost:4001';
  const apiKey = process.env.MCP_API_KEY ?? 'internal-secret';

  const res = await fetch(`${baseUrl}/call/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-mcp-key': apiKey,
    },
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    throw new Error(`MCP tool ${toolName} failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { ok: boolean; result: unknown; error?: string };
  if (!data.ok) throw new Error(`MCP tool ${toolName} error: ${data.error}`);
  return data.result;
}
