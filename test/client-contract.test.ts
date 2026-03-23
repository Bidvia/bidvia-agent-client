import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

function createFetchStub() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input, init) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient uses the frozen provisional->query->claim onboarding contract', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createProvisionalAgent({
    provisionalAgentRef: 'prov-agent-1',
    now: '2026-03-25T18:00:00Z',
  });
  await client.queryProvisionalAgent('prov-agent-1');
  await client.claimProvisionalAgent({
    provisionalAgentRef: 'prov-agent-1',
    claimToken: 'claim-token-1',
    now: '2026-03-25T18:01:00Z',
  });

  assert.equal(calls.length, 3);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-agent-1');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional/claim');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});

test('BidviaClient uses the frozen registration-bound heartbeat/sync/evidence/proposal contract', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-client-1',
    },
    fetchImpl: fetchStub,
  });

  await client.postHeartbeat({ now: '2026-03-25T18:02:00Z', expiresAt: '2026-03-25T18:07:00Z' });
  await client.uploadSync({ cursorRef: 'cursor-1', objectCount: 3, now: '2026-03-25T18:03:00Z' });
  await client.downloadSync();
  await client.submitEvidence({ evidenceRef: 'evidence://agent/1', evidenceKind: 'provider_receipt', summary: 'receipt evidence', now: '2026-03-25T18:04:00Z' });
  await client.submitProposal({ proposalType: 'template_change', proposalRef: 'proposal://agent/1', summary: 'template change', now: '2026-03-25T18:05:00Z' });

  assert.equal(calls.length, 5);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/heartbeat?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/sync/upload?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/sync/download?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/evidence-submissions?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/proposals?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
});
