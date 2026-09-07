import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { BidviaClient } from '../src/client.ts';
import type { BidviaChemicalDocumentUploadInput } from '../src/chemical-documents.ts';

const bytes = Buffer.from('TEST original bytes \u0000\u00ff');
const digest = createHash('sha256').update(bytes).digest('hex');
const input: BidviaChemicalDocumentUploadInput = { expected_listing_version: 2, idempotency_key: 'test', kind: 'COA', data_class: 'TEST_FIXTURE',
  file_name: 'TEST.txt', media_type: 'text/plain', content_base64: bytes.toString('base64'), issuer_name: 'TEST issuer', issued_on: '2026-09-07', expires_on: null,
  source_reference: 'local:test', claims: { cas: '497-19-8', grade: 'INDUSTRIAL', form: 'DENSE', dry_alkali_pct: 99.5, lot_number: 'TEST-LOT' } };

test('document helpers use admin-only authority, escaped paths and preserve verified original bytes', async () => {
  const calls: { path: string; method: string | undefined; headers: Headers; body: unknown }[] = [];
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant-a', adminSessionId: 'local-admin' },
    fetchImpl: async (url, init) => {
      calls.push({ path: String(url), method: init?.method, headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return String(url).includes('/original?') ? new Response(bytes, { headers: { 'content-type': 'application/octet-stream', 'x-bidvia-content-sha256': digest } })
        : new Response('{}', { headers: { 'content-type': 'application/json' } });
    } });
  await client.uploadChemicalDocument('listing/one', input);
  await client.getChemicalDocumentDossier('listing/one');
  await client.getChemicalDocument('listing/one', 'doc/one');
  await client.reviewChemicalDocument('listing/one', 'doc/one', { expected_listing_version: 2, content_sha256: digest, idempotency_key: 'review',
    decision: 'REJECTED', rationale: 'TEST rejection', checks: { source_authenticity: false, specification: true, currency: true, batch_traceability: true } });
  assert.deepEqual(await client.downloadChemicalDocument('listing/one', 'doc/one'), { content_base64: input.content_base64, content_sha256: digest });
  assert.deepEqual(calls[0].body, input); assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].body, undefined);
  assert.match(calls[2].path, /listing%2Fone\/chemical-documents\/doc%2Fone\?tenant_id=tenant-a$/);
  assert.match(calls[3].path, /listing%2Fone\/chemical-documents\/doc%2Fone\/review\?tenant_id=tenant-a$/);
  for (const call of calls) { assert.equal(call.headers.get('x-bidvia-admin-session-id'), 'local-admin'); assert.equal(call.headers.has('x-bidvia-principal-id'), false); }
});

test('original download refuses corrupt bytes and preserves JSON Core errors on binary route', async () => {
  const corrupt = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant-a', adminSessionId: 'admin' },
    fetchImpl: async () => new Response(bytes, { headers: { 'x-bidvia-content-sha256': 'a'.repeat(64) } }) });
  await assert.rejects(corrupt.downloadChemicalDocument('listing', 'doc'), /integrity check/);
  const forbidden = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant-a', adminSessionId: 'admin' },
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'listing_not_found' } }), { status: 404 }) });
  await assert.rejects(forbidden.downloadChemicalDocument('listing', 'doc'), (error: unknown) => {
    assert.ok(error instanceof Error); assert.equal(Reflect.get(error, 'status'), 404);
    assert.deepEqual(Reflect.get(error, 'responseBody'), { error: { code: 'listing_not_found' } }); return true;
  });
});

test('document upload refuses absent admin session without network access', async () => {
  const client = new BidviaClient({ baseUrl: 'http://127.0.0.1:8787', context: { tenantId: 'tenant-a' }, fetchImpl: async () => { throw new Error('Network must not run'); } });
  await assert.rejects(client.uploadChemicalDocument('listing', input), /adminSessionId is required/);
});
