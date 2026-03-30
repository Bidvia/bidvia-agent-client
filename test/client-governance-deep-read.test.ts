import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

function createFetchStub(responseBody: unknown) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient governance deep reads use admin-session GET wrappers with tenant query parameters', async () => {
  const responseBody = {
    ok: true,
  };
  const { calls, fetchStub } = createFetchStub(responseBody);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  const readiness = await client.getAgentReadiness('areg-1');
  const summary = await client.getAgentSummary('areg-1');
  const authorityProfile = await client.getAgentAuthorityProfile('areg-1');
  const authorityLadder = await client.getAgentAuthorityLadder('areg-1');
  const capabilityProfiles = await client.listAgentCapabilityProfiles('areg-1');
  const capabilityProfile = await client.getAgentCapabilityProfile('areg-1', 'cap-prof-1');

  assert.deepEqual(readiness, responseBody);
  assert.deepEqual(summary, responseBody);
  assert.deepEqual(authorityProfile, responseBody);
  assert.deepEqual(authorityLadder, responseBody);
  assert.deepEqual(capabilityProfiles, responseBody);
  assert.deepEqual(capabilityProfile, responseBody);
  assert.equal(calls.length, 6);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/summary?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-profile?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-ladder?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profiles?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profiles/cap-prof-1?tenant_id=tenant-a');
  for (const call of calls) {
    assert.equal(call.init?.method, 'GET');
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  }
});

test('BidviaClient governance deep reads fail closed before fetch when tenant or admin session context is missing', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const missingAdminSessionClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    fetchImpl: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  const missingTenantClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: '',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  await assert.rejects(async () => {
    await missingAdminSessionClient.getAgentReadiness('areg-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingAdminSessionClient.getAgentSummary('areg-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingAdminSessionClient.getAgentAuthorityProfile('areg-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingAdminSessionClient.getAgentAuthorityLadder('areg-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingAdminSessionClient.listAgentCapabilityProfiles('areg-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingAdminSessionClient.getAgentCapabilityProfile('areg-1', 'cap-prof-1');
  }, /adminSessionId is required for admin-session routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentReadiness('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentSummary('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentAuthorityProfile('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentAuthorityLadder('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listAgentCapabilityProfiles('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentCapabilityProfile('areg-1', 'cap-prof-1');
  }, /tenantId is required for tenant-scoped read routes/);
  assert.equal(calls.length, 0);
});
