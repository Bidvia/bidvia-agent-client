import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

function buildExecutionSession(
  exports: Record<string, unknown>,
  identity: Record<string, unknown> = {
    tenantId: 'tenant-a',
    principalId: 'principal-a',
    registrationId: 'areg-1',
    sessionId: 'session-a',
    companyId: 'company-a',
    adminSessionId: 'admin-session-a',
  },
  hookInput: Record<string, ReadonlyArray<(...args: unknown[]) => unknown>> = {},
) {
  const buildExecutionSession = exports.buildExecutionSession as (input: Record<string, unknown>) => Record<string, unknown>;
  const createExecutionHookRegistry = exports.createExecutionHookRegistry as (input?: Record<string, unknown>) => Record<string, unknown>;

  return buildExecutionSession({
    sessionId: 'session-envelope-1',
    identity,
    runtime: {
      sessionRef: 'local-session-1',
      transport: 'sdk-client',
      dependencies: {
        createClient: async () => ({
          async createClaim() {
            return { claimId: 'claim-1' };
          },
          async acceptClaim() {
            return { ackId: 'ack-1' };
          },
          async createLease() {
            return { leaseId: 'lease-1' };
          },
        }),
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

test('capability orchestration derives explicit execution policy by shipped capability metadata', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.getCapabilityExecutionPolicy, 'function');

  const getCapabilityExecutionPolicy = exports.getCapabilityExecutionPolicy as (helperKey: string) => Record<string, unknown>;

  assert.deepEqual(getCapabilityExecutionPolicy('queryProvisionalAgent'), {
    helperKey: 'queryProvisionalAgent',
    executionKind: 'public-provisional',
    riskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
    concurrency: 'concurrent',
    guard: 'allow-when-context-complete',
    journalDiscipline: 'shared-read-only',
  });
  assert.deepEqual(getCapabilityExecutionPolicy('claimProvisionalAgent'), {
    helperKey: 'claimProvisionalAgent',
    executionKind: 'session-bound',
    riskTier: 'runtime-execution',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    concurrency: 'serial',
    guard: 'block-when-context-missing',
    journalDiscipline: 'single-writer-task-runtime',
  });
  assert.deepEqual(getCapabilityExecutionPolicy('getAgentReadiness'), {
    helperKey: 'getAgentReadiness',
    executionKind: 'governed-read',
    riskTier: 'observe-only',
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    concurrency: 'concurrent',
    guard: 'allow-when-context-complete',
    journalDiscipline: 'shared-read-only',
  });
  assert.deepEqual(getCapabilityExecutionPolicy('createTaskDispatch'), {
    helperKey: 'createTaskDispatch',
    executionKind: 'governed-write',
    riskTier: 'governed-commercial',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    concurrency: 'serial',
    guard: 'block-when-context-missing',
    journalDiscipline: 'single-writer-task-runtime',
  });
  assert.deepEqual(getCapabilityExecutionPolicy('postHeartbeat'), {
    helperKey: 'postHeartbeat',
    executionKind: 'runtime-write',
    riskTier: 'runtime-execution',
    accessContextFamily: 'registration',
    requiredContext: ['tenantId', 'registrationId', 'principalId'],
    concurrency: 'serial',
    guard: 'block-when-context-missing',
    journalDiscipline: 'single-writer-task-runtime',
  });
  assert.deepEqual(getCapabilityExecutionPolicy('executeCommercialAction'), {
    helperKey: 'executeCommercialAction',
    executionKind: 'commercial-action',
    riskTier: 'governed-commercial',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    concurrency: 'serial',
    guard: 'block-when-context-missing',
    journalDiscipline: 'single-writer-task-runtime',
  });
});

test('BidviaTaskRuntime blocks risky capability execution when required local context is missing and records the blocked attempt without mutating success state', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const hookEvents: Array<Record<string, unknown>> = [];
  const session = buildExecutionSession(
    exports,
    {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      registrationId: 'areg-1',
      sessionId: 'session-a',
    },
    {
      onCapabilityCalled: [
        (event) => {
          hookEvents.push(event as Record<string, unknown>);
        },
      ],
    },
  );
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-capability-orchestration-blocked-'),
  });

  await (runtime.startExecution as () => Promise<unknown>)();

  let executed = false;
  await assert.rejects(
    () => (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'createTaskDispatch',
      capabilityKey: 'task-dispatch.write',
      input: {
        taskRef: 'task-ref-1',
      },
      call: async () => {
        executed = true;
        return { ok: true };
      },
    }),
    /createTaskDispatch requires local execution context before it can run remotely. Missing: companyId./,
  );

  assert.equal(executed, false);
  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'executing');
  assert.deepEqual((runtime.getState as () => Record<string, unknown>)().pendingResult, undefined);
  assert.deepEqual((runtime.getJournal as () => { progressMarkers: Array<{ marker: string; detail?: string }> })().progressMarkers.map((marker) => marker.marker), [
    'execution-started',
    'capability-blocked',
  ]);
  assert.match(
    (runtime.getJournal as () => { progressMarkers: Array<{ marker: string; detail?: string }> })().progressMarkers[1].detail ?? '',
    /createTaskDispatch requires local execution context before it can run remotely. Missing: companyId./,
  );
  assert.equal(hookEvents.length, 1);
  assert.equal(hookEvents[0].eventName, 'capability-called');
  assert.equal(hookEvents[0].status, 'executing');
  assert.deepEqual(hookEvents[0].result, {
    blocked: true,
    helperKey: 'createTaskDispatch',
    executionKind: 'governed-write',
    missingContext: ['companyId'],
    blockedByPlaneGate: null,
  });
});

