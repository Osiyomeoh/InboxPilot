'use client';
import { formatDistanceToNow } from 'date-fns';

interface Log {
  id: string;
  eventType: string;
  inquiryId?: string;
  payload?: unknown;
  createdAt: string;
}

const EVENT_COLORS: Record<string, string> = {
  EMAIL_RECEIVED: 'bg-blue-100 text-blue-700',
  INQUIRY_PROCESSING: 'bg-purple-100 text-purple-700',
  ESCALATED_TO_HUMAN: 'bg-yellow-100 text-yellow-700',
  AWAITING_APPROVAL: 'bg-orange-100 text-orange-700',
  HUMAN_APPROVED: 'bg-green-100 text-green-700',
  HUMAN_REJECTED: 'bg-red-100 text-red-700',
  QUOTE_SENT: 'bg-green-100 text-green-700',
  FOLLOWUP_SENT: 'bg-teal-100 text-teal-700',
  AGENT_FAILED: 'bg-red-100 text-red-700',
};

export function ActivityFeed({ logs }: { logs: Log[] }) {
  return (
    <div className="space-y-2">
      {logs.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">No activity yet. Waiting for emails...</p>
      )}
      {logs.map((log) => (
        <div key={log.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${EVENT_COLORS[log.eventType] ?? 'bg-gray-100 text-gray-600'}`}>
            {log.eventType.replace(/_/g, ' ')}
          </span>
          {log.inquiryId && <span className="text-xs text-gray-400 font-mono truncate">{log.inquiryId.slice(-8)}</span>}
          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
