import type {
  BidviaAgentLifecycleGuidance,
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
  BidviaTaskWakeupByLaneGuidance,
  BidviaTaskPlaneView,
  BidviaResultReportingLifecycleGuidance,
} from './contracts.js';
import { buildNotificationAcknowledgementPathGuidance } from './event-notification-plane.js';
import { buildHeartbeatLifecycleGuidance } from './heartbeat.js';
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

const canonicalTaskPlaneExecutableHelperOrder = [
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

const canonicalTaskPlaneExecutableHelperOrderSet = new Set<string>(canonicalTaskPlaneExecutableHelperOrder);

const taskPlaneVisibilityOnlyHelperKeys = taskPlaneExecutionGates
  .filter((gate) => gate.executionTruth === 'packet-grounded-read')
  .map((gate) => gate.helperKey);

const taskPlaneExecutableHelperKeySet = new Set(
  taskPlaneExecutionGates
    .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
    .map((gate) => gate.helperKey),
);

const taskPlaneExecutableHelperKeys = [
  ...canonicalTaskPlaneExecutableHelperOrder.filter((helperKey) => taskPlaneExecutableHelperKeySet.has(helperKey)),
  ...taskPlaneExecutionGates
    .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
    .map((gate) => gate.helperKey)
    .filter((helperKey) => !canonicalTaskPlaneExecutableHelperOrderSet.has(helperKey)),
];

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

export function buildTaskWakeupByLaneGuidance(): BidviaTaskWakeupByLaneGuidance {
  return {
    noDaemonClaim: 'Task wakeup stays lane-specific and descriptive-only in this client; the repo does not ship an automatic worker runtime.',
    lanes: [
      {
        lane: 'default-local-docker',
        wakeupPath: 'Use account-scoped task-dispatch reads and notification reads to observe work that Core/runtime has already surfaced, then execute the bounded task helpers explicitly.',
      },
      {
        lane: 'proof-lane-admin-session',
        wakeupPath: 'Use a real admin session for deterministic proof-lane walkthroughs instead of assuming ordinary default-lane wakeup behavior.',
      },
      {
        lane: 'runtime-generated',
        wakeupPath: 'Create the required runtime objects yourself, then continue with the returned ids and the shipped task or notification read surfaces.',
      },
    ],
  };
}

export function buildResultReportingLifecycleGuidance(): BidviaResultReportingLifecycleGuidance {
  return {
    helperKeys: ['createClaim', 'createLease', 'completeTaskDispatch', 'failTaskDispatch', 'acknowledgeNotification'],
    responsibility: 'Use claim or lease when the surfaced runtime path expects explicit task acceptance, then complete or fail the task dispatch and acknowledge the consumed notification when that account-scoped acknowledgement path is present.',
    failClosedState: 'Do not treat heartbeat or notification visibility alone as proof that a task was accepted, completed, failed, or acknowledged.',
  };
}

export function buildAgentLifecycleGuidance(): BidviaAgentLifecycleGuidance {
  return {
    lifecycleBoundary: 'Guidance only: the client can heartbeat, observe wakeup surfaces, execute bounded task helpers, and report results, but it does not become a daemon, scheduler, polling loop, or delivery engine.',
    heartbeat: buildHeartbeatLifecycleGuidance(),
    taskWakeupByLane: buildTaskWakeupByLaneGuidance(),
    resultReporting: buildResultReportingLifecycleGuidance(),
    notificationAcknowledgementPath: buildNotificationAcknowledgementPathGuidance(),
  };
}

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
    lifecycleGuidance: {
      wakeupByLane: buildTaskWakeupByLaneGuidance(),
      resultReporting: buildResultReportingLifecycleGuidance(),
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
