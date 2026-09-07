import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BidviaClient } from '../src/client.js';
import type { BidviaChemicalDecisionInput, BidviaChemicalOfferInput, BidviaChemicalRfqInput } from '../src/chemical-trade.js';

function required(key: string): string { const value = process.env[key]; if (!value) throw new Error(`${key} is required`); return value; }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected JSON object');
  return value as Record<string, unknown>;
}
async function input(path: string) { return object(JSON.parse(await readFile(path, 'utf8'))); }

/** Executes one explicit role action. Never accepts a quote automatically. */
export async function runChemicalTrade(args: string[]): Promise<unknown> {
  const [operation, id, path] = args;
  const baseUrl = required('BIDVIA_CHEMICAL_BASE_URL');
  if (!['localhost','127.0.0.1','[::1]'].includes(new URL(baseUrl).hostname)) throw new Error('This draft example is loopback-only');
  const client = new BidviaClient({ baseUrl, context: { tenantId: required('BIDVIA_CHEMICAL_TENANT_ID'), adminSessionId: required('BIDVIA_CHEMICAL_ADMIN_SESSION_ID') } });
  if (operation === 'create' && id && args.length === 2) return client.createChemicalRfq(await input(id) as unknown as BidviaChemicalRfqInput);
  if (operation === 'offer' && id && path && args.length === 3) return client.offerChemicalRfq(id, await input(path) as unknown as BidviaChemicalOfferInput);
  if (operation === 'decide' && id && path && args.length === 3) return client.decideChemicalRfq(id, await input(path) as unknown as BidviaChemicalDecisionInput);
  if (operation === 'list' && args.length <= 2) return client.listChemicalRfqs(id);
  if (operation === 'get' && id && args.length === 2) return client.getChemicalRfq(id);
  if (operation === 'export' && id && path && args.length === 3) {
    const result = object(await client.getChemicalRfq(id)); const contract = object(result.contract);
    if (contract.status !== 'DRAFT_REVIEW_ONLY' || contract.can_sign !== false || contract.can_ship !== false || typeof contract.contract_markdown !== 'string'
      || createHash('sha256').update(contract.contract_markdown).digest('hex') !== contract.contract_sha256) throw new Error('Invalid retained draft or digest');
    await writeFile(path, contract.contract_markdown, { flag: 'wx', mode: 0o600 });
    return { output: path, contract_sha256: contract.contract_sha256, overwritten: false, can_sign: false, can_ship: false };
  }
  throw new Error('Usage: create INPUT_JSON | offer RFQ INPUT_JSON | decide RFQ INPUT_JSON | list [AFTER] | get RFQ | export RFQ NEW_MARKDOWN');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await runChemicalTrade(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Draft trade action failed'); process.exitCode = 1; }
}
