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

test('BidviaClient exposes account-owned execution operational surfaces as session-bound wrappers', async () => {
  const responseBodies = [
    { presence: { presence_state: 'ONLINE' } },
    { execution_owner: 'claimant', execution_stage: 'execution_package_ready' },
    { sync: { cursor_ref: 'cursor-1' } },
    { sync: { cursor_ref: 'cursor-1' } },
    { evidence_submission: { evidence_ref: 'evidence://1' } },
    { proposal_submission: { proposal_ref: 'proposal://1' } },
  ];
  const { calls, fetchStub } = createFetchStub(responseBodies);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const postAccountAgentExecutionPresence = Reflect.get(client, 'postAccountAgentExecutionPresence');
  const getAccountAgentExecutionStatus = Reflect.get(client, 'getAccountAgentExecutionStatus');
  const uploadAccountAgentExecutionSync = Reflect.get(client, 'uploadAccountAgentExecutionSync');
  const downloadAccountAgentExecutionSync = Reflect.get(client, 'downloadAccountAgentExecutionSync');
  const submitAccountAgentExecutionEvidence = Reflect.get(client, 'submitAccountAgentExecutionEvidence');
  const submitAccountAgentExecutionProposal = Reflect.get(client, 'submitAccountAgentExecutionProposal');

  assert.equal(typeof postAccountAgentExecutionPresence, 'function');
  assert.equal(typeof getAccountAgentExecutionStatus, 'function');
  assert.equal(typeof uploadAccountAgentExecutionSync, 'function');
  assert.equal(typeof downloadAccountAgentExecutionSync, 'function');
  assert.equal(typeof submitAccountAgentExecutionEvidence, 'function');
  assert.equal(typeof submitAccountAgentExecutionProposal, 'function');

  await Reflect.apply(postAccountAgentExecutionPresence, client, ['agent-1', { now: '2026-05-01T12:10:00Z', expiresAt: '2026-05-01T12:15:00Z' }]);
  await Reflect.apply(getAccountAgentExecutionStatus, client, ['agent-1']);
  await Reflect.apply(uploadAccountAgentExecutionSync, client, ['agent-1', { cursorRef: 'cursor-1', objectCount: 3, now: '2026-05-01T12:11:00Z' }]);
  await Reflect.apply(downloadAccountAgentExecutionSync, client, ['agent-1']);
  await Reflect.apply(submitAccountAgentExecutionEvidence, client, ['agent-1', { evidenceRef: 'evidence://1', evidenceKind: 'provider_receipt', summary: 'receipt evidence', now: '2026-05-01T12:12:00Z' }]);
  await Reflect.apply(submitAccountAgentExecutionProposal, client, ['agent-1', { proposalType: 'template_change', proposalRef: 'proposal://1', summary: 'template change', now: '2026-05-01T12:13:00Z' }]);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/presence?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/status?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/sync/upload?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/sync/download?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/evidence-submissions?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/proposals?tenant_id=tenant-a');
  for (const call of calls) {
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  }
});

test('BidviaClient exposes account-owned execution listing and materialization surfaces as session-bound wrappers', async () => {
  const responseBodies = [
    { listing: { listing_id: 'listing-1' } },
    { activation: { listing_id: 'listing-1' } },
    { listing_status: { listing_id: 'listing-1' } },
    { materialization_status: { listing_id: 'listing-1', stage: 'match_materialized' } },
  ];
  const { calls, fetchStub } = createFetchStub(responseBodies);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const createAccountAgentExecutionListing = Reflect.get(client, 'createAccountAgentExecutionListing');
  const activateAccountAgentExecutionListing = Reflect.get(client, 'activateAccountAgentExecutionListing');
  const getAccountAgentExecutionListingStatus = Reflect.get(client, 'getAccountAgentExecutionListingStatus');
  const getAccountAgentExecutionListingMaterializationStatus = Reflect.get(client, 'getAccountAgentExecutionListingMaterializationStatus');

  assert.equal(typeof createAccountAgentExecutionListing, 'function');
  assert.equal(typeof activateAccountAgentExecutionListing, 'function');
  assert.equal(typeof getAccountAgentExecutionListingStatus, 'function');
  assert.equal(typeof getAccountAgentExecutionListingMaterializationStatus, 'function');

  await Reflect.apply(createAccountAgentExecutionListing, client, ['agent-1', {
    listingId: 'listing-1',
    listingType: 'supply',
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-05-01T12:20:00Z',
    traceId: 'trace-1',
    idempotencyKey: 'listing-1',
    now: '2026-05-01T12:20:00Z',
  }]);
  await Reflect.apply(activateAccountAgentExecutionListing, client, ['agent-1', 'listing-1', { now: '2026-05-01T12:21:00Z' }]);
  await Reflect.apply(getAccountAgentExecutionListingStatus, client, ['agent-1', 'listing-1']);
  await Reflect.apply(getAccountAgentExecutionListingMaterializationStatus, client, ['agent-1', 'listing-1']);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings/listing-1/activate?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings/listing-1/status?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings/listing-1/materialization-status?tenant_id=tenant-a');
  for (const call of calls) {
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  }
});
