import type { BidviaClient } from './client.js';
import type {
  BidviaReviewPacket,
  BidviaScenarioVerificationBundle,
  BidviaRegisteredAgentOperationsScenarioPlan,
  BidviaRegisteredAgentOperationsScenarioPlanInput,
} from './contracts.js';
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

export interface BidviaRegisteredAgentOperationsScenarioResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

function requireNonEmptyRegistrationId(registrationId: string): string {
  const trimmedRegistrationId = registrationId.trim();
  if (!trimmedRegistrationId) {
    throw new Error('registrationId is required for the registered agent operations scenario plan');
  }

  return trimmedRegistrationId;
}

export function buildRegisteredAgentOperationsScenarioPlan(
  input: BidviaRegisteredAgentOperationsScenarioPlanInput,
): BidviaRegisteredAgentOperationsScenarioPlan {
  const registrationId = requireNonEmptyRegistrationId(input.registrationId);

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'registered-agent-operations',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      workflowStage: buildWorkflowStageReference(input.workflowIds, 'governed-run-execution'),
      expectedRouteChain: [
        buildScenarioRouteStep('postHeartbeat', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('uploadSync', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('downloadSync', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('submitEvidence', ['tenantId', 'principalId', 'registrationId']),
        buildScenarioRouteStep('submitProposal', ['tenantId', 'principalId', 'registrationId']),
      ],
      recordIds: {
        registrations: [registrationId],
      },
    }),
    postHeartbeatInput: input.postHeartbeat,
    uploadSyncInput: input.uploadSync,
    submitEvidenceInput: input.submitEvidence,
    submitProposalInput: input.submitProposal,
    registrationId,
  };
}

type BidviaRegisteredAgentOperationsClient = Pick<BidviaClient,
  'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'>;

export async function runRegisteredAgentOperationsScenario(
  client: BidviaRegisteredAgentOperationsClient,
  plan: BidviaRegisteredAgentOperationsScenarioPlan,
): Promise<BidviaRegisteredAgentOperationsScenarioResult> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  await client.postHeartbeat(plan.postHeartbeatInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[0]!);

  await client.uploadSync(plan.uploadSyncInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[1]!);

  await client.downloadSync();
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[2]!);

  await client.submitEvidence(plan.submitEvidenceInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[3]!);

  await client.submitProposal(plan.submitProposalInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[4]!);

  return {
    verificationBundle,
    reviewPacket: buildReviewPacket({
      scenario: plan.envelope,
      bundle: verificationBundle,
    }),
  };
}
