export const TASK10_AUTHORITY = Object.freeze({
  repository: 'Bidvia/bidvia-agent-client',
  attemptId: 'attempt-2026-07-18-task10-postmerge-002',
  issueUrl: 'https://github.com/Bidvia/bidvia-agent-client/issues/8',
  coreHandoffRunbookUrl: 'https://github.com/Bidvia/bidvia-main/blob/97e2fbe3934ea821daf654afa0adaef2c3e16077/docs/runbooks/merged-main-reproducibility-client-handoff.md',
  coreBundleUrl: 'https://github.com/Bidvia/bidvia-main/blob/8d2692fea8a450225717c067628bbc0b372c7536/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
  coreBundlePath: 'docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
  coreBundleSha256: 'e438232e982722fd4ec431260053eafe369723f93659070688f961a5c740b3db',
  corePreflightUrl: 'https://github.com/Bidvia/bidvia-main/blob/8d2692fea8a450225717c067628bbc0b372c7536/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json',
  corePreflightPath: 'docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json',
  corePreflightSha256: '1eee8a5d6de9a34486b287be425b6f747f155c8c83ef436c448e13baf08ad685',
  clientBaselineSha: '31195b898a6794e78518bb9b71833ecaaf5e563e',
  coreRuntimeSha: '97e2fbe3934ea821daf654afa0adaef2c3e16077',
  siteBaselineSha: 'f0198caf349fad367c016d7ff333172ec71a55be',
  coreEvidencePublicationCommit: '8d2692fea8a450225717c067628bbc0b372c7536',
  packageIdentities: Object.freeze({
    core: 'bidvia-d2-ws6-t1-runtime@0.0.0',
    client: '@bidvia/client@1.0.0',
    site: 'bidvia-site@0.1.0',
  }),
  lockfileSha256: Object.freeze({
    core: '504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62',
    client: '92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6',
    site: 'a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732',
  }),
  runtimeMarkers: Object.freeze({
    sourceMainCommitMarker: '97e2fbe3934ea821daf654afa0adaef2c3e16077',
    runtimeReportedVersionMarker: 'task10-runtime-97e2fbe',
    bootstrapPackageVersionMarker: 'task10-bootstrap-97e2fbe',
    scenarioPackageVersionMarker: 'task10-scenario-97e2fbe',
  }),
  providerFixtureIdentity: 'provider-fixture:haisi-wms:task10',
  providerProtocolVersion: 'task10-local-http-v1',
  ports: Object.freeze({
    postgres: 58925,
    runtime: 58926,
    operator: 58927,
    fixture: 58928,
  }),
  authorityUrls: Object.freeze([
    'https://github.com/Bidvia/bidvia-agent-client/issues/8',
    'https://github.com/Bidvia/bidvia-main/blob/97e2fbe3934ea821daf654afa0adaef2c3e16077/docs/runbooks/merged-main-reproducibility-client-handoff.md',
    'https://github.com/Bidvia/bidvia-main/blob/8d2692fea8a450225717c067628bbc0b372c7536/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
    'https://github.com/Bidvia/bidvia-main/blob/8d2692fea8a450225717c067628bbc0b372c7536/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json',
  ]),
});

export const TASK10_CONTENT_FILES = [
  'README.md',
  'client-conclusion.json',
  'client-fingerprint.json',
  'command-log.json',
  'scenario-matrix.json',
] as const;

export const TASK10_REQUIRED_SCENARIO_FAMILIES = [
  'session-access',
  'readiness',
  'dispatch',
  'replay-recovery',
  'result-submission',
] as const;

export const REQUIRED_TASK10_SCENARIO_FAMILIES = TASK10_REQUIRED_SCENARIO_FAMILIES;

export const TASK10_PRIVATE_SOURCE_CLASSES = [
  'preflight',
  'runtime',
  'reset',
  'success-001',
  'recovery-001',
  'success-002-reuse',
  'producer-contract-probe',
  'authority-bundle',
] as const;

export const TASK10_PROHIBITED_VALUE_FAMILIES = [
  'admin session ids',
  'account session ids',
  'passwords',
  'tokens',
  'credential secret refs',
  'fixture credentials',
  'email addresses',
  'generated account identifiers',
  'request and response bodies',
  'absolute local paths',
] as const;

export const TASK10_NON_CLAIMS = [
  'not production readiness',
  'not governed release acceptance',
  'not prd promotion',
  'not contract acceptance',
  'not purchase-order truth',
  'not payment or settlement finality',
  'not fulfillment or after-sales completion',
  'not dispute or arbitration completion',
  'not provider execution completion',
  'not human commercial acceptance',
  'not a Core-authored conclusion',
] as const;

const TASK10_GATE_COMMANDS = [
  'npm test',
  'npm run typecheck',
  'npm run build',
  'npm run validate',
  'npm run validate:release-readiness',
  'npm run validate:release-gate',
] as const;

export type Task10Conclusion = 'passed' | 'blocked';
export type Task10ScenarioFamily = (typeof TASK10_REQUIRED_SCENARIO_FAMILIES)[number];
type Task10PrivateSourceClass = (typeof TASK10_PRIVATE_SOURCE_CLASSES)[number];
type Task10ProhibitedValueFamily = (typeof TASK10_PROHIBITED_VALUE_FAMILIES)[number];
type Task10CommandGate = (typeof TASK10_GATE_COMMANDS)[number];

export interface Task10ClientConclusion {
  schemaVersion: 'bidvia-client-task10-owner-conclusion/v1';
  evidenceOwner: 'client';
  attemptId: typeof TASK10_AUTHORITY.attemptId;
  conclusion: Task10Conclusion;
  reasonCodes: string[];
  missingEvidence: string[];
  authorityRef: {
    issueUrl: typeof TASK10_AUTHORITY.issueUrl;
    coreHandoffRunbookUrl: typeof TASK10_AUTHORITY.coreHandoffRunbookUrl;
    coreBundleUrl: typeof TASK10_AUTHORITY.coreBundleUrl;
    coreBundlePath: typeof TASK10_AUTHORITY.coreBundlePath;
    coreBundleSha256: typeof TASK10_AUTHORITY.coreBundleSha256;
    corePreflightPath: typeof TASK10_AUTHORITY.corePreflightPath;
    corePreflightSha256: typeof TASK10_AUTHORITY.corePreflightSha256;
  };
  nonClaims: readonly (typeof TASK10_NON_CLAIMS)[number][];
}

export interface Task10ClientConclusionWire {
  readonly schema_version: 'bidvia-client-task10-owner-conclusion/v1';
  readonly evidence_owner: 'client';
  readonly attempt_id: typeof TASK10_AUTHORITY.attemptId;
  readonly conclusion: Task10Conclusion;
  readonly reason_codes: readonly string[];
  readonly missing_evidence: readonly string[];
  readonly authority_ref: {
    readonly issue_url: typeof TASK10_AUTHORITY.issueUrl;
    readonly core_handoff_runbook_url: typeof TASK10_AUTHORITY.coreHandoffRunbookUrl;
    readonly core_bundle_url: typeof TASK10_AUTHORITY.coreBundleUrl;
    readonly core_bundle_path: typeof TASK10_AUTHORITY.coreBundlePath;
    readonly core_bundle_sha256: typeof TASK10_AUTHORITY.coreBundleSha256;
    readonly core_preflight_path: typeof TASK10_AUTHORITY.corePreflightPath;
    readonly core_preflight_sha256: typeof TASK10_AUTHORITY.corePreflightSha256;
  };
  readonly non_claims: readonly (typeof TASK10_NON_CLAIMS)[number][];
}

export interface Task10CheckoutProof {
  headCommit: string;
  branch: string | null;
  upstreamRef: string | null;
  detachedHead: boolean;
  porcelainStatus: 'empty' | 'non-empty';
  lockfileSha256: string;
}

