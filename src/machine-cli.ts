import { constants } from 'node:fs';
import { lstat, open, readFile, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { BidviaClient, BidviaClientTransportError } from './client.js';
import { parseMachineIssuedCredential } from './machine-credentials.js';
import type { BidviaMachineIssuedCredential } from './machine-credentials.js';
import type { BidviaMachineIdentity } from './machine-universe.js';

interface MachineProfile {
  schemaVersion: 1;
  baseUrl: string;
  machineIdentity: BidviaMachineIdentity;
  bearerToken: string;
  expiresAt: string;
}

interface MachineCliDependencies {
  env: NodeJS.ProcessEnv;
  print(value: unknown): void;
  createClient?: (options: ConstructorParameters<typeof BidviaClient>[0]) => BidviaClient;
}

class MachineCliInputError extends Error {}
function invalid(message: string): never { throw new MachineCliInputError(message); }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Input must be a JSON object.');
  return value as Record<string, unknown>;
}
function text(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || !value.trim()) invalid(`Missing or invalid ${key}.`);
  return value;
}
function strings(input: Record<string, unknown>, key: string): string[] {
  const value = input[key];
  if (!Array.isArray(value) || value.length === 0 || !value.every(item => typeof item === 'string' && item.trim())) invalid(`Missing or invalid ${key}.`);
  return value as string[];
}
function evidence(input: Record<string, unknown>) {
  return { evidenceRefs: strings(input, 'evidenceRefs'), evidenceDigests: strings(input, 'evidenceDigests'), idempotencyKey: text(input, 'idempotencyKey') };
}
function baseUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
    || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    invalid('Use an explicit HTTPS Core origin, or HTTP on loopback for local development.');
  }
  return url.origin;
}

async function inputFile(file: string, secret = false): Promise<Record<string, unknown>> {
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 150_000) invalid('Input must be a regular JSON file smaller than 150 KB.');
    if (secret && ((stat.mode & 0o077) !== 0 || (process.getuid && stat.uid !== process.getuid()))) {
      invalid('Secret files must be owned by this user and have permissions 0600.');
    }
    return record(JSON.parse(await handle.readFile('utf8')));
  } finally { await handle.close(); }
}

async function writeSecret(file: string, value: unknown): Promise<void> {
  const handle = await open(file, 'wx', 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); }
  finally { await handle.close(); }
}

async function assertNewFile(file: string): Promise<void> {
  try { await lstat(file); }
  catch (error) { if (typeof error === 'object' && error !== null && Reflect.get(error, 'code') === 'ENOENT') return; throw error; }
  invalid('Output already exists; choose a new path. Existing credentials are never overwritten by enrollment.');
}

function profileFrom(base: string, issued: BidviaMachineIssuedCredential): MachineProfile {
  return { schemaVersion: 1, baseUrl: base, machineIdentity: { tenantId: issued.credential.tenant_id,
    machinePrincipalId: issued.credential.machine_principal_id, agentRegistrationId: issued.credential.agent_registration_id,
    credentialVersion: issued.credential.credential_version }, bearerToken: issued.raw_credential, expiresAt: issued.credential.expires_at };
}

async function loadProfile(file: string): Promise<MachineProfile> {
  const value = await inputFile(file, true);
  if (value.schemaVersion !== 1) invalid('Unsupported machine profile version.');
  const identity = record(value.machineIdentity);
  const result: MachineProfile = { schemaVersion: 1, baseUrl: baseUrl(text(value, 'baseUrl')),
    machineIdentity: { tenantId: text(identity, 'tenantId'), machinePrincipalId: text(identity, 'machinePrincipalId'),
      agentRegistrationId: text(identity, 'agentRegistrationId'), credentialVersion: Number(identity.credentialVersion) },
    bearerToken: text(value, 'bearerToken'), expiresAt: text(value, 'expiresAt') };
  if (!Number.isSafeInteger(result.machineIdentity.credentialVersion) || result.machineIdentity.credentialVersion < 1
    || !/^[A-Za-z0-9_-]{32,}$/u.test(result.bearerToken) || !Number.isFinite(Date.parse(result.expiresAt))) invalid('Invalid machine credential profile.');
  // Expiry is enforced by Core; an exact rotation retry may need the old local
  // profile after an earlier response/write failure. Never invent a local grant.
  return result;
}

