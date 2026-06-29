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
