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

test('runCli create-provisional-agent returns helper success when no runtime-owned result commit path exists while preserving staged onboarding result state', async () => {
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
  assert.equal(accumulation.resultMemory.results[0]?.terminalState, 'complete');
  assert.equal(accumulation.resultMemory.results[0]?.commitState, 'staged');
  assert.equal(accumulation.resultMemory.results[0]?.outcomeRef, undefined);
});

test('runCli heartbeat returns helper success when no runtime-owned result commit path exists while preserving staged execution result state', async () => {
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
    readLocalOnboardingState: async () => null,
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
  assert.equal(accumulation.resultMemory.results[0]?.terminalState, 'complete');
  assert.equal(accumulation.resultMemory.results[0]?.commitState, 'staged');
  assert.equal(accumulation.resultMemory.results[0]?.outcomeRef, undefined);
});

test('runCli reruns reuse the same local runtime track for the same execution command input', async () => {
  const printed: unknown[] = [];
  const accumulationPath = buildLocalAccumulationPath('bidvia-cli-runtime-resume-');

  const createDependencies = (now: string) => ({
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
    readLocalOnboardingState: async () => null,
    now: () => now,
    printJson: (value: unknown) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('heartbeat should not print help lines');
    },
  });

  assert.equal(await runCli(['heartbeat'], createDependencies('2026-04-04T12:10:00.000Z')), 0);

  const firstAccumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.equal(await runCli(['heartbeat'], createDependencies('2026-04-04T12:11:00.000Z')), 0);

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
  assert.equal(secondAccumulation.taskExecutionMemory.localTaskRef, firstAccumulation.taskExecutionMemory.localTaskRef);
  assert.equal(secondAccumulation.taskExecutionMemory.taskDispatchId, firstAccumulation.taskExecutionMemory.taskDispatchId);
  assert.equal(secondAccumulation.onboardingMemory.sessionRef, firstAccumulation.onboardingMemory.sessionRef);
  assert.equal(secondExecutionStartCount > firstExecutionStartCount, true);
});

test('runCli industry-universe-execution uses the shared runtime execution path and records local accumulation evidence', async () => {
  const printed: unknown[] = [];
  const accumulationPath = buildLocalAccumulationPath('bidvia-cli-runtime-industry-universe-');

  const exitCode = await runCli([
    'industry-universe-execution',
    '--input',
    JSON.stringify({
      scenarioId: 'scenario-industry-universe-runtime-1',
      scenarioLabel: 'industry-universe-runtime-input',
      sourceRefs: ['source://market/runtime-1'],
      evidenceRefs: ['evidence://cli/runtime-1'],
      traceIds: ['trace-runtime-1'],
      workflowIds: ['wf-runtime-1'],
      createListing: {
        listingId: 'listing-runtime-1',
        listingType: 'supply',
        category: 'basic inorganic industrial chemical',
        sku: 'sodium-carbonate-runtime-1',
        quantityValue: '15',
        quantityUnit: 'tons',
        regionSummary: 'China -> Vietnam',
        verificationStatus: 'verified',
        freshnessTs: '2026-04-04T12:20:00Z',
        traceId: 'trace-runtime-1',
        idempotencyKey: 'listing-runtime-1',
        now: '2026-04-04T12:20:00Z',
      },
      activateListing: {
        now: '2026-04-04T12:21:00Z',
      },
      generateMatchCandidates: {
        upstreamDecision: 'READY_FOR_ROUTING',
        requiredEvidenceLevel: 1,
        detectedEvidenceLevel: 1,
        workflowRunId: 'wf-runtime-1',
        triggerEventId: 'evt-runtime-1',
        topN: 10,
        now: '2026-04-04T12:22:00Z',
      },
    }),
  ], {
    createClient: () => ({
      async createListing() {
        return { ok: true, helper: 'createListing' };
      },
      async activateListing() {
        return { ok: true, helper: 'activateListing' };
      },
      async generateMatchCandidates() {
        return { ok: true, helper: 'generateMatchCandidates' };
      },
    }) as never,
    resolveProcessEnv: () => ({
      BIDVIA_TENANT_ID: 'tenant-runtime',
      BIDVIA_PRINCIPAL_ID: 'principal-runtime',
      BIDVIA_COMPANY_ID: 'company-runtime',
      BIDVIA_LOCAL_ACCUMULATION_PATH: accumulationPath,
    }),
    readLocalOnboardingState: async () => null,
    now: () => '2026-04-04T12:20:00.000Z',
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('industry-universe-execution should not print help lines');
    },
  });

  assert.equal(exitCode, 0);
  assert.equal(printed.length, 1);

  const accumulation = await readLocalAccumulation({
    path: accumulationPath,
  });

  assert.ok(accumulation);
  assert.equal(accumulation.taskExecutionMemory.scope, 'local-task-execution-memory');
  assert.equal(accumulation.capabilityUsageMemory.capabilities.length > 0, true);
  assert.equal(accumulation.resultMemory.results.length > 0, true);
});

