import { BidviaClient } from './client.js';
import type {
  BidviaActivateListingInput,
  BidviaClosureGuidance,
  BidviaCreateListingInput,
  BidviaGenerateMatchCandidatesInput,
  BidviaScenarioEnvelope,
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

export interface BidviaIndustryUniverseScenarioExecutionResult {
  verificationBundle: BidviaScenarioVerificationBundle;
  executionResult: BidviaScenarioExecutionResult;
}

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
  closureGuidance: BidviaClosureGuidance;
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

function extractListingId(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return readString(record.listing_id)
    ?? readString(asRecord(record.listing)?.listing_id)
    ?? readString(record.listingId)
    ?? readString(asRecord(record.listing)?.listingId);
}

function extractTriggerEventId(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return readString(record.trigger_event_id)
    ?? readString(asRecord(record.activation)?.trigger_event_id)
    ?? readString(record.triggerEventId)
    ?? readString(asRecord(record.activation)?.triggerEventId);
}

function extractMatchIds(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const matches = record.matches;
  if (!Array.isArray(matches)) {
    return [];
  }

  return matches
    .map((match) => readString(asRecord(match)?.match_id) ?? readString(asRecord(match)?.matchId))
    .filter((matchId): matchId is string => matchId !== undefined);
}

function rebuildVerificationBundle(
  plan: BidviaIndustryUniverseScenarioPlan,
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
        buildScenarioRouteStep('createListing', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'user-create-listing',
          actorRole: 'user',
        }),
        buildScenarioRouteStep('activateListing', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'user-activate-listing',
          actorRole: 'user',
          progressionCheckpoint: {
            checkpointName: 'verify-activation-before-match-generation',
            verifyRecordGroups: ['listings'],
            guidance: 'confirm the activated listing id remains the record carried into match generation on the runtime-generated lane',
          },
        }),
        buildScenarioRouteStep('generateMatchCandidates', ['tenantId', 'principalId', 'companyId'], {
          stepName: 'user-generate-match-candidates',
          actorRole: 'user',
          progressionCheckpoint: {
            checkpointName: 'verify-match-id-before-connection-approval',
            verifyRecordGroups: ['matches'],
            guidance: 'capture the returned match id before continuing into downstream connection approval on the runtime-generated lane',
          },
        }),
      ],
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
    createListingInput: input.createListing,
    activateListingInput,
    generateMatchCandidatesInput,
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

export async function runIndustryUniverseScenario(
  client: BidviaClient,
  plan: BidviaIndustryUniverseScenarioPlan,
): Promise<BidviaScenarioVerificationBundle> {
  let verificationBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    recordIds: {},
  });

  let listingId = plan.createListingInput.listingId;
  let triggerEventId = plan.generateMatchCandidatesInput.triggerEventId;

  const createListingResult = await client.createListing(plan.createListingInput);
  listingId = extractListingId(createListingResult) ?? listingId;
  verificationBundle = rebuildVerificationBundle(plan, verificationBundle, {
    listings: [listingId],
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[0]!,
  );

  const activateListingResult = await client.activateListing({
    ...plan.activateListingInput,
    listingId,
  });
  triggerEventId = extractTriggerEventId(activateListingResult) ?? triggerEventId;
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[1]!,
  );

  const generateMatchCandidatesResult = await client.generateMatchCandidates({
    ...plan.generateMatchCandidatesInput,
    listingId,
    triggerEventId,
  });
  const matchIds = extractMatchIds(generateMatchCandidatesResult);
  const nextRecordIds: BidviaScenarioVerificationBundle['recordIds'] = {
    ...verificationBundle.recordIds,
  };
  if (matchIds.length > 0) {
    nextRecordIds.matches = matchIds;
  }
  verificationBundle = rebuildVerificationBundle(plan, verificationBundle, {
    ...nextRecordIds,
  });
  verificationBundle = appendCompletedRouteStep(
    verificationBundle,
    plan.envelope.expectedRouteChain[2]!,
  );

  return verificationBundle;
}

export async function executeIndustryUniverseScenario(
  client: BidviaClient,
  plan: BidviaIndustryUniverseScenarioPlan,
): Promise<BidviaIndustryUniverseScenarioExecutionResult> {
  const verificationBundle = await runIndustryUniverseScenario(client, plan);

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
        helperKey: 'runIndustryUniverseScenario',
        routePathTemplate: '/runtime/listings*',
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
