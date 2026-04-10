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
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';

const taskPlaneAdoptionStatus: BidviaCorePlaneAdoptionStatus = {
  plane: 'task',
  frozenInCore: true,
  payloadPacketStatus: 'blocked-pending-packet',
  ...getCorePlaneExecutionSummary('task'),
  blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  notes: ['Keep local task shells descriptive-only and block packet-incomplete task semantics.'],
};

const taskPlaneVisibilityOnlyHelperKeys = [
  'listParticipationStates',
  'getParticipationState',
  'listTaskDispatches',
  'getTaskDispatch',
] as const;

const taskPlaneExecutableHelperKeys = [
  'createParticipationState',
  'createLease',
  'createTaskDispatch',
  'assignTaskDispatch',
  'suspendTaskDispatch',
  'resumeTaskDispatch',
  'completeTaskDispatch',
  'failTaskDispatch',
  'createClaim',
  'acceptClaim',
  'rejectClaim',
] as const;

const taskPlaneCapabilityModeByHelperKey = new Map<string, BidviaTaskPlaneCapabilityMode>(
  [
    ...taskPlaneVisibilityOnlyHelperKeys.map(
      (helperKey): readonly [string, BidviaTaskPlaneCapabilityMode] => [helperKey, 'visibility-only'],
    ),
    ...taskPlaneExecutableHelperKeys.map(
      (helperKey): readonly [string, BidviaTaskPlaneCapabilityMode] => [helperKey, 'executable'],
    ),
  ],
);

export function buildTaskPlaneView(): BidviaTaskPlaneView {
  return {
    adoptionStatus: {
      ...taskPlaneAdoptionStatus,
      notes: [...taskPlaneAdoptionStatus.notes],
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
      payloadPacketStatus: 'blocked-pending-packet',
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
      localOnly: true,
      remotePayloadSupported: false,
      notes: [
        'Timeout semantics stay local-only until Core freezes packet-grounded timeout payload truth.',
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
