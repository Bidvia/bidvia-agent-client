import { BidviaClient } from './client.js';
import type {
  BidviaApproveConnectionRequestInput,
  BidviaConnectionApprovalScenarioPlan,
  BidviaConnectionApprovalScenarioPlanInput,
  BidviaCreateConnectionRequestInput,
  BidviaScenarioVerificationBundle,
} from './contracts.js';

import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import {
  appendCompletedRouteStep,
  buildScenarioVerificationBundle,
} from './verification.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

function requireNonEmptyId(value: string, fieldName: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required for the connection approval scenario plan`);
  }

  return trimmedValue;
}

function requireAlignedConnectionApprovalActorIds(
  createConnectionRequest: BidviaCreateConnectionRequestInput,
  approveConnectionRequest: BidviaApproveConnectionRequestInput,
): void {
  if (createConnectionRequest.requesterActorId !== approveConnectionRequest.actorId) {
    throw new Error('requesterActorId and actorId must stay aligned across the connection approval scenario plan');
  }
}

export function buildConnectionApprovalScenarioPlan(
  input: BidviaConnectionApprovalScenarioPlanInput,
): BidviaConnectionApprovalScenarioPlan {
  const sourceMatchId = requireNonEmptyId(
    input.createConnectionRequest.sourceMatchId,
    'sourceMatchId',
  );
  const approvalRequestId = requireNonEmptyId(
    input.approveConnectionRequest.approvalRequestId,
    'approvalRequestId',
  );

  requireAlignedConnectionApprovalActorIds(
    input.createConnectionRequest,
    input.approveConnectionRequest,
  );

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'connection-approval',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      workflowStage: buildWorkflowStageReference(input.workflowIds, 'governed-run-execution'),
      expectedRouteChain: [
        buildScenarioRouteStep('createConnectionRequest', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('approveConnectionRequest', ['tenantId', 'principalId', 'companyId']),
      ],
      recordIds: {
        matches: [sourceMatchId],
        approvals: [approvalRequestId],
      },
    }),
    createConnectionRequestInput: {
      ...input.createConnectionRequest,
      sourceMatchId,
    },
    approveConnectionRequestInput: {
      ...input.approveConnectionRequest,
      approvalRequestId,
    },
  };
}

export async function runConnectionApprovalScenario(
  client: BidviaClient,
  plan: BidviaConnectionApprovalScenarioPlan,
): Promise<BidviaScenarioVerificationBundle> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  await client.createConnectionRequest(plan.createConnectionRequestInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  await client.approveConnectionRequest(plan.approveConnectionRequestInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[1]!,
  );

  return verificationBundle;
}
