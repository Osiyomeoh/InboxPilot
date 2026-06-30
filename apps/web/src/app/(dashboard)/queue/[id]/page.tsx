'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { ReasoningTrace } from '@/components/ReasoningTrace';
import { ApprovalCard } from '@/components/ApprovalCard';
import { useRouter } from 'next/navigation';

export default function InquiryDetailPage({ params }: { params: { id: string } }) {
  const [inquiry, setInquiry] = useState<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    api.getInquiry(params.id).then(setInquiry);
  }, [params.id]);

  if (!inquiry) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="material-symbols-outlined spinner-rotate text-primary text-3xl">autorenew</span>
      </div>
    );
  }

  const inq = inquiry as Record<string, unknown>;
  const steps = ((inq.agentRun as Record<string, unknown>)?.steps as unknown[]) ?? [];
  const agentRun = inq.agentRun as Record<string, unknown> | undefined;
  const confidence = agentRun?.confidence as number | undefined;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to queue
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-on-surface tracking-tight">{inq.subject as string}</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            From{' '}
            <span className="font-medium text-on-surface">
              {(inq.fromName as string | undefined) ?? (inq.fromEmail as string)}
            </span>
            {inq.fromName ? ` · ${inq.fromEmail as string}` : ''}
          </p>
        </div>
        {confidence != null && (
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">Confidence</p>
            <p className={`text-2xl font-bold mt-0.5 ${confidence >= 0.8 ? 'text-[#16a34a]' : confidence >= 0.6 ? 'text-[#d97706]' : 'text-red-500'}`}>
              {Math.round(confidence * 100)}%
            </p>
          </div>
        )}
      </div>

      {/* Original email body */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-outline mb-3">Original Email</p>
        <pre className="text-sm text-on-surface whitespace-pre-wrap font-sans leading-relaxed">{inq.bodyText as string}</pre>
      </div>

      {/* Approval card (if still pending) */}
      {agentRun?.status !== 'RUNNING' && (
        <ApprovalCard
          inquiry={inq as unknown as Parameters<typeof ApprovalCard>[0]['inquiry']}
          onAction={() => router.push('/dashboard/queue')}
        />
      )}

      {/* Reasoning trace */}
      {steps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
            Agent Reasoning Trace
          </h3>
          <ReasoningTrace steps={steps as Parameters<typeof ReasoningTrace>[0]['steps']} />
        </div>
      )}
    </div>
  );
}
