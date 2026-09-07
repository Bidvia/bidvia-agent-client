import assert from 'node:assert/strict';
import test from 'node:test';

import { BidviaClient, BidviaClientTransportError } from '../src/client.ts';
import type { BidviaClientOptions } from '../src/client.ts';
import type { BidviaUniverseSuccessorProposalInput } from '../src/machine-universe.ts';

const identity = { tenantId: 'tenant-a', machinePrincipalId: 'machine-a', agentRegistrationId: 'registration-a', credentialVersion: 3 };
const consumption = { retrievalResultSetRef: 'retrieval-a', consumptionPurpose: 'execute task', idempotencyKey: 'consume-a' };
const receipt = { retrieval_consumption_id: 'consumption-a', retrieval_result_set_ref: 'retrieval-a',
  selected_asset_publication_version_id: 'publication-a', task_ref: 'task-a', idempotency_key: 'consume-a' };
const evidence = { evidenceRefs: ['evidence-a'], evidenceDigests: ['a'.repeat(64)], idempotencyKey: 'request-a' };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const options = (fetchImpl: typeof fetch): BidviaClientOptions => ({ baseUrl: 'https://core.example.test',
  context: { tenantId: 'tenant-a' }, machineIdentity: { ...identity }, auth: { bearerToken: 'fixture-secret' }, fetchImpl });

test('machine consumption uses credential headers and an exact authority-free payload', async () => {
  const client = new BidviaClient(options(async (url, init) => {
    assert.equal(String(url), 'https://core.example.test/machine/agents/registration-a/universe/retrieval/consumptions');
    assert.equal(init?.method, 'POST');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer fixture-secret');
    assert.equal(headers.get('x-bidvia-machine-tenant-id'), identity.tenantId);
    assert.equal(headers.get('x-bidvia-machine-principal-id'), identity.machinePrincipalId);
    assert.equal(headers.get('x-bidvia-agent-registration-id'), identity.agentRegistrationId);
    assert.equal(headers.get('x-bidvia-machine-credential-version'), '3');
    assert.equal(headers.get('x-authorized-role'), null);
    assert.deepEqual(JSON.parse(String(init?.body)), { schema_version: 1, retrieval_result_set_ref: 'retrieval-a',
      consumption_purpose: 'execute task', idempotency_key: 'consume-a' });
    return response(receipt);
  }));
  const forged = { ...consumption, tenant_id: 'other', consumer_machine_principal_id: 'other' };
  assert.deepEqual(await client.machineUniverse.consume(forged), receipt);
});

for (const context of [{ tenantId: 'other' }, { tenantId: 'tenant-a', sessionId: 'human' },
  { tenantId: 'tenant-a', authorizedRole: 'operator_admin' }, { tenantId: 'tenant-a', registrationId: 'other' }]) {
  test('machine universe rejects mixed context ' + JSON.stringify(context), async () => {
    let calls = 0;
    const client = new BidviaClient({ ...options(async () => { calls++; return response(receipt); }), context });
    await assert.rejects(client.machineUniverse.consume(consumption), /cannot mix/u);
    assert.equal(calls, 0);
  });
}

for (const headers of [{ 'X-Bidvia-Machine-Principal-Id': 'other' }, { 'X-Authorized-Tenant-Id': 'other' },
  { 'x-bidvia-session-id': 'human' }]) {
  test('machine universe rejects case-insensitive provider authority ' + Object.keys(headers)[0], async () => {
    let calls = 0;
    const client = new BidviaClient({ ...options(async () => { calls++; return response(receipt); }), headers: async () => headers });
    await assert.rejects(client.machineUniverse.consume(consumption), /through machineIdentity/u);
    assert.equal(calls, 0);
  });
}

