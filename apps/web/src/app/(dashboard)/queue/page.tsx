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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Approval Queue</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Inquiries that need your review before sending
          </p>
        </div>
        <div className="flex items-center gap-3">
          {inquiries.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              {inquiries.length} pending
            </span>
          )}
          <button className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant text-sm rounded-lg hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Sort by Date
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined spinner-rotate text-primary text-3xl">autorenew</span>
        </div>
      )}

      {!loading && inquiries.length === 0 && (
        <div className="text-center py-20 border border-outline-variant rounded-xl bg-surface-container-lowest">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3 block">
            check_circle
          </span>
          <p className="text-base font-semibold text-on-surface">Queue is clear</p>
          <p className="text-sm text-on-surface-variant mt-1">
            High-confidence quotes are sent automatically
          </p>
        </div>
      )}

      {/* Cards — centered column up to 720px */}
      {!loading && inquiries.length > 0 && (
        <div className="max-w-[720px] mx-auto space-y-6">
          {(inquiries as Parameters<typeof ApprovalCard>[0]['inquiry'][]).map((inq) => (
            <ApprovalCard
              key={(inq as { id: string }).id}
              inquiry={inq}
              onAction={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
