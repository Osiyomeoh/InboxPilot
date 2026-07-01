'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface Settings {
  confidenceThreshold: number;
  followupDelayDays: number;
  followupMaxCount: number;
  imapConfigured: boolean;
  imapHost: string | null;
  imapUser: string | null;
  fromEmail: string;
  mcpServerUrl: string;
  qwenBaseUrl: string;
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-outline-variant last:border-0">
      <div className="flex-1 pr-8">
        <p className="text-sm font-medium text-on-surface">{label}</p>
        {description && <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ReadOnlyBadge({ value }: { value: string }) {
  return (
    <span className="inline-block px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs font-mono">
      {value}
    </span>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.getSettings();
      setSettings(res as unknown as Settings);
    } catch {
      // API offline in dev without backend
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSetting(key: string, value: number) {
    if (!settings) return;
    setSaving(key);
    setSaved(null);
    try {
      await api.updateSettings({ [key]: value });
      setSettings((s) => s ? { ...s, [key]: value } : s);
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  const ConfidenceSlider = () => {
    const [local, setLocal] = useState(settings?.confidenceThreshold ?? 0.8);
    useEffect(() => { setLocal(settings?.confidenceThreshold ?? 0.8); }, []);
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0.5}
          max={0.95}
          step={0.05}
          value={local}
          onChange={(e) => setLocal(Number(e.target.value))}
          onMouseUp={() => saveSetting('confidenceThreshold', local)}
          onTouchEnd={() => saveSetting('confidenceThreshold', local)}
          className="w-36 accent-primary"
        />
        <span className={`text-sm font-bold tabular-nums w-10 ${local >= 0.8 ? 'text-[#16a34a]' : local >= 0.65 ? 'text-[#d97706]' : 'text-red-500'}`}>
          {Math.round(local * 100)}%
        </span>
        {saving === 'confidenceThreshold' && <span className="material-symbols-outlined spinner-rotate text-primary text-sm">autorenew</span>}
        {saved === 'confidenceThreshold' && <span className="material-symbols-outlined text-[#16a34a] text-sm">check_circle</span>}
      </div>
    );
  };

  const NumberInput = ({ field, min, max, unit }: { field: keyof Settings; min: number; max: number; unit?: string }) => {
    const [local, setLocal] = useState(Number(settings?.[field] ?? 0));
    useEffect(() => { setLocal(Number(settings?.[field] ?? 0)); }, [field]);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border border-outline-variant rounded-lg overflow-hidden">
          <button
            onClick={() => { const v = Math.max(min, local - 1); setLocal(v); saveSetting(field as string, v); }}
            className="px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low transition-colors text-lg leading-none"
          >
            −
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold text-on-surface tabular-nums min-w-[2rem] text-center">
            {local}
          </span>
          <button
            onClick={() => { const v = Math.min(max, local + 1); setLocal(v); saveSetting(field as string, v); }}
            className="px-3 py-1.5 text-on-surface-variant hover:bg-surface-container-low transition-colors text-lg leading-none"
          >
            +
          </button>
        </div>
        {unit && <span className="text-sm text-on-surface-variant">{unit}</span>}
        {saving === field && <span className="material-symbols-outlined spinner-rotate text-primary text-sm">autorenew</span>}
        {saved === field && <span className="material-symbols-outlined text-[#16a34a] text-sm">check_circle</span>}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight">Settings</h2>
        <p className="text-sm text-on-surface-variant mt-0.5">Configure the InboxPilot agent behaviour</p>
      </div>

      {!settings ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined spinner-rotate text-primary text-3xl">autorenew</span>
        </div>
      ) : (
        <>
          {/* Agent Behaviour */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-outline-variant">
              <h3 className="text-sm font-semibold text-on-surface">Agent Behaviour</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Controls when Qwen auto-sends vs escalates to a human reviewer
              </p>
            </div>
            <div className="px-6">
              <SettingRow
                label="Confidence threshold"
                description="Inquiries below this score are sent to the Approval Queue instead of auto-sent"
              >
                <ConfidenceSlider />
              </SettingRow>
              <SettingRow
                label="Follow-up delay"
                description="Days to wait before sending a follow-up if the customer hasn't replied"
              >
                <NumberInput field="followupDelayDays" min={1} max={14} unit="days" />
              </SettingRow>
              <SettingRow
                label="Max follow-ups"
                description="Maximum follow-up emails per thread (0 = disabled)"
              >
                <NumberInput field="followupMaxCount" min={0} max={5} unit="emails" />
              </SettingRow>
            </div>
          </section>

          {/* Email / IMAP */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-outline-variant">
              <h3 className="text-sm font-semibold text-on-surface">Email Ingest</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                IMAP connection settings — edit via <code className="text-xs font-mono">.env</code> and restart the API
              </p>
            </div>
            <div className="px-6">
              <SettingRow label="Status">
                {settings.imapConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                    <span className="h-2 w-2 rounded-full bg-[#16a34a] animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-outline">
                    <span className="h-2 w-2 rounded-full bg-outline" />
                    Not configured
                  </span>
                )}
              </SettingRow>
              <SettingRow label="IMAP host">
                <ReadOnlyBadge value={settings.imapHost ?? '—'} />
              </SettingRow>
              <SettingRow label="IMAP user">
                <ReadOnlyBadge value={settings.imapUser ?? '—'} />
              </SettingRow>
              <SettingRow label="From email" description="Used as the sender address for outbound quotes">
                <ReadOnlyBadge value={settings.fromEmail} />
              </SettingRow>
            </div>
          </section>

          {/* AI / MCP */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-outline-variant">
              <h3 className="text-sm font-semibold text-on-surface">AI & MCP</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Qwen model and MCP tool server endpoints
              </p>
            </div>
            <div className="px-6">
              <SettingRow label="Qwen API base URL">
                <ReadOnlyBadge value={settings.qwenBaseUrl} />
              </SettingRow>
              <SettingRow label="MCP server URL">
                <ReadOnlyBadge value={settings.mcpServerUrl} />
              </SettingRow>
              <SettingRow label="Reasoning models" description="Steps 1, 2, 3, 5 use qwen-max; Steps 4, 6 use qwen-plus">
                <div className="flex gap-2">
                  <span className="px-2 py-1 rounded text-[10px] font-semibold bg-surface-container text-on-secondary-container border border-outline-variant">
                    qwen-max
                  </span>
                  <span className="px-2 py-1 rounded text-[10px] font-semibold bg-primary-fixed text-on-primary-fixed border border-outline-variant">
                    qwen-plus
                  </span>
                </div>
              </SettingRow>
            </div>
          </section>

          {/* Danger zone */}
          <section className="border border-red-200 rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-red-100 bg-red-50/40">
              <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-on-surface">Clear all activity logs</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Permanently deletes all activity log entries. Inquiries and quotes are preserved.</p>
              </div>
              <button
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                onClick={() => alert('Not implemented in demo — would DELETE /activity in production')}
              >
                Clear logs
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
