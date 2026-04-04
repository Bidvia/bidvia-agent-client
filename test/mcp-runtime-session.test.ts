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

test('dispatchMcpToolCall heartbeat-execution preserves the MCP response while recording task execution memory with the real postHeartbeat helper key', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-mcp-runtime-heartbeat-');

  const response = await dispatchMcpToolCallWithRuntime(
    {
      toolName: 'heartbeat-execution',
      arguments: {
        now: '2026-04-04T13:00:00.000Z',
        expiresAt: '2026-04-04T13:05:00.000Z',
      },
    },
    {
      createExecutionClient: () => ({
        options: {
          context: {
            tenantId: 'tenant-runtime',
            principalId: 'principal-runtime',
            registrationId: 'areg-runtime',
          },
        },
        async postHeartbeat() {
          return {
            ok: true,
            helperKey: 'postHeartbeat',
          };
        },
      }) as never,
      localAccumulationPath: accumulationPath,
      now: () => '2026-04-04T13:00:00.000Z',
    },
  );

  assert.deepEqual(response.result.executionResult, {
    ok: true,
    helperKey: 'postHeartbeat',
  });

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.taskExecutionMemory.progressMarkers[0]?.marker, 'execution-started');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.capabilityKey, 'postHeartbeat');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage[0]?.helperKey, 'postHeartbeat');
  assert.equal(accumulation.resultMemory.results[0]?.kind, 'execution-result');
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
      toolName: 'heartbeat-execution',
      arguments: {
        now: '2026-04-04T13:15:00.000Z',
        expiresAt: '2026-04-04T13:20:00.000Z',
      },
    },
    {
      createExecutionClient: () => ({
        async postHeartbeat() {
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
        toolName: 'heartbeat-execution',
        arguments: {
          now: '2026-04-04T13:20:00.000Z',
          expiresAt: '2026-04-04T13:25:00.000Z',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {
              tenantId: 'tenant-runtime',
              principalId: 'principal-runtime',
              registrationId: 'areg-runtime',
            },
          },
          async postHeartbeat() {
            throw new Error('heartbeat failed');
          },
        }) as never,
        localAccumulationPath: accumulationPath,
        now: () => '2026-04-04T13:20:00.000Z',
      },
    ),
    /heartbeat failed/,
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
