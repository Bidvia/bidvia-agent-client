import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';

import { TASK10_AUTHORITY } from './contracts.js';
import type { Task10PrivateEvidenceAttestation, Task10ScenarioFamily } from './contracts.js';
import type {
  SanitizedDispatchSuccessReport,
  SanitizedPreflightReport,
  SanitizedRecoveryReport,
  SanitizedReplayReuseReport,
  SanitizedResetReport,
  SanitizedRunIdentity,
  SanitizedRuntimeReport,
} from './scenario-adapter.js';

const FROZEN_TOKEN_ENV_NAME = 'BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN';
const SELECTED_REUSABLE_SOURCE_PACKET_PATH: typeof TASK10_AUTHORITY.selectedSourcePacketPath = TASK10_AUTHORITY.selectedSourcePacketPath;
const SELECTED_REUSABLE_SOURCE_PACKET_SHA256: typeof TASK10_AUTHORITY.selectedSourcePacketSha256 = TASK10_AUTHORITY.selectedSourcePacketSha256;
const SHARED_SCOPE = 'merged-main-reproducibility-and-acknowledged-handoff';
const SHARED_OWNER = 'bidvia-core-implementation-owner';
const SHARED_RECORDED_AT = '2026-07-19T16:00:00.000Z';
const REQUIRED_NON_CLAIMS = [
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
const RUN_IDS = {
  success: 'run:success-001',
  recovery: 'run:recovery-001',
  reuse: 'run:success-002-reuse',
} as const;
const EXPECTED_PORTS = [
  TASK10_AUTHORITY.ports.postgres,
  TASK10_AUTHORITY.ports.runtime,
  TASK10_AUTHORITY.ports.operator,
  TASK10_AUTHORITY.ports.fixture,
] as const;
const COMPOSE_PROJECT = `bidvia-task10-${TASK10_AUTHORITY.attemptId}`;
const EXPECTED_CONTAINER_NAMES = [
  `${COMPOSE_PROJECT}-runtime`,
  `${COMPOSE_PROJECT}-postgres`,
  `${COMPOSE_PROJECT}-fixture`,
  `${COMPOSE_PROJECT}-operator`,
] as const;
const EXPECTED_REUSABLE_SOURCE_REFS = [
  `core:${TASK10_AUTHORITY.coreRuntimeSha}:${TASK10_AUTHORITY.selectedSourcePacketPath}:${TASK10_AUTHORITY.selectedSourcePacketSha256}`,
] as const;
const EXPECTED_SELECTED_REUSABLE_REFS = [
  'business-method-atom:method-1',
  'lineage-unit:c1-method-1-publish-lineage',
  'rules_template:chemical-match-rule-baseline',
  'evidence-shape:success-001',
] as const;
const INPUT_ENVELOPE_KEYS = ['result', 'scope', 'authority_effect', 'release_effect', 'owner', 'recorded_at', 'source_refs', 'artifact_hash', 'proof_class'] as const;
const ARTIFACT_JSON_MAX_BYTES = 1024 * 1024;
const PACKAGE_JSON_MAX_BYTES = 1024 * 1024;
const PACKAGE_LOCK_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_PRODUCER_TIMEOUT_MS = 60 * 60 * 1000;
const DEFAULT_PRODUCER_KILL_GRACE_MS = 5_000;
const DEFAULT_PRODUCER_FORCE_SETTLE_MS = 1_000;
const DEFAULT_GIT_TIMEOUT_MS = 15_000;
const DEFAULT_GIT_MAX_BUFFER_BYTES = 16 * 1024;
const ALLOWED_CHILD_ENV_KEYS = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'USER',
  'LOGNAME',
  'SHELL',
  'LANG',
  'LC_ALL',
  'DOCKER_HOST',
  'DOCKER_CONTEXT',
  'DOCKER_CONFIG',
  'XDG_CONFIG_HOME',
  'npm_config_cache',
  'CI',
  'TERM',
  'NO_COLOR',
] as const;

type ModeName = 'success-001' | 'recovery-001' | 'success-002-reuse';
type Task10EvidenceSourceClass = 'runtime' | 'reset' | 'preflight' | ModeName | 'producer-contract-probe';
type Task10AffectedMode = 'producer-contract-probe' | 'preflight' | ModeName;
type BlockedReasonCode =
  | 'core-producer-private-root-contract-unsatisfied'
  | 'producer-output-preflight-blocked'
  | 'producer-output-readback-blocked'
  | 'producer-output-recovery-001-lineage-missing'
  | 'producer-output-success-002-reuse-duplicate';
type ToolingFailureCode =
  | 'input-precondition-failed'
  | 'checkout-precondition-failed'
  | 'producer-spawn-failed'
  | 'producer-exit-nonzero'
  | 'producer-artifact-invalid'
  | 'private-diagnostic-persistence-failed'
  | 'private-diagnostic-verify-failed'
  | 'adapter-input-validation-failed';

export interface RunTask10CoreProducerArgs {
  coreRoot: string;
  clientRoot: string;
  siteRoot: string;
  privateInputRoot: string;
  privateOutputRoot: string;
}

export interface Task10CheckoutInspection {
  headCommit: string;
  branch: string;
  upstream: string;
  trackedDirty: boolean;
  untrackedDirty: boolean;
  detached: boolean;
  lockfileHash: string;
  packageIdentity: string;
}

export interface Task10PrivateEvidenceGroup {
  sourceClass: Task10EvidenceSourceClass;
  handles: Array<`sha256:${string}`>;
  attestations: Task10PrivateEvidenceAttestation[];
}

export interface Task10ValidatedPartialEvidence {
  groups: Task10PrivateEvidenceGroup[];
}

export interface Task10CompletePrivateEvidence {
  groups: Task10PrivateEvidenceGroup[];
}

export interface CoreProducerInvocationPlan {
  command: 'npm';
  args: readonly string[];
  cwd: string;
  shell: false;
  selectedReusableSourcePacketPath: typeof SELECTED_REUSABLE_SOURCE_PACKET_PATH;
  selectedReusableSourcePacketSha256: typeof SELECTED_REUSABLE_SOURCE_PACKET_SHA256;
}

export interface CoreProducerPublicDiagnostic {
  sourceClass: Task10EvidenceSourceClass;
  reason: BlockedReasonCode;
  affectedModes: readonly Task10AffectedMode[];
  affectedFamilies: readonly Task10ScenarioFamily[];
  timestamp: string;
  handle: `sha256:${string}`;
  attestation: Task10PrivateEvidenceAttestation;
}

export interface RunTask10CoreProducerReportableBlockedOutcome {
  status: 'reportable-blocked';
  reasonCodes: readonly BlockedReasonCode[];
  affectedModes: readonly Task10AffectedMode[];
  affectedFamilies: readonly Task10ScenarioFamily[];
  evidence: Task10ValidatedPartialEvidence;
  sanitizedFacts?: Task10SanitizedScenarioFacts;
  publicDiagnostic?: CoreProducerPublicDiagnostic;
}

export interface RunTask10CoreProducerCompletedOutcome {
  status: 'completed';
  evidence: Task10CompletePrivateEvidence;
  sanitizedFacts?: Task10SanitizedScenarioFacts;
}

export interface RunTask10CoreProducerToolingFailureOutcome {
  status: 'tooling-failure';
  errorCode: ToolingFailureCode;
}

export interface Task10SanitizedScenarioFacts {
  runIdentity?: SanitizedRunIdentity;
  preflight?: SanitizedPreflightReport;
  runtime?: SanitizedRuntimeReport;
  reset?: SanitizedResetReport;
  success001?: SanitizedDispatchSuccessReport;
  recovery001?: SanitizedRecoveryReport;
  success002Reuse?: SanitizedReplayReuseReport;
}

export type RunTask10CoreProducerOutcome =
  | RunTask10CoreProducerReportableBlockedOutcome
  | RunTask10CoreProducerCompletedOutcome
  | RunTask10CoreProducerToolingFailureOutcome;

export interface CoreProducerPrivateRootCandidateClassification {
  candidatePath: string;
  result: 'accepted-external-root' | 'core-overlap-rejected';
}

export interface CoreProducerPrivateRootContractAcceptedOutcome {
  status: 'accepted';
}

export type CoreProducerPrivateRootContractProbeOutcome =
  | CoreProducerPrivateRootContractAcceptedOutcome
  | RunTask10CoreProducerReportableBlockedOutcome
  | RunTask10CoreProducerToolingFailureOutcome;

type BlockedOutcomeBuildResult =
  | RunTask10CoreProducerReportableBlockedOutcome
  | RunTask10CoreProducerToolingFailureOutcome;

export interface CoreProducerPrivateRootContractProbeInput {
  coreRuntimeRoot: string;
  privateInputRoot: string;
  privateOutputRoot: string;
  now: string;
  sourceClass: 'producer-contract-probe';
}

export interface PersistAndVerifyDiagnosticInput {
  privateDiagnostic: Record<string, unknown>;
  sourceClass: Task10EvidenceSourceClass;
  timestamp: string;
}

export interface PersistAndVerifyDiagnosticResult {
  handle: `sha256:${string}`;
  verified: boolean;
}

export interface RunTask10CoreProducerDependencies {
  now: () => string;
  runProducer: (plan: CoreProducerInvocationPlan) => Promise<{ exitCode: number }>;
  inspectCheckout: (rootPath: string) => Promise<Task10CheckoutInspection>;
  persistAndVerifyDiagnostic: (input: PersistAndVerifyDiagnosticInput, privateOutputRoot: string) => Promise<PersistAndVerifyDiagnosticResult>;
  probePrivateRootContract: (
    input: CoreProducerPrivateRootContractProbeInput,
    persist: RunTask10CoreProducerDependencies['persistAndVerifyDiagnostic'],
    privateOutputRoot: string,
  ) => Promise<CoreProducerPrivateRootContractProbeOutcome>;
  spawnProcess: (command: string, args: readonly string[], options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    shell: false;
    stdio: 'ignore';
  }) => CoreProducerSpawnedProcess;
  producerTimeoutMs: number;
  killGraceMs: number;
  forceSettleMs: number;
  scheduleTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
}

export interface CoreProducerSpawnedProcess {
  kill(signal?: NodeJS.Signals): boolean;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: 'close', listener: (code: number | null) => void): this;
}

type ArtifactFile = {
  text: string;
  json: Record<string, unknown>;
  handle: `sha256:${string}`;
};

type EvidencePair = {
  handle: `sha256:${string}`;
  attestation: Task10PrivateEvidenceAttestation;
};

type SuccessSnapshot = {
  runId: string;
  tenantRef: string;
  companyRef: string;
  authorityRef: string;
  actorRef: string;
  requestRef: string;
  listingRef: string;
  opportunityRef: string;
  externalOperationRef: string;
  receiptRef: string;
};

type ReadbackIdentitySnapshot = {
  tenantId: string;
  ownerCompanyId: string;
  operatorActorId: string;
  authorityRef: string;
};

