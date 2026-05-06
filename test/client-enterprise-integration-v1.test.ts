import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

function createFetchStub() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient exposes the canonical enterprise integration core route family and keeps Haisi support bounded', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
      principalId: 'actor-1',
    },
    fetchImpl: fetchStub,
  });

  await client.listAccountIntegrationCapabilities();
  await client.getAccountAgentIntegrationEligibility('agent-1', 'haisi-wms');
  await client.submitIntegrationOnboardingContract('haisi-wms', {
    agentRegistrationId: 'areg-chem-1',
    identityMapping: {
      source: {
        principalId: 'principal-agent-1',
        scopeId: 'tenant-a',
        capabilityCodes: ['inventory.read', 'inbound.write'],
      },
      target: {
        wmsSubjectId: 'admin',
        capabilityMap: {
          'inventory.read': 'warehouse.read',
          'inbound.write': 'inbound.create',
        },
      },
      metadata: {
        mappingVersion: 'v1',
        mappingStatus: 'active',
      },
    },
    now: '2026-04-10T09:00:00Z',
  });
  await client.logInHaisiWms({});
  await client.listHaisiWmsWarehouses();
  await client.createHaisiWmsInbound({
    warehouseId: 40,
    date: '2026-03-16',
    details: [],
  });

  assert.equal(calls.length, 6);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/integration-capabilities');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/integrations/haisi-wms/eligibility');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/onboarding-contract?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/login?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/warehouses?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/integrations/haisi-wms/inbound?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    agent_registration_id: 'areg-chem-1',
    identity_mapping: {
      source: {
        principal_id: 'principal-agent-1',
        scope_id: 'tenant-a',
        capability_codes: ['inventory.read', 'inbound.write'],
      },
      target: {
        wms_subject_id: 'admin',
        capability_map: {
          'inventory.read': 'warehouse.read',
          'inbound.write': 'inbound.create',
        },
      },
      metadata: {
        mapping_version: 'v1',
        mapping_status: 'active',
      },
    },
    now: '2026-04-10T09:00:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {});
  assert.equal(calls[4]?.init?.body, undefined);
  assert.deepEqual(JSON.parse(String(calls[5]?.init?.body)), {
    warehouseId: 40,
    date: '2026-03-16',
    details: [],
  });
});
