'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function ActivityPage() {
  const [logs, setLogs] = useState<unknown[]>([]);

  const load = useCallback(async () => {
    const res = await api.getActivity({ limit: 100 });
    setLogs((res as { logs: unknown[] }).logs);
  }, []);

  useWebSocket(useCallback(() => { load(); }, [load]));

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/activity?format=csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
        <button
          onClick={exportCsv}
          className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Export CSV
        </button>
      </div>
      <ActivityFeed logs={logs as Parameters<typeof ActivityFeed>[0]['logs']} />
    </div>
  );
}
