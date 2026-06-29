'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket, type WsEvent } from '@/hooks/useWebSocket';
import { LiveReasoningPanel } from '@/components/LiveReasoningPanel';
import { api } from '@/lib/api-client';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Stats { total: number; sent: number; awaiting: number }

interface DemoScenario { id: string; label: string; subject: string }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, awaiting: 0 });
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([]);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'sent' | 'escalated' | 'failed' | null>(null);
  const eventBuffer = useRef<WsEvent[]>([]);

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
    });
  }, []);

  useEffect(() => {
    loadStats();
    fetch(`${API}/demo/emails`)
      .then((r) => r.json())
      .then(setScenarios)
      .catch(() => {});
  }, [loadStats]);

  const { connected } = useWebSocket(
    useCallback((e: WsEvent) => {
      eventBuffer.current = [...eventBuffer.current, e];
      setWsEvents([...eventBuffer.current]);

      if (['QUOTE_SENT', 'INQUIRY_ESCALATED', 'INQUIRY_FAILED', 'EMAIL_RECEIVED'].includes(e.type)) {
        loadStats();
      }
    }, [loadStats]),
  );

  async function injectDemo(scenarioId: string) {
    setInjecting(scenarioId);
    setOutcome(null);
    eventBuffer.current = [];
    setWsEvents([]);
    setActiveInquiryId(null);

    try {
      const res = await fetch(`${API}/demo/inject/${scenarioId}`, { method: 'POST' });
      const data = await res.json() as { inquiryId: string };
      setActiveInquiryId(data.inquiryId);
    } finally {
      setInjecting(null);
    }
  }

  const statCards = [
    { label: 'Total Inquiries', value: stats.total, color: 'text-violet-400' },
    { label: 'Quotes Sent',     value: stats.sent,     color: 'text-emerald-400' },
    { label: 'Needs Review',    value: stats.awaiting,  color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Live Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Watch Qwen process inquiries in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-400'}`} />
          <span className="text-xs text-gray-500">{connected ? 'Live' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{c.label}</p>
            <p className={`text-4xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Main area: demo trigger + live panel */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Demo controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Send Demo Email</h3>
            <p className="text-xs text-gray-500 mb-4">
              Inject a test inquiry and watch the Qwen agent chain run live on the right.
            </p>
            <div className="space-y-3">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => injectDemo(s.id)}
                  disabled={injecting !== null}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition group ${
                    activeInquiryId && injecting === null
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : 'border-gray-200 hover:border-brand hover:bg-brand/5 cursor-pointer'
                  } ${injecting === s.id ? 'animate-pulse border-violet-400 bg-violet-50' : ''}`}
                >
                  <p className="text-sm font-medium text-gray-800 group-hover:text-brand">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{s.subject}</p>
                </button>
              ))}
            </div>

            {activeInquiryId && !outcome && (
              <div className="mt-4 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <p className="text-xs font-medium text-violet-700">Agent running...</p>
                <p className="text-[10px] text-violet-500 font-mono mt-0.5">{activeInquiryId}</p>
              </div>
            )}

            {outcome === 'sent' && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-emerald-700">Quote sent automatically ✓</p>
                <p className="text-xs text-emerald-600 mt-0.5">Full audit trail in Activity Log</p>
              </div>
            )}
            {outcome === 'escalated' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-yellow-700">Sent to Approval Queue ⚑</p>
                <p className="text-xs text-yellow-600 mt-0.5">Review it in the Approval Queue tab</p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-gray-900 rounded-2xl p-5 text-gray-300">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Agent Architecture</h4>
            <div className="space-y-2 text-xs font-mono">
              {[
                { step: '01', name: 'Intake',      model: 'qwen-max',  desc: 'Parse intent & products' },
                { step: '02', name: 'Decide',      model: 'qwen-max',  desc: 'Plan MCP tool calls' },
                { step: '03', name: 'Verify',      model: 'qwen-max',  desc: 'Check data completeness' },
                { step: '04', name: 'Draft Quote', model: 'qwen-plus', desc: 'Generate line items' },
                { step: '05', name: 'QA',          model: 'qwen-max',  desc: 'Self-review output' },
                { step: '06', name: 'Write Email', model: 'qwen-plus', desc: 'Craft cover email' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-2">
                  <span className="text-gray-600">{s.step}</span>
                  <span className="text-gray-300 w-24 flex-shrink-0">{s.name}</span>
                  <span className={`text-[10px] px-1.5 rounded ${s.model === 'qwen-max' ? 'bg-violet-900 text-violet-300' : 'bg-blue-900 text-blue-300'}`}>
                    {s.model}
                  </span>
                  <span className="text-gray-600 truncate">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live reasoning panel */}
        <div className="lg:col-span-3">
          {activeInquiryId ? (
            <LiveReasoningPanel
              key={activeInquiryId}
              inquiryId={activeInquiryId}
              events={wsEvents}
              onComplete={setOutcome}
            />
          ) : (
            <div className="bg-gray-950 rounded-2xl border border-gray-800 h-full min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <p className="text-gray-400 font-medium">No active agent run</p>
              <p className="text-gray-600 text-sm mt-1">Click a demo scenario to watch Qwen think in real time</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
