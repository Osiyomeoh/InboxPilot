'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';

interface Inquiry {
  id: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  status: string;
  agentRun?: { confidence?: number; escalateReason?: string; steps: unknown[] };
  quote?: { total: string; currency: string; lineItems: unknown[] };
}

export function ApprovalCard({ inquiry, onAction }: { inquiry: Inquiry; onAction: () => void }) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);

  async function handle(action: 'approve' | 'reject') {
    setLoading(action);
    try {
      await api.actionInquiry(inquiry.id, { action });
      onAction();
    } finally {
      setLoading(null);
    }
  }

  const confidence = inquiry.agentRun?.confidence;

  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">{inquiry.fromName ?? inquiry.fromEmail}</p>
          <p className="text-sm text-gray-500">{inquiry.fromEmail}</p>
          <p className="text-sm text-gray-700 mt-1 font-medium">{inquiry.subject}</p>
        </div>
        {confidence != null && (
          <div className={`text-sm font-semibold px-3 py-1 rounded-full ${confidence >= 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {Math.round(confidence * 100)}% confidence
          </div>
        )}
      </div>

      {inquiry.agentRun?.escalateReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
          <strong>Escalation reason:</strong> {inquiry.agentRun.escalateReason}
        </div>
      )}

      {inquiry.quote && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700">Quote Total</p>
          <p className="text-2xl font-bold text-brand">
            ${Number(inquiry.quote.total).toFixed(2)} {inquiry.quote.currency}
          </p>
          <p className="text-xs text-gray-400 mt-1">{(inquiry.quote.lineItems as unknown[]).length} line items</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handle('approve')}
          disabled={loading !== null}
          className="flex-1 bg-brand text-white py-2 rounded-lg font-medium hover:bg-brand-dark transition disabled:opacity-50"
        >
          {loading === 'approve' ? 'Approving...' : 'Approve & Send'}
        </button>
        <button
          onClick={() => handle('reject')}
          disabled={loading !== null}
          className="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg font-medium hover:bg-red-100 transition disabled:opacity-50"
        >
          {loading === 'reject' ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
