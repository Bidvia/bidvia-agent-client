import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import {
  connectionApprovalScenarioAdapter,
  industryUniverseScenarioAdapter,
  opportunityPackageHandoffAdapter,
} from '../src/adapters.ts';

test('industry universe adapter returns review safe plan', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  const result = await industryUniverseScenarioAdapter.run(client, {
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    createListing: {
      listingId: 'listing-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-03-25T20:20:00Z',
      traceId: 'trace-1',
      idempotencyKey: 'listing-1',
      now: '2026-03-25T20:20:00Z',
    },
    activateListing: {
      now: '2026-03-25T20:21:00Z',
    },
    generateMatchCandidates: {
      upstreamDecision: 'READY_FOR_ROUTING',
      requiredEvidenceLevel: 1,
      detectedEvidenceLevel: 1,
      workflowRunId: 'wf-1',
      triggerEventId: 'evt-1',
      topN: 10,
      now: '2026-03-25T20:22:00Z',
    },
  });

  assert.equal(industryUniverseScenarioAdapter.name, 'industry-universe-plan');
  assert.match(industryUniverseScenarioAdapter.describe(), /industry universe/i);
  assert.equal(result.scenarioPlan.envelope.scenarioFamily, 'industry-universe');
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.scenarioFamily, 'industry-universe');
  assert.equal(result.reviewPacket.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.status, 'pending-review');
  assert.equal(result.reviewPacket.summary.pendingRouteCount, 3);
  assert.equal(result.reviewPacket.details.boundary.serverTruthClaimed, false);
  assert.equal(result.reviewPacket.details.verification.pendingRouteKeys.length, 3);
  assert.deepEqual(
    result.reviewPacket.sections.map((section) => section.sectionKey),
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );
  assert.notEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.deepEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.equal(calls.length, 0);
});

test('connection approval adapter returns review safe plan', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  const result = await connectionApprovalScenarioAdapter.run(client, {
    scenarioId: 'scenario-connection-approval-1',
    scenarioLabel: 'connection-approval-cli-preview',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    createConnectionRequest: {
      sourceMatchId: 'match-1',
      requesterActorId: 'actor-1',
      requesterCompanyId: 'company-a',
      riskTier: 'medium',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'buyer_contact_request',
      now: '2026-03-25T20:22:00Z',
    },
    approveConnectionRequest: {
      approvalRequestId: 'approval-1',
      actorId: 'actor-1',
      decision: 'approve',
      now: '2026-03-25T20:23:00Z',
    },
  });

  assert.equal(connectionApprovalScenarioAdapter.name, 'connection-approval-plan');
  assert.match(connectionApprovalScenarioAdapter.describe(), /connection approval/i);
  assert.equal(result.scenarioPlan.envelope.scenarioFamily, 'connection-approval');
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.scenarioFamily, 'connection-approval');
  assert.equal(result.reviewPacket.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.status, 'pending-review');
  assert.equal(result.reviewPacket.summary.pendingRouteCount, 2);
  assert.equal(result.reviewPacket.details.boundary.serverTruthClaimed, false);
  assert.deepEqual(result.reviewPacket.details.verification.pendingRouteKeys, [
    'createConnectionRequest',
    'approveConnectionRequest',
  ]);
  assert.notEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.deepEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.deepEqual(
    result.scenarioPlan.envelope.expectedRouteChain.map((step) => step.routeKey),
    ['createConnectionRequest', 'approveConnectionRequest'],
  );
  assert.equal(calls.length, 0);
});

test('opportunity package handoff adapter returns review safe plan', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  const result = await opportunityPackageHandoffAdapter.run(client, {
    scenarioId: 'scenario-opportunity-package-handoff-1',
    scenarioLabel: 'opportunity-package-handoff-cli-preview',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    exportOpportunityPackage: {
      opportunityId: 'opportunity-1',
      renderTemplateId: 'template-1',
      contentRef: 'content://packages/opportunity-1',
      redactionProfile: 'review-safe',
      targetSystem: 'downstream-dataroom',
      operationType: 'export',
      nodeId: 'node-1',
      runtimeId: 'runtime-1',
      agentId: 'agent-1',
      boundAccountId: 'account-1',
      now: '2026-03-25T20:24:00Z',
    },
  });

  assert.equal(opportunityPackageHandoffAdapter.name, 'opportunity-package-handoff-plan');
  assert.match(opportunityPackageHandoffAdapter.describe(), /package handoff/i);
  assert.equal(result.scenarioPlan.envelope.scenarioFamily, 'opportunity-package-handoff');
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.scenarioFamily, 'opportunity-package-handoff');
  assert.equal(result.reviewPacket.verificationMode, 'review-safe');
  assert.equal(result.reviewPacket.status, 'pending-review');
  assert.equal(result.reviewPacket.summary.pendingRouteCount, 1);
  assert.equal(result.reviewPacket.details.boundary.serverTruthClaimed, false);
  assert.deepEqual(result.reviewPacket.details.verification.pendingRouteKeys, ['exportOpportunityPackage']);
  assert.notEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.deepEqual(result.exportedReviewPacket, result.reviewPacket);
  assert.deepEqual(
    result.scenarioPlan.envelope.expectedRouteChain.map((step) => step.routeKey),
    ['exportOpportunityPackage'],
  );
  assert.equal(calls.length, 0);
});
