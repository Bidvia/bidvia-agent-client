import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  readLocalAccumulation,
  runBidviaSurfaceCapability,
} from '../src/index.ts';

function buildLocalAccumulationPath(prefix: string): string {
  return path.join(mkdtempSync(path.join(tmpdir(), prefix)), 'local-accumulation');
}

test('runBidviaSurfaceCapability returns helper success when no runtime-owned result commit path exists and preserves staged local result state', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-surface-runtime-success-');

  const result = await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: 'createProvisionalAgent',
      capabilityKey: 'createProvisionalAgent',
      identity: {
        tenantId: 'tenant-runtime',
      },
      input: {
        provisionalAgentRef: 'prov-runtime-surface-1',
      },
      createClient: async () => ({
        async createProvisionalAgent() {
          return {
            provisionalAgentRef: 'prov-runtime-surface-1',
            created: true,
          };
        },
      }) as never,
      execute: async (client) => (client as unknown as {
        createProvisionalAgent: () => Promise<unknown>;
      }).createProvisionalAgent(),
      now: () => '2026-04-04T15:00:00.000Z',
      accumulation: {
        path: accumulationPath,
      },
    });

  assert.deepEqual(result, {
    provisionalAgentRef: 'prov-runtime-surface-1',
    created: true,
  });

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage[0]?.helperKey, 'createProvisionalAgent');
  assert.equal(accumulation.resultMemory.results[0]?.terminalState, 'complete');
  assert.equal(accumulation.resultMemory.results[0]?.commitState, 'staged');
  assert.equal(accumulation.resultMemory.results[0]?.outcomeRef, undefined);
  assert.equal(
    accumulation.taskExecutionMemory.progressMarkers.some((marker) => marker.marker === 'result-staged'),
    true,
  );
});

test('runBidviaSurfaceCapability preserves staged local failure state when execution fails and the runtime-owned result commit path is unavailable', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-surface-runtime-failure-');

  await assert.rejects(
    () => runBidviaSurfaceCapability({
      transport: 'mcp',
      helperKey: 'postHeartbeat',
      capabilityKey: 'postHeartbeat',
      identity: {
        tenantId: 'tenant-runtime',
        principalId: 'principal-runtime',
        registrationId: 'areg-runtime',
      },
      input: {
        now: '2026-04-04T15:05:00.000Z',
        expiresAt: '2026-04-04T15:10:00.000Z',
      },
      createClient: async () => ({
        async postHeartbeat() {
          throw new Error('heartbeat failed');
        },
      }) as never,
      execute: async (client) => (client as unknown as {
        postHeartbeat: () => Promise<unknown>;
      }).postHeartbeat(),
      now: () => '2026-04-04T15:05:00.000Z',
      accumulation: {
        path: accumulationPath,
      },
    }),
    /heartbeat failed/,
  );

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage.length, 0);
  assert.equal(accumulation.resultMemory.results[0]?.terminalState, 'fail');
  assert.equal(accumulation.resultMemory.results[0]?.commitState, 'staged');
  assert.equal(accumulation.resultMemory.results[0]?.outcomeRef, undefined);
  assert.equal(
    accumulation.taskExecutionMemory.progressMarkers.some((marker) => marker.marker === 'result-staged'),
    true,
  );
});

test('runBidviaSurfaceCapability reuses the same local execution track across reruns of the same logical work', async () => {
  const accumulationPath = buildLocalAccumulationPath('bidvia-surface-runtime-resume-');

  await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: 'createProvisionalAgent',
      capabilityKey: 'createProvisionalAgent',
      identity: {
        tenantId: 'tenant-runtime',
      },
      input: {
        provisionalAgentRef: 'prov-runtime-surface-resume-1',
      },
      createClient: async () => ({
        async createProvisionalAgent() {
          return {
            provisionalAgentRef: 'prov-runtime-surface-resume-1',
            created: true,
          };
        },
      }) as never,
      execute: async (client) => (client as unknown as {
        createProvisionalAgent: () => Promise<unknown>;
      }).createProvisionalAgent(),
      now: () => '2026-04-04T15:10:00.000Z',
      accumulation: {
        path: accumulationPath,
      },
    });

  const firstAccumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  await runBidviaSurfaceCapability({
      transport: 'cli',
      helperKey: 'createProvisionalAgent',
      capabilityKey: 'createProvisionalAgent',
      identity: {
        tenantId: 'tenant-runtime',
      },
      input: {
        provisionalAgentRef: 'prov-runtime-surface-resume-1',
      },
      createClient: async () => ({
        async createProvisionalAgent() {
          return {
            provisionalAgentRef: 'prov-runtime-surface-resume-1',
            created: true,
          };
        },
      }) as never,
      execute: async (client) => (client as unknown as {
        createProvisionalAgent: () => Promise<unknown>;
      }).createProvisionalAgent(),
      now: () => '2026-04-04T15:11:00.000Z',
      accumulation: {
        path: accumulationPath,
      },
    });

  const secondAccumulation = await readLocalAccumulation({
    path: accumulationPath,
  });
  const firstExecutionStartCount = firstAccumulation?.taskExecutionMemory.progressMarkers.filter(
    (marker) => marker.marker === 'execution-started',
  ).length ?? 0;
  const secondExecutionStartCount = secondAccumulation?.taskExecutionMemory.progressMarkers.filter(
    (marker) => marker.marker === 'execution-started',
  ).length ?? 0;

  assert.ok(firstAccumulation);
  assert.ok(secondAccumulation);
  assert.equal(secondAccumulation.onboardingMemory.sessionRef, firstAccumulation.onboardingMemory.sessionRef);
  assert.equal(secondAccumulation.taskExecutionMemory.localTaskRef, firstAccumulation.taskExecutionMemory.localTaskRef);
  assert.equal(secondAccumulation.taskExecutionMemory.taskDispatchId, firstAccumulation.taskExecutionMemory.taskDispatchId);
  assert.equal(secondExecutionStartCount > firstExecutionStartCount, true);
});
