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

type RunClientBoundedMatrixDependencies = NonNullable<Parameters<typeof runClientBoundedMatrix>[1]>;
type ClientBoundedMatrixEvidence = Awaited<ReturnType<typeof runClientBoundedMatrix>>;
type RunP1IntegrationLifecycleDependency = NonNullable<RunClientBoundedMatrixDependencies['runP1IntegrationLifecycle']>;
type RunPlatformManagedIntegrationHandoffDependency = NonNullable<RunClientBoundedMatrixDependencies['runPlatformManagedIntegrationHandoff']>;
type RunP1IntegrationLifecycleReport = Awaited<ReturnType<RunP1IntegrationLifecycleDependency>>;
type RunPlatformManagedIntegrationHandoffReport = Awaited<ReturnType<RunPlatformManagedIntegrationHandoffDependency>>;

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

const commercialMatrixOptions = {
  baseUrl: 'http://127.0.0.1:8787',
  artifactRootPath: '/tmp/bounded-matrix-artifacts',
} as const;

const commercialFetchImpl: typeof fetch = async () => new Response(JSON.stringify({ ok: true }), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

function buildCommercialMatrixDependencies(overrides: {
  integrationReport?: Partial<RunP1IntegrationLifecycleReport>;
  platformManagedReport?: Partial<RunPlatformManagedIntegrationHandoffReport>;
  platformManagedProbeError?: Error;
} = {}): RunClientBoundedMatrixDependencies {
  const integrationReport: RunP1IntegrationLifecycleReport = {
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
        responseBody: { availability_state: 'configured_actor_eligible' },
      },
    ],
  };

  const platformManagedReport: RunPlatformManagedIntegrationHandoffReport = {
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
    ordinaryExternalEligibility: { eligibility: { readiness_state: 'configured_actor_eligible' } },
    platformManagedEligibility: {
      eligibility: {
        readiness_state: 'configured_invokable',
        invocation_route: '/runtime/platform-managed/inbound',
      },
    },
    inboundAttempt: {
      status: 'passed',
    },
    steps: [],
  };

  return {
    fetchImpl: commercialFetchImpl,
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
      ...integrationReport,
      ...overrides.integrationReport,
    }),
    runGovernedRuntimeProjectionEntry: async () => ({
      command: 'run-governed-runtime-projection-entry',
      generatedAt: '2026-05-16T12:00:00.000Z',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/projection-state.json',
      outputPath: '/tmp/projection-report.json',
      status: 'passed',
      phases: [
        { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
        { phaseKey: 'projection-entry', status: 'passed', classification: 'pass', detail: 'governed runtime projection entry completed successfully' },
      ],
      claimant: {
        email: 'live@example.com',
        sessionId: 'sess-1',
        tenantId: 'tenant-public',
        companyId: 'company-public',
        membershipRole: 'enterprise_admin',
      },
      governedReads: {
        agentRegistrations: { status: 200, body: { items: [{ agent_registration_id: 'areg-1' }] } },
        authorityProfiles: { status: 200, body: { items: [{ authority_profile_id: 'authp-1' }] } },
      },
      accountOwnedReads: {} as never,
      steps: [],
    }),
    runDispatchAuthorityClosure: async () => ({
      command: 'run-dispatch-authority-closure',
      generatedAt: '2026-05-16T12:00:00.000Z',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/dispatch-authority-state.json',
      outputPath: '/tmp/dispatch-authority-report.json',
      status: 'passed',
      phases: [
        { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
        { phaseKey: 'dispatch-authority-closure', status: 'passed', classification: 'pass', detail: 'dispatch-authority request, operator approval, and claimant reread truth completed successfully' },
      ],
      claimant: {
        email: 'live@example.com',
        sessionId: 'sess-1',
        tenantId: 'tenant-public',
        companyId: 'company-public',
        agentId: 'agent-1',
        registrationId: 'areg-1',
      },
      requestId: 'daar-2',
      approvalStatus: 'APPROVED',
      closureStatus: { recommended_next_step: 'complete_external_binding' },
      dispatchAuthorityAfter: { dispatch_authority: { availability_state: 'approved_dispatch_authority' } },
      steps: [],
    }),
    runPlatformManagedIntegrationHandoff: async () => {
      if (overrides.platformManagedProbeError) {
        throw overrides.platformManagedProbeError;
      }

      return {
        ...platformManagedReport,
        ...overrides.platformManagedReport,
      };
    },
  };
}

