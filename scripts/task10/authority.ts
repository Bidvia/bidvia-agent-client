import path from 'node:path';

import { TASK10_AUTHORITY } from './contracts.js';

export { TASK10_AUTHORITY };

export interface Task10CheckoutInspection {
  headCommit: string;
  branch: string | null;
  upstreamRef: string | null;
  detachedHead: boolean;
  porcelainStatus: 'empty' | 'non-empty';
  lockfileSha256?: string;
  realPath: string;
  symlinked: boolean;
}

export interface Task10AuthorityVerifierDependencies {
  readFile(filePath: string): Uint8Array;
  hashBytes(bytes: Uint8Array): string;
  inspectCheckout(rootPath: string): Task10CheckoutInspection;
}

export class Task10ExpectedCheckoutInspectionError extends Error {
  readonly kind: 'missing' | 'unreadable';

  constructor(kind: 'missing' | 'unreadable') {
    super(kind === 'missing' ? 'checkout inspection is missing' : 'checkout inspection is unreadable');
    this.name = 'Task10ExpectedCheckoutInspectionError';
    this.kind = kind;
  }
}

function isExpectedInspectionFailure(error: unknown): boolean {
  return error instanceof Task10ExpectedCheckoutInspectionError;
}

export interface VerifyTask10AuthorityInput {
  checkoutRoots: {
    coreRuntimeRoot: string;
    clientValidationRoot: string;
    siteValidationRoot: string;
    coreEvidenceRoot: string;
  };
  bundleRepoPath: string;
}

export interface Task10AuthorityVerificationResult {
  status: 'verified' | 'reportable-blocked' | 'tooling-failure';
  reasons: string[];
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function requireInteger(value: unknown, fieldName: string): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value as number;
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

function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${fieldName} must be a boolean`);
  }
  return value;
}

function requireNonEmptyStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string array`);
  }
  return value.map((entry, index) => requireNonEmptyString(entry, `${fieldName}[${index}]`));
}

function requireExactReusableRefs(value: unknown, fieldName: string): string[] {
  const refs = requireNonEmptyStringArray(value, fieldName);
  if (refs.length !== 4) {
    throw new Error(`${fieldName} must contain exactly four reusable refs`);
  }
  for (const prefix of ['business-method-atom:', 'lineage-unit:', 'rules_template:', 'evidence-shape:'] as const) {
    if (refs.filter((entry) => entry.startsWith(prefix)).length !== 1) {
      throw new Error(`${fieldName} must contain exactly one ${prefix} entry`);
    }
  }
  return refs;
}

function requireExactIntegerArray(value: unknown, expected: readonly number[], fieldName: string): number[] {
  if (!Array.isArray(value) || value.length !== expected.length) {
    throw new Error(`${fieldName} must be an exact integer array`);
  }
  const integers = value.map((entry, index) => requireInteger(entry, `${fieldName}[${index}]`));
  for (let index = 0; index < expected.length; index += 1) {
    if (integers[index] !== expected[index]) {
      throw new Error(`${fieldName} must match the frozen integer array`);
    }
  }
  return integers;
}

function normalizePrefixedLockHash(value: unknown, fieldName: string): string {
  const raw = requireNonEmptyString(value, fieldName);
  const stripped = raw.startsWith('sha256:') ? raw.slice('sha256:'.length) : raw;
  const normalized = stripped.toLowerCase();
  if (normalized.startsWith('sha256:') || !/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(`${fieldName} must contain exactly one optional sha256: prefix and a 64-character lowercase hex digest`);
  }
  return normalized;
}

function requirePlainSha256(value: unknown, fieldName: string): string {
  const digest = requireNonEmptyString(value, fieldName).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`${fieldName} must be a 64-character lowercase hex digest`);
  }
  return digest;
}

function safeResolve(rootPath: string, relativePath: string): string | null {
  const resolved = path.resolve(rootPath, relativePath);
  const normalizedRoot = path.resolve(rootPath);
  return resolved.startsWith(`${normalizedRoot}${path.sep}`) ? resolved : null;
}