type ValidatedProducerState = {
  runtime?: ArtifactFile;
  reset?: ArtifactFile;
  reusable?: ArtifactFile;
  preflight?: ArtifactFile;
  successInput?: ArtifactFile;
  successMaterialized?: ArtifactFile;
  successReadback?: ArtifactFile;
  successSnapshot?: SuccessSnapshot;
  readbackIdentity?: ReadbackIdentitySnapshot;
  recoveryInput?: ArtifactFile;
  recoveryMaterialized?: ArtifactFile;
  recoveryReadback?: ArtifactFile;
  reuseInput?: ArtifactFile;
  reuseMaterialized?: ArtifactFile;
  reuseReadback?: ArtifactFile;
};

export function buildTask10PackageIdentity(input: {
  name?: unknown;
  version?: unknown;
}): string {
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    throw new Error('package name must be a non-empty string');
  }
  if (input.version !== undefined && (typeof input.version !== 'string' || input.version.trim().length === 0)) {
    throw new Error('package version must be a non-empty string when present');
  }
  const version = typeof input.version === 'string' ? input.version.trim() : '0.0.0';
  return `${input.name.trim()}@${version}`;
}

export function buildTask10ToolEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const toolEnv: NodeJS.ProcessEnv = {};
  for (const key of ALLOWED_CHILD_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      toolEnv[key] = value;
    }
  }
  return toolEnv;
}

function buildSanitizedFacts(
  state: ValidatedProducerState,
  requireComplete = false,
): Task10SanitizedScenarioFacts {
  const facts: Task10SanitizedScenarioFacts = {};
  const runIdentityTimestamp = readRecordedAt(state.reusable ?? state.runtime) ?? SHARED_RECORDED_AT;
  facts.runIdentity = {
    tenant: 'tenant:task10-owner',
    actor: 'actor:operator-admin',
    company: 'company:owner',
    request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
    sourceObject: 'admin-session-bootstrap',
    targetObject: 'rehearsal-run-identity',
    timestamp: runIdentityTimestamp,
    proofClass: 'session-access-proof',
  };

  if (state.preflight !== undefined && state.runtime !== undefined && state.reset !== undefined) {
    facts.preflight = {
      requestId: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
      sourceObjectRef: 'admin-session-bootstrap',
      targetObjectRef: 'rehearsal-run-identity',
      proofClass: 'session-access-proof',
      occurredAt: readRecordedAt(state.reusable) ?? runIdentityTimestamp,
      identityMatched: true,
      evidenceRefs: [TASK10_AUTHORITY.coreHandoffRunbookUrl, TASK10_AUTHORITY.corePreflightUrl],
    };
    facts.runtime = {
      requestId: 'GET /readyz request:readiness:001',
      sourceObjectRef: 'runtime-readyz',
      targetObjectRef: 'runtime-identity-check',
      proofClass: 'readiness-runtime-proof',
      occurredAt: readRecordedAt(state.runtime),
      identityMatched: true,
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    };
    facts.reset = {
      requestId: 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
      sourceObjectRef: 'reset-freshness-inspection',
      targetObjectRef: 'reset-proof',
      proofClass: 'readiness-reset-proof',
      occurredAt: readRecordedAt(state.reset),
      resetState: 'passed',
      freshBusinessIds: true,
      schemaColumnsComplete: true,
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    };
  }

  if (state.successInput !== undefined && state.successMaterialized !== undefined && state.successReadback !== undefined) {
    const occurredAt = readRecordedAt(state.successInput);
    facts.success001 = {
      dispatchScenarioFact: {
        tenantRef: 'tenant:task10-owner',
        actorRef: 'actor:operator-admin',
        companyRef: 'company:owner',
        authorityRef: TASK10_AUTHORITY.coreBundleUrl,
        requestId: 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
        sourceObjectRef: 'registration-bound-dispatch',
        targetObjectRef: 'persisted-dispatch-readback',
        proofClass: 'dispatch-proof',
        evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
        occurredAt,
      },
      resultSubmissionScenarioFact: {
        tenantRef: 'tenant:task10-owner',
        actorRef: 'actor:operator-admin',
        companyRef: 'company:owner',
        authorityRef: TASK10_AUTHORITY.coreBundleUrl,
        requestId: 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
        sourceObjectRef: 'commercial-action-execution',
        targetObjectRef: 'provider-receipt-evidence',
        proofClass: 'result-submission-proof',
        evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
        occurredAt,
      },
      readbackPersisted: true,
      providerProofRef: 'provider-proof:present',
      providerReceiptRef: 'provider-receipt:present',
      providerReceiptPersisted: true,
    };
  }

  if (state.recoveryInput !== undefined && state.recoveryMaterialized !== undefined && state.recoveryReadback !== undefined) {
    facts.recovery001 = {
      scenarioFact: {
        tenantRef: 'tenant:task10-owner',
        actorRef: 'actor:operator-admin',
        companyRef: 'company:owner',
        authorityRef: TASK10_AUTHORITY.coreBundleUrl,
        requestId: 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001',
        sourceObjectRef: 'rollback-request',
        targetObjectRef: 'recovery-lineage',
        proofClass: 'recovery-proof',
        evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
        occurredAt: readRecordedAt(state.recoveryInput),
      },
      hasRecoveryLineage: true,
    };
  }

  if (state.reuseInput !== undefined && state.reuseMaterialized !== undefined && state.reuseReadback !== undefined) {
    facts.success002Reuse = {
      scenarioFact: {
        tenantRef: 'tenant:task10-owner',
        actorRef: 'actor:operator-admin',
        companyRef: 'company:owner',
        authorityRef: TASK10_AUTHORITY.coreBundleUrl,
        requestId: 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002',
        sourceObjectRef: 'reuse-readback',
        targetObjectRef: 'distinct-current-execution-ids',
        proofClass: 'reuse-proof',
        evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
        occurredAt: readRecordedAt(state.reuseInput),
      },
      isDistinctReuse: true,
    };
  }

  if (requireComplete && (facts.preflight === undefined
    || facts.runtime === undefined
    || facts.reset === undefined
    || facts.success001 === undefined
    || facts.recovery001 === undefined
    || facts.success002Reuse === undefined)) {
    throw new Error('sanitized facts are incomplete');
  }

  return facts;
}

function readRecordedAt(file: ArtifactFile | undefined): string {
  const value = file?.json.recorded_at;
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  return SHARED_RECORDED_AT;
}

export function classifyCoreProducerPrivateRootCandidate(
  coreRuntimeRoot: string,
  candidatePath: string,
): CoreProducerPrivateRootCandidateClassification {
  const normalizedCoreRoot = path.resolve(coreRuntimeRoot);
  const normalizedCandidatePath = path.resolve(candidatePath);
  return {
    candidatePath: normalizedCandidatePath,
    result: rootsOverlap(normalizedCoreRoot, normalizedCandidatePath) ? 'core-overlap-rejected' : 'accepted-external-root',
  };
}

export function createInMemoryDiagnosticPersistence(hexDigest: string) {
  return async (): Promise<PersistAndVerifyDiagnosticResult> => ({
    handle: `sha256:${hexDigest}`,
    verified: true,
  });
}

export async function probeCoreProducerPrivateRootContract(
  input: CoreProducerPrivateRootContractProbeInput,
  dependencies: {
    persistAndVerifyDiagnostic: (input: PersistAndVerifyDiagnosticInput, privateOutputRoot: string) => Promise<PersistAndVerifyDiagnosticResult>;
  },
): Promise<CoreProducerPrivateRootContractProbeOutcome> {
  const privateInputRootCandidate = classifyCoreProducerPrivateRootCandidate(input.coreRuntimeRoot, input.privateInputRoot);
  const privateOutputRootCandidate = classifyCoreProducerPrivateRootCandidate(input.coreRuntimeRoot, input.privateOutputRoot);
  if (privateInputRootCandidate.result === 'accepted-external-root' && privateOutputRootCandidate.result === 'accepted-external-root') {
    return { status: 'accepted' };
  }
  const diagnostic = {
    sourceClass: input.sourceClass,
    reason: 'core-producer-private-root-contract-unsatisfied',
    timestamp: input.now,
    candidates: {
      privateInputRoot: privateInputRootCandidate,
      privateOutputRoot: privateOutputRootCandidate,
      internalInputCandidate: classifyCoreProducerPrivateRootCandidate(input.coreRuntimeRoot, path.join(input.coreRuntimeRoot, 'private-input')),
      internalOutputCandidate: classifyCoreProducerPrivateRootCandidate(input.coreRuntimeRoot, path.join(input.coreRuntimeRoot, 'private-output')),
    },
  };
  const blockedOutcome: BlockedOutcomeBuildResult = await buildBlockedOutcome({
    reasonCode: 'core-producer-private-root-contract-unsatisfied',
    affectedModes: ['producer-contract-probe'],
    affectedFamilies: ['dispatch', 'replay-recovery', 'result-submission'],
    evidenceGroups: [],
    diagnosticSourceClass: 'producer-contract-probe',
    diagnostic,
    timestamp: input.now,
    persistAndVerifyDiagnostic: dependencies.persistAndVerifyDiagnostic,
    privateOutputRoot: input.privateOutputRoot,
  });
  return blockedOutcome;
}

export async function buildCoreProducerInvocationPlan(args: RunTask10CoreProducerArgs): Promise<CoreProducerInvocationPlan> {
  const roots = await normalizeRoots(args);
  const selectedReusableSourcePacketPath = await validateSelectedReusableSourcePacketPath(
    roots.coreRoot,
    SELECTED_REUSABLE_SOURCE_PACKET_PATH,
    'selectedReusableSourcePacketPath',
  );
  await assertPrivateRootsInitiallyEmpty(roots.privateInputRoot, roots.privateOutputRoot);
  return {
    command: 'npm',
    cwd: roots.coreRoot,
    shell: false,
    selectedReusableSourcePacketPath,
    selectedReusableSourcePacketSha256: SELECTED_REUSABLE_SOURCE_PACKET_SHA256,
    args: [
      'run',
      'run:merged-main-reproducibility-producers',
      '--',
      '--core-root', roots.coreRoot,
      '--core-sha', TASK10_AUTHORITY.coreRuntimeSha,
      '--core-branch', 'main',
      '--core-upstream', 'origin/main',
      '--core-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.core,
      '--core-package-identity', TASK10_AUTHORITY.packageIdentities.core,
      '--client-root', roots.clientRoot,
      '--client-sha', TASK10_AUTHORITY.clientBaselineSha,
      '--client-branch', 'main',
      '--client-upstream', 'origin/main',
      '--client-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.client,
      '--client-package-identity', TASK10_AUTHORITY.packageIdentities.client,
      '--site-root', roots.siteRoot,
      '--site-sha', TASK10_AUTHORITY.siteBaselineSha,
      '--site-branch', 'main',
      '--site-upstream', 'origin/main',
      '--site-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.site,
      '--site-package-identity', TASK10_AUTHORITY.packageIdentities.site,
      '--attempt-id', TASK10_AUTHORITY.attemptId,
      '--input-evidence-root', roots.privateInputRoot,
      '--output-root', roots.privateOutputRoot,
      '--selected-reusable-source-packet', selectedReusableSourcePacketPath,
      '--selected-reusable-source-packet-sha256', SELECTED_REUSABLE_SOURCE_PACKET_SHA256,
      '--source-main-commit-marker', TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      '--runtime-reported-version-marker', TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      '--bootstrap-package-version-marker', TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      '--scenario-package-version-marker', TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      '--provider-protocol-version', TASK10_AUTHORITY.providerProtocolVersion,
      '--postgres-port', String(TASK10_AUTHORITY.ports.postgres),
      '--runtime-port', String(TASK10_AUTHORITY.ports.runtime),
      '--operator-port', String(TASK10_AUTHORITY.ports.operator),
      '--fixture-port', String(TASK10_AUTHORITY.ports.fixture),
      '--provider-fixture-identity', TASK10_AUTHORITY.providerFixtureIdentity,
    ],
  };
}

