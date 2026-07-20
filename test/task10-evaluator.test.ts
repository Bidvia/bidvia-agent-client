import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

import { TASK10_AUTHORITY } from '../scripts/task10/contracts.ts';
import type {
  Task10ClientFingerprint,
  Task10CommandLog,
  Task10CommandRow,
  Task10PrivateEvidenceAttestation,
  Task10ScenarioFamily,
  Task10ScenarioRow,
} from '../scripts/task10/contracts.ts';
import type { Task10AuthorityVerificationResult } from '../scripts/task10/authority.ts';
import type {
  RunTask10CoreProducerCompletedOutcome,
  RunTask10CoreProducerReportableBlockedOutcome,
  Task10PrivateEvidenceGroup,
} from '../scripts/task10/core-producer-adapter.ts';
import {
  evaluateExecutionEvidence,
  finalizeTask10Conclusion,
  type Task10ExecutionInput,
} from '../scripts/task10/evaluator.ts';

function buildHandle(seed: string): `sha256:${string}` {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function buildAttestation(
  sourceClass: Task10PrivateEvidenceAttestation['sourceClass'],
  handle: `sha256:${string}`,
  verifiedAt: string,
): Task10PrivateEvidenceAttestation {
  return {
    handle,
    sourceClass,
    verified: true,
    verifiedAt,
  };
}

function buildEvidenceGroup(
  sourceClass: Task10PrivateEvidenceGroup['sourceClass'],
  seeds: readonly string[],
  timestampBase: string,
): Task10PrivateEvidenceGroup {
  const handles = seeds.map((seed) => buildHandle(seed)).sort();
  return {
    sourceClass,
    handles,
    attestations: handles.map((handle, index) => {
      const suffix = String(index + 1).padStart(2, '0');
      return buildAttestation(sourceClass, handle, `${timestampBase}${suffix}.000Z`);
    }),
  };
}

function buildManualEvidenceGroup(
  sourceClass: Task10PrivateEvidenceGroup['sourceClass'],
  entries: ReadonlyArray<{
    seed: string;
    verifiedAt: string;
  }>,
): Task10PrivateEvidenceGroup {
  const handles = entries.map((entry) => buildHandle(entry.seed));
  return {
    sourceClass,
    handles,
    attestations: entries.map((entry) => buildAttestation(sourceClass, buildHandle(entry.seed), entry.verifiedAt)),
  };
}

function buildPassingProducerOutcome(): RunTask10CoreProducerCompletedOutcome {
  return {
    status: 'completed',
    evidence: {
      groups: [
        buildManualEvidenceGroup('runtime', [{ seed: 'b', verifiedAt: '2026-07-19T07:16:02.000Z' }]),
        buildManualEvidenceGroup('reset', [{ seed: 'c', verifiedAt: '2026-07-19T07:16:03.000Z' }]),
        buildManualEvidenceGroup('preflight', [{ seed: 'a', verifiedAt: '2026-07-19T07:16:01.000Z' }]),
        buildManualEvidenceGroup('success-001', [
          { seed: '0', verifiedAt: '2026-07-19T07:16:07.000Z' },
          { seed: 'd', verifiedAt: '2026-07-19T07:16:04.000Z' },
        ]),
        buildManualEvidenceGroup('recovery-001', [{ seed: 'e', verifiedAt: '2026-07-19T07:16:05.000Z' }]),
        buildManualEvidenceGroup('success-002-reuse', [{ seed: 'f', verifiedAt: '2026-07-19T07:16:06.000Z' }]),
      ],
    },
  };
}

function buildPassingAuthority(): Task10AuthorityVerificationResult {
  return { status: 'verified', reasons: [] };
}

function buildPassingFingerprint(): Task10ClientFingerprint {
  return {
    schemaVersion: 'bidvia-client-task10-fingerprint/v1',
    repository: TASK10_AUTHORITY.repository,
    attemptId: TASK10_AUTHORITY.attemptId,
    clientBaselineSha: TASK10_AUTHORITY.clientBaselineSha,
    coreRuntimeSha: TASK10_AUTHORITY.coreRuntimeSha,
    siteBaselineSha: TASK10_AUTHORITY.siteBaselineSha,
    coreEvidencePublicationCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
    coreBundlePath: TASK10_AUTHORITY.coreBundlePath,
    coreBundleSha256: TASK10_AUTHORITY.coreBundleSha256,
    packageIdentities: {
      core: TASK10_AUTHORITY.packageIdentities.core,
      client: TASK10_AUTHORITY.packageIdentities.client,
      site: TASK10_AUTHORITY.packageIdentities.site,
    },
    lockfileSha256: {
      core: TASK10_AUTHORITY.lockfileSha256.core,
      client: TASK10_AUTHORITY.lockfileSha256.client,
      site: TASK10_AUTHORITY.lockfileSha256.site,
    },
    runtimeMarkers: {
      sourceMainCommitMarker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      runtimeReportedVersionMarker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrapPackageVersionMarker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      scenarioPackageVersionMarker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      providerFixtureIdentity: TASK10_AUTHORITY.providerFixtureIdentity,
      providerProtocolVersion: TASK10_AUTHORITY.providerProtocolVersion,
      postgresPort: TASK10_AUTHORITY.ports.postgres,
      runtimePort: TASK10_AUTHORITY.ports.runtime,
      operatorPort: TASK10_AUTHORITY.ports.operator,
      fixturePort: TASK10_AUTHORITY.ports.fixture,
    },
    toolVersions: {
      node: 'v24.6.0',
      npm: '11.5.1',
      docker: '28.4.0',
      dockerCompose: '2.39.4-desktop.1',
      postgresClient: '15.13',
    },
    checkoutProofs: {
      coreRuntime: {
        headCommit: TASK10_AUTHORITY.coreRuntimeSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty',
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.core,
      },
      clientValidation: {
        headCommit: TASK10_AUTHORITY.clientBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty',
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
      },
      siteValidation: {
        headCommit: TASK10_AUTHORITY.siteBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty',
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.site,
      },
      coreEvidence: {
        headCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: null,
        upstreamRef: null,
        detachedHead: true,
        porcelainStatus: 'empty',
        lockfileSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
    runStartedAt: '2026-07-19T07:15:30.000Z',
  };
}

function buildPassingCommandLog(): Task10CommandLog {
  const commands: Task10CommandRow[] = [
    { command: 'npm test', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:30.000Z', endedAt: '2026-07-19T07:15:40.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
    { command: 'npm run typecheck', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:41.000Z', endedAt: '2026-07-19T07:15:45.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
    { command: 'npm run build', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:46.000Z', endedAt: '2026-07-19T07:15:50.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
    { command: 'npm run validate', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:51.000Z', endedAt: '2026-07-19T07:15:54.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
    { command: 'npm run validate:release-readiness', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:55.000Z', endedAt: '2026-07-19T07:15:57.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
    { command: 'npm run validate:release-gate', cwd: 'frozen-client-root', startedAt: '2026-07-19T07:15:58.000Z', endedAt: '2026-07-19T07:16:00.000Z', status: 'executed', exitCode: 0, skippedDueTo: null },
  ];
  return {
    schemaVersion: 'bidvia-client-task10-command-log/v1',
    attemptId: TASK10_AUTHORITY.attemptId,
    commands,
  };
}

function mutateFingerprintLockHash(
  fingerprint: Task10ClientFingerprint,
  key: 'core' | 'client' | 'site',
  value: string,
): Task10ClientFingerprint {
  return {
    ...fingerprint,
    lockfileSha256: {
      ...fingerprint.lockfileSha256,
      [key]: value,
    } as Task10ClientFingerprint['lockfileSha256'],
  };
}

function buildScenarioRow(
  scenarioFamily: Task10ScenarioFamily,
  timestamp: string,
  request: string,
  sourceObject: string,
  targetObject: string,
  proofClass: string,
  authority: string,
  sourceClass: Task10PrivateEvidenceAttestation['sourceClass'],
  handleSeed: string,
): Task10ScenarioRow {
  const handle = buildHandle(handleSeed);
  return {
    scenarioFamily,
    tenant: 'tenant:task10-owner',
    actor: 'actor:operator-admin',
    company: 'company:owner',
    authority,
    request,
    sourceObject,
    targetObject,
    proofClass,
    evidenceRefs: authority === TASK10_AUTHORITY.corePreflightUrl
      ? [TASK10_AUTHORITY.corePreflightUrl]
      : [TASK10_AUTHORITY.coreBundleUrl],
    privateEvidenceHandles: [handle],
    privateEvidenceAttestations: [buildAttestation(sourceClass, handle, timestamp)],
    result: 'passed',
    timestamp,
    reasonCodes: [
      scenarioFamily === 'session-access'
        ? 'authority-identity-match'
        : scenarioFamily === 'dispatch'
          ? 'dispatch-readback-persisted'
          : scenarioFamily === 'result-submission'
            ? 'provider-proof-and-receipt-present'
            : scenarioFamily === 'replay-recovery'
              ? request.includes(':002') ? 'distinct-reuse-truth' : 'recovery-lineage-present'
              : request.includes(':001') ? 'readyz-markers-match' : 'reset-schema-ready',
    ],
  };
}

function buildPassingScenarioRows(): Task10ScenarioRow[] {
  return [
    buildScenarioRow('session-access', '2026-07-19T07:16:01.000Z', 'POST /runtime/admin/sessions/sign-in request:session-access:001', 'admin-session-bootstrap', 'rehearsal-run-identity', 'session-access-proof', TASK10_AUTHORITY.corePreflightUrl, 'preflight', 'a'),
    buildScenarioRow('readiness', '2026-07-19T07:16:02.000Z', 'GET /readyz request:readiness:001', 'runtime-readyz', 'runtime-identity-check', 'readiness-runtime-proof', TASK10_AUTHORITY.corePreflightUrl, 'runtime', 'b'),
    buildScenarioRow('readiness', '2026-07-19T07:16:03.000Z', 'POST /runtime/rehearsals/merged-main/reset request:readiness:002', 'reset-freshness-inspection', 'reset-proof', 'readiness-reset-proof', TASK10_AUTHORITY.corePreflightUrl, 'reset', 'c'),
    buildScenarioRow('dispatch', '2026-07-19T07:16:04.000Z', 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001', 'registration-bound-dispatch', 'persisted-dispatch-readback', 'dispatch-proof', TASK10_AUTHORITY.coreBundleUrl, 'success-001', 'd'),
    buildScenarioRow('replay-recovery', '2026-07-19T07:16:05.000Z', 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001', 'rollback-request', 'recovery-lineage', 'recovery-proof', TASK10_AUTHORITY.coreBundleUrl, 'recovery-001', 'e'),
    buildScenarioRow('replay-recovery', '2026-07-19T07:16:06.000Z', 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002', 'reuse-readback', 'distinct-current-execution-ids', 'reuse-proof', TASK10_AUTHORITY.coreBundleUrl, 'success-002-reuse', 'f'),
    buildScenarioRow('result-submission', '2026-07-19T07:16:07.000Z', 'POST /runtime/commercial-actions/:id/execute request:result-submission:001', 'commercial-action-execution', 'provider-receipt-evidence', 'result-submission-proof', TASK10_AUTHORITY.coreBundleUrl, 'success-001', '0'),
  ];
}

function buildPassingInput(overrides: Partial<Task10ExecutionInput> = {}): Task10ExecutionInput {
  return {
    authorityVerification: buildPassingAuthority(),
    fingerprint: buildPassingFingerprint(),
    commandLog: buildPassingCommandLog(),
    scenarioRows: buildPassingScenarioRows(),
    producerOutcome: buildPassingProducerOutcome(),
    ...overrides,
  };
}

function buildCompletedProducerOutcomeWithGroups(groups: Task10PrivateEvidenceGroup[]): RunTask10CoreProducerCompletedOutcome {
  return {
    status: 'completed',
    evidence: { groups },
  };
}

function buildFrozenPublicationChecks(overrides: Partial<Readonly<Record<keyof ReturnType<typeof buildPassingPublicationChecks>, boolean>>> = {}) {
  return {
    ...buildPassingPublicationChecks(),
    ...overrides,
  };
}

function buildPassingPublicationChecks() {
  return {
    secretScanVerified: true,
    internalManifestVerified: true,
    archiveVerified: true,
    receiptVerified: true,
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return value;
  }
  for (const entry of Object.values(value)) {
    deepFreeze(entry);
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function codeUnitSort(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}

test('Task 10 evaluator exports the exact public API and passes the complete frozen happy path', () => {
  assert.equal(typeof evaluateExecutionEvidence, 'function');
  assert.equal(typeof finalizeTask10Conclusion, 'function');

  const evaluation = evaluateExecutionEvidence(buildPassingInput());
  assert.deepEqual(evaluation, {
    candidateConclusion: 'passed',
    reasonCodes: [],
    missingEvidence: [],
  });

  assert.deepEqual(
    finalizeTask10Conclusion(evaluation, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    }),
    {
      conclusion: 'passed',
      reasonCodes: [],
      missingEvidence: [],
    },
  );
});

test('Task 10 finalization never upgrades a handcrafted blocked candidate even with empty arrays and all publication checks true', () => {
  assert.deepEqual(
    finalizeTask10Conclusion({
      candidateConclusion: 'blocked',
      reasonCodes: [],
      missingEvidence: [],
    }, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    }),
    {
      conclusion: 'blocked',
      reasonCodes: ['execution.candidate.blocked'],
      missingEvidence: [],
    },
  );
});

test('Task 10 finalization fails closed for malformed candidate and malformed reason or missing arrays without throwing', () => {
  const cases: Array<{
    name: string;
    execution: unknown;
    expectedReason: string;
  }> = [
    {
      name: 'invalid candidate string',
      execution: {
        candidateConclusion: 'maybe',
        reasonCodes: [],
        missingEvidence: [],
      },
      expectedReason: 'execution.candidate.invalid',
    },
    {
      name: 'undefined candidate',
      execution: {
        reasonCodes: [],
        missingEvidence: [],
      },
      expectedReason: 'execution.candidate.invalid',
    },
    {
      name: 'blocked candidate always stays blocked',
      execution: {
        candidateConclusion: 'blocked',
        reasonCodes: ['z-reason'],
        missingEvidence: [],
      },
      expectedReason: 'execution.candidate.blocked',
    },
    {
      name: 'malformed reason codes',
      execution: {
        candidateConclusion: 'passed',
        reasonCodes: 'not-an-array',
        missingEvidence: [],
      },
      expectedReason: 'execution.reasonCodes.invalid',
    },
    {
      name: 'malformed missing evidence',
      execution: {
        candidateConclusion: 'passed',
        reasonCodes: [],
        missingEvidence: 'not-an-array',
      },
      expectedReason: 'execution.missingEvidence.invalid',
    },
  ];

  for (const entry of cases) {
    const result = finalizeTask10Conclusion(
      entry.execution as unknown as Parameters<typeof finalizeTask10Conclusion>[0],
      buildPassingPublicationChecks(),
    );
    assert.equal(result.conclusion, 'blocked', entry.name);
    assert.ok(result.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator ignores extra core-passed style fields and depends only on the client-owned inputs', () => {
  const input = {
    ...buildPassingInput(),
    authorityVerification: {
      ...buildPassingAuthority(),
      corePassed: true,
      core_conclusion: 'passed',
    },
  };

  assert.deepEqual(evaluateExecutionEvidence(input), {
    candidateConclusion: 'passed',
    reasonCodes: [],
    missingEvidence: [],
  });
});

test('Task 10 evaluator fails closed for malformed top-level domains and representative nested malformed objects without throwing', () => {
  const cases: Array<{
    name: string;
    input: unknown;
    expectedReason: string;
    expectedMissing?: string;
  }> = [
    {
      name: 'malformed authorityVerification top level',
      input: { ...buildPassingInput(), authorityVerification: null },
      expectedReason: 'authority.malformed',
      expectedMissing: 'authority-evidence',
    },
    {
      name: 'malformed authorityVerification nested reasons',
      input: { ...buildPassingInput(), authorityVerification: { status: 'verified', reasons: null } },
      expectedReason: 'authority.malformed',
      expectedMissing: 'authority-evidence',
    },
    {
      name: 'malformed fingerprint top level',
      input: { ...buildPassingInput(), fingerprint: null },
      expectedReason: 'fingerprint.malformed',
      expectedMissing: 'fingerprint-evidence',
    },
    {
      name: 'malformed fingerprint nested checkoutProofs',
      input: { ...buildPassingInput(), fingerprint: { ...buildPassingFingerprint(), checkoutProofs: null } },
      expectedReason: 'fingerprint.malformed',
      expectedMissing: 'fingerprint-evidence',
    },
    {
      name: 'malformed command log top level',
      input: { ...buildPassingInput(), commandLog: null },
      expectedReason: 'commandLog.malformed',
      expectedMissing: 'command-log',
    },
    {
      name: 'malformed command log nested commands',
      input: { ...buildPassingInput(), commandLog: { ...buildPassingCommandLog(), commands: null } },
      expectedReason: 'commandLog.malformed',
      expectedMissing: 'command-log',
    },
    {
      name: 'malformed scenario rows top level',
      input: { ...buildPassingInput(), scenarioRows: null },
      expectedReason: 'scenarioRows.malformed',
      expectedMissing: 'scenario-rows',
    },
    {
      name: 'malformed scenario row nested object',
      input: { ...buildPassingInput(), scenarioRows: [null] },
      expectedReason: 'scenarioRows.malformed',
      expectedMissing: 'scenario-rows',
    },
    {
      name: 'malformed producer outcome top level',
      input: { ...buildPassingInput(), producerOutcome: null },
      expectedReason: 'producerOutcome.malformed',
      expectedMissing: 'producer-evidence',
    },
    {
      name: 'malformed producer outcome nested groups',
      input: { ...buildPassingInput(), producerOutcome: { status: 'completed', evidence: { groups: null } } },
      expectedReason: 'producerOutcome.malformed',
      expectedMissing: 'producer-evidence',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(entry.input as unknown as Task10ExecutionInput);
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
    assert.ok(evaluation.reasonCodes.every((reason) => !reason.startsWith(`${entry.expectedReason}.detail:`)), entry.name);
    if (entry.expectedMissing !== undefined) {
      assert.ok(evaluation.missingEvidence.includes(entry.expectedMissing), entry.name);
    }
  }
});

test('Task 10 evaluator blocks every frozen fingerprint mismatch category and checkout identity fact', () => {
  const cases: Array<{ name: string; mutate: (fingerprint: Task10ClientFingerprint) => Task10ClientFingerprint; reason: string }> = [
    { name: 'schemaVersion', mutate: (fingerprint) => ({ ...fingerprint, schemaVersion: 'wrong-schema' as never }), reason: 'fingerprint.schemaVersion.mismatch' },
    { name: 'repository', mutate: (fingerprint) => ({ ...fingerprint, repository: 'Bidvia/other-repo' as never }), reason: 'fingerprint.repository.mismatch' },
    { name: 'attemptId', mutate: (fingerprint) => ({ ...fingerprint, attemptId: 'attempt-wrong' as never }), reason: 'fingerprint.attemptId.mismatch' },
    { name: 'clientBaselineSha', mutate: (fingerprint) => ({ ...fingerprint, clientBaselineSha: '1'.repeat(40) as never }), reason: 'fingerprint.clientBaselineSha.mismatch' },
    { name: 'coreRuntimeSha', mutate: (fingerprint) => ({ ...fingerprint, coreRuntimeSha: '2'.repeat(40) as never }), reason: 'fingerprint.coreRuntimeSha.mismatch' },
    { name: 'siteBaselineSha', mutate: (fingerprint) => ({ ...fingerprint, siteBaselineSha: '3'.repeat(40) as never }), reason: 'fingerprint.siteBaselineSha.mismatch' },
    { name: 'coreEvidencePublicationCommit', mutate: (fingerprint) => ({ ...fingerprint, coreEvidencePublicationCommit: '4'.repeat(40) as never }), reason: 'fingerprint.coreEvidencePublicationCommit.mismatch' },
    { name: 'coreBundlePath', mutate: (fingerprint) => ({ ...fingerprint, coreBundlePath: 'wrong/path.json' as never }), reason: 'fingerprint.coreBundlePath.mismatch' },
    { name: 'coreBundleSha256', mutate: (fingerprint) => ({ ...fingerprint, coreBundleSha256: 'a'.repeat(64) as never }), reason: 'fingerprint.coreBundleSha256.mismatch' },
    { name: 'packageIdentities.core', mutate: (fingerprint) => ({ ...fingerprint, packageIdentities: { ...fingerprint.packageIdentities, core: 'wrong-core@0.0.0' as never } }), reason: 'fingerprint.packageIdentities.core.mismatch' },
    { name: 'packageIdentities.client', mutate: (fingerprint) => ({ ...fingerprint, packageIdentities: { ...fingerprint.packageIdentities, client: '@bidvia/wrong@1.0.0' as never } }), reason: 'fingerprint.packageIdentities.client.mismatch' },
    { name: 'packageIdentities.site', mutate: (fingerprint) => ({ ...fingerprint, packageIdentities: { ...fingerprint.packageIdentities, site: 'wrong-site@0.1.0' as never } }), reason: 'fingerprint.packageIdentities.site.mismatch' },
    { name: 'lockfileSha256.core', mutate: (fingerprint) => mutateFingerprintLockHash(fingerprint, 'core', 'b'.repeat(64)), reason: 'fingerprint.lockfileSha256.core.mismatch' },
    { name: 'lockfileSha256.client', mutate: (fingerprint) => mutateFingerprintLockHash(fingerprint, 'client', 'c'.repeat(64)), reason: 'fingerprint.lockfileSha256.client.mismatch' },
    { name: 'lockfileSha256.site', mutate: (fingerprint) => mutateFingerprintLockHash(fingerprint, 'site', 'd'.repeat(64)), reason: 'fingerprint.lockfileSha256.site.mismatch' },
    { name: 'runtimeMarkers.sourceMainCommitMarker', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, sourceMainCommitMarker: 'source-wrong' as never } }), reason: 'fingerprint.runtimeMarkers.sourceMainCommitMarker.mismatch' },
    { name: 'runtimeMarkers.runtimeReportedVersionMarker', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, runtimeReportedVersionMarker: 'runtime-wrong' as never } }), reason: 'fingerprint.runtimeMarkers.runtimeReportedVersionMarker.mismatch' },
    { name: 'runtimeMarkers.bootstrapPackageVersionMarker', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, bootstrapPackageVersionMarker: 'bootstrap-wrong' as never } }), reason: 'fingerprint.runtimeMarkers.bootstrapPackageVersionMarker.mismatch' },
    { name: 'runtimeMarkers.scenarioPackageVersionMarker', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, scenarioPackageVersionMarker: 'scenario-wrong' as never } }), reason: 'fingerprint.runtimeMarkers.scenarioPackageVersionMarker.mismatch' },
    { name: 'runtimeMarkers.providerFixtureIdentity', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, providerFixtureIdentity: 'fixture:wrong' as never } }), reason: 'fingerprint.runtimeMarkers.providerFixtureIdentity.mismatch' },
    { name: 'runtimeMarkers.providerProtocolVersion', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, providerProtocolVersion: 'protocol-wrong' as never } }), reason: 'fingerprint.runtimeMarkers.providerProtocolVersion.mismatch' },
    { name: 'runtimeMarkers.postgresPort', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, postgresPort: 1 as never } }), reason: 'fingerprint.runtimeMarkers.postgresPort.mismatch' },
    { name: 'runtimeMarkers.runtimePort', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, runtimePort: 2 as never } }), reason: 'fingerprint.runtimeMarkers.runtimePort.mismatch' },
    { name: 'runtimeMarkers.operatorPort', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, operatorPort: 3 as never } }), reason: 'fingerprint.runtimeMarkers.operatorPort.mismatch' },
    { name: 'runtimeMarkers.fixturePort', mutate: (fingerprint) => ({ ...fingerprint, runtimeMarkers: { ...fingerprint.runtimeMarkers, fixturePort: 4 as never } }), reason: 'fingerprint.runtimeMarkers.fixturePort.mismatch' },
    { name: 'checkoutProofs.coreRuntime.headCommit', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, headCommit: '5'.repeat(40) } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.headCommit.mismatch' },
    { name: 'checkoutProofs.coreRuntime.branch', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, branch: 'release' } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.branch.mismatch' },
    { name: 'checkoutProofs.coreRuntime.upstreamRef', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, upstreamRef: 'origin/release' } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.upstreamRef.mismatch' },
    { name: 'checkoutProofs.coreRuntime.detachedHead', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, detachedHead: true } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.detachedHead.mismatch' },
    { name: 'checkoutProofs.coreRuntime.porcelainStatus', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, porcelainStatus: 'non-empty' as never } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.porcelainStatus.mismatch' },
    { name: 'checkoutProofs.coreRuntime.lockfileSha256', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreRuntime: { ...fingerprint.checkoutProofs.coreRuntime, lockfileSha256: '6'.repeat(64) } } }), reason: 'fingerprint.checkoutProofs.coreRuntime.lockfileSha256.mismatch' },
    { name: 'checkoutProofs.clientValidation.headCommit', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, headCommit: '7'.repeat(40) } } }), reason: 'fingerprint.checkoutProofs.clientValidation.headCommit.mismatch' },
    { name: 'checkoutProofs.clientValidation.branch', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, branch: 'release' } } }), reason: 'fingerprint.checkoutProofs.clientValidation.branch.mismatch' },
    { name: 'checkoutProofs.clientValidation.upstreamRef', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, upstreamRef: 'origin/release' } } }), reason: 'fingerprint.checkoutProofs.clientValidation.upstreamRef.mismatch' },
    { name: 'checkoutProofs.clientValidation.detachedHead', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, detachedHead: true } } }), reason: 'fingerprint.checkoutProofs.clientValidation.detachedHead.mismatch' },
    { name: 'checkoutProofs.clientValidation.porcelainStatus', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, porcelainStatus: 'non-empty' as never } } }), reason: 'fingerprint.checkoutProofs.clientValidation.porcelainStatus.mismatch' },
    { name: 'checkoutProofs.clientValidation.lockfileSha256', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, clientValidation: { ...fingerprint.checkoutProofs.clientValidation, lockfileSha256: '7'.repeat(64) } } }), reason: 'fingerprint.checkoutProofs.clientValidation.lockfileSha256.mismatch' },
    { name: 'checkoutProofs.siteValidation.headCommit', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, headCommit: '8'.repeat(40) } } }), reason: 'fingerprint.checkoutProofs.siteValidation.headCommit.mismatch' },
    { name: 'checkoutProofs.siteValidation.branch', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, branch: 'release' } } }), reason: 'fingerprint.checkoutProofs.siteValidation.branch.mismatch' },
    { name: 'checkoutProofs.siteValidation.upstreamRef', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, upstreamRef: 'origin/dev' } } }), reason: 'fingerprint.checkoutProofs.siteValidation.upstreamRef.mismatch' },
    { name: 'checkoutProofs.siteValidation.detachedHead', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, detachedHead: true } } }), reason: 'fingerprint.checkoutProofs.siteValidation.detachedHead.mismatch' },
    { name: 'checkoutProofs.siteValidation.porcelainStatus', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, porcelainStatus: 'non-empty' as never } } }), reason: 'fingerprint.checkoutProofs.siteValidation.porcelainStatus.mismatch' },
    { name: 'checkoutProofs.siteValidation.lockfileSha256', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, siteValidation: { ...fingerprint.checkoutProofs.siteValidation, lockfileSha256: '9'.repeat(64) } } }), reason: 'fingerprint.checkoutProofs.siteValidation.lockfileSha256.mismatch' },
    { name: 'checkoutProofs.coreEvidence.headCommit', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, headCommit: '8'.repeat(40) } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.headCommit.mismatch' },
    { name: 'checkoutProofs.coreEvidence.branch', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, branch: 'main' as never } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.branch.mismatch' },
    { name: 'checkoutProofs.coreEvidence.upstreamRef', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, upstreamRef: 'origin/main' as never } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.upstreamRef.mismatch' },
    { name: 'checkoutProofs.coreEvidence.detachedHead', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, detachedHead: false } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.detachedHead.mismatch' },
    { name: 'checkoutProofs.coreEvidence.porcelainStatus', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, porcelainStatus: 'non-empty' as never } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.porcelainStatus.mismatch' },
    { name: 'checkoutProofs.coreEvidence.lockfileSha256', mutate: (fingerprint) => ({ ...fingerprint, checkoutProofs: { ...fingerprint.checkoutProofs, coreEvidence: { ...fingerprint.checkoutProofs.coreEvidence, lockfileSha256: 'NOT-HEX' } } }), reason: 'fingerprint.checkoutProofs.coreEvidence.lockfileSha256.invalid' },
    { name: 'toolVersions.node', mutate: (fingerprint) => ({ ...fingerprint, toolVersions: { ...fingerprint.toolVersions, node: '   ' } }), reason: 'fingerprint.toolVersions.node.blank' },
    { name: 'toolVersions.npm', mutate: (fingerprint) => ({ ...fingerprint, toolVersions: { ...fingerprint.toolVersions, npm: '' } }), reason: 'fingerprint.toolVersions.npm.blank' },
    { name: 'toolVersions.docker', mutate: (fingerprint) => ({ ...fingerprint, toolVersions: { ...fingerprint.toolVersions, docker: '' } }), reason: 'fingerprint.toolVersions.docker.blank' },
    { name: 'toolVersions.dockerCompose', mutate: (fingerprint) => ({ ...fingerprint, toolVersions: { ...fingerprint.toolVersions, dockerCompose: '' } }), reason: 'fingerprint.toolVersions.dockerCompose.blank' },
    { name: 'toolVersions.postgresClient', mutate: (fingerprint) => ({ ...fingerprint, toolVersions: { ...fingerprint.toolVersions, postgresClient: '' } }), reason: 'fingerprint.toolVersions.postgresClient.blank' },
    { name: 'runStartedAt', mutate: (fingerprint) => ({ ...fingerprint, runStartedAt: '2026-02-30T07:15:30.000Z' }), reason: 'fingerprint.runStartedAt.invalid' },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      fingerprint: entry.mutate(buildPassingFingerprint()),
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.reason), entry.name);
  }
});

