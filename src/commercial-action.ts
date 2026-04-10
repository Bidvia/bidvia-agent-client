import type { BidviaClient } from './client.js';
import type {
  BidviaReviewPacket,
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
  buildReviewPacket,
  buildScenarioVerificationBundle,
} from './verification.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

export interface BidviaCommercialActionScenarioResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

export interface BidviaCommercialActionScenarioReview {
  status: unknown;
  receipt: unknown;
  audit: unknown;
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

  await client.createCommercialAction(plan.createCommercialActionInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  await client.policyCheckCommercialAction(plan.policyCheckCommercialActionInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[1]!,
  );

  await client.requestCommercialActionApproval(plan.requestCommercialActionApprovalInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[2]!,
  );

  await client.executeCommercialAction(plan.executeCommercialActionInput);
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
): Promise<BidviaCommercialActionScenarioReview> {
  const commercialActionRequestId = plan.policyCheckCommercialActionInput.commercialActionRequestId;

  return {
    status: await client.getCommercialActionStatus({ commercialActionRequestId }),
    receipt: await client.getCommercialActionReceipt({ commercialActionRequestId }),
    audit: await client.getCommercialActionAudit({ commercialActionRequestId }),
  };
}

export function buildCommercialActionEnterpriseBoundary(): BidviaEnterpriseIntegrationPlaneHelperGroup {
  return getEnterpriseIntegrationPlaneHelperGroup('commercial-action');
}
