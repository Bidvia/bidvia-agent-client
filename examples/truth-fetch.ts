import { BidviaClient } from '../src/client.js';

const responses = new Map<string, unknown>([
  [
    'http://127.0.0.1:8787/runtime/account/records',
    {
      items: [
        {
          account_record_id: 'record-example-1',
          record_kind: 'governance-snapshot',
          display_name: 'Example tenant governance record',
        },
      ],
    },
  ],
  [
    'http://127.0.0.1:8787/runtime/agents/areg-example-1/presence?tenant_id=tenant-a',
    {
      agent_registration_id: 'areg-example-1',
      status: 'online',
      last_heartbeat_at: '2026-03-28T10:00:00.000Z',
    },
  ],
  [
    'http://127.0.0.1:8787/runtime/agents/areg-example-1/authority-profile?tenant_id=tenant-a',
    {
      agent_registration_id: 'areg-example-1',
      authority_tier: 'tier-2',
      decision_scope: ['review', 'escalate'],
    },
  ],
  [
    'http://127.0.0.1:8787/runtime/canonical-semantic-labels',
    {
      items: [
        {
          canonical_semantic_label_id: 'label-example-1',
          label: 'battery-grade lithium carbonate',
        },
      ],
    },
  ],
  [
    'http://127.0.0.1:8787/runtime/pricing-bases',
    {
      items: [
        {
          pricing_basis_id: 'basis-example-1',
          basis_kind: 'spot',
          currency_code: 'USD',
        },
      ],
    },
  ],
]);

const client = new BidviaClient({
  baseUrl: 'http://127.0.0.1:8787',
  context: {
    tenantId: 'tenant-a',
    sessionId: 'session-example-1',
    adminSessionId: 'admin-session-example-1',
  },
  fetchImpl: async (input) => {
    const url = typeof input === 'string' ? input : input.toString();
    const responseBody = responses.get(url);

    if (responseBody === undefined) {
      return new Response(JSON.stringify({
        message: `No example response registered for ${url}`,
      }), {
        status: 404,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  },
});

const accountRecords = await client.listAccountRecords();
const agentPresence = await client.getAgentPresence('areg-example-1');
const agentAuthorityProfile = await client.getAgentAuthorityProfile('areg-example-1');
const canonicalSemanticLabels = await client.listCanonicalSemanticLabels();
const pricingBases = await client.listPricingBases();

console.log(JSON.stringify({
  accountRecords,
  agentPresence,
  agentAuthorityProfile,
  canonicalSemanticLabels,
  pricingBases,
}, null, 2));