export interface Task10ClientFingerprint {
  schemaVersion: 'bidvia-client-task10-fingerprint/v1';
  repository: typeof TASK10_AUTHORITY.repository;
  attemptId: typeof TASK10_AUTHORITY.attemptId;
  clientBaselineSha: typeof TASK10_AUTHORITY.clientBaselineSha;
  coreRuntimeSha: typeof TASK10_AUTHORITY.coreRuntimeSha;
  siteBaselineSha: typeof TASK10_AUTHORITY.siteBaselineSha;
  coreEvidencePublicationCommit: typeof TASK10_AUTHORITY.coreEvidencePublicationCommit;
  coreBundlePath: typeof TASK10_AUTHORITY.coreBundlePath;
  coreBundleSha256: typeof TASK10_AUTHORITY.coreBundleSha256;
  packageIdentities: {
    core: typeof TASK10_AUTHORITY.packageIdentities.core;
    client: typeof TASK10_AUTHORITY.packageIdentities.client;
    site: typeof TASK10_AUTHORITY.packageIdentities.site;
  };
  lockfileSha256: {
    core: typeof TASK10_AUTHORITY.lockfileSha256.core;
    client: typeof TASK10_AUTHORITY.lockfileSha256.client;
    site: typeof TASK10_AUTHORITY.lockfileSha256.site;
  };
  runtimeMarkers: {
    sourceMainCommitMarker: typeof TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker;
    runtimeReportedVersionMarker: typeof TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker;
    bootstrapPackageVersionMarker: typeof TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker;
    scenarioPackageVersionMarker: typeof TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker;
    providerFixtureIdentity: typeof TASK10_AUTHORITY.providerFixtureIdentity;
    providerProtocolVersion: typeof TASK10_AUTHORITY.providerProtocolVersion;
    postgresPort: typeof TASK10_AUTHORITY.ports.postgres;
    runtimePort: typeof TASK10_AUTHORITY.ports.runtime;
    operatorPort: typeof TASK10_AUTHORITY.ports.operator;
    fixturePort: typeof TASK10_AUTHORITY.ports.fixture;
  };
  toolVersions: {
    node: string;
    npm: string;
    docker: string;
    dockerCompose: string;
    postgresClient: string;
  };
  checkoutProofs: {
    coreRuntime: Task10CheckoutProof;
    clientValidation: Task10CheckoutProof;
    siteValidation: Task10CheckoutProof;
    coreEvidence: Task10CheckoutProof;
  };
  runStartedAt: string;
}

export interface Task10ClientFingerprintWire {
  readonly schema_version: 'bidvia-client-task10-fingerprint/v1';
  readonly repository: typeof TASK10_AUTHORITY.repository;
  readonly attempt_id: typeof TASK10_AUTHORITY.attemptId;
  readonly client_baseline_sha: typeof TASK10_AUTHORITY.clientBaselineSha;
  readonly core_runtime_sha: typeof TASK10_AUTHORITY.coreRuntimeSha;
  readonly site_baseline_sha: typeof TASK10_AUTHORITY.siteBaselineSha;
  readonly core_evidence_publication_commit: typeof TASK10_AUTHORITY.coreEvidencePublicationCommit;
  readonly core_bundle_path: typeof TASK10_AUTHORITY.coreBundlePath;
  readonly core_bundle_sha256: typeof TASK10_AUTHORITY.coreBundleSha256;
  readonly package_identities: {
    readonly core: typeof TASK10_AUTHORITY.packageIdentities.core;
    readonly client: typeof TASK10_AUTHORITY.packageIdentities.client;
    readonly site: typeof TASK10_AUTHORITY.packageIdentities.site;
  };
  readonly lockfile_sha256: {
    readonly core: typeof TASK10_AUTHORITY.lockfileSha256.core;
    readonly client: typeof TASK10_AUTHORITY.lockfileSha256.client;
    readonly site: typeof TASK10_AUTHORITY.lockfileSha256.site;
  };
  readonly runtime_markers: {
    readonly source_main_commit_marker: typeof TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker;
    readonly runtime_reported_version_marker: typeof TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker;
    readonly bootstrap_package_version_marker: typeof TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker;
    readonly scenario_package_version_marker: typeof TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker;
    readonly provider_fixture_identity: typeof TASK10_AUTHORITY.providerFixtureIdentity;
    readonly provider_protocol_version: typeof TASK10_AUTHORITY.providerProtocolVersion;
    readonly postgres_port: typeof TASK10_AUTHORITY.ports.postgres;
    readonly runtime_port: typeof TASK10_AUTHORITY.ports.runtime;
    readonly operator_port: typeof TASK10_AUTHORITY.ports.operator;
    readonly fixture_port: typeof TASK10_AUTHORITY.ports.fixture;
  };
  readonly tool_versions: {
    readonly node: string;
    readonly npm: string;
    readonly docker: string;
    readonly docker_compose: string;
    readonly postgres_client: string;
  };
  readonly checkout_proofs: {
    readonly core_runtime: {
      readonly head_commit: string;
      readonly branch: string | null;
      readonly upstream_ref: string | null;
      readonly detached_head: boolean;
      readonly porcelain_status: 'empty' | 'non-empty';
      readonly lockfile_sha256: string;
    };
    readonly client_validation: {
      readonly head_commit: string;
      readonly branch: string | null;
      readonly upstream_ref: string | null;
      readonly detached_head: boolean;
      readonly porcelain_status: 'empty' | 'non-empty';
      readonly lockfile_sha256: string;
    };
    readonly site_validation: {
      readonly head_commit: string;
      readonly branch: string | null;
      readonly upstream_ref: string | null;
      readonly detached_head: boolean;
      readonly porcelain_status: 'empty' | 'non-empty';
      readonly lockfile_sha256: string;
    };
    readonly core_evidence: {
      readonly head_commit: string;
      readonly branch: string | null;
      readonly upstream_ref: string | null;
      readonly detached_head: boolean;
      readonly porcelain_status: 'empty' | 'non-empty';
      readonly lockfile_sha256: string;
    };
  };
  readonly run_started_at: string;
}

export interface Task10CommandRow {
  command: Task10CommandGate;
  cwd: 'frozen-client-root';
  startedAt: string;
  endedAt: string;
  status: 'executed' | 'skipped';
  exitCode: number | null;
  skippedDueTo: string | null;
}

export interface Task10CommandLog {
  schemaVersion: 'bidvia-client-task10-command-log/v1';
  attemptId: typeof TASK10_AUTHORITY.attemptId;
  commands: Task10CommandRow[];
}

export interface Task10CommandRowWire {
  readonly command: Task10CommandGate;
  readonly cwd: 'frozen-client-root';
  readonly started_at: string;
  readonly ended_at: string;
  readonly status: 'executed' | 'skipped';
  readonly exit_code: number | null;
  readonly skipped_due_to: string | null;
}

export interface Task10CommandLogWire {
  readonly schema_version: 'bidvia-client-task10-command-log/v1';
  readonly attempt_id: typeof TASK10_AUTHORITY.attemptId;
  readonly commands: readonly Task10CommandRowWire[];
}

export interface Task10PrivateEvidenceAttestation {
  handle: `sha256:${string}`;
  sourceClass: Task10PrivateSourceClass;
  verified: true;
  verifiedAt: string;
}

export interface Task10ScenarioRow {
  scenarioFamily: Task10ScenarioFamily;
  tenant: string;
  actor: string;
  company: string;
  authority: string;
  request: string;
  sourceObject: string;
  targetObject: string;
  proofClass: string;
  evidenceRefs: string[];
  privateEvidenceHandles: Array<`sha256:${string}`>;
  privateEvidenceAttestations: Task10PrivateEvidenceAttestation[];
  result: Task10Conclusion;
  timestamp: string;
  reasonCodes: string[];
}

export interface Task10ScenarioRowWire {
  readonly scenario_family: Task10ScenarioFamily;
  readonly tenant: string;
  readonly actor: string;
  readonly company: string;
  readonly authority: string;
  readonly request: string;
  readonly source_object: string;
  readonly target_object: string;
  readonly proof_class: string;
  readonly evidence_refs: readonly string[];
  readonly private_evidence_handles: ReadonlyArray<`sha256:${string}`>;
  readonly private_handle_attestations: ReadonlyArray<{
    readonly handle: `sha256:${string}`;
    readonly source_class: Task10PrivateSourceClass;
    readonly verified: true;
    readonly verified_at: string;
  }>;
  readonly result: Task10Conclusion;
  readonly timestamp: string;
  readonly reason_codes: readonly string[];
}

export interface Task10ScenarioMatrix {
  schemaVersion: 'bidvia-client-task10-scenario-matrix/v1';
  attemptId: typeof TASK10_AUTHORITY.attemptId;
  generatedAt: string;
  requiredFamilies: readonly Task10ScenarioFamily[];
  summary: {
    requiredFamilyCount: number;
    rowCount: number;
    passedCount: number;
    blockedCount: number;
    missingFamilies: Task10ScenarioFamily[];
  };
  scenarios: Task10ScenarioRow[];
}

export interface Task10ScenarioMatrixWire {
  readonly schema_version: 'bidvia-client-task10-scenario-matrix/v1';
  readonly attempt_id: typeof TASK10_AUTHORITY.attemptId;
  readonly generated_at: string;
  readonly required_families: readonly Task10ScenarioFamily[];
  readonly summary: {
    readonly required_family_count: number;
    readonly row_count: number;
    readonly passed_count: number;
    readonly blocked_count: number;
    readonly missing_families: readonly Task10ScenarioFamily[];
  };
  readonly scenarios: readonly Task10ScenarioRowWire[];
}

