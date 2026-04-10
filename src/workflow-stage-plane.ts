import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaLocalJourneyStageLabel,
  BidviaWorkflowStagePlaneView,
  BidviaWorkflowStageReference,
} from './contracts.js';
import { listCorePlaneAdoptionStatuses } from './core-plane-adoption.js';
import { buildWorkflowStageCoreStageSemantics } from './core-payload-contract-matrix.js';

function requireWorkflowStagePlaneAdoptionStatus(): BidviaCorePlaneAdoptionStatus {
  const adoptionStatus = listCorePlaneAdoptionStatuses().find((status) => status.plane === 'workflow-stage');
  if (!adoptionStatus) {
    throw new Error('Missing core plane adoption status for workflow stage');
  }

  return adoptionStatus;
}

const localJourneyStageLabels: BidviaLocalJourneyStageLabel[] = [
  'public-provisional',
  'governed-run-support',
  'governed-run-execution',
];

export function buildWorkflowStagePlaneView(): BidviaWorkflowStagePlaneView {
  const adoptionStatus = requireWorkflowStagePlaneAdoptionStatus();
  const coreStageSemantics = buildWorkflowStageCoreStageSemantics();

  return {
    adoptionStatus: {
      ...adoptionStatus,
      notes: [...adoptionStatus.notes],
    },
    localJourneyStages: {
      descriptiveOnly: true,
      labels: [...localJourneyStageLabels],
      notes: [
        'Local journey stages are operator-facing guidance only.',
        'Do not treat local journey labels as Core-owned stage identifiers or transition truth.',
      ],
    },
    workflowIdentifiers: {
      transportableScenarioMetadata: true,
      notes: [
        'Workflow identifiers remain transportable scenario metadata.',
        'A workflow ID does not prove Core stage semantics on its own.',
      ],
    },
    coreStageSemantics,
  };
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

export function buildWorkflowStageReference(
  workflowIds: readonly string[],
  localStageLabel: BidviaLocalJourneyStageLabel | null,
): BidviaWorkflowStageReference {
  return {
    workflowIds: uniqueValues([...workflowIds]),
    localStageLabel,
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'packet-grounded-read',
    blockedBy: null,
    transitionRule: null,
  };
}

export function getWorkflowStageLocalSemantics(
  _localStageLabel: BidviaLocalJourneyStageLabel,
): 'local-only' {
  return 'local-only';
}

export function buildWorkflowStagePlaneCliSnapshot() {
  const plane = buildWorkflowStagePlaneView();

  return {
    adoptionStatus: plane.adoptionStatus,
    localJourneyStages: plane.localJourneyStages,
    workflowIdentifiers: plane.workflowIdentifiers,
    coreStageSemantics: plane.coreStageSemantics,
  };
}
