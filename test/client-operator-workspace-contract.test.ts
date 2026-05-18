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

test('BidviaClient exposes operator workspace execution, connection, approval, and package helpers as admin-session-backed wrappers', async () => {
  const responseBodies = [
    { listing: { listing_id: 'listing-1' } },
    { activation: { listing_id: 'listing-1' } },
    { matches: { count: 1 } },
    { items: [{ match_id: 'match-1' }] },
    { connectionRequest: { connection_request_id: 'conn-1', approval_request_id: 'apr-1' } },
    { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } },
    { package: { package_id: 'pkg-1' } },
  ];
  const { calls, fetchStub } = createFetchStub(responseBodies);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-public',
      adminSessionId: 'admin-session-1',
    },
    fetchImpl: fetchStub,
  });

  const createOperatorExecutionListing = Reflect.get(client, 'createOperatorExecutionListing');
  const activateOperatorExecutionListing = Reflect.get(client, 'activateOperatorExecutionListing');
  const generateOperatorMatchCandidates = Reflect.get(client, 'generateOperatorMatchCandidates');
  const listOperatorMatches = Reflect.get(client, 'listOperatorMatches');
  const createOperatorConnection = Reflect.get(client, 'createOperatorConnection');
  const approveOperatorConnection = Reflect.get(client, 'approveOperatorConnection');
  const exportOperatorOpportunityPackage = Reflect.get(client, 'exportOperatorOpportunityPackage');

  assert.equal(typeof createOperatorExecutionListing, 'function');
  assert.equal(typeof activateOperatorExecutionListing, 'function');
  assert.equal(typeof generateOperatorMatchCandidates, 'function');
  assert.equal(typeof listOperatorMatches, 'function');
  assert.equal(typeof createOperatorConnection, 'function');
  assert.equal(typeof approveOperatorConnection, 'function');
  assert.equal(typeof exportOperatorOpportunityPackage, 'function');

  await Reflect.apply(createOperatorExecutionListing, client, [{
    listingId: 'listing-1',
    listingType: 'demand',
    companyId: 'company-public',
    actorId: 'operator-system',
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-05-10T13:40:07.000Z',
    traceId: 'trace-listing-1',
    idempotencyKey: 'listing-1',
    now: '2026-05-10T13:40:08.000Z',
  }]);
  await Reflect.apply(activateOperatorExecutionListing, client, ['listing-1', {
    companyId: 'company-public',
    actorId: 'operator-system',
    verificationStatus: 'verified',
    now: '2026-05-10T13:40:09.000Z',
  }]);
  await Reflect.apply(generateOperatorMatchCandidates, client, ['listing-1', {
    workflowRunId: 'wf-run-1',
    triggerEventId: 'evt-1',
    upstreamDecision: 'READY_FOR_ROUTING',
    detectedEvidenceLevel: 2,
    requiredEvidenceLevel: 2,
    missingFields: [],
    freshnessTs: '2026-05-10T14:00:00.000Z',
    traceId: 'trace-listing-1',
    idempotencyKey: 'idem-match-1',
    now: '2026-05-10T14:00:00.000Z',
  }]);
  await Reflect.apply(listOperatorMatches, client, [{
    sourceListingId: 'listing-1',
  }]);
  await Reflect.apply(createOperatorConnection, client, [{
    companyId: 'company-public',
    sourceMatchId: 'match-1',
    requesterActorId: 'operator-system',
    requesterCompanyId: 'company-public',
    riskTier: 'HIGH',
    policyVersion: 'policy-v1',
    approvalMatrixVersion: 'matrix-v1',
    actionType: 'CONTACT_SHARE',
    now: '2026-05-10T15:00:50.000Z',
  }]);
  await Reflect.apply(approveOperatorConnection, client, [{
    approvalRequestId: 'apr-1',
    actorId: 'operator-system',
    decision: 'APPROVE',
    now: '2026-05-10T15:01:00.000Z',
  }]);
  await Reflect.apply(exportOperatorOpportunityPackage, client, [{
    opportunityId: 'opp-1',
    renderTemplateId: 'template-1',
    contentRef: 'content://packages/opp-1',
    redactionProfile: 'review-safe',
    targetSystem: 'downstream-dataroom',
    operationType: 'export',
    nodeId: 'node-1',
    runtimeId: 'runtime-1',
    agentId: 'operator-system',
    boundAccountId: 'company-public',
    now: '2026-05-10T15:01:10.000Z',
  }]);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/operator/execution/listings?tenant_id=tenant-public');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/operator/execution/listings/listing-1/activate?tenant_id=tenant-public');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/operator/execution/listings/listing-1/match-candidates?tenant_id=tenant-public');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/operator/connections?tenant_id=tenant-public');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/operator/approvals/apr-1/decision?tenant_id=tenant-public');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/operator/opportunities/opp-1/package-export?tenant_id=tenant-public');

  for (const call of calls) {
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-session-1');
  }
});
