import { BidviaClient } from '../src/client.js';
import { buildHeartbeatInput } from '../src/heartbeat.js';
import { buildSyncUploadInput } from '../src/sync.js';

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
      principalId: 'actor-internal-1',
      sessionId: 'sess-internal-1',
      registrationId: 'areg-internal-1',
    },
    fetchImpl: createFetchStub('internal-team-agent'),
  });

  const heartbeat = await client.postHeartbeat(buildHeartbeatInput('2026-03-25T20:00:00Z', '2026-03-25T20:05:00Z'));
  const sync = await client.uploadSync(buildSyncUploadInput('internal-cursor-1', 4, '2026-03-25T20:01:00Z'));

  console.log({ heartbeat, sync });
}

void main();
