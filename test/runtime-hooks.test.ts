import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

function buildExecutionSession(
  exports: Record<string, unknown>,
  createClient: () => Promise<unknown>,
  hookInput: Record<string, ReadonlyArray<(...args: unknown[]) => unknown>> = {},
) {
  const buildExecutionSession = exports.buildExecutionSession as (input: Record<string, unknown>) => Record<string, unknown>;
  const createExecutionHookRegistry = exports.createExecutionHookRegistry as (input?: Record<string, unknown>) => Record<string, unknown>;

  return buildExecutionSession({
    sessionId: 'session-envelope-1',
    identity: {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      registrationId: 'areg-1',
      sessionId: 'session-a',
    },
    runtime: {
      sessionRef: 'local-session-1',
      transport: 'sdk-client',
      dependencies: {
        createClient,
        now: () => '2026-04-04T10:00:00.000Z',
      },
    },
    task: {
      localTaskRef: 'local-task-1',
      taskId: 'task-1',
      status: 'idle',
    },
    capabilityMemory: {
      scope: 'local-capability-memory',
      capabilityKey: 'proposal.write',
      memoryRef: 'memory-1',
    },
    hooks: createExecutionHookRegistry(hookInput),
  });
}

function buildJournalPath(prefix: string): string {
  const tempDirectory = mkdtempSync(path.join(tmpdir(), prefix));
  return path.join(tempDirectory, 'task-journal.json');
}

test('BidviaTaskRuntime dispatches lifecycle hooks in deterministic order for receive, claim, capability, resume, result stage, and result commit', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const events: string[] = [];
  const session = buildExecutionSession(
    exports,
    async () => ({
      async createClaim() {
        return { claimId: 'claim-1' };
      },
      async suspendTaskDispatch() {
        return { suspended: true };
      },
      async resumeTaskDispatch() {
        return { resumed: true };
      },
    }),
    {
      onTaskReceived: [
        () => {
          events.push('receive:first');
        },
        () => {
          events.push('receive:second');
        },
      ],
      onTaskClaimed: [() => {
        events.push('claim:first');
      }],
      onCapabilityCalled: [() => {
        events.push('capability:first');
      }],
      onTaskResumed: [() => {
        events.push('resume:first');
      }],
      onResultStaged: [() => {
        events.push('result-staged:first');
      }],
      onResultCommitted: [() => {
        events.push('result-committed:first');
      }],
    },
  );
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-runtime-hooks-ordered-'),
  });

  await (runtime.receiveTask as (input: Record<string, unknown>) => Promise<unknown>)({
    offerId: 'offer-1',
    summary: 'dispatch received locally',
    timeoutAt: '2026-04-04T10:05:00.000Z',
  });
  await (runtime.claim as (input: Record<string, unknown>) => Promise<unknown>)({
    offerId: 'offer-1',
    claimRef: 'claim://local/1',
    claimKind: 'ownership',
    summary: 'claiming the dispatch locally',
  });
  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.suspend as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'waiting on a dependency',
  });
  await (runtime.resume as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'dependency is available again',
  });
  const capabilityResult = await (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
    capabilityKey: 'proposal.write',
    input: { proposalId: 'proposal-1' },
    call: async () => ({ ok: true }),
  });
  await (runtime.stageResult as (input: Record<string, unknown>) => Promise<unknown>)({
    resultRef: 'result-local-1',
    kind: 'proposal',
    terminalState: 'complete',
    checkpointRef: 'checkpoint-1',
    detail: 'ready for remote commit',
  });
  await (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
    commit: async () => ({ outcomeRef: 'outcome://dispatch/1' }),
  });

  assert.deepEqual(capabilityResult, { ok: true });
  assert.deepEqual(events, [
    'receive:first',
    'receive:second',
    'claim:first',
    'resume:first',
    'capability:first',
    'result-staged:first',
    'result-committed:first',
  ]);
});

