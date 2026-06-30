export interface AgentInput {
  inquiryId: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  bodyText: string;
}

export interface LineItem {
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface StepTrace {
  stepNumber: number;
  stepName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  inputJson: unknown;
  outputJson: unknown;
  durationMs: number;
}

export interface IntakeResult {
  intent: string;
  products: Array<{ name: string; qty: number }>;
  urgency: 'low' | 'medium' | 'high';
  ambiguities: string[];
  customerEmail: string;
}

export interface DecideResult {
  action: 'proceed' | 'escalate';
  toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
  reasoning: string;
  confidence: number;
}

export interface VerifyResult {
  complete: boolean;
  gaps: string[];
  resolvedLineItems: LineItem[];
}

export interface DraftQuoteResult {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  validUntil: string;
  terms: string;
}

export interface QAResult {
  passed: boolean;
  issues: string[];
  overallQuality: 'excellent' | 'good' | 'needs_revision';
}

export interface WriteEmailResult {
  subject: string;
  body: string;
  tone: string;
}

export type StepStatus = 'running' | 'complete' | 'escalated' | 'failed';

export interface AgentStepEvent {
  inquiryId: string;
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  model: string;
  durationMs?: number;
  /** Lightweight summary safe to push to UI — never full prompt text */
  summary?: string;
  confidence?: number;
  toolsCalled?: string[];
}

export interface AgentOptions {
  onStep?: (event: AgentStepEvent) => void;
  /** Override the confidence threshold for this run. Defaults to CONFIDENCE_THRESHOLD env var (0.8). */
  confidenceThreshold?: number;
}

export interface AgentOutput {
  inquiryId: string;
  escalated: boolean;
  escalateReason?: string;
  confidence: number;
  intake?: IntakeResult;
  decide?: DecideResult;
  verify?: VerifyResult;
  draftQuote?: DraftQuoteResult;
  qa?: QAResult;
  email?: WriteEmailResult;
  traces: StepTrace[];
  toolResults: Record<string, unknown>;
}
