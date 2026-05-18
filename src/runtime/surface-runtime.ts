import path from 'node:path';

import type { BidviaClient } from '../client.js';
import type { BidviaClientContext } from '../contracts.js';
import {
  buildExecutionSession,
  createExecutionHookRegistry,
  type BidviaExecutionIdentityContext,
  type BidviaExecutionSession,
} from './execution-session.js';
import {
  writeLocalAccumulation,
  type BidviaLocalAccumulation,
  type LocalAccumulationIoOptions,
  resolveLocalAccumulationPath,
} from './local-accumulation/store.js';
import {
  createBidviaTaskRuntime,
  type BidviaTaskRuntime,
} from './task-runtime.js';
import {
  BidviaRuntimeResultCommitUnavailableError,
  commitRuntimeOwnedResult,
} from './result-commit.js';
import { buildBidviaRuntimeClientPort } from './runtime-client-port.js';
import {
  buildBlockedCapabilityExecutionResult,
  isBlockedCapabilityExecutionError,
} from './capability-orchestration.js';
import {
  dispatchRuntimeHooks,
  type BidviaExecutionHookRegistry,
  type BidviaRuntimeLifecycleEventName,
} from './hooks.js';
import {
  buildBidviaSurfaceJournalFileName,
  buildBidviaSurfaceSessionRefs,
} from './surface-session-refs.js';

export interface BidviaSurfaceRuntimeIdentityContext extends BidviaExecutionIdentityContext {}

export interface RunBidviaSurfaceCapabilityInput<T> {
  transport: 'cli' | 'mcp';
  helperKey: string;
  capabilityKey?: string;
  identity: BidviaSurfaceRuntimeIdentityContext;
  input?: unknown;
  createClient: () => BidviaClient | Promise<BidviaClient>;
  execute: (client: BidviaClient) => Promise<T>;
  now: () => string;
  accumulation?: LocalAccumulationIoOptions;
  hooks?: BidviaExecutionHookRegistry;
}

function buildOnboardingFacts(identity: BidviaSurfaceRuntimeIdentityContext, now: string) {
  const facts: NonNullable<BidviaLocalAccumulation['onboardingMemory']['facts']> = [];
  const orderedEntries: Array<[keyof BidviaSurfaceRuntimeIdentityContext, string]> = [
    ['tenantId', 'tenantId'],
    ['principalId', 'principalId'],
    ['companyId', 'companyId'],
    ['registrationId', 'registrationId'],
    ['sessionId', 'sessionId'],
    ['adminSessionId', 'adminSessionId'],
    ['principalType', 'principalType'],
    ['authorizedRole', 'authorizedRole'],
  ];

  for (const [contextKey, factKey] of orderedEntries) {
    const value = identity[contextKey];

    if (typeof value === 'string' && value.length > 0 && value !== 'available-via-local-client-seam') {
      facts.push({
        key: factKey,
        value,
        recordedAt: now,
      });
    }
  }

  return facts;
}

function buildAccumulationFromRuntime(input: {
  runtime: BidviaTaskRuntime;
  helperKey: string;
  capabilityKey: string;
  identity: BidviaSurfaceRuntimeIdentityContext;
  recordedAt: string;
  succeeded?: boolean;
  blocked?: ReturnType<typeof buildBlockedCapabilityExecutionResult>;
}): Omit<BidviaLocalAccumulation, 'scope' | 'locality' | 'authority'> {
  const state = input.runtime.getState();
  const journal = input.runtime.getJournal();

  return {
    onboardingMemory: {
      scope: 'local-onboarding-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: state.sessionRef,
      facts: buildOnboardingFacts(input.identity, input.recordedAt),
      updatedAt: input.recordedAt,
    },
    taskExecutionMemory: {
      scope: 'local-task-execution-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: state.sessionRef,
      localTaskRef: state.localTaskRef,
      taskDispatchId: state.taskDispatchId,
      attempts: journal.attempts.map((attempt) => ({
        attempt: attempt.attempt,
        status: attempt.status,
        recordedAt: attempt.recordedAt,
      })),
      progressMarkers: journal.progressMarkers.map((marker) => ({
        marker: marker.marker,
        recordedAt: marker.recordedAt,
        ...(marker.detail === undefined ? {} : { detail: marker.detail }),
      })),
      updatedAt: input.recordedAt,
    },
    capabilityUsageMemory: {
      scope: 'local-capability-usage-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: state.sessionRef,
      localTaskRef: state.localTaskRef,
      capabilities: [{
        capabilityKey: input.capabilityKey,
        usage: input.blocked || input.succeeded === false
          ? []
          : [{
            helperKey: input.helperKey,
            recordedAt: input.recordedAt,
            outcome: 'succeeded',
          }],
        blockedAttempts: input.blocked
          ? [{
            helperKey: input.blocked.helperKey,
            recordedAt: input.recordedAt,
            executionKind: input.blocked.executionKind,
            missingContext: [...input.blocked.missingContext],
            blockedByPlaneGate: input.blocked.blockedByPlaneGate,
          }]
          : [],
      }],
      updatedAt: input.recordedAt,
    },
    resultMemory: {
      scope: 'local-result-memory',
      locality: 'local-only',
      authority: 'non-authoritative-cache',
      sessionRef: state.sessionRef,
      localTaskRef: state.localTaskRef,
      taskDispatchId: state.taskDispatchId,
      results: journal.pendingResultRefs.map((pendingResult) => ({
        resultRef: pendingResult.resultRef,
        kind: pendingResult.kind,
        terminalState: pendingResult.terminalState ?? 'complete',
        commitState: pendingResult.commitState ?? 'staged',
        ...(pendingResult.outcomeRef === undefined ? {} : { outcomeRef: pendingResult.outcomeRef }),
        recordedAt: pendingResult.recordedAt,
        ...(pendingResult.detail === undefined ? {} : { detail: pendingResult.detail }),
      })),
      updatedAt: input.recordedAt,
    },
  };
}

