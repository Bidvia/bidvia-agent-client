import type {
  BidviaCorePlaneAdoptionStatus,
  BidviaLocalJourneyStageLabel,
  BidviaWorkflowStagePlaneView,
  BidviaWorkflowStageReference,
} from './contracts.js';
import { buildWorkflowStageCoreStageSemantics } from './core-payload-contract-matrix.js';
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';

const workflowStagePlaneAdoptionStatus: BidviaCorePlaneAdoptionStatus = {
  plane: 'workflow-stage',
  frozenInCore: true,
  payloadPacketStatus: 'blocked-pending-packet',
  ...getCorePlaneExecutionSummary('workflow-stage'),
  blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  notes: ['Keep local journey labels and transport workflow identifiers separate from blocked Core stage semantics.'],
};

const localJourneyStageLabels: BidviaLocalJourneyStageLabel[] = [
  'public-provisional',
  'governed-run-support',
  'governed-run-execution',
];

export function buildWorkflowStagePlaneView(): BidviaWorkflowStagePlaneView {
  const coreStageSemantics = buildWorkflowStageCoreStageSemantics();

  return {
    adoptionStatus: {
      ...workflowStagePlaneAdoptionStatus,
      notes: [...workflowStagePlaneAdoptionStatus.notes],
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
