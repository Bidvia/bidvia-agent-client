import type { BidviaMaybePromise } from '../contracts.js';

export type BidviaRuntimeLifecycleEventName =
  | 'session-opened'
  | 'task-attached'
  | 'capability-memory-accessed'
  | 'task-detached'
  | 'session-closed'
  | 'task-received'
  | 'task-claimed'
  | 'capability-called'
  | 'result-staged'
  | 'result-committed'
  | 'task-failed'
  | 'task-timed-out'
  | 'task-resumed';

export interface BidviaRuntimeHookEvent {
  eventName: BidviaRuntimeLifecycleEventName;
  sessionId: string;
  sessionRef?: string;
  localTaskRef?: string;
  taskDispatchId?: string;
  taskId?: string;
  capabilityKey?: string;
  status?: string;
  detail?: string;
  recordedAt: string;
  input?: unknown;
  payload?: unknown;
  result?: unknown;
}

export type BidviaRuntimeHook = (event: BidviaRuntimeHookEvent) => BidviaMaybePromise<void>;

export interface BidviaRuntimeHookFailure {
  eventName: BidviaRuntimeLifecycleEventName;
  hookIndex: number;
  message: string;
  recordedAt: string;
}

export interface BidviaRuntimeHookAudit {
  failures: BidviaRuntimeHookFailure[];
}

export interface BidviaExecutionHookRegistry {
  onSessionOpened: ReadonlyArray<BidviaRuntimeHook>;
  onTaskAttached: ReadonlyArray<BidviaRuntimeHook>;
  onCapabilityMemoryAccessed: ReadonlyArray<BidviaRuntimeHook>;
  onTaskDetached: ReadonlyArray<BidviaRuntimeHook>;
  onSessionClosed: ReadonlyArray<BidviaRuntimeHook>;
  onTaskReceived: ReadonlyArray<BidviaRuntimeHook>;
  onTaskClaimed: ReadonlyArray<BidviaRuntimeHook>;
  onCapabilityCalled: ReadonlyArray<BidviaRuntimeHook>;
  onResultStaged: ReadonlyArray<BidviaRuntimeHook>;
  onResultCommitted: ReadonlyArray<BidviaRuntimeHook>;
  onTaskFailed: ReadonlyArray<BidviaRuntimeHook>;
  onTaskTimedOut: ReadonlyArray<BidviaRuntimeHook>;
  onTaskResumed: ReadonlyArray<BidviaRuntimeHook>;
}

export interface CreateExecutionHookRegistryInput {
  onSessionOpened?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskAttached?: ReadonlyArray<BidviaRuntimeHook>;
  onCapabilityMemoryAccessed?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskDetached?: ReadonlyArray<BidviaRuntimeHook>;
  onSessionClosed?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskReceived?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskClaimed?: ReadonlyArray<BidviaRuntimeHook>;
  onCapabilityCalled?: ReadonlyArray<BidviaRuntimeHook>;
  onResultStaged?: ReadonlyArray<BidviaRuntimeHook>;
  onResultCommitted?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskFailed?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskTimedOut?: ReadonlyArray<BidviaRuntimeHook>;
  onTaskResumed?: ReadonlyArray<BidviaRuntimeHook>;
}

const registryKeysByEventName: Record<BidviaRuntimeLifecycleEventName, keyof BidviaExecutionHookRegistry> = {
  'session-opened': 'onSessionOpened',
  'task-attached': 'onTaskAttached',
  'capability-memory-accessed': 'onCapabilityMemoryAccessed',
  'task-detached': 'onTaskDetached',
  'session-closed': 'onSessionClosed',
  'task-received': 'onTaskReceived',
  'task-claimed': 'onTaskClaimed',
  'capability-called': 'onCapabilityCalled',
  'result-staged': 'onResultStaged',
  'result-committed': 'onResultCommitted',
  'task-failed': 'onTaskFailed',
  'task-timed-out': 'onTaskTimedOut',
  'task-resumed': 'onTaskResumed',
};

export function createExecutionHookRegistry(
  input: CreateExecutionHookRegistryInput = {},
): BidviaExecutionHookRegistry {
  return {
    onSessionOpened: [...(input.onSessionOpened ?? [])],
    onTaskAttached: [...(input.onTaskAttached ?? [])],
    onCapabilityMemoryAccessed: [...(input.onCapabilityMemoryAccessed ?? [])],
    onTaskDetached: [...(input.onTaskDetached ?? [])],
    onSessionClosed: [...(input.onSessionClosed ?? [])],
    onTaskReceived: [...(input.onTaskReceived ?? [])],
    onTaskClaimed: [...(input.onTaskClaimed ?? [])],
    onCapabilityCalled: [...(input.onCapabilityCalled ?? [])],
    onResultStaged: [...(input.onResultStaged ?? [])],
    onResultCommitted: [...(input.onResultCommitted ?? [])],
    onTaskFailed: [...(input.onTaskFailed ?? [])],
    onTaskTimedOut: [...(input.onTaskTimedOut ?? [])],
    onTaskResumed: [...(input.onTaskResumed ?? [])],
  };
}

export function createRuntimeHookAudit(): BidviaRuntimeHookAudit {
  return {
    failures: [],
  };
}

export async function dispatchRuntimeHooks(
  registry: BidviaExecutionHookRegistry,
  audit: BidviaRuntimeHookAudit,
  event: BidviaRuntimeHookEvent,
): Promise<void> {
  const registryKey = registryKeysByEventName[event.eventName];
  const hooks = registry[registryKey];

  for (const [index, hook] of hooks.entries()) {
    try {
      await hook(event);
    } catch (error) {
      audit.failures.push({
        eventName: event.eventName,
        hookIndex: index,
        message: error instanceof Error ? error.message : String(error),
        recordedAt: event.recordedAt,
      });
    }
  }
}

export function cloneRuntimeHookFailures(audit: BidviaRuntimeHookAudit): BidviaRuntimeHookFailure[] {
  return audit.failures.map((failure) => ({ ...failure }));
}
