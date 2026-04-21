import type {
  BidviaScenarioActorRole,
  BidviaScenarioProgressionCheckpoint,
  BidviaLocalJourneyStageLabel,
  BidviaScenarioContextKey,
  BidviaScenarioEnvelope,
  BidviaScenarioRouteStep,
  BidviaWorkflowStageReference,
} from './contracts.js';
import { buildWorkflowStageReference } from './workflow-stage-plane.js';

export interface BidviaScenarioEnvelopeInput extends Omit<BidviaScenarioEnvelope, 'workflowStage'> {
  workflowStage?: BidviaWorkflowStageReference;
}

export interface BidviaScenarioRouteStepGuidance {
  stepName?: string;
  actorRole?: BidviaScenarioActorRole;
  progressionCheckpoint?: BidviaScenarioProgressionCheckpoint;
}

function uniqueValues<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function buildScenarioRouteStep(
  routeKey: string,
  requiredContext: BidviaScenarioContextKey[],
  guidance: BidviaScenarioRouteStepGuidance = {},
): BidviaScenarioRouteStep {
  const normalizedRouteKey = routeKey.trim();
  if (!normalizedRouteKey) {
    throw new Error('routeKey is required');
  }

  return {
    routeKey: normalizedRouteKey,
    requiredContext: uniqueValues(requiredContext),
    ...(guidance.stepName === undefined ? {} : { stepName: guidance.stepName.trim() }),
    ...(guidance.actorRole === undefined ? {} : { actorRole: guidance.actorRole }),
    ...(guidance.progressionCheckpoint === undefined
      ? {}
      : {
        progressionCheckpoint: {
          checkpointName: guidance.progressionCheckpoint.checkpointName.trim(),
          verifyRecordGroups: uniqueValues(guidance.progressionCheckpoint.verifyRecordGroups),
          guidance: guidance.progressionCheckpoint.guidance.trim(),
        },
      }),
  };
}

export function requireNonEmptyScenarioRouteChain(expectedRouteChain: BidviaScenarioRouteStep[]): BidviaScenarioRouteStep[] {
  if (expectedRouteChain.length === 0) {
    throw new Error('expectedRouteChain must contain at least one route step');
  }

  return expectedRouteChain;
}

export function buildScenarioEnvelope(envelope: BidviaScenarioEnvelopeInput): BidviaScenarioEnvelope {
  const scenarioId = envelope.scenarioId.trim();
  if (!scenarioId) {
    throw new Error('scenarioId is required');
  }

  const workflowIds = uniqueValues(envelope.workflowIds);

  return {
    ...envelope,
    scenarioId,
    scenarioLabel: envelope.scenarioLabel.trim(),
    scenarioFamily: envelope.scenarioFamily.trim(),
    sourceRefs: uniqueValues(envelope.sourceRefs),
    evidenceRefs: uniqueValues(envelope.evidenceRefs),
    traceIds: uniqueValues(envelope.traceIds),
    workflowIds,
    workflowStage: envelope.workflowStage
      ? buildWorkflowStageReference(
        envelope.workflowStage.workflowIds,
        envelope.workflowStage.localStageLabel as BidviaLocalJourneyStageLabel | null,
      )
      : buildWorkflowStageReference(workflowIds, null),
    expectedRouteChain: requireNonEmptyScenarioRouteChain(envelope.expectedRouteChain),
  };
}
