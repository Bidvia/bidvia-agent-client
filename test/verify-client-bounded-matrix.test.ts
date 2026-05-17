import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  parseVerifyClientBoundedMatrixArgs,
  runClientBoundedMatrix,
  writeClientBoundedMatrixEvidence,
} from '../scripts/verify-client-bounded-matrix.ts';
import type { RunP1OperatorDeeperChainReport } from '../scripts/live-probes/run-p1-operator-deeper-chain.ts';

const mockOperatorMaterializationStageSnapshot: RunP1OperatorDeeperChainReport['materializationReadback']['stageSnapshot'] = {
  roleWorkspace: {
    role: 'claimant',
    sessionPresent: true,
    adminSessionPresent: false,
    tenantId: 'tenant-public',
    activeOrgId: 'company-public',
    principalId: 'claimed:agent-1',
    authorizedCompanyId: 'company-public',
    canonicality: 'canonical',
  },
  stage: 'handoff',
  state: 'handoff-required',
  executability: 'executable-handoff',
  action: {
    kind: 'handoff',
    owner: 'operator',
    executability: 'executable-handoff',
    route: '/operator/handoff',
  },
};

test('parseVerifyClientBoundedMatrixArgs requires base-url and output', () => {
  assert.deepEqual(
    parseVerifyClientBoundedMatrixArgs([
      '--base-url',
      'http://127.0.0.1:8787',
      '--output',
      '.sisyphus/evidence/client-bounded-matrix.json',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      outputPath: '.sisyphus/evidence/client-bounded-matrix.json',
    },
  );

  assert.throws(
    () => parseVerifyClientBoundedMatrixArgs(['--base-url', 'http://127.0.0.1:8787']),
    /--output is required/,
  );
  assert.throws(
    () => parseVerifyClientBoundedMatrixArgs(['--output', 'out.json']),
    /--base-url is required/,
  );
});

test('runClientBoundedMatrix records baseline health and machine-readable blocked scenarios when actor context is absent', async () => {
  const responses = [
    {
      status: 'ok',
      service: 'runtime',
    },
    {
      status: 'ready',
      service: 'runtime',
    },
  ];
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(input));
    return new Response(JSON.stringify(responses[calls.length - 1] ?? { ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const evidence = await runClientBoundedMatrix(
    {
      baseUrl: 'http://127.0.0.1:8787',
    },
    {
      fetchImpl,
      env: {},
      now: () => '2026-05-06T12:00:00.000Z',
    },
  );

  assert.deepEqual(calls, [
    'http://127.0.0.1:8787/healthz',
    'http://127.0.0.1:8787/readyz',
  ]);
  assert.equal(evidence.baseUrl, 'http://127.0.0.1:8787');
  assert.equal(evidence.generatedAt, '2026-05-06T12:00:00.000Z');
  assert.equal(evidence.runtime.healthz.httpStatus, 200);
  assert.equal(evidence.runtime.readyz.httpStatus, 200);
  assert.deepEqual(
    evidence.scenarios.map((scenario) => [scenario.scenarioKey, scenario.status, scenario.resultClass]),
    [
      ['runtime-baseline', 'passed', 'pass'],
      ['platform-managed-onboarding', 'blocked', 'blocked'],
      ['dispatch-ready-progression', 'blocked', 'blocked'],
      ['role-collaboration-handoff', 'blocked', 'blocked'],
      ['continuous-task-governed-work-closure', 'blocked', 'blocked'],
      ['commercial-and-integration-readback', 'blocked', 'blocked'],
    ],
  );
  assert.match(evidence.summary.blockedScenarioKeys.join(','), /platform-managed-onboarding/);
  assert.equal(evidence.summary.boundedStopCount, 0);
  assert.equal(evidence.summary.contradictionCount, 0);
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'dispatch-ready-progression')),
    /fresh-bootstrap-state-required/,
  );
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'platform-managed-onboarding')),
    /fresh-bootstrap-state-required/,
  );
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'continuous-task-governed-work-closure')),
    /probe-artifacts-not-configured/,
  );
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'continuous-task-governed-work-closure')),
    /checked-in Pack B progression probe/i,
  );
  assert.doesNotMatch(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'continuous-task-governed-work-closure')),
    /Chunk 2 does not yet wire/i,
  );
});

