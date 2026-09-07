import assert from 'node:assert/strict';
import test from 'node:test';
import { BidviaClient } from '../src/client.ts';
import type { BidviaChemicalListingSpecification } from '../src/contracts.ts';

const spec: BidviaChemicalListingSpecification = { schema_version: 1, profile: 'CN_VN_SODA_ASH_RESEARCH_V1', export_country: 'CN', import_country: 'VN',
  cas: '497-19-8', grade: 'INDUSTRIAL', form: 'DENSE', package_net_kg: 50, dry_alkali_min_pct: 99.5, documents: [] };

test('chemical listing SDK sends structured goods, exact version and closed terms using admin-session authority', async () => {
  const calls: { url: string; body: Record<string, unknown>; headers: Headers }[] = [];
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: {
    tenantId: 'tenant-a', companyId: 'company-a', principalId: 'actor-a', adminSessionId: 'local-admin',
  }, fetchImpl: async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } });
  await client.createListing({ listingId: 'chemical/one', listingType: 'supply', category: 'industrial-chemicals', sku: 'CN-SODA-DENSE-IND-50KG',
    quantityValue: '20000', quantityUnit: 'kg', regionSummary: 'TEST pickup', verificationStatus: 'unverified', freshnessTs: '2026-09-07T00:00:00Z',
    traceId: 'trace', idempotencyKey: 'create', now: '2026-09-07T00:00:00Z', chemicalSpecification: spec });
  await client.updateListing({ listingId: 'chemical/one', quantityValue: '21000', idempotencyKey: 'update', now: '2026-09-07T00:01:00Z' });
  const commercialTerms = { indicative_usd_cents_per_mt: 25000, seller_legal_name: null, buyer_legal_name: null, named_delivery_point: null,
    payment_terms: null, shipment_window: null, governing_law_and_cisg: null, dispute_resolution: null };
  await client.previewChemicalQuotation({ listingId: 'chemical/one', expectedListingVersion: 2, commercialTerms });
  assert.deepEqual(calls[0].body.chemical_specification, spec);
  assert.equal('chemical_specification' in calls[1].body, false);
  assert.deepEqual(calls[2].body, { expected_listing_version: 2, commercial_terms: commercialTerms });
  assert.match(calls[2].url, /chemical%2Fone\/chemical-quotation-preview\?tenant_id=tenant-a$/);
  for (const call of calls) {
    assert.equal(call.headers.get('x-bidvia-admin-session-id'), 'local-admin');
    assert.equal(call.headers.has('x-bidvia-principal-id'), false);
    assert.equal(call.headers.has('x-authorized-tenant-id'), false);
  }
});

test('chemical preview SDK requires an admin session before network access', async () => {
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant-a' }, fetchImpl: async () => { throw new Error('network must not run'); } });
  await assert.rejects(client.previewChemicalQuotation({ listingId: 'one', expectedListingVersion: 1, commercialTerms: {
    indicative_usd_cents_per_mt: null, seller_legal_name: null, buyer_legal_name: null, named_delivery_point: null,
    payment_terms: null, shipment_window: null, governing_law_and_cisg: null, dispute_resolution: null,
  } }), /adminSessionId is required/);
});
