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

test('BidviaClient broader semantic, pricing, and asset truth-fetch reads use frozen GET routes as thin wrappers', async () => {
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

  const canonicalSemanticLabels = await client.listCanonicalSemanticLabels();
  const canonicalSemanticLabel = await client.getCanonicalSemanticLabel('label-1');
  const canonicalSemanticMappings = await client.listCanonicalSemanticMappings();
  const canonicalSemanticMapping = await client.getCanonicalSemanticMapping('mapping-1');
  const canonicalSemanticTaxonomyEntries = await client.listCanonicalSemanticTaxonomyEntries();
  const canonicalSemanticTaxonomyEntry = await client.getCanonicalSemanticTaxonomyEntry('taxonomy-1');
  const canonicalSemanticLineageLinks = await client.listCanonicalSemanticLineageLinks();
  const canonicalSemanticLineageLink = await client.getCanonicalSemanticLineageLink('lineage-1');
  const pricingRuleAtoms = await client.listPricingRuleAtoms();
  const pricingRuleAtom = await client.getPricingRuleAtom('rule-1');
  const pricingQuotationMethodModules = await client.listPricingQuotationMethodModules();
  const pricingQuotationMethodModule = await client.getPricingQuotationMethodModule('module-1');
  const pricingQuoteTemplates = await client.listPricingQuoteTemplates();
  const pricingQuoteTemplate = await client.getPricingQuoteTemplate('template-1');
  const pricingQuotations = await client.listPricingQuotations();
  const pricingQuotation = await client.getPricingQuotation('quotation-1');
  const pricingExplanations = await client.listPricingExplanations();
  const pricingExplanation = await client.getPricingExplanation('explanation-1');
  const fileResources = await client.listFileResources();
  const fileResource = await client.getFileResource('file-1');
  const targetAttachmentBindings = await client.listTargetAttachmentBindings('target://listing/1');

  assert.deepEqual(canonicalSemanticLabels, responseBody);
  assert.deepEqual(canonicalSemanticLabel, responseBody);
  assert.deepEqual(canonicalSemanticMappings, responseBody);
  assert.deepEqual(canonicalSemanticMapping, responseBody);
  assert.deepEqual(canonicalSemanticTaxonomyEntries, responseBody);
  assert.deepEqual(canonicalSemanticTaxonomyEntry, responseBody);
  assert.deepEqual(canonicalSemanticLineageLinks, responseBody);
  assert.deepEqual(canonicalSemanticLineageLink, responseBody);
  assert.deepEqual(pricingRuleAtoms, responseBody);
  assert.deepEqual(pricingRuleAtom, responseBody);
  assert.deepEqual(pricingQuotationMethodModules, responseBody);
  assert.deepEqual(pricingQuotationMethodModule, responseBody);
  assert.deepEqual(pricingQuoteTemplates, responseBody);
  assert.deepEqual(pricingQuoteTemplate, responseBody);
  assert.deepEqual(pricingQuotations, responseBody);
  assert.deepEqual(pricingQuotation, responseBody);
  assert.deepEqual(pricingExplanations, responseBody);
  assert.deepEqual(pricingExplanation, responseBody);
  assert.deepEqual(fileResources, responseBody);
  assert.deepEqual(fileResource, responseBody);
  assert.deepEqual(targetAttachmentBindings, responseBody);
  assert.equal(calls.length, 21);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-labels?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-labels/label-1');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-mappings?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-mappings/mapping-1');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-taxonomy-entries?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-taxonomy-entries/taxonomy-1');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-lineage-links?tenant_id=tenant-a');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/canonical-semantic-lineage-links/lineage-1');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/pricing-rule-atoms?tenant_id=tenant-a');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/runtime/pricing-rule-atoms/rule-1');
  assert.equal(String(calls[10]?.input), 'http://127.0.0.1:8787/runtime/pricing-quotation-method-modules?tenant_id=tenant-a');
  assert.equal(String(calls[11]?.input), 'http://127.0.0.1:8787/runtime/pricing-quotation-method-modules/module-1');
  assert.equal(String(calls[12]?.input), 'http://127.0.0.1:8787/runtime/pricing-quote-templates?tenant_id=tenant-a');
  assert.equal(String(calls[13]?.input), 'http://127.0.0.1:8787/runtime/pricing-quote-templates/template-1');
  assert.equal(String(calls[14]?.input), 'http://127.0.0.1:8787/runtime/pricing-quotations?tenant_id=tenant-a');
  assert.equal(String(calls[15]?.input), 'http://127.0.0.1:8787/runtime/pricing-quotations/quotation-1');
  assert.equal(String(calls[16]?.input), 'http://127.0.0.1:8787/runtime/pricing-explanations?tenant_id=tenant-a');
  assert.equal(String(calls[17]?.input), 'http://127.0.0.1:8787/runtime/pricing-explanations/explanation-1');
  assert.equal(String(calls[18]?.input), 'http://127.0.0.1:8787/runtime/file-resources?tenant_id=tenant-a');
  assert.equal(String(calls[19]?.input), 'http://127.0.0.1:8787/runtime/file-resources/file-1');
  assert.equal(
    String(calls[20]?.input),
    'http://127.0.0.1:8787/runtime/targets/target%3A%2F%2Flisting%2F1/attachment-bindings?tenant_id=tenant-a',
  );
  for (const call of calls) {
    assert.equal(call.init?.method, 'GET');
    const headers = call.init?.headers as Record<string, string>;
    assert.equal(headers['x-authorized-tenant-id'], 'tenant-a');
    assert.equal(headers['x-bidvia-principal-id'], 'operator-system');
    assert.equal(headers['x-bidvia-principal-type'], 'system');
    assert.equal(headers['x-authorized-role'], 'operator_admin');
    assert.equal(headers['x-authorized-company-id'], 'company-a');
    assert.equal(headers['x-bidvia-admin-session-id'], 'admin-session-1');
  }
});

