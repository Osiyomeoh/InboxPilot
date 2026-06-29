import { stepIntake } from './steps/1-intake.js';
import { stepDecide } from './steps/2-decide.js';
import { stepVerify } from './steps/3-verify.js';
import { stepDraftQuote } from './steps/4-draft-quote.js';
import { stepQA } from './steps/5-qa.js';
import { stepWriteEmail } from './steps/6-write-email.js';
import { callMcpTool } from './tools/mcp-caller.js';
import type { AgentInput, AgentOutput } from './types.js';

export async function runAgentChain(input: AgentInput): Promise<AgentOutput> {
  const traces = [];
  const toolResults: Record<string, unknown> = {};
  const confidenceThreshold = Number(process.env.CONFIDENCE_THRESHOLD ?? 0.8);

  // Step 1: Intake — parse email into structured data
  const { result: intake, trace: t1 } = await stepIntake(input);
  traces.push(t1);

  // Step 2: Decide — which tools to call
  const { result: decide, trace: t2 } = await stepDecide(input, intake);
  traces.push(t2);

  // Execute tool calls from Step 2
  for (const toolCall of decide.toolCalls) {
    const key = `${toolCall.tool}:${JSON.stringify(toolCall.args)}`;
    toolResults[toolCall.tool] = await callMcpTool(toolCall.tool, toolCall.args);
    console.log(`[agent] tool:${toolCall.tool} →`, toolResults[toolCall.tool]);
  }

  // Escalate if agent decided to or confidence is below threshold
  if (decide.action === 'escalate' || decide.confidence < confidenceThreshold) {
    const reason = decide.action === 'escalate'
      ? `Agent decided to escalate: ${decide.reasoning}`
      : `Confidence ${decide.confidence} below threshold ${confidenceThreshold}`;

    // Call flag_for_human tool
    await callMcpTool('flag_for_human', {
      inquiryId: input.inquiryId,
      reason,
      confidence: decide.confidence,
    });

    return {
      inquiryId: input.inquiryId,
      escalated: true,
      escalateReason: reason,
      confidence: decide.confidence,
      intake,
      decide,
      traces,
      toolResults,
    };
  }

  // Step 3: Verify — do we have enough info to quote?
  const { result: verify, trace: t3 } = await stepVerify(intake, toolResults);
  traces.push(t3);

  if (!verify.complete) {
    const reason = `Verification failed — gaps: ${verify.gaps.join(', ')}`;
    await callMcpTool('flag_for_human', {
      inquiryId: input.inquiryId,
      reason,
      confidence: decide.confidence,
    });

    return {
      inquiryId: input.inquiryId,
      escalated: true,
      escalateReason: reason,
      confidence: decide.confidence,
      intake,
      decide,
      verify,
      traces,
      toolResults,
    };
  }

  // Step 4: Draft Quote
  const customerData = toolResults['lookup_customer'] ?? {};
  const { result: draftQuote, trace: t4 } = await stepDraftQuote(verify, customerData);
  traces.push(t4);

  // Persist quote via MCP
  const quoteRecord = await callMcpTool('create_quote', {
    inquiryId: input.inquiryId,
    lineItems: draftQuote.lineItems,
    currency: draftQuote.currency,
  });
  toolResults['create_quote'] = quoteRecord;

  // Step 5: QA — self-review the quote
  const { result: qa, trace: t5 } = await stepQA(input, intake, draftQuote);
  traces.push(t5);

  if (!qa.passed) {
    const reason = `QA failed: ${qa.issues.join('; ')}`;
    await callMcpTool('flag_for_human', {
      inquiryId: input.inquiryId,
      reason,
      confidence: decide.confidence * 0.7,
    });

    return {
      inquiryId: input.inquiryId,
      escalated: true,
      escalateReason: reason,
      confidence: decide.confidence,
      intake,
      decide,
      verify,
      draftQuote,
      qa,
      traces,
      toolResults,
    };
  }

  // Step 6: Write cover email
  const { result: email, trace: t6 } = await stepWriteEmail(input, intake, draftQuote, customerData);
  traces.push(t6);

  return {
    inquiryId: input.inquiryId,
    escalated: false,
    confidence: decide.confidence,
    intake,
    decide,
    verify,
    draftQuote,
    qa,
    email,
    traces,
    toolResults,
  };
}

export type { AgentInput, AgentOutput };