function buildSurfaceResultDetail(result: unknown): string | undefined {
  if (result === undefined) {
    return undefined;
  }

  try {
    return JSON.stringify(result);
  } catch {
    return '[unserializable result payload]';
  }
}

function buildSurfaceFailureDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function dispatchSurfaceHook(
  session: BidviaExecutionSession,
  taskDispatchId: string,
  eventName: BidviaRuntimeLifecycleEventName,
  recordedAt: string,
  input: {
    capabilityKey?: string;
    status?: string;
    detail?: string;
    input?: unknown;
    payload?: unknown;
    result?: unknown;
  } = {},
): Promise<void> {
  await dispatchRuntimeHooks(session.hooks, session.hookAudit, {
    eventName,
    sessionId: session.sessionId,
    sessionRef: session.runtime.sessionRef,
    localTaskRef: session.task.localTaskRef,
    taskDispatchId,
    recordedAt,
    ...(input.capabilityKey === undefined ? {} : { capabilityKey: input.capabilityKey }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.detail === undefined ? {} : { detail: input.detail }),
    ...(input.input === undefined ? {} : { input: input.input }),
    ...(input.payload === undefined ? {} : { payload: input.payload }),
    ...(input.result === undefined ? {} : { result: input.result }),
  });
}

function buildExecutionIdentityContext(
  identity: BidviaSurfaceRuntimeIdentityContext,
): BidviaExecutionIdentityContext {
  return {
    tenantId: identity.tenantId,
    principalId: identity.principalId,
    principalType: identity.principalType,
    authorizedRole: identity.authorizedRole,
    registrationId: identity.registrationId,
    sessionId: identity.sessionId,
    adminSessionId: identity.adminSessionId,
    companyId: identity.companyId,
  } satisfies BidviaExecutionIdentityContext;
}

export function buildBidviaSurfaceRuntimeIdentityContext(
  context: Partial<BidviaClientContext>,
): BidviaSurfaceRuntimeIdentityContext {
  return {
    tenantId: context.tenantId,
    principalId: context.principalId,
    principalType: context.principalType,
    authorizedRole: context.authorizedRole,
    registrationId: context.registrationId,
    sessionId: context.sessionId,
    adminSessionId: context.adminSessionId,
    companyId: context.companyId,
  } as BidviaSurfaceRuntimeIdentityContext;
}

