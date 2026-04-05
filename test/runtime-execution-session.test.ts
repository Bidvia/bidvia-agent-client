import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as publicSurface from '../src/index.ts';
import { buildBidviaRuntimeClientPort } from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

test('buildExecutionSession composes identity, runtime, task, memory, and hooks as explicit separate local concerns', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createExecutionHookRegistry, 'function');
  assert.equal(typeof exports.buildExecutionSession, 'function');

  const createExecutionHookRegistry = exports.createExecutionHookRegistry as (input?: {
    onSessionOpened?: ReadonlyArray<(...args: unknown[]) => unknown>;
    onTaskAttached?: ReadonlyArray<(...args: unknown[]) => unknown>;
    onCapabilityMemoryAccessed?: ReadonlyArray<(...args: unknown[]) => unknown>;
    onTaskDetached?: ReadonlyArray<(...args: unknown[]) => unknown>;
    onSessionClosed?: ReadonlyArray<(...args: unknown[]) => unknown>;
  }) => Record<string, unknown>;
  const buildExecutionSession = exports.buildExecutionSession as (input: Record<string, unknown>) => Record<string, unknown>;

  const identity = {
    tenantId: 'tenant-a',
    principalId: 'principal-a',
    registrationId: 'areg-1',
    sessionId: 'session-a',
  };
  const runtime = {
    sessionRef: 'local-session-1',
    transport: 'sdk-client',
    dependencies: {
      createClient: () => ({ kind: 'client-stub' }),
      now: () => '2026-04-04T10:00:00.000Z',
    },
  };
  const task = {
    localTaskRef: 'local-task-1',
    taskId: 'task-1',
    status: 'idle',
  };
  const capabilityMemory = {
    capabilityKey: 'pricing.read',
    memoryRef: 'capmem-1',
    scope: 'local-capability-memory',
  };
  const hooks = createExecutionHookRegistry({
    onTaskAttached: [() => undefined],
    onSessionClosed: [() => undefined],
  }) as {
    onSessionOpened: unknown[];
    onTaskAttached: unknown[];
    onCapabilityMemoryAccessed: unknown[];
    onTaskDetached: unknown[];
    onSessionClosed: unknown[];
    onTaskReceived: unknown[];
    onTaskClaimed: unknown[];
    onCapabilityCalled: unknown[];
    onResultStaged: unknown[];
    onResultCommitted: unknown[];
    onTaskFailed: unknown[];
    onTaskTimedOut: unknown[];
    onTaskResumed: unknown[];
  };

  const session = buildExecutionSession({
    sessionId: 'session-envelope-1',
    identity,
    runtime,
    task,
    capabilityMemory,
    hooks,
  });

  assert.equal(session.scope, 'local-execution-session');
  assert.equal(session.sessionId, 'session-envelope-1');
  assert.equal(session.identity, identity);
  assert.equal(session.runtime, runtime);
  assert.equal(session.task, task);
  assert.equal(session.capabilityMemory, capabilityMemory);
  assert.equal(session.hooks, hooks);
  assert.notEqual(session.identity as object, session.runtime as object);
  assert.notEqual(session.runtime as object, session.task as object);
  assert.notEqual(session.task as object, session.capabilityMemory as object);
  assert.notEqual(session.capabilityMemory as object, session.hooks as object);
  assert.deepEqual(hooks, {
    onSessionOpened: [],
    onTaskAttached: [hooks.onTaskAttached[0]],
    onCapabilityMemoryAccessed: [],
    onTaskDetached: [],
    onSessionClosed: [hooks.onSessionClosed[0]],
    onTaskReceived: [],
    onTaskClaimed: [],
    onCapabilityCalled: [],
    onResultStaged: [],
    onResultCommitted: [],
    onTaskFailed: [],
    onTaskTimedOut: [],
    onTaskResumed: [],
  });
});

test('buildExecutionSession requires explicit runtime dependencies instead of relying on ambient globals', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildExecutionSession, 'function');
  assert.equal(typeof exports.createExecutionHookRegistry, 'function');

  const buildExecutionSession = exports.buildExecutionSession as (input: Record<string, unknown>) => Record<string, unknown>;
  const createExecutionHookRegistry = exports.createExecutionHookRegistry as () => Record<string, unknown>;

  assert.throws(() => {
    buildExecutionSession({
      sessionId: 'session-envelope-missing-deps',
      identity: {
        tenantId: 'tenant-a',
      },
      runtime: {
        sessionRef: 'local-session-1',
        transport: 'sdk-client',
      },
      task: {
        localTaskRef: 'local-task-1',
        status: 'idle',
      },
      capabilityMemory: {
        capabilityKey: 'pricing.read',
        memoryRef: 'capmem-1',
        scope: 'local-capability-memory',
      },
      hooks: createExecutionHookRegistry(),
    });
  }, /runtime\.dependencies\.createClient is required/);
});

test('buildBidviaRuntimeClientPort accepts a runtime-owned result commit seam without requiring the full client surface', async () => {
  const port = buildBidviaRuntimeClientPort({
    async commitRuntimeResult(input) {
      return {
        outcomeRef: `${input.transport}:${input.helperKey}:${input.resultRef}`,
      };
    },
  });

  assert.equal(typeof port.commitRuntimeResult, 'function');
  assert.deepEqual(
    await port.commitRuntimeResult?.({
      transport: 'cli',
      helperKey: 'proposal.write',
      taskDispatchId: 'dispatch-1',
      resultRef: 'result-1',
      kind: 'proposal',
      terminalState: 'complete',
      detail: 'staged locally first',
    }),
    {
      outcomeRef: 'cli:proposal.write:result-1',
    },
  );
});

test('runtime client port is typed against the runtime seam instead of importing BidviaClient directly', () => {
  const source = readFileSync(
    path.join(workspaceRoot, 'src/runtime/runtime-client-port.ts'),
    'utf8',
  );

  assert.doesNotMatch(source, /from '\.\.\/client\.js'/);
  assert.match(source, /export interface BidviaRuntimeClientPort/);
});
