import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.js';
import { buildHeartbeatInput } from '../src/heartbeat.js';
import { buildSyncUploadInput } from '../src/sync.js';
import { buildEvidenceSubmissionInput } from '../src/evidence.js';
import { buildProposalSubmissionInput } from '../src/proposals.js';

function createFetchRecorder() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
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
  ]);

  console.log('Bidvia agent client contract validation passed.');
}

void main();
