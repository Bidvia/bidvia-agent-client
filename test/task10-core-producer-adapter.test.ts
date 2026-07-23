import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';

import { TASK10_AUTHORITY } from '../scripts/task10/contracts.ts';
import {
  buildTask10ToolEnvironment,
  buildTask10PackageIdentity,
  buildCoreProducerInvocationPlan,
  createInMemoryDiagnosticPersistence,
  runTask10CoreProducer,
  type Task10CheckoutInspection,
} from '../scripts/task10/core-producer-adapter.ts';

const TOKEN_ENV_NAME = 'BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN';
const SELECTED_REUSABLE_SOURCE_PACKET_PATH = 'docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json';
const SELECTED_REUSABLE_SOURCE_PACKET_SHA256 = '53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093';
const SHARED_SCOPE = 'merged-main-reproducibility-and-acknowledged-handoff';
const SHARED_OWNER = 'bidvia-core-implementation-owner';
const SHARED_RECORDED_AT = '2026-07-19T16:00:00.000Z';
const SHARED_NON_CLAIMS = [
  'not_contract_acceptance',
  'not_purchase_order',
  'not_payment_settlement_or_refund',
  'not_fulfillment_or_after_sales',
  'not_dispute_or_arbitration_completion',
  'not_reputation_authority',
  'not_provider_execution_completion',
  'not_human_commercial_acceptance',
  'not_production_readiness',
  'not_governed_release_acceptance',
  'not_prd_aliyun_promotion',
  'not_active_prod',
  'not_release_truth',
] as const;
const REUSABLE_SOURCE_REFS = [
  'core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093',
] as const;
const REUSABLE_REFS = [
  'business-method-atom:method-1',
  'lineage-unit:c1-method-1-publish-lineage',
  'rules_template:chemical-match-rule-baseline',
  'evidence-shape:success-001',
] as const;
const RUN_IDS = {
  success: 'run-success-001',
  recovery: 'run-recovery-001',
  reuse: 'run-success-002-reuse',
} as const;
const COMPOSE_PROJECT = `bidvia-task10-${TASK10_AUTHORITY.attemptId}`;

type JsonRecord = Record<string, unknown>;
type Graph = { inputFiles: Record<string, string>; outputFiles: Record<string, string> };

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function buildInspection(kind: 'core' | 'client' | 'site', overrides: Partial<Task10CheckoutInspection> = {}): Task10CheckoutInspection {
  if (kind === 'core') {
    return {
      headCommit: TASK10_AUTHORITY.coreRuntimeSha,
      branch: 'main',
      upstream: 'origin/main',
      trackedDirty: false,
      untrackedDirty: false,
      detached: false,
      lockfileHash: TASK10_AUTHORITY.lockfileSha256.core,
      packageIdentity: TASK10_AUTHORITY.packageIdentities.core,
      ...overrides,
    };
  }
  if (kind === 'client') {
    return {
      headCommit: TASK10_AUTHORITY.clientBaselineSha,
      branch: 'main',
      upstream: 'origin/main',
      trackedDirty: false,
      untrackedDirty: false,
      detached: false,
      lockfileHash: TASK10_AUTHORITY.lockfileSha256.client,
      packageIdentity: TASK10_AUTHORITY.packageIdentities.client,
      ...overrides,
    };
  }
  return {
    headCommit: TASK10_AUTHORITY.siteBaselineSha,
    branch: 'main',
    upstream: 'origin/main',
    trackedDirty: false,
    untrackedDirty: false,
    detached: false,
    lockfileHash: TASK10_AUTHORITY.lockfileSha256.site,
    packageIdentity: TASK10_AUTHORITY.packageIdentities.site,
    ...overrides,
  };
}

function parseRunnerStyleFlags(args: readonly string[]): Array<[string, string]> {
  assert.deepEqual(args.slice(0, 3), ['run', 'run:merged-main-reproducibility-producers', '--']);
  const pairs: Array<[string, string]> = [];
  for (let index = 3; index < args.length; index += 2) {
    pairs.push([args[index]!, args[index + 1]!]);
  }
  return pairs;
}

function buildEnvelope(proofClass: string, artifactHash: string): JsonRecord {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    owner: SHARED_OWNER,
    recorded_at: SHARED_RECORDED_AT,
    source_refs: [`source-ref:${proofClass}`],
    artifact_hash: artifactHash,
    proof_class: proofClass,
  };
}

function buildScenarioRow(runId: string, suffix: string): JsonRecord {
  return {
    tenant_ref: 'tenant:001',
    actor_ref: `actor:${suffix}`,
    actor_family: 'operator',
    company_ref: 'company:001',
    authority_ref: 'authority:001',
    request_id: `request-id:${suffix}`,
    source_object_ref: `source:${suffix}`,
    target_object_ref: `target:${suffix}`,
    task_or_approval_ref: `task:${suffix}`,
    proof_class: `proof:${suffix}`,
    evidence_refs: [`evidence:${suffix}`],
    occurred_at: SHARED_RECORDED_AT,
    run_identity_ref: `run-identity:${runId}`,
  };
}