test('runClientBoundedMatrix executes the checked-in probe lanes when artifact paths are available and classifies bounded stops distinctly', async () => {
  const responses = [
    { status: 'ok', service: 'runtime' },
    { status: 'ready', service: 'runtime' },
  ];
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(responses.shift() ?? { ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const evidence = await runClientBoundedMatrix(
    {
      baseUrl: 'http://127.0.0.1:8787',
      artifactRootPath: '/tmp/bounded-matrix-artifacts',
    },
    {
      fetchImpl,
      env: {},
      now: () => '2026-05-16T12:00:00.000Z',
      bootstrapClaimantLocalDocker: async () => ({
        command: 'bootstrap-claimant-local-docker',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bootstrap-state.json',
        admin: {
          email: 'ops-admin@example.com',
          adminSessionId: 'admin-session-1',
          adminAccountId: 'admin-acct-1',
        },
        invitation: {
          invitationId: 'invite-1',
          invitationType: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
        claimant: {
          email: 'live@example.com',
          accountId: 'acct-1',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          membershipRole: 'enterprise_admin',
          agentOnboardingAllowed: true,
          agentId: 'agent-1',
          principalId: 'claimed:agent-1',
          registrationId: 'areg-1',
        },
        dispatchAuthority: {
          requestId: 'daar-1',
          status: 'APPROVED',
          authorityProfileId: 'authp-1',
        },
        externalBinding: {
          bindingId: 'eab-1',
          status: 'active',
          systemName: 'bootstrap-live-seeded',
          externalAccountRef: 'ext-seeded',
        },
      }),
      runP1OperatorDeeperChain: async (): Promise<RunP1OperatorDeeperChainReport> => ({
        command: 'run-p1-operator-deeper-chain',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/operator-state.json',
        outputPath: '/tmp/operator-report.json',
        bootstrap: {} as never,
        ids: {
          sourceListingId: 'source-listing-1',
          candidateListingId: 'candidate-listing-1',
          matchId: 'match-1',
          connectionRequestId: 'conn-1',
          connectionApprovalRequestId: 'apr-1',
          opportunityId: 'opp-1',
          packageId: 'pkg-1',
          commercialActionRequestId: 'car-1',
          commercialActionApprovalRequestId: 'apr-car-1',
          receiptId: 'receipt-1',
          auditId: 'audit-1',
        },
        materializationReadback: {
          materialization: {
            materialization_stage: 'match_prerequisites_ready',
          },
          stageSnapshot: mockOperatorMaterializationStageSnapshot,
        },
        claimantReadbacks: {
          status: { continuation_state: 'ALLOCATED' },
          endState: { closure_class: 'product_closed' },
        },
        steps: [],
      }),
      runPackBTaskProgression: async () => ({
        command: 'run-pack-b-task-progression',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/pack-b-state.json',
        outputPath: '/tmp/pack-b-report.json',
        bootstrap: {} as never,
        selfServicePatch: { recommended_next_step: 'dispatch_ready' },
        successBranch: {
          dispatchId: 'dispatch-success-1',
          outcomeRef: 'outcome://success-1',
          confirmationCycleRef: 'cycle-success-1',
          closureRefs: {
            dispatchRef: 'dispatch-success-1',
            outcomeRef: 'outcome://success-1',
            evidenceBundleRef: 'evidence-bundle://success-1',
            confirmationCycleRef: 'cycle-success-1',
          },
          steps: [],
        },
        failureBranch: {
          dispatchId: 'dispatch-fail-1',
          outcomeRef: 'outcome://fail-1',
          confirmationCycleRef: 'cycle-fail-1',
          closureRefs: {
            dispatchRef: 'dispatch-fail-1',
            outcomeRef: 'outcome://fail-1',
            evidenceBundleRef: 'evidence-bundle://fail-1',
            confirmationCycleRef: 'cycle-fail-1',
          },
          steps: [],
        },
      }),
      runP1IntegrationLifecycle: async () => ({
        command: 'run-p1-integration-lifecycle',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/integration-state.json',
        outputPath: '/tmp/integration-report.json',
        claimant: {
          email: 'live@example.com',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          agentOnboardingAllowed: true,
        },
        ids: {
          integrationAppId: 'iapp-1',
          integrationInstallationId: 'iinst-1',
        },
        steps: [
          {
            stepKey: 'account-agent-integration-eligibility',
            status: 'passed',
            route: '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
            requestBody: null,
            responseBody: { availability_state: 'configured_actor_ineligible' },
          },
        ],
      }),
      runPlatformManagedIntegrationHandoff: async () => ({
        command: 'run-platform-managed-integration-handoff',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/platform-state.json',
        outputPath: '/tmp/platform-report.json',
        integrationCode: 'haisi-wms',
        bootstrap: {} as never,
        ordinaryAgentId: 'agent-1',
        platformManagedAgentId: 'pm-agent-1',
        selectedApp: { integration_app_id: 'iapp-1' },
        installationId: 'iinst-1',
        connectionId: 'iiconn-1',
        ordinaryExternalEligibility: { eligibility: { readiness_state: 'configured_actor_ineligible' } },
        platformManagedEligibility: {
          eligibility: {
            readiness_state: 'configured_not_invokable',
            invocation_route: null,
          },
        },
        inboundAttempt: {
          error: {
            code: 'connector_inbound_not_supported',
          },
        },
        steps: [],
      }),
    },
  );

  assert.deepEqual(
    evidence.scenarios.map((scenario) => [scenario.scenarioKey, scenario.status, scenario.resultClass]),
    [
      ['runtime-baseline', 'passed', 'pass'],
      ['platform-managed-onboarding', 'passed', 'pass'],
      ['dispatch-ready-progression', 'passed', 'pass'],
      ['role-collaboration-handoff', 'passed', 'pass'],
      ['continuous-task-governed-work-closure', 'passed', 'pass'],
      ['commercial-and-integration-readback', 'blocked', 'bounded-stop'],
    ],
  );
  assert.equal(evidence.summary.passedCount, 5);
  assert.equal(evidence.summary.blockedCount, 1);
  assert.equal(evidence.summary.failedCount, 0);
  assert.equal(evidence.summary.boundedStopCount, 1);
  assert.equal(evidence.summary.contradictionCount, 0);
  assert.equal(
    evidence.scenarios.find((scenario) => scenario.scenarioKey === 'dispatch-ready-progression')?.returnedIds.agentId,
    'agent-1',
  );
  assert.match(
    JSON.stringify(evidence.scenarios.find((scenario) => scenario.scenarioKey === 'commercial-and-integration-readback')),
    /connector_inbound_not_supported/,
  );
  assert.equal(
    evidence.scenarios.find((scenario) => scenario.scenarioKey === 'continuous-task-governed-work-closure')?.returnedIds.dispatchRef,
    'dispatch-success-1',
  );
  assert.deepEqual(
    evidence.scenarios.map((scenario) => [scenario.scenarioKey, scenario.coveredFamilies, scenario.proofClass]),
    [
      ['runtime-baseline', ['public-runtime-interpretation'], 'baseline-interpretation'],
      ['platform-managed-onboarding', ['identity-entry'], 'direct-executable'],
      ['dispatch-ready-progression', ['account-plane-readiness-and-repair', 'operator-review-boundary'], 'direct-executable'],
      ['role-collaboration-handoff', ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'], 'partial-executable'],
      ['continuous-task-governed-work-closure', ['bounded-task-plane-progression'], 'direct-executable'],
      ['commercial-and-integration-readback', ['integration-center-lifecycle-and-retired-seam-validation'], 'bounded-stop-proof'],
    ],
  );
});

test('runClientBoundedMatrix marks contradictory platform-managed readiness as a contradiction instead of a bounded stop', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const evidence = await runClientBoundedMatrix(
    {
      baseUrl: 'http://127.0.0.1:8787',
      artifactRootPath: '/tmp/bounded-matrix-artifacts',
    },
    {
      fetchImpl,
      env: {},
      now: () => '2026-05-16T12:00:00.000Z',
      bootstrapClaimantLocalDocker: async () => ({
        command: 'bootstrap-claimant-local-docker',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bootstrap-state.json',
        admin: {
          email: 'ops-admin@example.com',
          adminSessionId: 'admin-session-1',
          adminAccountId: 'admin-acct-1',
        },
        invitation: {
          invitationId: 'invite-1',
          invitationType: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
        claimant: {
          email: 'live@example.com',
          accountId: 'acct-1',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          membershipRole: 'enterprise_admin',
          agentOnboardingAllowed: true,
          agentId: 'agent-1',
          principalId: 'claimed:agent-1',
          registrationId: 'areg-1',
        },
        dispatchAuthority: {
          requestId: 'daar-1',
          status: 'APPROVED',
          authorityProfileId: 'authp-1',
        },
        externalBinding: {
          bindingId: 'eab-1',
          status: 'active',
          systemName: 'bootstrap-live-seeded',
          externalAccountRef: 'ext-seeded',
        },
      }),
      runP1OperatorDeeperChain: async (): Promise<RunP1OperatorDeeperChainReport> => ({
        command: 'run-p1-operator-deeper-chain',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/operator-state.json',
        outputPath: '/tmp/operator-report.json',
        bootstrap: {} as never,
        ids: {
          sourceListingId: 'source-listing-1',
          candidateListingId: 'candidate-listing-1',
          matchId: 'match-1',
          connectionRequestId: 'conn-1',
          connectionApprovalRequestId: 'apr-1',
          opportunityId: 'opp-1',
          packageId: 'pkg-1',
          commercialActionRequestId: 'car-1',
          commercialActionApprovalRequestId: 'apr-car-1',
          receiptId: 'receipt-1',
          auditId: 'audit-1',
        },
        materializationReadback: {
          materialization: {
            materialization_stage: 'match_prerequisites_ready',
          },
          stageSnapshot: mockOperatorMaterializationStageSnapshot,
        },
        claimantReadbacks: {
          status: { continuation_state: 'ALLOCATED' },
          endState: { closure_class: 'product_closed' },
        },
        steps: [],
      }),
      runPackBTaskProgression: async () => ({
        command: 'run-pack-b-task-progression',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/pack-b-state.json',
        outputPath: '/tmp/pack-b-report.json',
        bootstrap: {} as never,
        selfServicePatch: { recommended_next_step: 'dispatch_ready' },
        successBranch: {
          dispatchId: 'dispatch-success-1',
          outcomeRef: 'outcome://success-1',
          confirmationCycleRef: 'cycle-success-1',
          closureRefs: {
            dispatchRef: 'dispatch-success-1',
            outcomeRef: 'outcome://success-1',
            evidenceBundleRef: 'evidence-bundle://success-1',
            confirmationCycleRef: 'cycle-success-1',
          },
          steps: [],
        },
        failureBranch: {
          dispatchId: 'dispatch-fail-1',
          outcomeRef: 'outcome://fail-1',
          confirmationCycleRef: 'cycle-fail-1',
          closureRefs: {
            dispatchRef: 'dispatch-fail-1',
            outcomeRef: 'outcome://fail-1',
            evidenceBundleRef: 'evidence-bundle://fail-1',
            confirmationCycleRef: 'cycle-fail-1',
          },
          steps: [],
        },
      }),
      runP1IntegrationLifecycle: async () => ({
        command: 'run-p1-integration-lifecycle',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/integration-state.json',
        outputPath: '/tmp/integration-report.json',
        claimant: {
          email: 'live@example.com',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          agentOnboardingAllowed: true,
        },
        ids: {
          integrationAppId: 'iapp-1',
          integrationInstallationId: 'iinst-1',
        },
        steps: [],
      }),
      runPlatformManagedIntegrationHandoff: async () => ({
        command: 'run-platform-managed-integration-handoff',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/platform-state.json',
        outputPath: '/tmp/platform-report.json',
        integrationCode: 'haisi-wms',
        bootstrap: {} as never,
        ordinaryAgentId: 'agent-1',
        platformManagedAgentId: 'pm-agent-1',
        selectedApp: { integration_app_id: 'iapp-1' },
        installationId: 'iinst-1',
        connectionId: 'iiconn-1',
        ordinaryExternalEligibility: { eligibility: { readiness_state: 'configured_actor_ineligible' } },
        platformManagedEligibility: {
          eligibility: {
            readiness_state: 'configured_not_invokable',
            invocation_route: null,
          },
        },
        inboundAttempt: {
          status: 'not-attempted',
        },
        steps: [],
      }),
    },
  );

  const commercialScenario = evidence.scenarios.find((scenario) => scenario.scenarioKey === 'commercial-and-integration-readback');
  assert.equal(commercialScenario?.status, 'blocked');
  assert.equal(commercialScenario?.resultClass, 'bounded-stop');
  assert.equal(evidence.summary.contradictionCount, 0);
});

test('runClientBoundedMatrix captures probe failures as contradiction evidence instead of aborting', async () => {
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  const evidence = await runClientBoundedMatrix(
    {
      baseUrl: 'http://127.0.0.1:8787',
      artifactRootPath: '/tmp/bounded-matrix-artifacts',
    },
    {
      fetchImpl,
      env: {},
      now: () => '2026-05-16T12:00:00.000Z',
      bootstrapClaimantLocalDocker: async () => ({
        command: 'bootstrap-claimant-local-docker',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bootstrap-state.json',
        admin: {
          email: 'ops-admin@example.com',
          adminSessionId: 'admin-session-1',
          adminAccountId: 'admin-acct-1',
        },
        invitation: {
          invitationId: 'invite-1',
          invitationType: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
        claimant: {
          email: 'live@example.com',
          accountId: 'acct-1',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          membershipRole: 'enterprise_admin',
          agentOnboardingAllowed: true,
          agentId: 'agent-1',
          principalId: 'claimed:agent-1',
          registrationId: 'areg-1',
        },
        dispatchAuthority: {
          requestId: 'daar-1',
          status: 'APPROVED',
          authorityProfileId: 'authp-1',
        },
        externalBinding: {
          bindingId: 'eab-1',
          status: 'active',
          systemName: 'bootstrap-live-seeded',
          externalAccountRef: 'ext-seeded',
        },
      }),
      runP1OperatorDeeperChain: async () => {
        throw new Error('operator deeper-chain probe crashed unexpectedly');
      },
      runPackBTaskProgression: async () => ({
        command: 'run-pack-b-task-progression',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/pack-b-state.json',
        outputPath: '/tmp/pack-b-report.json',
        bootstrap: {} as never,
        selfServicePatch: { recommended_next_step: 'dispatch_ready' },
        successBranch: {
          dispatchId: 'dispatch-success-1',
          outcomeRef: 'outcome://success-1',
          confirmationCycleRef: 'cycle-success-1',
          closureRefs: {
            dispatchRef: 'dispatch-success-1',
            outcomeRef: 'outcome://success-1',
            evidenceBundleRef: 'evidence-bundle://success-1',
            confirmationCycleRef: 'cycle-success-1',
          },
          steps: [],
        },
        failureBranch: {
          dispatchId: 'dispatch-fail-1',
          outcomeRef: 'outcome://fail-1',
          confirmationCycleRef: 'cycle-fail-1',
          closureRefs: {
            dispatchRef: 'dispatch-fail-1',
            outcomeRef: 'outcome://fail-1',
            evidenceBundleRef: 'evidence-bundle://fail-1',
            confirmationCycleRef: 'cycle-fail-1',
          },
          steps: [],
        },
      }),
      runP1IntegrationLifecycle: async () => ({
        command: 'run-p1-integration-lifecycle',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/integration-state.json',
        outputPath: '/tmp/integration-report.json',
        claimant: {
          email: 'live@example.com',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          agentOnboardingAllowed: true,
        },
        ids: {
          integrationAppId: 'iapp-1',
          integrationInstallationId: 'iinst-1',
        },
        steps: [],
      }),
      runPlatformManagedIntegrationHandoff: async () => ({
        command: 'run-platform-managed-integration-handoff',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/platform-state.json',
        outputPath: '/tmp/platform-report.json',
        integrationCode: 'haisi-wms',
        bootstrap: {} as never,
        ordinaryAgentId: 'agent-1',
        platformManagedAgentId: 'pm-agent-1',
        selectedApp: { integration_app_id: 'iapp-1' },
        installationId: 'iinst-1',
        connectionId: 'iiconn-1',
        ordinaryExternalEligibility: { eligibility: { readiness_state: 'configured_actor_ineligible' } },
        platformManagedEligibility: {
          eligibility: {
            readiness_state: 'configured_not_invokable',
            invocation_route: null,
          },
        },
        inboundAttempt: {
          error: {
            code: 'connector_inbound_not_supported',
          },
        },
        steps: [],
      }),
    },
  );

  const operatorScenario = evidence.scenarios.find((scenario) => scenario.scenarioKey === 'role-collaboration-handoff');
  assert.equal(operatorScenario?.status, 'failed');
  assert.equal(operatorScenario?.resultClass, 'contradiction');
  assert.match(JSON.stringify(operatorScenario), /operator deeper-chain probe crashed unexpectedly/);
  assert.equal(evidence.summary.contradictionCount, 1);
});

test('writeClientBoundedMatrixEvidence persists pretty-printed machine-readable evidence', async () => {
  const outputDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-bounded-matrix-'));
  const outputPath = path.join(outputDirectory, 'client-bounded-matrix.json');

  const result = await writeClientBoundedMatrixEvidence(outputPath, {
    schemaVersion: '2026-05-06',
    generatedAt: '2026-05-06T12:00:00.000Z',
    baseUrl: 'http://127.0.0.1:8787',
    runtime: {
      healthz: { httpStatus: 200, body: { status: 'ok' } },
      readyz: { httpStatus: 200, body: { status: 'ready' } },
    },
    actorContext: {
      claimant: { availableFields: [], missingFields: ['BIDVIA_TENANT_ID'] },
      admin: { availableFields: [], missingFields: ['BIDVIA_ADMIN_SESSION_ID'] },
    },
    scenarios: [],
      summary: {
        passedCount: 0,
        blockedCount: 0,
        failedCount: 0,
        boundedStopCount: 0,
        contradictionCount: 0,
        blockedScenarioKeys: [],
        failedScenarioKeys: [],
      },
  });

  assert.equal(result.outputPath, outputPath);
  assert.deepEqual(JSON.parse(readFileSync(outputPath, 'utf8')), {
    schemaVersion: '2026-05-06',
    generatedAt: '2026-05-06T12:00:00.000Z',
    baseUrl: 'http://127.0.0.1:8787',
    runtime: {
      healthz: { httpStatus: 200, body: { status: 'ok' } },
      readyz: { httpStatus: 200, body: { status: 'ready' } },
    },
    actorContext: {
      claimant: { availableFields: [], missingFields: ['BIDVIA_TENANT_ID'] },
      admin: { availableFields: [], missingFields: ['BIDVIA_ADMIN_SESSION_ID'] },
    },
    scenarios: [],
      summary: {
        passedCount: 0,
        blockedCount: 0,
        failedCount: 0,
        boundedStopCount: 0,
        contradictionCount: 0,
        blockedScenarioKeys: [],
        failedScenarioKeys: [],
      },
  });
});
