'use client';
import { useEffect, useRef, useState } from 'react';
import type { WsEvent } from '@/hooks/useWebSocket';

export interface LiveStep {
  stepNumber: number;
  stepName: string;
  status: 'running' | 'complete' | 'escalated' | 'failed';
  model: string;
  summary?: string;
  durationMs?: number;
  confidence?: number;
  toolsCalled?: string[];
  ts: number;
}

interface Props {
  inquiryId: string;
  events: WsEvent[];
  onComplete?: (outcome: 'sent' | 'escalated' | 'failed') => void;
}

const STEP_LABELS: Record<string, string> = {
  intake: 'Parse Email',
  decide: 'Plan Tool Calls',
  'tool-call': 'Invoke MCP Tool',
  verify: 'Verify Data',
  'draft-quote': 'Draft Quote',
  qa: 'Self-Review (QA)',
  'write-email': 'Write Cover Email',
};

function StepIcon({ status }: { status: LiveStep['status'] }) {
  if (status === 'running') {
    return (
      <div className="w-6 h-6 rounded-full border-2 border-primary bg-white flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
    );
  }
  if (status === 'complete') {
    return (
      <div className="w-6 h-6 rounded-full bg-[#16a34a] flex items-center justify-center">
        <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1", fontSize: 14 }}>
          check
        </span>
      </div>
    );
  }
  if (status === 'escalated') {
    return (
      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
        <span className="material-symbols-outlined text-white text-sm" style={{ fontSize: 14 }}>
          flag
        </span>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
      <span className="material-symbols-outlined text-white text-sm" style={{ fontSize: 14 }}>
        close
      </span>
    </div>
  );
}

function PendingIcon() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-outline-variant bg-surface" />
  );
}