test('Task 10 evaluator blocks authority reportable-blocked, tooling failure, and non-empty verified reasons', () => {
  const cases: Array<{ authorityVerification: Task10AuthorityVerificationResult; expectedReason: string }> = [
    {
      authorityVerification: { status: 'reportable-blocked', reasons: ['bundle sha mismatch', 'dirty checkout'] },
      expectedReason: 'authority.reportable-blocked:bundle sha mismatch',
    },
    {
      authorityVerification: { status: 'tooling-failure', reasons: ['internal authority verification failure'] },
      expectedReason: 'authority.tooling-failure:internal authority verification failure',
    },
    {
      authorityVerification: { status: 'verified', reasons: ['unexpected extra reason'] },
      expectedReason: 'authority.verified.reasons-present',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput(entry));
    assert.equal(evaluation.candidateConclusion, 'blocked');
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason));
  }
});

test('Task 10 evaluator emits explicit missing-reason authority codes for empty reportable and tooling failures', () => {
  const cases: Array<{ authorityVerification: Task10AuthorityVerificationResult; expectedReason: string }> = [
    {
      authorityVerification: { status: 'reportable-blocked', reasons: [] },
      expectedReason: 'authority.reportable-blocked:missing-reason',
    },
    {
      authorityVerification: { status: 'tooling-failure', reasons: [] },
      expectedReason: 'authority.tooling-failure:missing-reason',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput(entry));
    assert.equal(evaluation.candidateConclusion, 'blocked');
    assert.deepEqual(evaluation.reasonCodes, [entry.expectedReason]);
  }
});

