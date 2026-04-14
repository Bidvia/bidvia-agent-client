import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

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

test('BidviaClient exposes a bounded session-scoped membership invitation helper', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const createAccountMembershipInvitation = Reflect.get(client, 'createAccountMembershipInvitation');

  assert.equal(typeof createAccountMembershipInvitation, 'function');

  await Reflect.apply(createAccountMembershipInvitation, client, [{
    orgId: 'org-2',
    inviteeEmail: 'member@example.com',
    now: '2026-04-14T09:00:00Z',
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/memberships/invitations');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    org_id: 'org-2',
    invitee_email: 'member@example.com',
    now: '2026-04-14T09:00:00Z',
  });
});

test('BidviaClient exposes a bounded session-scoped membership invitation acceptance helper', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const acceptAccountMembershipInvitation = Reflect.get(client, 'acceptAccountMembershipInvitation');

  assert.equal(typeof acceptAccountMembershipInvitation, 'function');

  await Reflect.apply(acceptAccountMembershipInvitation, client, [{
    invitationToken: 'invite-token-123',
    now: '2026-04-14T09:01:00Z',
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/memberships/accept-invitation');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    invitation_token: 'invite-token-123',
    now: '2026-04-14T09:01:00Z',
  });
});

test('BidviaClient exposes a bounded session-scoped membership admin transfer helper', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const transferAccountMembershipAdmin = Reflect.get(client, 'transferAccountMembershipAdmin');

  assert.equal(typeof transferAccountMembershipAdmin, 'function');

  await Reflect.apply(transferAccountMembershipAdmin, client, ['membership-binding-1', {
    targetAccountId: 'account-2',
    now: '2026-04-14T09:02:00Z',
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/memberships/membership-binding-1/transfer-admin');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    target_account_id: 'account-2',
    now: '2026-04-14T09:02:00Z',
  });
});

test('BidviaClient exposes a bounded session-scoped membership removal helper', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const removeAccountMembership = Reflect.get(client, 'removeAccountMembership');

  assert.equal(typeof removeAccountMembership, 'function');

  await Reflect.apply(removeAccountMembership, client, ['membership-binding-1', {
    reason: 'membership-no-longer-needed',
    now: '2026-04-14T09:03:00Z',
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/memberships/membership-binding-1/remove');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    reason: 'membership-no-longer-needed',
    now: '2026-04-14T09:03:00Z',
  });
});