export async function runTask10CoreProducer(
  args: RunTask10CoreProducerArgs,
  dependencies: Partial<RunTask10CoreProducerDependencies> = {},
): Promise<RunTask10CoreProducerOutcome> {
  const resolved = resolveDependencies(dependencies);
  const timestamp = resolved.now();

  try {
    const roots = await normalizeRoots(args);
    await assertPrivateRootsInitiallyEmpty(roots.privateInputRoot, roots.privateOutputRoot);
    if (!await validateCheckouts(roots, resolved.inspectCheckout)) {
      return { status: 'tooling-failure', errorCode: 'checkout-precondition-failed' };
    }

    const contractProbe = await resolved.probePrivateRootContract({
      coreRuntimeRoot: roots.coreRoot,
      privateInputRoot: roots.privateInputRoot,
      privateOutputRoot: roots.privateOutputRoot,
      now: timestamp,
      sourceClass: 'producer-contract-probe',
    }, resolved.persistAndVerifyDiagnostic, roots.privateOutputRoot);
    if (contractProbe.status !== 'accepted') {
      return contractProbe;
    }

    requireInheritedToken(FROZEN_TOKEN_ENV_NAME);
    const plan = await buildCoreProducerInvocationPlan(args);
    let exitCode: number;
    try {
      ({ exitCode } = await resolved.runProducer(plan));
    } catch {
      return { status: 'tooling-failure', errorCode: 'producer-spawn-failed' };
    }

    const validation = await validateOrderedProducerGraph(
      roots.privateInputRoot,
      roots.privateOutputRoot,
      timestamp,
      resolved.persistAndVerifyDiagnostic,
    );

    if (exitCode === 0) {
      return validation;
    }
    if (validation.status === 'reportable-blocked') {
      return validation;
    }
    return { status: 'tooling-failure', errorCode: 'producer-exit-nonzero' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/precondition|absolute path|symlink|overlap|empty/.test(message)) {
      return { status: 'tooling-failure', errorCode: 'input-precondition-failed' };
    }
    return { status: 'tooling-failure', errorCode: 'adapter-input-validation-failed' };
  }
}

export const runCoreProducerAdapter = runTask10CoreProducer;

function resolveDependencies(dependencies: Partial<RunTask10CoreProducerDependencies>): RunTask10CoreProducerDependencies {
  const persistAndVerifyDiagnostic = dependencies.persistAndVerifyDiagnostic ?? persistDiagnosticToFilesystem;
  const spawnProcess = dependencies.spawnProcess ?? ((command, args, options) => spawn(command, [...args], options));
  const producerTimeoutMs = dependencies.producerTimeoutMs ?? DEFAULT_PRODUCER_TIMEOUT_MS;
  const killGraceMs = dependencies.killGraceMs ?? DEFAULT_PRODUCER_KILL_GRACE_MS;
  const forceSettleMs = dependencies.forceSettleMs ?? DEFAULT_PRODUCER_FORCE_SETTLE_MS;
  const scheduleTimer = dependencies.scheduleTimer ?? setTimeout;
  const clearTimer = dependencies.clearTimer ?? clearTimeout;
  return {
    now: dependencies.now ?? (() => new Date().toISOString()),
    runProducer: dependencies.runProducer ?? ((plan) => runProducerWithSpawn(plan, {
      spawnProcess,
      producerTimeoutMs,
      killGraceMs,
      forceSettleMs,
      scheduleTimer,
      clearTimer,
    })),
    inspectCheckout: dependencies.inspectCheckout ?? inspectCheckoutWithGit,
    persistAndVerifyDiagnostic,
    probePrivateRootContract: dependencies.probePrivateRootContract ?? (async (input, persist) => await probeCoreProducerPrivateRootContract(input, { persistAndVerifyDiagnostic: persist })),
    spawnProcess,
    producerTimeoutMs,
    killGraceMs,
    forceSettleMs,
    scheduleTimer,
    clearTimer,
  };
}