test('Task 10 evaluator blocks command nonzero, skipped, missing, duplicate, extra, order drift, and malformed timestamp rows', () => {
  const base = buildPassingCommandLog();
  const cases: Array<{ name: string; commandLog?: Task10CommandLog; commands?: Task10CommandRow[]; expectedReason: string; expectedMissing?: string }> = [
    {
      name: 'schema mismatch',
      commandLog: { ...base, schemaVersion: 'wrong-schema' as never },
      expectedReason: 'commandLog.schemaVersion.mismatch',
    },
    {
      name: 'attempt mismatch',
      commandLog: { ...base, attemptId: 'wrong-attempt' as never },
      expectedReason: 'commandLog.attemptId.mismatch',
    },
    {
      name: 'nonzero exit',
      commands: base.commands.map((row, index) => index === 2 ? { ...row, exitCode: 2 } : row),
      expectedReason: 'command.npm run build.exitCode.2',
    },
    {
      name: 'skipped required gate',
      commands: base.commands.map((row, index) => index === 3 ? { ...row, status: 'skipped', exitCode: null, skippedDueTo: 'npm run build' } : row),
      expectedReason: 'command.npm run validate.skipped:npm run build',
    },
    {
      name: 'missing command',
      commands: base.commands.filter((row) => row.command !== 'npm run validate:release-gate'),
      expectedReason: 'command.missing:npm run validate:release-gate',
      expectedMissing: 'command:npm run validate:release-gate',
    },
    {
      name: 'duplicate command',
      commands: [...base.commands.slice(0, 5), { ...base.commands[4]! }, base.commands[5]!],
      expectedReason: 'command.duplicate:npm run validate:release-readiness',
    },
    {
      name: 'extra command',
      commands: [...base.commands, { ...base.commands[5]!, command: 'npm run not-real' as never }],
      expectedReason: 'command.extra:npm run not-real',
    },
    {
      name: 'wrong cwd',
      commands: base.commands.map((row, index) => index === 0 ? { ...row, cwd: 'wrong-root' as never } : row),
      expectedReason: 'command.cwd.invalid:npm test',
    },
    {
      name: 'order drift',
      commands: [base.commands[1]!, base.commands[0]!, ...base.commands.slice(2)],
      expectedReason: 'command.order.mismatch',
    },
    {
      name: 'cross-row chronology',
      commands: base.commands.map((row, index) => index === 1 ? { ...row, startedAt: '2026-07-19T07:15:39.000Z' } : row),
      expectedReason: 'command.globalChronology.invalid:npm run typecheck',
    },
    {
      name: 'malformed row',
      commands: base.commands.map((row, index) => index === 0 ? { ...row, startedAt: '2026-07-19T07:15:30Z' } : row),
      expectedReason: 'command.timestamp.invalid:npm test',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      commandLog: entry.commandLog ?? {
        ...base,
        commands: entry.commands ?? base.commands,
      },
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
    if (entry.expectedMissing !== undefined) {
      assert.ok(evaluation.missingEvidence.includes(entry.expectedMissing), entry.name);
    }
  }
});

test('Task 10 evaluator directly blocks endedAt before startedAt, executed skippedDueTo leakage, and invalid runtime status', () => {
  const base = buildPassingCommandLog();
  const cases: Array<{ name: string; commands: Task10CommandRow[]; expectedReason: string }> = [
    {
      name: 'endedAt before startedAt',
      commands: base.commands.map((row, index) => index === 0
        ? { ...row, endedAt: '2026-07-19T07:15:29.000Z' }
        : row),
      expectedReason: 'command.timestamp.order:npm test',
    },
    {
      name: 'executed row with skippedDueTo',
      commands: base.commands.map((row, index) => index === 0
        ? { ...row, skippedDueTo: 'npm test' }
        : row),
      expectedReason: 'command.npm test.executed.skippedDueTo.invalid',
    },
    {
      name: 'invalid runtime status',
      commands: base.commands.map((row, index) => index === 0
        ? { ...row, status: 'not-a-real-status' as never }
        : row),
      expectedReason: 'command.npm test.status.invalid',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      commandLog: {
        ...base,
        commands: entry.commands,
      },
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator blocks missing or undercounted scenario families, blocked rows, malformed rows, and canonical order drift', () => {
  const passingRows = buildPassingScenarioRows();
  const cases: Array<{ name: string; rows: Task10ScenarioRow[]; expectedReason: string; expectedMissing?: string }> = [
    {
      name: 'missing session-access',
      rows: passingRows.filter((row) => row.scenarioFamily !== 'session-access'),
      expectedReason: 'scenario.family.session-access.undercount',
      expectedMissing: 'scenario-family:session-access',
    },
    {
      name: 'undercounted readiness',
      rows: passingRows.filter((row) => !(row.scenarioFamily === 'readiness' && row.request.endsWith(':002'))),
      expectedReason: 'scenario.family.readiness.undercount',
      expectedMissing: 'scenario-family:readiness',
    },
    {
      name: 'missing dispatch',
      rows: passingRows.filter((row) => row.scenarioFamily !== 'dispatch'),
      expectedReason: 'scenario.family.dispatch.undercount',
      expectedMissing: 'scenario-family:dispatch',
    },
    {
      name: 'undercounted replay-recovery',
      rows: passingRows.filter((row) => !(row.scenarioFamily === 'replay-recovery' && row.request.endsWith(':002'))),
      expectedReason: 'scenario.family.replay-recovery.undercount',
      expectedMissing: 'scenario-family:replay-recovery',
    },
    {
      name: 'missing result-submission',
      rows: passingRows.filter((row) => row.scenarioFamily !== 'result-submission'),
      expectedReason: 'scenario.family.result-submission.undercount',
      expectedMissing: 'scenario-family:result-submission',
    },
    {
      name: 'blocked row',
      rows: passingRows.map((row) => row.scenarioFamily === 'dispatch' ? { ...row, result: 'blocked', reasonCodes: ['dispatch-contradiction', 'other'] } : row),
      expectedReason: 'scenario.dispatch.blocked:dispatch-contradiction',
    },
    {
      name: 'malformed row',
      rows: passingRows.map((row) => row.scenarioFamily === 'readiness' && row.request.endsWith(':001')
        ? { ...row, privateEvidenceHandles: [buildHandle('b'), buildHandle('a')] }
        : row),
      expectedReason: 'scenario.row.malformed:GET /readyz request:readiness:001',
    },
    {
      name: 'order drift',
      rows: [passingRows[1]!, passingRows[0]!, ...passingRows.slice(2)],
      expectedReason: 'scenario.order.mismatch',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({ scenarioRows: entry.rows }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
    if (entry.expectedMissing !== undefined) {
      assert.ok(evaluation.missingEvidence.includes(entry.expectedMissing), entry.name);
    }
  }
});

test('Task 10 evaluator emits the generic blocked-row reason when a scenario row is blocked with empty reasonCodes', () => {
  const evaluation = evaluateExecutionEvidence(buildPassingInput({
    scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
      ? { ...row, result: 'blocked', reasonCodes: [] }
      : row),
  }));

  assert.equal(evaluation.candidateConclusion, 'blocked');
  assert.ok(evaluation.reasonCodes.includes('scenario.dispatch.blocked'));
});

test('Task 10 evaluator blocks vacuous or malformed passing scenario evidence and source-class mismatches', () => {
  const cases: Array<{
    name: string;
    scenarioRows: Task10ScenarioRow[];
    expectedReason: string;
  }> = [
    {
      name: 'empty evidence refs',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, evidenceRefs: [] }
        : row),
      expectedReason: 'scenario.dispatch.evidenceRefs.empty',
    },
    {
      name: 'unsupported evidence ref',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, evidenceRefs: ['https://example.invalid/not-allowed.json'] }
        : row),
      expectedReason: 'scenario.dispatch.evidenceRefs.invalid',
    },
    {
      name: 'empty private evidence handles',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, privateEvidenceHandles: [], privateEvidenceAttestations: [] }
        : row),
      expectedReason: 'scenario.dispatch.privateEvidence.empty',
    },
    {
      name: 'invalid scenario timestamp',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, timestamp: 'not-a-timestamp' }
        : row),
      expectedReason: 'scenario.dispatch.timestamp.invalid',
    },
    {
      name: 'invalid attestation timestamp',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? {
          ...row,
          privateEvidenceAttestations: row.privateEvidenceAttestations.map((attestation) => ({
            ...attestation,
            verifiedAt: 'not-a-timestamp',
          })),
        }
        : row),
      expectedReason: 'scenario.dispatch.attestation.verifiedAt.invalid',
    },
    {
      name: 'empty passed reason codes',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, reasonCodes: [] }
        : row),
      expectedReason: 'scenario.dispatch.passed.reasonCodes.empty',
    },
    {
      name: 'session source class mismatch',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'session-access'
        ? {
          ...row,
          privateEvidenceAttestations: [buildAttestation('runtime', row.privateEvidenceHandles[0]!, row.timestamp)],
        }
        : row),
      expectedReason: 'scenario.session-access.proofClass.binding.invalid',
    },
    {
      name: 'result submission source class mismatch',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'result-submission'
        ? {
          ...row,
          privateEvidenceAttestations: [buildAttestation('recovery-001', row.privateEvidenceHandles[0]!, row.timestamp)],
        }
        : row),
      expectedReason: 'scenario.result-submission.proofClass.binding.invalid',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({ scenarioRows: entry.scenarioRows }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator binds passing scenario evidence to validated producer evidence groups exactly', () => {
  const missingHandleBinding = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: buildCompletedProducerOutcomeWithGroups(
      buildPassingProducerOutcome().evidence.groups.map((group) => group.sourceClass === 'success-001'
        ? buildManualEvidenceGroup('success-001', [{ seed: 'd', verifiedAt: '2026-07-19T07:16:04.000Z' }])
        : group),
    ),
  }));
  assert.equal(missingHandleBinding.candidateConclusion, 'blocked');
  assert.ok(missingHandleBinding.reasonCodes.includes('scenario.result-submission.privateEvidence.unbound'));

  const mismatchedAttestationBinding = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: buildCompletedProducerOutcomeWithGroups(
      buildPassingProducerOutcome().evidence.groups.map((group) => group.sourceClass === 'success-001'
        ? buildManualEvidenceGroup('success-001', [
          { seed: '0', verifiedAt: '2026-07-19T07:16:08.000Z' },
          { seed: 'd', verifiedAt: '2026-07-19T07:16:04.000Z' },
        ])
        : group),
    ),
  }));
  assert.equal(mismatchedAttestationBinding.candidateConclusion, 'blocked');
  assert.ok(mismatchedAttestationBinding.reasonCodes.includes('scenario.result-submission.privateEvidence.unbound'));
});

