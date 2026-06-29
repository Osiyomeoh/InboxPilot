const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getInquiries: (params?: { status?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ items: unknown[]; total: number }>(`/inquiries${q ? '?' + q : ''}`);
  },
  getInquiry: (id: string) => apiFetch<unknown>(`/inquiries/${id}`),
  actionInquiry: (id: string, body: { action: 'approve' | 'reject'; editedQuote?: object }) =>
    apiFetch(`/inquiries/${id}/action`, { method: 'PATCH', body: JSON.stringify(body) }),
  getActivity: (params?: { limit?: number; offset?: number }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return apiFetch<{ logs: unknown[]; total: number }>(`/activity${q ? '?' + q : ''}`);
  },
};
