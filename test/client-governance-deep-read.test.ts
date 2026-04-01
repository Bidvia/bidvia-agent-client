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

test('BidviaClient governance deep reads use principal-governed GET wrappers with tenant query parameters', async () => {
  const responseBody = {
    ok: true,
  };
  const { calls, fetchStub } = createFetchStub(responseBody);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  const registrations = await client.listAgentRegistrations();
  const registration = await client.getAgentRegistration('areg-1');
  const readiness = await client.getAgentReadiness('areg-1');
  const summary = await client.getAgentSummary('areg-1');
  const authorityProfiles = await client.listAuthorityProfiles();
  const authorityProfile = await client.getAgentAuthorityProfile('areg-1');
  const authorityLadder = await client.getAgentAuthorityLadder('areg-1');
  const capabilityProfiles = await client.listCapabilityProfiles();
  const capabilityProfile = await client.getAgentCapabilityProfile('areg-1');

  assert.deepEqual(registrations, responseBody);
  assert.deepEqual(registration, responseBody);
  assert.deepEqual(readiness, responseBody);
  assert.deepEqual(summary, responseBody);
  assert.deepEqual(authorityProfiles, responseBody);
  assert.deepEqual(authorityProfile, responseBody);
  assert.deepEqual(authorityLadder, responseBody);
  assert.deepEqual(capabilityProfiles, responseBody);
  assert.deepEqual(capabilityProfile, responseBody);
  assert.equal('listAgentCapabilityProfiles' in client, false);
  assert.equal(calls.length, 9);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/registrations?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/readiness?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/summary?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/authority-profiles?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-profile?tenant_id=tenant-a');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-ladder?tenant_id=tenant-a');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/capability-profiles?tenant_id=tenant-a');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profile?tenant_id=tenant-a');
  for (const call of calls) {
    assert.equal(call.init?.method, 'GET');
    assert.equal((call.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
    assert.equal((call.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  }
});

test('BidviaClient governance deep reads fail closed before fetch when tenant or principal context is missing', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const missingPrincipalClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
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
  const missingTenantClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: '',
      principalId: 'actor-1',
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
  const principalOnlyClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
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
    await missingPrincipalClient.listAgentRegistrations();
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentRegistration('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentReadiness('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentSummary('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.listAuthorityProfiles();
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentAuthorityProfile('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentAuthorityLadder('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.listCapabilityProfiles();
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentCapabilityProfile('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listAgentRegistrations();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentRegistration('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentReadiness('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentSummary('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listAuthorityProfiles();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentAuthorityProfile('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentAuthorityLadder('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listCapabilityProfiles();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentCapabilityProfile('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  const principalOnlyResponse = await principalOnlyClient.listAgentRegistrations();
  assert.deepEqual(principalOnlyResponse, { ok: true });
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/registrations?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], undefined);
  assert.equal(calls.length, 1);
});