async function validateOrderedProducerGraph(
  privateInputRoot: string,
  privateOutputRoot: string,
  timestamp: string,
  persistAndVerifyDiagnostic: RunTask10CoreProducerDependencies['persistAndVerifyDiagnostic'],
): Promise<RunTask10CoreProducerOutcome> {
  try {
    const validatedState: ValidatedProducerState = {};
    const runtime = await readArtifactFile(privateInputRoot, 'runtime-evidence.json');
    validatedState.runtime = runtime;
    validateRuntimeInput(runtime.json);

    const reset = await readArtifactFile(privateInputRoot, 'reset-evidence.json');
    validatedState.reset = reset;
    validateResetInput(reset.json);

    const reusable = await readArtifactFile(privateInputRoot, 'reusable-packet.json');
    validatedState.reusable = reusable;
    const selectedReusableRefs = validateReusableInput(reusable.json);

    const preflight = await readArtifactFile(privateOutputRoot, 'preflight-artifact.json');
    validatedState.preflight = preflight;
    const preflightBlocked = parseBlockedArtifactOrNull(preflight.json, 'preflight');
    if (preflightBlocked !== null) {
      return buildSimpleBlockedOutcome(
        'producer-output-preflight-blocked',
        ['preflight'],
        ['readiness'],
        [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
        ],
        buildSanitizedFacts(validatedState),
      );
    }
    validatePreflight(preflight.json, selectedReusableRefs);

    const successInput = await readArtifactFile(privateInputRoot, 'success-001/execution-input.json');
    validatedState.successInput = successInput;
    validateExecutionInput(successInput.json, 'success-001');
    const successMaterialized = await readArtifactFile(privateOutputRoot, 'success-001/materialize-output/materialized-run.json');
    validatedState.successMaterialized = successMaterialized;
    const successSnapshot = validateSuccessMaterialized(successMaterialized.json, selectedReusableRefs);
    validatedState.successSnapshot = successSnapshot;
    const successReadback = await readArtifactFile(privateOutputRoot, 'success-001/readback.json');
    validatedState.successReadback = successReadback;
    const successReadbackBlocked = parseBlockedArtifactOrNull(successReadback.json, 'success-001.readback');
    if (successReadbackBlocked !== null) {
      return buildSimpleBlockedOutcome(
        'producer-output-readback-blocked',
        ['success-001'],
        ['dispatch'],
        [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
        ],
        buildSanitizedFacts(validatedState),
      );
    }
    const readbackIdentity = validatePassedReadback(successReadback.json, 'success-001', successSnapshot);
    validatedState.readbackIdentity = readbackIdentity;

    const recoveryInput = await readArtifactFile(privateInputRoot, 'recovery-001/execution-input.json');
    validatedState.recoveryInput = recoveryInput;
    validateExecutionInput(recoveryInput.json, 'recovery-001');
    const recoveryMaterialized = await readArtifactFile(privateOutputRoot, 'recovery-001/materialize-output/materialized-run.json');
    validatedState.recoveryMaterialized = recoveryMaterialized;
    const recoverySemanticDiagnostic = validateRecoveryMaterialized(recoveryMaterialized.json, selectedReusableRefs, successSnapshot);
    if (recoverySemanticDiagnostic !== null) {
      return await buildBlockedOutcome({
        reasonCode: 'producer-output-recovery-001-lineage-missing',
        affectedModes: ['recovery-001'],
        affectedFamilies: ['replay-recovery'],
        evidenceGroups: [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
          buildEvidenceGroup('recovery-001', [recoveryInput, recoveryMaterialized], timestamp),
        ],
        diagnosticSourceClass: 'recovery-001',
        diagnostic: recoverySemanticDiagnostic,
        timestamp,
        persistAndVerifyDiagnostic,
        privateOutputRoot,
        sanitizedFacts: buildSanitizedFacts(validatedState),
      });
    }
    const recoveryReadback = await readArtifactFile(privateOutputRoot, 'recovery-001/readback.json');
    validatedState.recoveryReadback = recoveryReadback;
    const recoveryReadbackBlocked = parseBlockedArtifactOrNull(recoveryReadback.json, 'recovery-001.readback');
    if (recoveryReadbackBlocked !== null) {
      return buildSimpleBlockedOutcome(
        'producer-output-readback-blocked',
        ['recovery-001'],
        ['replay-recovery'],
        [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
          buildEvidenceGroup('recovery-001', [recoveryInput, recoveryMaterialized, recoveryReadback], timestamp),
        ],
        buildSanitizedFacts(validatedState),
      );
    }
    validatePassedReadback(
      recoveryReadback.json,
      'recovery-001',
      {
        tenantRef: requireNonEmptyString(recoveryMaterialized.json.tenant_ref, 'recovery.tenant_ref'),
        runId: RUN_IDS.recovery,
      },
      validatedState.readbackIdentity,
    );

    const reuseInput = await readArtifactFile(privateInputRoot, 'success-002-reuse/execution-input.json');
    validatedState.reuseInput = reuseInput;
    validateExecutionInput(reuseInput.json, 'success-002-reuse');
    const reuseMaterialized = await readArtifactFile(privateOutputRoot, 'success-002-reuse/materialize-output/materialized-run.json');
    validatedState.reuseMaterialized = reuseMaterialized;
    const reuseSemanticDiagnostic = validateReuseMaterialized(reuseMaterialized.json, selectedReusableRefs, successSnapshot);
    if (reuseSemanticDiagnostic !== null) {
      return await buildBlockedOutcome({
        reasonCode: 'producer-output-success-002-reuse-duplicate',
        affectedModes: ['success-002-reuse'],
        affectedFamilies: ['result-submission'],
        evidenceGroups: [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
          buildEvidenceGroup('recovery-001', [recoveryInput, recoveryMaterialized, recoveryReadback], timestamp),
          buildEvidenceGroup('success-002-reuse', [reuseInput, reuseMaterialized], timestamp),
        ],
        diagnosticSourceClass: 'success-002-reuse',
        diagnostic: reuseSemanticDiagnostic,
        timestamp,
        persistAndVerifyDiagnostic,
        privateOutputRoot,
        sanitizedFacts: buildSanitizedFacts(validatedState),
      });
    }
    const reuseReadback = await readArtifactFile(privateOutputRoot, 'success-002-reuse/readback.json');
    validatedState.reuseReadback = reuseReadback;
    const reuseReadbackBlocked = parseBlockedArtifactOrNull(reuseReadback.json, 'success-002-reuse.readback');
    if (reuseReadbackBlocked !== null) {
      return buildSimpleBlockedOutcome(
        'producer-output-readback-blocked',
        ['success-002-reuse'],
        ['result-submission'],
        [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
          buildEvidenceGroup('recovery-001', [recoveryInput, recoveryMaterialized, recoveryReadback], timestamp),
          buildEvidenceGroup('success-002-reuse', [reuseInput, reuseMaterialized, reuseReadback], timestamp),
        ],
        buildSanitizedFacts(validatedState),
      );
    }
    validatePassedReadback(
      reuseReadback.json,
      'success-002-reuse',
      {
        tenantRef: requireNonEmptyString(reuseMaterialized.json.tenant_ref, 'reuse.tenant_ref'),
        runId: RUN_IDS.reuse,
      },
      validatedState.readbackIdentity,
    );

    return {
      status: 'completed',
      evidence: {
        groups: [
          buildEvidenceGroup('runtime', [runtime], timestamp),
          buildEvidenceGroup('reset', [reset], timestamp),
          buildEvidenceGroup('preflight', [reusable, preflight], timestamp),
          buildEvidenceGroup('success-001', [successInput, successMaterialized, successReadback], timestamp),
          buildEvidenceGroup('recovery-001', [recoveryInput, recoveryMaterialized, recoveryReadback], timestamp),
          buildEvidenceGroup('success-002-reuse', [reuseInput, reuseMaterialized, reuseReadback], timestamp),
        ],
      },
      sanitizedFacts: buildSanitizedFacts(validatedState, true),
    };
  } catch {
    return { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' };
  }
}

function buildSimpleBlockedOutcome(
  reasonCode: Extract<BlockedReasonCode, 'producer-output-preflight-blocked' | 'producer-output-readback-blocked'>,
  affectedModes: Task10AffectedMode[],
  affectedFamilies: Task10ScenarioFamily[],
  evidenceGroups: Task10PrivateEvidenceGroup[],
  sanitizedFacts?: Task10SanitizedScenarioFacts,
): RunTask10CoreProducerReportableBlockedOutcome {
  return {
    status: 'reportable-blocked',
    reasonCodes: [reasonCode],
    affectedModes,
    affectedFamilies,
    evidence: { groups: evidenceGroups },
    ...(sanitizedFacts === undefined ? {} : { sanitizedFacts }),
  };
}

async function buildBlockedOutcome(input: {
  reasonCode: Extract<BlockedReasonCode, 'core-producer-private-root-contract-unsatisfied' | 'producer-output-recovery-001-lineage-missing' | 'producer-output-success-002-reuse-duplicate'>;
  affectedModes: Task10AffectedMode[];
  affectedFamilies: Task10ScenarioFamily[];
  evidenceGroups: Task10PrivateEvidenceGroup[];
  diagnosticSourceClass: Task10EvidenceSourceClass;
  diagnostic: Record<string, unknown>;
  timestamp: string;
  persistAndVerifyDiagnostic: RunTask10CoreProducerDependencies['persistAndVerifyDiagnostic'];
  privateOutputRoot: string;
  sanitizedFacts?: Task10SanitizedScenarioFacts;
}): Promise<BlockedOutcomeBuildResult> {
  let persisted: PersistAndVerifyDiagnosticResult;
  try {
    persisted = await input.persistAndVerifyDiagnostic({
      privateDiagnostic: input.diagnostic,
      sourceClass: input.diagnosticSourceClass,
      timestamp: input.timestamp,
    }, input.privateOutputRoot);
  } catch {
    return { status: 'tooling-failure', errorCode: 'private-diagnostic-persistence-failed' };
  }
  if (!persisted.verified) {
    return { status: 'tooling-failure', errorCode: 'private-diagnostic-verify-failed' };
  }
  const attestation: Task10PrivateEvidenceAttestation = {
    handle: persisted.handle,
    sourceClass: input.diagnosticSourceClass,
    verified: true,
    verifiedAt: input.timestamp,
  };
  let groups: Task10PrivateEvidenceGroup[];
  try {
    groups = input.evidenceGroups.map((group) => group.sourceClass === input.diagnosticSourceClass
      ? buildCanonicalEvidenceGroup(
          group.sourceClass,
          [
            ...group.handles.map((handle, index) => ({
              handle,
              attestation: group.attestations[index]!,
            })),
            {
              handle: persisted.handle,
              attestation,
            },
          ],
        )
      : { ...group, handles: [...group.handles], attestations: [...group.attestations] });
    if (!groups.some((group) => group.sourceClass === input.diagnosticSourceClass)) {
      groups.push(buildCanonicalEvidenceGroup(input.diagnosticSourceClass, [{ handle: persisted.handle, attestation }]));
    }
  } catch {
    return { status: 'tooling-failure', errorCode: 'private-diagnostic-verify-failed' };
  }
  return {
    status: 'reportable-blocked',
    reasonCodes: [input.reasonCode],
    affectedModes: input.affectedModes,
    affectedFamilies: input.affectedFamilies,
    evidence: { groups },
    ...(input.sanitizedFacts === undefined ? {} : { sanitizedFacts: input.sanitizedFacts }),
    publicDiagnostic: {
      sourceClass: input.diagnosticSourceClass,
      reason: input.reasonCode,
      affectedModes: input.affectedModes,
      affectedFamilies: input.affectedFamilies,
      timestamp: input.timestamp,
      handle: persisted.handle,
      attestation,
    },
  };
}

function parseBlockedArtifactOrNull(value: Record<string, unknown>, fieldName: string): Record<string, unknown> | null {
  const result = value.result;
  if (result === 'passed') {
    return null;
  }
  requireExactKeys(value, ['result', 'scope', 'authority_effect', 'release_effect', 'blocker_owner', 'reason_code', 'required_evidence', 'next_permitted_action', 'rollback_point', 'next_review_time'], fieldName);
  requireLiteralString(value.result, 'blocked', `${fieldName}.result`);
  requireLiteralString(value.scope, SHARED_SCOPE, `${fieldName}.scope`);
  requireLiteralString(value.authority_effect, 'none', `${fieldName}.authority_effect`);
  requireLiteralString(value.release_effect, 'none', `${fieldName}.release_effect`);
  requireNonEmptyString(value.blocker_owner, `${fieldName}.blocker_owner`);
  requireNonEmptyString(value.reason_code, `${fieldName}.reason_code`);
  requireNonEmptyStringArray(value.required_evidence, `${fieldName}.required_evidence`);
  requireNonEmptyString(value.next_permitted_action, `${fieldName}.next_permitted_action`);
  requireNonEmptyString(value.rollback_point, `${fieldName}.rollback_point`);
  requireIsoTimestamp(value.next_review_time, `${fieldName}.next_review_time`);
  return value;
}

function validateRuntimeInput(value: Record<string, unknown>): void {
  validateInputEnvelope(value, [...INPUT_ENVELOPE_KEYS, 'core_image_digest', 'build_context_ref', 'source_marker', 'runtime_marker', 'bootstrap_marker', 'scenario_marker', 'provider_protocol_version', 'ports'], 'merged-main-runtime-evidence');
  const subset = {
    core_image_digest: requireNonEmptyString(value.core_image_digest, 'runtime.core_image_digest'),
    build_context_ref: requireNonEmptyString(value.build_context_ref, 'runtime.build_context_ref'),
    source_marker: requireLiteralString(value.source_marker, TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker, 'runtime.source_marker'),
    runtime_marker: requireLiteralString(value.runtime_marker, TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker, 'runtime.runtime_marker'),
    bootstrap_marker: requireLiteralString(value.bootstrap_marker, TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker, 'runtime.bootstrap_marker'),
    scenario_marker: requireLiteralString(value.scenario_marker, TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker, 'runtime.scenario_marker'),
    provider_protocol_version: requireLiteralString(value.provider_protocol_version, TASK10_AUTHORITY.providerProtocolVersion, 'runtime.provider_protocol_version'),
    ports: requireExactPorts(value.ports, 'runtime.ports'),
  };
  assertExactString(requireSha256Hex(value.artifact_hash, 'runtime.artifact_hash'), hashTextSha256(JSON.stringify(subset)), 'runtime.artifact_hash');
}

function validateResetInput(value: Record<string, unknown>): void {
  validateInputEnvelope(value, [...INPUT_ENVELOPE_KEYS, 'reset_state', 'reset_detail', 'fresh_business_ids', 'schema_columns_complete'], 'merged-main-reset-evidence');
  const subset = {
    reset_state: requireEnumString(value.reset_state, ['passed', 'failed', 'ambiguous'], 'reset.reset_state'),
    reset_detail: requireNonEmptyString(value.reset_detail, 'reset.reset_detail'),
    fresh_business_ids: requireLiteralBoolean(value.fresh_business_ids, true, 'reset.fresh_business_ids'),
    schema_columns_complete: requireLiteralBoolean(value.schema_columns_complete, true, 'reset.schema_columns_complete'),
  };
  assertExactString(requireSha256Hex(value.artifact_hash, 'reset.artifact_hash'), hashTextSha256(JSON.stringify(subset)), 'reset.artifact_hash');
}

function validateReusableInput(value: Record<string, unknown>): string[] {
  validateInputEnvelope(value, [...INPUT_ENVELOPE_KEYS, 'selected_reusable_refs'], 'merged-main-reusable-packet');
  assertExactStringArray(requireNonEmptyStringArray(value.source_refs, 'reusable.source_refs'), EXPECTED_REUSABLE_SOURCE_REFS, 'reusable.source_refs');
  const refs = requireReusableRefs(value.selected_reusable_refs, 'reusable.selected_reusable_refs');
  assertExactStringArray(refs, EXPECTED_SELECTED_REUSABLE_REFS, 'reusable.selected_reusable_refs');
  assertExactString(requireSha256Hex(value.artifact_hash, 'reusable.artifact_hash'), hashTextSha256(JSON.stringify({ selected_reusable_refs: refs })), 'reusable.artifact_hash');
  return refs;
}

function validateExecutionInput(value: Record<string, unknown>, mode: ModeName): void {
  validateInputEnvelope(value, [...INPUT_ENVELOPE_KEYS, 'mode', 'execution_result'], 'merged-main-core-execution-input');
  requireLiteralString(value.mode, mode, `${mode}.mode`);
  const executionResult = requireObject(value.execution_result, `${mode}.execution_result`);
  if (mode === 'success-001') {
    requireExactKeys(executionResult, ['tenant_ref', 'actor_family', 'company_ref', 'authority_ref', 'request_ref', 'listing_ref', 'match_ref', 'opportunity_ref', 'package_ref', 'task_ref', 'assignment_ref', 'approval_ref', 'external_operation_ref', 'receipt_ref', 'audit_ref', 'outcome_ref', 'feedback_ref', 'lineage_refs', 'scenario_rows', 'package_state', 'provider_receipt_status'], `${mode}.execution_result`);
    requireLiteralString(executionResult.package_state, 'EXPORTED', `${mode}.package_state`);
    requireLiteralString(executionResult.provider_receipt_status, 'accepted', `${mode}.provider_receipt_status`);
    requireNonEmptyStringArray(executionResult.lineage_refs, `${mode}.lineage_refs`);
    validateScenarioRows(executionResult.scenario_rows, `${mode}.scenario_rows`, RUN_IDS.success);
  } else if (mode === 'recovery-001') {
    requireExactKeys(executionResult, ['trigger', 'tenant_ref', 'predecessor_tenant_ref', 'failed_request_ref', 'resumed_request_ref', 'failed_external_operation_ref', 'failed_reason_code', 'success_receipt_ref', 'provider_complete_package_ref', 'rollback_ref', 'compensation_ref', 'reconciliation_ref', 'predecessor_refs', 'recovery_task_ref', 'recovery_policy_ref', 'recovery_assignment_ref', 'restart_readback_ref', 'resumed_external_operation_ref', 'scenario_rows'], `${mode}.execution_result`);
    requireLiteralString(executionResult.trigger, 'provider_failure_after_external_operation_reservation', `${mode}.trigger`);
    validateScenarioRows(executionResult.scenario_rows, `${mode}.scenario_rows`, RUN_IDS.recovery);
  } else {
    requireExactKeys(executionResult, ['tenant_ref', 'actor_family', 'company_ref', 'authority_ref', 'prior_account_ref', 'prior_session_ref', 'prior_request_ref', 'prior_listing_ref', 'prior_opportunity_ref', 'prior_external_operation_ref', 'prior_receipt_ref', 'account_ref', 'session_ref', 'request_ref', 'listing_ref', 'opportunity_ref', 'external_operation_ref', 'receipt_ref', 'package_ref', 'reused_asset_refs', 'evidence_shape_refs', 'lineage_distinction_ref', 'metric_policy_satisfied', 'scenario_rows', 'terminal_package_state'], `${mode}.execution_result`);
    requireLiteralBoolean(executionResult.metric_policy_satisfied, true, `${mode}.metric_policy_satisfied`);
    requireLiteralString(executionResult.terminal_package_state, 'EXPORTED', `${mode}.terminal_package_state`);
    validateScenarioRows(executionResult.scenario_rows, `${mode}.scenario_rows`, RUN_IDS.reuse);
  }
  assertExactString(requireSha256Hex(value.artifact_hash, `${mode}.artifact_hash`), hashTextSha256(JSON.stringify({ mode, execution_result: executionResult })), `${mode}.artifact_hash`);
}

function validatePreflight(value: Record<string, unknown>, selectedReusableRefs: string[]): void {
  requireExactKeys(value, ['result', 'scope', 'authority_effect', 'release_effect', 'attempt_id', 'repo_identity', 'tool_identity', 'runtime_identity', 'reset_freshness', 'selected_reusable_refs'], 'preflight');
  requireLiteralString(value.result, 'passed', 'preflight.result');
  requireLiteralString(value.scope, SHARED_SCOPE, 'preflight.scope');
  requireLiteralString(value.authority_effect, 'none', 'preflight.authority_effect');
  requireLiteralString(value.release_effect, 'none', 'preflight.release_effect');
  requireLiteralString(value.attempt_id, TASK10_AUTHORITY.attemptId, 'preflight.attempt_id');

  const repoIdentity = requireObject(value.repo_identity, 'preflight.repo_identity');
  requireExactKeys(repoIdentity, ['core', 'client', 'site'], 'preflight.repo_identity');
  validateRepoIdentity(repoIdentity.core, 'core', TASK10_AUTHORITY.coreRuntimeSha, TASK10_AUTHORITY.lockfileSha256.core, TASK10_AUTHORITY.packageIdentities.core);
  validateRepoIdentity(repoIdentity.client, 'client', TASK10_AUTHORITY.clientBaselineSha, TASK10_AUTHORITY.lockfileSha256.client, TASK10_AUTHORITY.packageIdentities.client);
  validateRepoIdentity(repoIdentity.site, 'site', TASK10_AUTHORITY.siteBaselineSha, TASK10_AUTHORITY.lockfileSha256.site, TASK10_AUTHORITY.packageIdentities.site);

  const toolIdentity = requireObject(value.tool_identity, 'preflight.tool_identity');
  requireExactKeys(toolIdentity, ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'], 'preflight.tool_identity');
  for (const key of ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'] as const) {
    requireNonEmptyString(toolIdentity[key], `preflight.tool_identity.${key}`);
  }

  const runtimeIdentity = requireObject(value.runtime_identity, 'preflight.runtime_identity');
  requireExactKeys(runtimeIdentity, ['core_image_digest', 'build_context_ref', 'source_marker', 'runtime_marker', 'bootstrap_marker', 'scenario_marker', 'client_package_identity', 'site_build_identity', 'provider_fixture_identity', 'provider_protocol_version', 'compose_project', 'container_names', 'ports', 'network_identity'], 'preflight.runtime_identity');
  requireLiteralString(runtimeIdentity.client_package_identity, TASK10_AUTHORITY.packageIdentities.client, 'preflight.runtime_identity.client_package_identity');
  requireLiteralString(runtimeIdentity.site_build_identity, TASK10_AUTHORITY.packageIdentities.site, 'preflight.runtime_identity.site_build_identity');
  requireLiteralString(runtimeIdentity.provider_fixture_identity, TASK10_AUTHORITY.providerFixtureIdentity, 'preflight.runtime_identity.provider_fixture_identity');
  requireLiteralString(runtimeIdentity.provider_protocol_version, TASK10_AUTHORITY.providerProtocolVersion, 'preflight.runtime_identity.provider_protocol_version');
  requireLiteralString(runtimeIdentity.compose_project, COMPOSE_PROJECT, 'preflight.runtime_identity.compose_project');
  assertExactStringArray(requireNonEmptyStringArray(runtimeIdentity.container_names, 'preflight.runtime_identity.container_names'), EXPECTED_CONTAINER_NAMES, 'preflight.runtime_identity.container_names');
  requireExactPorts(runtimeIdentity.ports, 'preflight.runtime_identity.ports');
  requireLiteralString(runtimeIdentity.network_identity, `${COMPOSE_PROJECT}_default`, 'preflight.runtime_identity.network_identity');

  const resetFreshness = requireObject(value.reset_freshness, 'preflight.reset_freshness');
  requireExactKeys(resetFreshness, ['reset_state', 'reset_detail', 'output_directory_empty', 'output_directory_symlinked', 'fresh_business_ids', 'selected_reusable_refs', 'schema_columns_complete'], 'preflight.reset_freshness');
  requireLiteralString(resetFreshness.reset_state, 'passed', 'preflight.reset_freshness.reset_state');
  requireNonEmptyString(resetFreshness.reset_detail, 'preflight.reset_freshness.reset_detail');
  requireLiteralBoolean(resetFreshness.output_directory_empty, true, 'preflight.reset_freshness.output_directory_empty');
  requireLiteralBoolean(resetFreshness.output_directory_symlinked, false, 'preflight.reset_freshness.output_directory_symlinked');
  requireLiteralBoolean(resetFreshness.fresh_business_ids, true, 'preflight.reset_freshness.fresh_business_ids');
  requireLiteralBoolean(resetFreshness.schema_columns_complete, true, 'preflight.reset_freshness.schema_columns_complete');
  assertExactStringArray(requireReusableRefs(resetFreshness.selected_reusable_refs, 'preflight.reset_freshness.selected_reusable_refs'), selectedReusableRefs, 'preflight.reset_freshness.selected_reusable_refs');
  assertExactStringArray(requireReusableRefs(value.selected_reusable_refs, 'preflight.selected_reusable_refs'), selectedReusableRefs, 'preflight.selected_reusable_refs');
}

function validateRepoIdentity(value: unknown, repoName: 'core' | 'client' | 'site', fullSha: string, lockfileHash: string, packageIdentity: string): void {
  const repo = requireObject(value, `${repoName}.repo`);
  requireExactKeys(repo, ['repo_name', 'full_sha', 'branch', 'upstream_ref', 'tracked_dirty', 'untracked_dirty', 'detached', 'lockfile_hash', 'package_identity', 'contains_sisyphus_dependency'], `${repoName}.repo`);
  requireLiteralString(repo.repo_name, repoName, `${repoName}.repo_name`);
  requireLiteralString(repo.full_sha, fullSha, `${repoName}.repo.full_sha`);
  requireLiteralString(repo.branch, 'main', `${repoName}.repo.branch`);
  requireLiteralString(repo.upstream_ref, 'origin/main', `${repoName}.repo.upstream_ref`);
  requireLiteralBoolean(repo.tracked_dirty, false, `${repoName}.repo.tracked_dirty`);
  requireLiteralBoolean(repo.untracked_dirty, false, `${repoName}.repo.untracked_dirty`);
  requireLiteralBoolean(repo.detached, false, `${repoName}.repo.detached`);
  requireLiteralString(repo.lockfile_hash, lockfileHash, `${repoName}.repo.lockfile_hash`);
  requireLiteralString(repo.package_identity, packageIdentity, `${repoName}.repo.package_identity`);
  requireLiteralBoolean(repo.contains_sisyphus_dependency, false, `${repoName}.repo.contains_sisyphus_dependency`);
}

function validateSuccessMaterialized(value: Record<string, unknown>, selectedReusableRefs: string[]): SuccessSnapshot {
  requireExactKeys(value, ['result', 'scope', 'authority_effect', 'release_effect', 'mode', 'run_id', 'tenant_ref', 'actor_family', 'company_ref', 'authority_ref', 'request_ref', 'listing_ref', 'match_ref', 'opportunity_ref', 'package_ref', 'task_ref', 'assignment_ref', 'approval_ref', 'external_operation_ref', 'receipt_ref', 'audit_ref', 'outcome_ref', 'feedback_ref', 'lineage_refs', 'scenario_rows', 'terminal_package_state', 'provider_receipt_status', 'selected_reusable_refs', 'non_claims'], 'success.materialized');
  requireLiteralString(value.result, 'passed', 'success.result');
  requireLiteralString(value.scope, SHARED_SCOPE, 'success.scope');
  requireLiteralString(value.mode, 'success-001', 'success.mode');
  const runId = requireLiteralString(value.run_id, RUN_IDS.success, 'success.run_id');
  const tenantRef = requireNonEmptyString(value.tenant_ref, 'success.tenant_ref');
  const companyRef = requireNonEmptyString(value.company_ref, 'success.company_ref');
  const authorityRef = requireNonEmptyString(value.authority_ref, 'success.authority_ref');
  const requestRef = requireNonEmptyString(value.request_ref, 'success.request_ref');
  const listingRef = requireNonEmptyString(value.listing_ref, 'success.listing_ref');
  const opportunityRef = requireNonEmptyString(value.opportunity_ref, 'success.opportunity_ref');
  const externalOperationRef = requireNonEmptyString(value.external_operation_ref, 'success.external_operation_ref');
  const receiptRef = requireNonEmptyString(value.receipt_ref, 'success.receipt_ref');
  requireLiteralString(value.terminal_package_state, 'EXPORTED', 'success.terminal_package_state');
  requireLiteralString(value.provider_receipt_status, 'accepted', 'success.provider_receipt_status');
  requireNonEmptyStringArray(value.lineage_refs, 'success.lineage_refs');
  assertExactStringArray(requireReusableRefs(value.selected_reusable_refs, 'success.selected_reusable_refs'), selectedReusableRefs, 'success.selected_reusable_refs');
  assertExactStringArray(requireNonEmptyStringArray(value.non_claims, 'success.non_claims'), REQUIRED_NON_CLAIMS, 'success.non_claims');
  const rows = validateScenarioRows(value.scenario_rows, 'success.scenario_rows', RUN_IDS.success);
  return {
    runId,
    tenantRef,
    companyRef,
    authorityRef,
    actorRef: requireNonEmptyString(rows[0]?.actor_ref, 'success.scenario_rows[0].actor_ref'),
    requestRef,
    listingRef,
    opportunityRef,
    externalOperationRef,
    receiptRef,
  };
}

function validateRecoveryMaterialized(value: Record<string, unknown>, selectedReusableRefs: string[], success: SuccessSnapshot): Record<string, unknown> | null {
  requireExactKeys(value, ['result', 'scope', 'authority_effect', 'release_effect', 'mode', 'run_id', 'trigger', 'tenant_ref', 'predecessor_tenant_ref', 'failed_request_ref', 'resumed_request_ref', 'failed_external_operation_ref', 'failed_reason_code', 'success_receipt_ref', 'provider_complete_package_ref', 'rollback_ref', 'compensation_ref', 'reconciliation_ref', 'predecessor_refs', 'recovery_task_ref', 'recovery_policy_ref', 'recovery_assignment_ref', 'restart_readback_ref', 'resumed_external_operation_ref', 'scenario_rows', 'selected_reusable_refs', 'non_claims'], 'recovery.materialized');
  requireLiteralString(value.result, 'passed', 'recovery.result');
  requireLiteralString(value.scope, SHARED_SCOPE, 'recovery.scope');
  requireLiteralString(value.mode, 'recovery-001', 'recovery.mode');
  requireLiteralString(value.run_id, RUN_IDS.recovery, 'recovery.run_id');
  requireLiteralString(value.trigger, 'provider_failure_after_external_operation_reservation', 'recovery.trigger');
  const tenantRef = requireNonEmptyString(value.tenant_ref, 'recovery.tenant_ref');
  const predecessorTenantRef = requireNonEmptyString(value.predecessor_tenant_ref, 'recovery.predecessor_tenant_ref');
  const failedRequestRef = requireNonEmptyString(value.failed_request_ref, 'recovery.failed_request_ref');
  const resumedRequestRef = requireNonEmptyString(value.resumed_request_ref, 'recovery.resumed_request_ref');
  const failedExternalOperationRef = requireNonEmptyString(value.failed_external_operation_ref, 'recovery.failed_external_operation_ref');
  const resumedExternalOperationRef = requireNonEmptyString(value.resumed_external_operation_ref, 'recovery.resumed_external_operation_ref');
  requireNonEmptyString(value.failed_reason_code, 'recovery.failed_reason_code');
  requireNonEmptyString(value.rollback_ref, 'recovery.rollback_ref');
  requireNonEmptyString(value.compensation_ref, 'recovery.compensation_ref');
  requireNonEmptyString(value.reconciliation_ref, 'recovery.reconciliation_ref');
  requireNonEmptyString(value.recovery_task_ref, 'recovery.recovery_task_ref');
  requireNonEmptyString(value.recovery_policy_ref, 'recovery.recovery_policy_ref');
  requireNonEmptyString(value.recovery_assignment_ref, 'recovery.recovery_assignment_ref');
  requireNonEmptyString(value.restart_readback_ref, 'recovery.restart_readback_ref');
  const predecessorRefs = requireNonEmptyStringArray(value.predecessor_refs, 'recovery.predecessor_refs');
  assertExactStringArray(requireReusableRefs(value.selected_reusable_refs, 'recovery.selected_reusable_refs'), selectedReusableRefs, 'recovery.selected_reusable_refs');
  assertExactStringArray(requireNonEmptyStringArray(value.non_claims, 'recovery.non_claims'), REQUIRED_NON_CLAIMS, 'recovery.non_claims');
  validateScenarioRows(value.scenario_rows, 'recovery.scenario_rows', RUN_IDS.recovery);

  if (predecessorTenantRef !== tenantRef) {
    return { sourceClass: 'recovery-001', reason: 'predecessor_tenant_ref_mismatch' };
  }
  if (failedRequestRef === resumedRequestRef) {
    return { sourceClass: 'recovery-001', reason: 'failed_resumed_requests_equal' };
  }
  if (value.success_receipt_ref !== null || value.provider_complete_package_ref !== null) {
    return { sourceClass: 'recovery-001', reason: 'success_fields_not_null' };
  }
  if (!predecessorRefs.includes(failedExternalOperationRef)) {
    return { sourceClass: 'recovery-001', reason: 'predecessor_refs_missing_failed_external_operation' };
  }
  if (resumedExternalOperationRef === failedExternalOperationRef) {
    return { sourceClass: 'recovery-001', reason: 'resumed_external_operation_matches_failed' };
  }
  if (success.requestRef === failedRequestRef || success.requestRef === resumedRequestRef) {
    return { sourceClass: 'recovery-001', reason: 'success_request_overlaps_recovery_requests' };
  }
  return null;
}

function validateReuseMaterialized(value: Record<string, unknown>, selectedReusableRefs: string[], success: SuccessSnapshot): Record<string, unknown> | null {
  requireExactKeys(value, ['result', 'scope', 'authority_effect', 'release_effect', 'mode', 'run_id', 'tenant_ref', 'actor_family', 'company_ref', 'authority_ref', 'prior_account_ref', 'prior_session_ref', 'prior_request_ref', 'prior_listing_ref', 'prior_opportunity_ref', 'prior_external_operation_ref', 'prior_receipt_ref', 'account_ref', 'session_ref', 'request_ref', 'listing_ref', 'opportunity_ref', 'external_operation_ref', 'receipt_ref', 'package_ref', 'reused_asset_refs', 'evidence_shape_refs', 'lineage_distinction_ref', 'metric_policy_satisfied', 'scenario_rows', 'terminal_package_state', 'selected_reusable_refs', 'non_claims'], 'reuse.materialized');
  requireLiteralString(value.result, 'passed', 'reuse.result');
  requireLiteralString(value.scope, SHARED_SCOPE, 'reuse.scope');
  requireLiteralString(value.mode, 'success-002-reuse', 'reuse.mode');
  requireLiteralString(value.run_id, RUN_IDS.reuse, 'reuse.run_id');
  const priorRequestRef = requireNonEmptyString(value.prior_request_ref, 'reuse.prior_request_ref');
  const priorListingRef = requireNonEmptyString(value.prior_listing_ref, 'reuse.prior_listing_ref');
  const priorOpportunityRef = requireNonEmptyString(value.prior_opportunity_ref, 'reuse.prior_opportunity_ref');
  const priorExternalOperationRef = requireNonEmptyString(value.prior_external_operation_ref, 'reuse.prior_external_operation_ref');
  const priorReceiptRef = requireNonEmptyString(value.prior_receipt_ref, 'reuse.prior_receipt_ref');
  const priorAccountRef = requireNonEmptyString(value.prior_account_ref, 'reuse.prior_account_ref');
  const priorSessionRef = requireNonEmptyString(value.prior_session_ref, 'reuse.prior_session_ref');
  const accountRef = requireNonEmptyString(value.account_ref, 'reuse.account_ref');
  const sessionRef = requireNonEmptyString(value.session_ref, 'reuse.session_ref');
  const requestRef = requireNonEmptyString(value.request_ref, 'reuse.request_ref');
  const listingRef = requireNonEmptyString(value.listing_ref, 'reuse.listing_ref');
  const opportunityRef = requireNonEmptyString(value.opportunity_ref, 'reuse.opportunity_ref');
  const externalOperationRef = requireNonEmptyString(value.external_operation_ref, 'reuse.external_operation_ref');
  const receiptRef = requireNonEmptyString(value.receipt_ref, 'reuse.receipt_ref');
  requireNonEmptyString(value.package_ref, 'reuse.package_ref');
  requireLiteralBoolean(value.metric_policy_satisfied, true, 'reuse.metric_policy_satisfied');
  requireLiteralString(value.terminal_package_state, 'EXPORTED', 'reuse.terminal_package_state');
  const reusedAssetRefs = requireReusableRefs(value.reused_asset_refs, 'reuse.reused_asset_refs');
  const selectedRefs = requireReusableRefs(value.selected_reusable_refs, 'reuse.selected_reusable_refs');
  const evidenceShapeRefs = requireNonEmptyStringArray(value.evidence_shape_refs, 'reuse.evidence_shape_refs');
  requireNonEmptyString(value.lineage_distinction_ref, 'reuse.lineage_distinction_ref');
  assertExactStringArray(requireNonEmptyStringArray(value.non_claims, 'reuse.non_claims'), REQUIRED_NON_CLAIMS, 'reuse.non_claims');
  validateScenarioRows(value.scenario_rows, 'reuse.scenario_rows', RUN_IDS.reuse);

  if (priorRequestRef !== success.requestRef
    || priorListingRef !== success.listingRef
    || priorOpportunityRef !== success.opportunityRef
    || priorExternalOperationRef !== success.externalOperationRef
    || priorReceiptRef !== success.receiptRef) {
    return { sourceClass: 'success-002-reuse', reason: 'prior_refs_mismatch_success' };
  }
  if (accountRef === priorAccountRef
    || sessionRef === priorSessionRef
    || requestRef === priorRequestRef
    || listingRef === priorListingRef
    || opportunityRef === priorOpportunityRef
    || externalOperationRef === priorExternalOperationRef
    || receiptRef === priorReceiptRef) {
    return { sourceClass: 'success-002-reuse', reason: 'current_refs_not_distinct' };
  }
  assertExactStringArray(reusedAssetRefs, selectedReusableRefs, 'reuse.reused_asset_refs');
  assertExactStringArray(selectedRefs, selectedReusableRefs, 'reuse.selected_reusable_refs');
  if (evidenceShapeRefs.length === 0) {
    return { sourceClass: 'success-002-reuse', reason: 'evidence_shape_refs_empty' };
  }
  return null;
}

function validatePassedReadback(
  value: Record<string, unknown>,
  mode: ModeName,
  materialized: { tenantRef: string; runId: string },
  expectedIdentity?: ReadbackIdentitySnapshot,
): ReadbackIdentitySnapshot {
  requireExactKeys(value, ['result', 'attempt_id', 'run_id', 'mode', 'readback_ref', 'tenant_id', 'owner_company_id', 'operator_actor_id', 'authority_ref'], `${mode}.readback`);
  requireLiteralString(value.result, 'passed', `${mode}.readback.result`);
  requireLiteralString(value.attempt_id, TASK10_AUTHORITY.attemptId, `${mode}.readback.attempt_id`);
  requireLiteralString(value.run_id, materialized.runId, `${mode}.readback.run_id`);
  requireLiteralString(value.mode, mode, `${mode}.readback.mode`);
  requireNonEmptyString(value.readback_ref, `${mode}.readback.readback_ref`);
  const identity = {
    tenantId: requireLiteralString(value.tenant_id, materialized.tenantRef, `${mode}.readback.tenant_id`),
    ownerCompanyId: requireNonEmptyString(value.owner_company_id, `${mode}.readback.owner_company_id`),
    operatorActorId: requireNonEmptyString(value.operator_actor_id, `${mode}.readback.operator_actor_id`),
    authorityRef: requireNonEmptyString(value.authority_ref, `${mode}.readback.authority_ref`),
  } satisfies ReadbackIdentitySnapshot;
  if (expectedIdentity) {
    requireLiteralString(identity.tenantId, expectedIdentity.tenantId, `${mode}.readback.tenant_id`);
    requireLiteralString(identity.ownerCompanyId, expectedIdentity.ownerCompanyId, `${mode}.readback.owner_company_id`);
    requireLiteralString(identity.operatorActorId, expectedIdentity.operatorActorId, `${mode}.readback.operator_actor_id`);
    requireLiteralString(identity.authorityRef, expectedIdentity.authorityRef, `${mode}.readback.authority_ref`);
  }
  return identity;
}

function validateScenarioRows(value: unknown, fieldName: string, runId: string): Record<string, unknown>[] {
  const rows = requireArrayOfObjects(value, fieldName);
  if (rows.length === 0) {
    throw new Error(`${fieldName} must not be empty`);
  }
  for (const row of rows) {
    requireExactKeys(row, ['tenant_ref', 'actor_ref', 'actor_family', 'company_ref', 'authority_ref', 'request_id', 'source_object_ref', 'target_object_ref', 'task_or_approval_ref', 'proof_class', 'evidence_refs', 'occurred_at', 'run_identity_ref'], fieldName);
    requireNonEmptyString(row.tenant_ref, `${fieldName}.tenant_ref`);
    requireNonEmptyString(row.actor_ref, `${fieldName}.actor_ref`);
    requireNonEmptyString(row.actor_family, `${fieldName}.actor_family`);
    requireNonEmptyString(row.company_ref, `${fieldName}.company_ref`);
    requireNonEmptyString(row.authority_ref, `${fieldName}.authority_ref`);
    requireNonEmptyString(row.request_id, `${fieldName}.request_id`);
    requireNonEmptyString(row.source_object_ref, `${fieldName}.source_object_ref`);
    requireNonEmptyString(row.target_object_ref, `${fieldName}.target_object_ref`);
    requireNonEmptyString(row.task_or_approval_ref, `${fieldName}.task_or_approval_ref`);
    requireNonEmptyString(row.proof_class, `${fieldName}.proof_class`);
    requireNonEmptyStringArray(row.evidence_refs, `${fieldName}.evidence_refs`);
    requireIsoTimestamp(row.occurred_at, `${fieldName}.occurred_at`);
    if (requireNonEmptyString(row.run_identity_ref, `${fieldName}.run_identity_ref`) !== `run:${runId}:1`) {
      throw new Error(`${fieldName}.run_identity_ref mismatch`);
    }
  }
  return rows;
}

function validateInputEnvelope(value: Record<string, unknown>, keys: readonly string[], proofClass: string): void {
  requireExactKeys(value, keys, proofClass);
  requireLiteralString(value.result, 'passed', `${proofClass}.result`);
  requireLiteralString(value.scope, SHARED_SCOPE, `${proofClass}.scope`);
  requireLiteralString(value.authority_effect, 'none', `${proofClass}.authority_effect`);
  requireLiteralString(value.release_effect, 'none', `${proofClass}.release_effect`);
  requireLiteralString(value.owner, SHARED_OWNER, `${proofClass}.owner`);
  requireIsoTimestamp(value.recorded_at, `${proofClass}.recorded_at`);
  requireNonEmptyStringArray(value.source_refs, `${proofClass}.source_refs`);
  requireSha256Hex(value.artifact_hash, `${proofClass}.artifact_hash`);
  requireLiteralString(value.proof_class, proofClass, `${proofClass}.proof_class`);
}

function buildEvidenceGroup(sourceClass: Task10EvidenceSourceClass, files: ArtifactFile[], timestamp: string): Task10PrivateEvidenceGroup {
  return buildCanonicalEvidenceGroup(
    sourceClass,
    files.map((file) => ({
      handle: file.handle,
      attestation: {
        handle: file.handle,
        sourceClass,
        verified: true,
        verifiedAt: timestamp,
      },
    })),
  );
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function buildCanonicalEvidenceGroup(sourceClass: Task10EvidenceSourceClass, pairs: EvidencePair[]): Task10PrivateEvidenceGroup {
  const sortedPairs = [...pairs].sort((left, right) => compareCodeUnits(left.handle, right.handle));
  for (let index = 1; index < sortedPairs.length; index += 1) {
    if (sortedPairs[index - 1]!.handle === sortedPairs[index]!.handle) {
      throw new Error('duplicate evidence handle');
    }
  }
  return {
    sourceClass,
    handles: sortedPairs.map((pair) => pair.handle),
    attestations: sortedPairs.map((pair) => pair.attestation),
  };
}

async function readArtifactFile(root: string, relativePath: string): Promise<ArtifactFile> {
  const absolutePath = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (absolutePath !== normalizedRoot && !absolutePath.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error('artifact path escapes root');
  }
  const parentPath = path.dirname(absolutePath);
  if (parentPath !== normalizedRoot) {
    await rejectSymlinkedPathSegments(parentPath, relativePath);
  }
  const bytes = await readBoundedFile(absolutePath, relativePath, ARTIFACT_JSON_MAX_BYTES);
  const text = bytes.toString('utf8');
  const json = requireObject(JSON.parse(text) as unknown, relativePath);
  return {
    text,
    json,
    handle: `sha256:${createHash('sha256').update(bytes).digest('hex')}` as `sha256:${string}`,
  };
}

async function readBoundedFile(filePath: string, fieldName: string, maxBytes: number): Promise<Buffer> {
  const handle = await open(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const fileStat = await handle.stat();
    if (!fileStat.isFile()) {
      throw new Error(`${fieldName} must be a regular file`);
    }
    if (fileStat.size > maxBytes) {
      throw new Error(`${fieldName} exceeds max bytes`);
    }
    const contents = await handle.readFile();
    return Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  } finally {
    await handle.close();
  }
}

async function normalizeRoots(args: RunTask10CoreProducerArgs): Promise<RunTask10CoreProducerArgs> {
  const normalized = {
    coreRoot: await normalizeRootPath(args.coreRoot, 'coreRoot'),
    clientRoot: await normalizeRootPath(args.clientRoot, 'clientRoot'),
    siteRoot: await normalizeRootPath(args.siteRoot, 'siteRoot'),
    privateInputRoot: await normalizeRootPath(args.privateInputRoot, 'privateInputRoot'),
    privateOutputRoot: await normalizeRootPath(args.privateOutputRoot, 'privateOutputRoot'),
  };
  validateDistinctRoots(Object.values(normalized));
  validateNonOverlappingRoots(Object.values(normalized));
  return normalized;
}

async function normalizeRootPath(rootPath: string, fieldName: string): Promise<string> {
  const absolutePath = requireAbsolutePath(rootPath, fieldName);
  await rejectSymlinkedPathSegments(absolutePath, fieldName);
  const entry = await lstat(absolutePath);
  if (!entry.isDirectory() || entry.isSymbolicLink()) {
    throw new Error(`${fieldName} precondition requires non-symlink directory`);
  }
  if ((fieldName === 'privateInputRoot' || fieldName === 'privateOutputRoot') && (entry.mode & 0o077) !== 0) {
    throw new Error(`${fieldName} precondition requires owner-only permissions`);
  }
  return await realpath(absolutePath);
}

async function assertPrivateRootsInitiallyEmpty(privateInputRoot: string, privateOutputRoot: string): Promise<void> {
  if ((await readdir(privateInputRoot)).length !== 0 || (await readdir(privateOutputRoot)).length !== 0) {
    throw new Error('private roots must start empty');
  }
}

async function validateCheckouts(
  roots: RunTask10CoreProducerArgs,
  inspectCheckout: RunTask10CoreProducerDependencies['inspectCheckout'],
): Promise<boolean> {
  try {
    return validateInspection(await inspectCheckout(roots.coreRoot), {
      headCommit: TASK10_AUTHORITY.coreRuntimeSha,
      branch: 'main',
      upstream: 'origin/main',
      lockfileHash: TASK10_AUTHORITY.lockfileSha256.core,
      packageIdentity: TASK10_AUTHORITY.packageIdentities.core,
    }) && validateInspection(await inspectCheckout(roots.clientRoot), {
      headCommit: TASK10_AUTHORITY.clientBaselineSha,
      branch: 'main',
      upstream: 'origin/main',
      lockfileHash: TASK10_AUTHORITY.lockfileSha256.client,
      packageIdentity: TASK10_AUTHORITY.packageIdentities.client,
    }) && validateInspection(await inspectCheckout(roots.siteRoot), {
      headCommit: TASK10_AUTHORITY.siteBaselineSha,
      branch: 'main',
      upstream: 'origin/main',
      lockfileHash: TASK10_AUTHORITY.lockfileSha256.site,
      packageIdentity: TASK10_AUTHORITY.packageIdentities.site,
    });
  } catch {
    return false;
  }
}

function validateInspection(
  inspection: Task10CheckoutInspection,
  expected: Pick<Task10CheckoutInspection, 'headCommit' | 'branch' | 'upstream' | 'lockfileHash' | 'packageIdentity'>,
): boolean {
  return inspection.headCommit === expected.headCommit
    && inspection.branch === expected.branch
    && inspection.upstream === expected.upstream
    && inspection.trackedDirty === false
    && inspection.untrackedDirty === false
    && inspection.detached === false
    && inspection.lockfileHash === expected.lockfileHash
    && inspection.packageIdentity === expected.packageIdentity;
}

async function runProducerWithSpawn(
  plan: CoreProducerInvocationPlan,
  dependencies: Pick<
    RunTask10CoreProducerDependencies,
    'spawnProcess' | 'producerTimeoutMs' | 'killGraceMs' | 'forceSettleMs' | 'scheduleTimer' | 'clearTimer'
  >,
): Promise<{ exitCode: number }> {
  const env = buildTask10ProducerEnvironment(process.env);
  return await new Promise<{ exitCode: number }>((resolve, reject) => {
    const child = dependencies.spawnProcess(plan.command, [...plan.args], {
      cwd: plan.cwd,
      env,
      shell: plan.shell,
      stdio: 'ignore',
    });
    let settled = false;
    let timedOut = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (timeoutTimer !== null) {
        dependencies.clearTimer(timeoutTimer);
      }
      if (killTimer !== null) {
        dependencies.clearTimer(killTimer);
      }
      if (settleTimer !== null) {
        dependencies.clearTimer(settleTimer);
      }
    };

    const settleResolve = (exitCode: number) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve({ exitCode });
    };

    const settleReject = (error: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      reject(error);
    };

    timeoutTimer = dependencies.scheduleTimer(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = dependencies.scheduleTimer(() => {
        child.kill('SIGKILL');
      }, dependencies.killGraceMs);
      settleTimer = dependencies.scheduleTimer(() => {
        settleResolve(124);
      }, dependencies.killGraceMs + dependencies.forceSettleMs);
    }, dependencies.producerTimeoutMs);

    child.once('error', (error) => {
      if (timedOut) {
        settleResolve(124);
        return;
      }
      settleReject(error);
    });
    child.once('close', (code) => {
      if (timedOut) {
        settleResolve(124);
        return;
      }
      settleResolve(code === null ? 1 : code);
    });
  });
}

