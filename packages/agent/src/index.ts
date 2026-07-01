import { stepIntake } from './steps/1-intake.js';
import { stepDecide } from './steps/2-decide.js';
import { stepVerify } from './steps/3-verify.js';
import { stepDraftQuote } from './steps/4-draft-quote.js';
import { stepQA } from './steps/5-qa.js';
import { stepWriteEmail } from './steps/6-write-email.js';
import { callMcpTool } from './tools/mcp-caller.js';
import type { AgentInput, AgentOptions, AgentOutput, AgentStepEvent } from './types.js';

const STEP_META = [
  { stepNumber: 1, stepName: 'intake',       model: 'qwen-max',   summary: 'Parsing email — extracting intent, products, and urgency' },
  { stepNumber: 2, stepName: 'decide',        model: 'qwen-max',   summary: 'Planning tool calls — pricing lookup, CRM check' },
  { stepNumber: 3, stepName: 'verify',        model: 'qwen-turbo', summary: 'Verifying data completeness before quoting' },
  { stepNumber: 4, stepName: 'draft-quote',   model: 'qwen-plus',  summary: 'Generating structured quote with line items' },
  { stepNumber: 5, stepName: 'qa',            model: 'qwen-turbo', summary: 'Self-reviewing quote for accuracy and completeness' },
  { stepNumber: 6, stepName: 'write-email',   model: 'qwen-plus',  summary: 'Writing professional cover email' },
];

function emit(onStep: AgentOptions['onStep'], event: AgentStepEvent) {
  try { onStep?.(event); } catch { /* never let broadcast errors break the chain */ }
}