test('Task 10 evaluator blocks canonical passed-row producer substitutions across proof classes', () => {
  const passingRows = buildPassingScenarioRows();
  const runtimeRow = passingRows.find((row) => row.proofClass === 'readiness-runtime-proof');
  const resetRow = passingRows.find((row) => row.proofClass === 'readiness-reset-proof');
  const recoveryRow = passingRows.find((row) => row.proofClass === 'recovery-proof');
  const reuseRow = passingRows.find((row) => row.proofClass === 'reuse-proof');

  assert.ok(runtimeRow);
  assert.ok(resetRow);
  assert.ok(recoveryRow);
  assert.ok(reuseRow);

  const substitutionCases: Array<{
    name: string;
    mutateRows: (rows: Task10ScenarioRow[]) => Task10ScenarioRow[];
    expectedReason: string;
  }> = [
    {
      name: 'reset evidence substituted onto runtime readiness row',
      mutateRows: (rows) => rows.map((row) => row.proofClass === 'readiness-runtime-proof'
        ? {
          ...row,
          privateEvidenceHandles: [...resetRow!.privateEvidenceHandles],
          privateEvidenceAttestations: resetRow!.privateEvidenceAttestations.map((attestation) => ({ ...attestation })),
        }
        : row),
      expectedReason: 'scenario.readiness.proofClass.binding.invalid',
    },
    {
      name: 'runtime evidence substituted onto reset readiness row',
      mutateRows: (rows) => rows.map((row) => row.proofClass === 'readiness-reset-proof'
        ? {
          ...row,
          privateEvidenceHandles: [...runtimeRow!.privateEvidenceHandles],
          privateEvidenceAttestations: runtimeRow!.privateEvidenceAttestations.map((attestation) => ({ ...attestation })),
        }
        : row),
      expectedReason: 'scenario.readiness.proofClass.binding.invalid',
    },
    {
      name: 'reuse evidence substituted onto recovery row',
      mutateRows: (rows) => rows.map((row) => row.proofClass === 'recovery-proof'
        ? {
          ...row,
          privateEvidenceHandles: [...reuseRow!.privateEvidenceHandles],
          privateEvidenceAttestations: reuseRow!.privateEvidenceAttestations.map((attestation) => ({ ...attestation })),
        }
        : row),
      expectedReason: 'scenario.replay-recovery.proofClass.binding.invalid',
    },
    {
      name: 'recovery evidence substituted onto reuse row',
      mutateRows: (rows) => rows.map((row) => row.proofClass === 'reuse-proof'
        ? {
          ...row,
          privateEvidenceHandles: [...recoveryRow!.privateEvidenceHandles],
          privateEvidenceAttestations: recoveryRow!.privateEvidenceAttestations.map((attestation) => ({ ...attestation })),
        }
        : row),
      expectedReason: 'scenario.replay-recovery.proofClass.binding.invalid',
    },
  ];

  for (const entry of substitutionCases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      scenarioRows: entry.mutateRows(buildPassingScenarioRows()),
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator rejects authority-bundle as a passed proof substitute for runtime and producer-owned families', () => {
  const cases: Array<{ name: string; family: Task10ScenarioFamily; expectedReason: string }> = [
    { name: 'dispatch authority-bundle', family: 'dispatch', expectedReason: 'scenario.dispatch.proofClass.binding.invalid' },
    { name: 'recovery authority-bundle', family: 'replay-recovery', expectedReason: 'scenario.replay-recovery.proofClass.binding.invalid' },
    { name: 'result authority-bundle', family: 'result-submission', expectedReason: 'scenario.result-submission.proofClass.binding.invalid' },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === entry.family
        ? {
            ...row,
            privateEvidenceAttestations: row.privateEvidenceAttestations.map((attestation) => ({
              ...attestation,
              sourceClass: 'authority-bundle' as const,
            })),
          }
        : row),
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator blocks unknown or family-mismatched passed proof classes', () => {
  const cases: Array<{
    name: string;
    scenarioRows: Task10ScenarioRow[];
    expectedReason: string;
  }> = [
    {
      name: 'unknown proof class',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, proofClass: 'unknown-proof-class' }
        : row),
      expectedReason: 'scenario.dispatch.proofClass.invalid',
    },
    {
      name: 'family mismatched proof class',
      scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
        ? { ...row, proofClass: 'recovery-proof' }
        : row),
      expectedReason: 'scenario.dispatch.proofClass.invalid',
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({ scenarioRows: entry.scenarioRows }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    assert.ok(evaluation.reasonCodes.includes(entry.expectedReason), entry.name);
  }
});