test('BidviaClient broader semantic, pricing, and asset truth-fetch reads guard governed principal context before fetch', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: '',
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
    await client.listCanonicalSemanticLabels();
  }, /tenantId is required for tenant-scoped read routes/);

  const clientMissingPrincipal = new BidviaClient({
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
    await clientMissingPrincipal.listCanonicalSemanticLabels();
  }, /principalId is required for governed read routes/);
  await assert.rejects(async () => {
    await client.getCanonicalSemanticLabel('label-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listCanonicalSemanticMappings();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getCanonicalSemanticMapping('mapping-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listCanonicalSemanticTaxonomyEntries();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getCanonicalSemanticTaxonomyEntry('taxonomy-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listCanonicalSemanticLineageLinks();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getCanonicalSemanticLineageLink('lineage-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listPricingRuleAtoms();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getPricingRuleAtom('rule-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listPricingQuotationMethodModules();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getPricingQuotationMethodModule('module-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listPricingQuoteTemplates();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getPricingQuoteTemplate('template-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listPricingQuotations();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getPricingQuotation('quotation-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listPricingExplanations();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getPricingExplanation('explanation-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listFileResources();
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.getFileResource('file-1');
  }, /tenantId is required for tenant-scoped read routes/);
  await assert.rejects(async () => {
    await client.listTargetAttachmentBindings('target://listing/1');
  }, /tenantId is required for tenant-scoped read routes/);
  assert.equal(calls.length, 0);
});

test('BidviaClient governed reads include the full mixed-auth principal context when provided', async () => {
  const responseBody = { items: [{ id: 'concept-1' }] };
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

  await client.listCanonicalSemanticConcepts();

  assert.equal(calls.length, 1);
  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(headers['x-bidvia-principal-id'], 'operator-system');
  assert.equal(headers['x-bidvia-principal-type'], 'system');
  assert.equal(headers['x-authorized-role'], 'operator_admin');
  assert.equal(headers['x-authorized-company-id'], 'company-a');
  assert.equal(headers['x-bidvia-admin-session-id'], 'admin-session-1');
});
