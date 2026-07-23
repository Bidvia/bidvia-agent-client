import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import test from 'node:test';

import {
  TASK10_AUTHORITY,
  TASK10_CONTENT_FILES,
  TASK10_NON_CLAIMS,
  TASK10_REQUIRED_SCENARIO_FAMILIES,
  buildTask10PackageName,
  type Task10ClientFingerprint,
  type Task10CommandRow,
  type Task10ScenarioRow,
} from '../scripts/task10/contracts.ts';
import {
  buildTask10ScenarioRows,
} from '../scripts/task10/scenario-adapter.ts';
import {
  buildDefaultTask10ProhibitedValues,
  buildDefaultTask10ScenarioRowsInput,
  collectTask10ClientFingerprint,
  collectTask10PrivateSources,
  inspectTask10Checkout,
  main,
  parseVerifyTask10ClientReproducibilityArgs,
  runVerifyTask10ClientReproducibility,
  type VerifyTask10ClientReproducibilityArgs,
  type VerifyTask10ClientReproducibilityDependencies,
} from '../scripts/verify-task10-client-reproducibility.ts';
import type {
  Task10CandidatePayload,
  Task10ValidatedPublication,
} from '../scripts/task10/publication.ts';

const RUN_STARTED_AT = '2026-07-19T18:19:20.000Z';

const REQUIRED_FLAGS = [
  '--private-input',
  '--private-output',
  '--private-log-root',
  '--publication-root',
  '--core-checkout',
  '--core-evidence-checkout',
  '--client-checkout',
  '--site-checkout',
  '--core-bundle',
] as const;

type RequiredFlag = (typeof REQUIRED_FLAGS)[number];