test('BidviaTaskRuntime blocks operator-company writes when task runtime identity lacks company context', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const hookEvents: Array<Record<string, unknown>> = [];
  const session = buildExecutionSession(
    exports,
    {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      registrationId: 'areg-1',
    },
    {
      onCapabilityCalled: [
        (event) => {
          hookEvents.push(event as Record<string, unknown>);
        },
      ],
    },
  );
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-capability-orchestration-plane-gated-'),
  });

  await (runtime.startExecution as () => Promise<unknown>)();

  let executed = false;
  await assert.rejects(
    () => (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'createTaskDispatch',
      capabilityKey: 'task-dispatch.write',
      input: {
        agentRegistrationId: 'areg-1',
        taskKind: 'runtime-task',
        taskRef: 'task-ref-1',
        now: '2026-04-04T13:00:00.000Z',
        reason: 'compatibility-only write should stay blocked',
      },
      call: async () => {
        executed = true;
        return { ok: true };
      },
    }),
    /createTaskDispatch requires local execution context before it can run remotely\. Missing: companyId\./,
  );

  assert.equal(executed, false);
  assert.equal((runtime.getState as () => Record<string, unknown>)().status, 'executing');
  assert.deepEqual((runtime.getState as () => Record<string, unknown>)().pendingResult, undefined);
  assert.deepEqual((runtime.getJournal as () => { progressMarkers: Array<{ marker: string; detail?: string }> })().progressMarkers.map((marker) => marker.marker), [
    'execution-started',
    'capability-blocked',
  ]);
  assert.match(
    (runtime.getJournal as () => { progressMarkers: Array<{ marker: string; detail?: string }> })().progressMarkers[1].detail ?? '',
    /createTaskDispatch requires local execution context before it can run remotely\. Missing: companyId\./,
  );
  assert.equal(hookEvents.length, 1);
  assert.deepEqual(hookEvents[0].result, {
    blocked: true,
    helperKey: 'createTaskDispatch',
    executionKind: 'governed-write',
    missingContext: ['companyId'],
    blockedByPlaneGate: null,
  });
});

test('BidviaTaskRuntime uses concurrent orchestration for governed reads and a single-writer discipline for runtime writes', async () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.createBidviaTaskRuntime, 'function');

  const session = buildExecutionSession(exports, {
    tenantId: 'tenant-a',
    principalId: 'principal-a',
    registrationId: 'areg-1',
    sessionId: 'session-a',
    companyId: 'company-a',
    adminSessionId: 'admin-session-a',
  });
  const createBidviaTaskRuntime = exports.createBidviaTaskRuntime as (input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  const runtime = await createBidviaTaskRuntime({
    session,
    taskDispatchId: 'dispatch-1',
    journalPath: buildJournalPath('bidvia-capability-orchestration-serial-'),
  });

  await (runtime.startExecution as () => Promise<unknown>)();

  const concurrentReads: string[] = [];
  await Promise.all([
    (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'getAgentReadiness',
      capabilityKey: 'agent.readiness.read',
      call: async () => {
        concurrentReads.push('read-1:start');
        await Promise.resolve();
        concurrentReads.push('read-1:end');
        return { ok: 'read-1' };
      },
    }),
    (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'getAgentReadiness',
      capabilityKey: 'agent.readiness.read',
      call: async () => {
        concurrentReads.push('read-2:start');
        await Promise.resolve();
        concurrentReads.push('read-2:end');
        return { ok: 'read-2' };
      },
    }),
  ]);

  const singleWriterSteps: string[] = [];
  await Promise.all([
    (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'claimProvisionalAgent',
      capabilityKey: 'claim-provisional.write',
      call: async () => {
        singleWriterSteps.push('write-1:start');
        await Promise.resolve();
        singleWriterSteps.push('write-1:end');
        return { ok: 'write-1' };
      },
    }),
    (runtime.callCapability as (input: Record<string, unknown>) => Promise<unknown>)({
      helperKey: 'claimProvisionalAgent',
      capabilityKey: 'claim-provisional.write',
      call: async () => {
        singleWriterSteps.push('write-2:start');
        await Promise.resolve();
        singleWriterSteps.push('write-2:end');
        return { ok: 'write-2' };
      },
    }),
  ]);

  assert.deepEqual(concurrentReads, ['read-1:start', 'read-2:start', 'read-1:end', 'read-2:end']);
  assert.deepEqual(singleWriterSteps, ['write-1:start', 'write-1:end', 'write-2:start', 'write-2:end']);
});
