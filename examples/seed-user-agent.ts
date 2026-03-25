import { BidviaClient } from '../src/client.js';
import { buildEvidenceSubmissionInput } from '../src/evidence.js';
import { buildProposalSubmissionInput } from '../src/proposals.js';

function createFetchStub(label: string): typeof fetch {
  return async (input, init) => {
    return new Response(JSON.stringify({
      label,
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
    baseUrl: 'https://api.bidvia.cn',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-seed-1',
      registrationId: 'areg-seed-1',
    },
    fetchImpl: createFetchStub('seed-user-agent'),
  });

  const evidence = await client.submitEvidence(buildEvidenceSubmissionInput('evidence://seed/1', 'provider_receipt', 'seed-user evidence payload', '2026-03-25T20:10:00Z'));
  const proposal = await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://seed/1', 'seed-user proposal payload', '2026-03-25T20:11:00Z'));

  console.log({ evidence, proposal });
}

void main();
