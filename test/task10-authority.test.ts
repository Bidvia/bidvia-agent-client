import test from 'node:test';
import assert from 'node:assert/strict';
import { TextDecoder, TextEncoder } from 'node:util';

import { TASK10_AUTHORITY, verifyTask10Authority } from '../scripts/task10/authority.ts';
import type {
  Task10AuthorityVerifierDependencies,
  Task10CheckoutInspection,
  VerifyTask10AuthorityInput,
} from '../scripts/task10/authority.ts';
import { Task10ExpectedCheckoutInspectionError } from '../scripts/task10/authority.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function buildBundleJson() {
  return {
    result: 'passed',
    scope: 'core-owned-execution-evidence',
    authority_effect: 'authority-only',
    release_effect: 'none',
    proof_class: 'core-execution-evidence',
    attempt_id: TASK10_AUTHORITY.attemptId,
    preflight_artifact_path: TASK10_AUTHORITY.corePreflightPath,
    preflight_artifact_hash: TASK10_AUTHORITY.corePreflightSha256,
    frozen_identity: {
      core_runtime_sha: TASK10_AUTHORITY.coreRuntimeSha,
      client_baseline_sha: TASK10_AUTHORITY.clientBaselineSha,
      site_baseline_sha: TASK10_AUTHORITY.siteBaselineSha,
    },
    run_artifacts: {
      success_001: 'private://not-used',
    },
    secret_scan_result: 'passed',
    mutable_evidence: {
      generated_at: '2026-07-18T17:45:00.000Z',
    },
    core_conclusion: 'passed',
  };
}

function buildPreflightJson(overrides: Record<string, unknown> = {}) {
  const composeProject = `bidvia-task10-${TASK10_AUTHORITY.attemptId}`;
  return {
    result: 'passed',
    scope: 'authority-only',
    authority_effect: 'frozen-authority',
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
      compose_project: composeProject,
      container_names: [
        `${composeProject}-runtime`,
        `${composeProject}-postgres`,
        `${composeProject}-fixture`,
        `${composeProject}-operator`,
      ],
      ports: [58925, 58926, 58927, 58928],
      network_identity: `${composeProject}_default`,
    },
    reset_freshness: {
      reset_state: 'passed',
      reset_detail: 'fresh reset complete',
      output_directory_empty: true,
      output_directory_symlinked: false,
      fresh_business_ids: true,
      selected_reusable_refs: [
        'business-method-atom:haisi:001',
        'lineage-unit:haisi:001',
        'rules_template:haisi:001',
        'evidence-shape:haisi:001',
      ],
      schema_columns_complete: true,
    },
    selected_reusable_refs: [
      'business-method-atom:haisi:001',
      'lineage-unit:haisi:001',
      'rules_template:haisi:001',
      'evidence-shape:haisi:001',
    ],
    ...overrides,
  };
}

function createDependencies(options: {
  bundleHash?: string;
  preflightHash?: string;
  mutateBundle?: (bundle: Record<string, unknown>) => Record<string, unknown>;
  mutatePreflight?: (preflight: Record<string, unknown>) => Record<string, unknown>;
  mutateInspection?: (roots: Record<string, Task10CheckoutInspection>) => void;
} = {}): {
  input: VerifyTask10AuthorityInput;
  dependencies: Task10AuthorityVerifierDependencies;
  events: string[];
} {
  const events: string[] = [];
  const coreEvidenceRoot = '/roots/core-evidence';
  const clientRoot = '/roots/client-validation';
  const coreRuntimeRoot = '/roots/core-runtime';
  const siteRoot = '/roots/site-validation';
  const bundle = options.mutateBundle ? options.mutateBundle(buildBundleJson()) : buildBundleJson();
  const preflight = options.mutatePreflight ? options.mutatePreflight(buildPreflightJson()) : buildPreflightJson();
  const bundleBytes = encoder.encode(JSON.stringify(bundle));
  const preflightBytes = encoder.encode(JSON.stringify(preflight));
  const byteKinds = new Map<Uint8Array, 'bundle' | 'preflight'>([
    [bundleBytes, 'bundle'],
    [preflightBytes, 'preflight'],
  ]);
  const files = new Map<string, Uint8Array>([
    [`${coreEvidenceRoot}/${TASK10_AUTHORITY.coreBundlePath}`, bundleBytes],
    [`${coreEvidenceRoot}/${TASK10_AUTHORITY.corePreflightPath}`, preflightBytes],
  ]);
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
    [clientRoot]: {
      headCommit: TASK10_AUTHORITY.clientBaselineSha,
      branch: 'main',
      upstreamRef: 'origin/main',
      detachedHead: false,
      porcelainStatus: 'empty',
      lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
      realPath: '/real/client-validation',
      symlinked: false,
    },
    [siteRoot]: {
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
      headCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
      branch: null,
      upstreamRef: null,
      detachedHead: true,
      porcelainStatus: 'empty',
      lockfileSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      realPath: '/real/core-evidence',
      symlinked: false,
    },
  };
  options.mutateInspection?.(roots);
  return {
    input: {
      checkoutRoots: { coreRuntimeRoot, clientValidationRoot: clientRoot, siteValidationRoot: siteRoot, coreEvidenceRoot },
      bundleRepoPath: TASK10_AUTHORITY.coreBundlePath,
    },
    dependencies: {
      readFile(filePath) {
        events.push(`read:${filePath}`);
        const value = files.get(filePath);
        if (!value) {
          throw new Error(`ENOENT:${filePath}`);
        }
        return value;
      },
      hashBytes(bytes) {
        const kind = byteKinds.get(bytes);
        events.push(`hash:${kind ?? 'unknown'}`);
        return kind === 'bundle'
          ? (options.bundleHash ?? TASK10_AUTHORITY.coreBundleSha256)
          : (options.preflightHash ?? TASK10_AUTHORITY.corePreflightSha256);
      },
      inspectCheckout(rootPath) {
        events.push(`inspect:${rootPath}`);
        const inspection = roots[rootPath];
        if (!inspection) {
          throw new Error(`NO_ROOT:${rootPath}`);
        }
        return inspection;
      },
    },
    events,
  };
}

