import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { BidviaClient } from '../src/client.ts';
import { runMachineCli } from '../src/machine-cli.ts';

const identity = { tenantId: 'tenant-cli', machinePrincipalId: 'machine-cli', agentRegistrationId: 'registration-cli', credentialVersion: 1 };
const secret = 's'.repeat(43);
const evidence = { evidenceRefs: ['evidence-cli'], evidenceDigests: ['a'.repeat(64)], idempotencyKey: 'request-cli' };
const issued = (version = 1) => ({ raw_credential: version === 1 ? secret : 'n'.repeat(43), credential: {
  tenant_id: identity.tenantId, machine_principal_id: identity.machinePrincipalId, agent_registration_id: identity.agentRegistrationId,
  machine_credential_id: 'credential-' + version, credential_version: version, status: 'ACTIVE',
  allowed_scopes: ['task:consume', 'proposal:submit'], expires_at: '2027-01-01T00:00:00.000Z' } });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function fixture(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'bidvia-machine-cli-'));
  try { await run(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

async function profile(directory: string) {
  const file = path.join(directory, 'profile.json');
  await writeFile(file, JSON.stringify({ schemaVersion: 1, baseUrl: 'http://127.0.0.1:8787', machineIdentity: identity,
    bearerToken: secret, expiresAt: issued().credential.expires_at }), { mode: 0o600 });
  return file;
}

test('enrollment SDK sends no ambient identity and validates the issued subject', async () => {
  let calls = 0;
  const client = new BidviaClient({ baseUrl: 'https://core.example.test', context: { tenantId: identity.tenantId }, fetchImpl: async (url, init) => {
    calls++;
    assert.equal(new URL(String(url)).pathname, '/machine/enrollment/exchange');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), null);
    assert.equal(headers.get('x-bidvia-machine-principal-id'), null);
    assert.deepEqual(JSON.parse(String(init?.body)), { tenant_id: identity.tenantId, machine_principal_id: identity.machinePrincipalId,
      agent_registration_id: identity.agentRegistrationId, enrollment_token: 't'.repeat(43), evidence_refs: evidence.evidenceRefs,
      evidence_digests: evidence.evidenceDigests, idempotency_key: evidence.idempotencyKey });
    return response(issued());
  } });
  assert.deepEqual(await client.machine.exchangeEnrollment({ ...identity, enrollmentToken: 't'.repeat(43), ...evidence }), issued());
  assert.equal(calls, 1);
  const mixed = new BidviaClient({ baseUrl: 'https://core.example.test', context: { tenantId: identity.tenantId },
    headers: async () => ({ Authorization: 'Bearer human' }), fetchImpl: async () => assert.fail('must not send') });
  await assert.rejects(mixed.machine.exchangeEnrollment({ ...identity, enrollmentToken: 't'.repeat(43), ...evidence }));
  const wrong = new BidviaClient({ baseUrl: 'https://core.example.test', context: { tenantId: identity.tenantId }, fetchImpl: async () =>
    response({ ...issued(), credential: { ...issued().credential, tenant_id: 'other' } }) });
  await assert.rejects(wrong.machine.exchangeEnrollment({ ...identity, enrollmentToken: 't'.repeat(43), ...evidence }), /identity/u);
});

test('CLI enrollment writes a private profile, never logs secrets and never overwrites it', async () => fixture(async directory => {
  const input = path.join(directory, 'enrollment.json');
  const output = path.join(directory, 'machine.json');
  await writeFile(input, JSON.stringify({ baseUrl: 'http://127.0.0.1:8787', ...identity, enrollmentToken: 't'.repeat(43), ...evidence }), { mode: 0o600 });
  const logs: unknown[] = [];
  let calls = 0;
  const dependencies = { env: {}, print: (value: unknown) => { logs.push(value); }, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) =>
    new BidviaClient({ ...options, fetchImpl: async () => { calls++; return response(issued()); } }) };
  const args = ['enroll', '--input', input, '--profile', output];
  assert.equal(await runMachineCli(args, dependencies), 0);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).bearerToken, secret);
  assert.equal(await runMachineCli(args, dependencies), 1);
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(logs).includes(secret), false);
  assert.equal(JSON.stringify(logs).includes('t'.repeat(43)), false);
}));

