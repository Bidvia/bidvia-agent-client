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

test('BidviaClient account truth-fetch reads use session-bound GET wrappers', async () => {
  const responseBody = {
    agents: [{ agent_registration_id: 'areg-1' }],
    records: [{ record_id: 'record-1' }],
  };
  const { calls, fetchStub } = createFetchStub(responseBody);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  const accountAgents = await client.listAccountAgents();
  const accountAgent = await client.getAccountAgent('areg-1');
  const accountAgentBindings = await client.listAccountAgentBindings();
  const accountRecords = await client.listAccountRecords();

  assert.deepEqual(accountAgents, responseBody);
  assert.deepEqual(accountAgent, responseBody);
  assert.deepEqual(accountAgentBindings, responseBody);
  assert.deepEqual(accountRecords, responseBody);
  assert.equal(calls.length, 4);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agent-bindings');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/records');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.equal(calls[2]?.init?.method, 'GET');
  assert.equal(calls[3]?.init?.method, 'GET');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[3]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});

test('BidviaClient presence and authority reads use principal-governed GET wrappers with tenant query', async () => {
  const presenceBody = {
    agent_registration_id: 'areg-1',
    state: 'online',
  };
  const authorityBody = {
    agent_registration_id: 'areg-1',
    authority: 'delegated',
  };
  const { calls } = createFetchStub(presenceBody);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      principalType: 'operator',
      authorizedRole: 'admin',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      const body = calls.length === 1 ? presenceBody : authorityBody;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const presence = await client.getAgentPresence('areg-1');
  const authority = await client.getAgentAuthority('areg-1');

  assert.deepEqual(presence, presenceBody);
  assert.deepEqual(authority, authorityBody);
  assert.equal(calls.length, 2);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/presence?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'GET');
  assert.equal(calls[1]?.init?.method, 'GET');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-type'], 'operator');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-principal-type'], 'operator');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-role'], 'admin');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-authorized-role'], 'admin');
});

test('BidviaClient governed reads omit principal-type and authorized-role headers when context does not provide them', async () => {
  const { calls, fetchStub } = createFetchStub({ ok: true });
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
    },
    fetchImpl: fetchStub,
  });

  await client.getAgentPresence('areg-1');

  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers['x-bidvia-principal-type'], undefined);
  assert.equal(headers['x-authorized-role'], undefined);
});

test('BidviaClient semantic, pricing, and asset-binding reads use the frozen truth-fetch routes as thin GET wrappers', async () => {
  const responseBody = {
    items: [{ id: 'item-1' }],
  };
  const { calls, fetchStub } = createFetchStub(responseBody);
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'operator-system',
      principalType: 'system',
      authorizedRole: 'operator_admin',
      companyId: 'company-a',
      adminSessionId: 'admin-session-1',
    },
    fetchImpl: fetchStub,
  });

  const canonicalSemanticConcepts = await client.listCanonicalSemanticConcepts();
  const canonicalSemanticConcept = await client.getCanonicalSemanticConcept('csc-1');
  const pricingBases = await client.listPricingBases();
  const pricingBasis = await client.getPricingBasis('pb-1');
  const documentArtifacts = await client.listDocumentArtifacts();
  const documentArtifact = await client.getDocumentArtifact('da-1');
  const mediaAssets = await client.listMediaAssets();
  const mediaAsset = await client.getMediaAsset('ma-1');
  const evidenceAssets = await client.listEvidenceAssets();
  const evidenceAsset = await client.getEvidenceAsset('ea-1');
  const attachmentBindings = await client.listAttachmentBindings();
  const attachmentBinding = await client.getAttachmentBinding('ab-1');

  assert.deepEqual(canonicalSemanticConcepts, responseBody);
  assert.deepEqual(canonicalSemanticConcept, responseBody);
  assert.deepEqual(pricingBases, responseBody);
  assert.deepEqual(pricingBasis, responseBody);
  assert.deepEqual(documentArtifacts, responseBody);
  assert.deepEqual(documentArtifact, responseBody);
  assert.deepEqual(mediaAssets, responseBody);
  assert.deepEqual(mediaAsset, responseBody);
  assert.deepEqual(evidenceAssets, responseBody);
  assert.deepEqual(evidenceAsset, responseBody);
  assert.deepEqual(attachmentBindings, responseBody);
  assert.deepEqual(attachmentBinding, responseBody);
  assert.equal(calls.length, 12);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-concepts?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-concepts/csc-1');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/pricing-bases?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/pricing-bases/pb-1');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/document-artifacts?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/document-artifacts/da-1?tenant_id=tenant-a');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/media-assets?tenant_id=tenant-a');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/media-assets/ma-1?tenant_id=tenant-a');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/evidence-assets?tenant_id=tenant-a');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/runtime/evidence-assets/ea-1?tenant_id=tenant-a');
  assert.equal(String(calls[10]?.input), 'http://127.0.0.1:8787/runtime/attachment-bindings?tenant_id=tenant-a');
  assert.equal(String(calls[11]?.input), 'http://127.0.0.1:8787/runtime/attachment-bindings/ab-1?tenant_id=tenant-a');
  for (const call of calls) {
    assert.equal(call.init?.method, 'GET');
  }
});

test('BidviaClient account, presence, and authority truth-fetch reads guard the corrected runtime context before fetch', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const missingSessionClient = new BidviaClient({
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

  const missingPrincipalClient = new BidviaClient({
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

  await assert.rejects(async () => {
    await missingSessionClient.listAccountAgents();
  }, /sessionId is required for session routes/);
  await assert.rejects(async () => {
    await missingSessionClient.getAccountAgent('areg-1');
  }, /sessionId is required for session routes/);
  await assert.rejects(async () => {
    await missingSessionClient.listAccountAgentBindings();
  }, /sessionId is required for session routes/);
  await assert.rejects(async () => {
    await missingSessionClient.listAccountRecords();
  }, /sessionId is required for session routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentPresence('areg-1');
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await missingPrincipalClient.getAgentAuthority('areg-1');
  }, /principalId is required for governed read routes/);
  const missingTenantClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: '',
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
    await missingTenantClient.getAgentPresence('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAgentAuthority('areg-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listCanonicalSemanticConcepts();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getCanonicalSemanticConcept('csc-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listPricingBases();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getPricingBasis('pb-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listDocumentArtifacts();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getDocumentArtifact('da-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listMediaAssets();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getMediaAsset('ma-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listEvidenceAssets();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getEvidenceAsset('ea-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.listAttachmentBindings();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await missingTenantClient.getAttachmentBinding('ab-1');
  }, /tenantId is required for tenant-scoped read routes/);
  assert.equal(calls.length, 0);
});