function buildRuntimeEvidence(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const subset = {
    core_image_digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    build_context_ref: 'context:merged-main-reproducibility',
    source_marker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
    runtime_marker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
    bootstrap_marker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
    scenario_marker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
    provider_protocol_version: TASK10_AUTHORITY.providerProtocolVersion,
    ports: [TASK10_AUTHORITY.ports.postgres, TASK10_AUTHORITY.ports.runtime, TASK10_AUTHORITY.ports.operator, TASK10_AUTHORITY.ports.fixture],
  };
  return {
    ...buildEnvelope('merged-main-runtime-evidence', sha256(JSON.stringify(subset))),
    ...subset,
    ...overrides,
  };
}

function buildResetEvidence(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const subset = {
    reset_state: 'passed',
    reset_detail: 'fresh reset complete',
    fresh_business_ids: true,
    schema_columns_complete: true,
  };
  return {
    ...buildEnvelope('merged-main-reset-evidence', sha256(JSON.stringify(subset))),
    ...subset,
    ...overrides,
  };
}

function buildReusablePacket(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const subset = { selected_reusable_refs: [...REUSABLE_REFS] };
  return {
    ...buildEnvelope('merged-main-reusable-packet', sha256(JSON.stringify(subset))),
    ...subset,
    source_refs: [...REUSABLE_SOURCE_REFS],
    ...overrides,
  };
}

function buildSuccessExecutionInput(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const executionResult = {
    tenant_ref: 'tenant:001',
    actor_family: 'operator',
    company_ref: 'company:001',
    authority_ref: 'authority:001',
    request_ref: 'request:success-001',
    listing_ref: 'listing:success-001',
    match_ref: 'match:success-001',
    opportunity_ref: 'opportunity:success-001',
    package_ref: 'package:success-001',
    task_ref: 'task:success-001',
    assignment_ref: 'assignment:success-001',
    approval_ref: 'approval:success-001',
    external_operation_ref: 'external-operation:success-001',
    receipt_ref: 'receipt:success-001',
    audit_ref: 'audit:success-001',
    outcome_ref: 'outcome:success-001',
    feedback_ref: 'feedback:success-001',
    lineage_refs: ['lineage:success-001'],
    scenario_rows: [buildScenarioRow(RUN_IDS.success, 'success-001')],
    package_state: 'EXPORTED',
    provider_receipt_status: 'accepted',
  };
  return {
    ...buildEnvelope('merged-main-core-execution-input', sha256(JSON.stringify({ mode: 'success-001', execution_result: executionResult }))),
    mode: 'success-001',
    execution_result: executionResult,
    ...overrides,
  };
}

function buildRecoveryExecutionInput(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const executionResult = {
    trigger: 'provider_failure_after_external_operation_reservation',
    tenant_ref: 'tenant:001',
    predecessor_tenant_ref: 'tenant:001',
    failed_request_ref: 'request:failed-001',
    resumed_request_ref: 'request:resumed-001',
    failed_external_operation_ref: 'external-operation:failed-001',
    failed_reason_code: 'provider_failure',
    success_receipt_ref: null,
    provider_complete_package_ref: null,
    rollback_ref: 'rollback:001',
    compensation_ref: 'compensation:001',
    reconciliation_ref: 'reconciliation:001',
    predecessor_refs: ['external-operation:failed-001'],
    recovery_task_ref: 'recovery-task:001',
    recovery_policy_ref: 'recovery-policy:001',
    recovery_assignment_ref: 'recovery-assignment:001',
    restart_readback_ref: 'readback:restart:001',
    resumed_external_operation_ref: 'external-operation:resumed-001',
    scenario_rows: [buildScenarioRow(RUN_IDS.recovery, 'recovery-001')],
  };
  return {
    ...buildEnvelope('merged-main-core-execution-input', sha256(JSON.stringify({ mode: 'recovery-001', execution_result: executionResult }))),
    mode: 'recovery-001',
    execution_result: executionResult,
    ...overrides,
  };
}

function buildReuseExecutionInput(overrides: Partial<JsonRecord> = {}): JsonRecord {
  const executionResult = {
    tenant_ref: 'tenant:001',
    actor_family: 'operator',
    company_ref: 'company:001',
    authority_ref: 'authority:001',
    prior_account_ref: 'account:prior',
    prior_session_ref: 'session:prior',
    prior_request_ref: 'request:success-001',
    prior_listing_ref: 'listing:success-001',
    prior_opportunity_ref: 'opportunity:success-001',
    prior_external_operation_ref: 'external-operation:success-001',
    prior_receipt_ref: 'receipt:success-001',
    account_ref: 'account:current',
    session_ref: 'session:current',
    request_ref: 'request:reuse-001',
    listing_ref: 'listing:reuse-001',
    opportunity_ref: 'opportunity:reuse-001',
    external_operation_ref: 'external-operation:reuse-001',
    receipt_ref: 'receipt:reuse-001',
    package_ref: 'package:reuse-001',
    reused_asset_refs: [...REUSABLE_REFS],
    evidence_shape_refs: ['evidence-shape:haisi:001'],
    lineage_distinction_ref: 'lineage-distinction:001',
    metric_policy_satisfied: true,
    scenario_rows: [buildScenarioRow(RUN_IDS.reuse, 'success-002-reuse')],
    terminal_package_state: 'EXPORTED',
  };
  return {
    ...buildEnvelope('merged-main-core-execution-input', sha256(JSON.stringify({ mode: 'success-002-reuse', execution_result: executionResult }))),
    mode: 'success-002-reuse',
    execution_result: executionResult,
    ...overrides,
  };
}

