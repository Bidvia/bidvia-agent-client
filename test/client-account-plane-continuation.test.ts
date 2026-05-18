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

test('BidviaClient exposes account-plane closure-status and governed-work-closure as session-bound GET wrappers', async () => {
  const closureStatusResponse = {
    current_stage: 'dispatch_ready',
  };
  const governedWorkClosureResponse = {
    governed_work_closure: {
      dispatchRef: 'dispatch-1',
    },
  };
  const { calls, fetchStub } = createFetchStub([
    closureStatusResponse,
    governedWorkClosureResponse,
  ]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const getAccountAgentClosureStatus = Reflect.get(client, 'getAccountAgentClosureStatus');
  const getAccountAgentGovernedWorkClosure = Reflect.get(client, 'getAccountAgentGovernedWorkClosure');

  assert.equal(typeof getAccountAgentClosureStatus, 'function');
  assert.equal(typeof getAccountAgentGovernedWorkClosure, 'function');

  const closureStatus = await Reflect.apply(getAccountAgentClosureStatus, client, ['agent-1']);
  const governedWorkClosure = await Reflect.apply(getAccountAgentGovernedWorkClosure, client, ['agent-1', 'dispatch-1']);

  assert.deepEqual(closureStatus, closureStatusResponse);
  assert.deepEqual(governedWorkClosure, governedWorkClosureResponse);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/closure-status?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1/governed-work-closure?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});

test('BidviaClient exposes account-plane task reads as session-bound GET wrappers', async () => {
  const listResponse = {
    items: [{ agent_task_dispatch_id: 'dispatch-1' }],
  };
  const detailResponse = {
    dispatch: {
      agent_task_dispatch_id: 'dispatch-1',
    },
  };
  const { calls, fetchStub } = createFetchStub([
    listResponse,
    detailResponse,
  ]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const listTaskDispatches = Reflect.get(client, 'listTaskDispatches');
  const getTaskDispatch = Reflect.get(client, 'getTaskDispatch');

  assert.equal(typeof listTaskDispatches, 'function');
  assert.equal(typeof getTaskDispatch, 'function');

  const list = await Reflect.apply(listTaskDispatches, client, ['agent-1']);
  const detail = await Reflect.apply(getTaskDispatch, client, ['agent-1', 'dispatch-1']);

  assert.deepEqual(list, listResponse);
  assert.deepEqual(detail, detailResponse);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});

test('BidviaClient exposes account-plane authorization refresh and external binding writes as session-bound POST wrappers', async () => {
  const authorizationRefreshResponse = {
    surface_status: 'governed_runtime_authorization_refreshed',
  };
  const externalBindingResponse = {
    surface_status: 'account_scoped_binding_completed',
  };
  const { calls, fetchStub } = createFetchStub([
    authorizationRefreshResponse,
    externalBindingResponse,
  ]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const refreshAccountAgentAuthorization = Reflect.get(client, 'refreshAccountAgentAuthorization');
  const createAccountAgentExternalBinding = Reflect.get(client, 'createAccountAgentExternalBinding');

  assert.equal(typeof refreshAccountAgentAuthorization, 'function');
  assert.equal(typeof createAccountAgentExternalBinding, 'function');

  const authorizationRefresh = await Reflect.apply(refreshAccountAgentAuthorization, client, ['agent-1', {
    now: '2026-05-01T11:45:00Z',
  }]);
  const binding = await Reflect.apply(createAccountAgentExternalBinding, client, ['agent-1', {
    systemType: 'wms',
    systemName: 'integration-smoke',
    externalAccountRef: 'wms-agent-1',
    now: '2026-05-01T11:46:00Z',
  }]);

  assert.deepEqual(authorizationRefresh, authorizationRefreshResponse);
  assert.deepEqual(binding, externalBindingResponse);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/governed-runtime/authorization-refresh?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/external-account-bindings?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    now: '2026-05-01T11:45:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    system_type: 'wms',
    system_name: 'integration-smoke',
    external_account_ref: 'wms-agent-1',
    now: '2026-05-01T11:46:00Z',
  });
});

test('BidviaClient exposes operator dispatch-authority decision as an admin-session tenant-scoped POST wrapper', async () => {
  const responseBody = {
    request: {
      status: 'APPROVED',
    },
  };
  const { calls, fetchStub } = createFetchStub([responseBody]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  const decideDispatchAuthorityRequest = Reflect.get(client, 'decideDispatchAuthorityRequest');

  assert.equal(typeof decideDispatchAuthorityRequest, 'function');

  const result = await Reflect.apply(decideDispatchAuthorityRequest, client, ['daar-1', {
    decision: 'APPROVE',
    resolutionReason: 'bounded-review-approve',
    now: '2026-05-01T11:47:00Z',
  }]);

  assert.deepEqual(result, responseBody);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/operator/dispatch-authority-requests/daar-1/decision?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'POST');
  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(headers['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    decision: 'APPROVE',
    resolution_reason: 'bounded-review-approve',
    now: '2026-05-01T11:47:00Z',
  });
});


test('BidviaClient exposes account-plane execution listing update as a session-bound PATCH wrapper', async () => {
  const responseBody = {
    listing: {
      listing_id: 'listing-1',
      status: 'draft',
    },
  };
  const { calls, fetchStub } = createFetchStub([responseBody]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const updateAccountAgentExecutionListing = Reflect.get(client, 'updateAccountAgentExecutionListing');

  assert.equal(typeof updateAccountAgentExecutionListing, 'function');

  const result = await Reflect.apply(updateAccountAgentExecutionListing, client, ['agent-1', 'listing-1', {
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '18',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-05-12T11:00:00Z',
    traceId: 'trace-1',
    now: '2026-05-12T11:00:00Z',
  }]);

  assert.deepEqual(result, responseBody);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings/listing-1?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'PATCH');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantity_value: '18',
    quantity_unit: 'tons',
    region_summary: 'China -> Vietnam',
    verification_status: 'verified',
    freshness_ts: '2026-05-12T11:00:00Z',
    trace_id: 'trace-1',
    now: '2026-05-12T11:00:00Z',
  });
});

test('BidviaClient exposes claimant opportunity status and end-state readbacks as session-bound GET wrappers', async () => {
  const statusResponse = {
    continuation_state: 'ALLOCATED',
  };
  const endStateResponse = {
    closure_class: 'product_closed',
  };
  const { calls, fetchStub } = createFetchStub([
    statusResponse,
    endStateResponse,
  ]);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const getAccountAgentExecutionOpportunityStatus = Reflect.get(client, 'getAccountAgentExecutionOpportunityStatus');
  const getAccountAgentExecutionOpportunityEndState = Reflect.get(client, 'getAccountAgentExecutionOpportunityEndState');

  assert.equal(typeof getAccountAgentExecutionOpportunityStatus, 'function');
  assert.equal(typeof getAccountAgentExecutionOpportunityEndState, 'function');

  const status = await Reflect.apply(getAccountAgentExecutionOpportunityStatus, client, ['agent-1', 'opp-1']);
  const endState = await Reflect.apply(getAccountAgentExecutionOpportunityEndState, client, ['agent-1', 'opp-1']);

  assert.deepEqual(status, statusResponse);
  assert.deepEqual(endState, endStateResponse);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/status?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/end-state?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});