test('machine identity and bearer are required and per-request tenant cannot override identity', async () => {
  const configured = options(async () => assert.fail('must not send'));
  await assert.rejects(new BidviaClient({ ...configured, machineIdentity: undefined }).machineUniverse.consume(consumption), /machineIdentity/u);
  await assert.rejects(new BidviaClient({ ...configured, auth: undefined }).machineUniverse.consume(consumption), /bearer/u);
  await assert.rejects(new BidviaClient(configured).machineUniverse.consume(consumption, { context: { tenantId: 'other' } }), /cannot mix/u);
});

test('outcome HTTP 202 preserves pending gateway truth and never triggers confirmation', async () => {
  let calls = 0;
  const pending = { submission: { status: 'ADMITTED' }, admission: { decision: 'ADMITTED' },
    canonical_record: { canonical_record_ref: 'outcome-a', canonical_result: { gateway_delivery_state: 'PENDING' } }, replayed: false };
  const client = new BidviaClient(options(async (url, init) => {
    calls++;
    assert.equal(new URL(String(url)).pathname, '/machine/agents/registration-a/dispatches/dispatch%2Fa/outcome');
    assert.deepEqual(JSON.parse(String(init?.body)), { schema_version: 1, outcome_state: 'COMPLETED', outcome_ref: null,
      reason: 'finished', reported_outcome_id: 'outcome-a', task_ref: 'task-a', retrieval_consumption_ref: 'consumption-a',
      asset_publication_version_id: 'publication-a', professional_scenario_ref: 'scenario-a', lineage_refs: ['consumption-a'],
      evidence_refs: evidence.evidenceRefs, evidence_digests: evidence.evidenceDigests, idempotency_key: evidence.idempotencyKey });
    return response(pending, 202);
  }));
  assert.deepEqual(await client.machineUniverse.reportOutcome({ ...evidence, dispatchId: 'dispatch/a', outcomeState: 'COMPLETED',
    outcomeRef: null, reason: 'finished', reportedOutcomeId: 'outcome-a', taskRef: 'task-a', retrievalConsumptionRef: 'consumption-a',
    assetPublicationVersionId: 'publication-a', professionalScenarioRef: 'scenario-a', lineageRefs: ['consumption-a'] }), pending);
  assert.equal(calls, 1);
});

test('independent confirmation and contribution serialize exact existing public routes', async () => {
  const confirmation = { confirmation: { outcome_confirmation_id: 'confirmation-a', reported_outcome_ref: 'outcome/a', decision: 'CONFIRM' },
    reported_outcome: { reported_outcome_id: 'outcome/a', status: 'CONFIRMED' } };
  const contribution = { contribution_admission: { contribution_admission_id: 'contribution-a', reported_outcome_ref: 'outcome/a',
    credited_reporter_principal_ref: 'machine-reporter', decision: 'ADMITTED' } };
  const paths: string[] = [];
  const client = new BidviaClient(options(async (url, init) => {
    const path = new URL(String(url)).pathname; paths.push(path);
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(body, { schema_version: 1, ...(path.endsWith('/confirmation') ? { decision: 'CONFIRM' }
      : { reported_outcome_ref: 'outcome/a', contribution_family: 'UNIVERSE_CONSTRUCTION' }),
    evidence_refs: evidence.evidenceRefs, evidence_digests: evidence.evidenceDigests, idempotency_key: evidence.idempotencyKey });
    return response(path.endsWith('/confirmation') ? confirmation : contribution);
  }));
  assert.deepEqual(await client.machineUniverse.confirmOutcome({ ...evidence, reportedOutcomeId: 'outcome/a', decision: 'CONFIRM' }), confirmation);
  assert.deepEqual(await client.machineUniverse.approveContribution({ ...evidence, reportedOutcomeRef: 'outcome/a', contributionFamily: 'UNIVERSE_CONSTRUCTION' }), contribution);
  assert.deepEqual(paths, ['/machine/agents/registration-a/universe/outcomes/outcome%2Fa/confirmation',
    '/machine/agents/registration-a/universe/contributions/approvals']);
});