export async function runAgentChain(
  input: AgentInput,
  options: AgentOptions = {},
): Promise<AgentOutput> {
  const { onStep, confidenceThreshold = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.8) } = options;
  const traces = [];
  const toolResults: Record<string, unknown> = {};

  // ── Step 1: Intake ─────────────────────────────────────────────────────────
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[0], status: 'running' });
  const { result: intake, trace: t1 } = await stepIntake(input);
  traces.push(t1);
  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[0], status: 'complete',
    durationMs: t1.durationMs,
    summary: `Intent: "${intake.intent}" — ${intake.products.length} product(s), urgency: ${intake.urgency}`,
  });

  // ── Step 2: Decide ─────────────────────────────────────────────────────────
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[1], status: 'running' });
  const { result: decide, trace: t2 } = await stepDecide(input, intake);
  traces.push(t2);
  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[1], status: 'complete',
    durationMs: t2.durationMs,
    confidence: decide.confidence,
    toolsCalled: decide.toolCalls.map((c) => c.tool),
    summary: `Confidence ${Math.round(decide.confidence * 100)}% — calling ${decide.toolCalls.map((c) => c.tool).join(', ')}`,
  });

  // Execute MCP tool calls decided by Qwen
  for (const toolCall of decide.toolCalls) {
    emit(onStep, {
      inquiryId: input.inquiryId,
      stepNumber: 2,
      stepName: 'tool-call',
      model: 'mcp',
      status: 'running',
      summary: `Calling MCP tool: ${toolCall.tool}`,
    });
    // Normalise args: Qwen sometimes sends a bare string instead of an object.
    // Expand it into the canonical field name for that tool.
    let args = toolCall.args as Record<string, unknown>;
    if (typeof args === 'string' || typeof args === 'number') {
      const scalar = args;
      if (toolCall.tool === 'lookup_customer') args = { email: scalar };
      else if (toolCall.tool === 'get_pricing') args = { product: scalar, qty: (toolCall as Record<string, unknown>).qty ?? 1 };
      else args = { value: scalar };
    }
    // Hoist top-level qty/product siblings that Qwen sometimes places next to args
    const tc = toolCall as Record<string, unknown>;
    if (toolCall.tool === 'get_pricing') {
      if (!args.product && typeof args === 'object') args = { ...args, product: tc.args ?? tc.product ?? tc.sku ?? 'UNKNOWN' };
      if (!args.qty && tc.qty) args = { ...args, qty: tc.qty };
    }
    if (toolCall.tool === 'lookup_customer' && !args.email) {
      args = { ...args, email: tc.args ?? tc.email ?? tc.customerEmail ?? '' };
    }
    const toolResult = await callMcpTool(toolCall.tool, args);
    // Accumulate repeated tool calls (e.g. get_pricing called once per product) into an array
    if (toolCall.tool in toolResults) {
      const existing = toolResults[toolCall.tool];
      toolResults[toolCall.tool] = Array.isArray(existing) ? [...existing, toolResult] : [existing, toolResult];
    } else {
      toolResults[toolCall.tool] = toolResult;
    }
    emit(onStep, {
      inquiryId: input.inquiryId,
      stepNumber: 2,
      stepName: 'tool-call',
      model: 'mcp',
      status: 'complete',
      summary: `${toolCall.tool} returned successfully`,
    });
  }

  // Escalate if low confidence or explicit escalation decision
  if (decide.action === 'escalate' || decide.confidence < confidenceThreshold) {
    const reason = decide.action === 'escalate'
      ? `Agent escalated: ${decide.reasoning}`
      : `Confidence ${decide.confidence.toFixed(2)} below threshold ${confidenceThreshold}`;

    await callMcpTool('flag_for_human', { inquiryId: input.inquiryId, reason, confidence: decide.confidence });
    emit(onStep, {
      inquiryId: input.inquiryId, stepNumber: 2, stepName: 'decide',
      model: 'qwen-max', status: 'escalated', summary: reason,
    });

    return { inquiryId: input.inquiryId, escalated: true, escalateReason: reason, confidence: decide.confidence, intake, decide, traces, toolResults };
  }

  // ── Step 3: Verify ─────────────────────────────────────────────────────────
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[2], status: 'running' });
  const { result: verify, trace: t3 } = await stepVerify(intake, toolResults);
  traces.push(t3);
  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[2], status: verify.complete ? 'complete' : 'escalated',
    durationMs: t3.durationMs,
    summary: verify.complete
      ? `All data verified — ${verify.resolvedLineItems.length} line items ready`
      : `Gaps found: ${verify.gaps.join(', ')}`,
  });

  if (!verify.complete) {
    const reason = `Verification failed — gaps: ${verify.gaps.join(', ')}`;
    await callMcpTool('flag_for_human', { inquiryId: input.inquiryId, reason, confidence: decide.confidence });
    return { inquiryId: input.inquiryId, escalated: true, escalateReason: reason, confidence: decide.confidence, intake, decide, verify, traces, toolResults };
  }

  // ── Step 4: Draft Quote ────────────────────────────────────────────────────
  const customerData = toolResults['lookup_customer'] ?? {};
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[3], status: 'running' });
  const { result: draftQuote, trace: t4 } = await stepDraftQuote(verify, customerData);
  traces.push(t4);

  const quoteRecord = await callMcpTool('create_quote', {
    inquiryId: input.inquiryId,
    lineItems: draftQuote.lineItems,
    currency: draftQuote.currency,
  });
  toolResults['create_quote'] = quoteRecord;

  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[3], status: 'complete',
    durationMs: t4.durationMs,
    summary: `Quote drafted — $${draftQuote.total} ${draftQuote.currency} across ${draftQuote.lineItems.length} line items`,
  });

  // ── Step 5: QA ────────────────────────────────────────────────────────────
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[4], status: 'running' });
  const { result: qa, trace: t5 } = await stepQA(input, intake, draftQuote);
  traces.push(t5);
  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[4], status: qa.passed ? 'complete' : 'escalated',
    durationMs: t5.durationMs,
    summary: qa.passed
      ? `QA passed — quality: ${qa.overallQuality}`
      : `QA failed — ${qa.issues.join('; ')}`,
  });

  if (!qa.passed) {
    const reason = `QA failed: ${qa.issues.join('; ')}`;
    await callMcpTool('flag_for_human', { inquiryId: input.inquiryId, reason, confidence: decide.confidence * 0.7 });
    return { inquiryId: input.inquiryId, escalated: true, escalateReason: reason, confidence: decide.confidence, intake, decide, verify, draftQuote, qa, traces, toolResults };
  }

  // ── Step 6: Write Email ────────────────────────────────────────────────────
  emit(onStep, { inquiryId: input.inquiryId, ...STEP_META[5], status: 'running' });
  const { result: email, trace: t6 } = await stepWriteEmail(input, intake, draftQuote, customerData);
  traces.push(t6);
  emit(onStep, {
    inquiryId: input.inquiryId, ...STEP_META[5], status: 'complete',
    durationMs: t6.durationMs,
    summary: `Cover email ready — "${email.subject}"`,
  });

  console.log(`[agent] chain complete — email.subject="${email?.subject}" draftQuote.total=${draftQuote?.total}`);
  return { inquiryId: input.inquiryId, escalated: false, confidence: decide.confidence, intake, decide, verify, draftQuote, qa, email, traces, toolResults };
}

export type { AgentInput, AgentOutput, AgentStepEvent, AgentOptions };
export type { DraftQuoteResult, LineItem } from './types.js';
