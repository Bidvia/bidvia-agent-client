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

export interface Task10EvidencePathInspection {
  realPath: string;
  symlinked: boolean;
  sizeBytes: number;
}

export interface Task10EvidenceFile {
  realPath: string;
  symlinked: boolean;
  sizeBytes: number;
  bytes: Uint8Array;
}

export interface Task10ArchiveRecreationRequest {
  evidenceRootPath: string;
  recipe: string;
  prefix: string;
}

export interface Task10AuthorityVerifierDependencies {
  hashBytes(bytes: Uint8Array): string;
  inspectCheckout(rootPath: string): Task10CheckoutInspection;
  readEvidenceFile(filePath: string): Task10EvidenceFile;
  recreateArchive(request: Task10ArchiveRecreationRequest): Uint8Array;
}

export class Task10ExpectedCheckoutInspectionError extends Error {
  readonly kind: 'missing' | 'unreadable';

  constructor(kind: 'missing' | 'unreadable') {
    super(kind === 'missing' ? 'checkout inspection is missing' : 'checkout inspection is unreadable');
    this.name = 'Task10ExpectedCheckoutInspectionError';
    this.kind = kind;
  }
}

export class Task10ExpectedEvidenceAccessError extends Error {
  readonly kind: 'missing' | 'unreadable';

  constructor(kind: 'missing' | 'unreadable') {
    super(kind === 'missing' ? 'evidence is missing' : 'evidence is unreadable');
    this.name = 'Task10ExpectedEvidenceAccessError';
    this.kind = kind;
  }
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

interface ManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return value;
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

function requireSha256(value: unknown, fieldName: string): string {
  const digest = requireString(value, fieldName);
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`${fieldName} must be a 64-character lowercase hex digest`);
  }
  return digest;
}

function requirePrefixedSha256(value: unknown, fieldName: string): string {
  const digest = requireString(value, fieldName);
  if (!/^sha256:[0-9a-f]{64}$/.test(digest)) {
    throw new Error(`${fieldName} must be a sha256-prefixed 64-character lowercase hex digest`);
  }
  return digest;
}

function requireStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  return value.map((entry, index) => requireString(entry, `${fieldName}[${index}]`));
}

function requireExactKeys(value: Record<string, unknown>, keys: readonly string[], fieldName: string): void {
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

function parseJson(bytes: Uint8Array, fieldName: string): Record<string, unknown> {
  return requireObject(JSON.parse(new TextDecoder().decode(bytes)) as unknown, fieldName);
}

function requireIsoUtcTimestamp(value: unknown, fieldName: string): string {
  const normalized = requireString(value, fieldName);
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/);
  if (!match) {
    throw new Error(`${fieldName} must be an ISO UTC timestamp`);
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
    throw new Error(`${fieldName} must be a real UTC datetime`);
  }
  return normalized;
}

function safeResolve(rootPath: string, relativePath: string): string | null {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\\')) {
    return null;
  }
  const segments = relativePath.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  const normalizedRoot = path.resolve(rootPath);
  const resolved = path.resolve(rootPath, relativePath);
  return resolved === normalizedRoot || resolved.startsWith(`${normalizedRoot}${path.sep}`)
    ? resolved
    : null;
}

