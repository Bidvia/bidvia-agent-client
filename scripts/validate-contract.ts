import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.js';
import { buildHeartbeatInput } from '../src/heartbeat.js';
import { buildSyncUploadInput } from '../src/sync.js';
import { buildEvidenceSubmissionInput } from '../src/evidence.js';
import { buildProposalSubmissionInput } from '../src/proposals.js';
import { buildIndustryUniverseScenarioPlan, runIndustryUniverseScenario } from '../src/universe.js';

function createFetchRecorder() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchImpl };
}

async function main() {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-validate-1',
      sessionId: 'sess-validate-1',
      companyId: 'company-a',
    },
    fetchImpl,
  });

  await client.createProvisionalAgent({ provisionalAgentRef: 'prov-validate-1', now: '2026-03-25T19:00:00Z' });
  await client.queryProvisionalAgent('prov-validate-1');
  await client.claimProvisionalAgent({ provisionalAgentRef: 'prov-validate-1', claimToken: 'claim-validate-1', now: '2026-03-25T19:01:00Z' });
  await client.postHeartbeat(buildHeartbeatInput('2026-03-25T19:02:00Z', '2026-03-25T19:07:00Z'));
  await client.uploadSync(buildSyncUploadInput('cursor-validate-1', 2, '2026-03-25T19:03:00Z'));
  await client.downloadSync();
  await client.submitEvidence(buildEvidenceSubmissionInput('evidence://validate/1', 'provider_receipt', 'validation evidence payload', '2026-03-25T19:04:00Z'));
  await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://validate/1', 'validation proposal payload', '2026-03-25T19:05:00Z'));
  const industryUniversePlan = buildIndustryUniverseScenarioPlan({
    scenarioId: 'scenario-industry-universe-validate-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://validate/1'],
    traceIds: ['trace-validate-1'],
    workflowIds: ['wf-validate-1'],
    createListing: {
      listingId: 'listing-validate-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-03-25T19:06:00Z',
      traceId: 'trace-validate-1',
      idempotencyKey: 'listing-validate-1',
      now: '2026-03-25T19:06:00Z',
    },
    activateListing: {
      now: '2026-03-25T19:07:00Z',
    },
    generateMatchCandidates: {
      upstreamDecision: 'READY_FOR_ROUTING',
      requiredEvidenceLevel: 1,
      detectedEvidenceLevel: 1,
      workflowRunId: 'wf-validate-1',
      triggerEventId: 'evt-validate-1',
      topN: 10,
      now: '2026-03-25T19:08:00Z',
    },
  });
  await runIndustryUniverseScenario(client, industryUniversePlan);

  const urls = calls.map((call) => String(call.input));
  assert.deepEqual(urls, [
    'http://127.0.0.1:8787/runtime/agents/provisional',
    'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-validate-1',
    'http://127.0.0.1:8787/runtime/agents/provisional/claim',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/heartbeat?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/sync/upload?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/sync/download?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/evidence-submissions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/proposals?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/activate?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/match-candidates?tenant_id=tenant-a',
  ]);

  const claimHeaders = calls[2]?.init?.headers as Record<string, string>;
  const heartbeatHeaders = calls[3]?.init?.headers as Record<string, string>;
  const listingHeaders = calls[8]?.init?.headers as Record<string, string>;

  assert.equal(claimHeaders['x-bidvia-session-id'], 'sess-validate-1');
  assert.equal(heartbeatHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(heartbeatHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(listingHeaders['x-authorized-company-id'], 'company-a');

  const claimBody = JSON.parse(String(calls[2]?.init?.body));
  const heartbeatBody = JSON.parse(String(calls[3]?.init?.body));
  const listingBody = JSON.parse(String(calls[8]?.init?.body));
  const matchCandidatesBody = JSON.parse(String(calls[10]?.init?.body));

  assert.deepEqual(claimBody, {
    provisional_agent_ref: 'prov-validate-1',
    claim_token: 'claim-validate-1',
    now: '2026-03-25T19:01:00Z',
  });
  assert.deepEqual(heartbeatBody, {
    now: '2026-03-25T19:02:00Z',
    expires_at: '2026-03-25T19:07:00Z',
  });
  assert.equal(listingBody.listing_id, 'listing-validate-1');
  assert.equal(listingBody.trace_id, 'trace-validate-1');
  assert.equal(matchCandidatesBody.workflow_run_id, 'wf-validate-1');
  assert.equal(matchCandidatesBody.trigger_event_id, 'evt-validate-1');

  console.log('Bidvia agent client contract validation passed.');
}

void main();