test('verifyTask10Authority resolves the real Core bundle/preflight shapes, ignores core_conclusion, and verifies the exact frozen authority', () => {
  const { input, dependencies, events } = createDependencies();
  assert.deepEqual(verifyTask10Authority(input, dependencies), { status: 'verified', reasons: [] });
  assert.deepEqual(events, [
    'inspect:/roots/core-runtime',
    'inspect:/roots/client-validation',
    'inspect:/roots/site-validation',
    'inspect:/roots/core-evidence',
    'read:/roots/core-evidence/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
    'hash:bundle',
    'read:/roots/core-evidence/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json',
    'hash:preflight',
  ]);
});

test('verifyTask10Authority returns blocked immediately before parsing on bundle or preflight hash mismatch', () => {
  const bundleMismatch = createDependencies({ bundleHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' });
  assert.equal(verifyTask10Authority(bundleMismatch.input, bundleMismatch.dependencies).status, 'reportable-blocked');
  assert.deepEqual(bundleMismatch.events, [
    'inspect:/roots/core-runtime',
    'inspect:/roots/client-validation',
    'inspect:/roots/site-validation',
    'inspect:/roots/core-evidence',
    'read:/roots/core-evidence/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
    'hash:bundle',
  ]);

  const preflightMismatch = createDependencies({ preflightHash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' });
  assert.equal(verifyTask10Authority(preflightMismatch.input, preflightMismatch.dependencies).status, 'reportable-blocked');
  assert.deepEqual(preflightMismatch.events, [
    'inspect:/roots/core-runtime',
    'inspect:/roots/client-validation',
    'inspect:/roots/site-validation',
    'inspect:/roots/core-evidence',
    'read:/roots/core-evidence/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/core-execution-evidence.json',
    'hash:bundle',
    'read:/roots/core-evidence/docs/org/review-records/artifacts/attempt-2026-07-18-task10-postmerge-002-output/preflight-artifact.json',
    'hash:preflight',
  ]);
});

test('verifyTask10Authority normalizes exactly one prefix, rejects malformed or double-prefixed lock hashes, and rejects obsolete alias/object-port runtime fields', () => {
  const uppercase = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        repo_identity: {
          ...(preflight.repo_identity as Record<string, unknown>),
          client: {
            ...((preflight.repo_identity as Record<string, Record<string, unknown>>).client),
            lockfile_hash: `sha256:${TASK10_AUTHORITY.lockfileSha256.client.toUpperCase()}`,
          },
        },
      };
    },
    mutateBundle(bundle) {
      return { ...bundle, core_conclusion: 'blocked' };
    },
  });
  assert.equal(verifyTask10Authority(uppercase.input, uppercase.dependencies).status, 'verified');

  const obsoleteAliases = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        runtime_identity: {
          ...(preflight.runtime_identity as Record<string, unknown>),
          client_identity: TASK10_AUTHORITY.clientBaselineSha,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(obsoleteAliases.input, obsoleteAliases.dependencies).status, 'reportable-blocked');

  const objectPorts = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        runtime_identity: {
          ...(preflight.runtime_identity as Record<string, unknown>),
          ports: {
            postgres: 58925,
            runtime: 58926,
            operator: 58927,
            fixture: 58928,
          },
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(objectPorts.input, objectPorts.dependencies).status, 'reportable-blocked');

  const malformed = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        repo_identity: {
          ...(preflight.repo_identity as Record<string, unknown>),
          client: {
            ...((preflight.repo_identity as Record<string, Record<string, unknown>>).client),
            lockfile_hash: 'sha256:not-a-hash',
          },
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(malformed.input, malformed.dependencies).status, 'reportable-blocked');

  const doublePrefixed = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        repo_identity: {
          ...(preflight.repo_identity as Record<string, unknown>),
          client: {
            ...((preflight.repo_identity as Record<string, Record<string, unknown>>).client),
            lockfile_hash: `sha256:sha256:${TASK10_AUTHORITY.lockfileSha256.client}`,
          },
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(doublePrefixed.input, doublePrefixed.dependencies).status, 'reportable-blocked');
});