test('BidviaTaskRuntime audits hook failure without replacing the core claim and result-commit correctness path', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const session = buildExecutionSession(
    exports,
    async () => ({
      async createClaim() {
        return { claimId: 'claim-1' };
      },
    }),
    {
      onTaskClaimed: [() => {
        throw new Error('claim hook failed');
      }],
      onResultCommitted: [() => {
        throw new Error('result commit hook failed');
      }],
    },
  );
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-runtime-hooks-failure-'),
  });

  await (runtime.claim as (input: Record<string, unknown>) => Promise<unknown>)({
    offerId: 'offer-1',
    claimRef: 'claim://local/1',
    claimKind: 'ownership',
    summary: 'claiming the dispatch locally',
  });
  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.stageResult as (input: Record<string, unknown>) => Promise<unknown>)({
    resultRef: 'result-local-1',
    kind: 'proposal',
    terminalState: 'complete',
    checkpointRef: 'checkpoint-1',
  });
  await (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
    commit: async () => ({ outcomeRef: 'outcome://dispatch/1' }),
  });

  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'result-committed');
  assert.deepEqual((runtime.getHookFailures as () => unknown[])().map((failure) => (failure as Record<string, unknown>).message), [
    'claim hook failed',
    'result commit hook failed',
  ]);
});

test('BidviaTaskRuntime dispatches timeout and fail hooks while keeping hook isolation intact', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const events: string[] = [];
  const clientCalls: string[] = [];
  const session = buildExecutionSession(
    exports,
    async () => ({
      async failTaskDispatch() {
        clientCalls.push('failTaskDispatch');
        return { failed: true };
      },
    }),
    {
      onTaskTimedOut: [
        () => {
          throw new Error('timeout hook failed');
        },
        () => {
          events.push('timeout:second');
        },
      ],
      onTaskFailed: [() => {
        events.push('fail:first');
      }],
    },
  );
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-runtime-hooks-timeout-'),
  });

  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.recordTimeout as (input: Record<string, unknown>) => Promise<unknown>)({
    timeoutId: 'timeout-1',
    summary: 'lease expired before completion',
  });
  await (runtime.stageResult as (input: Record<string, unknown>) => Promise<unknown>)({
    resultRef: 'result-local-failure-1',
    kind: 'proposal',
    terminalState: 'fail',
    checkpointRef: 'checkpoint-2',
  });
  await (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
    commit: async () => ({ outcomeRef: 'outcome://dispatch/1/failure' }),
  });
  await (runtime.failTask as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'execution failed after timeout',
  });

  assert.deepEqual(events, ['timeout:second', 'fail:first']);
  assert.deepEqual(clientCalls, ['failTaskDispatch']);
  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'failed');
  assert.deepEqual((runtime.getHookFailures as () => unknown[])().map((failure) => (failure as Record<string, unknown>).eventName), [
    'task-timed-out',
  ]);
});

test('runBidviaSurfaceCapability emits the public session and attachment lifecycle hooks that it exposes', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const runBidviaSurfaceCapability = exports.runBidviaSurfaceCapability as (input: Record<string, unknown>) => Promise<unknown>;
  const createExecutionHookRegistry = exports.createExecutionHookRegistry as (input?: Record<string, unknown>) => Record<string, unknown>;

  const events: string[] = [];

  const result = await runBidviaSurfaceCapability({
    transport: 'mcp',
    helperKey: 'createProvisionalAgent',
    capabilityKey: 'createProvisionalAgent',
    identity: {
      tenantId: 'tenant-a',
    },
    input: {
      provisionalAgentRef: 'prov-hook-1',
    },
    createClient: async () => ({
      async createProvisionalAgent() {
        return {
          provisionalAgentRef: 'prov-hook-1',
          created: true,
        };
      },
    }) as never,
    execute: async (client: { createProvisionalAgent: () => Promise<unknown> }) => client.createProvisionalAgent(),
    now: () => '2026-04-04T14:00:00.000Z',
    hooks: createExecutionHookRegistry({
      onSessionOpened: [() => {
        events.push('session-opened');
      }],
      onTaskAttached: [() => {
        events.push('task-attached');
      }],
      onCapabilityMemoryAccessed: [() => {
        events.push('capability-memory-accessed');
      }],
      onTaskDetached: [() => {
        events.push('task-detached');
      }],
      onSessionClosed: [() => {
        events.push('session-closed');
      }],
      onCapabilityCalled: [() => {
        events.push('capability-called');
      }],
      onResultStaged: [() => {
        events.push('result-staged');
      }],
      onResultCommitted: [() => {
        events.push('result-committed');
      }],
    }),
  });

  assert.deepEqual(result, {
    provisionalAgentRef: 'prov-hook-1',
    created: true,
  });
  assert.deepEqual(events, [
    'session-opened',
    'task-attached',
    'capability-memory-accessed',
    'capability-called',
    'result-staged',
    'result-committed',
    'task-detached',
    'session-closed',
  ]);
});
