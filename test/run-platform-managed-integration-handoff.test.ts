import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunPlatformManagedIntegrationHandoffArgs,
  runPlatformManagedIntegrationHandoff,
} from '../scripts/live-probes/run-platform-managed-integration-handoff.ts';

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

test('parseRunPlatformManagedIntegrationHandoffArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunPlatformManagedIntegrationHandoffArgs([]), /--base-url is required/);
  assert.throws(() => parseRunPlatformManagedIntegrationHandoffArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunPlatformManagedIntegrationHandoffArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunPlatformManagedIntegrationHandoffArgs([
      '--base-url', ' http://127.0.0.1:8787 ',
      '--state-path', ' /tmp/state.json ',
      '--output', ' /tmp/report.json ',
      '--integration-code', ' haisi-wms ',
      '--connector-endpoint-base-url', ' http://connector.internal:8791 ',
      '--email', ' user@example.com ',
      '--password', ' secret-live-1 ',
      '--company-name', ' Example Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/state.json',
      outputPath: '/tmp/report.json',
      integrationCode: 'haisi-wms',
      connectorEndpointBaseUrl: 'http://connector.internal:8791',
      email: 'user@example.com',
      password: 'secret-live-1',
      companyName: 'Example Co',
    },
  );
});

test('runPlatformManagedIntegrationHandoff classifies same-org handoff through platform-managed reread and inbound', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { items: [{ integration_app_id: 'iapp-1', integration_code: 'haisi-wms' }] } },
    { status: 200, body: { integration_installation: { integration_installation_id: 'iinst-1' } } },
    { status: 200, body: { integration_installation: { installation_status: 'CONFIGURED' }, connection: { integration_installation_connection_id: 'iiconn-1' } } },
    { status: 200, body: { eligibility: { actor_family: 'ordinary_external_agent', eligible: false, readiness_state: 'configured_not_invokable', reason_codes: ['connector_inbound_not_supported'], invocation_route: null, next_step_kind: 'connector_support', installation_id: 'iinst-1', connection_id: 'iiconn-1' } } },
    { status: 200, body: { registration: { agent_id: 'pm-agent-1', registration_mode: 'platform_managed' } } },
    { status: 200, body: { eligibility: { actor_family: 'platform_internal_operating_agent', eligible: false, readiness_state: 'configured_not_invokable', reason_codes: ['connector_inbound_not_supported'], invocation_ownership: 'not_owned_by_current_actor', invocation_route: null, installation_id: 'iinst-1', connection_id: 'iiconn-1' } } },
    { status: 404, body: { error: { code: 'connector_inbound_not_supported' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runPlatformManagedIntegrationHandoff({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/platform-state.json',
    outputPath: '/tmp/platform-report.json',
    integrationCode: 'haisi-wms',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-16T09:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/platform-state.json',
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
        email: 'user@example.com',
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
      return { outputPath: '/tmp/platform-report.json' };
    },
  } as never);

  assert.equal(calls.length, 7);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/public/integration-apps?tenant_id=tenant-public');
  const connectionRequestBody = calls[2]?.init?.body;
  if (typeof connectionRequestBody !== 'string') {
    throw new Error('expected integration connection request body');
  }
  const parsedConnectionRequestBody = JSON.parse(connectionRequestBody) as { endpoint_base_url?: string };
  assert.equal(parsedConnectionRequestBody.endpoint_base_url, 'http://haisi-wms-fixture-connector:8791');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/agents/platform-managed-registrations?tenant_id=tenant-public');
  const platformRegistrationRequestBody = calls[4]?.init?.body;
  if (typeof platformRegistrationRequestBody !== 'string') {
    throw new Error('expected platform-managed registration request body');
  }
  const parsedPlatformRegistrationRequestBody = JSON.parse(platformRegistrationRequestBody) as {
    agent_id?: string;
    principal_id?: string;
  };
  assert.notEqual(parsedPlatformRegistrationRequestBody.agent_id, 'agent-1');
  assert.notEqual(parsedPlatformRegistrationRequestBody.principal_id, 'claimed:agent-1');
  assert.equal(
    parsedPlatformRegistrationRequestBody.principal_id,
    `platform-managed:${parsedPlatformRegistrationRequestBody.agent_id}`,
  );
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/account/agents/pm-agent-1/integrations/haisi-wms/eligibility');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/account/agents/pm-agent-1/integrations/haisi-wms/inbound');
  assert.equal((result as any).platformManagedAgentId, 'pm-agent-1');
  assert.equal((result as any).ordinaryExternalEligibility.eligibility.readiness_state, 'configured_not_invokable');
  assert.equal((result as any).platformManagedEligibility.eligibility.readiness_state, 'configured_not_invokable');
  assert.equal((result as any).platformManagedEligibility.eligibility.invocation_route, null);
  assert.equal((result as any).inboundAttempt.error.code, 'connector_inbound_not_supported');
  assert.deepEqual(writtenReport, result);
});

test('runPlatformManagedIntegrationHandoff prepares an approved public app when the fresh runtime directory is empty', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { items: [] } },
    { status: 200, body: { integration_app: { integration_app_id: 'iapp-haisi-1', integration_code: 'haisi-wms', review_status: 'SUBMITTED', activation_status: 'INACTIVE' } } },
    { status: 200, body: { integration_app: { integration_app_id: 'iapp-haisi-1', integration_code: 'haisi-wms', review_status: 'APPROVED', activation_status: 'ACTIVE' } } },
    { status: 200, body: { integration_installation: { integration_installation_id: 'iinst-1' } } },
    { status: 200, body: { connection: { integration_installation_connection_id: 'iiconn-1' } } },
    { status: 200, body: { eligibility: { readiness_state: 'configured_not_invokable' } } },
    { status: 200, body: { registration: { agent_id: 'pm-agent-1', registration_mode: 'platform_managed' } } },
    { status: 200, body: { eligibility: { readiness_state: 'configured_invokable', invocation_admitted: true } } },
    { status: 200, body: { receipt: { provider_receipt_id: 'receipt-1', provider_proof_state: 'verified_provider_proof' } } },
  ]);

  const result = await runPlatformManagedIntegrationHandoff({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/platform-state.json',
    outputPath: '/tmp/platform-report.json',
    integrationCode: 'haisi-wms',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-07-10T05:10:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/platform-state.json',
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
        email: 'user@example.com',
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
  } as never);

  assert.equal(calls.length, 9);
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/integration-apps');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/integration-apps/iapp-haisi-1/review-decisions?tenant_id=tenant-public');
  assert.equal(new Headers(calls[2]?.init?.headers).get('x-bidvia-admin-session-id'), 'admin-session-1');
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    decision: 'APPROVE',
    now: '2026-07-10T05:10:00Z',
  });
  assert.equal((result.selectedApp as { review_status?: string }).review_status, 'APPROVED');
  assert.equal(result.installationId, 'iinst-1');
  assert.equal(result.connectionId, 'iiconn-1');
});