test('verifyTask10Authority blocks for root overlap, nesting, symlink, missing inspection, and root/proof mismatches while requiring all four roots', () => {
  const overlap = createDependencies({
    mutateInspection(roots) {
      roots['/roots/site-validation'].realPath = '/real/client-validation';
    },
  });
  assert.equal(verifyTask10Authority(overlap.input, overlap.dependencies).status, 'reportable-blocked');

  const nested = createDependencies({
    mutateInspection(roots) {
      roots['/roots/site-validation'].realPath = '/real/client-validation/site';
    },
  });
  assert.equal(verifyTask10Authority(nested.input, nested.dependencies).status, 'reportable-blocked');

  const symlinked = createDependencies({
    mutateInspection(roots) {
      roots['/roots/core-runtime'].symlinked = true;
    },
  });
  assert.equal(verifyTask10Authority(symlinked.input, symlinked.dependencies).status, 'reportable-blocked');

  const missingInspection = createDependencies();
  const missingInspectionDependencies: Task10AuthorityVerifierDependencies = {
    ...missingInspection.dependencies,
    inspectCheckout(rootPath) {
      if (rootPath === '/roots/site-validation') {
        throw new Task10ExpectedCheckoutInspectionError('missing');
      }
      return missingInspection.dependencies.inspectCheckout(rootPath);
    },
  };
  assert.equal(verifyTask10Authority(missingInspection.input, missingInspectionDependencies).status, 'reportable-blocked');

  const upstreamMismatch = createDependencies({
    mutateInspection(roots) {
      roots['/roots/core-runtime'].upstreamRef = 'origin/release';
    },
  });
  assert.equal(verifyTask10Authority(upstreamMismatch.input, upstreamMismatch.dependencies).status, 'reportable-blocked');

  const producerDirty = createDependencies({
    mutateInspection(roots) {
      roots['/roots/client-validation'].porcelainStatus = 'non-empty';
    },
  });
  assert.equal(verifyTask10Authority(producerDirty.input, producerDirty.dependencies).status, 'reportable-blocked');

  const producerWrongBranch = createDependencies({
    mutateInspection(roots) {
      roots['/roots/core-runtime'].branch = 'release';
    },
  });
  assert.equal(verifyTask10Authority(producerWrongBranch.input, producerWrongBranch.dependencies).status, 'reportable-blocked');

  const evidenceMismatch = createDependencies({
    mutateInspection(roots) {
      roots['/roots/core-evidence'].detachedHead = false;
      roots['/roots/core-evidence'].branch = 'main';
      roots['/roots/core-evidence'].upstreamRef = 'origin/main';
    },
  });
  assert.equal(verifyTask10Authority(evidenceMismatch.input, evidenceMismatch.dependencies).status, 'reportable-blocked');

  const evidenceHeadMismatch = createDependencies({
    mutateInspection(roots) {
      roots['/roots/core-evidence'].headCommit = 'ffffffffffffffffffffffffffffffffffffffff';
    },
  });
  assert.equal(verifyTask10Authority(evidenceHeadMismatch.input, evidenceHeadMismatch.dependencies).status, 'reportable-blocked');
});