async function inspectCheckoutWithGit(rootPath: string): Promise<Task10CheckoutInspection> {
  const headCommit = runGit(rootPath, ['rev-parse', 'HEAD']);
  const branch = runGit(rootPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const upstream = runGit(rootPath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const statusLines = runGit(rootPath, ['status', '--porcelain']).split('\n').filter(Boolean);
  const packageLockBytes = await readBoundedFile(path.join(rootPath, 'package-lock.json'), 'package-lock.json', PACKAGE_LOCK_MAX_BYTES);
  const packageJsonText = (await readBoundedFile(path.join(rootPath, 'package.json'), 'package.json', PACKAGE_JSON_MAX_BYTES)).toString('utf8');
  const packageJson = JSON.parse(packageJsonText) as { name?: string; version?: string };
  return {
    headCommit,
    branch,
    upstream,
    trackedDirty: statusLines.some((line) => !line.startsWith('??')),
    untrackedDirty: statusLines.some((line) => line.startsWith('??')),
    detached: branch === 'HEAD',
    lockfileHash: createHash('sha256').update(packageLockBytes).digest('hex'),
    packageIdentity: buildTask10PackageIdentity(packageJson),
  };
}

function runGit(rootPath: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: rootPath,
    encoding: 'utf8',
    timeout: DEFAULT_GIT_TIMEOUT_MS,
    maxBuffer: DEFAULT_GIT_MAX_BUFFER_BYTES,
    env: buildTask10ToolEnvironment(process.env),
  }).trim();
}

