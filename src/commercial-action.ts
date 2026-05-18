import type { BidviaClient } from './client.js';
import type {
  BidviaReviewPacket,
  BidviaScenarioExecutionResult,
  BidviaScenarioVerificationBundle,
  BidviaCommercialActionExecuteInput,
  BidviaCommercialActionPolicyCheckInput,
  BidviaCommercialActionRequestApprovalInput,
  BidviaCommercialActionScenarioPlan,
  BidviaCommercialActionScenarioPlanInput,
  BidviaEnterpriseIntegrationPlaneHelperGroup,
} from './contracts.js';
import { getEnterpriseIntegrationPlaneHelperGroup } from './enterprise-integration-plane.js';
import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import {
  appendCompletedRouteStep,
  buildScenarioExecutionResult,
  buildReviewPacket,
  buildScenarioVerificationBundle,
} from './verification.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

export interface BidviaCommercialActionScenarioResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

export interface BidviaCommercialActionScenarioExecutionResult extends BidviaCommercialActionScenarioResult {
  executionResult: BidviaScenarioExecutionResult;
}

export interface BidviaCommercialActionScenarioReview {
  status: unknown;
  receipt: unknown;
  audit: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractCommercialActionRequestId(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return readString(record.commercial_action_request_id)
    ?? readString(asRecord(record.commercial_action)?.commercial_action_request_id)
    ?? readString(record.commercialActionRequestId)
    ?? readString(asRecord(record.commercial_action)?.commercialActionRequestId)
    ?? readString(asRecord(record.commercialAction)?.commercialActionRequestId);
}

function rebuildVerificationBundle(
  plan: BidviaCommercialActionScenarioPlan,
  verificationBundle: BidviaScenarioVerificationBundle,
  recordIds: BidviaScenarioVerificationBundle['recordIds'],
): BidviaScenarioVerificationBundle {
  return buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: verificationBundle.verificationMode,
    completedRouteChain: verificationBundle.completedRouteChain,
    recordIds,
  });
}

function resolveCommercialActionRequestId(
  plan: BidviaCommercialActionScenarioPlan,
  verificationBundle?: BidviaScenarioVerificationBundle,
): string {
  const runtimeCommercialActionRequestId = verificationBundle?.recordIds.commercialActions?.[0];
  return runtimeCommercialActionRequestId ?? plan.policyCheckCommercialActionInput.commercialActionRequestId;
}