test('verifyTask10Authority parses the frozen preflight structure, requires exact repo/runtime/reset facts, and does not accept obsolete aliases', () => {
  const packageMismatch = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        repo_identity: {
          ...(preflight.repo_identity as Record<string, unknown>),
          core: {
            ...((preflight.repo_identity as Record<string, Record<string, unknown>>).core),
            package_identity: '@bidvia/core-runtime@wrong',
          },
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(packageMismatch.input, packageMismatch.dependencies).status, 'reportable-blocked');

  const markerMismatch = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        runtime_identity: {
          ...(preflight.runtime_identity as Record<string, unknown>),
          provider_protocol_version: 'task10-local-http-v2',
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(markerMismatch.input, markerMismatch.dependencies).status, 'reportable-blocked');

  const missingResetFreshness = createDependencies({
    mutatePreflight(preflight) {
      const { reset_freshness: _removed, ...rest } = preflight;
      return rest;
    },
  });
  assert.equal(verifyTask10Authority(missingResetFreshness.input, missingResetFreshness.dependencies).status, 'reportable-blocked');

  const missingRepoName = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        repo_identity: {
          ...(preflight.repo_identity as Record<string, unknown>),
          core: {
            ...((preflight.repo_identity as Record<string, Record<string, unknown>>).core),
            repo_name: '',
          },
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(missingRepoName.input, missingRepoName.dependencies).status, 'reportable-blocked');

  const lockMismatch = createDependencies({
    mutateInspection(roots) {
      roots['/roots/client-validation'].lockfileSha256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    },
  });
  assert.equal(verifyTask10Authority(lockMismatch.input, lockMismatch.dependencies).status, 'reportable-blocked');

  const oldAliasPreflight = createDependencies({
    mutatePreflight(preflight) {
      return {
        ...preflight,
        runtime_identity: {
          source_marker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
          runtime_marker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
          bootstrap_marker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
          scenario_marker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
          client_identity: TASK10_AUTHORITY.clientBaselineSha,
          site_identity: TASK10_AUTHORITY.siteBaselineSha,
          fixture_identity: TASK10_AUTHORITY.providerFixtureIdentity,
          protocol_version: TASK10_AUTHORITY.providerProtocolVersion,
          compose_project: `bidvia-task10-${TASK10_AUTHORITY.attemptId}`,
          container_names: ['a', 'b', 'c', 'd'],
          ports: [58925, 58926, 58927, 58928],
          network_identity: `bidvia-task10-${TASK10_AUTHORITY.attemptId}_default`,
        },
      };
    },
  });
  assert.equal(verifyTask10Authority(oldAliasPreflight.input, oldAliasPreflight.dependencies).status, 'reportable-blocked');
});

test('verifyTask10Authority classifies unreadable inspection as reportable-blocked but unexpected inspection and hash failures as tooling-failure', () => {
  const unreadableInspection = createDependencies();
  const unreadableInspectionDependencies: Task10AuthorityVerifierDependencies = {
    ...unreadableInspection.dependencies,
    inspectCheckout(rootPath) {
      if (rootPath === '/roots/core-runtime') {
        throw new Task10ExpectedCheckoutInspectionError('unreadable');
      }
      return unreadableInspection.dependencies.inspectCheckout(rootPath);
    },
  };
  assert.deepEqual(verifyTask10Authority(unreadableInspection.input, unreadableInspectionDependencies), {
    status: 'reportable-blocked',
    reasons: ['checkout inspection is missing or unreadable'],
  });

  const unexpectedInspection = createDependencies();
  const unexpectedInspectionDependencies: Task10AuthorityVerifierDependencies = {
    ...unexpectedInspection.dependencies,
    inspectCheckout(rootPath) {
      if (rootPath === '/roots/core-runtime') {
        throw new TypeError('boom');
      }
      return unexpectedInspection.dependencies.inspectCheckout(rootPath);
    },
  };
  assert.deepEqual(verifyTask10Authority(unexpectedInspection.input, unexpectedInspectionDependencies), {
    status: 'tooling-failure',
    reasons: ['internal authority verification failure'],
  });

  const hashFailure = createDependencies();
  const hashFailureDependencies: Task10AuthorityVerifierDependencies = {
    ...hashFailure.dependencies,
    hashBytes(bytes) {
      const decoded = decoder.decode(bytes);
      if (decoded.includes('preflight_artifact_path')) {
        return hashFailure.dependencies.hashBytes(bytes);
      }
      throw new RangeError('hash crash');
    },
  };
  assert.deepEqual(verifyTask10Authority(hashFailure.input, hashFailureDependencies), {
    status: 'tooling-failure',
    reasons: ['unable to hash preflight artifact bytes'],
  });
});