async function persistDiagnosticToFilesystem(
  input: PersistAndVerifyDiagnosticInput,
  privateOutputRoot: string,
): Promise<PersistAndVerifyDiagnosticResult> {
  await rejectSymlinkedPathSegments(privateOutputRoot, 'privateOutputRoot');
  const serialized = JSON.stringify(input.privateDiagnostic);
  const bytes = Buffer.from(serialized, 'utf8');
  const fileStem = createHash('sha256').update(`${input.sourceClass}:${input.timestamp}`).digest('hex');
  const diagnosticPath = path.join(privateOutputRoot, `${fileStem}.private-diagnostic.json`);
  const writeHandle = await open(diagnosticPath, fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW, 0o600);
  try {
    await writeHandle.writeFile(bytes);
    await writeHandle.sync();
    const fileStat = await writeHandle.stat();
    if (!fileStat.isFile() || (fileStat.mode & 0o777) !== 0o600) {
      throw new Error('diagnostic file mode or type invalid');
    }
  } finally {
    await writeHandle.close();
  }
  const readHandle = await open(diagnosticPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  let reread: Buffer;
  try {
    reread = await readHandle.readFile();
    const fileStat = await readHandle.stat();
    if (!fileStat.isFile() || fileStat.size > ARTIFACT_JSON_MAX_BYTES) {
      throw new Error('diagnostic reread file invalid');
    }
  } finally {
    await readHandle.close();
  }
  return {
    handle: `sha256:${createHash('sha256').update(reread).digest('hex')}` as `sha256:${string}`,
    verified: reread.equals(bytes),
  };
}

function requireInheritedToken(tokenEnvName: string): string {
  const token = process.env[tokenEnvName];
  if (typeof token !== 'string' || !token) {
    throw new Error(`${tokenEnvName} must be set in the environment`);
  }
  return token;
}

function buildTask10ProducerEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const producerEnv = buildTask10ToolEnvironment(env);
  producerEnv[FROZEN_TOKEN_ENV_NAME] = requireInheritedToken(FROZEN_TOKEN_ENV_NAME);
  return producerEnv;
}