type Recorder = {
  stdout: string[];
  stderr: string[];
  order: string[];
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function buildHandle(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${sha256(bytes)}`;
}

function buildAuthorityBundleBytes(): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    preflight_artifact_path: TASK10_AUTHORITY.corePreflightPath,
    preflight_artifact_hash: TASK10_AUTHORITY.corePreflightSha256,
  }));
}

function buildAuthorityPreflightBytes(): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({
    attempt_id: TASK10_AUTHORITY.attemptId,
  }));
}

function buildAuthorityBlockedScenarioRows(runStartedAt: string): Task10ScenarioRow[] {
  const bundleBytes = buildAuthorityBundleBytes();
  const preflightBytes = buildAuthorityPreflightBytes();
  const bundleHandle = buildHandle(bundleBytes);
  const preflightHandle = buildHandle(preflightBytes);
  return [
    {
      scenarioFamily: 'session-access',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
      sourceObject: 'admin-session-bootstrap',
      targetObject: 'rehearsal-run-identity',
      proofClass: 'session-access-proof',
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [preflightHandle],
      privateEvidenceAttestations: [{
        handle: preflightHandle,
        sourceClass: 'preflight',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'readiness',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'GET /readyz request:readiness:001',
      sourceObject: 'runtime-readyz',
      targetObject: 'runtime-identity-check',
      proofClass: 'readiness-runtime-proof',
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [preflightHandle],
      privateEvidenceAttestations: [{
        handle: preflightHandle,
        sourceClass: 'preflight',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'readiness',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
      sourceObject: 'reset-freshness-inspection',
      targetObject: 'reset-proof',
      proofClass: 'readiness-reset-proof',
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [preflightHandle],
      privateEvidenceAttestations: [{
        handle: preflightHandle,
        sourceClass: 'preflight',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'dispatch',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
      sourceObject: 'registration-bound-dispatch',
      targetObject: 'persisted-dispatch-readback',
      proofClass: 'dispatch-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [bundleHandle],
      privateEvidenceAttestations: [{
        handle: bundleHandle,
        sourceClass: 'runtime',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'replay-recovery',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001',
      sourceObject: 'rollback-request',
      targetObject: 'recovery-lineage',
      proofClass: 'recovery-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [bundleHandle],
      privateEvidenceAttestations: [{
        handle: bundleHandle,
        sourceClass: 'runtime',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'replay-recovery',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002',
      sourceObject: 'reuse-readback',
      targetObject: 'distinct-current-execution-ids',
      proofClass: 'reuse-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [bundleHandle],
      privateEvidenceAttestations: [{
        handle: bundleHandle,
        sourceClass: 'runtime',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
    {
      scenarioFamily: 'result-submission',
      tenant: 'tenant:authority-blocked',
      actor: 'actor:authority-blocked',
      company: 'company:authority-blocked',
      authority: TASK10_AUTHORITY.coreBundleUrl,
      request: 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
      sourceObject: 'commercial-action-execution',
      targetObject: 'provider-receipt-evidence',
      proofClass: 'result-submission-proof',
      evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [bundleHandle],
      privateEvidenceAttestations: [{
        handle: bundleHandle,
        sourceClass: 'runtime',
        verified: true as const,
        verifiedAt: runStartedAt,
      }],
      result: 'blocked' as const,
      timestamp: runStartedAt,
      reasonCodes: ['authority-verification-blocked', 'bundle-sha-mismatch'],
    },
  ];
}

function buildVerifiedScenarioRows(runStartedAt: string): Task10ScenarioRow[] {
  return buildAuthorityBlockedScenarioRows(runStartedAt).map((row) => ({
    ...row,
    result: 'passed' as const,
    reasonCodes: [
      row.scenarioFamily === 'session-access'
        ? 'authority-identity-match'
        : row.scenarioFamily === 'dispatch'
          ? 'dispatch-readback-persisted'
          : row.scenarioFamily === 'result-submission'
            ? 'provider-proof-and-receipt-present'
            : row.request.endsWith(':001')
              ? 'readyz-markers-match'
              : row.request.endsWith(':002') && row.scenarioFamily === 'readiness'
                ? 'reset-schema-ready'
                : row.request.endsWith(':001')
                  ? 'recovery-lineage-present'
                  : 'distinct-reuse-truth',
    ],
  }));
}

function buildSanitizedFactsStub(runStartedAt: string) {
  return {
    runIdentity: {
      tenant: 'tenant:task10-owner',
      actor: 'actor:operator-admin',
      company: 'company:owner',
      request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
      sourceObject: 'admin-session-bootstrap',
      targetObject: 'rehearsal-run-identity',
      timestamp: runStartedAt,
      proofClass: 'session-access-proof',
    },
    preflight: {
      requestId: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
      sourceObjectRef: 'admin-session-bootstrap',
      targetObjectRef: 'rehearsal-run-identity',
      proofClass: 'session-access-proof',
      occurredAt: runStartedAt,
      identityMatched: true,
      evidenceRefs: [TASK10_AUTHORITY.coreHandoffRunbookUrl, TASK10_AUTHORITY.corePreflightUrl],
    },
    runtime: {
      requestId: 'GET /readyz request:readiness:001',
      sourceObjectRef: 'runtime-readyz',
      targetObjectRef: 'runtime-identity-check',
      proofClass: 'readiness-runtime-proof',
      occurredAt: runStartedAt,
      identityMatched: true,
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    },
    reset: {
      requestId: 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
      sourceObjectRef: 'reset-freshness-inspection',
      targetObjectRef: 'reset-proof',
      proofClass: 'readiness-reset-proof',
      occurredAt: runStartedAt,
      resetState: 'passed' as const,
      freshBusinessIds: true,
      schemaColumnsComplete: true,
      evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    },
    success001: {
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
        occurredAt: runStartedAt,
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
        occurredAt: runStartedAt,
      },
      readbackPersisted: true,
      providerProofRef: 'provider-proof:present',
      providerReceiptRef: 'provider-receipt:present',
      providerReceiptPersisted: true,
    },
    recovery001: {
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
        occurredAt: runStartedAt,
      },
      hasRecoveryLineage: true,
    },
    success002Reuse: {
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
        occurredAt: runStartedAt,
      },
      isDistinctReuse: true,
    },
  };
}

function buildFingerprint(runStartedAt: string): Task10ClientFingerprint {
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
    packageIdentities: { ...TASK10_AUTHORITY.packageIdentities },
    lockfileSha256: { ...TASK10_AUTHORITY.lockfileSha256 },
    runtimeMarkers: {
      ...TASK10_AUTHORITY.runtimeMarkers,
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
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.core,
      },
      clientValidation: {
        headCommit: TASK10_AUTHORITY.clientBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
      },
      siteValidation: {
        headCommit: TASK10_AUTHORITY.siteBaselineSha,
        branch: 'main',
        upstreamRef: 'origin/main',
        detachedHead: false,
        porcelainStatus: 'empty' as const,
        lockfileSha256: TASK10_AUTHORITY.lockfileSha256.site,
      },
      coreEvidence: {
        headCommit: TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: null,
        upstreamRef: null,
        detachedHead: true,
        porcelainStatus: 'empty' as const,
        lockfileSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
    },
    runStartedAt,
  };
}

function buildCommandRows(exitCodes?: readonly number[]): Task10CommandRow[] {
  const codes = exitCodes ?? [0, 0, 0, 0, 0, 0];
  const commands: readonly Task10CommandRow['command'][] = [
    'npm test',
    'npm run typecheck',
    'npm run build',
    'npm run validate',
    'npm run validate:release-readiness',
    'npm run validate:release-gate',
  ];
  return commands.map((command, index) => ({
    command,
    cwd: 'frozen-client-root',
    startedAt: `2026-07-19T18:19:2${index}.000Z`,
    endedAt: `2026-07-19T18:19:2${index}.000Z`,
    status: 'executed',
    exitCode: codes[index] ?? 0,
    skippedDueTo: null,
  }));
}

function buildCandidatePayloadStub(decision: {
  conclusion: 'passed' | 'blocked';
  reasonCodes: string[];
  missingEvidence: string[];
}): Task10CandidatePayload {
  return {
    packageName: buildTask10PackageName(RUN_STARTED_AT),
    packageMembers: ['README.md'],
    clientConclusion: {
      schemaVersion: 'bidvia-client-task10-owner-conclusion/v1',
      evidenceOwner: 'client',
      attemptId: TASK10_AUTHORITY.attemptId,
      conclusion: decision.conclusion,
      reasonCodes: decision.reasonCodes,
      missingEvidence: decision.missingEvidence,
      authorityRef: {
        issueUrl: TASK10_AUTHORITY.issueUrl,
        coreHandoffRunbookUrl: TASK10_AUTHORITY.coreHandoffRunbookUrl,
        coreBundleUrl: TASK10_AUTHORITY.coreBundleUrl,
        coreBundlePath: TASK10_AUTHORITY.coreBundlePath,
        coreBundleSha256: TASK10_AUTHORITY.coreBundleSha256,
        corePreflightPath: TASK10_AUTHORITY.corePreflightPath,
        corePreflightSha256: TASK10_AUTHORITY.corePreflightSha256,
      },
      nonClaims: [
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
      ],
    },
    checks: {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: false,
      receiptVerified: false,
    },
  };
}

function buildValidatedPublicationStub(
  conclusion: 'passed' | 'blocked',
  mode: 'producer' | 'offline',
): Task10ValidatedPublication {
  return {
    packageName: buildTask10PackageName(RUN_STARTED_AT),
    packageDirectoryPath: 'provider-proof-terminal-client-validation-artifacts/client-task10',
    archivePath: 'provider-proof-terminal-client-validation-artifacts/client-task10.tar.gz',
    receiptPath: 'provider-proof-terminal-client-validation-artifacts/client-task10.publication.json',
    archiveSha256: 'b'.repeat(64),
    archiveSizeBytes: 123,
    receipt: {
      schemaVersion: 'bidvia-client-task10-publication/v1',
      publicationState: 'published_for_review',
      attemptId: TASK10_AUTHORITY.attemptId,
      clientOwnedConclusion: conclusion,
      issueUrl: TASK10_AUTHORITY.issueUrl,
      packageDirectory: 'provider-proof-terminal-client-validation-artifacts/client-task10',
      conclusionPath: 'provider-proof-terminal-client-validation-artifacts/client-task10/client-conclusion.json',
      conclusionSha256: 'a'.repeat(64),
      archivePath: 'provider-proof-terminal-client-validation-artifacts/client-task10.tar.gz',
      archiveSha256: 'b'.repeat(64),
      archiveSizeBytes: 123,
      internalHashManifest: 'provider-proof-terminal-client-validation-artifacts/client-task10/SHA256SUMS.txt',
      internalHashManifestSha256: 'c'.repeat(64),
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
      nonClaims: [
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
      ],
    },
    checks: {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    },
    validationMode: mode,
    privateSourceBytesReverified: mode === 'producer',
  };
}

function buildArgs(rootMap: Record<RequiredFlag, string>): VerifyTask10ClientReproducibilityArgs {
  const argv = REQUIRED_FLAGS.flatMap((flag) => [flag, rootMap[flag]]);
  return parseVerifyTask10ClientReproducibilityArgs(argv);
}

function buildArgv(rootMap: Record<RequiredFlag, string>): string[] {
  return REQUIRED_FLAGS.flatMap((flag) => [flag, rootMap[flag]]);
}

async function createRootHarness() {
  const tempRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'task10-client-reproducibility-')));
  const roots = {
    privateInput: path.join(tempRoot, 'private-input'),
    privateOutput: path.join(tempRoot, 'private-output'),
    privateLogRoot: path.join(tempRoot, 'private-logs'),
    publicationRoot: path.join(tempRoot, 'publication-root'),
    coreCheckout: path.join(tempRoot, 'core-checkout'),
    coreEvidenceCheckout: path.join(tempRoot, 'core-evidence-checkout'),
    clientCheckout: path.join(tempRoot, 'client-checkout'),
    siteCheckout: path.join(tempRoot, 'site-checkout'),
  };
  for (const root of Object.values(roots)) {
    await mkdir(root, { recursive: true, mode: 0o700 });
  }
  const bundlePath = path.join(roots.coreEvidenceCheckout, TASK10_AUTHORITY.coreBundlePath);
  const preflightPath = path.join(roots.coreEvidenceCheckout, TASK10_AUTHORITY.corePreflightPath);
  await mkdir(path.dirname(bundlePath), { recursive: true, mode: 0o700 });
  await mkdir(path.dirname(preflightPath), { recursive: true, mode: 0o700 });
  await writeFile(bundlePath, buildAuthorityBundleBytes(), { mode: 0o600 });
  await writeFile(preflightPath, buildAuthorityPreflightBytes(), { mode: 0o600 });
  return {
    tempRoot,
    roots,
    bundlePath,
    preflightPath,
    args: buildArgs({
      '--private-input': roots.privateInput,
      '--private-output': roots.privateOutput,
      '--private-log-root': roots.privateLogRoot,
      '--publication-root': roots.publicationRoot,
      '--core-checkout': roots.coreCheckout,
      '--core-evidence-checkout': roots.coreEvidenceCheckout,
      '--client-checkout': roots.clientCheckout,
      '--site-checkout': roots.siteCheckout,
      '--core-bundle': bundlePath,
    }),
    async cleanup() {
      await rm(tempRoot, { recursive: true, force: true });
    },
  };
}

function createRecorder(): Recorder {
  return {
    stdout: [],
    stderr: [],
    order: [],
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractSection(markdown: string, heading: string): string {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  assert.notEqual(start, -1, `missing section ${heading}`);
  const next = markdown.indexOf('\n## ', start + marker.length);
  return next === -1 ? markdown.slice(start) : markdown.slice(start, next + 1);
}

function extractBashBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]!);
}

function extractSingleBashBlock(section: string, heading: string): string {
  const blocks = extractBashBlocks(section);
  assert.equal(blocks.length > 0, true, `missing bash block in ${heading}`);
  return blocks[0]!;
}

function parseFlagSequence(block: string): string[] {
  return [...block.matchAll(/--[a-z0-9-]+/g)].map((match) => match[0]);
}

function parseQuotedFlagValuePairs(block: string): Array<[string, string]> {
  return [...block.matchAll(/^\s+(--[a-z0-9-]+)\s+"([^"]+)"\s*\\?$/gm)]
    .map((match) => [match[1]!, match[2]!] as [string, string]);
}

function extractBulletCodeValues(section: string, marker: string): string[] {
  const markerIndex = section.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing subsection marker ${marker}`);
  const remainder = section.slice(markerIndex + marker.length);
  const values: string[] = [];
  for (const line of remainder.split('\n')) {
    if (line.trim() === '') {
      if (values.length > 0) {
        break;
      }
      continue;
    }
    const match = line.match(/^\- `([^`]+)`$/);
    if (match) {
      values.push(match[1]!);
      continue;
    }
    if (values.length > 0) {
      break;
    }
  }
  return values;
}

function createDependencies(
  recorder: Recorder,
  overrides: Partial<VerifyTask10ClientReproducibilityDependencies> = {},
): VerifyTask10ClientReproducibilityDependencies {
  let currentConclusion: 'passed' | 'blocked' = 'passed';
  return {
    now: () => RUN_STARTED_AT,
    stdout: { write: (value: string) => { recorder.stdout.push(value); } },
    stderr: { write: (value: string) => { recorder.stderr.push(value); } },
    verifyTask10Authority: async () => {
      recorder.order.push('authority');
      return { status: 'verified', reasons: [] };
    },
    recordTask10GateCommands: async (): Promise<Task10CommandRow[]> => {
      recorder.order.push('gates');
      return buildCommandRows();
    },
    runTask10CoreProducer: async () => {
      recorder.order.push('producer');
      return {
        status: 'completed',
        evidence: { groups: [] },
        sanitizedFacts: buildSanitizedFactsStub(RUN_STARTED_AT),
      };
    },
    collectTask10ClientFingerprint: async (): Promise<Task10ClientFingerprint> => {
      recorder.order.push('fingerprint');
      return buildFingerprint(RUN_STARTED_AT);
    },
    adaptTask10ScenarioRows: async (): Promise<Task10ScenarioRow[]> => {
      recorder.order.push('scenario-adapter');
      return buildVerifiedScenarioRows(RUN_STARTED_AT);
    },
    evaluateExecutionEvidence: async () => {
      recorder.order.push('evaluator');
      return {
        candidateConclusion: 'passed',
        reasonCodes: [],
        missingEvidence: [],
      };
    },
    finalizeTask10Conclusion: async () => {
      recorder.order.push('finalizer');
      return {
        conclusion: 'passed',
        reasonCodes: [],
        missingEvidence: [],
      };
    },
    collectTask10PrivateSources: async () => {
      recorder.order.push('private-sources');
      return new Map();
    },
    assembleCandidatePayload: async ({ decision }): Promise<Task10CandidatePayload> => {
      recorder.order.push('assemble');
      currentConclusion = decision.conclusion;
      return buildCandidatePayloadStub(decision);
    },
    assessCandidatePublication: async () => {
      recorder.order.push('assess');
      return {
        ok: true,
        checks: {
          secretScanVerified: true,
          internalManifestVerified: true,
          archiveVerified: true,
          receiptVerified: true,
        },
        staged: {
          packageName: buildTask10PackageName(RUN_STARTED_AT),
          checks: {
            secretScanVerified: true,
            internalManifestVerified: true,
            archiveVerified: true,
            receiptVerified: true,
          },
        },
      };
    },
    freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
      recorder.order.push('freeze');
      return buildValidatedPublicationStub(currentConclusion, 'producer');
    },
    discardTask10Publication: async () => {
      recorder.order.push('discard');
    },
    validateProducerPublication: async (): Promise<Task10ValidatedPublication> => {
      recorder.order.push('validate-producer');
      return buildValidatedPublicationStub(currentConclusion, 'producer');
    },
    validateOfflinePublication: async (): Promise<Task10ValidatedPublication> => {
      recorder.order.push('validate-offline');
      return buildValidatedPublicationStub(currentConclusion, 'offline');
    },
    createTask10ArchiveDependencies: async () => ({
      archiveDirectory: async () => undefined,
      listArchiveMembers: async () => [],
      readArchiveMember: async () => new Uint8Array(),
    }),
    ...overrides,
  };
}

function assertNoCollaboratorCalls(recorder: Recorder): void {
  assert.deepEqual(recorder.order, []);
  assert.deepEqual(recorder.stdout, []);
}

test('parseVerifyTask10ClientReproducibilityArgs requires the exact nine flags once each with nonblank values and rejects positionals, duplicates, unknown flags, and missing values', () => {
  const values = Object.fromEntries(REQUIRED_FLAGS.map((flag, index) => [flag, `/tmp/${index + 1}`])) as Record<RequiredFlag, string>;
  const parsed = parseVerifyTask10ClientReproducibilityArgs(buildArgv(values));
  assert.equal(parsed.privateInput.endsWith('/1'), true);
  assert.equal(parsed.coreBundle.endsWith('/9'), true);

  for (const flag of REQUIRED_FLAGS) {
    const withoutFlag = buildArgv(values).filter((token) => token !== flag && token !== values[flag]);
    assert.throws(() => parseVerifyTask10ClientReproducibilityArgs(withoutFlag), new RegExp(flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const flag of REQUIRED_FLAGS) {
    assert.throws(() => parseVerifyTask10ClientReproducibilityArgs([...buildArgv(values), flag, '/tmp/duplicate']), /duplicate/i);
    assert.throws(() => parseVerifyTask10ClientReproducibilityArgs(buildArgv({
      ...values,
      [flag]: '   ',
    })), new RegExp(flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.throws(() => parseVerifyTask10ClientReproducibilityArgs(['positional', ...buildArgv(values)]), /positional/i);
  assert.throws(() => parseVerifyTask10ClientReproducibilityArgs([...buildArgv(values), '--not-real', '/tmp/nope']), /unknown/i);
  assert.throws(() => parseVerifyTask10ClientReproducibilityArgs([...buildArgv(values).slice(0, -1)]), /missing value/i);
});

test('runVerifyTask10ClientReproducibility fails preflight before collaborators for duplicate, nested, publication-overlap, symlink, bundle escape, wrong relative bundle, and bundle symlink roots', async () => {
  const harness = await createRootHarness();
  const cases: Array<{
    name: string;
    mutate: (args: VerifyTask10ClientReproducibilityArgs) => Promise<VerifyTask10ClientReproducibilityArgs>;
    pattern: RegExp;
  }> = [
    {
      name: 'duplicate root',
      mutate: async (args) => ({ ...args, privateOutput: args.privateInput }),
      pattern: /distinct|duplicate/i,
    },
    {
      name: 'nested root',
      mutate: async (args) => {
        const nestedPath = path.join(args.privateInput, 'nested');
        await mkdir(nestedPath, { recursive: true });
        return { ...args, privateOutput: nestedPath };
      },
      pattern: /overlap|nested/i,
    },
    {
      name: 'publication under private root',
      mutate: async (args) => {
        const nestedPath = path.join(args.privateLogRoot, 'publication');
        await mkdir(nestedPath, { recursive: true });
        return { ...args, publicationRoot: nestedPath };
      },
      pattern: /publication/i,
    },
    {
      name: 'root symlink',
      mutate: async (args) => {
        const symlinkPath = path.join(harness.tempRoot, 'private-input-link');
        await symlink(args.privateInput, symlinkPath);
        return { ...args, privateInput: symlinkPath };
      },
      pattern: /symlink/i,
    },
    {
      name: 'symlink ancestor',
      mutate: async (args) => {
        const realParent = path.join(harness.tempRoot, 'real-parent');
        const aliasParent = path.join(harness.tempRoot, 'alias-parent');
        await mkdir(realParent, { recursive: true });
        await symlink(realParent, aliasParent);
        const aliasChild = path.join(aliasParent, 'private-output');
        await mkdir(path.join(realParent, 'private-output'), { recursive: true });
        return { ...args, privateOutput: aliasChild };
      },
      pattern: /symlink/i,
    },
    {
      name: 'bundle escape',
      mutate: async (args) => {
        const outsidePath = path.join(args.coreEvidenceCheckout, '..', 'outside.json');
        await writeFile(outsidePath, buildAuthorityBundleBytes());
        return { ...args, coreBundle: outsidePath };
      },
      pattern: /bundle/i,
    },
    {
      name: 'wrong bundle relative path',
      mutate: async (args) => {
        const wrongPath = path.join(args.coreEvidenceCheckout, 'wrong-bundle.json');
        await writeFile(wrongPath, buildAuthorityBundleBytes());
        return { ...args, coreBundle: wrongPath };
      },
      pattern: /coreBundlePath|relative/i,
    },
    {
      name: 'bundle symlink',
      mutate: async (args) => {
        const linkPath = path.join(args.coreEvidenceCheckout, 'bundle-link.json');
        await symlink(args.coreBundle, linkPath);
        return { ...args, coreBundle: linkPath };
      },
      pattern: /symlink/i,
    },
  ];

  try {
    for (const entry of cases) {
      const recorder = createRecorder();
      const deps = createDependencies(recorder);
      const mutatedArgs = await entry.mutate(harness.args);
      const result = await runVerifyTask10ClientReproducibility(mutatedArgs, deps);
      assert.equal(result.exitCode === 0, false, entry.name);
      assert.match(recorder.stderr.join(''), entry.pattern, entry.name);
      assertNoCollaboratorCalls(recorder);
    }
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility accepts the exact allowed root and bundle layout and reaches authority verification only after root preflight succeeds', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      verifyTask10Authority: async () => {
        recorder.order.push('authority');
        return { status: 'tooling-failure', reasons: ['stop-after-authority'] };
      },
    }));
    assert.equal(result.exitCode, 1);
    assert.deepEqual(recorder.order, ['authority']);
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility orchestrates the verified happy path in order and prints only the exact receipt keys in order', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder));
    assert.equal(result.exitCode, 0);
    assert.deepEqual(recorder.order, [
      'authority',
      'gates',
      'producer',
      'scenario-adapter',
      'fingerprint',
      'evaluator',
      'private-sources',
      'assemble',
      'assess',
      'finalizer',
      'freeze',
    ]);
    const stdout = recorder.stdout.join('');
    assert.deepEqual(Object.keys(JSON.parse(stdout)), [
      'command',
      'conclusion',
      'packageName',
      'packagePath',
      'conclusionPath',
      'conclusionSha256',
      'archivePath',
      'archiveSha256',
    ]);
    assert.match(stdout, /^\{\n  "command": "verify-task10-client-reproducibility"/);
    assert.doesNotMatch(stdout, /token|email|session|body|private|\/Users\//i);
    assert.equal(recorder.stderr.join(''), '');
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility discards and rebuilds a blocked final publication when candidate assessment/finalization disagree', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  const candidates: Array<{ decision: { conclusion: string; reasonCodes: string[]; missingEvidence: string[] } }> = [];
  let assembledConclusion: 'passed' | 'blocked' = 'passed';
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      finalizeTask10Conclusion: async () => {
        recorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['finalizer-blocked'],
          missingEvidence: ['finalizer-missing'],
        };
      },
      assembleCandidatePayload: async ({ decision }): Promise<Task10CandidatePayload> => {
        recorder.order.push(`assemble:${decision.conclusion}`);
        candidates.push({ decision });
        assembledConclusion = decision.conclusion as 'passed' | 'blocked';
        return buildCandidatePayloadStub(assembledConclusion === 'passed'
          ? { conclusion: 'passed', reasonCodes: decision.reasonCodes, missingEvidence: decision.missingEvidence }
          : { conclusion: 'blocked', reasonCodes: decision.reasonCodes, missingEvidence: decision.missingEvidence });
      },
      freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
        recorder.order.push('freeze');
        return buildValidatedPublicationStub(assembledConclusion, 'producer');
      },
      validateProducerPublication: async (): Promise<Task10ValidatedPublication> => {
        recorder.order.push('validate-producer');
        return buildValidatedPublicationStub(assembledConclusion, 'producer');
      },
      validateOfflinePublication: async (): Promise<Task10ValidatedPublication> => {
        recorder.order.push('validate-offline');
        return buildValidatedPublicationStub(assembledConclusion, 'offline');
      },
      assessCandidatePublication: async () => {
        recorder.order.push('assess');
        return {
          ok: true,
          checks: {
            secretScanVerified: true,
            internalManifestVerified: true,
            archiveVerified: true,
            receiptVerified: true,
          },
          staged: {
            packageName: buildTask10PackageName(RUN_STARTED_AT),
            checks: {
              secretScanVerified: true,
              internalManifestVerified: true,
              archiveVerified: true,
              receiptVerified: true,
            },
          },
        };
      },
    }));

    assert.equal(result.exitCode, 0);
    assert.deepEqual(candidates.map((entry) => entry.decision.conclusion), ['passed', 'blocked']);
    assert.ok(recorder.order.includes('discard'));
    assert.ok(recorder.order.includes('assemble:blocked'));
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility synthesizes exact skipped gates and seven blocked scenario rows for authority reportable-blocked without running gates or producer', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  let evaluationInput: unknown;
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      verifyTask10Authority: async () => {
        recorder.order.push('authority');
        return { status: 'reportable-blocked', reasons: ['bundle-sha-mismatch'] };
      },
      evaluateExecutionEvidence: async (input) => {
        recorder.order.push('evaluator');
        evaluationInput = input;
        return {
          candidateConclusion: 'blocked',
          reasonCodes: ['authority.reportable-blocked:bundle-sha-mismatch'],
          missingEvidence: [],
        };
      },
      finalizeTask10Conclusion: async () => {
        recorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['authority.reportable-blocked:bundle-sha-mismatch'],
          missingEvidence: [],
        };
      },
    }));

    assert.equal(result.exitCode, 0);
    assert.deepEqual(recorder.order, [
      'authority',
      'fingerprint',
      'evaluator',
      'private-sources',
      'assemble',
      'assess',
      'finalizer',
      'freeze',
    ]);
    const normalizedInput = evaluationInput as {
      commandLog: { commands: Array<{ status: string; exitCode: number | null; skippedDueTo: string | null }> };
      scenarioRows: Array<{ scenarioFamily: string; result: string; reasonCodes: string[]; privateEvidenceAttestations: Array<{ sourceClass: string }> }>;
    };
    assert.equal(normalizedInput.commandLog.commands.length, 6);
    assert.ok(normalizedInput.commandLog.commands.every((row) => row.status === 'skipped' && row.exitCode === null && row.skippedDueTo === 'authority-verification-blocked'));
    assert.deepEqual(normalizedInput.scenarioRows.map((row) => row.scenarioFamily), [
      'session-access',
      'readiness',
      'readiness',
      'dispatch',
      'replay-recovery',
      'replay-recovery',
      'result-submission',
    ]);
    assert.ok(normalizedInput.scenarioRows.every((row) => row.result === 'blocked'));
    assert.ok(normalizedInput.scenarioRows.every((row) => row.reasonCodes.includes('authority-verification-blocked')));
    assert.deepEqual(
      normalizedInput.scenarioRows.map((row) => row.privateEvidenceAttestations[0]?.sourceClass),
      ['preflight', 'preflight', 'preflight', 'authority-bundle', 'authority-bundle', 'authority-bundle', 'authority-bundle'],
    );
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility short-circuits on authority tooling failure with nonzero exit and no receipt', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      verifyTask10Authority: async () => {
        recorder.order.push('authority');
        return { status: 'tooling-failure', reasons: ['internal authority verification failure'] };
      },
    }));
    assert.equal(result.exitCode, 1);
    assert.deepEqual(recorder.order, ['authority']);
    assert.equal(recorder.stdout.join(''), '');
    assert.match(recorder.stderr.join(''), /tooling/i);
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility publishes blocked authority-reportable packages from actual dirty and lock mismatch fingerprint observations with gates and producer skipped', async () => {
  const dirtyHarness = await createRootHarness();
  const lockHarness = await createRootHarness();
  const cases = [
    {
      harness: dirtyHarness,
      name: 'dirty',
      mutate: (rootPath: string) => ({
        headCommit: rootPath === dirtyHarness.roots.coreCheckout
          ? TASK10_AUTHORITY.coreRuntimeSha
          : rootPath === dirtyHarness.roots.clientCheckout
            ? TASK10_AUTHORITY.clientBaselineSha
            : rootPath === dirtyHarness.roots.siteCheckout
              ? TASK10_AUTHORITY.siteBaselineSha
              : TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: rootPath === dirtyHarness.roots.coreEvidenceCheckout ? null : 'main',
        upstreamRef: rootPath === dirtyHarness.roots.coreEvidenceCheckout ? null : 'origin/main',
        detachedHead: rootPath === dirtyHarness.roots.coreEvidenceCheckout,
        porcelainStatus: rootPath === dirtyHarness.roots.clientCheckout ? 'non-empty' as const : 'empty' as const,
        lockfileSha256: rootPath === dirtyHarness.roots.coreCheckout
          ? TASK10_AUTHORITY.lockfileSha256.core
          : rootPath === dirtyHarness.roots.clientCheckout
            ? TASK10_AUTHORITY.lockfileSha256.client
            : rootPath === dirtyHarness.roots.siteCheckout
              ? TASK10_AUTHORITY.lockfileSha256.site
              : 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        realPath: rootPath,
        symlinked: false,
      }),
      expectedReason: 'fingerprint.checkoutProofs.clientValidation.porcelainStatus.mismatch',
    },
    {
      harness: lockHarness,
      name: 'lock',
      mutate: (rootPath: string) => ({
        headCommit: rootPath === lockHarness.roots.coreCheckout
          ? TASK10_AUTHORITY.coreRuntimeSha
          : rootPath === lockHarness.roots.clientCheckout
            ? TASK10_AUTHORITY.clientBaselineSha
            : rootPath === lockHarness.roots.siteCheckout
              ? TASK10_AUTHORITY.siteBaselineSha
              : TASK10_AUTHORITY.coreEvidencePublicationCommit,
        branch: rootPath === lockHarness.roots.coreEvidenceCheckout ? null : 'main',
        upstreamRef: rootPath === lockHarness.roots.coreEvidenceCheckout ? null : 'origin/main',
        detachedHead: rootPath === lockHarness.roots.coreEvidenceCheckout,
        porcelainStatus: 'empty' as const,
        lockfileSha256: rootPath === lockHarness.roots.clientCheckout
          ? 'f'.repeat(64)
          : rootPath === lockHarness.roots.coreCheckout
            ? TASK10_AUTHORITY.lockfileSha256.core
            : rootPath === lockHarness.roots.siteCheckout
              ? TASK10_AUTHORITY.lockfileSha256.site
              : 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        realPath: rootPath,
        symlinked: false,
      }),
      expectedReason: 'fingerprint.checkoutProofs.clientValidation.lockfileSha256.mismatch',
    },
  ] as const;

  try {
    for (const entry of cases) {
      const recorder = createRecorder();
      const decisions: Array<{ conclusion: string; reasonCodes: string[] }> = [];
      let assembledConclusion: 'passed' | 'blocked' = 'passed';
      const result = await runVerifyTask10ClientReproducibility(entry.harness.args, createDependencies(recorder, {
        verifyTask10Authority: async () => {
          recorder.order.push('authority');
          return { status: 'reportable-blocked', reasons: ['checkout inspection is missing or unreadable'] };
        },
        collectTask10ClientFingerprint: async ({ runStartedAt, roots }) => {
          recorder.order.push('fingerprint');
          return collectTask10ClientFingerprint({ runStartedAt, roots }, {
            inspectCheckout(rootPath) {
              return entry.mutate(rootPath);
            },
            runVersionCommand() {
              return 'ok';
            },
          });
        },
        recordTask10GateCommands: async () => {
          recorder.order.push('gates');
          throw new Error('gates must not run');
        },
        runTask10CoreProducer: async () => {
          recorder.order.push('producer');
          throw new Error('producer must not run');
        },
        assembleCandidatePayload: async ({ decision }): Promise<Task10CandidatePayload> => {
          recorder.order.push('assemble');
          assembledConclusion = decision.conclusion as 'passed' | 'blocked';
          decisions.push({ conclusion: decision.conclusion, reasonCodes: [...decision.reasonCodes] });
          return buildCandidatePayloadStub(decision.conclusion === 'passed'
            ? { conclusion: 'passed', reasonCodes: decision.reasonCodes, missingEvidence: decision.missingEvidence }
            : { conclusion: 'blocked', reasonCodes: decision.reasonCodes, missingEvidence: decision.missingEvidence });
        },
        freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
          recorder.order.push('freeze');
          return buildValidatedPublicationStub(assembledConclusion, 'producer');
        },
        evaluateExecutionEvidence: undefined,
        finalizeTask10Conclusion: undefined,
      }));
      assert.equal(result.exitCode, 0, entry.name);
      assert.deepEqual(recorder.order, [
        'authority',
        'fingerprint',
        'private-sources',
        'assemble',
        'assess',
        'discard',
        'assemble',
        'assess',
        'freeze',
      ], entry.name);
      assert.match(recorder.stdout.join(''), /"conclusion": "blocked"/, entry.name);
      assert.ok(decisions.some((decision) => decision.reasonCodes.includes(entry.expectedReason)), entry.name);
      assert.match(recorder.stdout.join(''), /"command": "verify-task10-client-reproducibility"/, entry.name);
      assert.equal(recorder.stderr.join(''), '', entry.name);
    }
  } finally {
    await dirtyHarness.cleanup();
    await lockHarness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility preserves real gate rows, blocks downstream producer on nonzero gates, and still publishes blocked', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  let evaluationInput: unknown;
  try {
    const gateRows: Task10CommandRow[] = [
      { command: 'npm test', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'executed' as const, exitCode: 0, skippedDueTo: null },
      { command: 'npm run typecheck', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'executed' as const, exitCode: 2, skippedDueTo: null },
      { command: 'npm run build', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped' as const, exitCode: null, skippedDueTo: 'npm run typecheck' },
      { command: 'npm run validate', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped' as const, exitCode: null, skippedDueTo: 'npm run typecheck' },
      { command: 'npm run validate:release-readiness', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped' as const, exitCode: null, skippedDueTo: 'npm run typecheck' },
      { command: 'npm run validate:release-gate', cwd: 'frozen-client-root' as const, startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped' as const, exitCode: null, skippedDueTo: 'npm run typecheck' },
    ];
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      recordTask10GateCommands: async (): Promise<Task10CommandRow[]> => {
        recorder.order.push('gates');
        return gateRows;
      },
      runTask10CoreProducer: async () => {
        recorder.order.push('producer');
        throw new Error('producer must not run');
      },
      evaluateExecutionEvidence: async (input) => {
        recorder.order.push('evaluator');
        evaluationInput = input;
        return {
          candidateConclusion: 'blocked',
          reasonCodes: ['command.npm run typecheck.exitCode.2'],
          missingEvidence: ['command:npm run build'],
        };
      },
      finalizeTask10Conclusion: async () => {
        recorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['command.npm run typecheck.exitCode.2'],
          missingEvidence: ['command:npm run build'],
        };
      },
    }));
    assert.equal(result.exitCode, 0);
    assert.deepEqual(recorder.order, [
      'authority',
      'gates',
      'fingerprint',
      'evaluator',
      'private-sources',
      'assemble',
      'assess',
      'finalizer',
      'freeze',
    ]);
    assert.deepEqual((evaluationInput as { commandLog: { commands: unknown[] } }).commandLog.commands, gateRows);
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility publishes blocked producer contract/reportable-blocked scenarios but short-circuits producer tooling failure', async () => {
  const contractHarness = await createRootHarness();
  const toolingHarness = await createRootHarness();
  try {
    const contractRecorder = createRecorder();
    let contractInput: unknown;
    const contractResult = await runVerifyTask10ClientReproducibility(contractHarness.args, createDependencies(contractRecorder, {
      runTask10CoreProducer: async () => {
        contractRecorder.order.push('producer');
        return {
          status: 'reportable-blocked',
          reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
          affectedModes: ['producer-contract-probe'],
          affectedFamilies: ['dispatch', 'replay-recovery', 'result-submission'],
          evidence: {
            groups: [{
              sourceClass: 'producer-contract-probe',
              handles: ['sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'],
              attestations: [{
                handle: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
                sourceClass: 'producer-contract-probe',
                verified: true,
                verifiedAt: RUN_STARTED_AT,
              }],
            }],
          },
        };
      },
      evaluateExecutionEvidence: async (input) => {
        contractRecorder.order.push('evaluator');
        contractInput = input;
        return {
          candidateConclusion: 'blocked',
          reasonCodes: ['producer.reportable-blocked:core-producer-private-root-contract-unsatisfied'],
          missingEvidence: ['producer-mode:producer-contract-probe'],
        };
      },
      finalizeTask10Conclusion: async () => {
        contractRecorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['producer-contract-blocked'],
          missingEvidence: ['producer-mode:producer-contract-probe'],
        };
      },
    }));
    assert.equal(contractResult.exitCode, 0);
    assert.equal((contractInput as { scenarioRows: unknown[] }).scenarioRows.length, 7);

    const toolingRecorder = createRecorder();
    const toolingResult = await runVerifyTask10ClientReproducibility(toolingHarness.args, createDependencies(toolingRecorder, {
      runTask10CoreProducer: async () => {
        toolingRecorder.order.push('producer');
        return { status: 'tooling-failure', errorCode: 'producer-exit-nonzero' };
      },
    }));
    assert.equal(toolingResult.exitCode, 1);
    assert.deepEqual(toolingRecorder.order, ['authority', 'gates', 'producer']);
    assert.equal(toolingRecorder.stdout.join(''), '');
  } finally {
    await contractHarness.cleanup();
    await toolingHarness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility returns nonzero with no freeze when rebuilt blocked assessment fails or frozen receipt conclusion mismatches the final conclusion', async () => {
  const failedAssessmentHarness = await createRootHarness();
  const mismatchedFreezeHarness = await createRootHarness();
  try {
    const failedAssessmentRecorder = createRecorder();
    const failedAssessmentResult = await runVerifyTask10ClientReproducibility(failedAssessmentHarness.args, createDependencies(failedAssessmentRecorder, {
      finalizeTask10Conclusion: async () => {
        failedAssessmentRecorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['blocked'],
          missingEvidence: ['missing'],
        };
      },
      assessCandidatePublication: async () => {
        failedAssessmentRecorder.order.push('assess');
        return {
          ok: false,
          checks: {
            secretScanVerified: true,
            internalManifestVerified: false,
            archiveVerified: false,
            receiptVerified: false,
          },
        };
      },
    }));
    assert.equal(failedAssessmentResult.exitCode, 1);
    assert.ok(!failedAssessmentRecorder.order.includes('freeze'));

    const mismatchRecorder = createRecorder();
    const mismatchResult = await runVerifyTask10ClientReproducibility(mismatchedFreezeHarness.args, createDependencies(mismatchRecorder, {
      finalizeTask10Conclusion: async () => {
        mismatchRecorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['blocked'],
          missingEvidence: [],
        };
      },
      freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
        mismatchRecorder.order.push('freeze');
        return buildValidatedPublicationStub('passed', 'producer');
      },
    }));
    assert.equal(mismatchResult.exitCode, 1);
    assert.match(mismatchRecorder.stderr.join(''), /conclusion/i);
  } finally {
    await failedAssessmentHarness.cleanup();
    await mismatchedFreezeHarness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility sanitizes thrown collaborator failures and never leaks private paths or secrets', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      verifyTask10Authority: async () => {
        throw new Error(`failed for ${harness.args.privateInput} token=top-secret-123 email@example.invalid`);
      },
    }));
    assert.equal(result.exitCode, 1);
    assert.equal(recorder.stdout.join(''), '');
    const stderr = recorder.stderr.join('');
    assert.doesNotMatch(stderr, /token=top-secret-123|email@example\.invalid/);
    assert.doesNotMatch(stderr, new RegExp(harness.args.privateInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  } finally {
    await harness.cleanup();
  }
});

test('main is import-safe, respects injected process boundaries, and package.json exposes the exact validation script entry', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await main(buildArgv({
      '--private-input': harness.roots.privateInput,
      '--private-output': harness.roots.privateOutput,
      '--private-log-root': harness.roots.privateLogRoot,
      '--publication-root': harness.roots.publicationRoot,
      '--core-checkout': harness.roots.coreCheckout,
      '--core-evidence-checkout': harness.roots.coreEvidenceCheckout,
      '--client-checkout': harness.roots.clientCheckout,
      '--site-checkout': harness.roots.siteCheckout,
      '--core-bundle': harness.bundlePath,
    }), createDependencies(recorder));
    assert.equal(result.exitCode, 0);

    const imported = spawnSync(process.execPath, ['--import', 'tsx', '--eval', 'import("./scripts/verify-task10-client-reproducibility.ts")'], {
      cwd: path.resolve(new URL('..', import.meta.url).pathname),
      encoding: 'utf8',
    });
    assert.equal(imported.status, 0);
    assert.equal(imported.stdout, '');
    assert.equal(imported.stderr, '');

    const source = await readFile(new URL('../scripts/verify-task10-client-reproducibility.ts', import.meta.url), 'utf8');
    assert.match(source, /fileURLToPath\(import\.meta\.url\)/);
    assert.match(source, /process\.exitCode/);
    assert.doesNotMatch(source, /process\.exit\(/);

    const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      scripts: Record<string, string>;
    };
    assert.equal(
      packageJson.scripts['validate:task10-client-reproducibility'],
      'tsx scripts/verify-task10-client-reproducibility.ts',
    );
    assert.deepEqual(Object.keys(packageJson.scripts), [
      'test',
      'build',
      'typecheck',
      'validate',
      'validate:release-readiness',
      'validate:release-gate',
      'validate:task10-client-reproducibility',
      'example',
      'example:internal',
      'example:seed',
    ]);
  } finally {
    await harness.cleanup();
  }
});

test('inspectTask10Checkout collects real checkout proof fields from bounded git output and marks symlink roots', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'task10-checkout-inspect-')));
  const repoRoot = path.join(tempRoot, 'repo');
  const symlinkRoot = path.join(tempRoot, 'repo-link');
  try {
    await mkdir(repoRoot, { recursive: true });
    await writeFile(path.join(repoRoot, 'package-lock.json'), '{}\n');
    await symlink(repoRoot, symlinkRoot);

    const checkout = inspectTask10Checkout(repoRoot, {
      runGitCommand(rootPath, args) {
        assert.equal(rootPath, repoRoot);
        if (args[0] === 'rev-parse' && args[1] === 'HEAD') {
          return 'a'.repeat(40);
        }
        if (args[0] === 'branch' && args[1] === '--show-current') {
          return 'main';
        }
        if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref' && args[2] === 'HEAD') {
          return 'main';
        }
        if (args[0] === 'rev-parse' && args[1] === '--abbrev-ref' && args[2] === '@{upstream}') {
          return 'origin/main';
        }
        if (args[0] === 'status' && args[1] === '--porcelain') {
          return '';
        }
        throw new Error(`unexpected git args: ${args.join(' ')}`);
      },
    });

    assert.equal(checkout.headCommit, 'a'.repeat(40));
    assert.equal(checkout.branch, 'main');
    assert.equal(checkout.upstreamRef, 'origin/main');
    assert.equal(checkout.detachedHead, false);
    assert.equal(checkout.porcelainStatus, 'empty');
    assert.equal(checkout.realPath, repoRoot);
    assert.equal(checkout.symlinked, false);
    assert.equal(checkout.lockfileSha256, sha256(new TextEncoder().encode('{}\n')));

    const symlinked = inspectTask10Checkout(symlinkRoot, {
      runGitCommand() {
        return 'main';
      },
    });
    assert.equal(symlinked.symlinked, true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('collectTask10ClientFingerprint uses real low-level proofs and versions and rejects missing tools', async () => {
  const harness = await createRootHarness();
  try {
    for (const root of [
      harness.roots.coreCheckout,
      harness.roots.clientCheckout,
      harness.roots.siteCheckout,
      harness.roots.coreEvidenceCheckout,
    ]) {
      await writeFile(path.join(root, 'package-lock.json'), `${path.basename(root)}\n`);
    }

    const fingerprint = collectTask10ClientFingerprint({
      runStartedAt: RUN_STARTED_AT,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }, {
      inspectCheckout(rootPath) {
        return {
          headCommit: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.coreRuntimeSha
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.clientBaselineSha
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.siteBaselineSha
                : TASK10_AUTHORITY.coreEvidencePublicationCommit,
          branch: rootPath === harness.roots.coreEvidenceCheckout ? null : 'main',
          upstreamRef: rootPath === harness.roots.coreEvidenceCheckout ? null : 'origin/main',
          detachedHead: rootPath === harness.roots.coreEvidenceCheckout,
          porcelainStatus: 'empty',
          lockfileSha256: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.lockfileSha256.core
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.lockfileSha256.client
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.lockfileSha256.site
                : 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          realPath: rootPath,
          symlinked: false,
        };
      },
      runVersionCommand(command, args) {
        return `${command} ${args.join(' ')} ok`;
      },
    });

    assert.equal(fingerprint.runStartedAt, RUN_STARTED_AT);
    assert.equal(fingerprint.toolVersions.node, process.version);
    assert.equal(fingerprint.toolVersions.npm.includes('npm'), true);
    assert.equal(fingerprint.checkoutProofs.coreRuntime.lockfileSha256, TASK10_AUTHORITY.lockfileSha256.core);

    assert.throws(() => collectTask10ClientFingerprint({
      runStartedAt: RUN_STARTED_AT,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }, {
      inspectCheckout(rootPath) {
        return {
          headCommit: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.coreRuntimeSha
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.clientBaselineSha
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.siteBaselineSha
                : TASK10_AUTHORITY.coreEvidencePublicationCommit,
          branch: rootPath === harness.roots.coreEvidenceCheckout ? null : 'main',
          upstreamRef: rootPath === harness.roots.coreEvidenceCheckout ? null : 'origin/main',
          detachedHead: rootPath === harness.roots.coreEvidenceCheckout,
          porcelainStatus: 'empty',
          lockfileSha256: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.lockfileSha256.core
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.lockfileSha256.client
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.lockfileSha256.site
                : 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          realPath: rootPath,
          symlinked: false,
        };
      },
      runVersionCommand(command) {
        if (command === 'docker') {
          throw new Error('docker missing');
        }
        return 'ok';
      },
    }), /tooling|version/i);
  } finally {
    await harness.cleanup();
  }
});

test('collectTask10ClientFingerprint preserves dirty checkout observations structurally for evaluator-owned blocking', async () => {
  const harness = await createRootHarness();
  try {
    const fingerprint = collectTask10ClientFingerprint({
      runStartedAt: RUN_STARTED_AT,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }, {
      inspectCheckout(rootPath) {
        return {
          headCommit: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.coreRuntimeSha
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.clientBaselineSha
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.siteBaselineSha
                : TASK10_AUTHORITY.coreEvidencePublicationCommit,
          branch: rootPath === harness.roots.coreEvidenceCheckout ? null : 'main',
          upstreamRef: rootPath === harness.roots.coreEvidenceCheckout ? null : 'origin/main',
          detachedHead: rootPath === harness.roots.coreEvidenceCheckout,
          porcelainStatus: rootPath === harness.roots.clientCheckout ? 'non-empty' : 'empty',
          lockfileSha256: rootPath === harness.roots.coreCheckout
            ? TASK10_AUTHORITY.lockfileSha256.core
            : rootPath === harness.roots.clientCheckout
              ? TASK10_AUTHORITY.lockfileSha256.client
              : rootPath === harness.roots.siteCheckout
                ? TASK10_AUTHORITY.lockfileSha256.site
                : 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          realPath: rootPath,
          symlinked: false,
        };
      },
      runVersionCommand() {
        return 'ok';
      },
    });
    assert.equal(fingerprint.checkoutProofs.clientValidation.porcelainStatus, 'non-empty');
  } finally {
    await harness.cleanup();
  }
});

test('buildDefaultTask10ScenarioRowsInput maps completed, partial reportable, and contract probe producer outcomes through the real adapter', () => {
  const completedInput = buildDefaultTask10ScenarioRowsInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [
          { sourceClass: 'runtime', handles: ['sha256:1111111111111111111111111111111111111111111111111111111111111111'], attestations: [{ handle: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', sourceClass: 'runtime', verified: true, verifiedAt: '2026-07-19T07:16:02.000Z' }] },
          { sourceClass: 'reset', handles: ['sha256:2222222222222222222222222222222222222222222222222222222222222222'], attestations: [{ handle: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', sourceClass: 'reset', verified: true, verifiedAt: '2026-07-19T07:16:03.000Z' }] },
          { sourceClass: 'preflight', handles: ['sha256:3333333333333333333333333333333333333333333333333333333333333333'], attestations: [{ handle: 'sha256:3333333333333333333333333333333333333333333333333333333333333333', sourceClass: 'preflight', verified: true, verifiedAt: '2026-07-19T07:16:01.000Z' }] },
          { sourceClass: 'success-001', handles: ['sha256:4444444444444444444444444444444444444444444444444444444444444444'], attestations: [{ handle: 'sha256:4444444444444444444444444444444444444444444444444444444444444444', sourceClass: 'success-001', verified: true, verifiedAt: '2026-07-19T07:16:07.000Z' }] },
          { sourceClass: 'recovery-001', handles: ['sha256:5555555555555555555555555555555555555555555555555555555555555555'], attestations: [{ handle: 'sha256:5555555555555555555555555555555555555555555555555555555555555555', sourceClass: 'recovery-001', verified: true, verifiedAt: '2026-07-19T07:16:05.000Z' }] },
          { sourceClass: 'success-002-reuse', handles: ['sha256:6666666666666666666666666666666666666666666666666666666666666666'], attestations: [{ handle: 'sha256:6666666666666666666666666666666666666666666666666666666666666666', sourceClass: 'success-002-reuse', verified: true, verifiedAt: '2026-07-19T07:16:06.000Z' }] },
        ],
      },
      sanitizedFacts: buildSanitizedFactsStub(RUN_STARTED_AT),
    },
    runStartedAt: RUN_STARTED_AT,
  });
  assert.equal(completedInput.preflight?.occurredAt, RUN_STARTED_AT);
  assert.equal(completedInput.success001?.dispatchScenarioFact.requestId, 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001');
  assert.equal(completedInput.success002Reuse?.scenarioFact.proofClass, 'reuse-proof');

  const partialInput = buildDefaultTask10ScenarioRowsInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: ['producer-output-readback-blocked'],
      affectedModes: ['success-001'],
      affectedFamilies: ['dispatch'],
      evidence: {
        groups: [
          { sourceClass: 'runtime', handles: ['sha256:1111111111111111111111111111111111111111111111111111111111111111'], attestations: [{ handle: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', sourceClass: 'runtime', verified: true, verifiedAt: '2026-07-19T07:16:02.000Z' }] },
          { sourceClass: 'preflight', handles: ['sha256:3333333333333333333333333333333333333333333333333333333333333333'], attestations: [{ handle: 'sha256:3333333333333333333333333333333333333333333333333333333333333333', sourceClass: 'preflight', verified: true, verifiedAt: '2026-07-19T07:16:01.000Z' }] },
        ],
      },
      sanitizedFacts: {
        runIdentity: buildSanitizedFactsStub(RUN_STARTED_AT).runIdentity,
        preflight: buildSanitizedFactsStub(RUN_STARTED_AT).preflight,
        runtime: buildSanitizedFactsStub(RUN_STARTED_AT).runtime,
      },
    },
    runStartedAt: RUN_STARTED_AT,
  });
  assert.equal(partialInput.preflight !== undefined, true);
  assert.equal(partialInput.runtime !== undefined, true);
  assert.equal(partialInput.success001, undefined);

  const contractRows = buildTask10ScenarioRows(buildDefaultTask10ScenarioRowsInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
      affectedModes: ['producer-contract-probe'],
      affectedFamilies: ['dispatch', 'replay-recovery', 'result-submission'],
      evidence: {
        groups: [{
          sourceClass: 'producer-contract-probe',
          handles: ['sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'],
          attestations: [{
            handle: 'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
            sourceClass: 'producer-contract-probe',
            verified: true,
            verifiedAt: RUN_STARTED_AT,
          }],
        }],
      },
    },
    runStartedAt: RUN_STARTED_AT,
  }));
  assert.equal(contractRows.length, 7);
  assert.ok(contractRows.every((row) => row.reasonCodes.includes('core-producer-private-root-contract-unsatisfied')));
});

test('runVerifyTask10ClientReproducibility fails closed when a completed producer outcome omits sanitizedFacts', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      runTask10CoreProducer: async () => {
        recorder.order.push('producer');
        return {
          status: 'completed',
          evidence: { groups: [] },
        };
      },
      adaptTask10ScenarioRows: undefined,
      evaluateExecutionEvidence: async () => {
        recorder.order.push('evaluator');
        throw new Error('evaluator must not run');
      },
    }));
    assert.equal(result.exitCode, 1);
    assert.deepEqual(recorder.order, ['authority', 'gates', 'producer']);
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility propagates producer-authored safe sanitizedFacts through the real default adapter', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  let evaluationInput: unknown;
  try {
    const customFacts = buildSanitizedFactsStub(RUN_STARTED_AT);
    customFacts.runIdentity.tenant = 'tenant:safe-custom';
    customFacts.success001.dispatchScenarioFact.tenantRef = 'tenant:safe-custom';
    customFacts.success001.dispatchScenarioFact.requestId = 'POST /runtime/custom-safe-dispatch request:dispatch:777';
    customFacts.success001.dispatchScenarioFact.sourceObjectRef = 'safe-custom-source';
    customFacts.success001.dispatchScenarioFact.proofClass = 'dispatch-proof-safe-custom';
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      runTask10CoreProducer: async () => {
        recorder.order.push('producer');
        return {
          status: 'completed',
          evidence: {
            groups: [
              { sourceClass: 'runtime', handles: ['sha256:1111111111111111111111111111111111111111111111111111111111111111'], attestations: [{ handle: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', sourceClass: 'runtime', verified: true, verifiedAt: RUN_STARTED_AT }] },
              { sourceClass: 'reset', handles: ['sha256:2222222222222222222222222222222222222222222222222222222222222222'], attestations: [{ handle: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', sourceClass: 'reset', verified: true, verifiedAt: RUN_STARTED_AT }] },
              { sourceClass: 'preflight', handles: ['sha256:3333333333333333333333333333333333333333333333333333333333333333'], attestations: [{ handle: 'sha256:3333333333333333333333333333333333333333333333333333333333333333', sourceClass: 'preflight', verified: true, verifiedAt: RUN_STARTED_AT }] },
              { sourceClass: 'success-001', handles: ['sha256:4444444444444444444444444444444444444444444444444444444444444444'], attestations: [{ handle: 'sha256:4444444444444444444444444444444444444444444444444444444444444444', sourceClass: 'success-001', verified: true, verifiedAt: RUN_STARTED_AT }] },
              { sourceClass: 'recovery-001', handles: ['sha256:5555555555555555555555555555555555555555555555555555555555555555'], attestations: [{ handle: 'sha256:5555555555555555555555555555555555555555555555555555555555555555', sourceClass: 'recovery-001', verified: true, verifiedAt: RUN_STARTED_AT }] },
              { sourceClass: 'success-002-reuse', handles: ['sha256:6666666666666666666666666666666666666666666666666666666666666666'], attestations: [{ handle: 'sha256:6666666666666666666666666666666666666666666666666666666666666666', sourceClass: 'success-002-reuse', verified: true, verifiedAt: RUN_STARTED_AT }] },
            ],
          },
          sanitizedFacts: customFacts,
        };
      },
      adaptTask10ScenarioRows: undefined,
      evaluateExecutionEvidence: async (input) => {
        recorder.order.push('evaluator');
        evaluationInput = input;
        return {
          candidateConclusion: 'passed',
          reasonCodes: [],
          missingEvidence: [],
        };
      },
    }));
    assert.equal(result.exitCode, 0);
    const rows = (evaluationInput as { scenarioRows: Task10ScenarioRow[] }).scenarioRows;
    const dispatchRow = rows.find((row) => row.scenarioFamily === 'dispatch');
    assert.ok(dispatchRow);
    assert.equal(dispatchRow.tenant, 'tenant:safe-custom');
    assert.equal(dispatchRow.request, 'POST /runtime/custom-safe-dispatch request:dispatch:777');
    assert.equal(dispatchRow.sourceObject, 'safe-custom-source');
    assert.equal(dispatchRow.proofClass, 'dispatch-proof-safe-custom');
  } finally {
    await harness.cleanup();
  }
});

test('collectTask10PrivateSources resolves only expected handles, rejects symlink/oversize inputs, and includes actual authority bytes', async () => {
  const harness = await createRootHarness();
  try {
    const producerFile = path.join(harness.roots.privateOutput, 'evidence.json');
    const producerBytes = new TextEncoder().encode('producer-private-bytes');
    await writeFile(producerFile, producerBytes);
    const producerHandle = buildHandle(producerBytes);
    const scenarioRows: Task10ScenarioRow[] = buildAuthorityBlockedScenarioRows(RUN_STARTED_AT).map((row, index): Task10ScenarioRow => (index === 0
      ? row
      : index === 3
        ? {
            ...row,
            privateEvidenceHandles: [producerHandle],
            privateEvidenceAttestations: [{
              handle: producerHandle,
              sourceClass: 'producer-contract-probe',
              verified: true,
              verifiedAt: RUN_STARTED_AT,
            }],
          }
        : row));
    const resolved = await collectTask10PrivateSources({
      scenarioRows,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    });
    assert.equal(resolved.has(buildHandle(buildAuthorityPreflightBytes())), true);
    assert.equal(resolved.has(buildHandle(buildAuthorityBundleBytes())), true);
    assert.equal(resolved.has(producerHandle), true);

    const symlinkPath = path.join(harness.roots.privateOutput, 'symlinked.json');
    await symlink(producerFile, symlinkPath);
    await assert.rejects(() => collectTask10PrivateSources({
      scenarioRows: [{
        ...scenarioRows[0]!,
        privateEvidenceHandles: [producerHandle],
        privateEvidenceAttestations: [{
          handle: producerHandle,
          sourceClass: 'producer-contract-probe',
          verified: true,
          verifiedAt: RUN_STARTED_AT,
        }],
      }],
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }, { maxFileBytes: 4 }), /missing|oversize|symlink/i);
  } finally {
    await harness.cleanup();
  }
});

test('collectTask10PrivateSources rejects special socket nodes without blocking', async () => {
  if (process.platform === 'win32') {
    return;
  }
  const harness = await createRootHarness();
  const shortOutputRoot = await realpath(await mkdtemp('/tmp/task10-private-out-'));
  const socketPath = path.join(shortOutputRoot, 'special-node.sock');
  const server = net.createServer();
  let listening = false;
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, () => {
        listening = true;
        resolve();
      });
    });
    await assert.rejects(() => collectTask10PrivateSources({
      scenarioRows: buildAuthorityBlockedScenarioRows(RUN_STARTED_AT),
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: shortOutputRoot,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }), /special|symlinked|node/i);
  } finally {
    if (listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    await rm(shortOutputRoot, { recursive: true, force: true });
    await harness.cleanup();
  }
});

test('collectTask10PrivateSources allows aggregate private evidence above the old 8 MiB floor but rejects configured aggregate overflow', async () => {
  const harness = await createRootHarness();
  try {
    const baseRows = buildAuthorityBlockedScenarioRows(RUN_STARTED_AT);
    const files = await Promise.all(['a', 'b', 'c', 'd', 'e'].map(async (name, index) => {
      const filePath = path.join(harness.roots.privateOutput, `${name}.bin`);
      const bytes = new Uint8Array(Math.floor(1.9 * 1024 * 1024)).fill(0x61 + index);
      await writeFile(filePath, bytes);
      return {
        handle: buildHandle(bytes),
        row: {
          ...baseRows[index % baseRows.length]!,
          privateEvidenceHandles: [buildHandle(bytes)],
          privateEvidenceAttestations: [{
            handle: buildHandle(bytes),
            sourceClass: 'producer-contract-probe',
            verified: true,
            verifiedAt: RUN_STARTED_AT,
          }],
        } satisfies Task10ScenarioRow,
      };
    }));
    const scenarioRows: Task10ScenarioRow[] = files.map((entry) => entry.row);

    const resolved = await collectTask10PrivateSources({
      scenarioRows,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    });
    for (const entry of files) {
      assert.equal(resolved.has(entry.handle), true);
    }

    await assert.rejects(() => collectTask10PrivateSources({
      scenarioRows,
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
    }, { maxTotalBytes: 1024 }), /bytes exceed bound/i);
  } finally {
    await harness.cleanup();
  }
});

test('gate-blocked default path uses actual authority bytes to produce seven blocked rows and does not require an injected adapter', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  let evaluationInput: unknown;
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      recordTask10GateCommands: async (): Promise<Task10CommandRow[]> => [
        { command: 'npm test', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'executed', exitCode: 1, skippedDueTo: null },
        { command: 'npm run typecheck', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped', exitCode: null, skippedDueTo: 'npm test' },
        { command: 'npm run build', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped', exitCode: null, skippedDueTo: 'npm test' },
        { command: 'npm run validate', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped', exitCode: null, skippedDueTo: 'npm test' },
        { command: 'npm run validate:release-readiness', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped', exitCode: null, skippedDueTo: 'npm test' },
        { command: 'npm run validate:release-gate', cwd: 'frozen-client-root', startedAt: RUN_STARTED_AT, endedAt: RUN_STARTED_AT, status: 'skipped', exitCode: null, skippedDueTo: 'npm test' },
      ],
      adaptTask10ScenarioRows: undefined,
      evaluateExecutionEvidence: async (input) => {
        recorder.order.push('evaluator');
        evaluationInput = input;
        return {
          candidateConclusion: 'blocked',
          reasonCodes: ['gate-execution-blocked'],
          missingEvidence: [],
        };
      },
      finalizeTask10Conclusion: async () => {
        recorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['gate-execution-blocked'],
          missingEvidence: [],
        };
      },
    }));
    assert.equal(result.exitCode, 0);
    const normalized = evaluationInput as { scenarioRows: Task10ScenarioRow[] };
    assert.equal(normalized.scenarioRows.length, 7);
    assert.ok(normalized.scenarioRows.every((row) => row.reasonCodes.includes('gate-execution-blocked')));
    assert.deepEqual(
      normalized.scenarioRows.map((row) => row.privateEvidenceAttestations[0]?.sourceClass),
      ['preflight', 'preflight', 'preflight', 'authority-bundle', 'authority-bundle', 'authority-bundle', 'authority-bundle'],
    );
  } finally {
    await harness.cleanup();
  }
});

test('cleanup failure is reported explicitly with sanitized stderr when staged discard fails after orchestration error', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      finalizeTask10Conclusion: async () => {
        recorder.order.push('finalizer');
        return {
          conclusion: 'blocked',
          reasonCodes: ['blocked'],
          missingEvidence: [],
        };
      },
      assessCandidatePublication: async () => {
        recorder.order.push('assess');
        return {
          ok: true,
          checks: {
            secretScanVerified: true,
            internalManifestVerified: true,
            archiveVerified: true,
            receiptVerified: true,
          },
          staged: {
            packageName: buildTask10PackageName(RUN_STARTED_AT),
            checks: {
              secretScanVerified: true,
              internalManifestVerified: true,
              archiveVerified: true,
              receiptVerified: true,
            },
          },
        };
      },
      freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
        throw new Error('freeze failed');
      },
      discardTask10Publication: async () => {
        throw new Error('cleanup path /Users/private/token=abc');
      },
    }));
    assert.equal(result.exitCode, 1);
    assert.match(recorder.stderr.join(''), /cleanup|tooling/i);
    assert.doesNotMatch(recorder.stderr.join(''), /Users|token=abc/);
  } finally {
    await harness.cleanup();
  }
});

test('runVerifyTask10ClientReproducibility rejects absolute or unsafe receipt paths instead of rewriting them into stdout', async () => {
  const harness = await createRootHarness();
  const recorder = createRecorder();
  try {
    const result = await runVerifyTask10ClientReproducibility(harness.args, createDependencies(recorder, {
      freezeTask10Publication: async (): Promise<Task10ValidatedPublication> => {
        recorder.order.push('freeze');
        return {
          ...buildValidatedPublicationStub('passed', 'producer'),
          packageDirectoryPath: '/absolute/private/package-dir',
          archivePath: '/absolute/private/archive.tar.gz',
          receiptPath: '/absolute/private/receipt.json',
          receipt: {
            ...buildValidatedPublicationStub('passed', 'producer').receipt,
            packageDirectory: '/absolute/private/package-dir',
            conclusionPath: '/absolute/private/client-conclusion.json',
            archivePath: '/absolute/private/archive.tar.gz',
          },
        };
      },
      validateProducerPublication: async (): Promise<Task10ValidatedPublication> => ({
        ...buildValidatedPublicationStub('passed', 'producer'),
        packageDirectoryPath: '/absolute/private/package-dir',
        archivePath: '/absolute/private/archive.tar.gz',
        receiptPath: '/absolute/private/receipt.json',
        receipt: {
          ...buildValidatedPublicationStub('passed', 'producer').receipt,
          packageDirectory: '/absolute/private/package-dir',
          conclusionPath: '/absolute/private/client-conclusion.json',
          archivePath: '/absolute/private/archive.tar.gz',
        },
      }),
      validateOfflinePublication: async (): Promise<Task10ValidatedPublication> => ({
        ...buildValidatedPublicationStub('passed', 'offline'),
        packageDirectoryPath: '/absolute/private/package-dir',
        archivePath: '/absolute/private/archive.tar.gz',
        receiptPath: '/absolute/private/receipt.json',
        receipt: {
          ...buildValidatedPublicationStub('passed', 'offline').receipt,
          packageDirectory: '/absolute/private/package-dir',
          conclusionPath: '/absolute/private/client-conclusion.json',
          archivePath: '/absolute/private/archive.tar.gz',
        },
      }),
    }));
    assert.equal(result.exitCode, 1);
    assert.equal(recorder.stdout.join(''), '');
    assert.match(recorder.stderr.join(''), /receipt|path/i);
  } finally {
    await harness.cleanup();
  }
});

test('main sanitizes parser failures without echoing raw argv values', async () => {
  const recorder = createRecorder();
  const result = await main(['--private-input', '/tmp/secret-path'], {
    stdout: { write(value: string) { recorder.stdout.push(value); } },
    stderr: { write(value: string) { recorder.stderr.push(value); } },
  });
  assert.equal(result.exitCode, 1);
  assert.equal(recorder.stdout.join(''), '');
  assert.doesNotMatch(recorder.stderr.join(''), /secret-path/);
});

test('coordinator source does not hardcode final passed/blocked conclusions or use core_conclusion', async () => {
  const source = await readFile(new URL('../scripts/verify-task10-client-reproducibility.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /conclusion:\s*'passed'/);
  assert.doesNotMatch(source, /conclusion:\s*'blocked'/);
  assert.doesNotMatch(source, /core_conclusion/);
  assert.match(source, /packageDirectory/);
  assert.doesNotMatch(source, /normalizeReceiptPath/);
});

test('buildDefaultTask10ProhibitedValues includes resolved roots and optional token without exposing absent values', async () => {
  const harness = await createRootHarness();
  try {
    const prohibited = buildDefaultTask10ProhibitedValues({
      roots: {
        privateInput: harness.roots.privateInput,
        privateOutput: harness.roots.privateOutput,
        privateLogRoot: harness.roots.privateLogRoot,
        publicationRoot: harness.roots.publicationRoot,
        coreCheckout: harness.roots.coreCheckout,
        coreEvidenceCheckout: harness.roots.coreEvidenceCheckout,
        clientCheckout: harness.roots.clientCheckout,
        siteCheckout: harness.roots.siteCheckout,
        coreBundle: harness.bundlePath,
        corePreflight: harness.preflightPath,
      },
      env: {
        BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN: 'top-secret-token',
      },
    });
    assert.ok(prohibited['absolute local paths'].includes(harness.bundlePath));
    assert.deepEqual(prohibited.tokens, ['top-secret-token']);
  } finally {
    await harness.cleanup();
  }
});

test('TASK10_CLIENT_REPRODUCIBILITY runbook publishes the frozen owner-only blocked audit procedure without private leakage', async () => {
  const markdown = await readFile(new URL('../docs/TASK10_CLIENT_REPRODUCIBILITY.md', import.meta.url), 'utf8');
  const requiredDocFiles = [...TASK10_CONTENT_FILES, 'secret-review.json', 'SHA256SUMS.txt'];
  const rootPreparationSection = extractSection(markdown, '2. Clean producer root preparation');
  const privateRootsSection = extractSection(markdown, '3. Private roots and token boundary');
  const coreProducerSection = extractSection(markdown, '4. Reconstructed Core producer command');
  const lifecycleSection = extractSection(markdown, '5. Producer lifecycle and current blocked expectation');
  const coordinatorSection = extractSection(markdown, '7. Coordinator command');
  const resultSection = extractSection(markdown, '8. Result interpretation, package membership, and handoff');
  const rootPreparationBlock = extractSingleBashBlock(rootPreparationSection, '2. Clean producer root preparation');
  const coreProducerBlock = extractSingleBashBlock(coreProducerSection, '4. Reconstructed Core producer command');
  const coordinatorBlock = extractSingleBashBlock(coordinatorSection, '7. Coordinator command');
  const extractQuotedFlagValue = (block: string, flag: '--core-lockfile-hash' | '--client-lockfile-hash' | '--site-lockfile-hash'): string => {
    const match = block.match(new RegExp(`${flag}\\s+"([^"]+)"`));
    assert.ok(match, `${flag} missing from reconstructed Core command`);
    return match[1]!;
  };

  for (const [index, block] of extractBashBlocks(markdown).entries()) {
    const syntax = spawnSync('zsh', ['-n'], {
      input: block,
      encoding: 'utf8',
    });
    assert.equal(
      syntax.status,
      0,
      `bash block ${index + 1} failed zsh -n:\nSTDERR:\n${syntax.stderr}\nBLOCK:\n${block}`,
    );
  }

  assert.match(markdown, /^# .+\n\nThis runbook /);
  assert.match(markdown, /## Scope and boundary/);
  assert.match(markdown, /## Immediate caveats/);
  assert.match(markdown, /## 1\. Frozen authority/);
  assert.match(markdown, /## 2\. Clean producer root preparation/);
  assert.match(markdown, /## 3\. Private roots and token boundary/);
  assert.match(markdown, /## 4\. Reconstructed Core producer command/);
  assert.match(markdown, /## 5\. Producer lifecycle and current blocked expectation/);
  assert.match(markdown, /## 6\. Client-side six gates/);
  assert.match(markdown, /## 7\. Coordinator command/);
  assert.match(markdown, /## 8\. Result interpretation, package membership, and handoff/);

  assert.match(markdown, /97e2fbe3934ea821daf654afa0adaef2c3e16077/);
  assert.match(markdown, /31195b898a6794e78518bb9b71833ecaaf5e563e/);
  assert.match(markdown, /f0198caf349fad367c016d7ff333172ec71a55be/);
  assert.match(markdown, /8d2692fea8a450225717c067628bbc0b372c7536/);
  assert.match(markdown, /e438232e982722fd4ec431260053eafe369723f93659070688f961a5c740b3db/);
  assert.match(markdown, new RegExp(TASK10_AUTHORITY.attemptId));
  assert.match(markdown, new RegExp(escapeRegExp(TASK10_AUTHORITY.coreBundlePath)));
  assert.match(markdown, new RegExp(escapeRegExp(TASK10_AUTHORITY.corePreflightPath)));
  assert.match(markdown, /1eee8a5d6de9a34486b287be425b6f747f155c8c83ef436c448e13baf08ad685/);
  assert.match(markdown, /docs\/org\/review-records\/artifacts\/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet\.json/);
  assert.match(markdown, /53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093/);

  assert.match(coreProducerSection, /fully populated terminal command is \*\*reconstructed from the authoritative frozen Core CLI contract because no exact PR #51 terminal transcript was published\*\*/);
  assert.match(coreProducerSection, /owner uses this template for audit, not a second competing execution/i);
  assert.equal(coreProducerBlock.startsWith('npm run run:merged-main-reproducibility-producers -- \\\n'), true);
  assert.deepEqual(parseQuotedFlagValuePairs(coreProducerBlock), [
    ['--core-root', '<absolute-clean-core-main-root>'],
    ['--client-root', '<absolute-clean-client-main-root>'],
    ['--site-root', '<absolute-clean-site-main-root>'],
    ['--core-sha', TASK10_AUTHORITY.coreRuntimeSha],
    ['--client-sha', TASK10_AUTHORITY.clientBaselineSha],
    ['--site-sha', TASK10_AUTHORITY.siteBaselineSha],
    ['--core-branch', 'main'],
    ['--client-branch', 'main'],
    ['--site-branch', 'main'],
    ['--core-upstream', 'origin/main'],
    ['--client-upstream', 'origin/main'],
    ['--site-upstream', 'origin/main'],
    ['--core-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.core],
    ['--client-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.client],
    ['--site-lockfile-hash', TASK10_AUTHORITY.lockfileSha256.site],
    ['--core-package-identity', TASK10_AUTHORITY.packageIdentities.core],
    ['--client-package-identity', TASK10_AUTHORITY.packageIdentities.client],
    ['--site-package-identity', TASK10_AUTHORITY.packageIdentities.site],
    ['--attempt-id', TASK10_AUTHORITY.attemptId],
    ['--input-evidence-root', '<empty-private-input-root>'],
    ['--output-root', '<empty-private-output-root>'],
    ['--selected-reusable-source-packet', 'docs/org/review-records/artifacts/2026-07-15-cn-vn-industrial-chemical-approved-reusable-asset-packet.json'],
    ['--selected-reusable-source-packet-sha256', '53f99c0f94f2ec7a388a124bf0bc0969d4cf3b054123b8c7f4693ea1dae67093'],
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

  const coreLock = extractQuotedFlagValue(coreProducerBlock, '--core-lockfile-hash');
  const clientLock = extractQuotedFlagValue(coreProducerBlock, '--client-lockfile-hash');
  const siteLock = extractQuotedFlagValue(coreProducerBlock, '--site-lockfile-hash');
  assert.equal(coreLock, TASK10_AUTHORITY.lockfileSha256.core);
  assert.equal(clientLock, TASK10_AUTHORITY.lockfileSha256.client);
  assert.equal(siteLock, TASK10_AUTHORITY.lockfileSha256.site);
  for (const value of [coreLock, clientLock, siteLock]) {
    assert.match(value, /^[0-9a-f]{64}$/);
    assert.doesNotMatch(value, /^sha256:/);
  }

  assert.equal(coordinatorBlock.startsWith('npm run validate:task10-client-reproducibility -- \\\n'), true);
  assert.deepEqual(parseFlagSequence(coordinatorBlock), [...REQUIRED_FLAGS]);
  assert.match(coordinatorBlock, /--core-bundle "<absolute-detached-core-evidence-root>\/docs\/org\/review-records\/artifacts\/attempt-2026-07-18-task10-postmerge-002-output\/core-execution-evidence\.json"/);
  assert.match(coordinatorSection, /run the client-side coordinator from the Task 10 implementation worktree/i);
  assert.match(coordinatorSection, /frozen Client checkout is passed only through `--client-checkout`/i);
  assert.doesNotMatch(coordinatorSection, /from the frozen client checkout/i);

  const gateCommands = ['npm test', 'npm run typecheck', 'npm run build', 'npm run validate', 'npm run validate:release-readiness', 'npm run validate:release-gate'];
  let previousGateIndex = -1;
  for (const [index, gate] of gateCommands.entries()) {
    const marker = `${index + 1}. \`${gate}\``;
    const gateIndex = markdown.indexOf(marker);
    assert.notEqual(gateIndex, -1, `missing gate marker ${marker}`);
    assert.ok(gateIndex > previousGateIndex, `${gate} must follow source order`);
    previousGateIndex = gateIndex;
  }

  let previousFamilyIndex = -1;
  for (const family of TASK10_REQUIRED_SCENARIO_FAMILIES) {
    const familyIndex = markdown.indexOf(`- \`${family}\``);
    assert.notEqual(familyIndex, -1, `missing scenario family ${family}`);
    assert.ok(familyIndex > previousFamilyIndex, `${family} must remain in declared order`);
    previousFamilyIndex = familyIndex;
  }

  assert.match(markdown, /seven rows across five scenario families/i);
  assert.match(markdown, /session-access: 1/);
  assert.match(markdown, /readiness: 2/);
  assert.match(markdown, /dispatch: 1/);
  assert.match(markdown, /replay-recovery: 2/);
  assert.match(markdown, /result-submission: 1/);

  assert.match(privateRootsSection, /BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN/);
  assert.match(rootPreparationSection, /correspond to the coordinator placeholders/i);
  assert.doesNotMatch(markdown, /BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN\s*=/);
  assert.doesNotMatch(markdown, /TOKEN=/);
  assert.doesNotMatch(markdown, /<token>/i);

  assert.match(rootPreparationSection, /owner-only 0700/i);
  assert.match(rootPreparationSection, /outside Git/i);
  assert.match(rootPreparationSection, /initially empty/i);
  assert.match(rootPreparationSection, /never install or modify the evidence checkout/i);
  assert.match(rootPreparationSection, /implementation worktree is not a producer root/i);
  assert.match(rootPreparationSection, /no `\.sisyphus` dependency/i);
  assert.match(rootPreparationSection, /git rev-parse --abbrev-ref --symbolic-full-name '@\{upstream\}'/);
  assert.match(rootPreparationSection, /node --input-type=module -e 'import fs from "node:fs";[^\n]+console\.log\(`\$\{pkg\.name\}@\$\{pkg\.version\}`\);'/);
  assert.match(rootPreparationBlock, /mktemp -d/);
  assert.match(rootPreparationBlock, /session_root="\$\(realpath "\$\(mktemp -d/);
  assert.match(rootPreparationBlock, /umask 077/);
  assert.match(rootPreparationBlock, /mkdir -m 700/);
  assert.match(rootPreparationBlock, /realpath/);
  assert.match(rootPreparationBlock, /stat -f '%Lp'/);
  assert.match(rootPreparationBlock, /find "\$root" -mindepth 1 -maxdepth 1 -print -quit/);
  assert.match(rootPreparationBlock, /git -C "\$root" rev-parse --is-inside-work-tree/);
  assert.match(rootPreparationBlock, /path\.relative/);
  assert.match(rootPreparationBlock, /publication_root/);
  assert.match(rootPreparationBlock, /\[\[ "\$canonical_root" = "\$root" \]\]/);

  assert.match(markdown, /bidvia-task10-attempt-2026-07-18-task10-postmerge-002/);
  for (const containerName of [
    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-runtime',
    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-postgres',
    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-fixture',
    'bidvia-task10-attempt-2026-07-18-task10-postmerge-002-operator',
  ]) {
    assert.match(markdown, new RegExp(containerName));
  }
  assert.match(lifecycleSection, /startup, readiness `\/readyz`, reset, success-001, recovery-001, success-002-reuse, restart\/readback, and finally teardown is specified and owned by the frozen Core producer contract/i);
  assert.match(lifecycleSection, /client coordinator\/adapter performs authority\/checkout\/private-root checks, delegates one Core command only if probe permits, validates returned artifacts, and does not implement or independently attest Docker teardown/i);
  assert.match(lifecycleSection, /current pre-spawn blocked path proves no Core command was launched and therefore no Compose resources should exist/i);
  assert.match(lifecycleSection, /if a future probe permits execution, the owner must independently inspect Core producer evidence and the host for finally teardown before accepting the package/i);
  assert.match(lifecycleSection, /external private roots fail repo-relative/i);
  assert.match(lifecycleSection, /internal roots fail non-overlap/i);
  assert.match(lifecycleSection, /never relocate private evidence into the repo or modify Core to force pass/i);

  assert.match(markdown, /exit 0 only after an immutable valid `passed` or `blocked` package/i);
  assert.match(markdown, /current expected result is a valid blocked package/i);
  assert.match(markdown, /core-producer-private-root-contract-unsatisfied/);
  assert.match(markdown, /tooling failures exit nonzero and emit no success receipt/i);
  assert.match(markdown, /a `passed` conclusion is invalid unless the probe and every downstream check execute and pass/i);
  assert.match(markdown, /client-owned/i);
  assert.match(markdown, /review-only/i);
  assert.match(markdown, /not Core-authored/i);
  for (const nonClaim of TASK10_NON_CLAIMS) {
    assert.match(markdown, new RegExp(escapeRegExp(nonClaim)));
  }

  assert.deepEqual(extractBulletCodeValues(resultSection, 'Approved package members:'), requiredDocFiles);
  assert.match(resultSection, /archive/i);
  assert.match(resultSection, /receipt/i);
  assert.match(resultSection, /command, conclusion, packageName, packagePath, conclusionPath, conclusionSha256, archivePath, archiveSha256/);
  assert.match(resultSection, /private output contents, raw logs, raw matrix bodies, credentials, session IDs, generated account IDs, emails, and absolute local paths stay out of Git, publication, and sanitized stdout/i);
  assert.match(resultSection, /only approved sanitized opaque SHA handles and attestations may cross the boundary/i);
  assert.match(resultSection, /cleanup after the owner retention policy allows it/i);
  assert.match(resultSection, /offline handoff/i);

  assert.doesNotMatch(markdown, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(markdown, /\/Users\//);
  assert.doesNotMatch(markdown, /\/private\//);
  assert.doesNotMatch(markdown, /docs\/superpowers\/plans\//);
  assert.doesNotMatch(markdown, /Task 9|Task 10 contracts|agent workflow|implementation task/i);
});
