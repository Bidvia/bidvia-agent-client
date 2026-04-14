import type {
  BidviaCorePlaneWaveStatus,
  BidviaCorePlaneAdoptionSnapshot,
  BidviaCorePlaneAdoptionStatus,
  BidviaStage3ReleaseGate,
} from './contracts.js';
import {
  listCorePayloadPlaneAdoptionSummaries,
} from './core-payload-contract-matrix.js';

const bidviaCorePlaneAdoptionNotesByPlane: Record<BidviaCorePlaneAdoptionStatus['plane'], string[]> = {
  'identity-session': ['Adopt canonical onboarding and governed-read posture without inventing broader session semantics.'],
  task: ['Keep local task shells descriptive-only and block packet-incomplete task semantics.'],
  capability: ['Route remote capability refresh through one fail-closed capability-plane adapter.'],
  'workflow-stage': ['Keep local journey labels separate from Core workflow and stage truth until packet-grounded.'],
  'event-notification': ['Expose frozen notification visibility and packet-grounded delivery or acknowledgement semantics directly from Core-owned payload truth.'],
  'enterprise-integration': ['Regroup bounded commercial, document, media, attachment, and evidence helpers behind one plane adapter.'],
};

export function listCorePlaneAdoptionStatuses(): BidviaCorePlaneAdoptionStatus[] {
  return listCorePayloadPlaneAdoptionSummaries().map((status) => ({
    ...status,
    frozenInCore: true,
    notes: [...bidviaCorePlaneAdoptionNotesByPlane[status.plane]],
  }));
}

export function buildCorePlaneAdoptionSnapshot(): BidviaCorePlaneAdoptionSnapshot {
  return {
    sourceOfTruth: 'core-downstream-contract-center',
    statuses: listCorePlaneAdoptionStatuses(),
  };
}

const stage3ReleaseGateValidatorCommands: BidviaStage3ReleaseGate['requiredValidatorCommands'] = [
  'npm test',
  'npm run typecheck',
  'npm run build',
  'npm run validate',
  'npm run validate:release-readiness',
  'npm run validate:release-gate',
];

const stage3ReleaseGateWavePlanes: Array<Pick<BidviaCorePlaneWaveStatus, 'wave' | 'planes'>> = [
  {
    wave: 'P0',
    planes: ['identity-session', 'task', 'event-notification'],
  },
  {
    wave: 'P1',
    planes: ['capability', 'workflow-stage'],
  },
  {
    wave: 'P2',
    planes: ['enterprise-integration'],
  },
];

function isStage3ProofPlaneComplete(status: BidviaCorePlaneAdoptionStatus): boolean {
  return status.payloadPacketStatus === 'packet-grounded';
}

function isCanonicalRouteModelAlignmentStale(): boolean {
  return true;
}

export function listStage3ReleaseGateValidatorCommands(): BidviaStage3ReleaseGate['requiredValidatorCommands'] {
  return [...stage3ReleaseGateValidatorCommands];
}

export function listCorePlaneWaveStatuses(): BidviaCorePlaneWaveStatus[] {
  const adoptionStatuses = listCorePlaneAdoptionStatuses();
  const canonicalRouteModelAlignmentStale = isCanonicalRouteModelAlignmentStale();

  return stage3ReleaseGateWavePlanes.map(({ wave, planes }) => ({
    wave,
    status: !canonicalRouteModelAlignmentStale
      && planes.every((plane) => adoptionStatuses.some((status) => status.plane === plane && isStage3ProofPlaneComplete(status)))
      ? 'complete'
      : 'blocked',
    planes: [...planes],
  }));
}

export function buildStage3ReleaseGate(): BidviaStage3ReleaseGate {
  const waves = listCorePlaneWaveStatuses();
  const blockedBy: string[] = [];

  if (waves.some((wave) => wave.status !== 'complete')) {
    blockedBy.push('plane-adoption-incomplete');
  }

  if (isCanonicalRouteModelAlignmentStale()) {
    blockedBy.push('canonical-route-model-alignment-stale');
  }

  return {
    status: blockedBy.length === 0 ? 'ready' : 'blocked',
    blockedBy: blockedBy as unknown as BidviaStage3ReleaseGate['blockedBy'],
    requiredValidatorCommands: listStage3ReleaseGateValidatorCommands(),
    waves,
  };
}
