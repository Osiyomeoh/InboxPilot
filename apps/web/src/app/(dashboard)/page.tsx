'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Stats {
  total: number;
  pending: number;
  sent: number;
  awaiting: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, sent: 0, awaiting: 0 });

  const loadStats = useCallback(async () => {
    const [all, sent, awaiting] = await Promise.all([
      api.getInquiries({ limit: 1 }),
      api.getInquiries({ status: 'SENT', limit: 1 }),
      api.getInquiries({ status: 'AWAITING_APPROVAL', limit: 1 }),
    ]);
    setStats({
      total: (all as { total: number }).total,
      sent: (sent as { total: number }).total,
      awaiting: (awaiting as { total: number }).total,
      pending: (all as { total: number }).total - (sent as { total: number }).total,
    });
  }, []);

  useWebSocket(useCallback(() => { loadStats(); }, [loadStats]));

  useEffect(() => { loadStats(); }, [loadStats]);

  const cards = [
    { label: 'Total Inquiries', value: stats.total, color: 'text-blue-600' },
    { label: 'Quotes Sent', value: stats.sent, color: 'text-green-600' },
    { label: 'Awaiting Approval', value: stats.awaiting, color: 'text-yellow-600' },
    { label: 'In Progress', value: stats.pending, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className={`text-4xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-brand/5 border border-brand/20 rounded-2xl p-6">
        <h3 className="font-semibold text-brand mb-2">How it works</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>An inbound sales email arrives in your connected mailbox</li>
          <li>Qwen parses the inquiry, looks up pricing &amp; CRM data via MCP tools</li>
          <li>A PDF quote is generated and self-reviewed by Qwen</li>
          <li>If confidence is high, the quote is auto-sent; otherwise it appears here for approval</li>
        </ol>
      </div>
    </div>
  );
}
