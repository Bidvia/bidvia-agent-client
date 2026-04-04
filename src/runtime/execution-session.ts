import type { BidviaClient } from '../client.js';
import type { BidviaClientContext, BidviaMaybePromise } from '../contracts.js';
import type {
  BidviaLocalTaskParticipationObservation,
  BidviaTaskRetryAwarenessShell,
} from '../task-participation.js';
import {
  createExecutionHookRegistry,
  createRuntimeHookAudit,
} from './hooks.js';
import type {
  BidviaExecutionHookRegistry,
  BidviaRuntimeHookAudit,
} from './hooks.js';

export interface BidviaExecutionIdentityContext
  extends Pick<
    BidviaClientContext,
    'tenantId' | 'principalId' | 'principalType' | 'authorizedRole' | 'registrationId' | 'sessionId' | 'adminSessionId' | 'companyId'
  > {}

export interface BidviaExecutionRuntimeDependencies {
  createClient: () => BidviaMaybePromise<BidviaClient>;
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

function requireNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }
}

function requireHookArray(value: unknown, fieldName: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
}

export function buildExecutionSession(input: BuildExecutionSessionInput): BidviaExecutionSession {
  requireNonEmptyString(input.sessionId, 'sessionId');
  requireNonEmptyString(input.runtime?.sessionRef, 'runtime.sessionRef');
  requireNonEmptyString(input.task?.localTaskRef, 'task.localTaskRef');
  requireNonEmptyString(input.capabilityMemory?.capabilityKey, 'capabilityMemory.capabilityKey');
  requireNonEmptyString(input.capabilityMemory?.memoryRef, 'capabilityMemory.memoryRef');

  if (typeof input.runtime?.dependencies?.createClient !== 'function') {
    throw new Error('runtime.dependencies.createClient is required');
  }

  if (typeof input.runtime.dependencies.now !== 'function') {
    throw new Error('runtime.dependencies.now is required');
  }

  requireHookArray(input.hooks?.onSessionOpened, 'hooks.onSessionOpened');
  requireHookArray(input.hooks?.onTaskAttached, 'hooks.onTaskAttached');
  requireHookArray(input.hooks?.onCapabilityMemoryAccessed, 'hooks.onCapabilityMemoryAccessed');
  requireHookArray(input.hooks?.onTaskDetached, 'hooks.onTaskDetached');
  requireHookArray(input.hooks?.onSessionClosed, 'hooks.onSessionClosed');
  requireHookArray(input.hooks?.onTaskReceived, 'hooks.onTaskReceived');
  requireHookArray(input.hooks?.onTaskClaimed, 'hooks.onTaskClaimed');
  requireHookArray(input.hooks?.onCapabilityCalled, 'hooks.onCapabilityCalled');
  requireHookArray(input.hooks?.onResultStaged, 'hooks.onResultStaged');
  requireHookArray(input.hooks?.onResultCommitted, 'hooks.onResultCommitted');
  requireHookArray(input.hooks?.onTaskFailed, 'hooks.onTaskFailed');
  requireHookArray(input.hooks?.onTaskTimedOut, 'hooks.onTaskTimedOut');
  requireHookArray(input.hooks?.onTaskResumed, 'hooks.onTaskResumed');

  return {
    scope: 'local-execution-session',
    sessionId: input.sessionId,
    identity: input.identity,
    runtime: input.runtime,
    task: input.task,
    capabilityMemory: input.capabilityMemory,
    hooks: input.hooks,
    hookAudit: input.hookAudit ?? createRuntimeHookAudit(),
  };
}

export { createExecutionHookRegistry };