function requireCommercialScenario(evidence: ClientBoundedMatrixEvidence) {
  const commercialScenario = evidence.scenarios.find((scenario) => scenario.scenarioKey === 'commercial-and-integration-readback');
  assert.ok(commercialScenario);
  return commercialScenario;
}

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
  assert.throws(
    () => parseVerifyClientBoundedMatrixArgs(['--base-url', 'https://api.bidvia.cn', '--output', 'out.json']),
    /--base-url must target a loopback local-docker runtime/,
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
      ['governed-runtime-projection-entry', 'blocked', 'blocked'],
      ['dispatch-authority-reviewed-closure', 'blocked', 'blocked'],
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
      runGovernedRuntimeProjectionEntry: async () => ({
        command: 'run-governed-runtime-projection-entry',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/projection-state.json',
        outputPath: '/tmp/projection-report.json',
        status: 'passed',
        phases: [
          { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
          { phaseKey: 'projection-entry', status: 'passed', classification: 'pass', detail: 'governed runtime projection entry completed successfully' },
        ],
        claimant: {
          email: 'live@example.com',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          membershipRole: 'enterprise_admin',
        },
        governedReads: {
          agentRegistrations: { status: 200, body: { items: [{ agent_registration_id: 'areg-1' }] } },
          authorityProfiles: { status: 200, body: { items: [{ authority_profile_id: 'authp-1' }] } },
        },
        accountOwnedReads: {} as never,
        steps: [],
      }),
      runDispatchAuthorityClosure: async () => ({
        command: 'run-dispatch-authority-closure',
        generatedAt: '2026-05-16T12:00:00.000Z',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/dispatch-authority-state.json',
        outputPath: '/tmp/dispatch-authority-report.json',
        status: 'passed',
        phases: [
          { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
          { phaseKey: 'dispatch-authority-closure', status: 'passed', classification: 'pass', detail: 'dispatch-authority request, operator approval, and claimant reread truth completed successfully' },
        ],
        claimant: {
          email: 'live@example.com',
          sessionId: 'sess-1',
          tenantId: 'tenant-public',
          companyId: 'company-public',
          agentId: 'agent-1',
          registrationId: 'areg-1',
        },
        requestId: 'daar-2',
        approvalStatus: 'APPROVED',
        closureStatus: { recommended_next_step: 'complete_external_binding' },
        dispatchAuthorityAfter: { dispatch_authority: { availability_state: 'approved_dispatch_authority' } },
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

  assert.deepEqual(
    evidence.scenarios.map((scenario) => [scenario.scenarioKey, scenario.status, scenario.resultClass]),
    [
      ['runtime-baseline', 'passed', 'pass'],
      ['platform-managed-onboarding', 'passed', 'pass'],
      ['dispatch-ready-progression', 'passed', 'pass'],
      ['governed-runtime-projection-entry', 'passed', 'pass'],
      ['dispatch-authority-reviewed-closure', 'passed', 'pass'],
      ['role-collaboration-handoff', 'passed', 'pass'],
      ['continuous-task-governed-work-closure', 'passed', 'pass'],
      ['commercial-and-integration-readback', 'blocked', 'bounded-stop'],
    ],
  );
  assert.equal(evidence.summary.passedCount, 7);
  assert.equal(evidence.summary.blockedCount, 1);
  assert.equal(evidence.summary.failedCount, 0);
  assert.equal(evidence.summary.boundedStopCount, 1);
  assert.equal(evidence.summary.contradictionCount, 0);
  assert.equal(
    evidence.scenarios.find((scenario) => scenario.scenarioKey === 'dispatch-ready-progression')?.returnedIds.agentId,
    'agent-1',
  );
  const commercialScenario = requireCommercialScenario(evidence);
  const commercialReadbacks = commercialScenario.readbacks as {
    platformManagedHandoff: {
      inboundAttempt: {
        error?: {
          code?: string;
        };
      };
    };
  };
  assert.equal(commercialReadbacks.platformManagedHandoff.inboundAttempt.error?.code, 'connector_inbound_not_supported');
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
      ['governed-runtime-projection-entry', ['identity-entry', 'governed-runtime-projection'], 'direct-executable'],
      ['dispatch-authority-reviewed-closure', ['account-plane-readiness-and-repair', 'operator-review-boundary'], 'direct-executable'],
      ['role-collaboration-handoff', ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'], 'partial-executable'],
      ['continuous-task-governed-work-closure', ['bounded-task-plane-progression'], 'direct-executable'],
      ['commercial-and-integration-readback', ['integration-center-lifecycle-and-retired-seam-validation'], 'bounded-stop-proof'],
    ],
  );
});

test('runClientBoundedMatrix blocks missing required commercial readback fields', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      integrationReport: {
        steps: [
          {
            stepKey: 'account-agent-integration-eligibility',
            status: 'passed',
            route: '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
            requestBody: null,
            responseBody: {},
          },
        ],
      },
      platformManagedReport: {
        inboundAttempt: {
          status: 'not-attempted',
        },
      },
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'blocked');
  assert.equal(commercialScenario?.resultClass, 'blocked');
  assert.deepEqual(commercialScenario.blockedBy, ['missing-commercial-readback-field']);
  assert.match(
    commercialScenario.notes[0] ?? '',
    /account-agent-integration-eligibility.*responseBody\.availability_state/,
  );
});

test('runClientBoundedMatrix blocks incomplete inboundAttempt error objects in commercial readback evidence', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      platformManagedReport: {
        inboundAttempt: {
          status: 'failed',
          error: {},
        },
      },
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'blocked');
  assert.equal(commercialScenario?.resultClass, 'blocked');
  assert.deepEqual(commercialScenario.blockedBy, ['missing-commercial-readback-field']);
  assert.match(
    commercialScenario.notes[0] ?? '',
    /inboundAttempt\.error\.code/,
  );
});

