import type {
  BidviaClaimAcceptInput,
  BidviaClaimWriteInput,
  BidviaClientContext,
  BidviaClientRequestPolicy,
  BidviaLeaseWriteInput,
  BidviaMaybePromise,
  BidviaTaskDispatchCompleteInput,
  BidviaTaskDispatchFailInput,
  BidviaTaskDispatchResumeInput,
  BidviaTaskDispatchSuspendInput,
} from '../contracts.js';
import type {
  BidviaLocalTaskParticipationObservation,
  BidviaTaskRetryAwarenessShell,
} from '../task-participation.js';
import type {
  BidviaExecutionHookRegistry,
  BidviaRuntimeHookAudit,
} from './hooks.js';

export interface BidviaExecutionIdentityContext
  extends Pick<
    BidviaClientContext,
    'tenantId' | 'agentId' | 'principalId' | 'principalType' | 'authorizedRole' | 'registrationId' | 'sessionId' | 'adminSessionId' | 'companyId'
  > {}

export interface BidviaTaskRuntimeClientPort {
  createClaim(
    agentRegistrationId: string,
    input: BidviaClaimWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  acceptClaim(
    agentRegistrationId: string,
    claimId: string,
    input: BidviaClaimAcceptInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  createLease(
    agentRegistrationId: string,
    input: BidviaLeaseWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  suspendTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchSuspendInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  resumeTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchResumeInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  completeTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchCompleteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  failTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchFailInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
}

export interface BidviaExecutionRuntimeDependencies {
  createClient: () => BidviaMaybePromise<BidviaTaskRuntimeClientPort>;
  now: () => string;
}

export interface BidviaExecutionRuntimeContext {
  sessionRef: string;
  transport: 'sdk-client' | 'cli' | 'mcp' | 'custom';
  dependencies: BidviaExecutionRuntimeDependencies;
}

export type BidviaTaskHandleStatus =
  | 'idle'
  | 'offered'
  | 'claimed'
  | 'leased'
  | 'executing'
  | 'suspended'
  | 'completed'
  | 'failed';

export interface BidviaTaskHandle {
  localTaskRef: string;
  taskId?: string;
  status: BidviaTaskHandleStatus;
  participation?: BidviaLocalTaskParticipationObservation | BidviaTaskRetryAwarenessShell;
}

export interface BidviaCapabilityMemoryHandle {
  scope: 'local-capability-memory';
  capabilityKey: string;
  memoryRef: string;
  revision?: string;
}

export interface BidviaExecutionSessionHookEvent {
  sessionId: string;
  taskId?: string;
  capabilityKey?: string;
}

export interface BuildExecutionSessionInput {
  sessionId: string;
  identity: BidviaExecutionIdentityContext;
  runtime: BidviaExecutionRuntimeContext;
  task: BidviaTaskHandle;
  capabilityMemory: BidviaCapabilityMemoryHandle;
  hooks: BidviaExecutionHookRegistry;
  hookAudit?: BidviaRuntimeHookAudit;
}

export interface BidviaExecutionSession {
  scope: 'local-execution-session';
  sessionId: string;
  identity: BidviaExecutionIdentityContext;
  runtime: BidviaExecutionRuntimeContext;
  task: BidviaTaskHandle;
  capabilityMemory: BidviaCapabilityMemoryHandle;
  hooks: BidviaExecutionHookRegistry;
  hookAudit: BidviaRuntimeHookAudit;
}

export interface BidviaRuntimeOwnedResultCommitInput {
  transport: 'cli' | 'mcp';
  helperKey: string;
  taskDispatchId: string;
  resultRef: string;
  kind: string;
  terminalState: 'complete' | 'fail';
  detail?: string;
}

export interface BidviaRuntimeOwnedResultCommitResponse {
  outcomeRef: string;
}

export type BidviaTaskRuntimeStatus =
  | 'idle'
  | 'claimed'
  | 'accepted'
  | 'leased'
  | 'executing'
  | 'suspended'
  | 'locally-completed'
  | 'locally-failed'
  | 'result-committed'
  | 'completed'
  | 'failed';

export interface BidviaTaskRuntimePendingResult {
  resultRef: string;
  kind: string;
  terminalState: 'complete' | 'fail';
  commitState: 'staged' | 'committed';
  outcomeRef?: string;
  detail?: string;
}

export interface BidviaTaskRuntimeState {
  scope: 'local-task-runtime';
  sessionRef: string;
  localTaskRef: string;
  taskId?: string;
  taskDispatchId: string;
  status: BidviaTaskRuntimeStatus;
  attempt: number;
  claimId?: string;
  ackId?: string;
  leaseId?: string;
  pendingResult?: BidviaTaskRuntimePendingResult;
  participation?: unknown;
}

export interface CreateBidviaTaskRuntimeInput {
  session: BidviaExecutionSession;
  taskDispatchId: string;
  journalPath?: string;
}

export interface BidviaTaskRuntimeClaimInput {
  offerId: string;
  claimRef: string;
  claimKind: string;
  summary: string;
}

export interface BidviaTaskRuntimeReceiveInput {
  offerId: string;
  summary: string;
  leaseExpiresAt?: string;
  timeoutAt?: string;
}

export interface BidviaTaskRuntimeAcceptInput {
  claimId: string;
  summary: string;
}

export interface BidviaTaskRuntimeLeaseInput {
  leaseScope: string;
  expiresAt: string;
  summary: string;
}

export interface BidviaTaskRuntimeSuspendInput {
  reason: string;
}

export interface BidviaTaskRuntimeResumeInput {
  reason: string;
}

export interface BidviaTaskRuntimeCapabilityCallInput<T> {
  helperKey?: string;
  capabilityKey?: string;
  input?: unknown;
  call: () => Promise<T>;
}

export interface BidviaTaskRuntimeStageResultInput {
  resultRef: string;
  kind: string;
  terminalState: 'complete' | 'fail';
  checkpointRef: string;
  detail?: string;
}

export interface BidviaTaskRuntimeCommitResultInput {
  commit: () => Promise<{ outcomeRef: string }>;
}

export interface BidviaTaskRuntimeCompleteInput {
  reason: string;
}

export interface BidviaTaskRuntimeFailInput {
  reason: string;
}

export interface BidviaTaskRuntimeTimeoutInput {
  timeoutId: string;
  summary: string;
  priorLeaseId?: string;
}