function parseJson(bytes: Uint8Array, fieldName: string): Record<string, unknown> {
  const text = new TextDecoder().decode(bytes);
  return requireObject(JSON.parse(text) as unknown, fieldName);
}

function checkRootTopology(inspections: Task10CheckoutInspection[], reasons: string[]): void {
  const realPaths = inspections.map((inspection) => path.resolve(inspection.realPath));
  for (const inspection of inspections) {
    if (inspection.symlinked) {
      reasons.push('root inspection reported a symlinked path');
    }
  }
  for (let leftIndex = 0; leftIndex < realPaths.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < realPaths.length; rightIndex += 1) {
      const left = realPaths[leftIndex]!;
      const right = realPaths[rightIndex]!;
      if (left === right) {
        reasons.push('checkout roots must not resolve to the same real path');
      }
      if (left.startsWith(`${right}${path.sep}`) || right.startsWith(`${left}${path.sep}`)) {
        reasons.push('checkout roots must not be nested or overlapping');
      }
    }
  }
}

function validateProducerRoot(
  label: string,
  inspection: Task10CheckoutInspection,
  expectedHead: string,
  expectedLock: string,
  reasons: string[],
): void {
  if (inspection.headCommit !== expectedHead) {
    reasons.push(`${label} head commit mismatch`);
  }
  if (inspection.branch !== 'main') {
    reasons.push(`${label} branch mismatch`);
  }
  if (inspection.upstreamRef !== 'origin/main') {
    reasons.push(`${label} upstream ref mismatch`);
  }
  if (inspection.detachedHead) {
    reasons.push(`${label} must not be detached`);
  }
  if (inspection.porcelainStatus !== 'empty') {
    reasons.push(`${label} porcelain status must be empty`);
  }
  if (!inspection.lockfileSha256 || inspection.lockfileSha256 !== expectedLock) {
    reasons.push(`${label} lockfile hash mismatch`);
  }
}

function validateEvidenceRoot(inspection: Task10CheckoutInspection, reasons: string[]): void {
  if (inspection.headCommit !== TASK10_AUTHORITY.coreEvidencePublicationCommit) {
    reasons.push('core evidence root head commit mismatch');
  }
  if (inspection.branch !== null) {
    reasons.push('core evidence root branch must be null');
  }
  if (inspection.upstreamRef !== null) {
    reasons.push('core evidence root upstream ref must be null');
  }
  if (!inspection.detachedHead) {
    reasons.push('core evidence root must be detached');
  }
  if (inspection.porcelainStatus !== 'empty') {
    reasons.push('core evidence root porcelain status must be empty');
  }
  if (!inspection.lockfileSha256 || !/^[0-9a-f]{64}$/.test(inspection.lockfileSha256)) {
    reasons.push('core evidence root lockfile hash must be recorded as a 64-character lowercase hex digest');
  }
}

function parseBundle(bundle: Record<string, unknown>): { preflightPath: string; preflightHash: string } {
  const preflightPath = requireNonEmptyString(bundle.preflight_artifact_path, 'coreBundle.preflight_artifact_path');
  const preflightHash = requirePlainSha256(bundle.preflight_artifact_hash, 'coreBundle.preflight_artifact_hash');
  return { preflightPath, preflightHash };
}