export async function runBidviaSurfaceCapability<T>(input: RunBidviaSurfaceCapabilityInput<T>): Promise<T> {
  const startedAt = input.now();
  const refs = buildBidviaSurfaceSessionRefs({
    transport: input.transport,
    helperKey: input.helperKey,
    capabilityKey: input.capabilityKey,
    identity: input.identity,
    input: input.input,
  });
  const clientPromise = Promise.resolve(input.createClient());
  const journalPath = path.join(
    resolveLocalAccumulationPath(input.accumulation),
    buildBidviaSurfaceJournalFileName(refs.resumeKey),
  );
  const session = buildExecutionSession({
    sessionId: refs.sessionId,
    identity: buildExecutionIdentityContext(input.identity),
    runtime: {
      sessionRef: refs.sessionRef,
      transport: input.transport,
      dependencies: {
        createClient: () => clientPromise,
        now: input.now,
      },
    },
    task: {
      localTaskRef: refs.localTaskRef,
      status: 'idle',
    },
    capabilityMemory: {
      scope: 'local-capability-memory',
      capabilityKey: input.capabilityKey ?? input.helperKey,
      memoryRef: refs.memoryRef,
    },
    hooks: input.hooks ?? createExecutionHookRegistry(),
  });

  await dispatchSurfaceHook(session, refs.taskDispatchId, 'session-opened', startedAt, {
    status: session.task.status,
  });

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: refs.taskDispatchId,
    journalPath,
  });

  await dispatchSurfaceHook(session, refs.taskDispatchId, 'task-attached', input.now(), {
    status: runtime.getState().status,
    payload: runtime.getState(),
  });

  async function writeRuntimeAccumulation(recordedAt: string, runtimeInput: {
    succeeded?: boolean;
    blocked?: ReturnType<typeof buildBlockedCapabilityExecutionResult>;
  } = {}): Promise<void> {
    await writeLocalAccumulation(buildAccumulationFromRuntime({
      runtime,
      helperKey: input.helperKey,
      capabilityKey: input.capabilityKey ?? input.helperKey,
      identity: input.identity,
      recordedAt,
      ...runtimeInput,
    }), input.accumulation);
  }

  async function commitResult(detail: string | undefined, terminalState: 'complete' | 'fail') {
    return runtime.commitStagedResult({
      commit: async () => commitRuntimeOwnedResult({
        transport: input.transport,
        helperKey: input.helperKey,
        taskDispatchId: refs.taskDispatchId,
        resultRef: refs.resultRef,
        kind: 'execution-result',
        terminalState,
        ...(detail === undefined ? {} : { detail }),
        port: buildBidviaRuntimeClientPort(await clientPromise),
      }),
    });
  }

  async function handleExecutionFailure(error: unknown): Promise<never> {
    const recordedAt = input.now();

    if (isBlockedCapabilityExecutionError(error)) {
      await writeRuntimeAccumulation(recordedAt, {
        blocked: buildBlockedCapabilityExecutionResult(error),
      });

      throw error;
    }

    const detail = buildSurfaceFailureDetail(error);

    await runtime.stageResult({
      resultRef: refs.resultRef,
      kind: 'execution-result',
      terminalState: 'fail',
      checkpointRef: `${refs.resultRef}/checkpoint`,
      detail,
    });

    try {
      await commitResult(detail, 'fail');
    } catch {
      await writeRuntimeAccumulation(recordedAt, {
        succeeded: false,
      });

      throw error;
    }

    await writeRuntimeAccumulation(recordedAt, {
      succeeded: false,
    });

    throw error;
  }

  try {
    await runtime.startExecution();
    await dispatchSurfaceHook(session, refs.taskDispatchId, 'capability-memory-accessed', input.now(), {
      capabilityKey: input.capabilityKey ?? input.helperKey,
      status: runtime.getState().status,
      payload: session.capabilityMemory,
    });

    const result = await (async (): Promise<T> => {
      try {
        return await runtime.callCapability({
          helperKey: input.helperKey,
          capabilityKey: input.capabilityKey ?? input.helperKey,
          input: input.input,
          call: async () => input.execute(await clientPromise),
        });
      } catch (error) {
        return handleExecutionFailure(error);
      }
    })();

    const detail = buildSurfaceResultDetail(result);

    await runtime.stageResult({
      resultRef: refs.resultRef,
      kind: 'execution-result',
      terminalState: 'complete',
      checkpointRef: `${refs.resultRef}/checkpoint`,
      detail,
    });

    try {
      await commitResult(detail, 'complete');
    } catch (error) {
      if (error instanceof BidviaRuntimeResultCommitUnavailableError) {
        await writeRuntimeAccumulation(input.now(), {
          succeeded: true,
        });

        return result;
      }

      await writeRuntimeAccumulation(input.now(), {
        succeeded: true,
      });
      throw error;
    }

    await writeRuntimeAccumulation(input.now(), {
      succeeded: true,
    });

    return result;
  } catch (error) {
    throw error;
  } finally {
    const closedAt = input.now();
    await dispatchSurfaceHook(session, refs.taskDispatchId, 'task-detached', closedAt, {
      status: runtime.getState().status,
      payload: runtime.getState(),
    });
    await dispatchSurfaceHook(session, refs.taskDispatchId, 'session-closed', closedAt, {
      status: runtime.getState().status,
    });
  }
}