function buildPreflightArtifact(overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    attempt_id: TASK10_AUTHORITY.attemptId,
    repo_identity: {
      core: {
        repo_name: 'core',
        full_sha: TASK10_AUTHORITY.coreRuntimeSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        tracked_dirty: false,
        untracked_dirty: false,
        detached: false,
        lockfile_hash: `sha256:${TASK10_AUTHORITY.lockfileSha256.core}`,
        package_identity: TASK10_AUTHORITY.packageIdentities.core,
        contains_sisyphus_dependency: false,
      },
      client: {
        repo_name: 'client',
        full_sha: TASK10_AUTHORITY.clientBaselineSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        tracked_dirty: false,
        untracked_dirty: false,
        detached: false,
        lockfile_hash: `sha256:${TASK10_AUTHORITY.lockfileSha256.client}`,
        package_identity: TASK10_AUTHORITY.packageIdentities.client,
        contains_sisyphus_dependency: false,
      },
      site: {
        repo_name: 'site',
        full_sha: TASK10_AUTHORITY.siteBaselineSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        tracked_dirty: false,
        untracked_dirty: false,
        detached: false,
        lockfile_hash: `sha256:${TASK10_AUTHORITY.lockfileSha256.site}`,
        package_identity: TASK10_AUTHORITY.packageIdentities.site,
        contains_sisyphus_dependency: false,
      },
    },
    tool_identity: {
      node_version: 'v24.6.0',
      npm_version: '11.5.1',
      docker_version: '28.4.0',
      compose_version: '2.39.4-desktop.1',
      postgres_version: '15.13',
      browser_runner_version: '1.61.1',
    },
    runtime_identity: {
      core_image_digest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      build_context_ref: 'context:merged-main-reproducibility',
      source_marker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      runtime_marker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrap_marker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      scenario_marker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      client_package_identity: TASK10_AUTHORITY.packageIdentities.client,
      site_build_identity: TASK10_AUTHORITY.packageIdentities.site,
      provider_fixture_identity: TASK10_AUTHORITY.providerFixtureIdentity,
      provider_protocol_version: TASK10_AUTHORITY.providerProtocolVersion,
      compose_project: COMPOSE_PROJECT,
      container_names: [
        `${COMPOSE_PROJECT}-runtime`,
        `${COMPOSE_PROJECT}-postgres`,
        `${COMPOSE_PROJECT}-fixture`,
        `${COMPOSE_PROJECT}-operator`,
      ],
      ports: [TASK10_AUTHORITY.ports.postgres, TASK10_AUTHORITY.ports.runtime, TASK10_AUTHORITY.ports.operator, TASK10_AUTHORITY.ports.fixture],
      network_identity: `${COMPOSE_PROJECT}_default`,
    },
    reset_freshness: {
      reset_state: 'passed',
      reset_detail: 'fresh reset complete',
      output_directory_empty: true,
      output_directory_symlinked: false,
      fresh_business_ids: true,
      selected_reusable_refs: [...REUSABLE_REFS],
      schema_columns_complete: true,
    },
    selected_reusable_refs: [...REUSABLE_REFS],
    ...overrides,
  };
}

function buildSuccessMaterializedRun(overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    mode: 'success-001',
    run_id: RUN_IDS.success,
    tenant_ref: 'tenant:001',
    actor_family: 'operator',
    company_ref: 'company:001',
    authority_ref: 'authority:001',
    request_ref: 'request:success-001',
    listing_ref: 'listing:success-001',
    match_ref: 'match:success-001',
    opportunity_ref: 'opportunity:success-001',
    package_ref: 'package:success-001',
    task_ref: 'task:success-001',
    assignment_ref: 'assignment:success-001',
    approval_ref: 'approval:success-001',
    external_operation_ref: 'external-operation:success-001',
    receipt_ref: 'receipt:success-001',
    audit_ref: 'audit:success-001',
    outcome_ref: 'outcome:success-001',
    feedback_ref: 'feedback:success-001',
    lineage_refs: ['lineage:success-001'],
    terminal_package_state: 'EXPORTED',
    provider_receipt_status: 'accepted',
    scenario_rows: [buildScenarioRow(RUN_IDS.success, 'success-001')],
    selected_reusable_refs: [...REUSABLE_REFS],
    non_claims: [...SHARED_NON_CLAIMS],
    ...overrides,
  };
}

function buildRecoveryMaterializedRun(overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    mode: 'recovery-001',
    run_id: RUN_IDS.recovery,
    trigger: 'provider_failure_after_external_operation_reservation',
    tenant_ref: 'tenant:001',
    predecessor_tenant_ref: 'tenant:001',
    failed_request_ref: 'request:failed-001',
    resumed_request_ref: 'request:resumed-001',
    failed_external_operation_ref: 'external-operation:failed-001',
    failed_reason_code: 'provider_failure',
    success_receipt_ref: null,
    provider_complete_package_ref: null,
    rollback_ref: 'rollback:001',
    compensation_ref: 'compensation:001',
    reconciliation_ref: 'reconciliation:001',
    predecessor_refs: ['external-operation:failed-001'],
    recovery_task_ref: 'recovery-task:001',
    recovery_policy_ref: 'recovery-policy:001',
    recovery_assignment_ref: 'recovery-assignment:001',
    restart_readback_ref: 'readback:restart:001',
    resumed_external_operation_ref: 'external-operation:resumed-001',
    scenario_rows: [buildScenarioRow(RUN_IDS.recovery, 'recovery-001')],
    selected_reusable_refs: [...REUSABLE_REFS],
    non_claims: [...SHARED_NON_CLAIMS],
    ...overrides,
  };
}

