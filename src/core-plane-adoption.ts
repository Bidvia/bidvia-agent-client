import type {
  BidviaCorePlaneWaveStatus,
  BidviaCorePlaneAdoptionSnapshot,
  BidviaCorePlaneAdoptionStatus,
  BidviaStage3ReleaseGate,
} from './contracts.js';
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';

const bidviaCorePlaneAdoptionTemplate: BidviaCorePlaneAdoptionStatus[] = [
  {
    plane: 'identity-session',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('identity-session'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Adopt canonical onboarding and governed-read posture without inventing broader session semantics.'],
  },
  {
    plane: 'task',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('task'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Keep local task shells descriptive-only and block packet-incomplete task semantics.'],
  },
  {
    plane: 'capability',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('capability'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Route remote capability refresh through one fail-closed capability-plane adapter.'],
  },
  {
    plane: 'workflow-stage',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('workflow-stage'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Keep local journey labels separate from Core workflow and stage truth until packet-grounded.'],
  },
  {
    plane: 'event-notification',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('event-notification'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Expose frozen notification visibility now and fail closed on packet-incomplete execution semantics.'],
  },
  {
    plane: 'enterprise-integration',
    frozenInCore: true,
    payloadPacketStatus: 'blocked-pending-packet',
    ...getCorePlaneExecutionSummary('enterprise-integration'),
    blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    notes: ['Regroup bounded commercial, document, media, attachment, and evidence helpers behind one plane adapter.'],
  },
];

export function listCorePlaneAdoptionStatuses(): BidviaCorePlaneAdoptionStatus[] {
  return bidviaCorePlaneAdoptionTemplate.map((status) => ({
    ...status,
    notes: [...status.notes],
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

export function listStage3ReleaseGateValidatorCommands(): BidviaStage3ReleaseGate['requiredValidatorCommands'] {
  return [...stage3ReleaseGateValidatorCommands];
}

export function listCorePlaneWaveStatuses(): BidviaCorePlaneWaveStatus[] {
  const statusesByPlane = new Map(listCorePlaneAdoptionStatuses().map((status) => [status.plane, status]));

  return stage3ReleaseGateWavePlanes.map(({ wave, planes }) => ({
    wave,
    status: planes.every((plane) => statusesByPlane.get(plane)?.payloadPacketStatus === 'packet-grounded')
      ? 'complete'
      : 'blocked',
    planes: [...planes],
  }));
}

export function buildStage3ReleaseGate(): BidviaStage3ReleaseGate {
  const waves = listCorePlaneWaveStatuses();
  const blockedBy: BidviaStage3ReleaseGate['blockedBy'] = [];

  if (waves.some((wave) => wave.status !== 'complete')) {
    blockedBy.push('plane-adoption-incomplete');
  }

  return {
    status: blockedBy.length === 0 ? 'ready' : 'blocked',
    blockedBy,
    requiredValidatorCommands: listStage3ReleaseGateValidatorCommands(),
    waves,
  };
}