function validatePreflight(preflight: Record<string, unknown>, reasons: string[]): void {
  if (requireNonEmptyString(preflight.attempt_id, 'preflight.attempt_id') !== TASK10_AUTHORITY.attemptId) {
    reasons.push('attempt id mismatch');
  }
  const repoIdentity = requireObject(preflight.repo_identity, 'preflight.repo_identity');
  assertExactKeys(repoIdentity, ['core', 'client', 'site'], 'preflight.repo_identity');
  const core = requireObject(repoIdentity.core, 'preflight.repo_identity.core');
  const client = requireObject(repoIdentity.client, 'preflight.repo_identity.client');
  const site = requireObject(repoIdentity.site, 'preflight.repo_identity.site');
  const repoEntries = [
    { value: core, sha: TASK10_AUTHORITY.coreRuntimeSha, lock: TASK10_AUTHORITY.lockfileSha256.core, pkg: TASK10_AUTHORITY.packageIdentities.core, label: 'core' },
    { value: client, sha: TASK10_AUTHORITY.clientBaselineSha, lock: TASK10_AUTHORITY.lockfileSha256.client, pkg: TASK10_AUTHORITY.packageIdentities.client, label: 'client' },
    { value: site, sha: TASK10_AUTHORITY.siteBaselineSha, lock: TASK10_AUTHORITY.lockfileSha256.site, pkg: TASK10_AUTHORITY.packageIdentities.site, label: 'site' },
  ] as const;
  for (const entry of repoEntries) {
    assertExactKeys(entry.value, ['repo_name', 'full_sha', 'branch', 'upstream_ref', 'tracked_dirty', 'untracked_dirty', 'detached', 'lockfile_hash', 'package_identity', 'contains_sisyphus_dependency'], `preflight.repo_identity.${entry.label}`);
    if (requireNonEmptyString(entry.value.repo_name, `preflight.repo_identity.${entry.label}.repo_name`) !== entry.label) {
      reasons.push(`${entry.label} repo name mismatch`);
    }
    if (requireNonEmptyString(entry.value.full_sha, `preflight.repo_identity.${entry.label}.full_sha`) !== entry.sha) {
      reasons.push(`${entry.label} sha mismatch`);
    }
    if (requireNonEmptyString(entry.value.branch, `preflight.repo_identity.${entry.label}.branch`) !== 'main') {
      reasons.push(`${entry.label} branch mismatch`);
    }
    if (requireNonEmptyString(entry.value.upstream_ref, `preflight.repo_identity.${entry.label}.upstream_ref`) !== 'origin/main') {
      reasons.push(`${entry.label} upstream ref mismatch`);
    }
    if (entry.value.tracked_dirty !== false || entry.value.untracked_dirty !== false) {
      reasons.push(`${entry.label} dirty flag mismatch`);
    }
    if (entry.value.detached !== false) {
      reasons.push(`${entry.label} detached flag mismatch`);
    }
    if (normalizePrefixedLockHash(entry.value.lockfile_hash, `preflight.repo_identity.${entry.label}.lockfile_hash`) !== entry.lock) {
      reasons.push(`${entry.label} lock hash mismatch`);
    }
    if (requireNonEmptyString(entry.value.package_identity, `preflight.repo_identity.${entry.label}.package_identity`) !== entry.pkg) {
      reasons.push(`${entry.label} package identity mismatch`);
    }
    if (entry.value.contains_sisyphus_dependency !== false) {
      reasons.push(`${entry.label} sisyphus dependency flag mismatch`);
    }
  }

  const toolIdentity = requireObject(preflight.tool_identity, 'preflight.tool_identity');
  assertExactKeys(toolIdentity, ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'], 'preflight.tool_identity');
  for (const fieldName of ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'] as const) {
    requireNonEmptyString(toolIdentity[fieldName], `preflight.tool_identity.${fieldName}`);
  }

  const runtimeIdentity = requireObject(preflight.runtime_identity, 'preflight.runtime_identity');
  assertExactKeys(runtimeIdentity, ['core_image_digest', 'build_context_ref', 'source_marker', 'runtime_marker', 'bootstrap_marker', 'scenario_marker', 'client_package_identity', 'site_build_identity', 'provider_fixture_identity', 'provider_protocol_version', 'compose_project', 'container_names', 'ports', 'network_identity'], 'preflight.runtime_identity');
  requireNonEmptyString(runtimeIdentity.core_image_digest, 'preflight.runtime_identity.core_image_digest');
  requireNonEmptyString(runtimeIdentity.build_context_ref, 'preflight.runtime_identity.build_context_ref');
  if (requireNonEmptyString(runtimeIdentity.source_marker, 'preflight.runtime_identity.source_marker') !== TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker) {
    reasons.push('source marker mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.runtime_marker, 'preflight.runtime_identity.runtime_marker') !== TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker) {
    reasons.push('runtime marker mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.bootstrap_marker, 'preflight.runtime_identity.bootstrap_marker') !== TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker) {
    reasons.push('bootstrap marker mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.scenario_marker, 'preflight.runtime_identity.scenario_marker') !== TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker) {
    reasons.push('scenario marker mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.client_package_identity, 'preflight.runtime_identity.client_package_identity') !== TASK10_AUTHORITY.packageIdentities.client) {
    reasons.push('client package identity mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.site_build_identity, 'preflight.runtime_identity.site_build_identity') !== TASK10_AUTHORITY.packageIdentities.site) {
    reasons.push('site build identity mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.provider_fixture_identity, 'preflight.runtime_identity.provider_fixture_identity') !== TASK10_AUTHORITY.providerFixtureIdentity) {
    reasons.push('fixture identity mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.provider_protocol_version, 'preflight.runtime_identity.provider_protocol_version') !== TASK10_AUTHORITY.providerProtocolVersion) {
    reasons.push('protocol version mismatch');
  }
  const composeProject = `bidvia-task10-${TASK10_AUTHORITY.attemptId}`;
  if (requireNonEmptyString(runtimeIdentity.compose_project, 'preflight.runtime_identity.compose_project') !== composeProject) {
    reasons.push('compose project mismatch');
  }
  const containerNames = requireNonEmptyStringArray(runtimeIdentity.container_names, 'preflight.runtime_identity.container_names');
  const expectedContainerNames = [
    `${composeProject}-runtime`,
    `${composeProject}-postgres`,
    `${composeProject}-fixture`,
    `${composeProject}-operator`,
  ];
  if (containerNames.length !== expectedContainerNames.length || containerNames.some((entry, index) => entry !== expectedContainerNames[index])) {
    reasons.push('container names mismatch');
  }
  if (requireExactIntegerArray(runtimeIdentity.ports, [TASK10_AUTHORITY.ports.postgres, TASK10_AUTHORITY.ports.runtime, TASK10_AUTHORITY.ports.operator, TASK10_AUTHORITY.ports.fixture], 'preflight.runtime_identity.ports').length !== 4) {
    reasons.push('runtime port mismatch');
  }
  if (requireNonEmptyString(runtimeIdentity.network_identity, 'preflight.runtime_identity.network_identity') !== `${composeProject}_default`) {
    reasons.push('network identity mismatch');
  }

  const resetFreshness = requireObject(preflight.reset_freshness, 'preflight.reset_freshness');
  assertExactKeys(resetFreshness, ['reset_state', 'reset_detail', 'output_directory_empty', 'output_directory_symlinked', 'fresh_business_ids', 'selected_reusable_refs', 'schema_columns_complete'], 'preflight.reset_freshness');
  if (requireNonEmptyString(resetFreshness.reset_state, 'preflight.reset_freshness.reset_state') !== 'passed') {
    reasons.push('reset state mismatch');
  }
  requireNonEmptyString(resetFreshness.reset_detail, 'preflight.reset_freshness.reset_detail');
  if (requireBoolean(resetFreshness.output_directory_empty, 'preflight.reset_freshness.output_directory_empty') !== true) {
    reasons.push('output directory empty flag mismatch');
  }
  if (requireBoolean(resetFreshness.output_directory_symlinked, 'preflight.reset_freshness.output_directory_symlinked') !== false) {
    reasons.push('output directory symlink flag mismatch');
  }
  if (requireBoolean(resetFreshness.fresh_business_ids, 'preflight.reset_freshness.fresh_business_ids') !== true) {
    reasons.push('fresh business ids flag mismatch');
  }
  if (requireBoolean(resetFreshness.schema_columns_complete, 'preflight.reset_freshness.schema_columns_complete') !== true) {
    reasons.push('schema columns flag mismatch');
  }
  const nestedReusableRefs = requireExactReusableRefs(resetFreshness.selected_reusable_refs, 'preflight.reset_freshness.selected_reusable_refs');
  const topLevelReusableRefs = requireExactReusableRefs(preflight.selected_reusable_refs, 'preflight.selected_reusable_refs');
  if (nestedReusableRefs.length !== topLevelReusableRefs.length || nestedReusableRefs.some((entry, index) => entry !== topLevelReusableRefs[index])) {
    reasons.push('selected reusable refs mismatch');
  }
}

export function verifyTask10Authority(
  input: VerifyTask10AuthorityInput,
  dependencies: Task10AuthorityVerifierDependencies,
): Task10AuthorityVerificationResult {
  const reasons: string[] = [];

  const inspections = [] as Task10CheckoutInspection[];
  for (const rootPath of [
    input.checkoutRoots.coreRuntimeRoot,
    input.checkoutRoots.clientValidationRoot,
    input.checkoutRoots.siteValidationRoot,
    input.checkoutRoots.coreEvidenceRoot,
  ]) {
    try {
      inspections.push(dependencies.inspectCheckout(rootPath));
    } catch (error) {
      if (!isExpectedInspectionFailure(error)) {
        return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
      }
      return { status: 'reportable-blocked', reasons: ['checkout inspection is missing or unreadable'] };
    }
  }

  checkRootTopology(inspections, reasons);
  validateProducerRoot('core runtime root', inspections[0]!, TASK10_AUTHORITY.coreRuntimeSha, TASK10_AUTHORITY.lockfileSha256.core, reasons);
  validateProducerRoot('client validation root', inspections[1]!, TASK10_AUTHORITY.clientBaselineSha, TASK10_AUTHORITY.lockfileSha256.client, reasons);
  validateProducerRoot('site validation root', inspections[2]!, TASK10_AUTHORITY.siteBaselineSha, TASK10_AUTHORITY.lockfileSha256.site, reasons);
  validateEvidenceRoot(inspections[3]!, reasons);

  if (input.bundleRepoPath !== TASK10_AUTHORITY.coreBundlePath) {
    reasons.push('bundle repo path mismatch');
  }

  const bundleFilePath = safeResolve(input.checkoutRoots.coreEvidenceRoot, TASK10_AUTHORITY.coreBundlePath);
  if (!bundleFilePath) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'bundle path escaped core evidence root'] };
  }

  let bundleBytes: Uint8Array;
  try {
    bundleBytes = dependencies.readFile(bundleFilePath);
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'bundle is missing or unreadable'] };
  }

  let bundleHash: string;
  try {
    bundleHash = dependencies.hashBytes(bundleBytes);
  } catch {
    return { status: 'tooling-failure', reasons: ['unable to hash core bundle bytes'] };
  }
  if (bundleHash !== TASK10_AUTHORITY.coreBundleSha256) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'bundle sha256 mismatch'] };
  }

  let bundle: Record<string, unknown>;
  try {
    bundle = parseJson(bundleBytes, 'coreBundle');
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'bundle JSON is unreadable'] };
  }
  let preflightReference: { preflightPath: string; preflightHash: string };
  try {
    preflightReference = parseBundle(bundle);
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'bundle reference is malformed'] };
  }
  if (preflightReference.preflightPath !== TASK10_AUTHORITY.corePreflightPath) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight artifact path mismatch'] };
  }

  const preflightFilePath = safeResolve(input.checkoutRoots.coreEvidenceRoot, preflightReference.preflightPath);
  if (!preflightFilePath) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight artifact path escaped core evidence root'] };
  }

  let preflightBytes: Uint8Array;
  try {
    preflightBytes = dependencies.readFile(preflightFilePath);
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight artifact is missing or unreadable'] };
  }

  let preflightHash: string;
  try {
    preflightHash = dependencies.hashBytes(preflightBytes);
  } catch {
    return { status: 'tooling-failure', reasons: ['unable to hash preflight artifact bytes'] };
  }
  if (preflightHash !== preflightReference.preflightHash) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight artifact hash mismatch'] };
  }

  let preflight: Record<string, unknown>;
  try {
    preflight = parseJson(preflightBytes, 'preflight');
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight JSON is unreadable'] };
  }

  try {
    validatePreflight(preflight, reasons);
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'preflight authority facts are invalid'] };
  }

  return reasons.length === 0
    ? { status: 'verified', reasons: [] }
    : { status: 'reportable-blocked', reasons };
}
