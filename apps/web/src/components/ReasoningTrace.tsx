'use client';
import { useState } from 'react';

interface Step {
  stepNumber: number;
  stepName: string;
  model: string;
  durationMs: number;
  outputJson: unknown;
}

export function ReasoningTrace({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Qwen Reasoning Trace</h3>
      {steps.map((s) => (
        <div key={s.stepNumber} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => setOpen(open === s.stepNumber ? null : s.stepNumber)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-left"
          >
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">
                {s.stepNumber}
              </span>
              <span className="font-medium capitalize">{s.stepName.replace(/-/g, ' ')}</span>
              <span className="text-xs text-gray-400">{s.model}</span>
            </span>
            <span className="text-xs text-gray-400">{s.durationMs}ms</span>
          </button>
          {open === s.stepNumber && (
            <pre className="p-4 text-xs bg-gray-900 text-green-400 overflow-auto max-h-64">
              {JSON.stringify(s.outputJson, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
