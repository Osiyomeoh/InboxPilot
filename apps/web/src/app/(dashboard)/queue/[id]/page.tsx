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

  if (!inquiry) return <div className="text-gray-400 py-16 text-center">Loading...</div>;

  const inq = inquiry as Record<string, unknown>;
  const steps = ((inq.agentRun as Record<string, unknown>)?.steps as unknown[]) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()} className="text-sm text-brand hover:underline">
        ← Back to queue
      </button>
      <h2 className="text-2xl font-bold">{inq.subject as string}</h2>
      <div className="bg-white rounded-2xl border p-6">
        <p className="text-sm text-gray-500 mb-2">Original Email</p>
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">{inq.bodyText as string}</pre>
      </div>
      {(inq.agentRun as Record<string, unknown>)?.status === 'RUNNING' ? null : (
        <ApprovalCard inquiry={inq as Parameters<typeof ApprovalCard>[0]['inquiry']} onAction={() => router.push('/dashboard/queue')} />
      )}
      {steps.length > 0 && <ReasoningTrace steps={steps as Parameters<typeof ReasoningTrace>[0]['steps']} />}
    </div>
  );
}
