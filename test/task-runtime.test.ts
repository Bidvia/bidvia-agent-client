import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';
import {
  buildExecutionSession as buildExecutionSessionDirect,
  createBidviaTaskRuntime as createBidviaTaskRuntimeDirect,
  createExecutionHookRegistry as createExecutionHookRegistryDirect,
} from '../src/index.ts';

function buildExecutionSession(exports: Record<string, unknown>, createClient: () => Promise<unknown>) {
  const buildExecutionSession = exports.buildExecutionSession as (input: Record<string, unknown>) => Record<string, unknown>;
  const createExecutionHookRegistry = exports.createExecutionHookRegistry as () => Record<string, unknown>;

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
    hooks: createExecutionHookRegistry(),
  });
}

test('BidviaTaskRuntime wraps claim, accept, lease, execution, suspend, and resume over the existing task helpers while persisting local journal state', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');
  assert.equal(typeof exports.buildExecutionSession, 'function');
  assert.equal(typeof exports.createExecutionHookRegistry, 'function');

  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    async createClaim(...args: unknown[]) {
      calls.push({ method: 'createClaim', args });
      return { claimId: 'claim-1' };
    },
    async acceptClaim(...args: unknown[]) {
      calls.push({ method: 'acceptClaim', args });
      return { ackId: 'ack-1' };
    },
    async createLease(...args: unknown[]) {
      calls.push({ method: 'createLease', args });
      return { leaseId: 'lease-1' };
    },
    async suspendTaskDispatch(...args: unknown[]) {
      calls.push({ method: 'suspendTaskDispatch', args });
      return { suspended: true };
    },
    async resumeTaskDispatch(...args: unknown[]) {
      calls.push({ method: 'resumeTaskDispatch', args });
      return { resumed: true };
    },
  };

  const session = buildExecutionSession(exports, async () => client);
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.claim as (input: Record<string, unknown>) => Promise<unknown>)({
    offerId: 'offer-1',
    claimRef: 'claim://local/1',
    claimKind: 'ownership',
    summary: 'claiming the dispatch locally',
  });
  await (runtime.accept as (input: Record<string, unknown>) => Promise<unknown>)({
    claimId: 'claim-1',
    summary: 'acknowledged by the local runtime',
  });
  await (runtime.renewLease as (input: Record<string, unknown>) => Promise<unknown>)({
    leaseScope: 'dispatch-window',
    expiresAt: '2026-04-04T10:05:00.000Z',
    summary: 'lease renewed for execution',
  });
  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.suspend as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'waiting on dependency',
  });
  await (runtime.resume as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'dependency available again',
  });

  const state = (runtime.getState as () => Record<string, unknown>)();
  const journal = (runtime.getJournal as () => Record<string, unknown>)();

  assert.deepEqual(calls.map((entry) => entry.method), [
    'createClaim',
    'acceptClaim',
    'createLease',
    'suspendTaskDispatch',
    'resumeTaskDispatch',
  ]);
  assert.equal(state.status, 'executing');
  assert.equal(state.taskDispatchId, 'dispatch-1');
  assert.equal(state.claimId, 'claim-1');
  assert.equal(state.ackId, 'ack-1');
  assert.equal(state.leaseId, 'lease-1');
  assert.equal(journal.localTaskRef, 'local-task-1');
  assert.equal(journal.sessionRef, 'local-session-1');
  assert.equal(journal.memoryRef, 'memory-1');
  assert.deepEqual((journal.progressMarkers as Array<Record<string, unknown>>).map((marker) => marker.marker), [
    'claim-created',
    'claim-accepted',
    'lease-renewed',
    'execution-started',
    'task-suspended',
    'task-resumed',
  ]);
});

test('BidviaTaskRuntime preserves resumable local result state when result commit fails and can resume from the journal later', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const client = {
    async createClaim() {
      return { claimId: 'claim-1' };
    },
    async acceptClaim() {
      return { ackId: 'ack-1' };
    },
    async createLease() {
      return { leaseId: 'lease-1' };
    },
    async completeTaskDispatch() {
      return { completed: true };
    },
  };

  const session = buildExecutionSession(exports, async () => client);
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-resume-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.stageResult as (input: Record<string, unknown>) => Promise<unknown>)({
    resultRef: 'result-local-1',
    kind: 'proposal',
    terminalState: 'complete',
    checkpointRef: 'checkpoint-1',
    detail: 'execution finished locally and is waiting for remote result commit',
  });

  await assert.rejects(
    () => (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
      commit: async () => {
        throw new Error('upstream result route unavailable');
      },
    }),
    /upstream result route unavailable/,
  );

  const failedCommitState = (runtime.getState as () => Record<string, unknown>)();
  const failedCommitJournal = (runtime.getJournal as () => Record<string, unknown>)() as {
    recovery: { resumeFromMarker?: string };
    pendingResultRefs: unknown[];
  };

  assert.equal(failedCommitState.status, 'locally-completed');
  assert.deepEqual(failedCommitState.pendingResult, {
    resultRef: 'result-local-1',
    kind: 'proposal',
    terminalState: 'complete',
    commitState: 'staged',
    detail: 'execution finished locally and is waiting for remote result commit',
  });
  assert.equal(failedCommitJournal.recovery.resumeFromMarker, 'result-commit');
  assert.deepEqual(failedCommitJournal.pendingResultRefs, [{
    resultRef: 'result-local-1',
    kind: 'proposal',
    recordedAt: '2026-04-04T10:00:00.000Z',
    terminalState: 'complete',
    commitState: 'staged',
    detail: 'execution finished locally and is waiting for remote result commit',
  }]);

  const resumedRuntime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  assert.equal((resumedRuntime.getState as () => Record<string, unknown>)().status, 'locally-completed');
  assert.deepEqual((resumedRuntime.getState as () => Record<string, unknown>)().pendingResult, {
    resultRef: 'result-local-1',
    kind: 'proposal',
    terminalState: 'complete',
    commitState: 'staged',
    detail: 'execution finished locally and is waiting for remote result commit',
  });
});

