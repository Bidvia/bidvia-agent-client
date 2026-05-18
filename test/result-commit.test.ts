import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

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

test('commitRuntimeOwnedResult fails closed when the runtime client exposes no result commit path', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildBidviaRuntimeClientPort, 'function');
  assert.equal(typeof exports.commitRuntimeOwnedResult, 'function');

  const port = (exports.buildBidviaRuntimeClientPort as (client: unknown) => unknown)({});

  await assert.rejects(
    () => (exports.commitRuntimeOwnedResult as (input: Record<string, unknown>) => Promise<unknown>)({
      transport: 'cli',
      helperKey: 'postHeartbeat',
      taskDispatchId: 'dispatch-1',
      resultRef: 'local-result://dispatch-1',
      kind: 'execution-result',
      terminalState: 'complete',
      port,
    }),
    {
      message: 'runtime-owned result commit path is unavailable for cli postHeartbeat; local result remains staged, and rerunning may reuse the same track and replay the helper',
    },
  );
});

test('commitRuntimeOwnedResult delegates to the runtime-owned result commit path when one is exposed', async () => {
  const exports = publicSurface as Record<string, unknown>;

  const calls: unknown[] = [];
  const port = (exports.buildBidviaRuntimeClientPort as (client: unknown) => unknown)({
    async commitRuntimeResult(input: unknown) {
      calls.push(input);
      return {
        outcomeRef: 'outcome://dispatch-1/committed',
      };
    },
  });

  const response = await (exports.commitRuntimeOwnedResult as (input: Record<string, unknown>) => Promise<Record<string, unknown>>)({
    transport: 'mcp',
    helperKey: 'createProvisionalAgent',
    taskDispatchId: 'dispatch-1',
    resultRef: 'local-result://dispatch-1',
    kind: 'execution-result',
    terminalState: 'complete',
    detail: '{"created":true}',
    port,
  });

  assert.deepEqual(response, {
    outcomeRef: 'outcome://dispatch-1/committed',
  });
  assert.deepEqual(calls, [{
    transport: 'mcp',
    helperKey: 'createProvisionalAgent',
    taskDispatchId: 'dispatch-1',
    resultRef: 'local-result://dispatch-1',
    kind: 'execution-result',
    terminalState: 'complete',
    detail: '{"created":true}',
  }]);
});

test('BidviaTaskRuntime keeps local completion separate from remote result commit and from final remote task completion', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    async completeTaskDispatch(...args: unknown[]) {
      calls.push({ method: 'completeTaskDispatch', args });
      return { completed: true };
    },
  };

  const session = buildExecutionSession(exports, async () => client);
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-result-commit-'));
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
  });

  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'locally-completed');
  assert.equal(calls.length, 0);

  await assert.rejects(
    () => (runtime.completeTask as (input: Record<string, unknown>) => Promise<unknown>)({
      reason: 'should not complete before result commit',
    }),
    /result commit must succeed before task completion/,
  );

  await (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
    commit: async () => ({ outcomeRef: 'outcome://dispatch/1' }),
  });

  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'result-committed');
  assert.equal(calls.length, 0);

  await (runtime.completeTask as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'task finished after remote result commit',
  });

  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'completed');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    method: 'completeTaskDispatch',
    args: [
      'areg-1',
      'dispatch-1',
      {
        now: '2026-04-04T10:00:00.000Z',
        reason: 'task finished after remote result commit',
        outcomeRef: 'outcome://dispatch/1',
      },
    ],
  });
});

test('BidviaTaskRuntime uses the same staged-result protocol for terminal failure and only calls remote fail after result commit succeeds', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const calls: Array<{ method: string; args: unknown[] }> = [];
  const client = {
    async failTaskDispatch(...args: unknown[]) {
      calls.push({ method: 'failTaskDispatch', args });
      return { failed: true };
    },
  };

  const session = buildExecutionSession(exports, async () => client);
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-result-fail-'));
  const journalPath = path.join(tempDirectory, 'task-journal.json');

  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath,
  });

  await (runtime.startExecution as () => Promise<unknown>)();
  await (runtime.stageResult as (input: Record<string, unknown>) => Promise<unknown>)({
    resultRef: 'result-local-failure-1',
    kind: 'proposal',
    terminalState: 'fail',
    checkpointRef: 'checkpoint-2',
  });

  await assert.rejects(
    () => (runtime.failTask as (input: Record<string, unknown>) => Promise<unknown>)({
      reason: 'should not fail before result commit',
    }),
    /result commit must succeed before task failure/,
  );

  await (runtime.commitStagedResult as (input: Record<string, unknown>) => Promise<unknown>)({
    commit: async () => ({ outcomeRef: 'outcome://dispatch/1/failure' }),
  });
  await (runtime.failTask as (input: Record<string, unknown>) => Promise<unknown>)({
    reason: 'execution failed after remote result commit',
  });

  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'failed');
  assert.deepEqual(calls, [{
    method: 'failTaskDispatch',
    args: [
      'areg-1',
      'dispatch-1',
      {
        now: '2026-04-04T10:00:00.000Z',
        reason: 'execution failed after remote result commit',
        outcomeRef: 'outcome://dispatch/1/failure',
      },
    ],
  }]);
});
