import test from 'node:test';
import assert from 'node:assert/strict';
import { TextEncoder } from 'node:util';

import {
  TASK10_AUTHORITY,
  type Task10AuthorityVerifierDependencies,
  type Task10CheckoutInspection,
  type Task10EvidenceFile,
  type VerifyTask10AuthorityInput,
  Task10ExpectedCheckoutInspectionError,
  Task10ExpectedEvidenceAccessError,
  verifyTask10Authority,
} from '../scripts/task10/authority.ts';

const encoder = new TextEncoder();
const SHARED_SCOPE = 'merged-main-reproducibility-and-acknowledged-handoff';
const SHARED_OWNER = 'bidvia-core-implementation-owner';
const SHARED_RECORDED_AT = '2026-07-19T16:00:00.000Z';
const MATERIALIZED_RUNS = [
  {
    mode: 'success-001',
    path: 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-001/materialize-output/materialized-run.json',
    sha256: `8796fdf${'1'.repeat(57)}`,
  },
  {
    mode: 'recovery-001',
    path: 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/recovery-001/materialize-output/materialized-run.json',
    sha256: `d187d71${'2'.repeat(57)}`,
  },
  {
    mode: 'success-002-reuse',
    path: 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-002-reuse/materialize-output/materialized-run.json',
    sha256: `24d04b8${'3'.repeat(57)}`,
  },
] as const;

interface ManifestEntryFixture {
  path: string;
  sha256: string;
  bytes: Uint8Array;
}

function buildManifestEntries(): ManifestEntryFixture[] {
  const staticEntries = [
    TASK10_AUTHORITY.coreExecutionEvidencePath,
    TASK10_AUTHORITY.corePreflightPath,
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/runtime-evidence.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/reset-evidence.json',
    TASK10_AUTHORITY.reusablePacketWrapperPath,
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/success-001/execution-input.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/recovery-001/execution-input.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/success-002-reuse/execution-input.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-001/readback.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/recovery-001/readback.json',
    'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/success-002-reuse/readback.json',
  ];
  const entries = [
    ...staticEntries,
    ...MATERIALIZED_RUNS.map((entry) => entry.path),
  ];
  return entries.map((entryPath, index) => ({
    path: entryPath,
    sha256: `${String(index + 1).padStart(2, '0')}`.repeat(32),
    bytes: encoder.encode(`fixture:${index}:${entryPath}`),
  }));
}

function buildManifestJson(entries: ManifestEntryFixture[]) {
  return {
    files: entries.map((entry) => ({
      path: entry.path,
      sha256: entry.sha256,
      bytes: entry.bytes.byteLength,
    })),
  };
}

function buildExecutionEvidenceJson() {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    proof_class: 'merged-main-reproducibility-core-execution-evidence',
    attempt_id: TASK10_AUTHORITY.attemptId,
    preflight_artifact_path: TASK10_AUTHORITY.corePreflightPath,
    preflight_artifact_hash: TASK10_AUTHORITY.corePreflightSha256,
    frozen_identity: {
      core_sha: TASK10_AUTHORITY.coreRuntimeSha,
      client_sha: TASK10_AUTHORITY.clientBaselineSha,
      site_sha: TASK10_AUTHORITY.siteBaselineSha,
      source_marker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      runtime_marker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrap_marker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      scenario_marker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      provider_fixture_identity: TASK10_AUTHORITY.providerFixtureIdentity,
    },
    run_artifacts: MATERIALIZED_RUNS.map((entry) => ({
      mode: entry.mode,
      artifact_path: entry.path,
      artifact_hash: entry.sha256,
    })),
    secret_scan_result: {
      status: 'passed',
      finding_count: 0,
      scanned_artifact_hashes: [
        TASK10_AUTHORITY.corePreflightSha256,
        MATERIALIZED_RUNS[0].sha256,
        MATERIALIZED_RUNS[1].sha256,
        MATERIALIZED_RUNS[2].sha256,
      ],
    },
    mutable_evidence: false,
    core_conclusion: 'passed',
  };
}