function ModelBadge({ model }: { model: string }) {
  const styles: Record<string, string> = {
    'qwen-max': 'bg-surface-container text-on-secondary-container',
    'qwen-plus': 'bg-primary-fixed text-on-primary-fixed',
    mcp: 'bg-[#dcfce7] text-[#166534]',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${styles[model] ?? 'bg-surface-container text-on-surface-variant'}`}>
      {model}
    </span>
  );
}

const ORDERED_STEPS = ['intake', 'decide', 'verify', 'draft-quote', 'qa', 'write-email'];

export function LiveReasoningPanel({ inquiryId, events, onComplete }: Props) {
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [outcome, setOutcome] = useState<'sent' | 'escalated' | 'failed' | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    for (const e of events) {
      if (e.type === 'AGENT_STEP') {
        const payload = e.payload as {
          inquiryId: string;
          stepNumber: number;
          stepName: string;
          status: LiveStep['status'];
          model: string;
          summary?: string;
          durationMs?: number;
          confidence?: number;
          toolsCalled?: string[];
        };
        if (payload.inquiryId !== inquiryId) continue;

        setSteps((prev) => {
          const isSub = payload.stepName === 'tool-call';
          const existing = isSub
            ? -1
            : prev.findIndex((s) => s.stepNumber === payload.stepNumber && s.stepName === payload.stepName);

          const next: LiveStep = { ...payload, ts: Date.now() };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = next;
            return updated;
          }
          return [...prev, next];
        });
      }

      if (e.type === 'QUOTE_SENT' && (e.payload as { id: string }).id === inquiryId) {
        const p = e.payload as { total?: number; currency?: string };
        if (p.total) setQuoteTotal(`$${Number(p.total).toFixed(2)}`);
        setOutcome('sent');
        onComplete?.('sent');
      }
      if (e.type === 'INQUIRY_ESCALATED' && (e.payload as { id: string }).id === inquiryId) {
        setOutcome('escalated');
        onComplete?.('escalated');
      }
      if (e.type === 'INQUIRY_FAILED' && (e.payload as { id: string }).id === inquiryId) {
        setOutcome('failed');
        onComplete?.('failed');
      }
    }
  }, [events, inquiryId, onComplete]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  const stepMap = new Map(steps.filter((s) => s.stepName !== 'tool-call').map((s) => [s.stepName, s]));
  const toolSteps = steps.filter((s) => s.stepName === 'tool-call');
  const latestConfidence = [...steps].reverse().find((s) => s.confidence != null)?.confidence;

  const isProcessing = steps.length > 0 && !outcome;
  const headerLabel = outcome === 'sent'
    ? 'Quote sent'
    : outcome === 'escalated'
    ? 'Sent to review'
    : outcome === 'failed'
    ? 'Processing failed'
    : isProcessing
    ? 'Processing inquiry...'
    : 'Waiting to start...';

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col h-full min-h-[420px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isProcessing ? (
            <span className="material-symbols-outlined text-primary spinner-rotate">autorenew</span>
          ) : outcome === 'sent' ? (
            <span className="material-symbols-outlined text-[#16a34a]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          ) : outcome === 'escalated' ? (
            <span className="material-symbols-outlined text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant">pending</span>
          )}
          <h3 className="text-base font-semibold text-on-surface">{headerLabel}</h3>
        </div>
        <span className="text-xs px-2 py-1 bg-surface-container-high rounded-lg text-on-surface-variant">
          Real-time trace
        </span>
      </div>

      {/* Step timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {steps.length === 0 && (
          <p className="text-sm text-on-surface-variant text-center py-8">
            Select a demo scenario to start the agent...
          </p>
        )}

        <div className="relative flex flex-col gap-5">
          {/* Vertical connecting line */}
          {ORDERED_STEPS.length > 0 && (
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-outline-variant" />
          )}

          {ORDERED_STEPS.map((stepKey) => {
            const step = stepMap.get(stepKey);
            const label = STEP_LABELS[stepKey] ?? stepKey;
            const isPending = !step;
            const isActive = step?.status === 'running';

            return (
              <div key={stepKey} className="flex gap-4 relative z-10">
                <div className="mt-0.5 flex-shrink-0">
                  {isPending ? (
                    <PendingIcon />
                  ) : (
                    <StepIcon status={step.status} />
                  )}
                </div>
                <div className={`flex-1 ${isPending ? 'opacity-40' : ''}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${isActive ? 'text-primary' : isPending ? 'text-on-surface' : 'text-on-surface'}`}>
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      {step && <ModelBadge model={step.model} />}
                      {step?.durationMs != null ? (
                        <span className="text-xs text-outline">{step.durationMs}ms</span>
                      ) : isActive ? (
                        <span className="text-xs text-primary">Processing...</span>
                      ) : null}
                    </div>
                  </div>
                  {step?.summary && (
                    <p className="text-xs text-on-surface-variant mt-1">{step.summary}</p>
                  )}
                  {step?.toolsCalled && step.toolsCalled.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {step.toolsCalled.map((t) => (
                        <span key={t} className="text-[10px] bg-[#dcfce7] text-[#166534] px-1.5 py-0.5 rounded font-mono">
                          {t}()
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* MCP tool sub-steps */}
          {toolSteps.map((step, i) => (
            <div key={`tool-${i}`} className="flex gap-4 relative z-10 pl-8">
              <div className="mt-0.5 flex-shrink-0">
                <div className="w-5 h-5 rounded-full bg-[#dcfce7] border border-[#bbf7d0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#16a34a]" style={{ fontSize: 11 }}>build</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#166534]">MCP Tool Call</span>
                  <ModelBadge model="mcp" />
                  {step.durationMs != null && (
                    <span className="text-xs text-outline">{step.durationMs}ms</span>
                  )}
                </div>
                {step.summary && <p className="text-xs text-on-surface-variant mt-0.5">{step.summary}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        {latestConfidence != null && (
          <div className="mt-5 pt-4 border-t border-outline-variant">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-on-surface-variant">Confidence</span>
              <span className="text-xs font-bold text-primary">{Math.round(latestConfidence * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-primary"
                style={{ width: `${Math.round(latestConfidence * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Outcome result box */}
      {outcome === 'sent' && (
        <div className="mx-6 mb-6 p-4 bg-[#f0fdf4] border border-[#dcfce7] rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#166534]">Quote sent automatically</span>
            {quoteTotal && <span className="text-xl font-bold text-[#15803d]">{quoteTotal}</span>}
          </div>
          <p className="text-xs text-[#166534]/70 mt-1">Delivered in under 60 seconds · Full audit trail in Activity Log</p>
        </div>
      )}
      {outcome === 'escalated' && (
        <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="text-sm font-medium text-amber-800">Sent to Approval Queue</span>
          <p className="text-xs text-amber-700/70 mt-1">Confidence below threshold — review and approve manually</p>
        </div>
      )}
      {outcome === 'failed' && (
        <div className="mx-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-medium text-red-800">Processing failed</span>
          <p className="text-xs text-red-700/70 mt-1">Check Activity Log for error details</p>
        </div>
      )}
    </div>
  );
}