test('Task 10 evaluator blocks producer reportable-blocked, tooling failure, and malformed or empty completed evidence', () => {
  const reportableBlocked: RunTask10CoreProducerReportableBlockedOutcome = {
    status: 'reportable-blocked',
    reasonCodes: ['producer-output-readback-blocked', 'producer-output-success-002-reuse-duplicate'],
    affectedModes: ['success-001', 'success-002-reuse'],
    affectedFamilies: ['dispatch', 'result-submission'],
    evidence: {
      groups: [
        buildEvidenceGroup('success-001', ['d'], '2026-07-19T07:17:'),
        buildEvidenceGroup('success-002-reuse', ['f'], '2026-07-19T07:19:'),
      ],
    },
  };
  const blocked = evaluateExecutionEvidence(buildPassingInput({ producerOutcome: reportableBlocked }));
  assert.equal(blocked.candidateConclusion, 'blocked');
  assert.ok(blocked.reasonCodes.includes('producer.reportable-blocked:producer-output-readback-blocked'));
  assert.ok(blocked.reasonCodes.includes('producer.reportable-blocked:producer-output-success-002-reuse-duplicate'));
  assert.ok(blocked.missingEvidence.includes('producer-mode:success-001'));
  assert.ok(blocked.missingEvidence.includes('producer-family:dispatch'));

  const emptyReportable = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: ['producer-output-readback-blocked'],
      affectedModes: ['success-001'],
      affectedFamilies: ['dispatch'],
      evidence: { groups: [] },
    },
  }));
  assert.equal(emptyReportable.candidateConclusion, 'blocked');
  assert.ok(emptyReportable.reasonCodes.includes('producer.reportable-blocked:producer-output-readback-blocked'));
  assert.ok(emptyReportable.reasonCodes.includes('producer.reportable-blocked.groups.empty'));
  assert.ok(emptyReportable.missingEvidence.includes('producer-evidence'));

  const toolingFailure = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' },
  }));
  assert.equal(toolingFailure.candidateConclusion, 'blocked');
  assert.ok(toolingFailure.reasonCodes.includes('producer.tooling-failure:producer-artifact-invalid'));
  assert.ok(toolingFailure.missingEvidence.includes('producer-evidence'));

  const emptyCompleted = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: { status: 'completed', evidence: { groups: [] } },
  }));
  assert.equal(emptyCompleted.candidateConclusion, 'blocked');
  assert.ok(emptyCompleted.reasonCodes.includes('producer.completed.groups.empty'));
  assert.ok(emptyCompleted.missingEvidence.includes('producer-evidence'));

  const completedWithUnexpectedGroup = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [
          ...buildPassingProducerOutcome().evidence.groups,
          buildEvidenceGroup('producer-contract-probe', ['9'], '2026-07-19T07:20:'),
        ],
      },
    },
  }));
  assert.equal(completedWithUnexpectedGroup.candidateConclusion, 'blocked');
  assert.ok(completedWithUnexpectedGroup.reasonCodes.includes('producer.completed.group.unexpected:producer-contract-probe'));

  const malformedCompleted = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [{
          sourceClass: 'preflight',
          handles: [buildHandle('1')],
          attestations: [buildAttestation('runtime', buildHandle('1'), '2026-07-19T07:16:01.000Z')],
        }],
      },
    },
  }));
  assert.equal(malformedCompleted.candidateConclusion, 'blocked');
  assert.ok(malformedCompleted.reasonCodes.includes('producer.evidence.group.preflight.attestationSourceClass.mismatch'));

  const malformedReportable = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: ['producer-output-readback-blocked'],
      affectedModes: ['success-001'],
      affectedFamilies: ['dispatch'],
      evidence: {
        groups: [{
          sourceClass: 'success-001',
          handles: [buildHandle('d')],
          attestations: [buildAttestation('runtime', buildHandle('d'), '2026-07-19T07:17:01.000Z')],
        }],
      },
    },
  }));
  assert.equal(malformedReportable.candidateConclusion, 'blocked');
  assert.ok(malformedReportable.reasonCodes.includes('producer.reportable-blocked:producer-output-readback-blocked'));
  assert.ok(malformedReportable.reasonCodes.includes('producer.evidence.group.success-001.attestationSourceClass.mismatch'));
});

