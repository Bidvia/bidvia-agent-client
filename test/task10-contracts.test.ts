import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REQUIRED_TASK10_SCENARIO_FAMILIES,
  TASK10_AUTHORITY,
  TASK10_CONTENT_FILES,
  TASK10_NON_CLAIMS,
  TASK10_PRIVATE_SOURCE_CLASSES,
  TASK10_PROHIBITED_VALUE_FAMILIES,
  TASK10_REQUIRED_SCENARIO_FAMILIES,
  buildTask10ClientConclusionWire,
  buildTask10ClientFingerprintWire,
  buildTask10CommandLogWire,
  buildTask10PackageName,
  buildTask10PublicationReceiptWire,
  buildTask10ScenarioMatrixWire,
  buildTask10SecretReviewWire,
  buildTask10WrapperFiles,
  parseTask10ClientConclusionWire,
  parseTask10ClientFingerprintWire,
  parseTask10CommandLogWire,
  parseTask10PublicationReceiptWire,
  parseTask10ScenarioMatrixWire,
  parseTask10SecretReviewWire,
  requireCompleteTask10ScenarioRow,
} from '../scripts/task10/contracts.ts';
import type {
  Task10ClientConclusion,
  Task10ClientFingerprint,
  Task10CommandLog,
  Task10Conclusion,
  Task10PublicationReceipt,
  Task10ScenarioFamily,
  Task10ScenarioMatrix,
  Task10ScenarioRow,
  Task10ScenarioRowWire,
  Task10SecretReview,
} from '../scripts/task10/contracts.ts';

const RUN_STARTED_AT = '2026-07-19T07:15:30.000Z';
const GENERATED_AT = '2026-07-19T07:16:00.000Z';
const PACKAGE_NAME = 'client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20260719T071530Z';

