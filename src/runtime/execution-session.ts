import {
  createExecutionHookRegistry,
  createRuntimeHookAudit,
} from './hooks.js';
import type { BuildExecutionSessionInput, BidviaExecutionSession } from './contracts.js';

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
export type * from './contracts.js';