export interface Task10SecretReview {
  schemaVersion: 'bidvia-client-task10-secret-review/v1';
  status: 'passed';
  candidateStatus: Task10Conclusion;
  scope: {
    contentFiles: readonly (typeof TASK10_CONTENT_FILES)[number][];
    wrapperFiles: readonly string[];
    privateSourceValuesPublished: false;
  };
  scannedFiles: readonly (typeof TASK10_CONTENT_FILES)[number][];
  prohibitedValueFamilies: readonly Task10ProhibitedValueFamily[];
  findings: Array<{
    code: string;
    family: string;
    count: number;
  }>;
  rawProducerOutputsPublished: false;
  rawLogsPublished: false;
}

export interface Task10SecretReviewWire {
  readonly schema_version: 'bidvia-client-task10-secret-review/v1';
  readonly status: 'passed';
  readonly candidate_status: Task10Conclusion;
  readonly scope: {
    readonly content_files: readonly (typeof TASK10_CONTENT_FILES)[number][];
    readonly wrapper_files: readonly string[];
    readonly private_source_values_published: false;
  };
  readonly scanned_files: readonly (typeof TASK10_CONTENT_FILES)[number][];
  readonly prohibited_value_families: readonly Task10ProhibitedValueFamily[];
  readonly findings: ReadonlyArray<{
    readonly code: string;
    readonly family: string;
    readonly count: number;
  }>;
  readonly raw_producer_outputs_published: false;
  readonly raw_logs_published: false;
}

export interface Task10PublicationReceipt {
  schemaVersion: 'bidvia-client-task10-publication/v1';
  publicationState: 'published_for_review';
  attemptId: typeof TASK10_AUTHORITY.attemptId;
  clientOwnedConclusion: Task10Conclusion;
  issueUrl: typeof TASK10_AUTHORITY.issueUrl;
  packageDirectory: string;
  conclusionPath: string;
  conclusionSha256: string;
  archivePath: string;
  archiveSha256: string;
  archiveSizeBytes: number;
  internalHashManifest: string;
  internalHashManifestSha256: string;
  validation: {
    authorityVerified: boolean;
    commandsVerified: boolean;
    scenariosVerified: boolean;
    privateHandleAttestationsVerified: boolean;
    secretReviewVerified: boolean;
    packageMembershipVerified: boolean;
    internalHashesVerified: boolean;
    archiveVerified: boolean;
    receiptBindingsVerified: boolean;
  };
  nonClaims: readonly (typeof TASK10_NON_CLAIMS)[number][];
}

export interface Task10PublicationReceiptWire {
  readonly schema_version: 'bidvia-client-task10-publication/v1';
  readonly publication_state: 'published_for_review';
  readonly attempt_id: typeof TASK10_AUTHORITY.attemptId;
  readonly client_owned_conclusion: Task10Conclusion;
  readonly issue_url: typeof TASK10_AUTHORITY.issueUrl;
  readonly package_directory: string;
  readonly conclusion_path: string;
  readonly conclusion_sha256: string;
  readonly archive_path: string;
  readonly archive_sha256: string;
  readonly archive_size_bytes: number;
  readonly internal_hash_manifest: string;
  readonly internal_hash_manifest_sha256: string;
  readonly validation: {
    readonly authority_verified: boolean;
    readonly commands_verified: boolean;
    readonly scenarios_verified: boolean;
    readonly private_handle_attestations_verified: boolean;
    readonly secret_review_verified: boolean;
    readonly package_membership_verified: boolean;
    readonly internal_hashes_verified: boolean;
    readonly archive_verified: boolean;
    readonly receipt_bindings_verified: boolean;
  };
  readonly non_claims: readonly (typeof TASK10_NON_CLAIMS)[number][];
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[], fieldName: string): void {
  for (const key of keys) {
    if (!(key in value)) {
      throw new Error(`${fieldName} is missing required key: ${key}`);
    }
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw new Error(`${fieldName} has unexpected key: ${key}`);
    }
  }
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function requireNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) {
    return null;
  }
  return requireNonEmptyString(value, fieldName);
}

function requireLiteral<T extends string | boolean | number>(value: unknown, expected: T, fieldName: string): T {
  if (value !== expected) {
    throw new Error(`${fieldName} must equal ${String(expected)}`);
  }
  return expected;
}

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

function requireInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${fieldName} must be a nonnegative integer`);
  }
  return value as number;
}

function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return value as number;
}

function requireIntegerOrNull(value: unknown, fieldName: string): number | null {
  return value === null ? null : requireInteger(value, fieldName);
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  return value.map((entry, index) => requireNonEmptyString(entry, `${fieldName}[${index}]`));
}

function requireLexicallySorted(values: string[], fieldName: string): string[] {
  for (let index = 1; index < values.length; index += 1) {
    if (compareCodeUnits(values[index - 1]!, values[index]!) > 0) {
      throw new Error(`${fieldName} must be sorted lexically`);
    }
  }
  return values;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireExactTuple<T extends readonly string[]>(value: unknown, tuple: T, fieldName: string): T {
  if (!Array.isArray(value) || value.length !== tuple.length) {
    throw new Error(`${fieldName} must exactly match the frozen tuple`);
  }
  for (let index = 0; index < tuple.length; index += 1) {
    if (value[index] !== tuple[index]) {
      throw new Error(`${fieldName} must exactly match the frozen tuple`);
    }
  }
  return tuple;
}

function requireCanonicalSubset<T extends readonly string[]>(value: unknown, tuple: T, fieldName: string): Array<T[number]> {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  const order = new Map(tuple.map((entry, index) => [entry, index]));
  const seen = new Set<string>();
  const items = value.map((entry, index) => {
    const candidate = requireNonEmptyString(entry, `${fieldName}[${index}]`) as T[number];
    if (!order.has(candidate)) {
      throw new Error(`${fieldName} contains unsupported value: ${candidate}`);
    }
    if (seen.has(candidate)) {
      throw new Error(`${fieldName} must not contain duplicates`);
    }
    seen.add(candidate);
    return candidate;
  });
  for (let index = 1; index < items.length; index += 1) {
    if (order.get(items[index - 1]!)! > order.get(items[index]!)!) {
      throw new Error(`${fieldName} must preserve canonical order`);
    }
  }
  return items;
}

function requireSha256Hex(value: unknown, fieldName: string): string {
  const digest = requireNonEmptyString(value, fieldName);
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`${fieldName} must be a 64-character lowercase hex digest`);
  }
  return digest;
}

function requireHandle(value: unknown, fieldName: string): `sha256:${string}` {
  const handle = requireNonEmptyString(value, fieldName);
  if (!/^sha256:[0-9a-f]{64}$/.test(handle)) {
    throw new Error(`${fieldName} must be a sha256 handle`);
  }
  return handle as `sha256:${string}`;
}

function freezeArray<T>(value: T[]): readonly T[] {
  return Object.freeze(value);
}

function formatUtcBasicTimestamp(value: string): string {
  const normalized = requireNonEmptyString(value, 'runStartedAt');
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/);
  if (!match) {
    throw new Error('runStartedAt must be an ISO UTC timestamp');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(date.getTime())
    || date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
    || date.getUTCHours() !== hour
    || date.getUTCMinutes() !== minute
    || date.getUTCSeconds() !== second) {
    throw new Error('runStartedAt must be a real UTC datetime');
  }
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6]}Z`;
}