function buildHandle(seed: string): `sha256:${string}` {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function buildFixture(): {
  conclusion: Task10ClientConclusion;
  fingerprint: Task10ClientFingerprint;
  commandLog: Task10CommandLog;
  scenarioMatrix: Task10ScenarioMatrix;
  secretReview: Task10SecretReview;
  receipt: Task10PublicationReceipt;
} {
  const handles = [
    buildHandle('1'),
    buildHandle('2'),
    buildHandle('3'),
    buildHandle('4'),
    buildHandle('5'),
    buildHandle('6'),
    buildHandle('7'),
  ] as const;

  const conclusion: Task10ClientConclusion = {
    schemaVersion: 'bidvia-client-task10-owner-conclusion/v1',
    evidenceOwner: 'client',
    attemptId: TASK10_AUTHORITY.attemptId,
    conclusion: 'blocked',
    reasonCodes: [
      'core-producer-private-root-contract-unsatisfied',
      'result-submission-blocked',
    ],
    missingEvidence: [
      'dispatch owner-run materialization output',
      'result-submission provider receipt continuity',
    ],
    authorityRef: {
      issueUrl: TASK10_AUTHORITY.issueUrl,
      coreHandoffRunbookUrl: TASK10_AUTHORITY.coreHandoffRunbookUrl,
      coreBundleUrl: TASK10_AUTHORITY.coreBundleUrl,
      coreBundlePath: TASK10_AUTHORITY.coreBundlePath,
      coreBundleSha256: TASK10_AUTHORITY.coreBundleSha256,
      corePreflightPath: TASK10_AUTHORITY.corePreflightPath,
      corePreflightSha256: TASK10_AUTHORITY.corePreflightSha256,
    },
    nonClaims: [...TASK10_NON_CLAIMS],
  };

  const fingerprint: Task10ClientFingerprint = {
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
    runStartedAt: RUN_STARTED_AT,
  };

  const commandLog: Task10CommandLog = {
    schemaVersion: 'bidvia-client-task10-command-log/v1',
    attemptId: TASK10_AUTHORITY.attemptId,
    commands: [
      {
        command: 'npm test',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:30.000Z',
        endedAt: '2026-07-19T07:15:40.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
      {
        command: 'npm run typecheck',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:41.000Z',
        endedAt: '2026-07-19T07:15:45.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
      {
        command: 'npm run build',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:46.000Z',
        endedAt: '2026-07-19T07:15:50.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
      {
        command: 'npm run validate',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:51.000Z',
        endedAt: '2026-07-19T07:15:54.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
      {
        command: 'npm run validate:release-readiness',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:55.000Z',
        endedAt: '2026-07-19T07:15:57.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
      {
        command: 'npm run validate:release-gate',
        cwd: 'frozen-client-root',
        startedAt: '2026-07-19T07:15:58.000Z',
        endedAt: '2026-07-19T07:16:00.000Z',
        status: 'executed',
        exitCode: 0,
        skippedDueTo: null,
      },
    ],
  };

  const rows: Task10ScenarioRow[] = [
    {
      scenarioFamily: 'session-access' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
      sourceObject: 'admin-session-bootstrap',
      targetObject: 'rehearsal-run-identity',
      proofClass: 'session-access-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreHandoffRunbookUrl, TASK10_AUTHORITY.corePreflightUrl].sort(),
      privateEvidenceHandles: [handles[0]],
      privateEvidenceAttestations: [{ handle: handles[0], sourceClass: 'preflight', verified: true, verifiedAt: '2026-07-19T07:16:01.000Z' }],
      result: 'passed' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:01.000Z',
      reasonCodes: ['authority-identity-match'],
    },
    {
      scenarioFamily: 'readiness' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'GET /readyz request:readiness:001',
      sourceObject: 'runtime-readyz',
      targetObject: 'runtime-identity-check',
      proofClass: 'readiness-runtime-proof',
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [handles[1]],
      privateEvidenceAttestations: [{ handle: handles[1], sourceClass: 'runtime', verified: true, verifiedAt: '2026-07-19T07:16:02.000Z' }],
      result: 'passed' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:02.000Z',
      reasonCodes: ['readyz-markers-match'],
    },
    {
      scenarioFamily: 'readiness' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
      sourceObject: 'reset-freshness-inspection',
      targetObject: 'reset-proof',
      proofClass: 'readiness-reset-proof',
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [handles[2]],
      privateEvidenceAttestations: [{ handle: handles[2], sourceClass: 'reset', verified: true, verifiedAt: '2026-07-19T07:16:03.000Z' }],
      result: 'passed' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:03.000Z',
      reasonCodes: ['reset-schema-ready'],
    },
    {
      scenarioFamily: 'dispatch' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
      sourceObject: 'registration-bound-dispatch',
      targetObject: 'persisted-dispatch-readback',
      proofClass: 'dispatch-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [handles[3]],
      privateEvidenceAttestations: [{ handle: handles[3], sourceClass: 'success-001', verified: true, verifiedAt: '2026-07-19T07:16:04.000Z' }],
      result: 'blocked' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:04.000Z',
      reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
    },
    {
      scenarioFamily: 'replay-recovery' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001',
      sourceObject: 'rollback-request',
      targetObject: 'recovery-lineage',
      proofClass: 'recovery-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [handles[4]],
      privateEvidenceAttestations: [{ handle: handles[4], sourceClass: 'recovery-001', verified: true, verifiedAt: '2026-07-19T07:16:05.000Z' }],
      result: 'blocked' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:05.000Z',
      reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
    },
    {
      scenarioFamily: 'replay-recovery' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002',
      sourceObject: 'reuse-readback',
      targetObject: 'distinct-current-execution-ids',
      proofClass: 'reuse-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [handles[5]],
      privateEvidenceAttestations: [{ handle: handles[5], sourceClass: 'success-002-reuse', verified: true, verifiedAt: '2026-07-19T07:16:06.000Z' }],
      result: 'blocked' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:06.000Z',
      reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
    },
    {
      scenarioFamily: 'result-submission' as Task10ScenarioFamily,
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
      sourceObject: 'commercial-action-execution',
      targetObject: 'provider-receipt-evidence',
      proofClass: 'result-submission-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [handles[6]],
      privateEvidenceAttestations: [{ handle: handles[6], sourceClass: 'producer-contract-probe', verified: true, verifiedAt: '2026-07-19T07:16:07.000Z' }],
      result: 'blocked' as Task10Conclusion,
      timestamp: '2026-07-19T07:16:07.000Z',
      reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
    },
  ];

  const scenarioMatrix: Task10ScenarioMatrix = {
    schemaVersion: 'bidvia-client-task10-scenario-matrix/v1',
    attemptId: TASK10_AUTHORITY.attemptId,
    generatedAt: GENERATED_AT,
    requiredFamilies: [...TASK10_REQUIRED_SCENARIO_FAMILIES],
    summary: {
      requiredFamilyCount: 5,
      rowCount: 7,
      passedCount: 3,
      blockedCount: 4,
      missingFamilies: [],
    },
    scenarios: rows,
  };

  const secretReview: Task10SecretReview = {
    schemaVersion: 'bidvia-client-task10-secret-review/v1',
    status: 'passed',
    candidateStatus: 'blocked',
    scope: {
      contentFiles: [...TASK10_CONTENT_FILES],
      wrapperFiles: [...buildTask10WrapperFiles(PACKAGE_NAME)],
      privateSourceValuesPublished: false,
    },
    scannedFiles: [...TASK10_CONTENT_FILES],
    prohibitedValueFamilies: [...TASK10_PROHIBITED_VALUE_FAMILIES],
    findings: [
      { code: 'redacted-sensitive-values', family: 'absolute local paths', count: 3 },
      { code: 'redacted-sensitive-values', family: 'request and response bodies', count: 7 },
    ],
    rawProducerOutputsPublished: false,
    rawLogsPublished: false,
  };

  const receipt: Task10PublicationReceipt = {
    schemaVersion: 'bidvia-client-task10-publication/v1',
    publicationState: 'published_for_review',
    attemptId: TASK10_AUTHORITY.attemptId,
    clientOwnedConclusion: 'blocked',
    issueUrl: TASK10_AUTHORITY.issueUrl,
    packageDirectory: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}`,
    conclusionPath: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}/client-conclusion.json`,
    conclusionSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    archivePath: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}.tar.gz`,
    archiveSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    archiveSizeBytes: 4096,
    internalHashManifest: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}/SHA256SUMS.txt`,
    internalHashManifestSha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    validation: {
      authorityVerified: true,
      commandsVerified: true,
      scenariosVerified: true,
      privateHandleAttestationsVerified: true,
      secretReviewVerified: true,
      packageMembershipVerified: true,
      internalHashesVerified: true,
      archiveVerified: true,
      receiptBindingsVerified: true,
    },
    nonClaims: [...TASK10_NON_CLAIMS],
  };

  return {
    conclusion,
    fingerprint,
    commandLog,
    scenarioMatrix,
    secretReview,
    receipt,
  };
}

test('Task 10 frozen authority constants, exported aliases, and wrapper prefix match the approved attempt-007 contract', () => {
  assert.equal(TASK10_AUTHORITY.attemptId, 'attempt-2026-07-20-task10-postmerge-007');
  assert.equal(TASK10_AUTHORITY.issueUrl, 'https://github.com/Bidvia/bidvia-agent-client/issues/8#issuecomment-5020392826');
  assert.equal(TASK10_AUTHORITY.coreRuntimeSha, '0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9');
  assert.equal(TASK10_AUTHORITY.coreEvidenceCommit, '5ab02058491960c305162091316d65e1ffa97347');
  assert.equal(TASK10_AUTHORITY.corePublicationMergeSha, '8957aaff35436621439f9a62a741c522e95423c8');
  assert.equal(TASK10_AUTHORITY.coreExecutionEvidencePath, 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/core-execution-evidence.json');
  assert.equal(TASK10_AUTHORITY.coreExecutionEvidenceSha256, 'c68a783433f8d58c59949a2ab496fc9e3ca1b42fd0b0f0318ebfb81576dc3980');
  assert.equal(TASK10_AUTHORITY.bundleManifestPath, 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/bundle-manifest.json');
  assert.equal(TASK10_AUTHORITY.bundleManifestSha256, '8141b41945e79bd0dec4eb48cb4db34cbebb3bd810476d7b8863b591336e8b41');
  assert.equal(TASK10_AUTHORITY.coreArchivePrefix, 'bidvia-core-task10-postmerge-007/');
  assert.equal(TASK10_AUTHORITY.coreArchiveRecipe, 'git archive --format=tar.gz --prefix=bidvia-core-task10-postmerge-007/ 5ab02058491960c305162091316d65e1ffa97347 docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output');
  assert.equal(TASK10_AUTHORITY.coreArchiveSha256, '90360fc749b6df227b2935ea115021f0d60e9f0afce6b3eb7169d2dcd90b0563');
  assert.equal(TASK10_AUTHORITY.corePreflightPath, 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-output/preflight-artifact.json');
  assert.equal(TASK10_AUTHORITY.corePreflightSha256, '45139bf82f6ba33793855d03442fbd939e7dbe82f565e5b5ac6a30e8150f27bf');
  assert.equal(TASK10_AUTHORITY.reusablePacketWrapperPath, 'docs/org/review-records/artifacts/attempt-2026-07-20-task10-postmerge-007-inputs/reusable-packet.json');
  assert.equal(TASK10_AUTHORITY.reusablePacketWrapperSha256, '96d04e1e77f895db916c94170ee34216bf63422c62711cb06130f30a173b92f1');
  assert.equal(TASK10_AUTHORITY.reusablePacketEmbeddedArtifactSha256, '0ba97954370ef8f2e362f77dcb5abac5c24d8c8eef83116a2e783307f0cd6210');
  assert.deepEqual(TASK10_AUTHORITY.reusablePacketSourceRefs, [
    'core:0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9:docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json:53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093',
  ]);
  assert.deepEqual(TASK10_AUTHORITY.selectedReusableRefs, [
    'business-method-atom:method-1',
    'lineage-unit:c1-method-1-publish-lineage',
    'rules_template:chemical-match-rule-baseline',
    'evidence-shape:success-001',
  ]);
  assert.equal(TASK10_AUTHORITY.selectedSourcePacketPath, 'docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json');
  assert.equal(TASK10_AUTHORITY.selectedSourcePacketSha256, '53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093');
  assert.equal(TASK10_AUTHORITY.coreBundlePath, TASK10_AUTHORITY.coreExecutionEvidencePath);
  assert.equal(TASK10_AUTHORITY.coreBundleSha256, TASK10_AUTHORITY.coreExecutionEvidenceSha256);
  assert.equal(TASK10_AUTHORITY.packageIdentities.core, 'bidvia-d2-ws6-t1-runtime@0.0.0');
  assert.equal(TASK10_AUTHORITY.packageIdentities.client, '@bidvia/client@1.0.0');
  assert.equal(TASK10_AUTHORITY.packageIdentities.site, 'bidvia-site@0.1.0');
  assert.equal(TASK10_AUTHORITY.lockfileSha256.core, '504007a7fb70616df1409eb2e003a3470ea6e23d990ea61d8eea195a0a1fce62');
  assert.equal(TASK10_AUTHORITY.lockfileSha256.client, '92544096de62a366c66ba7c307ed6fa3ab9d2890bd7a6d6220adb4a0d7f627c6');
  assert.equal(TASK10_AUTHORITY.lockfileSha256.site, 'a0ef0825f04cd9c06bba396f8eff1bda32a557cf77f3c69ecd01ecb99b026732');
  assert.equal(TASK10_AUTHORITY.checkoutBranches.producer, 'main');
  assert.equal(TASK10_AUTHORITY.checkoutUpstreams.producer, 'origin/main');
  assert.equal(TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker, '0b3f266f2c087fb7d808bb3f0ddb57ce86173cc9');
  assert.equal(TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker, 'task10-runtime-0b3f266');
  assert.equal(TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker, 'task10-bootstrap-0b3f266');
  assert.equal(TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker, 'task10-scenario-0b3f266');
  assert.equal(TASK10_AUTHORITY.providerFixtureIdentity, 'provider-fixture:haisi-wms:task10');
  assert.equal(TASK10_AUTHORITY.providerProtocolVersion, 'task10-local-http-v1');
  assert.deepEqual(TASK10_AUTHORITY.ports, {
    postgres: 59625,
    runtime: 59626,
    operator: 59627,
    fixture: 59628,
  });
  assert.equal(TASK10_AUTHORITY.composeProject, 'bidvia-task10-attempt-2026-07-20-task10-postmerge-007');
  assert.deepEqual(TASK10_AUTHORITY.containerNames, [
    'bidvia-task10-attempt-2026-07-20-task10-postmerge-007-runtime',
    'bidvia-task10-attempt-2026-07-20-task10-postmerge-007-postgres',
    'bidvia-task10-attempt-2026-07-20-task10-postmerge-007-fixture',
    'bidvia-task10-attempt-2026-07-20-task10-postmerge-007-operator',
  ]);
  assert.equal(TASK10_AUTHORITY.networkIdentity, 'bidvia-task10-attempt-2026-07-20-task10-postmerge-007_default');
  assert.equal(TASK10_AUTHORITY.coreHandoffRunbookUrl, 'https://github.com/Bidvia/bidvia-main/blob/8957aaff35436621439f9a62a741c522e95423c8/docs/runbooks/merged-main-reproducibility-client-handoff.md');
  assert.deepEqual(TASK10_REQUIRED_SCENARIO_FAMILIES, ['session-access', 'readiness', 'dispatch', 'replay-recovery', 'result-submission']);
  assert.deepEqual(REQUIRED_TASK10_SCENARIO_FAMILIES, TASK10_REQUIRED_SCENARIO_FAMILIES);
  assert.deepEqual(TASK10_CONTENT_FILES, ['README.md', 'client-conclusion.json', 'client-fingerprint.json', 'command-log.json', 'scenario-matrix.json']);
  assert.deepEqual(TASK10_PRIVATE_SOURCE_CLASSES, ['preflight', 'runtime', 'reset', 'success-001', 'recovery-001', 'success-002-reuse', 'producer-contract-probe', 'authority-bundle']);
  assert.deepEqual(TASK10_PROHIBITED_VALUE_FAMILIES, ['admin session ids', 'account session ids', 'passwords', 'tokens', 'credential secret refs', 'fixture credentials', 'email addresses', 'generated account identifiers', 'request and response bodies', 'absolute local paths']);
  assert.equal(TASK10_AUTHORITY.authorityUrls[0], 'https://github.com/Bidvia/bidvia-agent-client/issues/8#issuecomment-5020392826');
  assert.ok(TASK10_AUTHORITY.authorityUrls.includes(TASK10_AUTHORITY.coreExecutionEvidenceUrl));
  assert.ok(TASK10_AUTHORITY.authorityUrls.includes(TASK10_AUTHORITY.bundleManifestUrl));
  assert.ok(TASK10_AUTHORITY.authorityUrls.includes(TASK10_AUTHORITY.corePreflightUrl));
  assert.ok(TASK10_AUTHORITY.authorityUrls.includes(TASK10_AUTHORITY.reusablePacketWrapperUrl));
  assert.ok(TASK10_AUTHORITY.authorityUrls.includes(TASK10_AUTHORITY.selectedSourcePacketUrl));
  assert.equal(buildTask10PackageName(RUN_STARTED_AT), PACKAGE_NAME);
  assert.deepEqual(buildTask10WrapperFiles(PACKAGE_NAME), [
    'secret-review.json',
    'SHA256SUMS.txt',
    `${PACKAGE_NAME}.tar.gz`,
    `${PACKAGE_NAME}.publication.json`,
  ]);
});

test('Task 10 builders emit the exact approved wire schemas and key order for conclusion, fingerprint, command log, scenarios, secret review, and receipt', () => {
  const fixture = buildFixture();

  assert.deepEqual(buildTask10ClientConclusionWire(fixture.conclusion), {
    schema_version: 'bidvia-client-task10-owner-conclusion/v1',
    evidence_owner: 'client',
    attempt_id: TASK10_AUTHORITY.attemptId,
    conclusion: 'blocked',
    reason_codes: ['core-producer-private-root-contract-unsatisfied', 'result-submission-blocked'],
    missing_evidence: ['dispatch owner-run materialization output', 'result-submission provider receipt continuity'],
    authority_ref: {
      issue_url: TASK10_AUTHORITY.issueUrl,
      core_handoff_runbook_url: TASK10_AUTHORITY.coreHandoffRunbookUrl,
      core_bundle_url: TASK10_AUTHORITY.coreBundleUrl,
      core_bundle_path: TASK10_AUTHORITY.coreBundlePath,
      core_bundle_sha256: TASK10_AUTHORITY.coreBundleSha256,
      core_preflight_path: TASK10_AUTHORITY.corePreflightPath,
      core_preflight_sha256: TASK10_AUTHORITY.corePreflightSha256,
    },
    non_claims: [...TASK10_NON_CLAIMS],
  });

  assert.deepEqual(buildTask10ClientFingerprintWire(fixture.fingerprint), {
    schema_version: 'bidvia-client-task10-fingerprint/v1',
    repository: 'Bidvia/bidvia-agent-client',
    attempt_id: TASK10_AUTHORITY.attemptId,
    client_baseline_sha: TASK10_AUTHORITY.clientBaselineSha,
    core_runtime_sha: TASK10_AUTHORITY.coreRuntimeSha,
    site_baseline_sha: TASK10_AUTHORITY.siteBaselineSha,
    core_evidence_publication_commit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
    core_bundle_path: TASK10_AUTHORITY.coreBundlePath,
    core_bundle_sha256: TASK10_AUTHORITY.coreBundleSha256,
    package_identities: {
      core: TASK10_AUTHORITY.packageIdentities.core,
      client: TASK10_AUTHORITY.packageIdentities.client,
      site: TASK10_AUTHORITY.packageIdentities.site,
    },
    lockfile_sha256: {
      core: TASK10_AUTHORITY.lockfileSha256.core,
      client: TASK10_AUTHORITY.lockfileSha256.client,
      site: TASK10_AUTHORITY.lockfileSha256.site,
    },
    runtime_markers: {
      source_main_commit_marker: TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker,
      runtime_reported_version_marker: TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker,
      bootstrap_package_version_marker: TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker,
      scenario_package_version_marker: TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker,
      provider_fixture_identity: TASK10_AUTHORITY.providerFixtureIdentity,
      provider_protocol_version: TASK10_AUTHORITY.providerProtocolVersion,
      postgres_port: 59625,
      runtime_port: 59626,
      operator_port: 59627,
      fixture_port: 59628,
    },
    tool_versions: {
      node: 'v24.6.0',
      npm: '11.5.1',
      docker: '28.4.0',
      docker_compose: '2.39.4-desktop.1',
      postgres_client: '15.13',
    },
    checkout_proofs: {
      core_runtime: {
        head_commit: TASK10_AUTHORITY.coreRuntimeSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        detached_head: false,
        porcelain_status: 'empty',
        lockfile_sha256: TASK10_AUTHORITY.lockfileSha256.core,
      },
      client_validation: {
        head_commit: TASK10_AUTHORITY.clientBaselineSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        detached_head: false,
        porcelain_status: 'empty',
        lockfile_sha256: TASK10_AUTHORITY.lockfileSha256.client,
      },
      site_validation: {
        head_commit: TASK10_AUTHORITY.siteBaselineSha,
        branch: 'main',
        upstream_ref: 'origin/main',
        detached_head: false,
        porcelain_status: 'empty',
        lockfile_sha256: TASK10_AUTHORITY.lockfileSha256.site,
      },
      core_evidence: {
        head_commit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: null,
        upstream_ref: null,
        detached_head: true,
        porcelain_status: 'empty',
        lockfile_sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
    run_started_at: RUN_STARTED_AT,
  });

  assert.deepEqual(buildTask10CommandLogWire(fixture.commandLog), {
    schema_version: 'bidvia-client-task10-command-log/v1',
    attempt_id: TASK10_AUTHORITY.attemptId,
    commands: [
      { command: 'npm test', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:30.000Z', ended_at: '2026-07-19T07:15:40.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
      { command: 'npm run typecheck', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:41.000Z', ended_at: '2026-07-19T07:15:45.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
      { command: 'npm run build', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:46.000Z', ended_at: '2026-07-19T07:15:50.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
      { command: 'npm run validate', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:51.000Z', ended_at: '2026-07-19T07:15:54.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
      { command: 'npm run validate:release-readiness', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:55.000Z', ended_at: '2026-07-19T07:15:57.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
      { command: 'npm run validate:release-gate', cwd: 'frozen-client-root', started_at: '2026-07-19T07:15:58.000Z', ended_at: '2026-07-19T07:16:00.000Z', status: 'executed', exit_code: 0, skipped_due_to: null },
    ],
  });

  assert.deepEqual(buildTask10ScenarioMatrixWire(fixture.scenarioMatrix), {
    schema_version: 'bidvia-client-task10-scenario-matrix/v1',
    attempt_id: TASK10_AUTHORITY.attemptId,
    generated_at: GENERATED_AT,
    required_families: [...TASK10_REQUIRED_SCENARIO_FAMILIES],
    summary: {
      required_family_count: 5,
      row_count: 7,
      passed_count: 3,
      blocked_count: 4,
      missing_families: [],
    },
    scenarios: fixture.scenarioMatrix.scenarios.map((row) => ({
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
        verified: true,
        verified_at: attestation.verifiedAt,
      })),
      result: row.result,
      timestamp: row.timestamp,
      reason_codes: [...row.reasonCodes],
    })),
  });

  assert.deepEqual(buildTask10SecretReviewWire(fixture.secretReview), {
    schema_version: 'bidvia-client-task10-secret-review/v1',
    status: 'passed',
    candidate_status: 'blocked',
    scope: {
      content_files: [...TASK10_CONTENT_FILES],
      wrapper_files: [...buildTask10WrapperFiles(PACKAGE_NAME)],
      private_source_values_published: false,
    },
    scanned_files: [...TASK10_CONTENT_FILES],
    prohibited_value_families: [...TASK10_PROHIBITED_VALUE_FAMILIES],
    findings: [
      { code: 'redacted-sensitive-values', family: 'absolute local paths', count: 3 },
      { code: 'redacted-sensitive-values', family: 'request and response bodies', count: 7 },
    ],
    raw_producer_outputs_published: false,
    raw_logs_published: false,
  });

  assert.deepEqual(buildTask10PublicationReceiptWire(fixture.receipt), {
    schema_version: 'bidvia-client-task10-publication/v1',
    publication_state: 'published_for_review',
    attempt_id: TASK10_AUTHORITY.attemptId,
    client_owned_conclusion: 'blocked',
    issue_url: TASK10_AUTHORITY.issueUrl,
    package_directory: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}`,
    conclusion_path: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}/client-conclusion.json`,
    conclusion_sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    archive_path: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}.tar.gz`,
    archive_sha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    archive_size_bytes: 4096,
    internal_hash_manifest: `provider-proof-terminal-client-validation-artifacts/${PACKAGE_NAME}/SHA256SUMS.txt`,
    internal_hash_manifest_sha256: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    validation: {
      authority_verified: true,
      commands_verified: true,
      scenarios_verified: true,
      private_handle_attestations_verified: true,
      secret_review_verified: true,
      package_membership_verified: true,
      internal_hashes_verified: true,
      archive_verified: true,
      receipt_bindings_verified: true,
    },
    non_claims: [...TASK10_NON_CLAIMS],
  });
});

test('Task 10 parsers and guards reject extras, wrong tuples, malformed handles, duplicate attestations, wrong command gates, incomplete rows, and minimum family undercounts', () => {
  const fixture = buildFixture();
  const conclusionWire = buildTask10ClientConclusionWire(fixture.conclusion);
  const fingerprintWire = buildTask10ClientFingerprintWire(fixture.fingerprint);
  const commandLogWire = buildTask10CommandLogWire(fixture.commandLog);
  const scenarioMatrixWire = buildTask10ScenarioMatrixWire(fixture.scenarioMatrix);
  const secretReviewWire = buildTask10SecretReviewWire(fixture.secretReview);
  const receiptWire = buildTask10PublicationReceiptWire(fixture.receipt);

  assert.deepEqual(parseTask10ClientConclusionWire(conclusionWire), conclusionWire);
  assert.deepEqual(parseTask10ClientFingerprintWire(fingerprintWire), fingerprintWire);
  assert.deepEqual(parseTask10CommandLogWire(commandLogWire), commandLogWire);
  assert.deepEqual(parseTask10ScenarioMatrixWire(scenarioMatrixWire), scenarioMatrixWire);
  assert.deepEqual(parseTask10SecretReviewWire(secretReviewWire), secretReviewWire);
  assert.deepEqual(parseTask10PublicationReceiptWire(receiptWire), receiptWire);
  assert.deepEqual(requireCompleteTask10ScenarioRow(scenarioMatrixWire.scenarios[0]!), scenarioMatrixWire.scenarios[0]);

  const requiredRow = scenarioMatrixWire.scenarios[0]!;
  for (const key of ['scenario_family', 'tenant', 'actor', 'company', 'authority', 'request', 'source_object', 'target_object', 'proof_class', 'evidence_refs', 'private_evidence_handles', 'private_handle_attestations', 'result', 'timestamp', 'reason_codes'] as const) {
    const candidate = { ...requiredRow } as Partial<Task10ScenarioRowWire>;
    delete candidate[key];
    assert.throws(() => requireCompleteTask10ScenarioRow(candidate), new RegExp(key));
  }

  assert.throws(() => parseTask10ClientConclusionWire({ ...conclusionWire, issue_url: TASK10_AUTHORITY.issueUrl }), /unexpected key/i);
  assert.throws(() => parseTask10ClientConclusionWire({
    schema_version: conclusionWire.schema_version,
    evidence_owner: conclusionWire.evidence_owner,
    attempt_id: conclusionWire.attempt_id,
    conclusion: conclusionWire.conclusion,
    reason_codes: conclusionWire.reason_codes,
    missing_evidence: conclusionWire.missing_evidence,
    authorityRef: conclusionWire.authority_ref,
    non_claims: conclusionWire.non_claims,
  }), /unexpected key|authority_ref/i);
  assert.throws(() => parseTask10ClientConclusionWire({ ...conclusionWire, conclusion: null }), /conclusion/i);
  assert.throws(() => parseTask10ClientFingerprintWire({ ...fingerprintWire, tool_versions: { ...fingerprintWire.tool_versions, postgres_client: '' } }), /postgres_client/i);
  assert.throws(() => parseTask10ClientFingerprintWire({ ...fingerprintWire, scope: 'wrong' }), /unexpected key/i);
  assert.throws(() => parseTask10ClientFingerprintWire({ ...fingerprintWire, runtime_markers: { ...fingerprintWire.runtime_markers, postgres_port: 59699 } }), /postgres_port/i);
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_runtime: { ...fingerprintWire.checkout_proofs.core_runtime, branch: null } } }).checkout_proofs.core_runtime.branch,
    null,
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_runtime: { ...fingerprintWire.checkout_proofs.core_runtime, upstream_ref: null } } }).checkout_proofs.core_runtime.upstream_ref,
    null,
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_runtime: { ...fingerprintWire.checkout_proofs.core_runtime, porcelain_status: 'non-empty' } } }).checkout_proofs.core_runtime.porcelain_status,
    'non-empty',
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_runtime: { ...fingerprintWire.checkout_proofs.core_runtime, lockfile_sha256: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' } } }).checkout_proofs.core_runtime.lockfile_sha256,
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_evidence: { ...fingerprintWire.checkout_proofs.core_evidence, branch: 'main' } } }).checkout_proofs.core_evidence.branch,
    'main',
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_evidence: { ...fingerprintWire.checkout_proofs.core_evidence, upstream_ref: 'origin/main' } } }).checkout_proofs.core_evidence.upstream_ref,
    'origin/main',
  );
  assert.deepEqual(
    parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_evidence: { ...fingerprintWire.checkout_proofs.core_evidence, head_commit: 'ffffffffffffffffffffffffffffffffffffffff' } } }).checkout_proofs.core_evidence.head_commit,
    'ffffffffffffffffffffffffffffffffffffffff',
  );
  assert.throws(() => parseTask10ClientFingerprintWire({ ...fingerprintWire, checkout_proofs: { ...fingerprintWire.checkout_proofs, core_runtime: { ...fingerprintWire.checkout_proofs.core_runtime, porcelain_status: 'dirty' } } }), /porcelain_status/i);
  assert.throws(() => parseTask10CommandLogWire({ ...commandLogWire, commands: commandLogWire.commands.slice(1) }), /six required command rows/i);
  assert.throws(() => parseTask10CommandLogWire({ ...commandLogWire, commands: [{ ...commandLogWire.commands[0], command: 'npm run build' }, ...commandLogWire.commands.slice(1)] }), /command/i);
  assert.throws(() => requireCompleteTask10ScenarioRow({ ...requiredRow, authority: '' }), /authority/i);
  assert.throws(() => requireCompleteTask10ScenarioRow({ ...requiredRow, private_evidence_handles: ['sha256:not-a-real-hash'], private_handle_attestations: [{ handle: 'sha256:not-a-real-hash', source_class: 'preflight', verified: true, verified_at: '2026-07-19T07:16:01.000Z' }] }), /private_evidence_handles/i);
  assert.throws(() => requireCompleteTask10ScenarioRow({ ...requiredRow, private_evidence_handles: [requiredRow.private_evidence_handles[0]!, requiredRow.private_evidence_handles[0]!], private_handle_attestations: [requiredRow.private_handle_attestations[0]!, requiredRow.private_handle_attestations[0]!] }), /duplicate/i);
  assert.throws(() => parseTask10ScenarioMatrixWire({ ...scenarioMatrixWire, scenarios: [scenarioMatrixWire.scenarios[1]!, scenarioMatrixWire.scenarios[0]!, ...scenarioMatrixWire.scenarios.slice(2)] }), /sorted/i);
  assert.throws(() => parseTask10ScenarioMatrixWire({ ...scenarioMatrixWire, generated_at: '', }), /generated_at/i);
  assert.throws(() => parseTask10ScenarioMatrixWire({ ...scenarioMatrixWire, scenarios: scenarioMatrixWire.scenarios.filter((row) => row.scenario_family !== 'readiness') }), /minimum row count/i);
  assert.throws(() => parseTask10ScenarioMatrixWire({ ...scenarioMatrixWire, required_families: ['readiness', 'session-access', 'dispatch', 'replay-recovery', 'result-submission'] }), /required_families/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, findings: [secretReviewWire.findings[1]!, secretReviewWire.findings[0]!] }), /sorted/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, findings: [{ code: 'redacted-sensitive-values', family: '', count: 1 }] }), /family/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scope: { ...secretReviewWire.scope, content_files: [...secretReviewWire.scope.content_files].reverse() } }), /content_files/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scanned_files: [...secretReviewWire.scanned_files, 'secret-review.json'] }), /scanned_files/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, prohibited_value_families: [...secretReviewWire.prohibited_value_families].reverse() }), /prohibited_value_families/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scope: { ...secretReviewWire.scope, wrapper_files: ['secret-review.json', 'SHA256SUMS.txt', 'wrong.tar.gz', 'wrong.publication.json'] } }), /wrapper_files/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scope: { ...secretReviewWire.scope, wrapper_files: ['secret-review.json', 'SHA256SUMS.txt', 'client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20269919T071530Z.tar.gz', 'client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20269919T071530Z.publication.json'] } }), /wrapper_files|timestamp|UTC/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scope: { ...secretReviewWire.scope, wrapper_files: ['secret-review.json', 'SHA256SUMS.txt', 'client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20260719T071530Z-extra.tar.gz', 'client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20260719T071530Z-extra.publication.json'] } }), /wrapper_files|prefix/i);
  assert.throws(() => parseTask10SecretReviewWire({ ...secretReviewWire, scope: { ...secretReviewWire.scope, wrapper_files: ['secret-review.json', 'SHA256SUMS.txt', '../escape.tar.gz', '../escape.publication.json'] } }), /wrapper_files|prefix/i);
  assert.throws(() => parseTask10PublicationReceiptWire({ ...receiptWire, non_claims: [...receiptWire.non_claims].reverse() }), /non_claims/i);
  assert.throws(() => parseTask10PublicationReceiptWire({ ...receiptWire, validation: { ...receiptWire.validation, focused_task10_tests: true } }), /unexpected key/i);
});

test('Task 10 builders reject contradictory frozen booleans, invalid package names and timestamps, and invalid numeric values', () => {
  const fixture = buildFixture();

  const contradictoryScenarioMatrix = {
    ...fixture.scenarioMatrix,
    scenarios: fixture.scenarioMatrix.scenarios.map((row, index) => index === 0
      ? {
          ...row,
          privateEvidenceAttestations: [{
            ...row.privateEvidenceAttestations[0]!,
            verified: false,
          }],
        }
      : row),
  };
  assert.throws(() => buildTask10ScenarioMatrixWire(contradictoryScenarioMatrix as unknown as Task10ScenarioMatrix), /verified/i);

  const contradictorySecretScope = {
    ...fixture.secretReview,
    scope: {
      ...fixture.secretReview.scope,
      privateSourceValuesPublished: true,
    },
  };
  assert.throws(() => buildTask10SecretReviewWire(contradictorySecretScope as unknown as Task10SecretReview), /private_source_values_published/i);

  const contradictoryRawOutputs = {
    ...fixture.secretReview,
    rawProducerOutputsPublished: true,
  };
  assert.throws(() => buildTask10SecretReviewWire(contradictoryRawOutputs as unknown as Task10SecretReview), /raw_producer_outputs_published/i);

  const contradictoryRawLogs = {
    ...fixture.secretReview,
    rawLogsPublished: true,
  };
  assert.throws(() => buildTask10SecretReviewWire(contradictoryRawLogs as unknown as Task10SecretReview), /raw_logs_published/i);

  assert.throws(() => buildTask10PackageName('2026-99-19T07:15:30.000Z'), /UTC datetime|timestamp/i);
  assert.throws(() => buildTask10WrapperFiles('../escape'), /package prefix|packageName/i);
  assert.throws(() => buildTask10WrapperFiles('client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-2026-07-19T071530Z'), /package prefix|packageName/i);
  assert.throws(() => buildTask10WrapperFiles('client-task10-reproducibility-attempt-2026-07-20-task10-postmerge-007-20260719T071530Z-extra'), /package prefix|packageName/i);

  assert.throws(() => buildTask10CommandLogWire({
    ...fixture.commandLog,
    commands: [{
      ...fixture.commandLog.commands[0]!,
      exitCode: -1,
    }, ...fixture.commandLog.commands.slice(1)],
  }), /exit_code/i);

  assert.throws(() => buildTask10SecretReviewWire({
    ...fixture.secretReview,
    findings: [{
      ...fixture.secretReview.findings[0]!,
      count: -1,
    }, ...fixture.secretReview.findings.slice(1)],
  }), /count/i);

  assert.throws(() => buildTask10PublicationReceiptWire({
    ...fixture.receipt,
    archiveSizeBytes: 0,
  }), /archive_size_bytes/i);
});

test('Task 10 contract parsing accepts authority-bundle source class and uses code-unit canonical ordering', () => {
  const fixture = buildFixture();
  const scenarioRow = buildTask10ScenarioMatrixWire(fixture.scenarioMatrix).scenarios[3]!;
  const authorityBundleRow = {
    ...scenarioRow,
    private_evidence_handles: ['sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    private_handle_attestations: [{
      handle: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      source_class: 'authority-bundle',
      verified: true,
      verified_at: '2026-07-19T07:16:04.000Z',
    }],
  };
  assert.equal(requireCompleteTask10ScenarioRow(authorityBundleRow).private_handle_attestations[0]?.source_class, 'authority-bundle');

  const fingerprintWire = buildTask10ClientFingerprintWire(fixture.fingerprint);
  const sorted = parseTask10ClientFingerprintWire({
    ...fingerprintWire,
    checkout_proofs: {
      ...fingerprintWire.checkout_proofs,
      core_runtime: {
        ...fingerprintWire.checkout_proofs.core_runtime,
        porcelain_status: 'non-empty',
      },
    },
  });
  assert.equal(sorted.checkout_proofs.core_runtime.porcelain_status, 'non-empty');

  assert.throws(() => requireCompleteTask10ScenarioRow({
    ...authorityBundleRow,
    private_handle_attestations: [{
      handle: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      source_class: 'not-real-class',
      verified: true,
      verified_at: '2026-07-19T07:16:04.000Z',
    }],
  }), /source_class/i);

  const sortedConclusion = buildTask10ClientConclusionWire({
    ...fixture.conclusion,
    reasonCodes: ['z', 'é', 'a', 'ß'],
    missingEvidence: ['z', 'é', 'a', 'ß'],
  });
  assert.deepEqual(sortedConclusion.reason_codes, ['a', 'z', 'ß', 'é']);
  assert.deepEqual(sortedConclusion.missing_evidence, ['a', 'z', 'ß', 'é']);
});