function requireAbsolutePath(rootPath: string, fieldName: string): string {
  const trimmed = rootPath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) {
    throw new Error(`${fieldName} precondition requires absolute path`);
  }
  return path.resolve(trimmed);
}

function validateDistinctRoots(roots: string[]): void {
  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root)) {
      throw new Error('root precondition requires distinct roots');
    }
    seen.add(root);
  }
}

function validateNonOverlappingRoots(roots: string[]): void {
  for (let index = 0; index < roots.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < roots.length; otherIndex += 1) {
      if (rootsOverlap(roots[index]!, roots[otherIndex]!)) {
        throw new Error('root precondition rejects overlapping roots');
      }
    }
  }
}

function rootsOverlap(left: string, right: string): boolean {
  return isNestedOrSamePath(left, right) || isNestedOrSamePath(right, left);
}

function isNestedOrSamePath(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === '' || ((relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`)) && !path.isAbsolute(relativePath));
}

function toRepoRelative(repoRoot: string, candidatePath: string): string | null {
  const relativePath = path.relative(repoRoot, candidatePath);
  if (!relativePath || relativePath === '.') {
    return '';
  }
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return relativePath;
}

export async function validateSelectedReusableSourcePacketPath<TPath extends string>(
  repoRoot: string,
  relativePath: TPath,
  fieldName = 'selectedReusableSourcePacketPath',
): Promise<TPath> {
  const canonicalPosixPath = requireCanonicalPosixRepoRelativePath(relativePath, fieldName);
  const resolvedPath = path.resolve(repoRoot, ...canonicalPosixPath.split('/'));
  const repoRelativePath = toRepoRelative(repoRoot, resolvedPath);
  if (repoRelativePath === null || repoRelativePath.length === 0 || repoRelativePath.split(path.sep).join('/') !== canonicalPosixPath) {
    throw new Error(`${fieldName} must resolve within repo root as a canonical POSIX repo path`);
  }
  await rejectSymlinkedPathSegments(resolvedPath, fieldName);
  const entry = await lstat(resolvedPath);
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new Error(`${fieldName} must reference a regular file within repo root`);
  }
  return relativePath;
}

function requireCanonicalPosixRepoRelativePath<TPath extends string>(relativePath: TPath, fieldName: string): TPath {
  const trimmed = relativePath.trim();
  if (!trimmed || trimmed !== relativePath || trimmed.includes('\\') || path.posix.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed)) {
    throw new Error(`${fieldName} must be a canonical POSIX repo path`);
  }
  const normalizedPath = path.posix.normalize(trimmed);
  if (normalizedPath !== trimmed || normalizedPath === '.' || normalizedPath === '..' || normalizedPath.startsWith('../')) {
    throw new Error(`${fieldName} must be a canonical POSIX repo path`);
  }
  return relativePath;
}

async function rejectSymlinkedPathSegments(candidatePath: string, fieldName: string): Promise<void> {
  const parsedPath = path.parse(candidatePath);
  let currentPath = parsedPath.root;
  const segments = candidatePath.slice(parsedPath.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    const entry = await lstat(currentPath);
    if (entry.isSymbolicLink()) {
      throw new Error(`${fieldName} precondition rejects symlink segments`);
    }
  }
}

function hashTextSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireArrayOfObjects(value: unknown, fieldName: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  return value.map((entry, index) => requireObject(entry, `${fieldName}[${index}]`));
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function requireNonEmptyStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
  return value.map((entry, index) => requireNonEmptyString(entry, `${fieldName}[${index}]`));
}

function requireLiteralString(value: unknown, expected: string, fieldName: string): string {
  if (value !== expected) {
    throw new Error(`${fieldName} must equal ${expected}`);
  }
  return expected;
}

function requireLiteralBoolean(value: unknown, expected: boolean, fieldName: string): boolean {
  if (value !== expected) {
    throw new Error(`${fieldName} must equal ${String(expected)}`);
  }
  return expected;
}

function requireEnumString(value: unknown, expected: readonly string[], fieldName: string): string {
  const candidate = requireNonEmptyString(value, fieldName);
  if (!expected.includes(candidate)) {
    throw new Error(`${fieldName} must be one of ${expected.join(', ')}`);
  }
  return candidate;
}

function requireSha256Hex(value: unknown, fieldName: string): string {
  const hash = requireNonEmptyString(value, fieldName);
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error(`${fieldName} must be lowercase sha256 hex`);
  }
  return hash;
}

function requireIsoTimestamp(value: unknown, fieldName: string): string {
  const timestamp = requireNonEmptyString(value, fieldName);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)) {
    throw new Error(`${fieldName} must be ISO UTC`);
  }
  return timestamp;
}

function requireExactKeys(value: Record<string, unknown>, keys: readonly string[], fieldName: string): void {
  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${fieldName} missing key ${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new Error(`${fieldName} unexpected key ${key}`);
    }
  }
}

function requireReusableRefs(value: unknown, fieldName: string): string[] {
  const refs = requireNonEmptyStringArray(value, fieldName);
  if (refs.length !== 4) {
    throw new Error(`${fieldName} must contain four refs`);
  }
  for (const prefix of ['business-method-atom:', 'lineage-unit:', 'rules_template:', 'evidence-shape:'] as const) {
    if (refs.filter((entry) => entry.startsWith(prefix)).length !== 1) {
      throw new Error(`${fieldName} prefix mismatch`);
    }
  }
  return refs;
}

function requireExactPorts(value: unknown, fieldName: string): number[] {
  if (!Array.isArray(value) || value.length !== EXPECTED_PORTS.length) {
    throw new Error(`${fieldName} must be exact ports array`);
  }
  const ports = value.map((entry, index) => {
    if (!Number.isInteger(entry)) {
      throw new Error(`${fieldName}[${index}] must be integer`);
    }
    return entry as number;
  });
  assertExactNumberArray(ports, [...EXPECTED_PORTS], fieldName);
  return ports;
}

function assertExactString(actual: string, expected: string, fieldName: string): void {
  if (actual !== expected) {
    throw new Error(`${fieldName} mismatch`);
  }
}

function assertExactStringArray(actual: string[], expected: readonly string[], fieldName: string): void {
  if (actual.length !== expected.length) {
    throw new Error(`${fieldName} length mismatch`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(`${fieldName} mismatch at ${index}`);
    }
  }
}

function assertExactNumberArray(actual: number[], expected: number[], fieldName: string): void {
  if (actual.length !== expected.length) {
    throw new Error(`${fieldName} length mismatch`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new Error(`${fieldName} mismatch at ${index}`);
    }
  }
}
