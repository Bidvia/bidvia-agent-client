import { BidviaClient } from '../src/client.js';
import { buildHeartbeatInput } from '../src/heartbeat.js';
import { buildEvidenceSubmissionInput } from '../src/evidence.js';
import { buildProposalSubmissionInput } from '../src/proposals.js';
import { buildSyncUploadInput } from '../src/sync.js';

function createExampleFetch(): typeof fetch {
  return async (input, init) => {
    return new Response(JSON.stringify({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

async function main() {
  const client = new BidviaClient({
    baseUrl: 'https://api.bidvia.ai',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-example-1',
      sessionId: 'sess-example-1',
    },
    fetchImpl: createExampleFetch(),
  });

  const onboarding = await client.createProvisionalAgent({
    provisionalAgentRef: 'prov-example-1',
    now: '2026-03-25T18:00:00Z',
  });
  const heartbeat = await client.postHeartbeat(buildHeartbeatInput('2026-03-25T18:01:00Z', '2026-03-25T18:06:00Z'));
  const sync = await client.uploadSync(buildSyncUploadInput('cursor-example-1', 2, '2026-03-25T18:02:00Z'));
  const evidence = await client.submitEvidence(buildEvidenceSubmissionInput('evidence://example/1', 'provider_receipt', 'example proof payload', '2026-03-25T18:03:00Z'));
  const proposal = await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://example/1', 'example proposal payload', '2026-03-25T18:04:00Z'));

  console.log({
    guidedJourney: 'public-cli-first-followed-by-sdk-example',
    notes: [
      'This example relies on the package default public base URL.',
      'For the guided public path, start with onboarding-readiness and route-context-matrix before running SDK flows.',
    ],
    onboarding,
    heartbeat,
    sync,
    evidence,
    proposal,
  });
}

void main();
