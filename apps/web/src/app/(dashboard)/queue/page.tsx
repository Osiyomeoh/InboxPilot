'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ApprovalCard } from '@/components/ApprovalCard';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function QueuePage() {
  const [inquiries, setInquiries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await api.getInquiries({ status: 'AWAITING_APPROVAL', limit: 50 });
    setInquiries((res as { items: unknown[] }).items);
    setLoading(false);
  }, []);

  useWebSocket(useCallback((e) => {
    if (['EMAIL_RECEIVED', 'INQUIRY_ESCALATED', 'INQUIRY_APPROVED', 'INQUIRY_REJECTED'].includes(e.type)) {
      load();
    }
  }, [load]));

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Approval Queue</h2>
        <span className="bg-yellow-100 text-yellow-700 text-sm font-semibold px-3 py-1 rounded-full">
          {inquiries.length} pending
        </span>
      </div>

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && inquiries.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No inquiries awaiting approval</p>
          <p className="text-sm mt-1">High-confidence quotes are sent automatically</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(inquiries as Parameters<typeof ApprovalCard>[0]['inquiry'][]).map((inq) => (
          <ApprovalCard key={(inq as { id: string }).id} inquiry={inq} onAction={load} />
        ))}
      </div>
    </div>
  );
}
