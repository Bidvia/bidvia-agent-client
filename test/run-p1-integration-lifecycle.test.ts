import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunP1IntegrationLifecycleArgs,
  runP1IntegrationLifecycle,
} from '../scripts/live-probes/run-p1-integration-lifecycle.ts';

function createFetchStub(responseBodies: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const response = responseBodies[calls.length - 1] ?? { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('parseRunP1IntegrationLifecycleArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunP1IntegrationLifecycleArgs([]), /--base-url is required/);
  assert.throws(() => parseRunP1IntegrationLifecycleArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunP1IntegrationLifecycleArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunP1IntegrationLifecycleArgs([
      '--base-url', ' http://127.0.0.1:8787 ',
      '--state-path', ' /tmp/state.json ',
      '--output', ' /tmp/report.json ',
      '--email', ' user@example.com ',
      '--password', ' secret-live-1 ',
      '--company-name', ' Example Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/state.json',
      outputPath: '/tmp/report.json',
      email: 'user@example.com',
      password: 'secret-live-1',
      companyName: 'Example Co',
    },
  );
});

test('runP1IntegrationLifecycle uses the bootstrapped account-owned agent id for eligibility readback', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { items: [] } },
    { status: 200, body: { integration_app: { integration_app_id: 'iapp-1' } } },
    { status: 200, body: { items: [{ integration_app_id: 'iapp-1' }] } },
    { status: 409, body: { error: { code: 'integration_app_not_installable' } } },
    { status: 200, body: { items: [] } },
    { status: 200, body: { items: [] } },
    { status: 200, body: { availability_state: 'configured_actor_ineligible' } },
    { status: 404, body: { error: { code: 'integration_legacy_surface_removed' } } },
    { status: 404, body: { error: { code: 'integration_legacy_surface_removed' } } },
    { status: 404, body: { error: { code: 'integration_legacy_surface_removed' } } },
    { status: 404, body: { error: { code: 'wms_legacy_surface_removed' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runP1IntegrationLifecycle({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/p1-integration-state.json',
    outputPath: '/tmp/p1-integration-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-15T08:00:00Z',
    randomSuffix: () => 'seeded',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/p1-integration-state.json',
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
        email: 'packd-integration@example.com',
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
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/p1-integration-report.json' };
    },
  } as never);

  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/integrations/p1-integration-seeded/eligibility');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/onboarding-contract?tenant_id=tenant-public');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/login?tenant_id=tenant-public');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/inbound?tenant_id=tenant-public');
  assert.equal(String(calls[10]?.input), 'http://127.0.0.1:8787/runtime/wms/warehouses?tenant_id=tenant-public');
  assert.equal(result.ids.integrationAppId, 'iapp-1');
  assert.deepEqual((result as any).retiredSeams, {
    onboardingContract: {
      status: 'expected-fail-closed',
      code: 'integration_legacy_surface_removed',
      route: '/runtime/integrations/:integrationCode/onboarding-contract',
    },
    login: {
      status: 'expected-fail-closed',
      code: 'integration_legacy_surface_removed',
      route: '/runtime/integrations/:integrationCode/login',
    },
    inbound: {
      status: 'expected-fail-closed',
      code: 'integration_legacy_surface_removed',
      route: '/runtime/integrations/:integrationCode/inbound',
    },
    wmsWarehouses: {
      status: 'expected-fail-closed',
      code: 'wms_legacy_surface_removed',
      route: '/runtime/wms/warehouses',
    },
  });
  assert.deepEqual(writtenReport, result);
});

test('runP1IntegrationLifecycle returns a machine-readable bootstrap failure report with phase markers', async () => {
  let writtenReport: unknown = null;

  const result = await runP1IntegrationLifecycle({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/p1-integration-state.json',
    outputPath: '/tmp/p1-integration-report.json',
  }, {
    now: () => '2026-05-16T09:00:00Z',
    bootstrapClaimant: async () => {
      throw new Error('bootstrap dispatch-authority decision failed: internal_error: internal server error');
    },
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/p1-integration-report.json' };
    },
  } as never);

  assert.deepEqual(result, {
    command: 'run-p1-integration-lifecycle',
    generatedAt: '2026-05-16T09:00:00Z',
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/p1-integration-state.json',
    outputPath: '/tmp/p1-integration-report.json',
    status: 'failed',
    failure: {
      phaseKey: 'bootstrap',
      classification: 'contradiction',
      message: 'bootstrap dispatch-authority decision failed: internal_error: internal server error',
    },
    phases: [
      {
        phaseKey: 'bootstrap',
        status: 'failed',
        classification: 'contradiction',
        detail: 'bootstrap dispatch-authority decision failed: internal_error: internal server error',
      },
    ],
    ids: {
      integrationAppId: null,
      integrationInstallationId: null,
    },
    steps: [
      {
        stepKey: 'bootstrap-claimant',
        status: 'failed',
        route: 'bootstrap-claimant-local-docker',
        requestBody: null,
        responseBody: {
          error: {
            code: 'bootstrap_failed',
            message: 'bootstrap dispatch-authority decision failed: internal_error: internal server error',
          },
        },
      },
    ],
  });
  assert.deepEqual(writtenReport, result);
});
