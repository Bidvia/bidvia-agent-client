import { BidviaClient } from '../src/client.js';

const responses = new Map<string, unknown>([
  [
    'http://127.0.0.1:8787/runtime/agents/areg-example-1/presence',
    {
      agent_registration_id: 'areg-example-1',
      status: 'online',
      last_heartbeat_at: '2026-03-28T10:00:00.000Z',
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

const agentPresence = await client.getAgentPresence('areg-example-1');
const pricingBases = await client.listPricingBases();

console.log(JSON.stringify({
  agentPresence,
  pricingBases,
}, null, 2));