test('Task 10 evaluator directly blocks missing completed groups, unexpected completed groups, and reportable missing-reason branches', () => {
  const passingGroups = buildPassingProducerOutcome().evidence.groups;

  const missingCompletedGroup = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: buildCompletedProducerOutcomeWithGroups(
      passingGroups.filter((group) => group.sourceClass !== 'reset'),
    ),
  }));
  assert.equal(missingCompletedGroup.candidateConclusion, 'blocked');
  assert.ok(missingCompletedGroup.reasonCodes.includes('producer.completed.group.missing:reset'));
  assert.ok(missingCompletedGroup.missingEvidence.includes('producer-group:reset'));

  const unexpectedCompletedGroup = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: buildCompletedProducerOutcomeWithGroups([
      ...passingGroups,
      buildEvidenceGroup('producer-contract-probe', ['9'], '2026-07-19T07:20:'),
    ]),
  }));
  assert.equal(unexpectedCompletedGroup.candidateConclusion, 'blocked');
  assert.ok(unexpectedCompletedGroup.reasonCodes.includes('producer.completed.group.unexpected:producer-contract-probe'));

  const reportableMissingReason = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: [],
      affectedModes: ['success-001'],
      affectedFamilies: ['dispatch'],
      evidence: {
        groups: [buildEvidenceGroup('success-001', ['d'], '2026-07-19T07:17:')],
      },
    },
  }));
  assert.equal(reportableMissingReason.candidateConclusion, 'blocked');
  assert.ok(reportableMissingReason.reasonCodes.includes('producer.reportable-blocked:missing-reason'));

  const reportableEmptyEvidence = evaluateExecutionEvidence(buildPassingInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: [],
      affectedModes: ['success-001'],
      affectedFamilies: ['dispatch'],
      evidence: { groups: [] },
    },
  }));
  assert.equal(reportableEmptyEvidence.candidateConclusion, 'blocked');
  assert.ok(reportableEmptyEvidence.reasonCodes.includes('producer.reportable-blocked:missing-reason'));
  assert.ok(reportableEmptyEvidence.reasonCodes.includes('producer.reportable-blocked.groups.empty'));
  assert.ok(reportableEmptyEvidence.missingEvidence.includes('producer-evidence'));
});

