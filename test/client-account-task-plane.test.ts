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

test('BidviaClient account task-plane claim writes include claimant session and account scope headers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'principal-1',
      registrationId: 'areg-1',
      companyId: 'company-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createClaim('areg-1', {
    claimKind: 'manual_probe',
    claimRef: 'claim-ref-1',
    taskDispatchId: 'dispatch-1',
    now: '2026-04-30T05:00:00Z',
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/claims?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'principal-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    claim_kind: 'manual_probe',
    claim_ref: 'claim-ref-1',
    now: '2026-04-30T05:00:00Z',
    task_dispatch_id: 'dispatch-1',
  });
});

test('BidviaClient account task-plane lease writes include claimant session and account scope headers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'principal-1',
      registrationId: 'areg-1',
      companyId: 'company-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createLease('areg-1', {
    leaseScope: 'dispatch-authority-review',
    now: '2026-04-30T05:01:00Z',
    expiresAt: '2026-04-30T05:06:00Z',
  });

  assert.equal(calls.length, 1);
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});
