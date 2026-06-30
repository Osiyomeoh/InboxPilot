'use client';
import { useState } from 'react';
import { api } from '@/lib/api-client';

interface LineItem { description: string; quantity: number; unitPrice: string; total: string }

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
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;
  const lineItems = (inquiry.quote?.lineItems ?? []) as LineItem[];

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-on-surface">
              {inquiry.fromName ?? inquiry.fromEmail}
            </h2>
            <p className="text-sm text-secondary">{inquiry.fromEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Subject</p>
            <p className="text-sm text-on-surface mt-0.5">{inquiry.subject}</p>
          </div>
        </div>

        {/* Confidence badge */}
        {confidencePct != null && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-on-surface-variant">AI Confidence</span>
              <span className={`text-xs font-bold ${confidencePct >= 80 ? 'text-[#16a34a]' : 'text-amber-600'}`}>
                {confidencePct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${confidencePct >= 80 ? 'bg-[#16a34a]' : 'bg-amber-500'}`}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Escalation reason */}
        {inquiry.agentRun?.escalateReason && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-5 flex items-start gap-3 rounded-r-lg">
            <span className="material-symbols-outlined text-amber-600 flex-shrink-0" style={{ fontSize: 20 }}>warning</span>
            <p className="text-sm text-amber-800 font-medium">
              Qwen flagged for review:{' '}
              <span className="font-bold italic">{inquiry.agentRun.escalateReason}</span>
            </p>
          </div>
        )}

        {/* Quote summary */}
        {inquiry.quote && (
          <div className="mb-5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-3">Quote Summary</h3>
            <div className="border border-outline-variant rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-on-surface">Item</th>
                    <th className="px-4 py-2 font-semibold text-on-surface text-center">Qty</th>
                    <th className="px-4 py-2 font-semibold text-on-surface text-right">Unit</th>
                    <th className="px-4 py-2 font-semibold text-on-surface text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {lineItems.length > 0
                    ? lineItems.map((item, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2.5 text-on-surface">{item.description}</td>
                          <td className="px-4 py-2.5 text-center text-on-surface-variant">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-on-surface-variant">
                            ${Number(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-on-surface">
                            ${Number(item.total).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    : (
                        <tr>
                          <td className="px-4 py-2.5 text-on-surface-variant text-sm italic" colSpan={4}>
                            {lineItems.length === 0 && 'No line items'}
                          </td>
                        </tr>
                      )}
                </tbody>
                <tfoot className="bg-surface-container-low border-t border-outline-variant font-semibold">
                  <tr>
                    <td className="px-4 py-2.5 text-right text-on-surface" colSpan={3}>Grand Total</td>
                    <td className="px-4 py-2.5 text-right text-primary text-base">
                      ${Number(inquiry.quote.total).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handle('approve')}
              disabled={loading !== null}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-lg">send</span>
              {loading === 'approve' ? 'Approving...' : 'Approve & Send'}
            </button>
            <button
              onClick={() => handle('reject')}
              disabled={loading !== null}
              className="text-sm font-medium text-error hover:underline underline-offset-4 disabled:opacity-50 transition-all"
            >
              {loading === 'reject' ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