test('Task 10 evaluator blocks every one-mutation corruption of completed producer evidence groups', () => {
  const passingGroups = buildPassingProducerOutcome().evidence.groups;
  const cases: Array<{
    name: string;
    groups: Task10PrivateEvidenceGroup[];
    expectedReasons: string[];
  }> = [
    {
      name: 'duplicate sourceClass group',
      groups: [...passingGroups, { ...passingGroups[0]! }],
      expectedReasons: ['producer.evidence.group.runtime.duplicate'],
    },
    {
      name: 'empty handles and attestations group',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? { ...group, handles: [], attestations: [] }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.empty'],
    },
    {
      name: 'handle attestation length mismatch',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          handles: [buildHandle('1'), buildHandle('2')],
          attestations: [buildAttestation('runtime', buildHandle('1'), '2026-07-19T07:14:01.000Z')],
        }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.alignment.invalid'],
    },
    {
      name: 'unsorted handles',
      groups: [
        {
          ...passingGroups[0]!,
          handles: [buildHandle('2'), buildHandle('1')],
          attestations: [
            buildAttestation('runtime', buildHandle('2'), '2026-07-19T07:14:01.000Z'),
            buildAttestation('runtime', buildHandle('1'), '2026-07-19T07:14:02.000Z'),
          ],
        },
        ...passingGroups.slice(1),
      ],
      expectedReasons: ['producer.evidence.group.runtime.handles.unsorted'],
    },
    {
      name: 'invalid handle format',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          handles: ['sha256:not-a-real-hash' as `sha256:${string}`],
          attestations: [buildAttestation('runtime', 'sha256:not-a-real-hash' as `sha256:${string}`, '2026-07-19T07:14:01.000Z')],
        }
        : group),
      expectedReasons: [
        'producer.evidence.group.runtime.handle.invalid',
        'producer.evidence.group.runtime.attestationHandle.invalid',
      ],
    },
    {
      name: 'alignment mismatch',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          attestations: [buildAttestation('runtime', buildHandle('2'), '2026-07-19T07:14:01.000Z')],
        }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.alignment.invalid'],
    },
    {
      name: 'attestation source class mismatch',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          attestations: [buildAttestation('reset', group.handles[0]!, '2026-07-19T07:14:01.000Z')],
        }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.attestationSourceClass.mismatch'],
    },
    {
      name: 'verified false',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          attestations: [{
            ...buildAttestation('runtime', group.handles[0]!, '2026-07-19T07:14:01.000Z'),
            verified: false as never,
          }],
        }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.verified.invalid'],
    },
    {
      name: 'invalid verifiedAt timestamp',
      groups: passingGroups.map((group) => group.sourceClass === 'runtime'
        ? {
          ...group,
          attestations: [buildAttestation('runtime', group.handles[0]!, 'not-a-real-timestamp')],
        }
        : group),
      expectedReasons: ['producer.evidence.group.runtime.verifiedAt.invalid'],
    },
  ];

  for (const entry of cases) {
    const evaluation = evaluateExecutionEvidence(buildPassingInput({
      producerOutcome: buildCompletedProducerOutcomeWithGroups(entry.groups),
    }));
    assert.equal(evaluation.candidateConclusion, 'blocked', entry.name);
    for (const reason of entry.expectedReasons) {
      assert.ok(evaluation.reasonCodes.includes(reason), `${entry.name}: ${reason}`);
    }
  }
});

test('Task 10 evaluator accumulates and lexically sorts multiple simultaneous execution faults', () => {
  const evaluation = evaluateExecutionEvidence(buildPassingInput({
    authorityVerification: { status: 'reportable-blocked', reasons: ['dirty checkout'] },
    fingerprint: { ...buildPassingFingerprint(), repository: 'wrong/repo' as never },
    commandLog: {
      ...buildPassingCommandLog(),
      commands: buildPassingCommandLog().commands.filter((row) => row.command !== 'npm test'),
    },
    scenarioRows: buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch' ? { ...row, result: 'blocked', reasonCodes: ['dispatch-contradiction'] } : row),
    producerOutcome: { status: 'tooling-failure', errorCode: 'producer-artifact-invalid' },
  }));

  assert.equal(evaluation.candidateConclusion, 'blocked');
  assert.deepEqual(evaluation.reasonCodes, [...evaluation.reasonCodes].sort());
  assert.deepEqual(evaluation.missingEvidence, [...evaluation.missingEvidence].sort());
  assert.ok(evaluation.reasonCodes.includes('authority.reportable-blocked:dirty checkout'));
  assert.ok(evaluation.reasonCodes.includes('fingerprint.repository.mismatch'));
  assert.ok(evaluation.reasonCodes.includes('command.missing:npm test'));
  assert.ok(evaluation.reasonCodes.includes('producer.tooling-failure:producer-artifact-invalid'));
  assert.ok(evaluation.reasonCodes.includes('scenario.dispatch.blocked:dispatch-contradiction'));
  assert.ok(evaluation.missingEvidence.includes('command:npm test'));
  assert.ok(evaluation.missingEvidence.includes('producer-evidence'));
});

test('Task 10 evaluator and finalizer use locale-independent code-unit sorting for reasons and missing evidence', () => {
  const scenarioRows: Task10ScenarioRow[] = buildPassingScenarioRows().map((row) => row.scenarioFamily === 'dispatch'
    ? { ...row, result: 'blocked' as const, reasonCodes: ['Ωmega', '!bang', 'a~'] }
    : row);
  const evaluation = evaluateExecutionEvidence(buildPassingInput({ scenarioRows }));
  const expectedBlockedReasons = codeUnitSort([
    'scenario.dispatch.blocked:!bang',
    'scenario.dispatch.blocked:a~',
    'scenario.dispatch.blocked:Ωmega',
  ]);
  assert.deepEqual(
    evaluation.reasonCodes.filter((reason) => ['!bang', 'a~', 'Ωmega'].includes(reason) || reason.startsWith('scenario.dispatch.blocked:')),
    expectedBlockedReasons,
  );

  const finalized = finalizeTask10Conclusion({
    candidateConclusion: 'passed',
    reasonCodes: ['Ωmega', '!bang', 'a~'],
    missingEvidence: ['Ωmissing', '!missing', 'a-missing'],
  }, buildPassingPublicationChecks());
  assert.deepEqual(finalized.reasonCodes, codeUnitSort(['Ωmega', '!bang', 'a~']));
  assert.deepEqual(finalized.missingEvidence, codeUnitSort(['Ωmissing', '!missing', 'a-missing']));
});