function buildPreflightJson() {
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
        lockfile_hash: TASK10_AUTHORITY.lockfileSha256.core,
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
        lockfile_hash: TASK10_AUTHORITY.lockfileSha256.client,
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
        lockfile_hash: TASK10_AUTHORITY.lockfileSha256.site,
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
      compose_project: TASK10_AUTHORITY.composeProject,
      container_names: [...TASK10_AUTHORITY.containerNames],
      ports: [
        TASK10_AUTHORITY.ports.postgres,
        TASK10_AUTHORITY.ports.runtime,
        TASK10_AUTHORITY.ports.operator,
        TASK10_AUTHORITY.ports.fixture,
      ],
      network_identity: TASK10_AUTHORITY.networkIdentity,
    },
    reset_freshness: {
      reset_state: 'passed',
      reset_detail: 'fresh reset complete',
      output_directory_empty: true,
      output_directory_symlinked: false,
      fresh_business_ids: true,
      selected_reusable_refs: [...TASK10_AUTHORITY.selectedReusableRefs],
      schema_columns_complete: true,
    },
    selected_reusable_refs: [...TASK10_AUTHORITY.selectedReusableRefs],
  };
}

function buildReusablePacketJson() {
  return {
    result: 'passed',
    scope: SHARED_SCOPE,
    authority_effect: 'none',
    release_effect: 'none',
    owner: SHARED_OWNER,
    recorded_at: SHARED_RECORDED_AT,
    source_refs: [...TASK10_AUTHORITY.reusablePacketSourceRefs],
    artifact_hash: TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256,
    proof_class: 'merged-main-reusable-packet',
    selected_reusable_refs: [...TASK10_AUTHORITY.selectedReusableRefs],
  };
}