test('cli runtime context helper keeps provisional onboarding execution isolated from stale claimed identity fields', async () => {
  const { buildCliOnboardingActionExecutionContext } = await import('../src/cli-runtime-context.ts');

  const executionContext = buildCliOnboardingActionExecutionContext(
    'create-provisional-agent',
    {
      BIDVIA_SESSION_ID: 'session-should-not-leak',
    } as NodeJS.ProcessEnv,
    null,
    {
      tenantId: { value: 'tenant-runtime', source: 'local-state' },
      agentId: { value: null, source: 'missing' },
      principalId: { value: 'principal-stale', source: 'local-state' },
      companyId: { value: 'company-stale', source: 'local-state' },
      registrationId: { value: 'areg-stale', source: 'local-state' },
      sessionId: { present: true, source: 'env' },
    },
  );

  assert.deepEqual(executionContext, {
    tenantId: 'tenant-runtime',
    agentId: undefined,
    principalId: undefined,
    companyId: undefined,
    registrationId: undefined,
    sessionId: undefined,
  });
});

test('cli runtime context helper reuses local session fallback for claim continuation when env is absent', async () => {
  const { buildCliOnboardingActionExecutionContext } = await import('../src/cli-runtime-context.ts');

  const executionContext = buildCliOnboardingActionExecutionContext(
    'claim-provisional-agent',
    {} as NodeJS.ProcessEnv,
    {
      tenantId: 'tenant-runtime',
      sessionId: 'sess-local',
    },
    {
      tenantId: { value: 'tenant-runtime', source: 'local-state' },
      agentId: { value: 'agent-local', source: 'local-state' },
      principalId: { value: 'principal-local', source: 'local-state' },
      companyId: { value: null, source: 'missing' },
      registrationId: { value: 'areg-local', source: 'local-state' },
      sessionId: { present: true, source: 'local-state' },
    },
  );

  assert.deepEqual(executionContext, {
    tenantId: 'tenant-runtime',
    agentId: 'agent-local',
    principalId: 'principal-local',
    companyId: undefined,
    registrationId: 'areg-local',
    sessionId: 'sess-local',
  });
});

test('cli runtime context helper preserves existing sessionId when claim persistence records claimed identity fields', async () => {
  const { buildCliPersistedOnboardingActionState } = await import('../src/cli-runtime-context.ts');

  const persistedState = buildCliPersistedOnboardingActionState(
    'claim-provisional-agent',
    {
      registration: {
        agent_registration_id: 'areg-runtime',
        agent_id: 'agent-runtime',
        principal_id: 'principal-runtime',
        tenant_id: 'company-runtime',
      },
    },
    {
      tenantId: 'tenant-runtime',
      sessionId: 'sess-existing',
      createdAt: '2026-04-04T12:25:00.000Z',
      updatedAt: '2026-04-04T12:26:00.000Z',
    },
    {
      tenantId: { value: 'tenant-runtime', source: 'env' },
      agentId: { value: null, source: 'missing' },
      principalId: { value: null, source: 'missing' },
      companyId: { value: null, source: 'missing' },
      registrationId: { value: null, source: 'missing' },
    },
    {
      tenantId: 'tenant-runtime',
      sessionId: 'sess-existing',
    },
    '2026-04-04T12:30:00.000Z',
  );

  assert.deepEqual(persistedState, {
    tenantId: 'tenant-runtime',
    agentId: 'agent-runtime',
    principalId: 'principal-runtime',
    companyId: 'company-runtime',
    registrationId: 'areg-runtime',
    sessionId: 'sess-existing',
    lastCompletedStep: 'claim-provisional-agent',
    createdAt: '2026-04-04T12:25:00.000Z',
    updatedAt: '2026-04-04T12:30:00.000Z',
  });
});
