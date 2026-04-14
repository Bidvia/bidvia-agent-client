import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { dispatchMcpToolCall } from '../src/mcp.ts';
import { readLocalAccumulation } from '../src/runtime/local-accumulation/store.ts';

function buildLocalAccumulationPath(prefix: string): string {
  return path.join(mkdtempSync(path.join(tmpdir(), prefix)), 'local-accumulation');
}

const dispatchMcpToolCallWithRuntime = dispatchMcpToolCall as unknown as (
  request: {
    toolName: string;
    arguments?: unknown;
  },
  dependencies?: {
    createExecutionClient?: () => unknown;
    localAccumulationPath?: string;
    now?: () => string;
  },
) => Promise<{
  result: {
    executionResult?: unknown;
  };
}>;

test('dispatchMcpToolCall suspend-task-dispatch-execution executes and records committed local runtime memory when context is present', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-mcp-runtime-heartbeat-');
  let called = false;

  const response = await dispatchMcpToolCallWithRuntime(
    {
      toolName: 'suspend-task-dispatch-execution',
      arguments: {
        agentRegistrationId: 'areg-runtime',
        taskDispatchId: 'dispatch-runtime',
        now: '2026-04-04T13:00:00.000Z',
      },
    },
    {
      createExecutionClient: () => ({
        options: {
          context: {
            tenantId: 'tenant-runtime',
            principalId: 'principal-runtime',
            registrationId: 'areg-runtime',
            companyId: 'company-runtime',
          },
        },
        async suspendTaskDispatch() {
          called = true;
          return {
            ok: true,
            helperKey: 'suspendTaskDispatch',
          };
        },
      }) as never,
      localAccumulationPath: accumulationPath,
      now: () => '2026-04-04T13:00:00.000Z',
    },
  );

  assert.equal(called, true);
  assert.deepEqual(response.result.executionResult, {
    ok: true,
    helperKey: 'suspendTaskDispatch',
  });

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  const markers = accumulation.taskExecutionMemory.progressMarkers.map((marker) => marker.marker);
  assert.equal(markers[0], 'execution-started');
  assert.equal(markers.includes('result-staged'), true);
  assert.equal(markers.includes('result-committed'), true);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.capabilityKey, 'suspendTaskDispatch');
  assert.deepEqual(accumulation.capabilityUsageMemory.capabilities[0]?.usage, [{
    helperKey: 'suspendTaskDispatch',
    recordedAt: '2026-04-04T13:00:00.000Z',
    outcome: 'succeeded',
  }]);
  assert.deepEqual(accumulation.capabilityUsageMemory.capabilities[0]?.blockedAttempts, []);
  assert.deepEqual(accumulation.resultMemory.results[0], {
    resultRef: 'local-result://mcp-suspendTaskDispatch-2026-04-04T13-00-00-000Z',
    kind: 'execution-result',
    terminalState: 'complete',
    commitState: 'committed',
    outcomeRef: 'outcome://local-result-mcp-suspendTaskDispatch-2026-04-04T13-00-00-000Z-complete',
    recordedAt: '2026-04-04T13:00:00.000Z',
    detail: '{"ok":true,"helperKey":"suspendTaskDispatch"}',
  });
});

test('dispatchMcpToolCall create-provisional-agent-execution preserves the public provisional response while recording onboarding memory and helper-keyed capability usage', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-mcp-runtime-provisional-');

  const response = await dispatchMcpToolCallWithRuntime(
    {
      toolName: 'create-provisional-agent-execution',
      arguments: {
        provisionalAgentRef: 'prov-runtime-mcp-1',
        now: '2026-04-04T13:10:00.000Z',
      },
    },
    {
      createExecutionClient: () => ({
        options: {
          context: {
            tenantId: 'tenant-runtime',
          },
        },
        async createProvisionalAgent() {
          return {
            provisionalAgentRef: 'prov-runtime-mcp-1',
            created: true,
          };
        },
      }) as never,
      localAccumulationPath: accumulationPath,
      now: () => '2026-04-04T13:10:00.000Z',
    },
  );

  assert.deepEqual(response.result.executionResult, {
    provisionalAgentRef: 'prov-runtime-mcp-1',
    created: true,
  });

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.deepEqual(accumulation.onboardingMemory.facts, [{
    key: 'tenantId',
    value: 'tenant-runtime',
    recordedAt: '2026-04-04T13:10:00.000Z',
  }]);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.capabilityKey, 'createProvisionalAgent');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage[0]?.helperKey, 'createProvisionalAgent');
  assert.equal(accumulation.resultMemory.results[0]?.kind, 'execution-result');
});

test('dispatchMcpToolCall does not persist synthetic local-client-seam placeholders into onboarding memory facts', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-mcp-runtime-placeholder-');

  const response = await dispatchMcpToolCallWithRuntime(
    {
      toolName: 'create-provisional-agent-execution',
      arguments: {
        provisionalAgentRef: 'prov-runtime-placeholder-1',
        now: '2026-04-04T13:15:00.000Z',
      },
    },
    {
      createExecutionClient: () => ({
        async createProvisionalAgent() {
          return {
            ok: true,
          };
        },
      }) as never,
      localAccumulationPath: accumulationPath,
      now: () => '2026-04-04T13:15:00.000Z',
    },
  );

  assert.deepEqual(response.result.executionResult, {
    ok: true,
  });

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.deepEqual(accumulation.onboardingMemory.facts, []);
});

test('dispatchMcpToolCall records non-blocked execution failures through the runtime result protocol instead of fabricating success memory', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-mcp-runtime-failure-');

  await assert.rejects(
    () => dispatchMcpToolCallWithRuntime(
      {
        toolName: 'create-provisional-agent-execution',
        arguments: {
          provisionalAgentRef: 'prov-runtime-failure-1',
          now: '2026-04-04T13:20:00.000Z',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {
              tenantId: 'tenant-runtime',
            },
          },
          async createProvisionalAgent() {
            throw new Error('provisional create failed');
          },
        }) as never,
        localAccumulationPath: accumulationPath,
        now: () => '2026-04-04T13:20:00.000Z',
      },
    ),
    /provisional create failed/,
  );

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  const markers = accumulation.taskExecutionMemory.progressMarkers.map((marker) => marker.marker);
  assert.equal(markers.includes('execution-started'), true);
  assert.deepEqual(markers.slice(-2), ['result-staged', 'result-committed']);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage.length, 0);
  assert.equal(accumulation.resultMemory.results[0]?.terminalState, 'fail');
  assert.equal(accumulation.resultMemory.results[0]?.commitState, 'committed');
});
