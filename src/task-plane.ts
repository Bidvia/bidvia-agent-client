import type {
  BidviaClaimAcceptInput,
  BidviaClaimRejectInput,
  BidviaClaimWriteInput,
  BidviaCorePlaneAdoptionStatus,
  BidviaLeaseWriteInput,
  BidviaParticipationStateWriteInput,
  BidviaTaskDispatchAssignInput,
  BidviaTaskDispatchCompleteInput,
  BidviaTaskDispatchFailInput,
  BidviaTaskDispatchResumeInput,
  BidviaTaskDispatchSuspendInput,
  BidviaTaskDispatchWriteInput,
  BidviaTaskPlaneCapabilityMode,
  BidviaTaskPlaneView,
} from './contracts.js';
import { listCorePlaneAdoptionStatuses } from './core-plane-adoption.js';
import { listPlaneExecutionGates } from './plane-execution-gate.js';

function requireTaskPlaneAdoptionStatus(): BidviaCorePlaneAdoptionStatus {
  const adoptionStatus = listCorePlaneAdoptionStatuses().find((status) => status.plane === 'task');
  if (!adoptionStatus) {
    throw new Error('Missing core plane adoption status for task');
  }

  return adoptionStatus;
}

const taskPlaneExecutionGates = listPlaneExecutionGates().filter((gate) => gate.plane === 'task');

const taskPlaneVisibilityOnlyHelperKeys = taskPlaneExecutionGates
  .filter((gate) => gate.executionTruth === 'packet-grounded-read')
  .map((gate) => gate.helperKey);

const taskPlaneExecutableHelperKeys = taskPlaneExecutionGates
  .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
  .map((gate) => gate.helperKey);

const taskPlaneCompatibilityOnlyHelperKeys = taskPlaneExecutionGates
  .filter((gate) => gate.executionTruth === 'compatibility-only')
  .map((gate) => gate.helperKey);

const taskPlaneCapabilityModeByHelperKey = new Map<string, BidviaTaskPlaneCapabilityMode>(
  [
    ...taskPlaneVisibilityOnlyHelperKeys.map(
      (helperKey): readonly [string, BidviaTaskPlaneCapabilityMode] => [helperKey, 'visibility-only'],
    ),
    ...taskPlaneCompatibilityOnlyHelperKeys.map(
      (helperKey): readonly [string, BidviaTaskPlaneCapabilityMode] => [helperKey, 'compatibility-only'],
    ),
    ...taskPlaneExecutableHelperKeys.map(
      (helperKey): readonly [string, BidviaTaskPlaneCapabilityMode] => [helperKey, 'packet-grounded-execution'],
    ),
  ],
);

export function buildTaskPlaneView(): BidviaTaskPlaneView {
  const adoptionStatus = requireTaskPlaneAdoptionStatus();

  return {
    adoptionStatus: {
      ...adoptionStatus,
      notes: [...adoptionStatus.notes],
    },
    localShellBoundary: {
      descriptiveOnly: true,
      schedulerAuthorityClaim: false,
      timeoutSemantics: 'local-only',
      notes: [
        'Local task shells stay descriptive-only and do not become scheduler authority.',
        'Do not invent remote timeout payload fields from local timeout observations.',
      ],
    },
    capabilityModes: {
      visibilityOnlyHelperKeys: [...taskPlaneVisibilityOnlyHelperKeys],
      executableHelperKeys: [...taskPlaneExecutableHelperKeys],
    },
    outcomeTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      remotePayloadSupported: true,
      notes: [
        'Suspend, resume, completion, and fail helpers stay limited to the frozen payload fields already present in the current client truth.',
      ],
    },
    timeoutTruth: {
      payloadPacketStatus: 'packet-grounded',
      blockedBy: null,
      localOnly: true,
      remotePayloadSupported: true,
      notes: [
        'Timeout-linked dispatch and notification state now derives from the frozen Core task-plane payload family.',
      ],
    },
  };
}

export function getTaskPlaneCapabilityMode(
  helperKey: string,
): BidviaTaskPlaneCapabilityMode | undefined {
  return taskPlaneCapabilityModeByHelperKey.get(helperKey);
}

export function buildTaskPlaneCliSnapshot() {
  const taskPlane = buildTaskPlaneView();

  return {
    adoptionStatus: taskPlane.adoptionStatus,
    localShellBoundary: taskPlane.localShellBoundary,
    timeoutTruth: taskPlane.timeoutTruth,
  };
}

export function buildTaskPlaneParticipationStateBody(input: BidviaParticipationStateWriteInput) {
  return {
    state: input.state,
    reason: input.reason,
    now: input.now,
    ...(input.participationRole === undefined ? {} : { participation_role: input.participationRole }),
    ...(input.visibility === undefined ? {} : { visibility: input.visibility }),
    ...(input.contextHandoffState === undefined ? {} : { context_handoff_state: input.contextHandoffState }),
    ...(input.contextHandoffRef === undefined ? {} : { context_handoff_ref: input.contextHandoffRef }),
    ...(input.coordinationOwnerKind === undefined ? {} : { coordination_owner_kind: input.coordinationOwnerKind }),
    ...(input.coordinationOwnerRef === undefined ? {} : { coordination_owner_ref: input.coordinationOwnerRef }),
  };
}

export function buildTaskPlaneLeaseBody(input: BidviaLeaseWriteInput) {
  return {
    lease_scope: input.leaseScope,
    now: input.now,
    expires_at: input.expiresAt,
  };
}

export function buildTaskPlaneTaskDispatchBody(input: BidviaTaskDispatchWriteInput) {
  return {
    task_kind: input.taskKind,
    task_ref: input.taskRef,
    now: input.now,
    reason: input.reason,
  };
}

export function buildTaskPlaneTaskAssignBody(input: BidviaTaskDispatchAssignInput) {
  return {
    assigned_to_registration_id: input.assignedToRegistrationId,
    now: input.now,
    reason: input.reason,
  };
}

export function buildTaskPlaneTaskStatusBody(
  input: BidviaTaskDispatchSuspendInput | BidviaTaskDispatchResumeInput,
) {
  return {
    now: input.now,
    reason: input.reason,
  };
}

export function buildTaskPlaneTaskOutcomeBody(
  input: BidviaTaskDispatchCompleteInput | BidviaTaskDispatchFailInput,
) {
  return {
    now: input.now,
    reason: input.reason,
    outcome_ref: input.outcomeRef,
  };
}

export function buildTaskPlaneClaimBody(input: BidviaClaimWriteInput) {
  return {
    claim_kind: input.claimKind,
    claim_ref: input.claimRef,
    now: input.now,
    ...(input.taskDispatchId === undefined ? {} : { task_dispatch_id: input.taskDispatchId }),
  };
}

export function buildTaskPlaneClaimAcceptBody(input: BidviaClaimAcceptInput) {
  return {
    now: input.now,
    ...(input.taskDispatchId === undefined ? {} : { task_dispatch_id: input.taskDispatchId }),
  };
}

export function buildTaskPlaneClaimRejectBody(input: BidviaClaimRejectInput) {
  return {
    reason: input.reason,
    now: input.now,
    ...(input.taskDispatchId === undefined ? {} : { task_dispatch_id: input.taskDispatchId }),
  };
}

export function buildTaskPlaneLocalParticipationProjection(
  localStatus: string,
  localTaskRef?: string,
): {
  status: string;
  taskId?: string;
} {
  return {
    status: localStatus,
    ...(localTaskRef === undefined ? {} : { taskId: localTaskRef }),
  };
}
