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
  'intake':       'Parse Email',
  'decide':       'Plan Tool Calls',
  'tool-call':    'Invoke MCP Tool',
  'verify':       'Verify Data',
  'draft-quote':  'Draft Quote',
  'qa':           'Self-Review (QA)',
  'write-email':  'Write Cover Email',
};

const MODEL_BADGE: Record<string, string> = {
  'qwen-max':  'bg-violet-900/60 text-violet-300 border-violet-700',
  'qwen-plus': 'bg-blue-900/60 text-blue-300 border-blue-700',
  'mcp':       'bg-emerald-900/60 text-emerald-300 border-emerald-700',
};

function StatusIcon({ status }: { status: LiveStep['status'] }) {
  if (status === 'running') {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="animate-spin h-4 w-4 border-2 border-violet-400 border-t-transparent rounded-full" />
      </span>
    );
  }
  if (status === 'complete') return <span className="text-emerald-400 text-lg leading-none">✓</span>;
  if (status === 'escalated') return <span className="text-yellow-400 text-lg leading-none">⚑</span>;
  return <span className="text-red-400 text-lg leading-none">✕</span>;
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-xs text-gray-500">Confidence</span>
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

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
          // Tool-call sub-steps: append rather than replace
          const isSub = payload.stepName === 'tool-call';
          const key = isSub ? `tool-${payload.summary}-${payload.status}` : `${payload.stepNumber}-${payload.stepName}`;

          const existing = isSub ? -1 : prev.findIndex(
            (s) => s.stepNumber === payload.stepNumber && s.stepName === payload.stepName,
          );

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
        if (p.total) setQuoteTotal(`$${Number(p.total).toFixed(2)} ${p.currency ?? 'USD'}`);
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

  const latestConfidence = [...steps].reverse().find((s) => s.confidence != null)?.confidence;

  return (
    <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden flex flex-col h-full min-h-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-gray-200 font-mono">qwen-agent</span>
          <span className="text-xs text-gray-500 font-mono truncate max-w-[160px]">{inquiryId.slice(-12)}</span>
        </div>
        {outcome && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
            outcome === 'sent'      ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700' :
            outcome === 'escalated' ? 'bg-yellow-900/60 text-yellow-300 border-yellow-700' :
                                      'bg-red-900/60 text-red-300 border-red-700'
          }`}>
            {outcome === 'sent' ? '✓ Sent' : outcome === 'escalated' ? '⚑ Needs Review' : '✕ Failed'}
          </span>
        )}
      </div>

      {/* Step stream */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 font-mono text-sm">
        {steps.length === 0 && (
          <p className="text-gray-600 text-xs pt-4">Waiting for agent to start...</p>
        )}

        {steps.map((step, i) => (
          <div
            key={`${step.stepNumber}-${step.stepName}-${i}`}
            className={`flex gap-3 items-start transition-all duration-300 ${
              step.status === 'running' ? 'opacity-100' : 'opacity-90'
            }`}
          >
            <div className="mt-0.5 w-5 flex-shrink-0 flex justify-center">
              <StatusIcon status={step.status} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${
                  step.status === 'running'   ? 'text-violet-300' :
                  step.status === 'complete'  ? 'text-emerald-300' :
                  step.status === 'escalated' ? 'text-yellow-300' : 'text-red-300'
                }`}>
                  {STEP_LABELS[step.stepName] ?? step.stepName}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${MODEL_BADGE[step.model] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                  {step.model}
                </span>
                {step.durationMs != null && (
                  <span className="text-[10px] text-gray-600">{step.durationMs}ms</span>
                )}
              </div>
              {step.summary && (
                <p className={`text-xs mt-0.5 ${
                  step.status === 'running' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.summary}
                </p>
              )}
              {step.toolsCalled && step.toolsCalled.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {step.toolsCalled.map((t) => (
                    <span key={t} className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                      {t}()
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Outcome banner */}
        {outcome === 'sent' && quoteTotal && (
          <div className="mt-4 border border-emerald-700 bg-emerald-950/60 rounded-xl px-4 py-3">
            <p className="text-emerald-400 font-semibold text-sm">Quote sent automatically</p>
            <p className="text-emerald-300 text-2xl font-bold mt-0.5">{quoteTotal}</p>
            <p className="text-emerald-600 text-xs mt-1">Email delivered to customer &lt; 60 seconds after inquiry</p>
          </div>
        )}
        {outcome === 'escalated' && (
          <div className="mt-4 border border-yellow-700 bg-yellow-950/60 rounded-xl px-4 py-3">
            <p className="text-yellow-400 font-semibold text-sm">Escalated to human review</p>
            <p className="text-yellow-600 text-xs mt-1">Check the Approval Queue →</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Confidence meter */}
      {latestConfidence != null && (
        <div className="px-5 pb-4 pt-2 border-t border-gray-800">
          <ConfidenceMeter value={latestConfidence} />
        </div>
      )}
    </div>
  );
}