function buildReuseMaterializedRun(overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    mode: 'success-002-reuse',
    run_id: RUN_IDS.reuse,
    tenant_ref: 'tenant:001',
    actor_family: 'operator',
    company_ref: 'company:001',
    authority_ref: 'authority:001',
    prior_account_ref: 'account:prior',
    prior_session_ref: 'session:prior',
    prior_request_ref: 'request:success-001',
    prior_listing_ref: 'listing:success-001',
    prior_opportunity_ref: 'opportunity:success-001',
    prior_external_operation_ref: 'external-operation:success-001',
    prior_receipt_ref: 'receipt:success-001',
    account_ref: 'account:current',
    session_ref: 'session:current',
    request_ref: 'request:reuse-001',
    listing_ref: 'listing:reuse-001',
    opportunity_ref: 'opportunity:reuse-001',
    external_operation_ref: 'external-operation:reuse-001',
    receipt_ref: 'receipt:reuse-001',
    package_ref: 'package:reuse-001',
    reused_asset_refs: [...REUSABLE_REFS],
    evidence_shape_refs: ['evidence-shape:haisi:001'],
    lineage_distinction_ref: 'lineage-distinction:001',
    metric_policy_satisfied: true,
    scenario_rows: [buildScenarioRow(RUN_IDS.reuse, 'success-002-reuse')],
    terminal_package_state: 'EXPORTED',
    selected_reusable_refs: [...REUSABLE_REFS],
    non_claims: [...SHARED_NON_CLAIMS],
    ...overrides,
  };
}

function buildPassedReadback(mode: 'success-001' | 'recovery-001' | 'success-002-reuse', runId: string, actorRef: string, overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'passed',
    attempt_id: TASK10_AUTHORITY.attemptId,
    run_id: runId,
    mode,
    readback_ref: `readback:${mode}`,
    tenant_id: 'tenant:001',
    owner_company_id: 'company:001',
    operator_actor_id: actorRef,
    authority_ref: 'authority:001',
    ...overrides,
  };
}

function buildBlockedArtifact(reasonCode: string, requiredEvidence: string[] = ['exact-frozen-evidence'], overrides: Partial<JsonRecord> = {}): JsonRecord {
  return {
    result: 'blocked',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    blocker_owner: SHARED_OWNER,
    reason_code: reasonCode,
    required_evidence: requiredEvidence,
    next_permitted_action: 'refresh-evidence',
    rollback_point: 'preflight_freeze',
    next_review_time: '2026-07-19T17:00:00.000Z',
    ...overrides,
  };
}

type GraphOverrides = {
  runtimeEvidence?: JsonRecord;
  resetEvidence?: JsonRecord;
  reusablePacket?: JsonRecord;
  successExecutionInput?: JsonRecord;
  recoveryExecutionInput?: JsonRecord;
  reuseExecutionInput?: JsonRecord;
  preflightArtifact?: JsonRecord;
  successMaterializedRun?: JsonRecord;
  recoveryMaterializedRun?: JsonRecord;
  reuseMaterializedRun?: JsonRecord;
  successReadback?: JsonRecord;
  recoveryReadback?: JsonRecord;
  reuseReadback?: JsonRecord;
  inputRename?: { from: string; to: string };
  outputRename?: { from: string; to: string };
};

function buildGraph(overrides: GraphOverrides = {}): Graph {
  const inputFiles: Record<string, string> = {
    'runtime-evidence.json': JSON.stringify(overrides.runtimeEvidence ?? buildRuntimeEvidence()),
    'reset-evidence.json': JSON.stringify(overrides.resetEvidence ?? buildResetEvidence()),
    'reusable-packet.json': JSON.stringify(overrides.reusablePacket ?? buildReusablePacket()),
    'success-001/execution-input.json': JSON.stringify(overrides.successExecutionInput ?? buildSuccessExecutionInput()),
    'recovery-001/execution-input.json': JSON.stringify(overrides.recoveryExecutionInput ?? buildRecoveryExecutionInput()),
    'success-002-reuse/execution-input.json': JSON.stringify(overrides.reuseExecutionInput ?? buildReuseExecutionInput()),
  };
  const outputFiles: Record<string, string> = {
    'preflight-artifact.json': JSON.stringify(overrides.preflightArtifact ?? buildPreflightArtifact()),
    'success-001/materialize-output/materialized-run.json': JSON.stringify(overrides.successMaterializedRun ?? buildSuccessMaterializedRun()),
    'success-001/readback.json': JSON.stringify(overrides.successReadback ?? buildPassedReadback('success-001', RUN_IDS.success, 'actor:success-001')),
    'recovery-001/materialize-output/materialized-run.json': JSON.stringify(overrides.recoveryMaterializedRun ?? buildRecoveryMaterializedRun()),
    'recovery-001/readback.json': JSON.stringify(overrides.recoveryReadback ?? buildPassedReadback('recovery-001', RUN_IDS.recovery, 'actor:recovery-001')),
    'success-002-reuse/materialize-output/materialized-run.json': JSON.stringify(overrides.reuseMaterializedRun ?? buildReuseMaterializedRun()),
    'success-002-reuse/readback.json': JSON.stringify(overrides.reuseReadback ?? buildPassedReadback('success-002-reuse', RUN_IDS.reuse, 'actor:success-002-reuse')),
  };
  if (overrides.inputRename) {
    inputFiles[overrides.inputRename.to] = inputFiles[overrides.inputRename.from]!;
    delete inputFiles[overrides.inputRename.from];
  }
  if (overrides.outputRename) {
    outputFiles[overrides.outputRename.to] = outputFiles[overrides.outputRename.from]!;
    delete outputFiles[overrides.outputRename.from];
  }
  return { inputFiles, outputFiles };
}

