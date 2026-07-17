import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
} from '../scripts/live-probes/bootstrap-claimant-local-docker.ts';

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

test('parseBootstrapClaimantLocalDockerArgs requires base-url and state-path', () => {
  assert.throws(
    () => parseBootstrapClaimantLocalDockerArgs([]),
    /--base-url is required/,
  );

  assert.throws(
    () => parseBootstrapClaimantLocalDockerArgs(['--base-url', 'http://127.0.0.1:8787']),
    /--state-path is required/,
  );

  assert.throws(
    () => parseBootstrapClaimantLocalDockerArgs(['--base-url', 'https://api.bidvia.cn', '--state-path', '/tmp/bidvia-state.json']),
    /--base-url must target a loopback local-docker runtime/,
  );

  assert.deepEqual(
    parseBootstrapClaimantLocalDockerArgs([
      '--base-url',
      ' http://127.0.0.1:8787 ',
      '--state-path',
      ' /tmp/bidvia-state.json ',
      '--email',
      ' user@example.com ',
      '--password',
      ' secret-1 ',
      '--company-name',
      ' Example Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/bidvia-state.json',
      email: 'user@example.com',
      password: 'secret-1',
      companyName: 'Example Co',
    },
  );
});

test('runBootstrapClaimantLocalDocker surfaces admin sign-in errors with explicit step context instead of TypeError', async () => {
  const { fetchStub } = createFetchStub([
    {
      status: 401,
      body: {
        error: {
          code: 'admin_session_denied',
          message: 'seeded admin session is unavailable',
        },
      },
    },
  ]);

  await assert.rejects(
    () => runBootstrapClaimantLocalDocker(
      {
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bidvia-live-state.json',
      },
      {
        fetchImpl: fetchStub,
        now: () => '2026-05-14T10:00:00Z',
        randomSuffix: () => 'seeded-suffix',
      },
    ),
    /bootstrap admin sign-in failed: admin_session_denied: seeded admin session is unavailable/,
  );
});

test('runBootstrapClaimantLocalDocker performs the local-docker claimant bootstrap sequence and persists local onboarding state', async () => {
  const { calls, fetchStub } = createFetchStub([
    {
      status: 200,
      body: {
        admin_session: {
          admin_session_id: 'admin-session-1',
          admin_account_id: 'admin-seeded-super-admin',
        },
        admin_account: {
          email: 'ops-admin@example.com',
          role: 'super_admin',
          status: 'active',
        },
      },
    },
    {
      status: 200,
      body: {
        invitation: {
          invitation_id: 'invite-1',
          invitation_token: 'invite-token-1',
          invitation_type: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          email: 'live@example.com',
          company_name: 'Live Co',
          tenant_id: 'tenant-public',
        },
      },
    },
    {
      status: 200,
      body: {
        session: {
          session_id: 'sess-1',
          account_id: 'acct-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          tenant_id: 'tenant-public',
        },
        session: {
          session_id: 'sess-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
        memberships: [{ role: 'enterprise_admin', status: 'active' }],
        agent_onboarding_allowed: true,
      },
    },
    {
      status: 200,
      body: {
        provisional_agent_ref: 'prov-1',
        claim_token: 'claim-token-1',
      },
    },
    {
      status: 200,
      body: {
        provisional_agent: {
          provisional_agent_ref: 'prov-1',
          claim_token: 'claim-token-1',
        },
      },
    },
    {
      status: 200,
      body: {
        registration: {
          agent_registration_id: 'areg-1',
          agent_id: 'prov-1',
          principal_id: 'claimed:prov-1',
          status: 'registered',
        },
      },
    },
    {
      status: 200,
      body: {
        request: {
          dispatch_authority_activation_request_id: 'daar-1',
          status: 'OPEN',
        },
      },
    },
    {
      status: 200,
      body: {
        request: {
          dispatch_authority_activation_request_id: 'daar-1',
          status: 'APPROVED',
          resolution_reason: 'bootstrap-claimant-local-docker',
        },
        authority_profile: {
          authority_profile_id: 'authp-1',
          status: 'active',
        },
      },
    },
    {
      status: 200,
      body: {
        surface_status: 'account_scoped_binding_completed',
        external_account_binding: {
          external_account_binding_id: 'eab-1',
          status: 'active',
        },
      },
    },
  ]);

  let persistedState: Record<string, unknown> | null = null;
  let persistedPath: string | null = null;

  const result = await runBootstrapClaimantLocalDocker(
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/bidvia-live-state.json',
      email: 'live@example.com',
      password: 'secret-live-1',
      companyName: 'Live Co',
    },
    {
      fetchImpl: fetchStub,
      now: () => '2026-05-14T10:00:00Z',
      writeState: async (state, options) => {
        persistedState = state as Record<string, unknown>;
        persistedPath = options?.path ?? null;
        return {
          path: options?.path ?? '/tmp/bidvia-live-state.json',
          state: state as never,
        };
      },
      randomSuffix: () => 'seeded-suffix',
    },
  );

  assert.equal(calls.length, 11);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/admin/sessions/sign-in');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/admin/invitations/issue');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/accounts/enterprise/sign-up');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/sessions/sign-in');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/me');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-1');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional/claim');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/account/agents/prov-1/dispatch-authority-requests');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/operator/dispatch-authority-requests/daar-1/decision?tenant_id=tenant-public');
  assert.equal(String(calls[10]?.input), 'http://127.0.0.1:8787/runtime/account/agents/prov-1/external-account-bindings?tenant_id=tenant-public');
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    invitation_type: 'ENTERPRISE_ACCOUNT',
    target_tenant_id: 'tenant-a',
    target_org_id: null,
    target_role: null,
    expires_at: '2026-05-15T10:00:00.000Z',
    now: '2026-05-14T10:00:00Z',
  });
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-session-1');
  assert.equal((calls[4]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[7]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[8]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[9]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-session-1');
  assert.equal((calls[10]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');

  assert.equal(result.statePath, '/tmp/bidvia-live-state.json');
  assert.equal(result.admin.adminSessionId, 'admin-session-1');
  assert.equal(result.claimant.sessionId, 'sess-1');
  assert.equal(result.claimant.tenantId, 'tenant-public');
  assert.equal(result.claimant.companyId, 'org-1');
  assert.equal(result.claimant.membershipRole, 'enterprise_admin');
  assert.equal(result.claimant.agentOnboardingAllowed, true);
  assert.equal(result.claimant.agentId, 'prov-1');
  assert.equal(result.claimant.principalId, 'claimed:prov-1');
  assert.equal(result.claimant.registrationId, 'areg-1');
  assert.equal(result.dispatchAuthority.requestId, 'daar-1');
  assert.equal(result.dispatchAuthority.status, 'APPROVED');
  assert.equal(result.externalBinding.bindingId, 'eab-1');
  assert.equal(result.externalBinding.status, 'active');

  assert.equal(persistedPath, '/tmp/bidvia-live-state.json');
  assert.deepEqual(persistedState, {
    tenantId: 'tenant-public',
    agentId: 'prov-1',
    principalId: 'claimed:prov-1',
    companyId: 'org-1',
    registrationId: 'areg-1',
    sessionId: 'sess-1',
    lastCompletedStep: 'account-agent-external-binding',
    createdAt: '2026-05-14T10:00:00Z',
    updatedAt: '2026-05-14T10:00:00Z',
  });
});

test('runBootstrapClaimantLocalDocker can stop before dispatch-authority request for claim-only validation lanes', async () => {
  const { calls, fetchStub } = createFetchStub([
    {
      status: 200,
      body: {
        admin_session: {
          admin_session_id: 'admin-session-1',
          admin_account_id: 'admin-seeded-super-admin',
        },
        admin_account: {
          email: 'ops-admin@example.com',
          role: 'super_admin',
          status: 'active',
        },
      },
    },
    {
      status: 200,
      body: {
        invitation: {
          invitation_id: 'invite-1',
          invitation_token: 'invite-token-1',
          invitation_type: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          email: 'live@example.com',
          company_name: 'Live Co',
          tenant_id: 'tenant-public',
        },
      },
    },
    {
      status: 200,
      body: {
        session: {
          session_id: 'sess-1',
          account_id: 'acct-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          tenant_id: 'tenant-public',
        },
        session: {
          session_id: 'sess-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
        memberships: [{ role: 'enterprise_admin', status: 'active' }],
        agent_onboarding_allowed: true,
      },
    },
    {
      status: 200,
      body: {
        provisional_agent_ref: 'prov-1',
        claim_token: 'claim-token-1',
      },
    },
    {
      status: 200,
      body: {
        provisional_agent: {
          provisional_agent_ref: 'prov-1',
          claim_token: 'claim-token-1',
        },
      },
    },
    {
      status: 200,
      body: {
        registration: {
          agent_registration_id: 'areg-1',
          agent_id: 'prov-1',
          principal_id: 'claimed:prov-1',
          status: 'registered',
        },
      },
    },
  ]);

  const result = await runBootstrapClaimantLocalDocker(
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/bidvia-live-state.json',
      stopBeforeDispatchAuthorityRequest: true,
    },
    {
      fetchImpl: fetchStub,
      now: () => '2026-05-14T10:00:00Z',
      writeState: async (state, options) => ({
        path: options?.path ?? '/tmp/bidvia-live-state.json',
        state: state as never,
      }),
      randomSuffix: () => 'seeded-suffix',
    },
  );

  assert.equal(calls.length, 8);
  assert.equal(result.dispatchAuthority.requestId, null);
  assert.equal(result.dispatchAuthority.status, 'NOT_REQUESTED');
  assert.equal(result.externalBinding.bindingId, null);
  assert.equal(result.externalBinding.status, 'missing');
});

test('runBootstrapClaimantLocalDocker generates unique bootstrap identifiers across repeated runs even when Date.now is stable', async () => {
  const firstRun = createFetchStub([
    { status: 200, body: { admin_session: { admin_session_id: 'admin-session-1', admin_account_id: 'admin-seeded-super-admin' }, admin_account: { email: 'ops-admin@example.com', role: 'super_admin', status: 'active' } } },
    { status: 200, body: { invitation: { invitation_id: 'invite-1', invitation_token: 'invite-token-1', invitation_type: 'ENTERPRISE_ACCOUNT', status: 'ACTIVE' } } },
    { status: 200, body: { account: { account_id: 'acct-1', account_type: 'enterprise', email: 'first@example.com', company_name: 'Live Co', tenant_id: 'tenant-public' } } },
    { status: 200, body: { session: { session_id: 'sess-1', account_id: 'acct-1', tenant_id: 'tenant-public', active_org_context: { org_id: 'org-1', org_name: 'Live Co', tenant_id: 'tenant-public' } } } },
    { status: 200, body: { account: { account_id: 'acct-1', account_type: 'enterprise', tenant_id: 'tenant-public' }, session: { session_id: 'sess-1', tenant_id: 'tenant-public', active_org_context: { org_id: 'org-1', org_name: 'Live Co', tenant_id: 'tenant-public' } }, memberships: [{ role: 'enterprise_admin', status: 'active' }], agent_onboarding_allowed: true } },
    { status: 200, body: { provisional_agent_ref: 'prov-1', claim_token: 'claim-token-1' } },
    { status: 200, body: { provisional_agent: { provisional_agent_ref: 'prov-1', claim_token: 'claim-token-1' } } },
    { status: 200, body: { registration: { agent_registration_id: 'areg-1', agent_id: 'prov-1', principal_id: 'claimed:prov-1', status: 'registered' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-1', status: 'OPEN' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-1', status: 'APPROVED', resolution_reason: 'bootstrap-claimant-local-docker' }, authority_profile: { authority_profile_id: 'authp-1', status: 'active' } } },
    { status: 200, body: { surface_status: 'account_scoped_binding_completed', external_account_binding: { external_account_binding_id: 'eab-1', status: 'active' } } },
  ]);
  const secondRun = createFetchStub([
    { status: 200, body: { admin_session: { admin_session_id: 'admin-session-2', admin_account_id: 'admin-seeded-super-admin' }, admin_account: { email: 'ops-admin@example.com', role: 'super_admin', status: 'active' } } },
    { status: 200, body: { invitation: { invitation_id: 'invite-2', invitation_token: 'invite-token-2', invitation_type: 'ENTERPRISE_ACCOUNT', status: 'ACTIVE' } } },
    { status: 200, body: { account: { account_id: 'acct-2', account_type: 'enterprise', email: 'second@example.com', company_name: 'Live Co', tenant_id: 'tenant-public' } } },
    { status: 200, body: { session: { session_id: 'sess-2', account_id: 'acct-2', tenant_id: 'tenant-public', active_org_context: { org_id: 'org-2', org_name: 'Live Co', tenant_id: 'tenant-public' } } } },
    { status: 200, body: { account: { account_id: 'acct-2', account_type: 'enterprise', tenant_id: 'tenant-public' }, session: { session_id: 'sess-2', tenant_id: 'tenant-public', active_org_context: { org_id: 'org-2', org_name: 'Live Co', tenant_id: 'tenant-public' } }, memberships: [{ role: 'enterprise_admin', status: 'active' }], agent_onboarding_allowed: true } },
    { status: 200, body: { provisional_agent_ref: 'prov-2', claim_token: 'claim-token-2' } },
    { status: 200, body: { provisional_agent: { provisional_agent_ref: 'prov-2', claim_token: 'claim-token-2' } } },
    { status: 200, body: { registration: { agent_registration_id: 'areg-2', agent_id: 'prov-2', principal_id: 'claimed:prov-2', status: 'registered' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-2', status: 'OPEN' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-2', status: 'APPROVED', resolution_reason: 'bootstrap-claimant-local-docker' }, authority_profile: { authority_profile_id: 'authp-2', status: 'active' } } },
    { status: 200, body: { surface_status: 'account_scoped_binding_completed', external_account_binding: { external_account_binding_id: 'eab-2', status: 'active' } } },
  ]);

  const originalDateNow = Date.now;
  Date.now = () => 1778913551556;

  try {
    await runBootstrapClaimantLocalDocker(
      {
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bidvia-live-state-1.json',
      },
      {
        fetchImpl: firstRun.fetchStub,
        now: () => '2026-05-16T06:39:11.555Z',
        writeState: async (state, options) => ({
          path: options?.path ?? '/tmp/bidvia-live-state-1.json',
          state: state as never,
        }),
      },
    );

    await runBootstrapClaimantLocalDocker(
      {
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bidvia-live-state-2.json',
      },
      {
        fetchImpl: secondRun.fetchStub,
        now: () => '2026-05-16T06:39:11.555Z',
        writeState: async (state, options) => ({
          path: options?.path ?? '/tmp/bidvia-live-state-2.json',
          state: state as never,
        }),
      },
    );
  } finally {
    Date.now = originalDateNow;
  }

  const firstSignUpBody = JSON.parse(String(firstRun.calls[2]?.init?.body)) as { email: string };
  const secondSignUpBody = JSON.parse(String(secondRun.calls[2]?.init?.body)) as { email: string };
  const firstProvisionalBody = JSON.parse(String(firstRun.calls[5]?.init?.body)) as { provisional_agent_ref: string };
  const secondProvisionalBody = JSON.parse(String(secondRun.calls[5]?.init?.body)) as { provisional_agent_ref: string };
  const firstBindingBody = JSON.parse(String(firstRun.calls[10]?.init?.body)) as { system_name: string; external_account_ref: string };
  const secondBindingBody = JSON.parse(String(secondRun.calls[10]?.init?.body)) as { system_name: string; external_account_ref: string };

  assert.notEqual(firstSignUpBody.email, secondSignUpBody.email);
  assert.notEqual(firstProvisionalBody.provisional_agent_ref, secondProvisionalBody.provisional_agent_ref);
  assert.notEqual(firstBindingBody.system_name, secondBindingBody.system_name);
  assert.notEqual(firstBindingBody.external_account_ref, secondBindingBody.external_account_ref);
});

test('runBootstrapClaimantLocalDocker surfaces bounded bootstrap route failures with explicit step context instead of TypeError', async () => {
  const { fetchStub } = createFetchStub([
    {
      status: 200,
      body: {
        admin_session: {
          admin_session_id: 'admin-session-1',
          admin_account_id: 'admin-seeded-super-admin',
        },
        admin_account: {
          email: 'ops-admin@example.com',
          role: 'super_admin',
          status: 'active',
        },
      },
    },
    {
      status: 200,
      body: {
        invitation: {
          invitation_id: 'invite-1',
          invitation_token: 'invite-token-1',
          invitation_type: 'ENTERPRISE_ACCOUNT',
          status: 'ACTIVE',
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          email: 'live@example.com',
          company_name: 'Live Co',
          tenant_id: 'tenant-public',
        },
      },
    },
    {
      status: 200,
      body: {
        session: {
          session_id: 'sess-1',
          account_id: 'acct-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
      },
    },
    {
      status: 200,
      body: {
        account: {
          account_id: 'acct-1',
          account_type: 'enterprise',
          tenant_id: 'tenant-public',
        },
        session: {
          session_id: 'sess-1',
          tenant_id: 'tenant-public',
          active_org_context: {
            org_id: 'org-1',
            org_name: 'Live Co',
            tenant_id: 'tenant-public',
          },
        },
        memberships: [{ role: 'enterprise_admin', status: 'active' }],
        agent_onboarding_allowed: true,
      },
    },
    {
      status: 200,
      body: {
        provisional_agent_ref: 'prov-1',
        claim_token: 'claim-token-1',
      },
    },
    {
      status: 200,
      body: {
        provisional_agent: {
          provisional_agent_ref: 'prov-1',
          claim_token: 'claim-token-1',
        },
      },
    },
    {
      status: 200,
      body: {
        registration: {
          agent_registration_id: 'areg-1',
          agent_id: 'prov-1',
          principal_id: 'claimed:prov-1',
          status: 'registered',
        },
      },
    },
    {
      status: 200,
      body: {
        request: {
          dispatch_authority_activation_request_id: 'daar-1',
          status: 'OPEN',
        },
      },
    },
    {
      status: 500,
      body: {
        error: {
          code: 'internal_error',
          message: 'internal server error',
        },
      },
    },
  ]);

  await assert.rejects(
    () => runBootstrapClaimantLocalDocker(
      {
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/bidvia-live-state.json',
        email: 'live@example.com',
        password: 'secret-live-1',
        companyName: 'Live Co',
      },
      {
        fetchImpl: fetchStub,
        now: () => '2026-05-14T10:00:00Z',
        randomSuffix: () => 'seeded-suffix',
      },
    ),
    /bootstrap dispatch-authority decision failed: internal_error: internal server error/,
  );
});
