'use client';
import { formatDistanceToNow } from 'date-fns';

interface Log {
  id: string;
  eventType: string;
  inquiryId?: string;
  payload?: unknown;
  createdAt: string;
}

const EVENT_BADGE: Record<string, { label: string; className: string }> = {
  EMAIL_RECEIVED:      { label: 'EMAIL RECEIVED',   className: 'bg-blue-50 text-blue-700 border border-blue-100' },
  INQUIRY_PROCESSING:  { label: 'PROCESSING',        className: 'bg-surface-container text-on-secondary-container border border-outline-variant' },
  QUOTE_SENT:          { label: 'QUOTE SENT',        className: 'bg-green-50 text-green-700 border border-green-100' },
  ESCALATED_TO_HUMAN:  { label: 'NEEDS REVIEW',      className: 'bg-amber-50 text-amber-700 border border-amber-100' },
  AWAITING_APPROVAL:   { label: 'NEEDS REVIEW',      className: 'bg-amber-50 text-amber-700 border border-amber-100' },
  HUMAN_APPROVED:      { label: 'APPROVED',          className: 'bg-green-50 text-green-700 border border-green-100' },
  HUMAN_REJECTED:      { label: 'REJECTED',          className: 'bg-red-50 text-red-700 border border-red-100' },
  FOLLOWUP_SENT:       { label: 'FOLLOW-UP',         className: 'bg-gray-100 text-gray-700 border border-gray-200' },
  AGENT_FAILED:        { label: 'FAILED',            className: 'bg-red-50 text-red-700 border border-red-100' },
};

function EventBadge({ eventType }: { eventType: string }) {
  const badge = EVENT_BADGE[eventType] ?? {
    label: eventType.replace(/_/g, ' '),
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function getDetailText(log: Log): string {
  const p = log.payload as Record<string, unknown> | undefined;
  if (!p) return '—';
  if (log.eventType === 'EMAIL_RECEIVED' && p.fromEmail) return `Received from ${p.fromEmail}`;
  if (log.eventType === 'QUOTE_SENT' && p.total) return `Quote $${Number(p.total).toFixed(2)} sent automatically`;
  if (log.eventType === 'HUMAN_APPROVED') return 'Admin approved and dispatched';
  if (log.eventType === 'HUMAN_REJECTED') return 'Rejected manually';
  if (log.eventType === 'FOLLOWUP_SENT') return 'Follow-up reminder sent to prospect';
  if (p.reason) return String(p.reason);
  return '—';
}

export function ActivityFeed({ logs }: { logs: Log[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 border border-outline-variant rounded-xl bg-surface-container-lowest">
        <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-2 block">history</span>
        <p className="text-sm font-medium text-on-surface">No activity yet</p>
        <p className="text-xs text-on-surface-variant mt-1">Waiting for emails to arrive...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant">
              <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Time</th>
              <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Event</th>
              <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Inquiry</th>
              <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-default"
              >
                <td className="px-6 py-3.5 text-sm text-on-surface-variant whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </td>
                <td className="px-6 py-3.5">
                  <EventBadge eventType={log.eventType} />
                </td>
                <td className="px-6 py-3.5 text-sm font-medium text-on-surface">
                  {log.inquiryId ? (
                    <span className="font-mono text-xs text-on-surface-variant">{log.inquiryId.slice(-8)}</span>
                  ) : '—'}
                </td>
                <td className="px-6 py-3.5 text-sm text-on-surface-variant">
                  {getDetailText(log)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-surface-container-low border-t border-outline-variant">
        <span className="text-xs text-on-surface-variant">Showing {logs.length} entries</span>
      </div>
    </div>
  );
}