function createImmediateTimerControls() {
  const cancelled = new Set<object>();
  return {
    scheduleTimer(callback: () => void, _delayMs: number) {
      const handle = {};
      queueMicrotask(() => {
        if (!cancelled.has(handle)) {
          callback();
        }
      });
      return handle as ReturnType<typeof setTimeout>;
    },
    clearTimer(handle: ReturnType<typeof setTimeout>) {
      cancelled.add(handle as object);
    },
  };
}

function createFakeSpawnedProcess() {
  const emitter = new PassThrough() as PassThrough & {
    killSignals: string[];
    kill(signal?: NodeJS.Signals): boolean;
  };
  emitter.killSignals = [];
  emitter.kill = (signal?: NodeJS.Signals) => {
    emitter.killSignals.push(signal ?? 'SIGTERM');
    return true;
  };
  return emitter;
}

async function writeGraph(root: string, files: Record<string, string>): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, contents, 'utf8');
  }
}

async function createHarness() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-core-producer-completed-')));
  const coreRoot = path.join(root, 'core');
  const clientRoot = path.join(root, 'client');
  const siteRoot = path.join(root, 'site');
  const privateInputRoot = path.join(root, 'private-input');
  const privateOutputRoot = path.join(root, 'private-output');
  for (const directory of [coreRoot, clientRoot, siteRoot, privateInputRoot, privateOutputRoot]) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  }
  return {
    args: { coreRoot, clientRoot, siteRoot, privateInputRoot, privateOutputRoot },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('buildCoreProducerInvocationPlan uses the exact frozen parser flag names and order', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const plan = await buildCoreProducerInvocationPlan(harness.args);
    const parsed = parseRunnerStyleFlags(plan.args);
    assert.deepEqual(parsed, [
      ['--core-root', harness.args.coreRoot],
      ['--core-sha', TASK10_AUTHORITY.coreRuntimeSha],
      ['--core-branch', 'main'],
      ['--core-upstream', 'origin/main'],
      ['--core-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.core],
      ['--core-package-identity', TASK10_AUTHORITY.packageIdentities.core],
      ['--client-root', harness.args.clientRoot],
      ['--client-sha', TASK10_AUTHORITY.clientBaselineSha],
      ['--client-branch', 'main'],
      ['--client-upstream', 'origin/main'],
      ['--client-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.client],
      ['--client-package-identity', TASK10_AUTHORITY.packageIdentities.client],
      ['--site-root', harness.args.siteRoot],
      ['--site-sha', TASK10_AUTHORITY.siteBaselineSha],
      ['--site-branch', 'main'],
      ['--site-upstream', 'origin/main'],
      ['--site-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.site],
      ['--site-package-identity', TASK10_AUTHORITY.packageIdentities.site],
      ['--attempt-id', TASK10_AUTHORITY.attemptId],
      ['--input-evidence-root', harness.args.privateInputRoot],
      ['--output-root', harness.args.privateOutputRoot],
      ['--selected-reusable-source-packet', SELECTED_REUSABLE_SOURCE_PACKET_PATH],
      ['--selected-reusable-source-packet-sha256', SELECTED_REUSABLE_SOURCE_PACKET_SHA256],
      ['--source-main-commit-marker', TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker],
      ['--runtime-reported-version-marker', TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker],
      ['--bootstrap-package-version-marker', TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker],
      ['--scenario-package-version-marker', TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker],
      ['--provider-protocol-version', TASK10_AUTHORITY.providerProtocolVersion],
      ['--postgres-port', String(TASK10_AUTHORITY.ports.postgres)],
      ['--runtime-port', String(TASK10_AUTHORITY.ports.runtime)],
      ['--operator-port', String(TASK10_AUTHORITY.ports.operator)],
      ['--fixture-port', String(TASK10_AUTHORITY.ports.fixture)],
      ['--provider-fixture-identity', TASK10_AUTHORITY.providerFixtureIdentity],
    ]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('buildTask10PackageIdentity matches frozen Core missing-version normalization and preserves explicit versions', () => {
  assert.equal(
    buildTask10PackageIdentity({ name: 'bidvia-d2-ws6-t1-runtime' }),
    'bidvia-d2-ws6-t1-runtime@0.0.0',
  );
  assert.equal(
    buildTask10PackageIdentity({ name: '@bidvia/client', version: '1.0.0' }),
    '@bidvia/client@1.0.0',
  );
  assert.throws(() => buildTask10PackageIdentity({ name: '' }), /name/i);
  assert.throws(() => buildTask10PackageIdentity({ name: 'bidvia-d2-ws6-t1-runtime', version: '' }), /version/i);
});

test('buildTask10ToolEnvironment keeps allowlisted tool vars and omits the rehearsal token even when present', () => {
  const env = buildTask10ToolEnvironment({
    PATH: '/usr/bin',
    HOME: '/Users/tester',
    TMPDIR: '/tmp/tester',
    BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN: 'super-secret-token',
    UNRELATED_SECRET: 'ignore-me',
  });
  assert.deepEqual(env, {
    PATH: '/usr/bin',
    HOME: '/Users/tester',
    TMPDIR: '/tmp/tester',
  });
});

test('buildCoreProducerInvocationPlan never exposes token or ambient env in public output', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  const originalSecret = process.env.UNRELATED_TASK4_SECRET;
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  process.env.UNRELATED_TASK4_SECRET = 'ambient-secret';
  try {
    const plan = await buildCoreProducerInvocationPlan(harness.args);
    const serialized = JSON.stringify(plan);
    assert.ok(!('env' in plan));
    assert.doesNotMatch(serialized, /super-secret-token/);
    assert.doesNotMatch(serialized, /ambient-secret/);
    assert.doesNotMatch(serialized, /UNRELATED_TASK4_SECRET|BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN/);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    if (originalSecret === undefined) {
      delete process.env.UNRELATED_TASK4_SECRET;
    } else {
      process.env.UNRELATED_TASK4_SECRET = originalSecret;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer preserves the reportable-blocked contract probe and exposes only opaque evidence handles', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'),
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['core-producer-private-root-contract-unsatisfied']);
    assert.ok(result.publicDiagnostic);
    assert.deepEqual(result.evidence.groups, [{
      sourceClass: 'producer-contract-probe',
      handles: ['sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'],
      attestations: [{
        handle: 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        sourceClass: 'producer-contract-probe',
        verified: true,
        verifiedAt: result.publicDiagnostic.timestamp,
      }],
    }]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer can still reach the reportable contract probe with token absent because default checkout inspection stays token-free', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  delete process.env[TOKEN_ENV_NAME];
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'),
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['core-producer-private-root-contract-unsatisfied']);
  } finally {
    if (originalToken !== undefined) {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer returns completed with 13 whole-file handles and no path leakage for the exact frozen fake-id graph', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph();
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'completed');
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [
      ['runtime', 1],
      ['reset', 1],
      ['preflight', 2],
      ['success-001', 3],
      ['recovery-001', 3],
      ['success-002-reuse', 3],
    ]);
    const handles = result.evidence.groups.flatMap((group) => group.handles);
    assert.equal(handles.length, 13);
    assert.equal(new Set(handles).size, 13);
    const attestations = result.evidence.groups.flatMap((group) => group.attestations);
    assert.equal(attestations.length, 13);
    assert.ok(result.sanitizedFacts);
    assert.equal(result.sanitizedFacts.runIdentity?.tenant, 'tenant:task10-owner');
    assert.equal(result.sanitizedFacts.preflight?.identityMatched, true);
    assert.equal(result.sanitizedFacts.reset?.freshBusinessIds, true);
    assert.equal(result.sanitizedFacts.success001?.readbackPersisted, true);
    assert.equal(result.sanitizedFacts.recovery001?.hasRecoveryLineage, true);
    assert.equal(result.sanitizedFacts.success002Reuse?.isDistinctReuse, true);
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /request:success-001|listing:success-001|opportunity:success-001|external-operation:success-001|receipt:success-001|tenant:001|company:001|authority:001|account:prior|session:prior|account:current|session:current/);
    assert.doesNotMatch(serialized, new RegExp(harness.args.privateInputRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(serialized, new RegExp(harness.args.privateOutputRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(serialized, /request:success-001|listing:success-001|receipt:success-001|tenant:001|company:001|authority:001/);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer rejects prior surrogate runtime/reset/proof/lock shapes as tooling failures', async () => {
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const cases: Array<{ name: string; graph: Graph }> = [
      {
        name: 'runtime extra surrogate keys',
        graph: buildGraph({ runtimeEvidence: { ...buildRuntimeEvidence(), client_package_identity: TASK10_AUTHORITY.packageIdentities.client } }),
      },
      {
        name: 'reset extra surrogate keys',
        graph: buildGraph({ resetEvidence: { ...buildResetEvidence(), output_directory_empty: true } }),
      },
      {
        name: 'wrong reusable proof literal',
        graph: buildGraph({ reusablePacket: { ...buildReusablePacket(), proof_class: 'merged-main-reproducibility-reusable-packet' } }),
      },
      {
        name: 'plain preflight lock hash',
        graph: buildGraph({ preflightArtifact: { ...buildPreflightArtifact(), repo_identity: { ...buildPreflightArtifact().repo_identity as JsonRecord, core: { ...((buildPreflightArtifact().repo_identity as JsonRecord).core as JsonRecord), lockfile_hash: TASK10_AUTHORITY.lockfileSha256.core } } } }),
      },
    ];
    for (const entry of cases) {
      const harness = await createHarness();
      try {
        const result = await runTask10CoreProducer(harness.args, {
          inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
          probePrivateRootContract: async () => null,
          runProducer: async () => {
            await writeGraph(harness.args.privateInputRoot, entry.graph.inputFiles);
            await writeGraph(harness.args.privateOutputRoot, entry.graph.outputFiles);
            return { exitCode: 0 };
          },
        });
        assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' }, entry.name);
      } finally {
        await harness.cleanup();
      }
    }
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
  }
});

test('runTask10CoreProducer rejects coherently altered reusable refs even when downstream artifacts match them', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  const alteredRefs = [
    'business-method-atom:method-2',
    'lineage-unit:c1-method-2-publish-lineage',
    'rules_template:chemical-match-rule-variant',
    'evidence-shape:success-002',
  ] as const;
  try {
    const graph = buildGraph({
      reusablePacket: buildReusablePacket({ selected_reusable_refs: [...alteredRefs] }),
      preflightArtifact: buildPreflightArtifact({
        reset_freshness: {
          ...buildPreflightArtifact().reset_freshness as JsonRecord,
          selected_reusable_refs: [...alteredRefs],
        },
        selected_reusable_refs: [...alteredRefs],
      }),
      successMaterializedRun: buildSuccessMaterializedRun({ selected_reusable_refs: [...alteredRefs] }),
      recoveryMaterializedRun: buildRecoveryMaterializedRun({ selected_reusable_refs: [...alteredRefs] }),
      reuseMaterializedRun: buildReuseMaterializedRun({ reused_asset_refs: [...alteredRefs], selected_reusable_refs: [...alteredRefs] }),
    });
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer rejects altered reusable source provenance even with exact selected refs', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({
      reusablePacket: buildReusablePacket({ source_refs: ['core:97e2fbe3934ea821daf654afa0adaef2c3e16077:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'] }),
    });
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer returns validated partial evidence for blocked preflight with later files absent', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ preflightArtifact: buildBlockedArtifact('missing_required_evidence') });
    delete graph.outputFiles['success-001/materialize-output/materialized-run.json'];
    delete graph.outputFiles['success-001/readback.json'];
    delete graph.outputFiles['recovery-001/materialize-output/materialized-run.json'];
    delete graph.outputFiles['recovery-001/readback.json'];
    delete graph.outputFiles['success-002-reuse/materialize-output/materialized-run.json'];
    delete graph.outputFiles['success-002-reuse/readback.json'];
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['producer-output-preflight-blocked']);
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [['runtime', 1], ['reset', 1], ['preflight', 2]]);
    assert.ok(result.sanitizedFacts);
    assert.ok(result.sanitizedFacts.runIdentity);
    assert.ok(result.sanitizedFacts.runtime);
    assert.ok(result.sanitizedFacts.reset);
    assert.equal(result.sanitizedFacts.success001, undefined);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer returns validated partial evidence for blocked success readback with later modes absent', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ successReadback: buildBlockedArtifact('missing_required_evidence') });
    delete graph.outputFiles['recovery-001/materialize-output/materialized-run.json'];
    delete graph.outputFiles['recovery-001/readback.json'];
    delete graph.outputFiles['success-002-reuse/materialize-output/materialized-run.json'];
    delete graph.outputFiles['success-002-reuse/readback.json'];
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['producer-output-readback-blocked']);
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [['runtime', 1], ['reset', 1], ['preflight', 2], ['success-001', 3]]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer returns validated partial evidence for blocked recovery readback with reuse absent', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ recoveryReadback: buildBlockedArtifact('missing_required_evidence') });
    delete graph.outputFiles['success-002-reuse/materialize-output/materialized-run.json'];
    delete graph.outputFiles['success-002-reuse/readback.json'];
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['producer-output-readback-blocked']);
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [['runtime', 1], ['reset', 1], ['preflight', 2], ['success-001', 3], ['recovery-001', 3]]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer maps structurally valid recovery continuity violations to reportable-blocked with artifact plus diagnostic evidence', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ recoveryMaterializedRun: buildRecoveryMaterializedRun({ predecessor_tenant_ref: 'tenant:other' }) });
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'),
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['producer-output-recovery-001-lineage-missing']);
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [['runtime', 1], ['reset', 1], ['preflight', 2], ['success-001', 3], ['recovery-001', 3]]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer maps structurally valid reuse distinction violations to reportable-blocked with artifact plus diagnostic evidence', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ reuseMaterializedRun: buildReuseMaterializedRun({ request_ref: 'request:success-001' }) });
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      persistAndVerifyDiagnostic: createInMemoryDiagnosticPersistence('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'),
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.equal(result.status, 'reportable-blocked');
    assert.deepEqual(result.reasonCodes, ['producer-output-success-002-reuse-duplicate']);
    assert.deepEqual(result.evidence.groups.map((group) => [group.sourceClass, group.handles.length]), [['runtime', 1], ['reset', 1], ['preflight', 2], ['success-001', 3], ['recovery-001', 3], ['success-002-reuse', 3]]);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer treats malformed blocked artifacts as tooling failures', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph({ preflightArtifact: { ...buildBlockedArtifact('missing_required_evidence') } });
    delete (JSON.parse(graph.outputFiles['preflight-artifact.json']!) as JsonRecord).next_review_time;
    graph.outputFiles['preflight-artifact.json'] = JSON.stringify({
      result: 'blocked',
      scope: SHARED_SCOPE,
      authority_effect: 'none',
      release_effect: 'none',
      blocker_owner: SHARED_OWNER,
      reason_code: 'missing_required_evidence',
      required_evidence: ['exact-frozen-evidence'],
      next_permitted_action: 'refresh-evidence',
      rollback_point: 'preflight_freeze',
    });
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer returns reportable-blocked on nonzero exit only when ordered validation finds a trustworthy blocked partial', async () => {
  const blockedHarness = await createHarness();
  const noEvidenceHarness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const blockedGraph = buildGraph({ preflightArtifact: buildBlockedArtifact('missing_required_evidence') });
    delete blockedGraph.outputFiles['success-001/materialize-output/materialized-run.json'];
    delete blockedGraph.outputFiles['success-001/readback.json'];
    delete blockedGraph.outputFiles['recovery-001/materialize-output/materialized-run.json'];
    delete blockedGraph.outputFiles['recovery-001/readback.json'];
    delete blockedGraph.outputFiles['success-002-reuse/materialize-output/materialized-run.json'];
    delete blockedGraph.outputFiles['success-002-reuse/readback.json'];
    const blockedResult = await runTask10CoreProducer(blockedHarness.args, {
      inspectCheckout: async (rootPath) => rootPath === blockedHarness.args.coreRoot ? buildInspection('core') : rootPath === blockedHarness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(blockedHarness.args.privateInputRoot, blockedGraph.inputFiles);
        await writeGraph(blockedHarness.args.privateOutputRoot, blockedGraph.outputFiles);
        return { exitCode: 2 };
      },
    });
    assert.equal(blockedResult.status, 'reportable-blocked');
    assert.deepEqual(blockedResult.reasonCodes, ['producer-output-preflight-blocked']);

    const noEvidenceResult = await runTask10CoreProducer(noEvidenceHarness.args, {
      inspectCheckout: async (rootPath) => rootPath === noEvidenceHarness.args.coreRoot ? buildInspection('core') : rootPath === noEvidenceHarness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => ({ exitCode: 2 }),
    });
    assert.deepEqual(noEvidenceResult, { status: 'tooling-failure', errorCode: 'producer-exit-nonzero' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await blockedHarness.cleanup();
    await noEvidenceHarness.cleanup();
  }
});