function isContainedRealPath(rootRealPath: string, candidateRealPath: string): boolean {
  const normalizedRoot = path.resolve(rootRealPath);
  const normalizedCandidate = path.resolve(candidateRealPath);
  return normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`);
}

function isExpectedInspectionFailure(error: unknown): boolean {
  return error instanceof Task10ExpectedCheckoutInspectionError;
}

function isExpectedEvidenceAccessFailure(error: unknown): boolean {
  return error instanceof Task10ExpectedEvidenceAccessError;
}

function readEvidenceFile(
  filePath: string,
  label: string,
  evidenceRootRealPath: string,
  dependencies: Task10AuthorityVerifierDependencies,
): { evidenceFile: Task10EvidenceFile; status?: Task10AuthorityVerificationResult } {
  let evidenceFile: Task10EvidenceFile;
  try {
    evidenceFile = dependencies.readEvidenceFile(filePath);
  } catch (error) {
    if (!isExpectedEvidenceAccessFailure(error)) {
      return {
        evidenceFile: { realPath: filePath, symlinked: false, sizeBytes: 0, bytes: new Uint8Array() },
        status: { status: 'tooling-failure', reasons: ['internal authority verification failure'] },
      };
    }
    return {
      evidenceFile: { realPath: filePath, symlinked: false, sizeBytes: 0, bytes: new Uint8Array() },
      status: { status: 'reportable-blocked', reasons: [`${label} is missing or unreadable`] },
    };
  }

  if (evidenceFile.symlinked) {
    return {
      evidenceFile,
      status: { status: 'reportable-blocked', reasons: [`${label} must not be symlinked`] },
    };
  }
  if (!isContainedRealPath(evidenceRootRealPath, evidenceFile.realPath)) {
    return {
      evidenceFile,
      status: { status: 'reportable-blocked', reasons: [`${label} real path escaped core evidence root`] },
    };
  }
  if (evidenceFile.sizeBytes !== evidenceFile.bytes.byteLength) {
    return {
      evidenceFile,
      status: { status: 'reportable-blocked', reasons: [`${label} byte count mismatch`] },
    };
  }

  return { evidenceFile };
}

function validateRootTopology(inspections: Task10CheckoutInspection[], reasons: string[]): void {
  const realPaths = inspections.map((inspection) => path.resolve(inspection.realPath));
  for (const inspection of inspections) {
    if (inspection.symlinked) {
      reasons.push('checkout root must not be symlinked');
    }
  }
  for (let index = 0; index < realPaths.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < realPaths.length; otherIndex += 1) {
      const current = realPaths[index]!;
      const other = realPaths[otherIndex]!;
      if (current === other) {
        reasons.push('checkout roots must not resolve to the same real path');
      }
      if (current.startsWith(`${other}${path.sep}`) || other.startsWith(`${current}${path.sep}`)) {
        reasons.push('checkout roots must not be nested or overlapping');
      }
    }
  }
}

function validateProducerRoot(
  label: string,
  inspection: Task10CheckoutInspection,
  expectedCommit: string,
  expectedLockfileHash: string,
  reasons: string[],
): void {
  if (inspection.headCommit !== expectedCommit) {
    reasons.push(`${label} head commit mismatch`);
  }
  if (inspection.branch !== TASK10_AUTHORITY.checkoutBranches.producer) {
    reasons.push(`${label} branch mismatch`);
  }
  if (inspection.upstreamRef !== TASK10_AUTHORITY.checkoutUpstreams.producer) {
    reasons.push(`${label} upstream ref mismatch`);
  }
  if (inspection.detachedHead) {
    reasons.push(`${label} must not be detached`);
  }
  if (inspection.porcelainStatus !== 'empty') {
    reasons.push(`${label} porcelain status mismatch`);
  }
  if (inspection.lockfileSha256 !== expectedLockfileHash) {
    reasons.push(`${label} lockfile hash mismatch`);
  }
}

function validateEvidenceRoot(inspection: Task10CheckoutInspection, reasons: string[]): void {
  if (inspection.headCommit !== TASK10_AUTHORITY.coreEvidenceCommit) {
    reasons.push('core evidence head commit mismatch');
  }
  if (inspection.branch !== null) {
    reasons.push('core evidence branch mismatch');
  }
  if (inspection.upstreamRef !== null) {
    reasons.push('core evidence upstream mismatch');
  }
  if (!inspection.detachedHead) {
    reasons.push('core evidence must be detached');
  }
  if (inspection.porcelainStatus !== 'empty') {
    reasons.push('core evidence porcelain status mismatch');
  }
}

function parseManifestEntries(manifest: Record<string, unknown>): ManifestEntry[] {
  if (!Array.isArray(manifest.files) || manifest.files.length !== 14) {
    throw new Error('manifest.files must contain exactly 14 entries');
  }
  return manifest.files.map((entry, index) => {
    const objectValue = requireObject(entry, `manifest.files[${index}]`);
    return {
      path: requireString(objectValue.path, `manifest.files[${index}].path`),
      sha256: requireSha256(objectValue.sha256, `manifest.files[${index}].sha256`),
      bytes: requireInteger(objectValue.bytes, `manifest.files[${index}].bytes`),
    };
  });
}

function validateManifestEntries(
  rootPath: string,
  rootRealPath: string,
  entries: ManifestEntry[],
  dependencies: Task10AuthorityVerifierDependencies,
): Task10AuthorityVerificationResult | null {
  const seenPaths = new Set<string>();
  for (const entry of entries) {
    if (seenPaths.has(entry.path)) {
      return { status: 'reportable-blocked', reasons: ['bundle manifest contains duplicate entry paths'] };
    }
    seenPaths.add(entry.path);

    const absolutePath = safeResolve(rootPath, entry.path);
    if (!absolutePath) {
      return { status: 'reportable-blocked', reasons: ['bundle manifest contains an unsafe path'] };
    }

    const readResult = readEvidenceFile(absolutePath, 'bundle manifest entry', rootRealPath, dependencies);
    if (readResult.status) {
      return readResult.status;
    }

    if (readResult.evidenceFile.sizeBytes !== entry.bytes) {
      return { status: 'reportable-blocked', reasons: ['bundle manifest entry byte count mismatch'] };
    }

    let digest: string;
    try {
      digest = dependencies.hashBytes(readResult.evidenceFile.bytes);
    } catch {
      return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
    }
    if (digest !== entry.sha256) {
      return { status: 'reportable-blocked', reasons: ['bundle manifest entry sha256 mismatch'] };
    }
  }
  return null;
}

function requireExactStringArray(value: unknown, expected: readonly string[], fieldName: string): string[] {
  const entries = requireStringArray(value, fieldName);
  if (entries.length !== expected.length || entries.some((entry, index) => entry !== expected[index])) {
    throw new Error(`${fieldName} mismatch`);
  }
  return entries;
}

function validatePreflight(preflight: Record<string, unknown>, reasons: string[]): void {
  requireExactKeys(preflight, ['result', 'scope', 'authority_effect', 'release_effect', 'attempt_id', 'repo_identity', 'tool_identity', 'runtime_identity', 'reset_freshness', 'selected_reusable_refs'], 'preflight');
  if (requireString(preflight.result, 'preflight.result') !== 'passed') {
    throw new Error('preflight.result mismatch');
  }
  if (requireString(preflight.scope, 'preflight.scope') !== 'merged-main-reproducibility-and-acknowledged-handoff') {
    throw new Error('preflight.scope mismatch');
  }
  if (requireString(preflight.authority_effect, 'preflight.authority_effect') !== 'none') {
    throw new Error('preflight.authority_effect mismatch');
  }
  if (requireString(preflight.release_effect, 'preflight.release_effect') !== 'none') {
    throw new Error('preflight.release_effect mismatch');
  }
  if (requireString(preflight.attempt_id, 'preflight.attempt_id') !== TASK10_AUTHORITY.attemptId) {
    reasons.push('preflight attempt id mismatch');
  }

  const repoIdentity = requireObject(preflight.repo_identity, 'preflight.repo_identity');
  const repos = [
    ['core', TASK10_AUTHORITY.coreRuntimeSha, TASK10_AUTHORITY.lockfileSha256.core, TASK10_AUTHORITY.packageIdentities.core],
    ['client', TASK10_AUTHORITY.clientBaselineSha, TASK10_AUTHORITY.lockfileSha256.client, TASK10_AUTHORITY.packageIdentities.client],
    ['site', TASK10_AUTHORITY.siteBaselineSha, TASK10_AUTHORITY.lockfileSha256.site, TASK10_AUTHORITY.packageIdentities.site],
  ] as const;
  for (const [key, sha, lock, pkg] of repos) {
    const repo = requireObject(repoIdentity[key], `preflight.repo_identity.${key}`);
    if (requireString(repo.repo_name, `preflight.repo_identity.${key}.repo_name`) !== key) {
      reasons.push(`${key} repo name mismatch`);
    }
    if (requireString(repo.full_sha, `preflight.repo_identity.${key}.full_sha`) !== sha) {
      reasons.push(`${key} sha mismatch`);
    }
    if (requireString(repo.branch, `preflight.repo_identity.${key}.branch`) !== 'main') {
      reasons.push(`${key} branch mismatch`);
    }
    if (requireString(repo.upstream_ref, `preflight.repo_identity.${key}.upstream_ref`) !== 'origin/main') {
      reasons.push(`${key} upstream mismatch`);
    }
    if (requireBoolean(repo.tracked_dirty, `preflight.repo_identity.${key}.tracked_dirty`)) {
      reasons.push(`${key} tracked dirty mismatch`);
    }
    if (requireBoolean(repo.untracked_dirty, `preflight.repo_identity.${key}.untracked_dirty`)) {
      reasons.push(`${key} untracked dirty mismatch`);
    }
    if (requireBoolean(repo.detached, `preflight.repo_identity.${key}.detached`)) {
      reasons.push(`${key} detached mismatch`);
    }
    if (requireString(repo.lockfile_hash, `preflight.repo_identity.${key}.lockfile_hash`) !== lock) {
      reasons.push(`${key} lockfile mismatch`);
    }
    if (requireString(repo.package_identity, `preflight.repo_identity.${key}.package_identity`) !== pkg) {
      reasons.push(`${key} package identity mismatch`);
    }
    if (requireBoolean(repo.contains_sisyphus_dependency, `preflight.repo_identity.${key}.contains_sisyphus_dependency`)) {
      reasons.push(`${key} sisyphus dependency mismatch`);
    }
  }

  const toolIdentity = requireObject(preflight.tool_identity, 'preflight.tool_identity');
  requireExactKeys(toolIdentity, ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'], 'preflight.tool_identity');
  for (const key of ['node_version', 'npm_version', 'docker_version', 'compose_version', 'postgres_version', 'browser_runner_version'] as const) {
    requireString(toolIdentity[key], `preflight.tool_identity.${key}`);
  }

  const runtimeIdentity = requireObject(preflight.runtime_identity, 'preflight.runtime_identity');
  requirePrefixedSha256(runtimeIdentity.core_image_digest, 'preflight.runtime_identity.core_image_digest');
  requireString(runtimeIdentity.build_context_ref, 'preflight.runtime_identity.build_context_ref');
  if (requireString(runtimeIdentity.source_marker, 'preflight.runtime_identity.source_marker') !== TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker) {
    reasons.push('source marker mismatch');
  }
  if (requireString(runtimeIdentity.runtime_marker, 'preflight.runtime_identity.runtime_marker') !== TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker) {
    reasons.push('runtime marker mismatch');
  }
  if (requireString(runtimeIdentity.bootstrap_marker, 'preflight.runtime_identity.bootstrap_marker') !== TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker) {
    reasons.push('bootstrap marker mismatch');
  }
  if (requireString(runtimeIdentity.scenario_marker, 'preflight.runtime_identity.scenario_marker') !== TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker) {
    reasons.push('scenario marker mismatch');
  }
  if (requireString(runtimeIdentity.client_package_identity, 'preflight.runtime_identity.client_package_identity') !== TASK10_AUTHORITY.packageIdentities.client) {
    reasons.push('client package identity mismatch');
  }
  if (requireString(runtimeIdentity.site_build_identity, 'preflight.runtime_identity.site_build_identity') !== TASK10_AUTHORITY.packageIdentities.site) {
    reasons.push('site build identity mismatch');
  }
  if (requireString(runtimeIdentity.provider_fixture_identity, 'preflight.runtime_identity.provider_fixture_identity') !== TASK10_AUTHORITY.providerFixtureIdentity) {
    reasons.push('provider fixture mismatch');
  }
  if (requireString(runtimeIdentity.provider_protocol_version, 'preflight.runtime_identity.provider_protocol_version') !== TASK10_AUTHORITY.providerProtocolVersion) {
    reasons.push('provider protocol mismatch');
  }
  if (requireString(runtimeIdentity.compose_project, 'preflight.runtime_identity.compose_project') !== TASK10_AUTHORITY.composeProject) {
    reasons.push('compose project mismatch');
  }
  if (requireExactStringArray(runtimeIdentity.container_names, TASK10_AUTHORITY.containerNames, 'preflight.runtime_identity.container_names').length !== TASK10_AUTHORITY.containerNames.length) {
    reasons.push('container names mismatch');
  }
  const ports = runtimeIdentity.ports;
  if (!Array.isArray(ports)
    || ports.length !== 4
    || requireInteger(ports[0], 'preflight.runtime_identity.ports[0]') !== TASK10_AUTHORITY.ports.postgres
    || requireInteger(ports[1], 'preflight.runtime_identity.ports[1]') !== TASK10_AUTHORITY.ports.runtime
    || requireInteger(ports[2], 'preflight.runtime_identity.ports[2]') !== TASK10_AUTHORITY.ports.operator
    || requireInteger(ports[3], 'preflight.runtime_identity.ports[3]') !== TASK10_AUTHORITY.ports.fixture) {
    reasons.push('runtime ports mismatch');
  }
  if (requireString(runtimeIdentity.network_identity, 'preflight.runtime_identity.network_identity') !== TASK10_AUTHORITY.networkIdentity) {
    reasons.push('network identity mismatch');
  }

  const resetFreshness = requireObject(preflight.reset_freshness, 'preflight.reset_freshness');
  if (requireString(resetFreshness.reset_state, 'preflight.reset_freshness.reset_state') !== 'passed') {
    reasons.push('reset state mismatch');
  }
  requireString(resetFreshness.reset_detail, 'preflight.reset_freshness.reset_detail');
  if (!requireBoolean(resetFreshness.output_directory_empty, 'preflight.reset_freshness.output_directory_empty')) {
    reasons.push('output directory empty mismatch');
  }
  if (requireBoolean(resetFreshness.output_directory_symlinked, 'preflight.reset_freshness.output_directory_symlinked')) {
    reasons.push('output directory symlink mismatch');
  }
  if (!requireBoolean(resetFreshness.fresh_business_ids, 'preflight.reset_freshness.fresh_business_ids')) {
    reasons.push('fresh business ids mismatch');
  }
  if (!requireBoolean(resetFreshness.schema_columns_complete, 'preflight.reset_freshness.schema_columns_complete')) {
    reasons.push('schema columns mismatch');
  }
  try {
    requireExactStringArray(resetFreshness.selected_reusable_refs, TASK10_AUTHORITY.selectedReusableRefs, 'preflight.reset_freshness.selected_reusable_refs');
    requireExactStringArray(preflight.selected_reusable_refs, TASK10_AUTHORITY.selectedReusableRefs, 'preflight.selected_reusable_refs');
  } catch {
    reasons.push('reusable packet wrapper selected reusable refs mismatch');
  }
}

function validateReusablePacket(
  packet: Record<string, unknown>,
  dependencies: Task10AuthorityVerifierDependencies,
): Task10AuthorityVerificationResult | null {
  requireExactKeys(packet, ['result', 'scope', 'authority_effect', 'release_effect', 'owner', 'recorded_at', 'source_refs', 'artifact_hash', 'proof_class', 'selected_reusable_refs'], 'reusablePacket');
  if (requireString(packet.result, 'reusablePacket.result') !== 'passed') {
    throw new Error('reusablePacket.result mismatch');
  }
  if (requireString(packet.scope, 'reusablePacket.scope') !== 'merged-main-reproducibility-and-acknowledged-handoff') {
    throw new Error('reusablePacket.scope mismatch');
  }
  if (requireString(packet.authority_effect, 'reusablePacket.authority_effect') !== 'none') {
    throw new Error('reusablePacket.authority_effect mismatch');
  }
  if (requireString(packet.release_effect, 'reusablePacket.release_effect') !== 'none') {
    throw new Error('reusablePacket.release_effect mismatch');
  }
  if (requireString(packet.owner, 'reusablePacket.owner') !== 'bidvia-core-implementation-owner') {
    throw new Error('reusablePacket.owner mismatch');
  }
  requireIsoUtcTimestamp(packet.recorded_at, 'reusablePacket.recorded_at');
  if (requireString(packet.proof_class, 'reusablePacket.proof_class') !== 'merged-main-reusable-packet') {
    throw new Error('reusablePacket.proof_class mismatch');
  }
  try {
    requireExactStringArray(packet.source_refs, TASK10_AUTHORITY.reusablePacketSourceRefs, 'reusablePacket.source_refs');
  } catch {
    return { status: 'reportable-blocked', reasons: ['reusable packet wrapper source refs mismatch'] };
  }
  let selectedReusableRefs: string[];
  try {
    selectedReusableRefs = requireExactStringArray(packet.selected_reusable_refs, TASK10_AUTHORITY.selectedReusableRefs, 'reusablePacket.selected_reusable_refs');
  } catch {
    return { status: 'reportable-blocked', reasons: ['reusable packet wrapper selected reusable refs mismatch'] };
  }
  const artifactHash = requireSha256(packet.artifact_hash, 'reusablePacket.artifact_hash');
  if (artifactHash !== TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256) {
    return { status: 'reportable-blocked', reasons: ['reusable packet wrapper embedded artifact hash mismatch'] };
  }
  let computedHash: string;
  try {
    computedHash = dependencies.hashBytes(new TextEncoder().encode(JSON.stringify({ selected_reusable_refs: selectedReusableRefs })));
  } catch {
    return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
  }
  if (computedHash !== TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256) {
    return { status: 'reportable-blocked', reasons: ['reusable packet wrapper embedded artifact hash mismatch'] };
  }
  return null;
}

function validateExecutionEvidence(evidence: Record<string, unknown>, manifestEntries: ManifestEntry[], reasons: string[]): void {
  if (requireString(evidence.result, 'executionEvidence.result') !== 'passed') {
    reasons.push('execution evidence result mismatch');
  }
  if (requireString(evidence.scope, 'executionEvidence.scope') !== 'merged-main-reproducibility-and-acknowledged-handoff') {
    reasons.push('execution evidence scope mismatch');
  }
  if (requireString(evidence.authority_effect, 'executionEvidence.authority_effect') !== 'none') {
    reasons.push('execution evidence authority effect mismatch');
  }
  if (requireString(evidence.release_effect, 'executionEvidence.release_effect') !== 'none') {
    reasons.push('execution evidence release effect mismatch');
  }
  if (requireString(evidence.proof_class, 'executionEvidence.proof_class') !== 'merged-main-reproducibility-core-execution-evidence') {
    reasons.push('execution evidence proof class mismatch');
  }
  if (requireString(evidence.attempt_id, 'executionEvidence.attempt_id') !== TASK10_AUTHORITY.attemptId) {
    reasons.push('execution evidence attempt mismatch');
  }
  if (requireString(evidence.preflight_artifact_path, 'executionEvidence.preflight_artifact_path') !== TASK10_AUTHORITY.corePreflightPath) {
    reasons.push('execution evidence preflight path mismatch');
  }
  if (requireSha256(evidence.preflight_artifact_hash, 'executionEvidence.preflight_artifact_hash') !== TASK10_AUTHORITY.corePreflightSha256) {
    reasons.push('execution evidence preflight hash mismatch');
  }
  const frozenIdentity = requireObject(evidence.frozen_identity, 'executionEvidence.frozen_identity');
  if (requireString(frozenIdentity.core_sha, 'executionEvidence.frozen_identity.core_sha') !== TASK10_AUTHORITY.coreRuntimeSha
    || requireString(frozenIdentity.client_sha, 'executionEvidence.frozen_identity.client_sha') !== TASK10_AUTHORITY.clientBaselineSha
    || requireString(frozenIdentity.site_sha, 'executionEvidence.frozen_identity.site_sha') !== TASK10_AUTHORITY.siteBaselineSha
    || requireString(frozenIdentity.source_marker, 'executionEvidence.frozen_identity.source_marker') !== TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker
    || requireString(frozenIdentity.runtime_marker, 'executionEvidence.frozen_identity.runtime_marker') !== TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker
    || requireString(frozenIdentity.bootstrap_marker, 'executionEvidence.frozen_identity.bootstrap_marker') !== TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker
    || requireString(frozenIdentity.scenario_marker, 'executionEvidence.frozen_identity.scenario_marker') !== TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker
    || requireString(frozenIdentity.provider_fixture_identity, 'executionEvidence.frozen_identity.provider_fixture_identity') !== TASK10_AUTHORITY.providerFixtureIdentity) {
    reasons.push('execution evidence frozen identity mismatch');
  }
  const manifestByPath = new Map(manifestEntries.map((entry) => [entry.path, entry]));
  const secretScanResult = requireObject(evidence.secret_scan_result, 'executionEvidence.secret_scan_result');
  if (requireString(secretScanResult.status, 'executionEvidence.secret_scan_result.status') !== 'passed') {
    reasons.push('execution evidence secret scan status mismatch');
  }
  if (requireInteger(secretScanResult.finding_count, 'executionEvidence.secret_scan_result.finding_count') !== 0) {
    reasons.push('execution evidence secret scan finding count mismatch');
  }
  const scannedArtifactHashes = requireStringArray(secretScanResult.scanned_artifact_hashes, 'executionEvidence.secret_scan_result.scanned_artifact_hashes');
  const expectedScannedArtifactHashes = [
    TASK10_AUTHORITY.corePreflightSha256,
    manifestByPath.get('docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-001/materialize-output/materialized-run.json')?.sha256,
    manifestByPath.get('docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/recovery-001/materialize-output/materialized-run.json')?.sha256,
    manifestByPath.get('docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-002-reuse/materialize-output/materialized-run.json')?.sha256,
  ];
  if (scannedArtifactHashes.length !== expectedScannedArtifactHashes.length
    || scannedArtifactHashes.some((entry, index) => entry !== expectedScannedArtifactHashes[index])) {
    reasons.push('execution evidence secret scan scanned artifact hashes mismatch');
  }
  if (requireBoolean(evidence.mutable_evidence, 'executionEvidence.mutable_evidence') !== false) {
    reasons.push('execution evidence mutable evidence mismatch');
  }

  if (!Array.isArray(evidence.run_artifacts) || evidence.run_artifacts.length !== 3) {
    reasons.push('execution evidence run artifact count mismatch');
    return;
  }
  const expectedByMode = new Map<string, string>([
    ['success-001', 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-001/materialize-output/materialized-run.json'],
    ['recovery-001', 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/recovery-001/materialize-output/materialized-run.json'],
    ['success-002-reuse', 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-002-reuse/materialize-output/materialized-run.json'],
  ]);
  const seenModes = new Set<string>();
  for (const artifact of evidence.run_artifacts) {
    const record = requireObject(artifact, 'executionEvidence.run_artifacts[]');
    const mode = requireString(record.mode, 'executionEvidence.run_artifacts[].mode');
    if (seenModes.has(mode)) {
      reasons.push('execution evidence duplicate mode mismatch');
      continue;
    }
    seenModes.add(mode);
    const expectedPath = expectedByMode.get(mode);
    if (!expectedPath) {
      reasons.push('execution evidence run artifact count mismatch');
      continue;
    }
    const actualPath = requireString(record.artifact_path, `executionEvidence.${mode}.artifact_path`);
    const actualHash = requireSha256(record.artifact_hash, `executionEvidence.${mode}.artifact_hash`);
    const manifestEntry = manifestByPath.get(expectedPath);
    if (actualPath !== expectedPath) {
      reasons.push(`execution evidence ${mode} path mismatch`);
      continue;
    }
    if (!manifestEntry || actualHash !== manifestEntry.sha256) {
      reasons.push(`execution evidence ${mode} hash mismatch`);
    }
  }
  if (seenModes.size !== expectedByMode.size) {
    reasons.push('execution evidence run artifact count mismatch');
  }
}

export function verifyTask10Authority(
  input: VerifyTask10AuthorityInput,
  dependencies: Task10AuthorityVerifierDependencies,
): Task10AuthorityVerificationResult {
  const reasons: string[] = [];

  const inspections: Task10CheckoutInspection[] = [];
  for (const rootPath of [
    input.checkoutRoots.coreRuntimeRoot,
    input.checkoutRoots.clientValidationRoot,
    input.checkoutRoots.siteValidationRoot,
    input.checkoutRoots.coreEvidenceRoot,
  ]) {
    try {
      inspections.push(dependencies.inspectCheckout(rootPath));
    } catch (error) {
      if (isExpectedInspectionFailure(error)) {
        return { status: 'reportable-blocked', reasons: ['checkout inspection is missing or unreadable'] };
      }
      return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
    }
  }

  validateRootTopology(inspections, reasons);
  validateProducerRoot('core runtime root', inspections[0]!, TASK10_AUTHORITY.coreRuntimeSha, TASK10_AUTHORITY.lockfileSha256.core, reasons);
  validateProducerRoot('client validation root', inspections[1]!, TASK10_AUTHORITY.clientBaselineSha, TASK10_AUTHORITY.lockfileSha256.client, reasons);
  validateProducerRoot('site validation root', inspections[2]!, TASK10_AUTHORITY.siteBaselineSha, TASK10_AUTHORITY.lockfileSha256.site, reasons);
  validateEvidenceRoot(inspections[3]!, reasons);

  if (input.bundleRepoPath !== TASK10_AUTHORITY.coreExecutionEvidencePath) {
    reasons.push('bundle repo path mismatch');
  }

  const evidenceRootPath = input.checkoutRoots.coreEvidenceRoot;
  const evidenceRootRealPath = inspections[3]!.realPath;
  const authorityFiles = [
    [TASK10_AUTHORITY.coreExecutionEvidencePath, 'core execution evidence', TASK10_AUTHORITY.coreExecutionEvidenceSha256],
    [TASK10_AUTHORITY.bundleManifestPath, 'bundle manifest', TASK10_AUTHORITY.bundleManifestSha256],
    [TASK10_AUTHORITY.corePreflightPath, 'preflight artifact', TASK10_AUTHORITY.corePreflightSha256],
    [TASK10_AUTHORITY.reusablePacketWrapperPath, 'reusable packet wrapper', TASK10_AUTHORITY.reusablePacketWrapperSha256],
    [TASK10_AUTHORITY.selectedSourcePacketPath, 'selected source packet', TASK10_AUTHORITY.selectedSourcePacketSha256],
  ] as const;

  const evidenceFiles = new Map<string, Task10EvidenceFile>();
  for (const [relativePath, label, expectedHash] of authorityFiles) {
    const absolutePath = safeResolve(evidenceRootPath, relativePath);
    if (!absolutePath) {
      return { status: 'reportable-blocked', reasons: [...reasons, 'frozen authority path escaped core evidence root'] };
    }
    const readResult = readEvidenceFile(absolutePath, label, evidenceRootRealPath, dependencies);
    if (readResult.status) {
      return { status: readResult.status.status, reasons: [...reasons, ...readResult.status.reasons] };
    }
    let digest: string;
    try {
      digest = dependencies.hashBytes(readResult.evidenceFile.bytes);
    } catch {
      return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
    }
    if (digest !== expectedHash) {
      return { status: 'reportable-blocked', reasons: [...reasons, `${label} sha256 mismatch`] };
    }
    evidenceFiles.set(relativePath, readResult.evidenceFile);
  }

  let executionEvidence: Record<string, unknown>;
  let manifest: Record<string, unknown>;
  let preflight: Record<string, unknown>;
  let reusablePacket: Record<string, unknown>;
  try {
    executionEvidence = parseJson(evidenceFiles.get(TASK10_AUTHORITY.coreExecutionEvidencePath)!.bytes, 'executionEvidence');
    manifest = parseJson(evidenceFiles.get(TASK10_AUTHORITY.bundleManifestPath)!.bytes, 'manifest');
    preflight = parseJson(evidenceFiles.get(TASK10_AUTHORITY.corePreflightPath)!.bytes, 'preflight');
    reusablePacket = parseJson(evidenceFiles.get(TASK10_AUTHORITY.reusablePacketWrapperPath)!.bytes, 'reusablePacket');
  } catch {
    return { status: 'reportable-blocked', reasons: [...reasons, 'authority evidence JSON is malformed'] };
  }

  let manifestEntries: ManifestEntry[];
  try {
    manifestEntries = parseManifestEntries(manifest);
  } catch (error) {
    return {
      status: 'reportable-blocked',
      reasons: [...reasons, `authority evidence is malformed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  try {
    validatePreflight(preflight, reasons);
  } catch (error) {
    return {
      status: 'reportable-blocked',
      reasons: [...reasons, `authority evidence is malformed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  let reusablePacketValidation: Task10AuthorityVerificationResult | null;
  try {
    reusablePacketValidation = validateReusablePacket(reusablePacket, dependencies);
  } catch (error) {
    return {
      status: 'reportable-blocked',
      reasons: [...reasons, `authority evidence is malformed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  if (reusablePacketValidation) {
    return { status: reusablePacketValidation.status, reasons: [...reasons, ...reusablePacketValidation.reasons] };
  }

  try {
    validateExecutionEvidence(executionEvidence, manifestEntries, reasons);
  } catch (error) {
    return {
      status: 'reportable-blocked',
      reasons: [...reasons, `authority evidence is malformed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const manifestValidation = validateManifestEntries(evidenceRootPath, evidenceRootRealPath, manifestEntries, dependencies);
  if (manifestValidation) {
    return { status: manifestValidation.status, reasons: [...reasons, ...manifestValidation.reasons] };
  }

  let archiveBytes: Uint8Array;
  try {
    archiveBytes = dependencies.recreateArchive({
      evidenceRootPath,
      recipe: TASK10_AUTHORITY.coreArchiveRecipe,
      prefix: TASK10_AUTHORITY.coreArchivePrefix,
    });
  } catch {
    return { status: 'tooling-failure', reasons: ['unable to recreate core archive bytes'] };
  }

  let archiveHash: string;
  try {
    archiveHash = dependencies.hashBytes(archiveBytes);
  } catch {
    return { status: 'tooling-failure', reasons: ['unable to hash recreated core archive bytes'] };
  }
  if (archiveHash !== TASK10_AUTHORITY.coreArchiveSha256) {
    return { status: 'reportable-blocked', reasons: [...reasons, 'recreated core archive sha256 mismatch'] };
  }

  return reasons.length === 0
    ? { status: 'verified', reasons: [] }
    : { status: 'reportable-blocked', reasons };
}
