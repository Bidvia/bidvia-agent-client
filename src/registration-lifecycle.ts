import type { BidviaClient } from './client.js';
import type {
  BidviaReviewPacket,
  BidviaScenarioVerificationBundle,
  BidviaProvisionalAgentClaimInput,
  BidviaRegistrationLifecycleScenarioPlan,
  BidviaRegistrationLifecycleScenarioPlanInput,
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
import { listIdentitySessionPlaneCanonicalHelperKeys } from './identity-session-plane.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

export interface BidviaRegistrationLifecycleScenarioResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  reviewPacket: BidviaReviewPacket;
}

function requireAlignedProvisionalAgentRef(candidate: string, provisionalAgentRef: string): string {
  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate) {
    throw new Error('provisionalAgentRef is required for the registration lifecycle scenario plan');
  }

  if (trimmedCandidate !== provisionalAgentRef) {
    throw new Error('provisionalAgentRef must stay aligned across the registration lifecycle scenario plan');
  }

  return trimmedCandidate;
}

function requireNonEmptyRegistrationId(registrationId: string): string {
  const trimmedRegistrationId = registrationId.trim();
  if (!trimmedRegistrationId) {
    throw new Error('registrationId is required for the registration lifecycle scenario plan');
  }

  return trimmedRegistrationId;
}

function buildAlignedClaimInput(
  claimProvisionalAgent: BidviaProvisionalAgentClaimInput,
  provisionalAgentRef: string,
): BidviaProvisionalAgentClaimInput {
  return {
    ...claimProvisionalAgent,
    provisionalAgentRef: requireAlignedProvisionalAgentRef(
      claimProvisionalAgent.provisionalAgentRef,
      provisionalAgentRef,
    ),
  };
}

export function buildRegistrationLifecycleScenarioPlan(
  input: BidviaRegistrationLifecycleScenarioPlanInput,
): BidviaRegistrationLifecycleScenarioPlan {
  const provisionalAgentRef = input.createProvisionalAgent.provisionalAgentRef;
  const queryProvisionalAgentRef = requireAlignedProvisionalAgentRef(
    input.queryProvisionalAgent.provisionalAgentRef,
    provisionalAgentRef,
  );
  const claimProvisionalAgentInput = buildAlignedClaimInput(
    input.claimProvisionalAgent,
    provisionalAgentRef,
  );
  const registrationId = requireNonEmptyRegistrationId(input.registrationId);

  const [createProvisionalAgentRouteKey, queryProvisionalAgentRouteKey, claimProvisionalAgentRouteKey] =
    listIdentitySessionPlaneCanonicalHelperKeys();

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'registration-lifecycle',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      workflowStage: buildWorkflowStageReference(input.workflowIds, 'public-provisional'),
      expectedRouteChain: [
        buildScenarioRouteStep(createProvisionalAgentRouteKey, ['tenantId']),
        buildScenarioRouteStep(queryProvisionalAgentRouteKey, ['tenantId']),
        buildScenarioRouteStep(claimProvisionalAgentRouteKey, ['tenantId', 'sessionId']),
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
    createProvisionalAgentInput: input.createProvisionalAgent,
    queryProvisionalAgentRef,
    claimProvisionalAgentInput,
    postHeartbeatInput: input.postHeartbeat,
    uploadSyncInput: input.uploadSync,
    submitEvidenceInput: input.submitEvidence,
    submitProposalInput: input.submitProposal,
    registrationId,
  };
}

type BidviaRegistrationLifecycleClient = Pick<BidviaClient,
  'createProvisionalAgent'
  | 'queryProvisionalAgent'
  | 'claimProvisionalAgent'
  | 'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'>;

export async function runRegistrationLifecycleScenario(
  client: BidviaRegistrationLifecycleClient,
  plan: BidviaRegistrationLifecycleScenarioPlan,
): Promise<BidviaRegistrationLifecycleScenarioResult> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  await client.createProvisionalAgent(plan.createProvisionalAgentInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[0]!);

  await client.queryProvisionalAgent(plan.queryProvisionalAgentRef);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[1]!);

  await client.claimProvisionalAgent(plan.claimProvisionalAgentInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[2]!);

  await client.postHeartbeat(plan.postHeartbeatInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[3]!);

  await client.uploadSync(plan.uploadSyncInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[4]!);

  await client.downloadSync();
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[5]!);

  await client.submitEvidence(plan.submitEvidenceInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[6]!);

  await client.submitProposal(plan.submitProposalInput);
  verificationBundle = appendCompletedRouteStep(verificationBundle, plan.envelope.expectedRouteChain[7]!);

  return {
    verificationBundle,
    reviewPacket: buildReviewPacket({
      scenario: plan.envelope,
      bundle: verificationBundle,
    }),
  };
}