test('runTask10CoreProducer keeps existing boundary failures unchanged', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  await writeFile(path.join(harness.args.privateInputRoot, 'stale.txt'), 'stale');
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => ({ exitCode: 0 }),
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'input-precondition-failed' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer rejects permissive private roots before probe or spawn', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  await chmod(harness.args.privateOutputRoot, 0o755);
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async () => buildInspection('core'),
      probePrivateRootContract: async () => null,
      runProducer: async () => ({ exitCode: 0 }),
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'input-precondition-failed' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer fails closed on missing token before default spawn-permitted execution', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  delete process.env[TOKEN_ENV_NAME];
  let spawnCalls = 0;
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        spawnCalls += 1;
        return { exitCode: 0 };
      },
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'adapter-input-validation-failed' });
    assert.equal(spawnCalls, 0);
  } finally {
    if (originalToken !== undefined) {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer default spawn helper times out a hung producer with TERM then KILL and maps to producer-exit-nonzero', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  const timers = createImmediateTimerControls();
  try {
    const child = createFakeSpawnedProcess();
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      spawnProcess() {
        return child;
      },
      producerTimeoutMs: 1,
      killGraceMs: 1,
      forceSettleMs: 1,
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-exit-nonzero' });
    assert.deepEqual(child.killSignals, ['SIGTERM', 'SIGKILL']);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer default spawn helper still resolves timeout 124 when child closes after SIGTERM', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  const timers = createImmediateTimerControls();
  try {
    const child = createFakeSpawnedProcess();
    child.kill = (signal?: NodeJS.Signals) => {
      child.killSignals.push(signal ?? 'SIGTERM');
      if (signal === 'SIGTERM') {
        queueMicrotask(() => {
          child.emit('close', 0);
        });
      }
      return true;
    };
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      spawnProcess() {
        return child;
      },
      producerTimeoutMs: 1,
      killGraceMs: 1,
      forceSettleMs: 1,
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-exit-nonzero' });
    assert.deepEqual(child.killSignals, ['SIGTERM']);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer rejects oversized artifacts as tooling failures', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const graph = buildGraph();
    graph.inputFiles['runtime-evidence.json'] = `${' '.repeat(1_100_000)}`;
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
      probePrivateRootContract: async () => null,
      runProducer: async () => {
        await writeGraph(harness.args.privateInputRoot, graph.inputFiles);
        await writeGraph(harness.args.privateOutputRoot, graph.outputFiles);
        return { exitCode: 0 };
      },
    });
    assert.deepEqual(result, { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' });
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});

test('runTask10CoreProducer default persistence keeps retained diagnostic files mode 0600', async () => {
  const harness = await createHarness();
  const originalToken = process.env[TOKEN_ENV_NAME];
  process.env[TOKEN_ENV_NAME] = 'super-secret-token';
  try {
    const result = await runTask10CoreProducer(harness.args, {
      inspectCheckout: async (rootPath) => rootPath === harness.args.coreRoot ? buildInspection('core') : rootPath === harness.args.clientRoot ? buildInspection('client') : buildInspection('site'),
    });
    assert.equal(result.status, 'reportable-blocked');
    const entries = await readdir(harness.args.privateOutputRoot);
    assert.equal(entries.length, 1);
    const retained = path.join(harness.args.privateOutputRoot, entries[0]!);
    assert.equal((await stat(retained)).mode & 0o777, 0o600);
    const bytes = await readFile(retained);
    const expected = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    assert.equal(result.evidence.groups[0]?.handles[0], expected);
  } finally {
    if (originalToken === undefined) {
      delete process.env[TOKEN_ENV_NAME];
    } else {
      process.env[TOKEN_ENV_NAME] = originalToken;
    }
    await harness.cleanup();
  }
});
