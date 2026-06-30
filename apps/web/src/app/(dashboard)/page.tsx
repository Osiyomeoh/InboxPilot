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
    {
      label: 'Total Inquiries',
      value: stats.total,
      valueColor: 'text-primary',
      subtext: '+12% vs LY',
      subtextColor: 'text-primary/60',
    },
    {
      label: 'Quotes Sent',
      value: stats.sent,
      valueColor: 'text-[#16a34a]',
      subtext: stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}% conversion` : '—',
      subtextColor: 'text-[#16a34a]/60',
    },
    {
      label: 'Needs Review',
      value: stats.awaiting,
      valueColor: 'text-[#d97706]',
      subtext: stats.awaiting > 0 ? 'Action required' : 'All clear',
      subtextColor: 'text-[#d97706]/60',
    },
  ];

  // Map scenario id → friendly label for display
  const scenarioMeta: Record<string, { button: string; style: string }> = {
    'demo-auto': {
      button: 'Standard bulk order',
      style: 'bg-primary text-on-primary hover:opacity-90',
    },
    'demo-hitl': {
      button: 'Ambiguous inquiry (needs review)',
      style: 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
    },
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Overview</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Watch Qwen process inquiries in real time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-[#16a34a] animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-on-surface-variant">{connected ? 'Live' : 'Reconnecting...'}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl hover:border-outline transition-colors"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{c.label}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl font-bold ${c.valueColor}`}>{c.value}</span>
              <span className={`text-xs font-medium ${c.subtextColor}`}>{c.subtext}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="grid grid-cols-1 lg:grid-cols-[4fr_6fr] gap-6 items-start">
        {/* Left: demo trigger + confidence */}
        <div className="flex flex-col gap-5">
          {/* Demo card */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
            <h3 className="text-base font-semibold text-on-surface mb-1">Try a Demo</h3>
            <p className="text-sm text-on-surface-variant mb-5">
              Send a test email and watch InboxPilot respond in under 60 seconds.
            </p>
            <div className="flex flex-col gap-3 mb-4">
              {scenarios.map((s) => {
                const meta = scenarioMeta[s.id];
                const isLoading = injecting === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => injectDemo(s.id)}
                    disabled={injecting !== null}
                    className={`w-full py-3 px-6 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${meta?.style ?? 'bg-primary text-on-primary'} ${isLoading ? 'animate-pulse' : ''}`}
                  >
                    {isLoading ? 'Starting...' : (meta?.button ?? s.label)}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-outline italic">No real email sent — for demo purposes only</p>

            {/* Outcome feedback */}
            {outcome === 'sent' && (
              <div className="mt-4 p-3 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl">
                <p className="text-sm font-semibold text-[#166534]">Quote sent automatically ✓</p>
                <p className="text-xs text-[#166534]/70 mt-0.5">Full audit trail in Activity Log</p>
              </div>
            )}
            {outcome === 'escalated' && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-semibold text-amber-700">Sent to Approval Queue</p>
                <p className="text-xs text-amber-600/70 mt-0.5">Review it in the Approval Queue tab</p>
              </div>
            )}
          </div>

          {/* Agent architecture legend */}
          <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-4">
              Agent Architecture
            </h4>
            <div className="space-y-3">
              {[
                { step: '01', name: 'Parse Email',   model: 'qwen-max',  desc: 'Extract intent & products' },
                { step: '02', name: 'Plan Calls',    model: 'qwen-max',  desc: 'Schedule MCP tool calls' },
                { step: '03', name: 'Verify Data',   model: 'qwen-max',  desc: 'Check completeness' },
                { step: '04', name: 'Draft Quote',   model: 'qwen-plus', desc: 'Generate line items' },
                { step: '05', name: 'Self-Review',   model: 'qwen-max',  desc: 'QA output' },
                { step: '06', name: 'Write Email',   model: 'qwen-plus', desc: 'Craft cover email' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 text-xs">
                  <span className="text-outline w-6 flex-shrink-0">{s.step}</span>
                  <span className="text-on-surface font-medium w-24 flex-shrink-0">{s.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${s.model === 'qwen-max' ? 'bg-surface-container text-on-secondary-container' : 'bg-primary-fixed text-on-primary-fixed'}`}>
                    {s.model}
                  </span>
                  <span className="text-on-surface-variant truncate">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: live reasoning panel */}
        <div>
          {activeInquiryId ? (
            <LiveReasoningPanel
              key={activeInquiryId}
              inquiryId={activeInquiryId}
              events={wsEvents}
              onComplete={setOutcome}
            />
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl min-h-[420px] flex flex-col items-center justify-center text-center p-8">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-4">
                pending
              </span>
              <p className="text-sm font-medium text-on-surface">No active agent run</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Select a demo scenario to watch the agent chain run in real time
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
