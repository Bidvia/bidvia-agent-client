import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import { buildIdentitySessionPlaneView } from '../src/index.ts';

function createFetchStub() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient exposes the bounded V1 personal, enterprise, and sign-in onboarding helpers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    fetchImpl: fetchStub,
  });

  const signUpPersonalAccount = Reflect.get(client, 'signUpPersonalAccount');
  const signUpEnterpriseAccount = Reflect.get(client, 'signUpEnterpriseAccount');
  const signIn = Reflect.get(client, 'signIn');

  assert.equal(typeof signUpPersonalAccount, 'function');
  assert.equal(typeof signUpEnterpriseAccount, 'function');
  assert.equal(typeof signIn, 'function');

  await Reflect.apply(signUpPersonalAccount, client, [{
    email: 'person@example.com',
    password: 'secret-1',
    invitationToken: 'invite-token-123',
    displayName: 'Ada Lovelace',
    now: '2026-04-10T10:00:00Z',
  }]);
  await Reflect.apply(signUpEnterpriseAccount, client, [{
    email: 'ops@example.com',
    password: 'secret-2',
    invitationToken: 'invite-token-456',
    companyName: 'Bidvia Labs',
    now: '2026-04-10T10:01:00Z',
  }]);
  await Reflect.apply(signIn, client, [{
    email: 'person@example.com',
    password: 'secret-1',
    now: '2026-04-10T10:02:00Z',
  }]);

  assert.equal(calls.length, 3);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/accounts/personal/sign-up');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/accounts/enterprise/sign-up');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/sessions/sign-in');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal(calls[2]?.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    email: 'person@example.com',
    password: 'secret-1',
    invitation_token: 'invite-token-123',
    display_name: 'Ada Lovelace',
    now: '2026-04-10T10:00:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    email: 'ops@example.com',
    password: 'secret-2',
    invitation_token: 'invite-token-456',
    company_name: 'Bidvia Labs',
    now: '2026-04-10T10:01:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    email: 'person@example.com',
    password: 'secret-1',
    now: '2026-04-10T10:02:00Z',
  });
});

test('BidviaClient uses the bounded V1 session helper family with session headers only where the packet requires them', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const refreshSession = Reflect.get(client, 'refreshSession');
  const revokeSession = Reflect.get(client, 'revokeSession');
  const getAccountMe = Reflect.get(client, 'getAccountMe');
  const selectOrg = Reflect.get(client, 'selectOrg');

  assert.equal(typeof refreshSession, 'function');
  assert.equal(typeof revokeSession, 'function');
  assert.equal(typeof getAccountMe, 'function');
  assert.equal(typeof selectOrg, 'function');

  await Reflect.apply(refreshSession, client, []);
  await Reflect.apply(revokeSession, client, []);
  await Reflect.apply(getAccountMe, client, []);
  await Reflect.apply(selectOrg, client, [{ orgId: 'org-2' }]);

  assert.equal(calls.length, 4);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/sessions/refresh');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/sessions/revoke');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/me');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/select-org');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal(calls[2]?.init?.method, 'GET');
  assert.equal(calls[3]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[3]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], undefined);
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    org_id: 'org-2',
  });
});

test('BidviaClient exposes a bounded claimed-agent self-service patch surface for task dispatch acceptance and participation state', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-public',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const patchAgentSelfService = Reflect.get(client, 'patchAgentSelfService');
  assert.equal(typeof patchAgentSelfService, 'function');

  await Reflect.apply(patchAgentSelfService, client, ['agent-1', {
    now: '2026-04-11T17:20:00Z',
    selfDescription: 'Keeps a bounded customer-facing profile.',
    capabilityProfile: {
      domainStrengths: ['pricing'],
    },
    taskDispatchAcceptance: {
      acceptsTaskDispatches: true,
      acceptedTaskDispatchScopes: ['COMMERCIAL_ACTION_REVIEW'],
    },
    participationState: {
      state: 'AVAILABLE',
      reason: 'ready-for-task-dispatch',
    },
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/self-service');
  assert.equal(calls[0]?.init?.method, 'PATCH');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    now: '2026-04-11T17:20:00Z',
    self_description: 'Keeps a bounded customer-facing profile.',
    capability_profile: {
      domainStrengths: ['pricing'],
    },
    task_dispatch_acceptance: {
      accepts_task_dispatches: true,
      accepted_task_dispatch_scopes: ['COMMERCIAL_ACTION_REVIEW'],
    },
    participation_state: {
      state: 'AVAILABLE',
      reason: 'ready-for-task-dispatch',
    },
  });
});

test('BidviaClient keeps the provisional create->query->claim onboarding chain intact alongside V1 account/session helpers', () => {
  const identitySessionPlane = buildIdentitySessionPlaneView();

  assert.deepEqual(
    identitySessionPlane.canonicalOnboarding.helperSteps.map((step) => step.helperKey),
    ['createProvisionalAgent', 'queryProvisionalAgent', 'claimProvisionalAgent'],
  );
  assert.equal(identitySessionPlane.canonicalOnboarding.label, 'Public provisional onboarding');
});