const commands = ['issue-enrollment', 'enroll', 'credential', 'rotate', 'dispatches', 'start', 'status', 'consume', 'report', 'confirm', 'approve', 'propose'] as const;
const help = {
  usage: 'bidvia machine <command> --profile /absolute/private/profile.json [--input request.json] [--run-id ID]',
  commands,
  enrollment: 'issue-enrollment --input request.json --output /private/enrollment.json; enroll --input /private/enrollment.json --profile /private/machine.json',
  boundary: 'Uses the selected Core through HTTP. No database access, fixture creation, automatic confirmation, or local workflow authority.',
};

export async function runMachineCli(argv: string[], dependencies: MachineCliDependencies): Promise<number> {
  const { env } = dependencies;
  const secrets = new Set<string>([env.BIDVIA_ADMIN_SESSION_ID ?? ''].filter(value => value.length >= 16));
  const print = (value: unknown): void => dependencies.print(JSON.parse(JSON.stringify(value, (key, item: unknown) => {
    if (/^(?:raw_credential|credential_hash|enrollment_token|enrollmentToken|bearerToken|authorization|password)$/u.test(key)) return '[REDACTED]';
    if (typeof item !== 'string') return item;
    let safe = item;
    for (const secret of secrets) safe = safe.replaceAll(secret, '[REDACTED]');
    return safe;
  })));
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === 'help') { print(help); return 0; }
  let lockFile: string | undefined;
  try {
    const action = argv[0];
    if (!commands.some(command => command === action)) invalid('Unknown machine command; run bidvia machine --help.');
    const flags: Record<string, string> = {};
    for (let index = 1; index < argv.length; index += 2) {
      const key = argv[index];
      const value = argv[index + 1];
      if (!['--profile', '--input', '--output', '--run-id'].includes(key) || !value || value.startsWith('--') || flags[key]) invalid('Invalid, duplicate or missing command option.');
      flags[key] = value;
    }
    const allowed = action === 'issue-enrollment' ? ['--input', '--output'] : action === 'enroll' ? ['--input', '--profile']
      : action === 'status' ? ['--profile', '--run-id'] : ['credential', 'dispatches'].includes(action) ? ['--profile'] : ['--profile', '--input'];
    if (Object.keys(flags).some(key => !allowed.includes(key))) invalid('Unsupported option for this machine command.');
    const requiredFlag = (key: string): string => flags[key] || invalid(`Missing ${key}.`);
    const createClient = dependencies.createClient ?? (options => new BidviaClient(options));
    const input = flags['--input'] ? await inputFile(flags['--input'], action === 'enroll') : {};
    if (action === 'issue-enrollment') {
      const output = path.resolve(requiredFlag('--output'));
      await assertNewFile(output);
      const base = baseUrl(env.BIDVIA_BASE_URL || invalid('Set BIDVIA_BASE_URL explicitly.'));
      const tenantId = env.BIDVIA_TENANT_ID || invalid('Set BIDVIA_TENANT_ID.');
      const adminSessionId = env.BIDVIA_ADMIN_SESSION_ID || invalid('Set BIDVIA_ADMIN_SESSION_ID from operator login.');
      const client = createClient({ baseUrl: base, context: { tenantId, adminSessionId }, requestPolicy: { timeoutMs: 30_000 } });
      const ev = evidence(input);
      const issued = await client.issueMachineEnrollment({ agentRegistrationId: text(input, 'agentRegistrationId'),
        requestedScopes: strings(input, 'requestedScopes'), ...ev });
      secrets.add(issued.enrollment_token);
      await writeSecret(output, { baseUrl: base, tenantId: issued.tenant_id, machinePrincipalId: issued.machine_principal_id,
        agentRegistrationId: issued.agent_registration_id, enrollmentToken: issued.enrollment_token,
        evidenceRefs: ev.evidenceRefs, evidenceDigests: ev.evidenceDigests, idempotencyKey: ev.idempotencyKey + ':exchange' });
      print({ enrollmentFile: output, expiresAt: issued.expires_at, agentRegistrationId: issued.agent_registration_id });
      return 0;
    }
    const profileFile = path.resolve(requiredFlag('--profile'));
    if (action === 'enroll') {
      await assertNewFile(profileFile);
      const base = baseUrl(text(input, 'baseUrl'));
      const tenantId = text(input, 'tenantId');
      secrets.add(text(input, 'enrollmentToken'));
      const client = createClient({ baseUrl: base, context: { tenantId }, requestPolicy: { timeoutMs: 30_000 } });
      const issued = await client.machine.exchangeEnrollment({ tenantId, machinePrincipalId: text(input, 'machinePrincipalId'),
        agentRegistrationId: text(input, 'agentRegistrationId'), enrollmentToken: text(input, 'enrollmentToken'), ...evidence(input) });
      secrets.add(issued.raw_credential);
      await writeSecret(profileFile, profileFrom(base, issued));
      print({ profileFile, credentialVersion: issued.credential.credential_version, expiresAt: issued.credential.expires_at });
      return 0;
    }
    if (action === 'rotate') {
      const candidate = profileFile + '.lock';
      const lock = await open(candidate, 'wx', 0o600);
      lockFile = candidate;
      await lock.close();
    }
    const profile = await loadProfile(profileFile);
    secrets.add(profile.bearerToken);
    const client = createClient({ baseUrl: profile.baseUrl, context: { tenantId: profile.machineIdentity.tenantId },
      machineIdentity: profile.machineIdentity, auth: { bearerToken: profile.bearerToken }, requestPolicy: { timeoutMs: 30_000 } });
    let result: unknown;
    switch (action) {
      case 'credential': result = await client.machine.credentialStatus(); break;
      case 'dispatches': result = await client.machine.listDispatches(); break;
      case 'status': result = await client.machineUniverse.getRun(requiredFlag('--run-id')); break;
      case 'start': result = await client.machineUniverse.startRun({ dispatchId: text(input, 'dispatchId'), title: text(input, 'title'),
        summary: text(input, 'summary'), body: text(input, 'body'), ...evidence(input) }); break;
      case 'consume': result = await client.machineUniverse.consume({ retrievalResultSetRef: text(input, 'retrievalResultSetRef'),
        consumptionPurpose: text(input, 'consumptionPurpose'), idempotencyKey: text(input, 'idempotencyKey') }); break;
      case 'report': {
        const outcome = text(input, 'outcomeState');
        if (outcome !== 'COMPLETED' && outcome !== 'FAILED') invalid('outcomeState must be COMPLETED or FAILED.');
        result = await client.machineUniverse.reportOutcome({ dispatchId: text(input, 'dispatchId'), outcomeState: outcome,
          outcomeRef: input.outcomeRef === null ? null : text(input, 'outcomeRef'), reason: text(input, 'reason'),
          reportedOutcomeId: text(input, 'reportedOutcomeId'), taskRef: text(input, 'taskRef'),
          retrievalConsumptionRef: text(input, 'retrievalConsumptionRef'), assetPublicationVersionId: text(input, 'assetPublicationVersionId'),
          professionalScenarioRef: text(input, 'professionalScenarioRef'), lineageRefs: strings(input, 'lineageRefs'), ...evidence(input) }); break;
      }
      case 'confirm': {
        const decision = text(input, 'decision');
        if (decision !== 'CONFIRM' && decision !== 'REJECT') invalid('decision must be CONFIRM or REJECT.');
        result = await client.machineUniverse.confirmOutcome({ reportedOutcomeId: text(input, 'reportedOutcomeId'), decision, ...evidence(input) }); break;
      }
      case 'approve': result = await client.machineUniverse.approveContribution({ reportedOutcomeRef: text(input, 'reportedOutcomeRef'),
        contributionFamily: 'UNIVERSE_CONSTRUCTION', ...evidence(input) }); break;
      case 'propose': {
        const revision = input.expectedRetrievalPolicyRevision;
        if (!Number.isSafeInteger(revision) || Number(revision) < 1) invalid('Invalid expectedRetrievalPolicyRevision.');
        result = await client.machineUniverse.submitSuccessorProposal({ universeEvolutionRunId: text(input, 'universeEvolutionRunId'),
          contributionAdmissionId: text(input, 'contributionAdmissionId'), continuationId: text(input, 'continuationId'),
          assetPublicationVersionId: text(input, 'assetPublicationVersionId'), professionalScenarioRef: text(input, 'professionalScenarioRef'),
          targetTemplateFamily: 'CHEMICAL_MATCH_RULE_TEMPLATE', expectedRetrievalPolicyEvaluationId: text(input, 'expectedRetrievalPolicyEvaluationId'),
          expectedRetrievalPolicyRevision: Number(revision), assignmentAcceptanceIdempotencyKey: text(input, 'assignmentAcceptanceIdempotencyKey'),
          governanceQualityEvidenceRefs: strings(input, 'governanceQualityEvidenceRefs'), governanceQualityEvidenceDigests: strings(input, 'governanceQualityEvidenceDigests'),
          title: text(input, 'title'), summary: text(input, 'summary'), body: text(input, 'body'), idempotencyKey: text(input, 'idempotencyKey') }); break;
      }
      case 'rotate': {
        const before = await readFile(profileFile, 'utf8');
        const issued = await client.machine.rotateCredential(evidence(input));
        secrets.add(issued.raw_credential);
        parseMachineIssuedCredential(issued, profile.machineIdentity);
        if (await readFile(profileFile, 'utf8') !== before) invalid('Profile changed concurrently; keep this rotation idempotency key for recovery.');
        const temporary = profileFile + '.' + randomUUID() + '.tmp';
        await writeSecret(temporary, profileFrom(profile.baseUrl, issued));
        try { await rename(temporary, profileFile); }
        catch (error) { await unlink(temporary); throw error; }
        result = { profileFile, credentialVersion: issued.credential.credential_version, expiresAt: issued.credential.expires_at }; break;
      }
    }
    print(result);
    return 0;
  } catch (error) {
    const status = error instanceof BidviaClientTransportError ? error.status : undefined;
    const payload = error instanceof BidviaClientTransportError ? error.responseBody : undefined;
    const detail: unknown = payload && typeof payload === 'object' ? Reflect.get(payload, 'error') : undefined;
    const code: unknown = detail && typeof detail === 'object' ? Reflect.get(detail, 'code') : undefined;
    const coreCode = typeof code === 'string' && /^[a-z][a-z0-9_]{0,79}$/u.test(code) ? code : undefined;
    // Never echo HTTP bodies, input JSON, bearer tokens, enrollment tokens or
    // stack traces into user logs, even if a remote endpoint reflects secrets.
    print({ error: { code: error instanceof MachineCliInputError ? 'invalid_input' : error instanceof BidviaClientTransportError ? error.kind : 'machine_command_failed',
      status, coreCode, message: error instanceof MachineCliInputError ? error.message : 'Machine command failed; check Core availability, credential/file permissions and the required role.',
      nextStep: coreCode === 'universe_evolution_task_required' ? 'Use an accepted UNIVERSE_GROWTH_TRACK dispatch assigned to this registration and materialize its governed task through the account task entry.'
        : ['universe_evolution_initial_input_invalid', 'universe_evolution_evidence_invalid'].includes(coreCode ?? '') ? 'Check current proposal authority, task expiry and qualified evidence references/digests; do not replace missing evidence with invented IDs.'
        : status === 409 ? 'Read canonical status and retry only the same operation with the same idempotency key.'
        : status === 403 ? 'Check the current credential, workspace or assigned task. Do not switch authority implicitly.'
          : 'Correct the input or local problem; preserve the same idempotency key when retrying a possibly committed request.' } });
    return 1;
  } finally { if (lockFile) await unlink(lockFile); }
}