function requireNonEmptyId(value: string, fieldName: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required for the commercial action scenario plan`);
  }

  return trimmedValue;
}

function requireAlignedCommercialActionRequestIds(
  policyCheckCommercialAction: BidviaCommercialActionPolicyCheckInput,
  requestCommercialActionApproval: BidviaCommercialActionRequestApprovalInput,
  executeCommercialAction: BidviaCommercialActionExecuteInput,
): void {
  if (policyCheckCommercialAction.commercialActionRequestId !== requestCommercialActionApproval.commercialActionRequestId
    || requestCommercialActionApproval.commercialActionRequestId !== executeCommercialAction.commercialActionRequestId) {
    throw new Error('commercialActionRequestId must stay aligned across the commercial action scenario plan');
  }
}

function requireAlignedApprovalRequestIds(
  requestCommercialActionApproval: BidviaCommercialActionRequestApprovalInput,
  executeCommercialAction: BidviaCommercialActionExecuteInput,
): void {
  if (requestCommercialActionApproval.approvalRequestId !== executeCommercialAction.approvalRequestId) {
    throw new Error('approvalRequestId must stay aligned across the commercial action scenario plan');
  }
}

export function buildCommercialActionScenarioPlan(
  input: BidviaCommercialActionScenarioPlanInput,
): BidviaCommercialActionScenarioPlan {
  const commercialActionRequestId = requireNonEmptyId(
    input.policyCheckCommercialAction.commercialActionRequestId,
    'commercialActionRequestId',
  );
  const approvalRequestId = requireNonEmptyId(
    input.requestCommercialActionApproval.approvalRequestId,
    'approvalRequestId',
  );
  const receiptId = requireNonEmptyId(
    input.executeCommercialAction.receiptId,
    'receiptId',
  );

  requireAlignedCommercialActionRequestIds(
    input.policyCheckCommercialAction,
    input.requestCommercialActionApproval,
    input.executeCommercialAction,
  );
  requireAlignedApprovalRequestIds(
    input.requestCommercialActionApproval,
    input.executeCommercialAction,
  );

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'commercial-action',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      workflowStage: buildWorkflowStageReference(input.workflowIds, 'governed-run-execution'),
      expectedRouteChain: [
        buildScenarioRouteStep('createCommercialAction', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('policyCheckCommercialAction', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('requestCommercialActionApproval', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('executeCommercialAction', ['tenantId', 'principalId', 'companyId']),
      ],
      recordIds: {
        commercialActions: [commercialActionRequestId],
        approvals: [approvalRequestId],
        receipts: [receiptId],
      },
    }),
    createCommercialActionInput: input.createCommercialAction,
    policyCheckCommercialActionInput: {
      ...input.policyCheckCommercialAction,
      commercialActionRequestId,
    },
    requestCommercialActionApprovalInput: {
      ...input.requestCommercialActionApproval,
      commercialActionRequestId,
      approvalRequestId,
    },
    executeCommercialActionInput: {
      ...input.executeCommercialAction,
      commercialActionRequestId,
      approvalRequestId,
      receiptId,
    },
  };
}

export async function runCommercialActionScenario(
  client: BidviaClient,
  plan: BidviaCommercialActionScenarioPlan,
): Promise<BidviaCommercialActionScenarioResult> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  let commercialActionRequestId = plan.policyCheckCommercialActionInput.commercialActionRequestId;

  const createCommercialActionResult = await client.createCommercialAction(plan.createCommercialActionInput);
  commercialActionRequestId = extractCommercialActionRequestId(createCommercialActionResult) ?? commercialActionRequestId;
  const seededApprovals = plan.envelope.recordIds?.approvals ?? [];
  const seededReceipts = plan.envelope.recordIds?.receipts ?? [];
  verificationBundle = rebuildVerificationBundle(plan, verificationBundle, {
    commercialActions: [commercialActionRequestId],
    approvals: [...seededApprovals],
    receipts: [...seededReceipts],
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  await client.policyCheckCommercialAction({
    ...plan.policyCheckCommercialActionInput,
    commercialActionRequestId,
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[1]!,
  );

  await client.requestCommercialActionApproval({
    ...plan.requestCommercialActionApprovalInput,
    commercialActionRequestId,
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[2]!,
  );

  await client.executeCommercialAction({
    ...plan.executeCommercialActionInput,
    commercialActionRequestId,
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[3]!,
  );

  return {
    verificationBundle,
    reviewPacket: buildReviewPacket({
      scenario: plan.envelope,
      bundle: verificationBundle,
    }),
  };
}

export async function readCommercialActionScenarioReview(
  client: BidviaClient,
  plan: BidviaCommercialActionScenarioPlan,
  verificationBundle?: BidviaScenarioVerificationBundle,
): Promise<BidviaCommercialActionScenarioReview> {
  const commercialActionRequestId = resolveCommercialActionRequestId(plan, verificationBundle);

  return {
    status: await client.getCommercialActionStatus({ commercialActionRequestId }),
    receipt: await client.getCommercialActionReceipt({ commercialActionRequestId }),
    audit: await client.getCommercialActionAudit({ commercialActionRequestId }),
  };
}

export async function executeCommercialActionScenario(
  client: BidviaClient,
  plan: BidviaCommercialActionScenarioPlan,
): Promise<BidviaCommercialActionScenarioExecutionResult> {
  const result = await runCommercialActionScenario(client, plan);
  const executionResult = buildScenarioExecutionResult({
    scenarioId: plan.envelope.scenarioId,
    scenarioFamily: plan.envelope.scenarioFamily,
    verificationMode: result.verificationBundle.verificationMode,
    status: 'succeeded',
    closureStage: 'business-closure-deferred',
    ownership: 'claimant',
    resumable: true,
    evidence: {
      helperKey: 'runCommercialActionScenario',
      routePathTemplate: '/runtime/commercial-actions*',
      actorRole: 'user',
      contextSummary: {
        tenantIdPresent: true,
        principalIdPresent: true,
        companyIdPresent: true,
      },
      requestSummary: {
        method: 'SCENARIO',
      },
      responseSummary: {
        status: 200,
      },
    },
  });

  return {
    verificationBundle: result.verificationBundle,
    reviewPacket: buildReviewPacket({
      scenario: plan.envelope,
      bundle: result.verificationBundle,
      executionResult,
    }),
    executionResult,
  };
}

export function buildCommercialActionEnterpriseBoundary(): BidviaEnterpriseIntegrationPlaneHelperGroup {
  return getEnterpriseIntegrationPlaneHelperGroup('commercial-action');
}