test('runClientBoundedMatrix passes aligned commercial and integration evidence', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies(),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'passed');
  assert.equal(commercialScenario?.resultClass, 'pass');
  assert.deepEqual(commercialScenario.returnedIds, {
    integrationAppId: 'iapp-1',
    integrationInstallationId: 'iinst-1',
    platformManagedAgentId: 'pm-agent-1',
    installationId: 'iinst-1',
    connectionId: 'iiconn-1',
  });

  const commercialReadbacks = commercialScenario.readbacks as {
    integrationLifecycle: {
      steps: Array<{ responseBody?: { availability_state?: string } }>;
    };
    platformManagedHandoff: {
      platformManagedEligibility: {
        eligibility: {
          invocation_route?: string | null;
        };
      };
    };
  };
  assert.equal(
    commercialReadbacks.integrationLifecycle.steps[0]?.responseBody?.availability_state,
    'configured_actor_eligible',
  );
  assert.equal(
    commercialReadbacks.platformManagedHandoff.platformManagedEligibility.eligibility.invocation_route,
    '/runtime/platform-managed/inbound',
  );
});

test('runClientBoundedMatrix preserves the maintained connector boundary as a bounded stop', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      platformManagedReport: {
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
      },
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'blocked');
  assert.equal(commercialScenario?.resultClass, 'bounded-stop');

  const commercialReadbacks = commercialScenario.readbacks as {
    platformManagedHandoff: {
      inboundAttempt: {
        error?: {
          code?: string;
        };
      };
    };
  };
  assert.deepEqual(commercialScenario.blockedBy, ['connector_inbound_not_supported']);
  assert.equal(commercialReadbacks.platformManagedHandoff.inboundAttempt.error?.code, 'connector_inbound_not_supported');
});

test('runClientBoundedMatrix preserves integration availability bounded stops without inventing connector reasons', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      integrationReport: {
        steps: [
          {
            stepKey: 'account-agent-integration-eligibility',
            status: 'passed',
            route: '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
            requestBody: null,
            responseBody: { availability_state: 'configured_actor_ineligible' },
          },
        ],
      },
      platformManagedReport: {
        platformManagedEligibility: {
          eligibility: {
            readiness_state: 'configured_invokable',
            invocation_route: '/runtime/platform-managed/inbound',
          },
        },
        inboundAttempt: {
          status: 'not-attempted',
        },
      },
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'blocked');
  assert.equal(commercialScenario?.resultClass, 'bounded-stop');
  assert.deepEqual(commercialScenario.blockedBy, ['configured_actor_ineligible']);
  assert.equal(
    commercialScenario.notes[0],
    'Integration eligibility reported configured_actor_ineligible, so the commercial readback remains at the maintained bounded stop.',
  );
});

test('runClientBoundedMatrix marks explicit invokable/null-route mismatches without known bounded-stop codes as contradiction evidence', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      platformManagedReport: {
        platformManagedEligibility: {
          eligibility: {
            readiness_state: 'configured_invokable',
            invocation_route: null,
          },
        },
        inboundAttempt: {
          status: 'not-attempted',
        },
      },
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'failed');
  assert.equal(commercialScenario?.resultClass, 'contradiction');
  assert.equal(
    commercialScenario.notes[0],
    'Platform-managed eligibility reported configured_invokable while the invocation route was null without the known bounded dispatcher stop.',
  );

  const commercialReadbacks = commercialScenario.readbacks as {
    platformManagedHandoff: {
      platformManagedEligibility: {
        eligibility: {
          invocation_route?: string | null;
        };
      };
    };
  };
  assert.equal(commercialReadbacks.platformManagedHandoff.platformManagedEligibility.eligibility.invocation_route, null);
  assert.equal(evidence.summary.contradictionCount, 1);
});

test('runClientBoundedMatrix captures thrown upstream probe failures as contradiction evidence instead of aborting', async () => {
  const evidence = await runClientBoundedMatrix(
    commercialMatrixOptions,
    buildCommercialMatrixDependencies({
      platformManagedProbeError: new Error('platform-managed handoff probe crashed unexpectedly'),
    }),
  );

  const commercialScenario = requireCommercialScenario(evidence);
  assert.equal(commercialScenario?.status, 'failed');
  assert.equal(commercialScenario?.resultClass, 'contradiction');
  assert.equal(
    commercialScenario.notes[0],
    'Integration lifecycle or platform-managed handoff probe failed before connector-boundary evidence could be classified: platform-managed handoff probe crashed unexpectedly',
  );

  const probeFailureReadback = commercialScenario.readbacks as {
    error: {
      code: string;
      message: string;
    };
  };
  assert.equal(probeFailureReadback.error.code, 'probe_execution_failed');
  assert.equal(probeFailureReadback.error.message, 'platform-managed handoff probe crashed unexpectedly');
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
