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

test('BidviaClient injects static local auth and header inputs into the shared request flow', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      principalType: 'operator',
      authorizedRole: 'admin',
      registrationId: 'areg-client-1',
    },
    auth: {
      bearerToken: 'token-static-1',
    },
    headers: {
      'x-client-local-header': 'local-static-1',
    },
    fetchImpl: fetchStub,
  } as never);

  await client.postHeartbeat({
    now: '2026-03-26T09:00:00Z',
    expiresAt: '2026-03-26T09:05:00Z',
  });

  assert.equal(calls.length, 1);
  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer token-static-1');
  assert.equal(headers['x-client-local-header'], 'local-static-1');
  assert.equal(headers['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(headers['x-bidvia-principal-id'], 'actor-1');
  assert.equal(headers['x-bidvia-principal-type'], 'operator');
  assert.equal(headers['x-authorized-role'], 'admin');
});

test('BidviaClient resolves async auth and header providers on every request', async () => {
  const { calls, fetchStub } = createFetchStub();
  const authProviderCalls: string[] = [];
  const headerProviderCalls: string[] = [];
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    auth: async (request: { method: string; path: string; context: { tenantId: string } }) => {
      authProviderCalls.push(`${request.method} ${request.path} ${request.context.tenantId}`);
      return {
        bearerToken: `token-for-${request.context.tenantId}-${authProviderCalls.length}`,
      };
    },
    headers: async (request: { method: string; path: string }) => {
      headerProviderCalls.push(`${request.method} ${request.path}`);
      return {
        'x-provider-path': request.path,
      };
    },
    fetchImpl: fetchStub,
  } as never);

  await client.createProvisionalAgent({
    provisionalAgentRef: 'prov-agent-1',
    now: '2026-03-26T10:00:00Z',
  });
  await client.queryProvisionalAgent('prov-agent-1', {
    context: {
      tenantId: 'tenant-b',
    },
  } as never);

  assert.deepEqual(authProviderCalls, [
    'POST /runtime/agents/provisional tenant-a',
    'GET /runtime/agents/provisional?provisional_agent_ref=prov-agent-1 tenant-b',
  ]);
  assert.deepEqual(headerProviderCalls, [
    'POST /runtime/agents/provisional',
    'GET /runtime/agents/provisional?provisional_agent_ref=prov-agent-1',
  ]);

  const firstHeaders = calls[0]?.init?.headers as Record<string, string>;
  const secondHeaders = calls[1]?.init?.headers as Record<string, string>;
  assert.equal(firstHeaders.authorization, 'Bearer token-for-tenant-a-1');
  assert.equal(secondHeaders.authorization, 'Bearer token-for-tenant-b-2');
  assert.equal(secondHeaders['x-provider-path'], '/runtime/agents/provisional?provisional_agent_ref=prov-agent-1');
});

test('BidviaClient applies per-request context overrides without mutating global client state', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.createCommercialAction({
    governedAction: 'OPPORTUNITY_PACKAGE_SEND',
    subjectType: 'OPPORTUNITY_PACKAGE',
    subjectId: 'pkg-1',
    traceId: 'trace-1',
    workflowId: 'WF-3',
    now: '2026-03-26T11:00:00Z',
  }, {
    context: {
      tenantId: 'tenant-b',
      principalId: 'actor-2',
      companyId: 'company-b',
    },
  } as never);

  await client.createCommercialAction({
    governedAction: 'OPPORTUNITY_PACKAGE_SEND',
    subjectType: 'OPPORTUNITY_PACKAGE',
    subjectId: 'pkg-2',
    traceId: 'trace-2',
    workflowId: 'WF-4',
    now: '2026-03-26T11:01:00Z',
  });

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions?tenant_id=tenant-b');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions?tenant_id=tenant-a');

  const firstHeaders = calls[0]?.init?.headers as Record<string, string>;
  const secondHeaders = calls[1]?.init?.headers as Record<string, string>;
  assert.equal(firstHeaders['x-bidvia-principal-id'], 'actor-2');
  assert.equal(firstHeaders['x-authorized-company-id'], 'company-b');
  assert.equal(secondHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(secondHeaders['x-authorized-company-id'], 'company-a');
});

test('BidviaClient keeps required-context guards fail-closed when a request override removes required context', async () => {
  const { fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await assert.rejects(
    client.createCommercialAction({
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'WF-3',
      now: '2026-03-26T12:00:00Z',
    }, {
      context: {
        companyId: undefined,
      },
    } as never),
    /companyId is required for operator-context routes/,
  );
});