function createAuthorityFixture(options: {
  mutateManifestEntries?: (entries: ManifestEntryFixture[]) => ManifestEntryFixture[];
  mutateExecutionEvidence?: (value: Record<string, unknown>) => Record<string, unknown>;
  mutatePreflight?: (value: Record<string, unknown>) => Record<string, unknown>;
  mutateReusablePacket?: (value: Record<string, unknown>) => Record<string, unknown>;
  deleteFilePath?: string;
  overrideHash?: Record<string, string>;
  archiveHash?: string;
  mutateInspection?: (roots: Record<string, Task10CheckoutInspection>) => void;
  inspectFailure?: { rootPath: string; error: Error };
  evidenceAccessFailure?: { filePath: string; error: Error };
  overrideEvidenceFile?: Record<string, Task10EvidenceFile>;
} = {}): {
  input: VerifyTask10AuthorityInput;
  dependencies: Task10AuthorityVerifierDependencies;
} {
  const coreEvidenceRoot = '/roots/core-evidence';
  const coreRuntimeRoot = '/roots/core-runtime';
  const clientValidationRoot = '/roots/client-validation';
  const siteValidationRoot = '/roots/site-validation';

  const manifestPath = `${coreEvidenceRoot}/${TASK10_AUTHORITY.bundleManifestPath}`;
  const selectedPacketPath = `${coreEvidenceRoot}/${TASK10_AUTHORITY.selectedSourcePacketPath}`;

  const manifestEntries = options.mutateManifestEntries
    ? options.mutateManifestEntries(buildManifestEntries())
    : buildManifestEntries();
  const executionEvidence = options.mutateExecutionEvidence
    ? options.mutateExecutionEvidence(buildExecutionEvidenceJson() as Record<string, unknown>)
    : buildExecutionEvidenceJson();
  const preflight = options.mutatePreflight
    ? options.mutatePreflight(buildPreflightJson() as Record<string, unknown>)
    : buildPreflightJson();
  const reusablePacket = options.mutateReusablePacket
    ? options.mutateReusablePacket(buildReusablePacketJson() as Record<string, unknown>)
    : buildReusablePacketJson();

  const executionEvidenceBytes = encoder.encode(JSON.stringify(executionEvidence));
  const preflightBytes = encoder.encode(JSON.stringify(preflight));
  const reusablePacketBytes = encoder.encode(JSON.stringify(reusablePacket));
  const selectedPacketBytes = encoder.encode(JSON.stringify({ selected: true }));
  const manifestEntriesWithSpecialFiles = manifestEntries.map((entry) => {
    if (entry.path === TASK10_AUTHORITY.coreExecutionEvidencePath) {
      return { ...entry, sha256: TASK10_AUTHORITY.coreExecutionEvidenceSha256, bytes: executionEvidenceBytes };
    }
    if (entry.path === TASK10_AUTHORITY.corePreflightPath) {
      return { ...entry, sha256: TASK10_AUTHORITY.corePreflightSha256, bytes: preflightBytes };
    }
    if (entry.path === TASK10_AUTHORITY.reusablePacketWrapperPath) {
      return { ...entry, sha256: TASK10_AUTHORITY.reusablePacketWrapperSha256, bytes: reusablePacketBytes };
    }
    if (entry.path === TASK10_AUTHORITY.selectedSourcePacketPath) {
      return { ...entry, sha256: TASK10_AUTHORITY.selectedSourcePacketSha256, bytes: selectedPacketBytes };
    }
    const runArtifact = MATERIALIZED_RUNS.find((candidate) => candidate.path === entry.path);
    return runArtifact ? { ...entry, sha256: runArtifact.sha256 } : entry;
  });
  const manifest = buildManifestJson(manifestEntriesWithSpecialFiles);
  const manifestBytes = encoder.encode(JSON.stringify(manifest));
  const archiveBytes = encoder.encode('archive:attempt-007');

  const files = new Map<string, Uint8Array>();
  const hashByPath = new Map<string, string>();
  const hashByText = new Map<string, string>();

  for (const entry of manifestEntriesWithSpecialFiles) {
    const filePath = `${coreEvidenceRoot}/${entry.path}`;
    files.set(filePath, entry.bytes);
    hashByPath.set(filePath, entry.sha256);
    hashByText.set(new TextDecoder().decode(entry.bytes), entry.sha256);
  }

  files.set(manifestPath, manifestBytes);
  files.set(selectedPacketPath, selectedPacketBytes);
  hashByPath.set(manifestPath, TASK10_AUTHORITY.bundleManifestSha256);
  hashByPath.set(selectedPacketPath, TASK10_AUTHORITY.selectedSourcePacketSha256);
  hashByText.set(new TextDecoder().decode(manifestBytes), TASK10_AUTHORITY.bundleManifestSha256);
  hashByText.set(new TextDecoder().decode(selectedPacketBytes), TASK10_AUTHORITY.selectedSourcePacketSha256);
  hashByText.set(JSON.stringify({ selected_reusable_refs: TASK10_AUTHORITY.selectedReusableRefs }), TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256);

  if (options.overrideHash) {
    for (const [filePath, hash] of Object.entries(options.overrideHash)) {
      hashByPath.set(filePath, hash);
      const bytes = files.get(filePath);
      if (bytes) {
        hashByText.set(new TextDecoder().decode(bytes), hash);
      }
    }
  }
  if (options.deleteFilePath) {
    files.delete(options.deleteFilePath);
  }

  const roots: Record<string, Task10CheckoutInspection> = {
    [coreRuntimeRoot]: {
      headCommit: TASK10_AUTHORITY.coreRuntimeSha,
      branch: 'main',
      upstreamRef: 'origin/main',
      detachedHead: false,
      porcelainStatus: 'empty',
      lockfileSha256: TASK10_AUTHORITY.lockfileSha256.core,
      realPath: '/real/core-runtime',
      symlinked: false,
    },
    [clientValidationRoot]: {
      headCommit: TASK10_AUTHORITY.clientBaselineSha,
      branch: 'main',
      upstreamRef: 'origin/main',
      detachedHead: false,
      porcelainStatus: 'empty',
      lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
      realPath: '/real/client-validation',
      symlinked: false,
    },
    [siteValidationRoot]: {
      headCommit: TASK10_AUTHORITY.siteBaselineSha,
      branch: 'main',
      upstreamRef: 'origin/main',
      detachedHead: false,
      porcelainStatus: 'empty',
      lockfileSha256: TASK10_AUTHORITY.lockfileSha256.site,
      realPath: '/real/site-validation',
      symlinked: false,
    },
    [coreEvidenceRoot]: {
      headCommit: TASK10_AUTHORITY.coreEvidenceCommit,
      branch: null,
      upstreamRef: null,
      detachedHead: true,
      porcelainStatus: 'empty',
      lockfileSha256: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      realPath: '/real/core-evidence',
      symlinked: false,
    },
  };
  options.mutateInspection?.(roots);

  const dependencies: Task10AuthorityVerifierDependencies = {
    hashBytes(bytes) {
      if (bytes === archiveBytes) {
        return options.archiveHash ?? TASK10_AUTHORITY.coreArchiveSha256;
      }
      return hashByText.get(new TextDecoder().decode(bytes)) ?? 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    },
    inspectCheckout(rootPath) {
      if (options.inspectFailure?.rootPath === rootPath) {
        throw options.inspectFailure.error;
      }
      const inspection = roots[rootPath];
      if (!inspection) {
        throw new Error(`NO_ROOT:${rootPath}`);
      }
      return inspection;
    },
    readEvidenceFile(filePath) {
      if (options.evidenceAccessFailure?.filePath === filePath) {
        throw options.evidenceAccessFailure.error;
      }
      const override = options.overrideEvidenceFile?.[filePath];
      if (override) {
        return override;
      }
      const bytes = files.get(filePath);
      if (!bytes) {
        throw new Task10ExpectedEvidenceAccessError('missing');
      }
      return {
        realPath: filePath.replace('/roots/core-evidence/', '/real/core-evidence/'),
        symlinked: false,
        sizeBytes: bytes.byteLength,
        bytes,
      };
    },
    recreateArchive(request) {
      assert.equal(request.evidenceRootPath, coreEvidenceRoot);
      assert.equal(request.recipe, TASK10_AUTHORITY.coreArchiveRecipe);
      assert.equal(request.prefix, TASK10_AUTHORITY.coreArchivePrefix);
      return archiveBytes;
    },
  };

  return {
    input: {
      checkoutRoots: {
        coreRuntimeRoot,
        clientValidationRoot,
        siteValidationRoot,
        coreEvidenceRoot,
      },
      bundleRepoPath: TASK10_AUTHORITY.coreExecutionEvidencePath,
    },
    dependencies,
  };
}

