import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { BidviaClient } from '../src/client.ts';
import type { BidviaChemicalOfferInput, BidviaChemicalRfqInput } from '../src/chemical-trade.ts';

const request: BidviaChemicalRfqInput = { idempotency_key: 'rfq-key', demand_listing_id: 'demand', supply_listing_id: 'supply', expected_demand_version: 1,
  expected_supply_version: 2, buyer_legal_name: 'TEST buyer', request_note: 'TEST request', data_class: 'TEST_FIXTURE' };
const offer: BidviaChemicalOfferInput = { idempotency_key: 'offer-key', expected_rfq_version: 1, pricing_basis_id: 'basis', usd_cents_per_mt: 25000,
  seller_legal_name: 'TEST seller', named_delivery_point: 'TEST port', payment_terms: 'TEST terms', shipment_window: 'TEST window', governing_law_and_cisg: null,
  dispute_resolution: null, valid_until: '2026-09-08T00:00:00.000Z', share_documents_with_buyer: true };

test('bilateral draft helpers use admin-only authority, escape identifiers, preserve explicit decisions and verify shared bytes', async () => {
  const calls: { url: string; body: unknown; headers: Headers }[] = [];
  const bytes = Buffer.from('TEST shared original'); const digest = createHash('sha256').update(bytes).digest('hex');
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant', adminSessionId: 'admin', principalId: 'not-authority', companyId: 'not-authority' },
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: init?.body ? JSON.parse(String(init.body)) : null, headers: new Headers(init?.headers) });
      return String(url).includes('/original?') ? new Response(bytes, { headers: { 'x-bidvia-content-sha256': digest } }) : new Response('{}');
    } });
  await client.createChemicalRfq(request); await client.offerChemicalRfq('rfq/one', offer);
  await client.decideChemicalRfq('rfq/one', { idempotency_key: 'decision', expected_rfq_version: 2, offer_id: 'offer/one', offer_digest: 'a'.repeat(64), decision: 'REJECT', rationale: 'Explicit price rejection' });
  await client.getChemicalRfq('rfq/one'); await client.listChemicalRfqs('cursor&one');
  assert.deepEqual(await client.downloadChemicalOfferDocument('rfq/one','offer/one','doc/one'), { content_base64: bytes.toString('base64'), content_sha256: digest });
  assert.deepEqual(calls[0].body, request); assert.deepEqual(calls[1].body, offer);
  assert.match(calls[1].url, /rfq%2Fone\/offers\?tenant_id=tenant$/);
  assert.equal(Reflect.get(calls[2].body as object, 'decision'), 'REJECT');
  assert.match(calls[4].url, /after=cursor%26one$/);
  assert.match(calls[5].url, /rfq%2Fone\/offers\/offer%2Fone\/documents\/doc%2Fone\/original/);
  for (const call of calls) { assert.equal(call.headers.get('x-bidvia-admin-session-id'), 'admin'); assert.equal(call.headers.has('x-bidvia-principal-id'), false); }
});

test('draft helpers refuse missing admin session before any network request', async () => {
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant' }, fetchImpl: async () => { throw new Error('No network allowed'); } });
  await assert.rejects(client.createChemicalRfq(request), /adminSessionId is required/);
  await assert.rejects(client.offerChemicalRfq('one', offer), /adminSessionId is required/);
  await assert.rejects(client.getChemicalRfq('one'), /adminSessionId is required/);
});
