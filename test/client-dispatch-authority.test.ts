import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

function createFetchStub(responseBodies: unknown[]) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify(responseBodies[calls.length - 1] ?? { ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient exposes the canonical dispatch-authority read and request helper family as session-bound account-agent surface', async () => {
  const dispatchAuthorityResponse = {
    agent_registration_id: 'areg-1',
    dispatch_authority: {
      status: 'review_required',
      blocking_reason: {
        code: 'authority_class_not_dispatchable',
        permanent_ineligibility: false,
      },
    },
  };
  const dispatchAuthorityRequestResponse = {
    dispatch_authority_request_id: 'dar-1',
    review_boundary: {
      code: 'authority_class_not_dispatchable',
      boundary_family: 'dispatch-authority-review',
      distinct_from: 'active_role_binding_required',
    },
  };
  const { calls, fetchStub } = createFetchStub([
    dispatchAuthorityResponse,
    dispatchAuthorityRequestResponse,
  ]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const getAccountAgentDispatchAuthority = Reflect.get(client, 'getAccountAgentDispatchAuthority');
  const createAccountAgentDispatchAuthorityRequest = Reflect.get(client, 'createAccountAgentDispatchAuthorityRequest');

  assert.equal(typeof getAccountAgentDispatchAuthority, 'function');
  assert.equal(typeof createAccountAgentDispatchAuthorityRequest, 'function');

  const dispatchAuthority = await Reflect.apply(getAccountAgentDispatchAuthority, client, ['areg-1']);
  const dispatchAuthorityRequest = await Reflect.apply(createAccountAgentDispatchAuthorityRequest, client, [
    'areg-1',
    {
      now: '2026-04-14T10:00:00Z',
    },
  ]);

  assert.deepEqual(dispatchAuthority, dispatchAuthorityResponse);
  assert.deepEqual(dispatchAuthorityRequest, dispatchAuthorityRequestResponse);
  assert.equal(dispatchAuthority.dispatch_authority.blocking_reason.code, 'authority_class_not_dispatchable');
  assert.equal(dispatchAuthority.dispatch_authority.blocking_reason.permanent_ineligibility, false);
  assert.equal(dispatchAuthorityRequest.review_boundary.boundary_family, 'dispatch-authority-review');
  assert.notEqual(dispatchAuthorityRequest.review_boundary.distinct_from, 'dispatch-authority-review');
  assert.equal(dispatchAuthorityRequest.review_boundary.distinct_from, 'active_role_binding_required');
  assert.equal(calls.length, 2);
  assert.equal(
    String(calls[0]?.input),
    'http://127.0.0.1:8787/runtime/account/agents/areg-1/dispatch-authority',
  );
  assert.equal(
    String(calls[1]?.input),
    'http://127.0.0.1:8787/runtime/account/agents/areg-1/dispatch-authority-requests',
  );
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    requested_target: 'bounded_dispatch_authority_activation',
    now: '2026-04-14T10:00:00Z',
  });
});