test('successor proposal has canonical camelCase inputs without caller-selected proposal identities', async () => {
  const input: BidviaUniverseSuccessorProposalInput = { universeEvolutionRunId: 'run-a', contributionAdmissionId: 'contribution-a',
    continuationId: 'continuation-a', assetPublicationVersionId: 'publication-a', professionalScenarioRef: 'scenario-a',
    targetTemplateFamily: 'CHEMICAL_MATCH_RULE_TEMPLATE', expectedRetrievalPolicyEvaluationId: 'policy-a', expectedRetrievalPolicyRevision: 3,
    assignmentAcceptanceIdempotencyKey: 'accept-a', governanceQualityEvidenceRefs: evidence.evidenceRefs,
    governanceQualityEvidenceDigests: evidence.evidenceDigests, title: 'title', summary: 'summary', body: 'body', idempotencyKey: 'proposal-a' };
  const result = { proposal: { asset_proposal_id: 'canonical-a', template_proposal_id: 'canonical-template-a',
    governed_asset_id: 'canonical-asset-a', evidence_refs: ['proof-a'], submitted_at: '2026-09-07T00:00:00.000Z' } };
  const client = new BidviaClient(options(async (url, init) => {
    assert.ok(String(url).endsWith('/universe/proposals/successor'));
    assert.deepEqual(JSON.parse(String(init?.body)), { schema_version: 1, universe_evolution_run_id: 'run-a',
      contribution_admission_id: 'contribution-a', continuation_id: 'continuation-a', asset_publication_version_id: 'publication-a',
      professional_scenario_ref: 'scenario-a', target_template_family: 'CHEMICAL_MATCH_RULE_TEMPLATE',
      expected_retrieval_policy_evaluation_id: 'policy-a', expected_retrieval_policy_revision: 3,
      assignment_acceptance_idempotency_key: 'accept-a', governance_quality_evidence_refs: evidence.evidenceRefs,
      governance_quality_evidence_digests: evidence.evidenceDigests, title: 'title', summary: 'summary', body: 'body', idempotency_key: 'proposal-a' });
    return response(result);
  }));
  assert.deepEqual(await client.machineUniverse.submitSuccessorProposal({ ...input }), result);
});

for (const [status, kind] of [[403, 'permission'], [409, 'conflict'], [503, 'server']] as const) {
  test('machine universe preserves HTTP error ' + status, async () => {
    const client = new BidviaClient(options(async () => response({ error: { code: 'core_rejected' } }, status)));
    await assert.rejects(client.machineUniverse.consume(consumption), (error: unknown) =>
      error instanceof BidviaClientTransportError && error.status === status && error.kind === kind);
  });
}

test('machine universe rejects malformed or mismatched success receipts', async () => {
  for (const body of [null, {}, { ...receipt, retrieval_result_set_ref: 'other' }, { ...receipt, idempotency_key: 'other' }]) {
    await assert.rejects(new BidviaClient(options(async () => response(body))).machineUniverse.consume(consumption), TypeError);
  }
  await assert.rejects(new BidviaClient(options(async () => response({ confirmation: {}, reported_outcome: {} })))
    .machineUniverse.confirmOutcome({ ...evidence, reportedOutcomeId: 'outcome-a', decision: 'CONFIRM' }), TypeError);
});

test('machine universe uses the shared abort and timeout transport', async () => {
  const client = new BidviaClient(options(async (_url, init) => {
    await new Promise<void>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true }));
    return response(receipt);
  }));
  await assert.rejects(client.machineUniverse.consume(consumption, { timeoutMs: 5 }), (error: unknown) =>
    error instanceof BidviaClientTransportError && error.kind === 'timeout');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client.machineUniverse.consume(consumption, { signal: controller.signal }), (error: unknown) =>
    error instanceof BidviaClientTransportError && error.kind === 'aborted');
});