test('verifyTask10Authority verifies the real attempt-007 manifest files array, reusable wrapper, execution evidence array bindings, preflight facts, and recreated archive', () => {
  const recoveryBytes = encoder.encode('atomic-recovery-001');
  const fixture = createAuthorityFixture({
    mutateManifestEntries(entries) {
      return entries.map((entry) => entry.path === MATERIALIZED_RUNS[1].path
        ? { ...entry, sha256: MATERIALIZED_RUNS[1].sha256, bytes: recoveryBytes }
        : entry);
    },
    overrideEvidenceFile: {
      [`/roots/core-evidence/${MATERIALIZED_RUNS[1].path}`]: {
        realPath: `/real/core-evidence/${MATERIALIZED_RUNS[1].path}`,
        symlinked: false,
        sizeBytes: recoveryBytes.byteLength,
        bytes: recoveryBytes,
      },
    },
  });
  assert.deepEqual(verifyTask10Authority(fixture.input, fixture.dependencies), {
    status: 'verified',
    reasons: [],
  });
});

test('verifyTask10Authority fails closed for uppercase manifest sha, malformed shapes, missing files, unsafe paths, outside real paths, symlinked files, mismatches, and archive mismatch', () => {
  const uppercaseManifestSha = createAuthorityFixture({
    mutateManifestEntries(entries) {
      return entries.map((entry, index) => index === 3
        ? { ...entry, sha256: 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789' }
        : entry);
    },
  });
  assert.equal(verifyTask10Authority(uppercaseManifestSha.input, uppercaseManifestSha.dependencies).status, 'reportable-blocked');

  const missingManifestEntryFile = createAuthorityFixture({
    deleteFilePath: `/roots/core-evidence/${MATERIALIZED_RUNS[0].path}`,
  });
  assert.equal(verifyTask10Authority(missingManifestEntryFile.input, missingManifestEntryFile.dependencies).status, 'reportable-blocked');

  const unsafeManifestPath = createAuthorityFixture({
    mutateManifestEntries(entries) {
      const [first, ...rest] = entries;
      return [{ ...first!, path: '../escape.json' }, ...rest];
    },
  });
  assert.equal(verifyTask10Authority(unsafeManifestPath.input, unsafeManifestPath.dependencies).status, 'reportable-blocked');

  const internalTraversalManifestPath = createAuthorityFixture({
    mutateManifestEntries(entries) {
      return entries.map((entry, index) => index === 2 ? { ...entry, path: 'some-dir/../artifact.json' } : entry);
    },
  });
  assert.equal(verifyTask10Authority(internalTraversalManifestPath.input, internalTraversalManifestPath.dependencies).status, 'reportable-blocked');

  const outsideRealPath = createAuthorityFixture({
    overrideEvidenceFile: {
      [`/roots/core-evidence/${MATERIALIZED_RUNS[0].path}`]: {
        realPath: '/outside/materialized-run.json',
        symlinked: false,
        sizeBytes: encoder.encode('outside-success').byteLength,
        bytes: encoder.encode('outside-success'),
      },
    },
  });
  assert.equal(verifyTask10Authority(outsideRealPath.input, outsideRealPath.dependencies).status, 'reportable-blocked');

  const symlinkedManifestEntry = createAuthorityFixture({
    overrideEvidenceFile: {
      [`/roots/core-evidence/${MATERIALIZED_RUNS[2].path}`]: {
        realPath: `/real/core-evidence/${MATERIALIZED_RUNS[2].path}`,
        symlinked: true,
        sizeBytes: encoder.encode('symlinked-reuse').byteLength,
        bytes: encoder.encode('symlinked-reuse'),
      },
    },
  });
  assert.equal(verifyTask10Authority(symlinkedManifestEntry.input, symlinkedManifestEntry.dependencies).status, 'reportable-blocked');

  const wrapperEmbeddedHashMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return {
        ...value,
        artifact_hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      };
    },
  });
  assert.equal(verifyTask10Authority(wrapperEmbeddedHashMismatch.input, wrapperEmbeddedHashMismatch.dependencies).status, 'reportable-blocked');

  const wrapperResultMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, result: 'blocked' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperResultMismatch.input, wrapperResultMismatch.dependencies).status, 'reportable-blocked');

  const wrapperScopeMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, scope: 'wrong-scope' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperScopeMismatch.input, wrapperScopeMismatch.dependencies).status, 'reportable-blocked');

  const wrapperAuthorityEffectMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, authority_effect: 'frozen-authority' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperAuthorityEffectMismatch.input, wrapperAuthorityEffectMismatch.dependencies).status, 'reportable-blocked');

  const wrapperReleaseEffectMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, release_effect: 'published' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperReleaseEffectMismatch.input, wrapperAuthorityEffectMismatch.dependencies).status, 'reportable-blocked');

  const wrapperOwnerMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, owner: 'wrong-owner' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperOwnerMismatch.input, wrapperOwnerMismatch.dependencies).status, 'reportable-blocked');

  const wrapperRecordedAtMalformed = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, recorded_at: 'not-a-timestamp' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperRecordedAtMalformed.input, wrapperRecordedAtMalformed.dependencies).status, 'reportable-blocked');

  const wrapperProofClassMismatch = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, proof_class: 'wrong-proof-class' };
    },
  });
  assert.equal(verifyTask10Authority(wrapperProofClassMismatch.input, wrapperProofClassMismatch.dependencies).status, 'reportable-blocked');

  const missingWrapperArtifactHash = createAuthorityFixture({
    mutateReusablePacket(value) {
      const next = { ...value };
      delete next.artifact_hash;
      return next;
    },
  });
  assert.equal(verifyTask10Authority(missingWrapperArtifactHash.input, missingWrapperArtifactHash.dependencies).status, 'reportable-blocked');

  const nullWrapperArtifactHash = createAuthorityFixture({
    mutateReusablePacket(value) {
      return {
        ...value,
        artifact_hash: null,
      };
    },
  });
  assert.equal(verifyTask10Authority(nullWrapperArtifactHash.input, nullWrapperArtifactHash.dependencies).status, 'reportable-blocked');

  const uppercaseWrapperArtifactHash = createAuthorityFixture({
    mutateReusablePacket(value) {
      return {
        ...value,
        artifact_hash: TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256.toUpperCase(),
      };
    },
  });
  assert.equal(verifyTask10Authority(uppercaseWrapperArtifactHash.input, uppercaseWrapperArtifactHash.dependencies).status, 'reportable-blocked');

  const missingWrapperKey = createAuthorityFixture({
    mutateReusablePacket(value) {
      const next = { ...value };
      delete next.owner;
      return next;
    },
  });
  assert.equal(verifyTask10Authority(missingWrapperKey.input, missingWrapperKey.dependencies).status, 'reportable-blocked');

  const extraWrapperKey = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, extra_key: true };
    },
  });
  assert.equal(verifyTask10Authority(extraWrapperKey.input, extraWrapperKey.dependencies).status, 'reportable-blocked');

  const executionEvidenceMismatch = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      return {
        ...value,
        run_artifacts: [
          ...(value.run_artifacts as unknown[]).slice(0, 2),
          {
            mode: 'success-002-reuse',
            artifact_path: MATERIALIZED_RUNS[2].path,
            artifact_hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          },
        ],
      };
    },
  });
  assert.equal(verifyTask10Authority(executionEvidenceMismatch.input, executionEvidenceMismatch.dependencies).status, 'reportable-blocked');

  const duplicateRunArtifactMode = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      const runArtifacts = value.run_artifacts as Array<Record<string, unknown>>;
      return {
        ...value,
        run_artifacts: [
          runArtifacts[0],
          runArtifacts[1],
          {
            ...runArtifacts[0],
          },
        ],
      };
    },
  });
  assert.equal(verifyTask10Authority(duplicateRunArtifactMode.input, duplicateRunArtifactMode.dependencies).status, 'reportable-blocked');

  const missingRunArtifactMode = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      const runArtifacts = value.run_artifacts as Array<Record<string, unknown>>;
      return {
        ...value,
        run_artifacts: runArtifacts.slice(0, 2),
      };
    },
  });
  assert.equal(verifyTask10Authority(missingRunArtifactMode.input, missingRunArtifactMode.dependencies).status, 'reportable-blocked');

  const extraRunArtifactMode = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      const runArtifacts = value.run_artifacts as Array<Record<string, unknown>>;
      return {
        ...value,
        run_artifacts: [
          ...runArtifacts,
          {
            mode: 'unexpected-mode',
            artifact_path: 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/unexpected/materialize-output/materialized-run.json',
            artifact_hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          },
        ],
      };
    },
  });
  assert.equal(verifyTask10Authority(extraRunArtifactMode.input, extraRunArtifactMode.dependencies).status, 'reportable-blocked');

  const wrongPreflightPathBinding = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      return {
        ...value,
        preflight_artifact_path: 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/not-preflight.json',
      };
    },
  });
  assert.equal(verifyTask10Authority(wrongPreflightPathBinding.input, wrongPreflightPathBinding.dependencies).status, 'reportable-blocked');

  const wrongPreflightHashBinding = createAuthorityFixture({
    mutateExecutionEvidence(value) {
      return {
        ...value,
        preflight_artifact_hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      };
    },
  });
  assert.equal(verifyTask10Authority(wrongPreflightHashBinding.input, wrongPreflightHashBinding.dependencies).status, 'reportable-blocked');

  const invalidCoreImageDigest = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        runtime_identity: {
          ...(value.runtime_identity as Record<string, unknown>),
          core_image_digest: 'SHA256:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(invalidCoreImageDigest.input, invalidCoreImageDigest.dependencies).status, 'reportable-blocked');

  const blankBuildContextRef = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        runtime_identity: {
          ...(value.runtime_identity as Record<string, unknown>),
          build_context_ref: '',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(blankBuildContextRef.input, blankBuildContextRef.dependencies).status, 'reportable-blocked');

  const resetStateMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          reset_state: 'failed',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(resetStateMismatch.input, resetStateMismatch.dependencies).status, 'reportable-blocked');

  const outputDirectoryEmptyMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          output_directory_empty: false,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(outputDirectoryEmptyMismatch.input, outputDirectoryEmptyMismatch.dependencies).status, 'reportable-blocked');

  const outputDirectorySymlinkMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          output_directory_symlinked: true,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(outputDirectorySymlinkMismatch.input, outputDirectorySymlinkMismatch.dependencies).status, 'reportable-blocked');

  const freshBusinessIdsMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          fresh_business_ids: false,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(freshBusinessIdsMismatch.input, freshBusinessIdsMismatch.dependencies).status, 'reportable-blocked');

  const schemaColumnsMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          schema_columns_complete: false,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(schemaColumnsMismatch.input, schemaColumnsMismatch.dependencies).status, 'reportable-blocked');

  const preflightSelectedRefsMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        reset_freshness: {
          ...(value.reset_freshness as Record<string, unknown>),
          selected_reusable_refs: ['business-method-atom:wrong'],
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(preflightSelectedRefsMismatch.input, preflightSelectedRefsMismatch.dependencies).status, 'reportable-blocked');

  const preflightResultMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return { ...value, result: 'blocked' };
    },
  });
  assert.equal(verifyTask10Authority(preflightResultMismatch.input, preflightResultMismatch.dependencies).status, 'reportable-blocked');

  const preflightScopeMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return { ...value, scope: 'wrong-scope' };
    },
  });
  assert.equal(verifyTask10Authority(preflightScopeMismatch.input, preflightScopeMismatch.dependencies).status, 'reportable-blocked');

  const preflightAuthorityEffectMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return { ...value, authority_effect: 'frozen-authority' };
    },
  });
  assert.equal(verifyTask10Authority(preflightAuthorityEffectMismatch.input, preflightAuthorityEffectMismatch.dependencies).status, 'reportable-blocked');

  const preflightReleaseEffectMismatch = createAuthorityFixture({
    mutatePreflight(value) {
      return { ...value, release_effect: 'published' };
    },
  });
  assert.equal(verifyTask10Authority(preflightReleaseEffectMismatch.input, preflightReleaseEffectMismatch.dependencies).status, 'reportable-blocked');

  const missingPreflightTopLevelKey = createAuthorityFixture({
    mutatePreflight(value) {
      const next = { ...value };
      delete next.tool_identity;
      return next;
    },
  });
  assert.equal(verifyTask10Authority(missingPreflightTopLevelKey.input, missingPreflightTopLevelKey.dependencies).status, 'reportable-blocked');

  const extraPreflightTopLevelKey = createAuthorityFixture({
    mutatePreflight(value) {
      return { ...value, extra_top_level: true };
    },
  });
  assert.equal(verifyTask10Authority(extraPreflightTopLevelKey.input, extraPreflightTopLevelKey.dependencies).status, 'reportable-blocked');

  const missingToolIdentityKey = createAuthorityFixture({
    mutatePreflight(value) {
      const toolIdentity = { ...(value.tool_identity as Record<string, unknown>) };
      delete toolIdentity.browser_runner_version;
      return { ...value, tool_identity: toolIdentity };
    },
  });
  assert.equal(verifyTask10Authority(missingToolIdentityKey.input, missingToolIdentityKey.dependencies).status, 'reportable-blocked');

  const extraToolIdentityKey = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        tool_identity: {
          ...(value.tool_identity as Record<string, unknown>),
          extra_version: '1.0.0',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(extraToolIdentityKey.input, extraToolIdentityKey.dependencies).status, 'reportable-blocked');

  const blankToolIdentityValue = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        tool_identity: {
          ...(value.tool_identity as Record<string, unknown>),
          node_version: '',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(blankToolIdentityValue.input, blankToolIdentityValue.dependencies).status, 'reportable-blocked');

  const invalidToolIdentityType = createAuthorityFixture({
    mutatePreflight(value) {
      return {
        ...value,
        tool_identity: {
          ...(value.tool_identity as Record<string, unknown>),
          npm_version: null,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(invalidToolIdentityType.input, invalidToolIdentityType.dependencies).status, 'reportable-blocked');

  const missingWrapperSourceRefs = createAuthorityFixture({
    mutateReusablePacket(value) {
      const next = { ...value };
      delete next.source_refs;
      return next;
    },
  });
  assert.equal(verifyTask10Authority(missingWrapperSourceRefs.input, missingWrapperSourceRefs.dependencies).status, 'reportable-blocked');

  const extraPublishedWrapperKey = createAuthorityFixture({
    mutateReusablePacket(value) {
      return { ...value, owner: 'not-allowed-here' };
    },
  });
  assert.equal(verifyTask10Authority(extraPublishedWrapperKey.input, extraPublishedWrapperKey.dependencies).status, 'reportable-blocked');

  const archiveMismatch = createAuthorityFixture({
    archiveHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  });
  assert.equal(verifyTask10Authority(archiveMismatch.input, archiveMismatch.dependencies).status, 'reportable-blocked');
});

test('verifyTask10Authority classifies expected missing or unreadable evidence access as reportable-blocked and unexpected internal failures as tooling-failure', () => {
  const missingInspection = createAuthorityFixture({
    inspectFailure: {
      rootPath: '/roots/site-validation',
      error: new Task10ExpectedCheckoutInspectionError('missing'),
    },
  });
  assert.equal(verifyTask10Authority(missingInspection.input, missingInspection.dependencies).status, 'reportable-blocked');

  const expectedEvidenceFailure = createAuthorityFixture({
    evidenceAccessFailure: {
      filePath: `/roots/core-evidence/${MATERIALIZED_RUNS[0].path}`,
      error: new Task10ExpectedEvidenceAccessError('unreadable'),
    },
  });
  assert.equal(verifyTask10Authority(expectedEvidenceFailure.input, expectedEvidenceFailure.dependencies).status, 'reportable-blocked');

  const unexpectedEvidenceFailure = createAuthorityFixture({
    evidenceAccessFailure: {
      filePath: `/roots/core-evidence/${MATERIALIZED_RUNS[0].path}`,
      error: new TypeError('boom'),
    },
  });
  assert.deepEqual(verifyTask10Authority(unexpectedEvidenceFailure.input, unexpectedEvidenceFailure.dependencies), {
    status: 'tooling-failure',
    reasons: ['internal authority verification failure'],
  });

  const unexpectedInspectionFailure = createAuthorityFixture({
    inspectFailure: {
      rootPath: '/roots/core-runtime',
      error: new TypeError('boom'),
    },
  });
  assert.deepEqual(verifyTask10Authority(unexpectedInspectionFailure.input, unexpectedInspectionFailure.dependencies), {
    status: 'tooling-failure',
    reasons: ['internal authority verification failure'],
  });
});
