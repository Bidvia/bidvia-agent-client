import { BidviaClient } from './client.js';
import type {
  BidviaActivateListingInput,
  BidviaCreateListingInput,
  BidviaGenerateMatchCandidatesInput,
  BidviaScenarioEnvelope,
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

export interface BidviaIndustryUniverseScenarioPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  createListing: BidviaCreateListingInput;
  activateListing: Omit<BidviaActivateListingInput, 'listingId'> & { listingId?: string };
  generateMatchCandidates: Omit<BidviaGenerateMatchCandidatesInput, 'listingId'> & { listingId?: string };
}

export interface BidviaIndustryUniverseScenarioPlan {
  envelope: BidviaScenarioEnvelope;
  createListingInput: BidviaCreateListingInput;
  activateListingInput: BidviaActivateListingInput;
  generateMatchCandidatesInput: BidviaGenerateMatchCandidatesInput;
}

function resolveAlignedListingId(candidate: string | undefined, listingId: string): string {
  if (!candidate) {
    return listingId;
  }

  if (candidate !== listingId) {
    throw new Error('listingId must stay aligned across the industry universe scenario plan');
  }

  return candidate;
}

export function buildIndustryUniverseScenarioPlan(
  input: BidviaIndustryUniverseScenarioPlanInput,
): BidviaIndustryUniverseScenarioPlan {
  const listingId = input.createListing.listingId;
  const activateListingInput: BidviaActivateListingInput = {
    listingId: resolveAlignedListingId(input.activateListing.listingId, listingId),
    now: input.activateListing.now,
  };
  const generateMatchCandidatesInput: BidviaGenerateMatchCandidatesInput = {
    listingId: resolveAlignedListingId(input.generateMatchCandidates.listingId, listingId),
    upstreamDecision: input.generateMatchCandidates.upstreamDecision,
    requiredEvidenceLevel: input.generateMatchCandidates.requiredEvidenceLevel,
    detectedEvidenceLevel: input.generateMatchCandidates.detectedEvidenceLevel,
    workflowRunId: input.generateMatchCandidates.workflowRunId,
    triggerEventId: input.generateMatchCandidates.triggerEventId,
    topN: input.generateMatchCandidates.topN,
    now: input.generateMatchCandidates.now,
  };

  return {
    envelope: buildScenarioEnvelope({
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      scenarioFamily: 'industry-universe',
      sourceRefs: input.sourceRefs,
      evidenceRefs: input.evidenceRefs,
      traceIds: input.traceIds,
      workflowIds: input.workflowIds,
      expectedRouteChain: [
        buildScenarioRouteStep('createListing', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('activateListing', ['tenantId', 'principalId', 'companyId']),
        buildScenarioRouteStep('generateMatchCandidates', ['tenantId', 'principalId', 'companyId']),
      ],
    }),
    createListingInput: input.createListing,
    activateListingInput,
    generateMatchCandidatesInput,
  };
}

export async function runIndustryUniverseScenario(
  client: BidviaClient,
  plan: BidviaIndustryUniverseScenarioPlan,
): Promise<BidviaScenarioVerificationBundle> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    recordIds: {
      listings: [plan.createListingInput.listingId],
    },
  });

  await client.createListing(plan.createListingInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  await client.activateListing(plan.activateListingInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[1]!,
  );

  await client.generateMatchCandidates(plan.generateMatchCandidatesInput);
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[2]!,
  );

  return verificationBundle;
}