test('Task 10 finalization downgrades for each publication check, accumulates multiple failures, and never upgrades a blocked execution', () => {
  const passingExecution = evaluateExecutionEvidence(buildPassingInput());
  const checks = [
    { key: 'secretScanVerified', reason: 'publication.secret-scan.unverified', missing: 'secret-scan' },
    { key: 'internalManifestVerified', reason: 'publication.internal-manifest.unverified', missing: 'internal-manifest' },
    { key: 'archiveVerified', reason: 'publication.archive.unverified', missing: 'archive' },
    { key: 'receiptVerified', reason: 'publication.receipt.unverified', missing: 'receipt' },
  ] as const;

  for (const entry of checks) {
    const conclusion = finalizeTask10Conclusion(passingExecution, {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
      [entry.key]: false,
    });
    assert.equal(conclusion.conclusion, 'blocked', entry.key);
    assert.ok(conclusion.reasonCodes.includes(entry.reason), entry.key);
    assert.ok(conclusion.missingEvidence.includes(entry.missing), entry.key);
  }

  const multiple = finalizeTask10Conclusion(passingExecution, {
    secretScanVerified: false,
    internalManifestVerified: false,
    archiveVerified: true,
    receiptVerified: false,
  });
  assert.equal(multiple.conclusion, 'blocked');
  assert.deepEqual(multiple.reasonCodes, [...multiple.reasonCodes].sort());
  assert.deepEqual(multiple.missingEvidence, [...multiple.missingEvidence].sort());
  assert.ok(multiple.reasonCodes.includes('publication.secret-scan.unverified'));
  assert.ok(multiple.reasonCodes.includes('publication.internal-manifest.unverified'));
  assert.ok(multiple.reasonCodes.includes('publication.receipt.unverified'));

  const blockedExecution = evaluateExecutionEvidence(buildPassingInput({
    authorityVerification: { status: 'tooling-failure', reasons: ['internal authority verification failure'] },
  }));
  const preserved = finalizeTask10Conclusion(blockedExecution, {
    secretScanVerified: true,
    internalManifestVerified: true,
    archiveVerified: true,
    receiptVerified: true,
  });
  assert.equal(preserved.conclusion, 'blocked');
  assert.ok(preserved.reasonCodes.includes('authority.tooling-failure:internal authority verification failure'));

  const blockedEmpty = finalizeTask10Conclusion({
    candidateConclusion: 'blocked',
    reasonCodes: [],
    missingEvidence: [],
  }, {
    secretScanVerified: true,
    internalManifestVerified: true,
    archiveVerified: true,
    receiptVerified: true,
  });
  assert.equal(blockedEmpty.conclusion, 'blocked');
  assert.deepEqual(blockedEmpty.reasonCodes, ['execution.candidate.blocked']);
});

test('Task 10 evaluator and finalizer do not mutate frozen nested inputs', () => {
  const executionInput = deepFreeze(cloneJson(buildPassingInput()));
  const executionSnapshot = cloneJson(executionInput);

  const evaluation = evaluateExecutionEvidence(executionInput);
  assert.deepEqual(executionInput, executionSnapshot);
  assert.deepEqual(evaluation, {
    candidateConclusion: 'passed',
    reasonCodes: [],
    missingEvidence: [],
  });

  const executionEvaluation = deepFreeze(cloneJson({
    candidateConclusion: 'passed' as const,
    reasonCodes: ['Ωmega', '!bang'],
    missingEvidence: ['Ωmissing', '!missing'],
  }));
  const executionEvaluationSnapshot = cloneJson(executionEvaluation);
  const publicationChecks = deepFreeze(cloneJson(buildFrozenPublicationChecks()));
  const publicationSnapshot = cloneJson(publicationChecks);

  void finalizeTask10Conclusion(executionEvaluation, publicationChecks);

  assert.deepEqual(executionEvaluation, executionEvaluationSnapshot);
  assert.deepEqual(publicationChecks, publicationSnapshot);
});

test('Task 10 evaluator keeps conclusion authority isolated to evaluator.ts and contract serializers only', async () => {
  const rootDirectory = new URL('../scripts/task10/', import.meta.url);
  const fileUrls = await collectTypeScriptFiles(rootDirectory);

  for (const fileUrl of fileUrls) {
    const relativePath = fileUrl.href.slice(rootDirectory.href.length);
    const content = await readFile(fileUrl, 'utf8');
    const sourceFile = ts.createSourceFile(relativePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const isEvaluator = relativePath === 'evaluator.ts';
    const isContracts = relativePath === 'contracts.ts';

    const violations: string[] = [];
    const visit = (node: ts.Node): void => {
      if (!isEvaluator && ts.isCallExpression(node) && ts.isIdentifier(node.expression)
        && (node.expression.text === 'evaluateExecutionEvidence' || node.expression.text === 'finalizeTask10Conclusion')) {
        violations.push(`disallowed call:${node.expression.text}`);
      }

      if (!isEvaluator && !isContracts && ts.isFunctionDeclaration(node) && node.name !== undefined
        && isNodeExported(node)
        && /Conclusion/.test(node.name.text)) {
        violations.push(`disallowed exported function:${node.name.text}`);
      }

      if (!isEvaluator && !isContracts && ts.isVariableStatement(node)
        && isNodeExported(node)
        && node.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && /Conclusion/.test(declaration.name.text))) {
        violations.push('disallowed exported variable conclusion authority');
      }

      if (!isEvaluator && !isContracts && isConclusionWriteNode(node)) {
        if (ts.isPropertyAssignment(node) && isAllowedPublicationConclusionCopy(node, relativePath)) {
          ts.forEachChild(node, visit);
          return;
        }
        violations.push('disallowed conclusion write');
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    assert.deepEqual(violations, [], relativePath);
  }

  const publicationCopySource = ts.createSourceFile(
    'publication.ts',
    'const output = { conclusion: decision.conclusion, clientOwnedConclusion: input.conclusion.conclusion };',
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const publicationCopyAssignments = collectConclusionPropertyAssignments(publicationCopySource);
  assert.equal(publicationCopyAssignments.length, 2);
  for (const assignment of publicationCopyAssignments) {
    assert.equal(isAllowedPublicationConclusionCopy(assignment, 'publication.ts'), true);
  }

  const publicationNegativeCases = [
    'const output = { conclusion: \"passed\" };',
    'const output = { conclusion: decision.conclusion === \"passed\" ? \"passed\" : \"blocked\" };',
    'const output = { conclusion: finalizeTask10Conclusion(decision, checks).conclusion };',
    'result.conclusion = decision.conclusion;',
  ];
  for (const sourceText of publicationNegativeCases) {
    const sourceFile = ts.createSourceFile('publication.ts', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const propertyAssignments = collectConclusionPropertyAssignments(sourceFile);
    if (propertyAssignments.length > 0) {
      for (const assignment of propertyAssignments) {
        assert.equal(isAllowedPublicationConclusionCopy(assignment, 'publication.ts'), false, sourceText);
      }
    }
    const disallowedWrites = collectDisallowedConclusionWrites(sourceFile, 'publication.ts');
    assert.ok(disallowedWrites.length >= 1, sourceText);
  }
});

async function collectTypeScriptFiles(directory: URL): Promise<URL[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: URL[] = [];
  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directory);
    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(new URL(`${entry.name}/`, directory)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryUrl);
    }
  }
  return files.sort((left, right) => left.href < right.href ? -1 : left.href > right.href ? 1 : 0);
}

function isNodeExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node)
    && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

function isConclusionWriteNode(node: ts.Node): boolean {
  const targetNames = new Set(['candidateConclusion', 'conclusion', 'clientOwnedConclusion']);
  if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && targetNames.has(node.name.text)) {
    return true;
  }
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && targetNames.has(node.name.text)) {
    return true;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const left = node.left;
    if (ts.isPropertyAccessExpression(left) && targetNames.has(left.name.text)) {
      return true;
    }
    if (ts.isElementAccessExpression(left) && ts.isStringLiteral(left.argumentExpression) && targetNames.has(left.argumentExpression.text)) {
      return true;
    }
  }
  return false;
}

function isAllowedPublicationConclusionCopy(node: ts.Node, relativePath: string): boolean {
  if (relativePath !== 'publication.ts') {
    return false;
  }
  if (!ts.isPropertyAssignment(node)) {
    return false;
  }
  const propertyName = getConclusionPropertyName(node.name);
  if (propertyName === null) {
    return false;
  }
  return isAllowedPublicationPropertyAccessChain(node.initializer);
}

function getConclusionPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return ['candidateConclusion', 'conclusion', 'clientOwnedConclusion'].includes(name.text)
      ? name.text
      : null;
  }
  return null;
}

function isAllowedPublicationPropertyAccessChain(node: ts.Expression): boolean {
  const rootIdentifier = getPropertyAccessChainRootIdentifier(node);
  if (rootIdentifier === null) {
    return false;
  }
  return ['decision', 'input', 'files', 'parsed', 'producerValidation'].includes(rootIdentifier);
}

function getPropertyAccessChainRootIdentifier(node: ts.Expression): string | null {
  if (ts.isIdentifier(node)) {
    return node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    return getPropertyAccessChainRootIdentifier(node.expression);
  }
  return null;
}

function collectConclusionPropertyAssignments(sourceFile: ts.SourceFile): ts.PropertyAssignment[] {
  const assignments: ts.PropertyAssignment[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) {
      const propertyName = getConclusionPropertyName(node.name);
      if (propertyName !== null) {
        assignments.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return assignments;
}

function collectDisallowedConclusionWrites(sourceFile: ts.SourceFile, relativePath: string): string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (isConclusionWriteNode(node)) {
      if (!ts.isPropertyAssignment(node) || !isAllowedPublicationConclusionCopy(node, relativePath)) {
        violations.push(node.getText(sourceFile));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}