test('CLI start and status use only the selected profile and return canonical HTTP truth', async () => fixture(async directory => {
  const file = await profile(directory);
  const input = path.join(directory, 'start.json');
  await writeFile(input, JSON.stringify({ dispatchId: 'dispatch-cli', title: 'User title', summary: 'User summary', body: 'User content', ...evidence }));
  const receipt = { entry: { universe_evolution_run_id: 'run/cli', asset_proposal_id: 'proposal-cli', template_proposal_id: 'template-cli',
    governed_asset_id: 'asset-cli', task_ref: 'task-cli', dispatch_id: 'dispatch-cli', created_at: '2026-09-07T00:00:00.000Z' } };
  const status = { universe_evolution_run_id: 'run/cli', run_state: 'CHALLENGE_A', run_version: 3, current_checkpoint: 'checkpoint-propose-a',
    target_asset_publication_version_id: null, failure_code: null, updated_at: '2026-09-07T00:00:01.000Z' };
  const logs: unknown[] = [];
  const dependencies = { env: { BIDVIA_ADMIN_SESSION_ID: 'ambient-human-session', BIDVIA_BASE_URL: 'https://wrong.example.test' },
    print: (value: unknown) => { logs.push(value); }, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) => new BidviaClient({ ...options,
      fetchImpl: async (url, init) => {
        assert.equal(new URL(String(url)).origin, 'http://127.0.0.1:8787');
        assert.equal(new Headers(init?.headers).get('x-bidvia-admin-session-id'), null);
        assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer ' + secret);
        if (init?.method === 'GET') { assert.ok(String(url).endsWith('/runs/run%2Fcli')); return response(status); }
        assert.deepEqual(JSON.parse(String(init?.body)), { schema_version: 1, dispatch_id: 'dispatch-cli', title: 'User title', summary: 'User summary',
          body: 'User content', evidence_refs: evidence.evidenceRefs, evidence_digests: evidence.evidenceDigests, idempotency_key: evidence.idempotencyKey });
        return response(receipt);
      } }) };
  assert.equal(await runMachineCli(['start', '--profile', file, '--input', input], dependencies), 0);
  assert.equal(await runMachineCli(['status', '--profile', file, '--run-id', 'run/cli'], dependencies), 0);
  assert.deepEqual(logs, [receipt, status]);
}));

test('CLI rejects readable secrets, symlinks, malformed options and unsafe Core origins before sending', async () => fixture(async directory => {
  const file = await profile(directory);
  const dependencies = { env: {}, print: () => undefined, createClient: () => assert.fail('must not create client') };
  await chmod(file, 0o644);
  assert.equal(await runMachineCli(['credential', '--profile', file], dependencies), 1);
  await chmod(file, 0o600);
  const link = path.join(directory, 'link.json'); await symlink(file, link);
  assert.equal(await runMachineCli(['credential', '--profile', link], dependencies), 1);
  assert.equal(await runMachineCli(['credential', '--profile', file, '--profile', file], dependencies), 1);
  const value = JSON.parse(await readFile(file, 'utf8')); value.baseUrl = 'http://public.example.test';
  await writeFile(file, JSON.stringify(value));
  assert.equal(await runMachineCli(['credential', '--profile', file], dependencies), 1);
}));

test('CLI rotation replaces the profile atomically and redacts reflected response secrets', async () => fixture(async directory => {
  const file = await profile(directory);
  const input = path.join(directory, 'rotate.json'); await writeFile(input, JSON.stringify(evidence));
  const logs: unknown[] = [];
  const dependencies = { env: {}, print: (value: unknown) => { logs.push(value); }, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) =>
    new BidviaClient({ ...options, fetchImpl: async () => response(issued(2)) }) };
  assert.equal(await runMachineCli(['rotate', '--profile', file, '--input', input], dependencies), 0);
  assert.equal(JSON.parse(await readFile(file, 'utf8')).machineIdentity.credentialVersion, 2);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
  await assert.rejects(stat(file + '.lock'), { code: 'ENOENT' });
  const reflected = { ...dependencies, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) => new BidviaClient({ ...options,
    fetchImpl: async () => response({ note: 'reflected ' + issued(2).raw_credential, raw_credential: secret }) }) };
  assert.equal(await runMachineCli(['credential', '--profile', file], reflected), 0);
  const failed = { ...dependencies, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) => new BidviaClient({ ...options,
    fetchImpl: async () => response({ error: { message: secret } }, 403) }) };
  assert.equal(await runMachineCli(['credential', '--profile', file], failed), 1);
  assert.equal(JSON.stringify(logs).includes(secret), false);
  assert.equal(JSON.stringify(logs).includes(issued(2).raw_credential), false);
}));

test('CLI issuer sends the actual human session and writes only a private enrollment handoff', async () => fixture(async directory => {
  const input = path.join(directory, 'issue.json'); const output = path.join(directory, 'enrollment.json');
  await writeFile(input, JSON.stringify({ agentRegistrationId: identity.agentRegistrationId, requestedScopes: ['task:consume'], ...evidence }));
  const logs: unknown[] = [];
  const dependencies = { env: { BIDVIA_BASE_URL: 'https://core.example.test', BIDVIA_TENANT_ID: identity.tenantId, BIDVIA_ADMIN_SESSION_ID: 'admin-session-private' },
    print: (value: unknown) => { logs.push(value); }, createClient: (options: ConstructorParameters<typeof BidviaClient>[0]) => new BidviaClient({ ...options,
      fetchImpl: async (url, init) => {
        assert.equal(new Headers(init?.headers).get('x-bidvia-admin-session-id'), 'admin-session-private');
        assert.equal(new URL(String(url)).searchParams.get('tenant_id'), identity.tenantId);
        return response({ tenant_id: identity.tenantId, machine_principal_id: identity.machinePrincipalId, agent_registration_id: identity.agentRegistrationId,
          enrollment_token: 't'.repeat(43), expires_at: issued().credential.expires_at, allowed_scopes: ['task:consume'] });
      } }) };
  assert.equal(await runMachineCli(['issue-enrollment', '--input', input, '--output', output], dependencies), 0);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).enrollmentToken, 't'.repeat(43));
  assert.equal(JSON.stringify(logs).includes('t'.repeat(43)), false);
}));
