'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ActivityStats {
  totalToday: number;
  sentToday: number;
  escalatedToday: number;
  successRate: number | null;
  avgResponseSec: number | null;
}

function fmtAvg(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}m ${sec % 60}s`;
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [actRes, statsRes] = await Promise.allSettled([
      api.getActivity({ limit: 100 }),
      api.getActivityStats(),
    ]);
    if (actRes.status === 'fulfilled') setLogs((actRes.value as { logs: unknown[] }).logs);
    if (statsRes.status === 'fulfilled') setStats(statsRes.value as ActivityStats);
    setLoading(false);
  }, []);

  useWebSocket(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/activity?format=csv`);
  };

  const statCards = [
    {
      label: 'Processed Today',
      value: stats?.totalToday ?? '—',
      color: 'text-on-surface',
    },
    {
      label: 'Success Rate',
      value: stats?.successRate != null ? `${stats.successRate}%` : '—',
      color: 'text-primary',
    },
    {
      label: 'Avg Response',
      value: fmtAvg(stats?.avgResponseSec ?? null),
      color: 'text-on-surface',
    },
    {
      label: 'Human Reviews',
      value: stats?.escalatedToday ?? '—',
      color: 'text-tertiary',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Activity Log</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Real-time trail of AI agent actions and system events</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant text-sm rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filter
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant text-sm rounded-lg hover:bg-surface-container-low transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {/* Mini stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="bg-surface border border-outline-variant rounded-xl p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined spinner-rotate text-primary text-3xl">autorenew</span>
        </div>
      ) : (
        <ActivityFeed logs={logs as Parameters<typeof ActivityFeed>[0]['logs']} />
      )}

      {/* Footer */}
      <footer className="pt-4 border-t border-outline-variant flex justify-between items-center opacity-60">
        <span className="text-xs text-on-surface-variant">InboxPilot AI Engine · Powered by Qwen Cloud</span>
        <div className="flex gap-4">
          <a href="#" className="text-xs text-on-surface-variant hover:text-primary underline">Documentation</a>
          <a href="#" className="text-xs text-on-surface-variant hover:text-primary underline">API Status</a>
        </div>
      </footer>
    </div>
  );
}