function requireCanonicalTask10PackageName(value: unknown, fieldName: string): string {
  const normalizedPackageName = requireNonEmptyString(value, fieldName);
  const packagePattern = new RegExp(`^client-task10-reproducibility-${TASK10_AUTHORITY.attemptId}-(\\d{8}T\\d{6}Z)$`);
  const match = normalizedPackageName.match(packagePattern);
  if (!match) {
    throw new Error(`${fieldName} must use the exact Task 10 wrapper prefix and UTC basic timestamp`);
  }
  const timestamp = match[1]!;
  const isoTimestamp = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}T${timestamp.slice(9, 11)}:${timestamp.slice(11, 13)}:${timestamp.slice(13, 15)}Z`;
  formatUtcBasicTimestamp(isoTimestamp);
  return normalizedPackageName;
}

export function buildTask10PackageName(runStartedAt: string): string {
  return `client-task10-reproducibility-${TASK10_AUTHORITY.attemptId}-${formatUtcBasicTimestamp(runStartedAt)}`;
}

export function buildTask10WrapperFiles(packageName: string): readonly [
  'secret-review.json',
  'SHA256SUMS.txt',
  string,
  string,
] {
  const normalizedPackageName = requireCanonicalTask10PackageName(packageName, 'packageName');
  return Object.freeze([
    'secret-review.json',
    'SHA256SUMS.txt',
    `${normalizedPackageName}.tar.gz`,
    `${normalizedPackageName}.publication.json`,
  ]);
}

function parseAuthorityRef(value: unknown): Task10ClientConclusionWire['authority_ref'] {
  const objectValue = requireObject(value, 'clientConclusion.authority_ref');
  assertExactKeys(objectValue, [
    'issue_url',
    'core_handoff_runbook_url',
    'core_bundle_url',
    'core_bundle_path',
    'core_bundle_sha256',
    'core_preflight_path',
    'core_preflight_sha256',
  ], 'clientConclusion.authority_ref');
  return Object.freeze({
    issue_url: requireLiteral(objectValue.issue_url, TASK10_AUTHORITY.issueUrl, 'clientConclusion.authority_ref.issue_url'),
    core_handoff_runbook_url: requireLiteral(objectValue.core_handoff_runbook_url, TASK10_AUTHORITY.coreHandoffRunbookUrl, 'clientConclusion.authority_ref.core_handoff_runbook_url'),
    core_bundle_url: requireLiteral(objectValue.core_bundle_url, TASK10_AUTHORITY.coreBundleUrl, 'clientConclusion.authority_ref.core_bundle_url'),
    core_bundle_path: requireLiteral(objectValue.core_bundle_path, TASK10_AUTHORITY.coreBundlePath, 'clientConclusion.authority_ref.core_bundle_path'),
    core_bundle_sha256: requireLiteral(objectValue.core_bundle_sha256, TASK10_AUTHORITY.coreBundleSha256, 'clientConclusion.authority_ref.core_bundle_sha256'),
    core_preflight_path: requireLiteral(objectValue.core_preflight_path, TASK10_AUTHORITY.corePreflightPath, 'clientConclusion.authority_ref.core_preflight_path'),
    core_preflight_sha256: requireLiteral(objectValue.core_preflight_sha256, TASK10_AUTHORITY.corePreflightSha256, 'clientConclusion.authority_ref.core_preflight_sha256'),
  });
}

export function buildTask10ClientConclusionWire(input: Task10ClientConclusion): Task10ClientConclusionWire {
  return parseTask10ClientConclusionWire({
    schema_version: input.schemaVersion,
    evidence_owner: input.evidenceOwner,
    attempt_id: input.attemptId,
    conclusion: input.conclusion,
    reason_codes: [...input.reasonCodes].sort(compareCodeUnits),
    missing_evidence: [...input.missingEvidence].sort(compareCodeUnits),
    authority_ref: {
      issue_url: input.authorityRef.issueUrl,
      core_handoff_runbook_url: input.authorityRef.coreHandoffRunbookUrl,
      core_bundle_url: input.authorityRef.coreBundleUrl,
      core_bundle_path: input.authorityRef.coreBundlePath,
      core_bundle_sha256: input.authorityRef.coreBundleSha256,
      core_preflight_path: input.authorityRef.corePreflightPath,
      core_preflight_sha256: input.authorityRef.corePreflightSha256,
    },
    non_claims: [...input.nonClaims],
  });
}

export function parseTask10ClientConclusionWire(value: unknown): Task10ClientConclusionWire {
  const objectValue = requireObject(value, 'clientConclusion');
  assertExactKeys(objectValue, ['schema_version', 'evidence_owner', 'attempt_id', 'conclusion', 'reason_codes', 'missing_evidence', 'authority_ref', 'non_claims'], 'clientConclusion');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-owner-conclusion/v1', 'clientConclusion.schema_version');
  requireLiteral(objectValue.evidence_owner, 'client', 'clientConclusion.evidence_owner');
  requireLiteral(objectValue.attempt_id, TASK10_AUTHORITY.attemptId, 'clientConclusion.attempt_id');
  const conclusion = requireNonEmptyString(objectValue.conclusion, 'clientConclusion.conclusion');
  if (conclusion !== 'passed' && conclusion !== 'blocked') {
    throw new Error('clientConclusion.conclusion must be passed or blocked');
  }
  requireExactTuple(objectValue.non_claims, TASK10_NON_CLAIMS, 'clientConclusion.non_claims');
  return Object.freeze({
    schema_version: 'bidvia-client-task10-owner-conclusion/v1',
    evidence_owner: 'client',
    attempt_id: TASK10_AUTHORITY.attemptId,
    conclusion,
    reason_codes: freezeArray(requireLexicallySorted(requireStringArray(objectValue.reason_codes, 'clientConclusion.reason_codes'), 'clientConclusion.reason_codes')),
    missing_evidence: freezeArray(requireLexicallySorted(requireStringArray(objectValue.missing_evidence, 'clientConclusion.missing_evidence'), 'clientConclusion.missing_evidence')),
    authority_ref: parseAuthorityRef(objectValue.authority_ref),
    non_claims: TASK10_NON_CLAIMS,
  });
}

function parseCheckoutProof(value: unknown, fieldName: string): Task10ClientFingerprintWire['checkout_proofs']['core_runtime'] {
  const objectValue = requireObject(value, fieldName);
  assertExactKeys(objectValue, ['head_commit', 'branch', 'upstream_ref', 'detached_head', 'porcelain_status', 'lockfile_sha256'], fieldName);
  if (typeof objectValue.detached_head !== 'boolean') {
    throw new Error(`${fieldName}.detached_head must be boolean`);
  }
  const porcelainStatus = requireNonEmptyString(objectValue.porcelain_status, `${fieldName}.porcelain_status`);
  if (porcelainStatus !== 'empty' && porcelainStatus !== 'non-empty') {
    throw new Error(`${fieldName}.porcelain_status must be empty or non-empty`);
  }
  return Object.freeze({
    head_commit: requireNonEmptyString(objectValue.head_commit, `${fieldName}.head_commit`),
    branch: requireNullableString(objectValue.branch, `${fieldName}.branch`),
    upstream_ref: requireNullableString(objectValue.upstream_ref, `${fieldName}.upstream_ref`),
    detached_head: objectValue.detached_head,
    porcelain_status: porcelainStatus,
    lockfile_sha256: requireSha256Hex(objectValue.lockfile_sha256, `${fieldName}.lockfile_sha256`),
  });
}

export function buildTask10ClientFingerprintWire(input: Task10ClientFingerprint): Task10ClientFingerprintWire {
  return parseTask10ClientFingerprintWire({
    schema_version: input.schemaVersion,
    repository: input.repository,
    attempt_id: input.attemptId,
    client_baseline_sha: input.clientBaselineSha,
    core_runtime_sha: input.coreRuntimeSha,
    site_baseline_sha: input.siteBaselineSha,
    core_evidence_publication_commit: input.coreEvidencePublicationCommit,
    core_bundle_path: input.coreBundlePath,
    core_bundle_sha256: input.coreBundleSha256,
    package_identities: {
      core: input.packageIdentities.core,
      client: input.packageIdentities.client,
      site: input.packageIdentities.site,
    },
    lockfile_sha256: {
      core: input.lockfileSha256.core,
      client: input.lockfileSha256.client,
      site: input.lockfileSha256.site,
    },
    runtime_markers: {
      source_main_commit_marker: input.runtimeMarkers.sourceMainCommitMarker,
      runtime_reported_version_marker: input.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrap_package_version_marker: input.runtimeMarkers.bootstrapPackageVersionMarker,
      scenario_package_version_marker: input.runtimeMarkers.scenarioPackageVersionMarker,
      provider_fixture_identity: input.runtimeMarkers.providerFixtureIdentity,
      provider_protocol_version: input.runtimeMarkers.providerProtocolVersion,
      postgres_port: input.runtimeMarkers.postgresPort,
      runtime_port: input.runtimeMarkers.runtimePort,
      operator_port: input.runtimeMarkers.operatorPort,
      fixture_port: input.runtimeMarkers.fixturePort,
    },
    tool_versions: {
      node: input.toolVersions.node,
      npm: input.toolVersions.npm,
      docker: input.toolVersions.docker,
      docker_compose: input.toolVersions.dockerCompose,
      postgres_client: input.toolVersions.postgresClient,
    },
    checkout_proofs: {
      core_runtime: {
        head_commit: input.checkoutProofs.coreRuntime.headCommit,
        branch: input.checkoutProofs.coreRuntime.branch,
        upstream_ref: input.checkoutProofs.coreRuntime.upstreamRef,
        detached_head: input.checkoutProofs.coreRuntime.detachedHead,
        porcelain_status: input.checkoutProofs.coreRuntime.porcelainStatus,
        lockfile_sha256: input.checkoutProofs.coreRuntime.lockfileSha256,
      },
      client_validation: {
        head_commit: input.checkoutProofs.clientValidation.headCommit,
        branch: input.checkoutProofs.clientValidation.branch,
        upstream_ref: input.checkoutProofs.clientValidation.upstreamRef,
        detached_head: input.checkoutProofs.clientValidation.detachedHead,
        porcelain_status: input.checkoutProofs.clientValidation.porcelainStatus,
        lockfile_sha256: input.checkoutProofs.clientValidation.lockfileSha256,
      },
      site_validation: {
        head_commit: input.checkoutProofs.siteValidation.headCommit,
        branch: input.checkoutProofs.siteValidation.branch,
        upstream_ref: input.checkoutProofs.siteValidation.upstreamRef,
        detached_head: input.checkoutProofs.siteValidation.detachedHead,
        porcelain_status: input.checkoutProofs.siteValidation.porcelainStatus,
        lockfile_sha256: input.checkoutProofs.siteValidation.lockfileSha256,
      },
      core_evidence: {
        head_commit: input.checkoutProofs.coreEvidence.headCommit,
        branch: input.checkoutProofs.coreEvidence.branch,
        upstream_ref: input.checkoutProofs.coreEvidence.upstreamRef,
        detached_head: input.checkoutProofs.coreEvidence.detachedHead,
        porcelain_status: input.checkoutProofs.coreEvidence.porcelainStatus,
        lockfile_sha256: input.checkoutProofs.coreEvidence.lockfileSha256,
      },
    },
    run_started_at: input.runStartedAt,
  });
}

export function parseTask10ClientFingerprintWire(value: unknown): Task10ClientFingerprintWire {
  const objectValue = requireObject(value, 'clientFingerprint');
  assertExactKeys(objectValue, ['schema_version', 'repository', 'attempt_id', 'client_baseline_sha', 'core_runtime_sha', 'site_baseline_sha', 'core_evidence_publication_commit', 'core_bundle_path', 'core_bundle_sha256', 'package_identities', 'lockfile_sha256', 'runtime_markers', 'tool_versions', 'checkout_proofs', 'run_started_at'], 'clientFingerprint');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-fingerprint/v1', 'clientFingerprint.schema_version');
  requireLiteral(objectValue.repository, TASK10_AUTHORITY.repository, 'clientFingerprint.repository');
  requireLiteral(objectValue.attempt_id, TASK10_AUTHORITY.attemptId, 'clientFingerprint.attempt_id');
  requireLiteral(objectValue.client_baseline_sha, TASK10_AUTHORITY.clientBaselineSha, 'clientFingerprint.client_baseline_sha');
  requireLiteral(objectValue.core_runtime_sha, TASK10_AUTHORITY.coreRuntimeSha, 'clientFingerprint.core_runtime_sha');
  requireLiteral(objectValue.site_baseline_sha, TASK10_AUTHORITY.siteBaselineSha, 'clientFingerprint.site_baseline_sha');
  requireLiteral(objectValue.core_evidence_publication_commit, TASK10_AUTHORITY.coreEvidencePublicationCommit, 'clientFingerprint.core_evidence_publication_commit');
  requireLiteral(objectValue.core_bundle_path, TASK10_AUTHORITY.coreBundlePath, 'clientFingerprint.core_bundle_path');
  requireLiteral(objectValue.core_bundle_sha256, TASK10_AUTHORITY.coreBundleSha256, 'clientFingerprint.core_bundle_sha256');
  const packageIdentities = requireObject(objectValue.package_identities, 'clientFingerprint.package_identities');
  assertExactKeys(packageIdentities, ['core', 'client', 'site'], 'clientFingerprint.package_identities');
  const lockfileSha256 = requireObject(objectValue.lockfile_sha256, 'clientFingerprint.lockfile_sha256');
  assertExactKeys(lockfileSha256, ['core', 'client', 'site'], 'clientFingerprint.lockfile_sha256');
  const runtimeMarkers = requireObject(objectValue.runtime_markers, 'clientFingerprint.runtime_markers');
  assertExactKeys(runtimeMarkers, ['source_main_commit_marker', 'runtime_reported_version_marker', 'bootstrap_package_version_marker', 'scenario_package_version_marker', 'provider_fixture_identity', 'provider_protocol_version', 'postgres_port', 'runtime_port', 'operator_port', 'fixture_port'], 'clientFingerprint.runtime_markers');
  const toolVersions = requireObject(objectValue.tool_versions, 'clientFingerprint.tool_versions');
  assertExactKeys(toolVersions, ['node', 'npm', 'docker', 'docker_compose', 'postgres_client'], 'clientFingerprint.tool_versions');
  const checkoutProofs = requireObject(objectValue.checkout_proofs, 'clientFingerprint.checkout_proofs');
  assertExactKeys(checkoutProofs, ['core_runtime', 'client_validation', 'site_validation', 'core_evidence'], 'clientFingerprint.checkout_proofs');
  const parsed = Object.freeze({
    schema_version: 'bidvia-client-task10-fingerprint/v1',
    repository: TASK10_AUTHORITY.repository,
    attempt_id: TASK10_AUTHORITY.attemptId,
    client_baseline_sha: TASK10_AUTHORITY.clientBaselineSha,
    core_runtime_sha: TASK10_AUTHORITY.coreRuntimeSha,
    site_baseline_sha: TASK10_AUTHORITY.siteBaselineSha,
    core_evidence_publication_commit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
    core_bundle_path: TASK10_AUTHORITY.coreBundlePath,
    core_bundle_sha256: TASK10_AUTHORITY.coreBundleSha256,
    package_identities: Object.freeze({
      core: requireLiteral(packageIdentities.core, TASK10_AUTHORITY.packageIdentities.core, 'clientFingerprint.package_identities.core'),
      client: requireLiteral(packageIdentities.client, TASK10_AUTHORITY.packageIdentities.client, 'clientFingerprint.package_identities.client'),
      site: requireLiteral(packageIdentities.site, TASK10_AUTHORITY.packageIdentities.site, 'clientFingerprint.package_identities.site'),
    }),
    lockfile_sha256: Object.freeze({
      core: requireLiteral(lockfileSha256.core, TASK10_AUTHORITY.lockfileSha256.core, 'clientFingerprint.lockfile_sha256.core'),
      client: requireLiteral(lockfileSha256.client, TASK10_AUTHORITY.lockfileSha256.client, 'clientFingerprint.lockfile_sha256.client'),
      site: requireLiteral(lockfileSha256.site, TASK10_AUTHORITY.lockfileSha256.site, 'clientFingerprint.lockfile_sha256.site'),
    }),
    runtime_markers: Object.freeze({
      source_main_commit_marker: requireLiteral(runtimeMarkers.source_main_commit_marker, TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker, 'clientFingerprint.runtime_markers.source_main_commit_marker'),
      runtime_reported_version_marker: requireLiteral(runtimeMarkers.runtime_reported_version_marker, TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker, 'clientFingerprint.runtime_markers.runtime_reported_version_marker'),
      bootstrap_package_version_marker: requireLiteral(runtimeMarkers.bootstrap_package_version_marker, TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker, 'clientFingerprint.runtime_markers.bootstrap_package_version_marker'),
      scenario_package_version_marker: requireLiteral(runtimeMarkers.scenario_package_version_marker, TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker, 'clientFingerprint.runtime_markers.scenario_package_version_marker'),
      provider_fixture_identity: requireLiteral(runtimeMarkers.provider_fixture_identity, TASK10_AUTHORITY.providerFixtureIdentity, 'clientFingerprint.runtime_markers.provider_fixture_identity'),
      provider_protocol_version: requireLiteral(runtimeMarkers.provider_protocol_version, TASK10_AUTHORITY.providerProtocolVersion, 'clientFingerprint.runtime_markers.provider_protocol_version'),
      postgres_port: requireLiteral(requireInteger(runtimeMarkers.postgres_port, 'clientFingerprint.runtime_markers.postgres_port'), TASK10_AUTHORITY.ports.postgres, 'clientFingerprint.runtime_markers.postgres_port'),
      runtime_port: requireLiteral(requireInteger(runtimeMarkers.runtime_port, 'clientFingerprint.runtime_markers.runtime_port'), TASK10_AUTHORITY.ports.runtime, 'clientFingerprint.runtime_markers.runtime_port'),
      operator_port: requireLiteral(requireInteger(runtimeMarkers.operator_port, 'clientFingerprint.runtime_markers.operator_port'), TASK10_AUTHORITY.ports.operator, 'clientFingerprint.runtime_markers.operator_port'),
      fixture_port: requireLiteral(requireInteger(runtimeMarkers.fixture_port, 'clientFingerprint.runtime_markers.fixture_port'), TASK10_AUTHORITY.ports.fixture, 'clientFingerprint.runtime_markers.fixture_port'),
    }),
    tool_versions: Object.freeze({
      node: requireNonEmptyString(toolVersions.node, 'clientFingerprint.tool_versions.node'),
      npm: requireNonEmptyString(toolVersions.npm, 'clientFingerprint.tool_versions.npm'),
      docker: requireNonEmptyString(toolVersions.docker, 'clientFingerprint.tool_versions.docker'),
      docker_compose: requireNonEmptyString(toolVersions.docker_compose, 'clientFingerprint.tool_versions.docker_compose'),
      postgres_client: requireNonEmptyString(toolVersions.postgres_client, 'clientFingerprint.tool_versions.postgres_client'),
    }),
    checkout_proofs: Object.freeze({
      core_runtime: parseCheckoutProof(checkoutProofs.core_runtime, 'clientFingerprint.checkout_proofs.core_runtime'),
      client_validation: parseCheckoutProof(checkoutProofs.client_validation, 'clientFingerprint.checkout_proofs.client_validation'),
      site_validation: parseCheckoutProof(checkoutProofs.site_validation, 'clientFingerprint.checkout_proofs.site_validation'),
      core_evidence: parseCheckoutProof(checkoutProofs.core_evidence, 'clientFingerprint.checkout_proofs.core_evidence'),
    }),
    run_started_at: requireNonEmptyString(objectValue.run_started_at, 'clientFingerprint.run_started_at'),
  });
  return parsed;
}

function parseCommandRow(value: unknown, index: number): Task10CommandRowWire {
  const fieldName = `commandLog.commands[${index}]`;
  const objectValue = requireObject(value, fieldName);
  assertExactKeys(objectValue, ['command', 'cwd', 'started_at', 'ended_at', 'status', 'exit_code', 'skipped_due_to'], fieldName);
  const command = requireLiteral(objectValue.command, TASK10_GATE_COMMANDS[index]!, `${fieldName}.command`);
  const status = requireNonEmptyString(objectValue.status, `${fieldName}.status`);
  if (status !== 'executed' && status !== 'skipped') {
    throw new Error(`${fieldName}.status must be executed or skipped`);
  }
  const exitCode = requireIntegerOrNull(objectValue.exit_code, `${fieldName}.exit_code`);
  const skippedDueTo = requireNullableString(objectValue.skipped_due_to, `${fieldName}.skipped_due_to`);
  if (status === 'executed' && (exitCode === null || skippedDueTo !== null)) {
    throw new Error(`${fieldName}.exit_code must be numeric and skipped_due_to must be null for executed rows`);
  }
  if (status === 'skipped' && (exitCode !== null || skippedDueTo === null)) {
    throw new Error(`${fieldName}.skipped_due_to must be non-empty and exit_code must be null for skipped rows`);
  }
  return Object.freeze({
    command,
    cwd: requireLiteral(objectValue.cwd, 'frozen-client-root', `${fieldName}.cwd`),
    started_at: requireNonEmptyString(objectValue.started_at, `${fieldName}.started_at`),
    ended_at: requireNonEmptyString(objectValue.ended_at, `${fieldName}.ended_at`),
    status,
    exit_code: exitCode,
    skipped_due_to: skippedDueTo,
  });
}

export function buildTask10CommandLogWire(input: Task10CommandLog): Task10CommandLogWire {
  return parseTask10CommandLogWire({
    schema_version: input.schemaVersion,
    attempt_id: input.attemptId,
    commands: input.commands.map((row) => ({
      command: row.command,
      cwd: row.cwd,
      started_at: row.startedAt,
      ended_at: row.endedAt,
      status: row.status,
      exit_code: row.exitCode,
      skipped_due_to: row.skippedDueTo,
    })),
  });
}

export function parseTask10CommandLogWire(value: unknown): Task10CommandLogWire {
  const objectValue = requireObject(value, 'commandLog');
  assertExactKeys(objectValue, ['schema_version', 'attempt_id', 'commands'], 'commandLog');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-command-log/v1', 'commandLog.schema_version');
  requireLiteral(objectValue.attempt_id, TASK10_AUTHORITY.attemptId, 'commandLog.attempt_id');
  if (!Array.isArray(objectValue.commands) || objectValue.commands.length !== TASK10_GATE_COMMANDS.length) {
    throw new Error('commandLog.commands must contain the six required command rows');
  }
  return Object.freeze({
    schema_version: 'bidvia-client-task10-command-log/v1',
    attempt_id: TASK10_AUTHORITY.attemptId,
    commands: freezeArray(objectValue.commands.map(parseCommandRow)),
  });
}

function parseAttestation(value: unknown, fieldName: string) {
  const objectValue = requireObject(value, fieldName);
  assertExactKeys(objectValue, ['handle', 'source_class', 'verified', 'verified_at'], fieldName);
  const sourceClass = requireNonEmptyString(objectValue.source_class, `${fieldName}.source_class`);
  if (!TASK10_PRIVATE_SOURCE_CLASSES.includes(sourceClass as Task10PrivateSourceClass)) {
    throw new Error(`${fieldName}.source_class must be a supported source class`);
  }
  requireLiteral(objectValue.verified, true, `${fieldName}.verified`);
  return Object.freeze({
    handle: requireHandle(objectValue.handle, `${fieldName}.handle`),
    source_class: sourceClass as Task10PrivateSourceClass,
    verified: true as const,
    verified_at: requireNonEmptyString(objectValue.verified_at, `${fieldName}.verified_at`),
  });
}

export function requireCompleteTask10ScenarioRow(value: unknown): Task10ScenarioRowWire {
  const objectValue = requireObject(value, 'scenarioRow');
  assertExactKeys(objectValue, ['scenario_family', 'tenant', 'actor', 'company', 'authority', 'request', 'source_object', 'target_object', 'proof_class', 'evidence_refs', 'private_evidence_handles', 'private_handle_attestations', 'result', 'timestamp', 'reason_codes'], 'scenarioRow');
  const scenarioFamily = requireNonEmptyString(objectValue.scenario_family, 'scenarioRow.scenario_family');
  if (!TASK10_REQUIRED_SCENARIO_FAMILIES.includes(scenarioFamily as Task10ScenarioFamily)) {
    throw new Error('scenarioRow.scenario_family must be a required family');
  }
  const proofClass = requireNonEmptyString(objectValue.proof_class, 'scenarioRow.proof_class');
  const result = requireNonEmptyString(objectValue.result, 'scenarioRow.result');
  if (result !== 'passed' && result !== 'blocked') {
    throw new Error('scenarioRow.result must be passed or blocked');
  }
  const evidenceRefs = freezeArray(requireLexicallySorted(requireStringArray(objectValue.evidence_refs, 'scenarioRow.evidence_refs'), 'scenarioRow.evidence_refs'));
  if (!Array.isArray(objectValue.private_evidence_handles)) {
    throw new Error('scenarioRow.private_evidence_handles must be an array');
  }
  const privateEvidenceHandles = freezeArray(objectValue.private_evidence_handles.map((entry, index) => requireHandle(entry, `scenarioRow.private_evidence_handles[${index}]`)));
  for (let index = 1; index < privateEvidenceHandles.length; index += 1) {
    if (compareCodeUnits(privateEvidenceHandles[index - 1]!, privateEvidenceHandles[index]!) > 0) {
      throw new Error('scenarioRow.private_evidence_handles must be sorted lexically');
    }
  }
  const seenHandles = new Set<string>();
  for (const handle of privateEvidenceHandles) {
    if (seenHandles.has(handle)) {
      throw new Error('scenarioRow.private_evidence_handles must not contain duplicate handles');
    }
    seenHandles.add(handle);
  }
  if (!Array.isArray(objectValue.private_handle_attestations)) {
    throw new Error('scenarioRow.private_handle_attestations must be an array');
  }
  const privateEvidenceAttestations = freezeArray(objectValue.private_handle_attestations.map((entry, index) => parseAttestation(entry, `scenarioRow.private_handle_attestations[${index}]`)));
  if (privateEvidenceAttestations.length !== privateEvidenceHandles.length) {
    throw new Error('scenarioRow.private_handle_attestations must contain exactly one attestation per handle');
  }
  for (let index = 0; index < privateEvidenceAttestations.length; index += 1) {
    if (privateEvidenceAttestations[index]!.handle !== privateEvidenceHandles[index]) {
      throw new Error('scenarioRow.private_handle_attestations must align one-to-one with private handles');
    }
  }
  return Object.freeze({
    scenario_family: scenarioFamily as Task10ScenarioFamily,
    tenant: requireNonEmptyString(objectValue.tenant, 'scenarioRow.tenant'),
    actor: requireNonEmptyString(objectValue.actor, 'scenarioRow.actor'),
    company: requireNonEmptyString(objectValue.company, 'scenarioRow.company'),
    authority: requireNonEmptyString(objectValue.authority, 'scenarioRow.authority'),
    request: requireNonEmptyString(objectValue.request, 'scenarioRow.request'),
    source_object: requireNonEmptyString(objectValue.source_object, 'scenarioRow.source_object'),
    target_object: requireNonEmptyString(objectValue.target_object, 'scenarioRow.target_object'),
    proof_class: proofClass,
    evidence_refs: evidenceRefs,
    private_evidence_handles: privateEvidenceHandles,
    private_handle_attestations: privateEvidenceAttestations,
    result,
    timestamp: requireNonEmptyString(objectValue.timestamp, 'scenarioRow.timestamp'),
    reason_codes: freezeArray(requireLexicallySorted(requireStringArray(objectValue.reason_codes, 'scenarioRow.reason_codes'), 'scenarioRow.reason_codes')),
  });
}

function validateScenarioMinimums(rows: readonly Task10ScenarioRowWire[]): void {
  const counts = new Map<Task10ScenarioFamily, number>();
  for (const family of TASK10_REQUIRED_SCENARIO_FAMILIES) {
    counts.set(family, 0);
  }
  for (const row of rows) {
    counts.set(row.scenario_family, (counts.get(row.scenario_family) ?? 0) + 1);
  }
  const minimums: Record<Task10ScenarioFamily, number> = {
    'session-access': 1,
    readiness: 2,
    dispatch: 1,
    'replay-recovery': 2,
    'result-submission': 1,
  };
  for (const family of TASK10_REQUIRED_SCENARIO_FAMILIES) {
    if ((counts.get(family) ?? 0) < minimums[family]) {
      throw new Error('scenarioMatrix.scenarios must satisfy each required family minimum row count');
    }
  }
}

export function buildTask10ScenarioMatrixWire(input: Task10ScenarioMatrix): Task10ScenarioMatrixWire {
  return parseTask10ScenarioMatrixWire({
    schema_version: input.schemaVersion,
    attempt_id: input.attemptId,
    generated_at: input.generatedAt,
    required_families: [...input.requiredFamilies],
    summary: {
      required_family_count: input.summary.requiredFamilyCount,
      row_count: input.summary.rowCount,
      passed_count: input.summary.passedCount,
      blocked_count: input.summary.blockedCount,
      missing_families: [...input.summary.missingFamilies],
    },
    scenarios: input.scenarios.map((row) => ({
      scenario_family: row.scenarioFamily,
      tenant: row.tenant,
      actor: row.actor,
      company: row.company,
      authority: row.authority,
      request: row.request,
      source_object: row.sourceObject,
      target_object: row.targetObject,
      proof_class: row.proofClass,
      evidence_refs: [...row.evidenceRefs],
      private_evidence_handles: [...row.privateEvidenceHandles],
      private_handle_attestations: row.privateEvidenceAttestations.map((attestation) => ({
        handle: attestation.handle,
        source_class: attestation.sourceClass,
        verified: attestation.verified,
        verified_at: attestation.verifiedAt,
      })),
      result: row.result,
      timestamp: row.timestamp,
      reason_codes: [...row.reasonCodes],
    })),
  });
}

export function parseTask10ScenarioMatrixWire(value: unknown): Task10ScenarioMatrixWire {
  const objectValue = requireObject(value, 'scenarioMatrix');
  assertExactKeys(objectValue, ['schema_version', 'attempt_id', 'generated_at', 'required_families', 'summary', 'scenarios'], 'scenarioMatrix');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-scenario-matrix/v1', 'scenarioMatrix.schema_version');
  requireLiteral(objectValue.attempt_id, TASK10_AUTHORITY.attemptId, 'scenarioMatrix.attempt_id');
  const generatedAt = requireNonEmptyString(objectValue.generated_at, 'scenarioMatrix.generated_at');
  requireExactTuple(objectValue.required_families, TASK10_REQUIRED_SCENARIO_FAMILIES, 'scenarioMatrix.required_families');
  const summary = requireObject(objectValue.summary, 'scenarioMatrix.summary');
  assertExactKeys(summary, ['required_family_count', 'row_count', 'passed_count', 'blocked_count', 'missing_families'], 'scenarioMatrix.summary');
  if (!Array.isArray(objectValue.scenarios)) {
    throw new Error('scenarioMatrix.scenarios must be an array');
  }
  const scenarios = freezeArray(objectValue.scenarios.map((entry) => requireCompleteTask10ScenarioRow(entry)));
  for (let index = 1; index < scenarios.length; index += 1) {
    const left = scenarios[index - 1]!;
    const right = scenarios[index]!;
    const comparison = TASK10_REQUIRED_SCENARIO_FAMILIES.indexOf(left.scenario_family) - TASK10_REQUIRED_SCENARIO_FAMILIES.indexOf(right.scenario_family)
      || compareCodeUnits(left.timestamp, right.timestamp)
      || compareCodeUnits(left.request, right.request);
    if (comparison > 0) {
      throw new Error('scenarioMatrix.scenarios must be sorted by canonical family, timestamp, then request');
    }
  }
  validateScenarioMinimums(scenarios);
  const requiredFamilyCount = requireInteger(summary.required_family_count, 'scenarioMatrix.summary.required_family_count');
  const rowCount = requireInteger(summary.row_count, 'scenarioMatrix.summary.row_count');
  const passedCount = requireInteger(summary.passed_count, 'scenarioMatrix.summary.passed_count');
  const blockedCount = requireInteger(summary.blocked_count, 'scenarioMatrix.summary.blocked_count');
  if (requiredFamilyCount !== TASK10_REQUIRED_SCENARIO_FAMILIES.length) {
    throw new Error('scenarioMatrix.summary.required_family_count must match required_families length');
  }
  if (rowCount !== scenarios.length) {
    throw new Error('scenarioMatrix.summary.row_count must match scenarios length');
  }
  const actualPassedCount = scenarios.filter((row) => row.result === 'passed').length;
  const actualBlockedCount = scenarios.filter((row) => row.result === 'blocked').length;
  if (passedCount !== actualPassedCount || blockedCount !== actualBlockedCount) {
    throw new Error('scenarioMatrix.summary counts must match scenario results');
  }
  const missingFamilies = freezeArray(requireCanonicalSubset(summary.missing_families, TASK10_REQUIRED_SCENARIO_FAMILIES, 'scenarioMatrix.summary.missing_families'));
  if (missingFamilies.length !== 0) {
    const familiesPresent = new Set(scenarios.map((row) => row.scenario_family));
    const actualMissing = TASK10_REQUIRED_SCENARIO_FAMILIES.filter((family) => !familiesPresent.has(family));
    if (actualMissing.length !== missingFamilies.length || actualMissing.some((family, index) => family !== missingFamilies[index])) {
      throw new Error('scenarioMatrix.summary.missing_families must match actual missing families');
    }
  }
  return Object.freeze({
    schema_version: 'bidvia-client-task10-scenario-matrix/v1',
    attempt_id: TASK10_AUTHORITY.attemptId,
    generated_at: generatedAt,
    required_families: TASK10_REQUIRED_SCENARIO_FAMILIES,
    summary: Object.freeze({
      required_family_count: requiredFamilyCount,
      row_count: rowCount,
      passed_count: passedCount,
      blocked_count: blockedCount,
      missing_families: missingFamilies,
    }),
    scenarios,
  });
}

function validateWrapperFiles(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error('secretReview.scope.wrapper_files must contain four entries');
  }
  if (value[0] !== 'secret-review.json' || value[1] !== 'SHA256SUMS.txt') {
    throw new Error('secretReview.scope.wrapper_files must begin with the fixed wrapper files');
  }
  const archiveName = requireNonEmptyString(value[2], 'secretReview.scope.wrapper_files[2]');
  const receiptName = requireNonEmptyString(value[3], 'secretReview.scope.wrapper_files[3]');
  if (!archiveName.endsWith('.tar.gz') || !receiptName.endsWith('.publication.json')) {
    throw new Error('secretReview.scope.wrapper_files must use package-derived archive and receipt names');
  }
  const packageName = archiveName.slice(0, -'.tar.gz'.length);
  requireCanonicalTask10PackageName(packageName, 'secretReview.scope.wrapper_files[2]');
  if (receiptName !== `${packageName}.publication.json`) {
    throw new Error('secretReview.scope.wrapper_files must use the exact package prefix and shared package name');
  }
  return Object.freeze([value[0], value[1], archiveName, receiptName]);
}

export function buildTask10SecretReviewWire(input: Task10SecretReview): Task10SecretReviewWire {
  return parseTask10SecretReviewWire({
    schema_version: input.schemaVersion,
    status: input.status,
    candidate_status: input.candidateStatus,
    scope: {
      content_files: [...input.scope.contentFiles],
      wrapper_files: [...input.scope.wrapperFiles],
      private_source_values_published: input.scope.privateSourceValuesPublished,
    },
    scanned_files: [...input.scannedFiles],
    prohibited_value_families: [...input.prohibitedValueFamilies],
    findings: input.findings.map((finding) => ({
      code: finding.code,
      family: finding.family,
      count: finding.count,
    })),
    raw_producer_outputs_published: input.rawProducerOutputsPublished,
    raw_logs_published: input.rawLogsPublished,
  });
}

export function parseTask10SecretReviewWire(value: unknown): Task10SecretReviewWire {
  const objectValue = requireObject(value, 'secretReview');
  assertExactKeys(objectValue, ['schema_version', 'status', 'candidate_status', 'scope', 'scanned_files', 'prohibited_value_families', 'findings', 'raw_producer_outputs_published', 'raw_logs_published'], 'secretReview');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-secret-review/v1', 'secretReview.schema_version');
  requireLiteral(objectValue.status, 'passed', 'secretReview.status');
  const candidateStatus = requireNonEmptyString(objectValue.candidate_status, 'secretReview.candidate_status');
  if (candidateStatus !== 'passed' && candidateStatus !== 'blocked') {
    throw new Error('secretReview.candidate_status must be passed or blocked');
  }
  const scope = requireObject(objectValue.scope, 'secretReview.scope');
  assertExactKeys(scope, ['content_files', 'wrapper_files', 'private_source_values_published'], 'secretReview.scope');
  requireExactTuple(scope.content_files, TASK10_CONTENT_FILES, 'secretReview.scope.content_files');
  const wrapperFiles = validateWrapperFiles(scope.wrapper_files);
  requireLiteral(scope.private_source_values_published, false, 'secretReview.scope.private_source_values_published');
  requireExactTuple(objectValue.scanned_files, TASK10_CONTENT_FILES, 'secretReview.scanned_files');
  requireExactTuple(objectValue.prohibited_value_families, TASK10_PROHIBITED_VALUE_FAMILIES, 'secretReview.prohibited_value_families');
  if (!Array.isArray(objectValue.findings)) {
    throw new Error('secretReview.findings must be an array');
  }
  const findings = freezeArray(objectValue.findings.map((entry, index) => {
    const item = requireObject(entry, `secretReview.findings[${index}]`);
    assertExactKeys(item, ['code', 'family', 'count'], `secretReview.findings[${index}]`);
    const family = requireNonEmptyString(item.family, `secretReview.findings[${index}].family`);
    return Object.freeze({
      code: requireNonEmptyString(item.code, `secretReview.findings[${index}].code`),
      family,
      count: requireInteger(item.count, `secretReview.findings[${index}].count`),
    });
  }));
  for (let index = 1; index < findings.length; index += 1) {
    const left = findings[index - 1]!;
    const right = findings[index]!;
    const comparison = compareCodeUnits(left.code, right.code) || compareCodeUnits(left.family, right.family);
    if (comparison > 0) {
      throw new Error('secretReview.findings must be sorted by code then family');
    }
  }
  requireLiteral(objectValue.raw_producer_outputs_published, false, 'secretReview.raw_producer_outputs_published');
  requireLiteral(objectValue.raw_logs_published, false, 'secretReview.raw_logs_published');
  return Object.freeze({
    schema_version: 'bidvia-client-task10-secret-review/v1',
    status: 'passed',
    candidate_status: candidateStatus,
    scope: Object.freeze({
      content_files: TASK10_CONTENT_FILES,
      wrapper_files: wrapperFiles,
      private_source_values_published: false,
    }),
    scanned_files: TASK10_CONTENT_FILES,
    prohibited_value_families: TASK10_PROHIBITED_VALUE_FAMILIES,
    findings,
    raw_producer_outputs_published: false,
    raw_logs_published: false,
  });
}

export function buildTask10PublicationReceiptWire(input: Task10PublicationReceipt): Task10PublicationReceiptWire {
  return parseTask10PublicationReceiptWire({
    schema_version: input.schemaVersion,
    publication_state: input.publicationState,
    attempt_id: input.attemptId,
    client_owned_conclusion: input.clientOwnedConclusion,
    issue_url: input.issueUrl,
    package_directory: input.packageDirectory,
    conclusion_path: input.conclusionPath,
    conclusion_sha256: input.conclusionSha256,
    archive_path: input.archivePath,
    archive_sha256: input.archiveSha256,
    archive_size_bytes: input.archiveSizeBytes,
    internal_hash_manifest: input.internalHashManifest,
    internal_hash_manifest_sha256: input.internalHashManifestSha256,
    validation: {
      authority_verified: input.validation.authorityVerified,
      commands_verified: input.validation.commandsVerified,
      scenarios_verified: input.validation.scenariosVerified,
      private_handle_attestations_verified: input.validation.privateHandleAttestationsVerified,
      secret_review_verified: input.validation.secretReviewVerified,
      package_membership_verified: input.validation.packageMembershipVerified,
      internal_hashes_verified: input.validation.internalHashesVerified,
      archive_verified: input.validation.archiveVerified,
      receipt_bindings_verified: input.validation.receiptBindingsVerified,
    },
    non_claims: [...input.nonClaims],
  });
}

export function parseTask10PublicationReceiptWire(value: unknown): Task10PublicationReceiptWire {
  const objectValue = requireObject(value, 'publicationReceipt');
  assertExactKeys(objectValue, ['schema_version', 'publication_state', 'attempt_id', 'client_owned_conclusion', 'issue_url', 'package_directory', 'conclusion_path', 'conclusion_sha256', 'archive_path', 'archive_sha256', 'archive_size_bytes', 'internal_hash_manifest', 'internal_hash_manifest_sha256', 'validation', 'non_claims'], 'publicationReceipt');
  requireLiteral(objectValue.schema_version, 'bidvia-client-task10-publication/v1', 'publicationReceipt.schema_version');
  requireLiteral(objectValue.publication_state, 'published_for_review', 'publicationReceipt.publication_state');
  requireLiteral(objectValue.attempt_id, TASK10_AUTHORITY.attemptId, 'publicationReceipt.attempt_id');
  const conclusion = requireNonEmptyString(objectValue.client_owned_conclusion, 'publicationReceipt.client_owned_conclusion');
  if (conclusion !== 'passed' && conclusion !== 'blocked') {
    throw new Error('publicationReceipt.client_owned_conclusion must be passed or blocked');
  }
  requireLiteral(objectValue.issue_url, TASK10_AUTHORITY.issueUrl, 'publicationReceipt.issue_url');
  requireExactTuple(objectValue.non_claims, TASK10_NON_CLAIMS, 'publicationReceipt.non_claims');
  const validation = requireObject(objectValue.validation, 'publicationReceipt.validation');
  assertExactKeys(validation, ['authority_verified', 'commands_verified', 'scenarios_verified', 'private_handle_attestations_verified', 'secret_review_verified', 'package_membership_verified', 'internal_hashes_verified', 'archive_verified', 'receipt_bindings_verified'], 'publicationReceipt.validation');
  return Object.freeze({
    schema_version: 'bidvia-client-task10-publication/v1',
    publication_state: 'published_for_review',
    attempt_id: TASK10_AUTHORITY.attemptId,
    client_owned_conclusion: conclusion,
    issue_url: TASK10_AUTHORITY.issueUrl,
    package_directory: requireNonEmptyString(objectValue.package_directory, 'publicationReceipt.package_directory'),
    conclusion_path: requireNonEmptyString(objectValue.conclusion_path, 'publicationReceipt.conclusion_path'),
    conclusion_sha256: requireSha256Hex(objectValue.conclusion_sha256, 'publicationReceipt.conclusion_sha256'),
    archive_path: requireNonEmptyString(objectValue.archive_path, 'publicationReceipt.archive_path'),
    archive_sha256: requireSha256Hex(objectValue.archive_sha256, 'publicationReceipt.archive_sha256'),
    archive_size_bytes: requirePositiveInteger(objectValue.archive_size_bytes, 'publicationReceipt.archive_size_bytes'),
    internal_hash_manifest: requireNonEmptyString(objectValue.internal_hash_manifest, 'publicationReceipt.internal_hash_manifest'),
    internal_hash_manifest_sha256: requireSha256Hex(objectValue.internal_hash_manifest_sha256, 'publicationReceipt.internal_hash_manifest_sha256'),
    validation: Object.freeze({
      authority_verified: requireBoolean(validation.authority_verified, 'publicationReceipt.validation.authority_verified'),
      commands_verified: requireBoolean(validation.commands_verified, 'publicationReceipt.validation.commands_verified'),
      scenarios_verified: requireBoolean(validation.scenarios_verified, 'publicationReceipt.validation.scenarios_verified'),
      private_handle_attestations_verified: requireBoolean(validation.private_handle_attestations_verified, 'publicationReceipt.validation.private_handle_attestations_verified'),
      secret_review_verified: requireBoolean(validation.secret_review_verified, 'publicationReceipt.validation.secret_review_verified'),
      package_membership_verified: requireBoolean(validation.package_membership_verified, 'publicationReceipt.validation.package_membership_verified'),
      internal_hashes_verified: requireBoolean(validation.internal_hashes_verified, 'publicationReceipt.validation.internal_hashes_verified'),
      archive_verified: requireBoolean(validation.archive_verified, 'publicationReceipt.validation.archive_verified'),
      receipt_bindings_verified: requireBoolean(validation.receipt_bindings_verified, 'publicationReceipt.validation.receipt_bindings_verified'),
    }),
    non_claims: TASK10_NON_CLAIMS,
  });
}