test('BidviaTaskRuntime restores protocol-critical claim, ack, and lease ids from the journal on reload', async () => {
  const exports = publicSurface as Record<string, unknown>;

  const client = {
    async createClaim() {
      return { claimId: 'claim-1' };
    },
    async acceptClaim() {
      return { ackId: 'ack-1' };
    },
    async createLease() {
      return { leaseId: 'lease-1' };
    },
  };

  const session = buildExecutionSession(exports, async () => client);
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-protocol-state-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.claim as (input: Record<string, unknown>) => Promise<unknown>)({
    offerId: 'offer-1',
    claimRef: 'claim://local/1',
    claimKind: 'ownership',
    summary: 'claim created before restart',
  });
  await (runtime.accept as (input: Record<string, unknown>) => Promise<unknown>)({
    claimId: 'claim-1',
    summary: 'claim accepted before restart',
  });
  await (runtime.renewLease as (input: Record<string, unknown>) => Promise<unknown>)({
    leaseScope: 'dispatch-window',
    expiresAt: '2026-04-04T10:05:00.000Z',
    summary: 'lease renewed before restart',
  });

  const resumedRuntime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });
  const resumedState = (resumedRuntime.getState as () => Record<string, unknown>)();

  assert.equal(resumedState.status, 'leased');
  assert.equal(resumedState.claimId, 'claim-1');
  assert.equal(resumedState.ackId, 'ack-1');
  assert.equal(resumedState.leaseId, 'lease-1');
});

test('BidviaTaskRuntime increments attempt numbers only when a new execution attempt starts after timeout retry', async () => {
  const exports = publicSurface as Record<string, unknown>;

  const session = buildExecutionSession(exports, async () => ({}));
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-attempts-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.recordTimeout as (input: Record<string, unknown>) => Promise<unknown>)({
    timeoutId: 'timeout-1',
    summary: 'first attempt timed out',
  });
  await (runtime.startExecution as () => Promise<unknown>)();

  const journal = (runtime.getJournal as () => Record<string, unknown>)() as {
    attempts: Array<{ attempt: number; status: string }>;
    recovery: { resumeFromMarker?: string };
    progressMarkers: Array<{ marker: string }>;
  };

  assert.deepEqual(
    journal.attempts.map((attempt) => ({ attempt: attempt.attempt, status: attempt.status })),
    [
      { attempt: 1, status: 'idle' },
      { attempt: 1, status: 'executing' },
      { attempt: 1, status: 'suspended' },
      { attempt: 2, status: 'executing' },
    ],
  );
  assert.equal((runtime.getState as () => Record<string, unknown>)().attempt, 2);
  assert.equal(journal.recovery.resumeFromMarker, 'execution-started');
  assert.deepEqual(journal.progressMarkers.map((marker) => marker.marker), [
    'execution-started',
    'task-timed-out',
    'execution-started',
  ]);
});

test('BidviaTaskRuntime uses the same timeout marker name in progress and recovery metadata', async () => {
  const exports = publicSurface as Record<string, unknown>;

  const session = buildExecutionSession(exports, async () => ({}));
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-timeout-marker-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.recordTimeout as (input: Record<string, unknown>) => Promise<unknown>)({
    timeoutId: 'timeout-1',
    summary: 'lease expired before completion',
  });

  const journal = (runtime.getJournal as () => Record<string, unknown>)() as {
    recovery: { resumeFromMarker?: string };
    progressMarkers: Array<{ marker: string }>;
  };

  assert.equal(journal.progressMarkers.at(-1)?.marker, 'task-timed-out');
  assert.equal(journal.recovery.resumeFromMarker, 'task-timed-out');
});

test('createBidviaTaskRuntime accepts a minimal runtime-facing task client instead of the full BidviaClient shape', async () => {
  const session = buildExecutionSessionDirect({
    sessionId: 'session-envelope-direct-import',
    identity: {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      registrationId: 'areg-1',
      sessionId: 'session-a',
    },
    runtime: {
      sessionRef: 'local-session-direct-import',
      transport: 'sdk-client',
      dependencies: {
        createClient: async () => ({
          async createClaim() {
            return { claimId: 'claim-direct-1' };
          },
          async acceptClaim() {
            return { ackId: 'ack-direct-1' };
          },
          async createLease() {
            return { leaseId: 'lease-direct-1' };
          },
          async suspendTaskDispatch() {
            return { suspended: true };
          },
          async resumeTaskDispatch() {
            return { resumed: true };
          },
          async completeTaskDispatch() {
            return { completed: true };
          },
          async failTaskDispatch() {
            return { failed: true };
          },
        }),
        now: () => '2026-04-04T10:00:00.000Z',
      },
    },
    task: {
      localTaskRef: 'local-task-direct-import',
      taskId: 'task-direct-import',
      status: 'idle',
    },
    capabilityMemory: {
      scope: 'local-capability-memory',
      capabilityKey: 'proposal.write',
      memoryRef: 'memory-direct-import',
    },
    hooks: createExecutionHookRegistryDirect(),
  });
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-task-runtime-direct-import-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntimeDirect({
    session,
    taskDispatchId: 'dispatch-direct-import',
    journalPath,
  });

  await runtime.claim({
    offerId: 'offer-direct-1',
    claimRef: 'claim://local/direct-import',
    claimKind: 'ownership',
    summary: 'claim through runtime-facing port only',
  });

  assert.equal(runtime.getState().claimId, 'claim-direct-1');
});
