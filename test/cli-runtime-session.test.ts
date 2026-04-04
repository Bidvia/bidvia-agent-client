import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runCli } from '../src/cli.ts';
import { readLocalAccumulation } from '../src/runtime/local-accumulation/store.ts';

function buildLocalAccumulationPath(prefix: string): string {
  return path.join(mkdtempSync(path.join(tmpdir(), prefix)), 'local-accumulation');
}

test('runCli create-provisional-agent preserves the public output while recording onboarding memory and capability usage through the runtime session surface', async () => {
  const printed: unknown[] = [];
  const accumulationPath = buildLocalAccumulationPath('bidvia-cli-runtime-onboarding-');

  const exitCode = await runCli(['create-provisional-agent', '--provisional-agent-ref', 'prov-runtime-1'], {
    createClient: () => ({
      createProvisionalAgent: async () => ({
        provisionalAgentRef: 'prov-runtime-1',
        created: true,
      }),
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-runtime',
      BIDVIA_LOCAL_ACCUMULATION_PATH: accumulationPath,
    }),
    readLocalOnboardingState: async () => null,
    now: () => '2026-04-04T12:00:00.000Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('create-provisional-agent should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    provisionalAgentRef: 'prov-runtime-1',
    created: true,
  }]);

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.onboardingMemory.scope, 'local-onboarding-memory');
  assert.equal(accumulation.taskExecutionMemory.scope, 'local-task-execution-memory');
  assert.equal(accumulation.capabilityUsageMemory.scope, 'local-capability-usage-memory');
  assert.equal(accumulation.resultMemory.scope, 'local-result-memory');
  assert.deepEqual(accumulation.onboardingMemory.facts, [{
    key: 'tenantId',
    value: 'tenant-runtime',
    recordedAt: '2026-04-04T12:00:00.000Z',
  }]);
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.capabilityKey, 'createProvisionalAgent');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage[0]?.helperKey, 'createProvisionalAgent');
  assert.equal(accumulation.resultMemory.results[0]?.kind, 'execution-result');
});

test('runCli heartbeat preserves the execution result while recording task execution memory and the real runtime helper key', async () => {
  const printed: unknown[] = [];
  const accumulationPath = buildLocalAccumulationPath('bidvia-cli-runtime-execution-');

  const exitCode = await runCli(['heartbeat'], {
    createClient: () => ({
      postHeartbeat: async () => ({
        ok: true,
        helperKey: 'postHeartbeat',
      }),
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-runtime',
      BIDVIA_PRINCIPAL_ID: 'principal-runtime',
      BIDVIA_REGISTRATION_ID: 'areg-runtime',
      BIDVIA_LOCAL_ACCUMULATION_PATH: accumulationPath,
    }),
    now: () => '2026-04-04T12:05:00.000Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('heartbeat should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    ok: true,
    helperKey: 'postHeartbeat',
  }]);

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.taskExecutionMemory.attempts.some((attempt) => attempt.status === 'executing'), true);
  assert.equal(accumulation.taskExecutionMemory.progressMarkers[0]?.marker, 'execution-started');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.capabilityKey, 'postHeartbeat');
  assert.equal(accumulation.capabilityUsageMemory.capabilities[0]?.usage[0]?.helperKey, 'postHeartbeat');
  assert.equal(accumulation.resultMemory.results[0]?.kind, 'execution-result');
});
