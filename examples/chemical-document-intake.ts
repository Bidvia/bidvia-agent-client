import { readFile, stat, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BidviaClient } from '../src/client.js';
import type { BidviaChemicalDocumentReviewInput, BidviaChemicalDocumentUploadInput } from '../src/chemical-documents.js';

function required(name: string): string {
  const value = process.env[name]; if (!value) throw new Error(`${name} is required`); return value;
}
async function metadata(path: string): Promise<Record<string, unknown>> {
  const input: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Metadata must be a JSON object');
  return input as Record<string, unknown>;
}

/** Local operator example; Core validates all metadata and review authority. */
export async function runDocumentIntake(args: string[]): Promise<unknown> {
  const [operation, listingId, third, fourth] = args;
  if (!listingId) throw new Error('Usage: upload LISTING METADATA_JSON ORIGINAL | review LISTING DOCUMENT REVIEW_JSON | dossier LISTING | detail LISTING DOCUMENT | download LISTING DOCUMENT NEW_OUTPUT');
  const baseUrl = required('BIDVIA_CHEMICAL_BASE_URL');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) throw new Error('This feature-branch example is loopback-only');
  const client = new BidviaClient({ baseUrl, context: { tenantId: required('BIDVIA_CHEMICAL_TENANT_ID'), adminSessionId: required('BIDVIA_CHEMICAL_ADMIN_SESSION_ID') } });
  if (operation === 'upload' && third && fourth && args.length === 4) {
    if ((await stat(fourth)).size > 524288) throw new Error('Original file exceeds 512 KiB');
    const fields = await metadata(third);
    if ('content_base64' in fields) throw new Error('Upload metadata must omit content_base64; original bytes come only from the file');
    const input = { ...fields, content_base64: (await readFile(fourth)).toString('base64') } as unknown as BidviaChemicalDocumentUploadInput;
    return client.uploadChemicalDocument(listingId, input);
  }
  if (operation === 'review' && third && fourth && args.length === 4) {
    return client.reviewChemicalDocument(listingId, third, await metadata(fourth) as unknown as BidviaChemicalDocumentReviewInput);
  }
  if (operation === 'dossier' && args.length === 2) return client.getChemicalDocumentDossier(listingId);
  if (operation === 'detail' && third && args.length === 3) return client.getChemicalDocument(listingId, third);
  if (operation === 'download' && third && fourth && args.length === 4) {
    const result: unknown = await client.downloadChemicalDocument(listingId, third);
    if (!result || typeof result !== 'object' || typeof Reflect.get(result, 'content_base64') !== 'string') throw new Error('Invalid original download');
    await writeFile(fourth, Buffer.from(Reflect.get(result, 'content_base64'), 'base64'), { flag: 'wx', mode: 0o600 });
    return { output: fourth, content_sha256: Reflect.get(result, 'content_sha256'), overwritten: false };
  }
  throw new Error('Invalid operation or argument count');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await runDocumentIntake(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Document intake failed'); process.exitCode = 1; }
}
