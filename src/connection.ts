import { BidviaClient } from './client.js';
import type {
  BidviaApproveConnectionRequestInput,
  BidviaConnectionApprovalScenarioPlan,
  BidviaConnectionApprovalScenarioPlanInput,
  BidviaCreateConnectionRequestInput,
  BidviaScenarioExecutionResult,
  BidviaScenarioVerificationBundle,
} from './contracts.js';

import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
} from './scenarios.js';
import {
  appendCompletedRouteStep,
  buildScenarioExecutionResult,
  buildScenarioVerificationBundle,
} from './verification.js';

export interface BidviaConnectionApprovalScenarioExecutionResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  executionResult: BidviaScenarioExecutionResult;
}
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
        buildScenarioRouteStep('createConnectionRequest', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'user-submit-connection-request',
          actorRole: 'user',
        }),
        buildScenarioRouteStep('approveConnectionRequest', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'admin-approve-connection-request',
          actorRole: 'admin',
          progressionCheckpoint: {
            checkpointName: 'verify-approval-request-before-opportunity-handoff',
            verifyRecordGroups: ['approvals'],
            guidance: 'confirm the approval request id is the one you hand to downstream opportunity and package steps',
          },
        }),
      ],
      recordIds: {
        matches: [sourceMatchId],
        approvals: [approvalRequestId],
      },
      closureGuidance: {
        lane: 'runtime-generated',
        fixedFixtureAssumptions: false,
        prerequisites: [
          'create supply and demand listings first',
          'activate both listings',
          'use the returned activation event id to generate a real persisted match',
          'continue downstream with the returned match and approval ids',
        ],
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
    closureGuidance: {
      lane: 'runtime-generated',
      fixedFixtureAssumptions: false,
      prerequisites: [
        'create supply and demand listings first',
        'activate both listings',
        'use the returned activation event id to generate a real persisted match',
        'continue downstream with the returned match and approval ids',
      ],
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

export async function executeConnectionApprovalScenario(
  client: BidviaClient,
  plan: BidviaConnectionApprovalScenarioPlan,
): Promise<BidviaConnectionApprovalScenarioExecutionResult> {
  const verificationBundle = await runConnectionApprovalScenario(client, plan);

  return {
    verificationBundle,
    executionResult: buildScenarioExecutionResult({
      scenarioId: plan.envelope.scenarioId,
      scenarioFamily: plan.envelope.scenarioFamily,
      verificationMode: verificationBundle.verificationMode,
      status: 'succeeded',
      closureStage: 'business-closure-deferred',
      ownership: 'claimant',
      resumable: true,
      evidence: {
        helperKey: 'runConnectionApprovalScenario',
        routePathTemplate: '/runtime/connection-requests|/runtime/approvals/:approvalRequestId/decision',
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
    }),
  };
}
