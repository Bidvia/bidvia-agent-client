import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  copyFile,
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import {
  TASK10_AUTHORITY,
  TASK10_CONTENT_FILES,
  TASK10_NON_CLAIMS,
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
} from './contracts.js';
import type {
  Task10ClientConclusion,
  Task10ClientFingerprint,
  Task10CommandLog,
  Task10Conclusion,
  Task10PrivateEvidenceAttestation,
  Task10PublicationReceipt,
  Task10ScenarioMatrix,
  Task10ScenarioRow,
  Task10SecretReview,
} from './contracts.js';

const README_FILE = 'README.md';
const SECRET_REVIEW_FILE = 'secret-review.json';
const MANIFEST_FILE = 'SHA256SUMS.txt';
const PACKAGE_FILE_MODE = 0o600;
const PACKAGE_DIR_MODE = 0o700;
const PACKAGE_MEMBER_MAX_BYTES = 2 * 1024 * 1024;
const RECEIPT_MAX_BYTES = 2 * 1024 * 1024;
const ARCHIVE_MAX_BYTES = 16 * 1024 * 1024;
const README_LINK_PATTERN = /\[[^\]]+\]\(([^)]+)\)/g;
const CANONICAL_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_HANDLE_PATTERN = /^sha256:[0-9a-f]{64}$/;
const TAR_LIST_OUTPUT_LIMIT_BYTES = 256 * 1024;
const SAFE_TAR_ENV = Object.freeze({
  PATH: process.env.PATH,
  LANG: process.env.LANG,
  LC_ALL: process.env.LC_ALL,
  COPYFILE_DISABLE: '1',
});

type Task10ContentFileName = (typeof TASK10_CONTENT_FILES)[number];
type Task10ProhibitedValueFamily = (typeof TASK10_PROHIBITED_VALUE_FAMILIES)[number];
type Task10ScenarioFamily = (typeof TASK10_REQUIRED_SCENARIO_FAMILIES)[number];
type Task10PrivateSourceClass = Task10PrivateEvidenceAttestation['sourceClass'];

export interface Task10PublicationDecision {
  conclusion: Task10Conclusion;
  reasonCodes: string[];
  missingEvidence: string[];
}

export type Task10ProhibitedValueCatalog = Readonly<{
  [K in Task10ProhibitedValueFamily]: readonly string[];
}>;

export interface Task10PrivateSourceEntry {
  sourceClass: Task10PrivateSourceClass;
  bytes: Uint8Array;
}

export type Task10PrivateSourceMap = ReadonlyMap<`sha256:${string}`, Task10PrivateSourceEntry>;

export interface Task10ArchiveMember {
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'hardlink' | 'other';
}

export interface Task10ArchiveDirectoryInput {
  sourceDirectory: string;
  archivePath: string;
  rootName: string;
}

export interface Task10ListArchiveMembersInput {
  archivePath: string;
}

export interface Task10ReadArchiveMemberInput {
  archivePath: string;
  memberPath: string;
}

export interface Task10ArchiveDependencies {
  archiveDirectory(input: Task10ArchiveDirectoryInput): Promise<void>;
  listArchiveMembers(input: Task10ListArchiveMembersInput): Promise<readonly Task10ArchiveMember[]>;
  readArchiveMember(input: Task10ReadArchiveMemberInput): Promise<Uint8Array>;
}

export interface Task10CandidatePayloadInput {
  decision: Task10PublicationDecision;
  fingerprint: Task10ClientFingerprint;
  commandLog: Task10CommandLog;
  scenarioRows: readonly Task10ScenarioRow[];
  generatedAt: string;
  prohibitedValues: Task10ProhibitedValueCatalog;
}

export interface Task10CandidatePayload {
  packageName: string;
  packageMembers: readonly string[];
  clientConclusion: Task10ClientConclusion;
  checks: Task10PublicationChecks;
}

export interface Task10PublicationChecks {
  secretScanVerified: boolean;
  internalManifestVerified: boolean;
  archiveVerified: boolean;
  receiptVerified: boolean;
}

export interface Task10ValidatedPublication {
  packageName: string;
  packageDirectoryPath: string;
  archivePath: string;
  receiptPath: string;
  archiveSha256: string;
  archiveSizeBytes: number;
  receipt: Task10PublicationReceipt;
  checks: Task10PublicationChecks;
  validationMode: 'producer' | 'offline';
  privateSourceBytesReverified: boolean;
}

export interface Task10StagedPublication {
  packageName: string;
  checks: Task10PublicationChecks;
}

export type Task10AssessedCandidatePublication =
  | {
      ok: true;
      checks: Task10PublicationChecks;
      staged: Task10StagedPublication;
    }
  | {
      ok: false;
      checks: Task10PublicationChecks;
    };

export interface Task10MaterializePublicationInput {
  publicationRoot: string;
  candidate: Task10CandidatePayload;
  privateSources: Task10PrivateSourceMap;
  archive: Task10ArchiveDependencies;
}

export interface Task10AssessCandidatePublicationInput extends Task10MaterializePublicationInput {}

export interface Task10ValidatePublicationInput {
  packageDirectoryPath: string;
  archivePath: string;
  receiptPath: string;
  archive: Task10ArchiveDependencies;
  publicationRootNameForReceipt?: string;
}

export interface Task10ValidateProducerPublicationInput extends Task10ValidatePublicationInput {
  privateSources: Task10PrivateSourceMap;
}

type ValidatedPackageFiles = {
  packageName: string;
  memberNames: readonly string[];
  memberBytes: Map<string, Uint8Array>;
  conclusion: Task10ClientConclusion;
  fingerprint: Task10ClientFingerprint;
  commandLog: Task10CommandLog;
  scenarioMatrix: Task10ScenarioMatrix;
  secretReview: Task10SecretReview;
  manifestText: string;
  manifestSha256: string;
};

type SecretFinding = {
  code: string;
  family: Task10ProhibitedValueFamily;
  count: number;
};

type ScanState = {
  findings: Map<Task10ProhibitedValueFamily, number>;
};

type StringSanitization = {
  sanitized: string;
  changed: boolean;
};

type ReceiptValidationFlags = Task10PublicationReceipt['validation'];

class Task10PublicationVerificationError extends Error {
  readonly check: keyof Task10PublicationChecks;

  constructor(check: keyof Task10PublicationChecks, message: string) {
    super(message);
    this.name = 'Task10PublicationVerificationError';
    this.check = check;
  }
}

class Task10ToolingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Task10ToolingError';
  }
}

type InternalStagedPublicationState = {
  publicationRoot: string;
  packageDirectoryPath: string;
  archivePath: string;
  receiptPath: string;
  finalPackageDirectoryPath: string;
  finalArchivePath: string;
  finalReceiptPath: string;
  archive: Task10ArchiveDependencies;
  privateSources: Task10PrivateSourceMap;
  consumed: boolean;
};

type InternalCandidateState = {
  packageName: string;
  wrapperFiles: readonly [
    'secret-review.json',
    'SHA256SUMS.txt',
    string,
    string,
  ];
  packageMembers: readonly string[];
  fileBytes: ReadonlyMap<string, Uint8Array>;
  clientConclusion: Task10ClientConclusion;
  fingerprint: Task10ClientFingerprint;
  commandLog: Task10CommandLog;
  scenarioMatrix: Task10ScenarioMatrix;
  secretReview: Task10SecretReview;
  manifestSha256: string;
  checks: Task10PublicationChecks;
};

const stagedPublicationState = new WeakMap<Task10StagedPublication, InternalStagedPublicationState>();
const candidatePublicationState = new WeakMap<Task10CandidatePayload, InternalCandidateState>();

const scenarioFamilyOrder = new Map<Task10ScenarioFamily, number>(
  TASK10_REQUIRED_SCENARIO_FAMILIES.map((family, index) => [family, index]),
);

const prohibitedFamilyCodes: Readonly<Record<Task10ProhibitedValueFamily, string>> = Object.freeze({
  'admin session ids': 'redacted-admin-session-id',
  'account session ids': 'redacted-account-session-id',
  passwords: 'redacted-password',
  tokens: 'redacted-token',
  'credential secret refs': 'redacted-credential-secret-ref',
  'fixture credentials': 'redacted-fixture-credential',
  'email addresses': 'redacted-email-address',
  'generated account identifiers': 'redacted-generated-account-identifier',
  'request and response bodies': 'redacted-request-or-response-body',
  'absolute local paths': 'redacted-absolute-local-path',
});

export const EMPTY_TASK10_PROHIBITED_VALUE_CATALOG: Task10ProhibitedValueCatalog = Object.freeze({
  'admin session ids': Object.freeze([]),
  'account session ids': Object.freeze([]),
  passwords: Object.freeze([]),
  tokens: Object.freeze([]),
  'credential secret refs': Object.freeze([]),
  'fixture credentials': Object.freeze([]),
  'email addresses': Object.freeze([]),
  'generated account identifiers': Object.freeze([]),
  'request and response bodies': Object.freeze([]),
  'absolute local paths': Object.freeze([]),
});

export function createDefaultTask10ArchiveDependencies(options: {
  tarCommand?: string;
  timeoutMs?: number;
} = {}): Task10ArchiveDependencies {
  const tarCommand = options.tarCommand ?? 'tar';
  const timeoutMs = options.timeoutMs ?? 30_000;
  return {
    async archiveDirectory(input) {
      const result = await spawnAndCapture(tarCommand, [
        '-czf',
        input.archivePath,
        '-C',
        path.dirname(input.sourceDirectory),
        input.rootName,
      ], TAR_LIST_OUTPUT_LIMIT_BYTES, timeoutMs);
      if (result.exitCode !== 0) {
        throw new Error('task10 archive creation failed');
      }
    },
    async listArchiveMembers(input) {
      const namesResult = await spawnAndCapture(tarCommand, ['-tf', input.archivePath], TAR_LIST_OUTPUT_LIMIT_BYTES, timeoutMs);
      const verboseResult = await spawnAndCapture(tarCommand, ['-tvf', input.archivePath], TAR_LIST_OUTPUT_LIMIT_BYTES, timeoutMs);
      if (namesResult.exitCode !== 0 || verboseResult.exitCode !== 0) {
        throw new Error('task10 archive inspection failed');
      }
      return parseTarListings(namesResult.stdout, verboseResult.stdout);
    },
    async readArchiveMember(input) {
      const result = await spawnAndCaptureBinary(
        tarCommand,
        ['-xOf', input.archivePath, input.memberPath],
        PACKAGE_MEMBER_MAX_BYTES,
        timeoutMs,
      );
      if (result.exitCode !== 0) {
        throw new Error('task10 archive member read failed');
      }
      return result.stdout;
    },
  };
}

export function assembleCandidatePayload(input: Task10CandidatePayloadInput): Task10CandidatePayload {
  const scanState = createScanState();
  const decision = sanitizeDecision(normalizeDecision(input.decision), input.prohibitedValues, scanState);
  const packageName = buildTask10PackageName(input.fingerprint.runStartedAt);
  const wrapperFiles = buildTask10WrapperFiles(packageName);
  const sanitizedFingerprint = sanitizeValue(input.fingerprint, input.prohibitedValues, scanState) as Task10ClientFingerprint;
  const sanitizedCommandLog = sanitizeValue(input.commandLog, input.prohibitedValues, scanState) as Task10CommandLog;
  const sanitizedScenarioRows = input.scenarioRows.map((row) => sanitizeValue(row, input.prohibitedValues, scanState) as Task10ScenarioRow);
  const scenarioMatrix = buildScenarioMatrix(sanitizedScenarioRows, input.generatedAt);
  const clientConclusion = buildClientConclusion(decision);

  const contentObjects = new Map<Task10ContentFileName, unknown>([
    ['client-conclusion.json', buildTask10ClientConclusionWire(clientConclusion)],
    ['client-fingerprint.json', buildTask10ClientFingerprintWire(sanitizedFingerprint)],
    ['command-log.json', buildTask10CommandLogWire(sanitizedCommandLog)],
    ['scenario-matrix.json', buildTask10ScenarioMatrixWire(scenarioMatrix)],
  ]);

  const contentBytes = new Map<string, Uint8Array>();
  contentBytes.set(README_FILE, encodeUtf8(buildReadme({
    packageName,
    clientConclusion,
    fingerprint: sanitizedFingerprint,
    commandLog: sanitizedCommandLog,
    scenarioMatrix,
  })));
  for (const [fileName, value] of contentObjects) {
    contentBytes.set(fileName, serializeStableJson(sanitizeValue(value, input.prohibitedValues, scanState)));
  }

  const secretReview = buildSecretReview({
    candidateStatus: decision.conclusion,
    packageName,
    findings: buildSecretFindings(scanState),
  });
  contentBytes.set(SECRET_REVIEW_FILE, serializeStableJson(buildTask10SecretReviewWire(secretReview)));
  const manifestText = buildManifestText(contentBytes);
  contentBytes.set(MANIFEST_FILE, encodeUtf8(manifestText));

  const packageMembers = codeUnitSort([...contentBytes.keys()]);
  requireExactPackageMembers(packageMembers);
  validateReadme(contentBytes.get(README_FILE)!, new Set(packageMembers));
  rescanFinalBytes(contentBytes, input.prohibitedValues);

  const manifestSha256 = hashBytesHex(contentBytes.get(MANIFEST_FILE)!);
  const hasRedactions = scanState.findings.size > 0;
  const secretScanVerified = !(decision.conclusion === 'passed' && hasRedactions);

  const internalState: InternalCandidateState = {
    packageName,
    wrapperFiles,
    packageMembers,
    fileBytes: new Map(contentBytes),
    clientConclusion,
    fingerprint: sanitizedFingerprint,
    commandLog: sanitizedCommandLog,
    scenarioMatrix,
    secretReview,
    manifestSha256,
    checks: {
      secretScanVerified,
      internalManifestVerified: true,
      archiveVerified: false,
      receiptVerified: false,
    },
  };

  const candidate = deepFreeze({
    packageName,
    packageMembers: [...packageMembers],
    clientConclusion: cloneJson(clientConclusion),
    checks: { ...internalState.checks },
  }) as Task10CandidatePayload;
  candidatePublicationState.set(candidate, internalState);
  return candidate;
}

function resolveCandidatePublicationState(candidate: Task10CandidatePayload): InternalCandidateState {
  const state = candidatePublicationState.get(candidate);
  if (!state) {
    throw new Error('task10 candidate payload is not an authentic assembled candidate');
  }
  validateInternalCandidateState(state);
  return state;
}

function validateInternalCandidateState(state: InternalCandidateState): void {
  if (state.packageName !== buildTask10PackageName(state.fingerprint.runStartedAt)) {
    throw new Error('task10 candidate package name is not internally consistent');
  }
  requireExactPackageMembers(state.packageMembers);
  for (const memberName of state.packageMembers) {
    if (memberName !== path.posix.basename(memberName) || memberName.includes('/') || memberName.includes('\\')) {
      throw new Error('task10 candidate package member name is unsafe');
    }
  }
  if (state.wrapperFiles.length !== 4 || state.wrapperFiles.some((value) => value !== path.posix.basename(value))) {
    throw new Error('task10 candidate wrapper file names are unsafe');
  };
}

export async function assessCandidatePublication(input: Task10AssessCandidatePublicationInput): Promise<Task10AssessedCandidatePublication> {
  const candidateState = resolveCandidatePublicationState(input.candidate);
  if (candidateState.checks.secretScanVerified !== true) {
    return {
      ok: false,
      checks: checksForVerificationFailure('secretScanVerified'),
    };
  }
  const publicationRoot = await requireSafePublicationRoot(input.publicationRoot);
  const finalPaths = buildFinalPaths(publicationRoot, candidateState.packageName);
  await assertFinalTargetsAbsent(finalPaths);

  const stagingRoot = await mkdtemp(path.join(publicationRoot, '.task10-publication-stage-'));
  await chmod(stagingRoot, PACKAGE_DIR_MODE);
  const stagedPackageDirectoryPath = path.join(stagingRoot, candidateState.packageName);
  const stagedArchivePath = path.join(stagingRoot, `${candidateState.packageName}.tar.gz`);
  const stagedReceiptPath = path.join(stagingRoot, `${candidateState.packageName}.publication.json`);

  try {
    await mkdir(stagedPackageDirectoryPath, { mode: PACKAGE_DIR_MODE });
    await chmod(stagedPackageDirectoryPath, PACKAGE_DIR_MODE);
    for (const memberName of candidateState.packageMembers) {
      const memberBytes = candidateState.fileBytes.get(memberName);
      if (!memberBytes) {
        throw new Error('task10 candidate package is incomplete');
      }
      await writeSecureFile(path.join(stagedPackageDirectoryPath, memberName), memberBytes);
    }

    await input.archive.archiveDirectory({
      sourceDirectory: stagedPackageDirectoryPath,
      archivePath: stagedArchivePath,
      rootName: candidateState.packageName,
    });
    await requireRegularNonSymlinkFile(stagedArchivePath, 'staged archive');
    await chmod(stagedArchivePath, PACKAGE_FILE_MODE);
    const stagedArchiveBytes = await readBoundedRegularFile(stagedArchivePath, ARCHIVE_MAX_BYTES, 'staged archive');

    const producerValidation = await validatePackageCore({
      packageDirectoryPath: stagedPackageDirectoryPath,
      archivePath: stagedArchivePath,
      archive: input.archive,
      privateSources: input.privateSources,
      receiptPath: null,
      publicationRootNameForReceipt: path.posix.basename(publicationRoot),
      archiveBytesOverride: stagedArchiveBytes,
    });

    const receipt = buildPublicationReceipt({
      packageDirectoryPath: stagedPackageDirectoryPath,
      archivePath: stagedArchivePath,
      publicationRoot,
      packageName: candidateState.packageName,
      conclusion: producerValidation.files.conclusion,
      archiveSha256: producerValidation.archiveSha256,
      archiveSizeBytes: producerValidation.archiveSizeBytes,
      manifestSha256: producerValidation.files.manifestSha256,
      validation: producerValidation.receiptValidation,
    });
    await writeSecureFile(stagedReceiptPath, serializeStableJson(buildTask10PublicationReceiptWire(receipt)));

    await validatePackageCore({
      packageDirectoryPath: stagedPackageDirectoryPath,
      archivePath: stagedArchivePath,
      archive: input.archive,
      privateSources: input.privateSources,
      receiptPath: stagedReceiptPath,
      publicationRootNameForReceipt: path.posix.basename(publicationRoot),
      archiveBytesOverride: stagedArchiveBytes,
    });

    const staged: Task10StagedPublication = Object.freeze({
      packageName: candidateState.packageName,
      checks: {
        secretScanVerified: true,
        internalManifestVerified: true,
        archiveVerified: true,
        receiptVerified: true,
      },
    });
    stagedPublicationState.set(staged, {
      publicationRoot,
      packageDirectoryPath: stagedPackageDirectoryPath,
      archivePath: stagedArchivePath,
      receiptPath: stagedReceiptPath,
      finalPackageDirectoryPath: finalPaths.packageDirectoryPath,
      finalArchivePath: finalPaths.archivePath,
      finalReceiptPath: finalPaths.receiptPath,
      archive: input.archive,
      privateSources: input.privateSources,
      consumed: false,
    });

    return {
      ok: true,
      checks: {
        secretScanVerified: true,
        internalManifestVerified: true,
        archiveVerified: true,
        receiptVerified: true,
      },
      staged,
    };
  } catch (error) {
    await rm(stagingRoot, { recursive: true, force: true });
    if (error instanceof Task10PublicationVerificationError) {
      return {
        ok: false,
        checks: checksForVerificationFailure(error.check),
      };
    }
    throw normalizeError(error);
  }
}

export async function freezeTask10Publication(staged: Task10StagedPublication): Promise<Task10ValidatedPublication> {
  const state = takeStagedPublicationState(staged, 'freeze');
  const promotedPaths: string[] = [];
  try {
    await assertFinalTargetsAbsent({
      packageDirectoryPath: state.finalPackageDirectoryPath,
      archivePath: state.finalArchivePath,
      receiptPath: state.finalReceiptPath,
    });
    await mkdir(state.finalPackageDirectoryPath, { mode: PACKAGE_DIR_MODE });
    promotedPaths.push(state.finalPackageDirectoryPath);
    const memberNames = codeUnitSort(await readdir(state.packageDirectoryPath));
    for (const memberName of memberNames) {
      await copyFile(path.join(state.packageDirectoryPath, memberName), path.join(state.finalPackageDirectoryPath, memberName), fsConstants.COPYFILE_EXCL);
      await chmod(path.join(state.finalPackageDirectoryPath, memberName), PACKAGE_FILE_MODE);
    }
    await copyFile(state.archivePath, state.finalArchivePath, fsConstants.COPYFILE_EXCL);
    promotedPaths.push(state.finalArchivePath);
    await chmod(state.finalArchivePath, PACKAGE_FILE_MODE);

    await validateArchiveAndPackageOnly({
      packageDirectoryPath: state.finalPackageDirectoryPath,
      archivePath: state.finalArchivePath,
      archive: state.archive,
    });

    await copyFile(state.receiptPath, state.finalReceiptPath, fsConstants.COPYFILE_EXCL);
    promotedPaths.push(state.finalReceiptPath);
    await chmod(state.finalReceiptPath, PACKAGE_FILE_MODE);

    const validated = await validateOfflinePublication({
      packageDirectoryPath: state.finalPackageDirectoryPath,
      archivePath: state.finalArchivePath,
      receiptPath: state.finalReceiptPath,
      archive: state.archive,
      publicationRootNameForReceipt: path.posix.basename(state.publicationRoot),
    });
    await cleanupStagedPublicationState(state);
    return validateProducerPublication({
      packageDirectoryPath: validated.packageDirectoryPath,
      archivePath: validated.archivePath,
      receiptPath: validated.receiptPath,
      archive: state.archive,
      publicationRootNameForReceipt: path.posix.basename(state.publicationRoot),
      privateSources: state.privateSources,
    });
  } catch (error) {
    await rollbackPromotedOutputs(promotedPaths);
    await cleanupStagedPublicationState(state);
    throw normalizeError(error);
  }
}

export async function discardTask10Publication(staged: Task10StagedPublication): Promise<void> {
  const state = takeStagedPublicationState(staged, 'discard');
  await cleanupStagedPublicationState(state);
}

export async function materializeTask10Publication(input: Task10MaterializePublicationInput): Promise<Task10ValidatedPublication> {
  const assessed = await assessCandidatePublication(input);
  if (!assessed.ok) {
    const failedChecks = Object.entries(assessed.checks)
      .filter(([, value]) => value === false)
      .map(([key]) => key)
      .join(', ');
    throw new Error(`task10 publication verification failed before freeze: ${failedChecks}`);
  }
  return freezeTask10Publication(assessed.staged);
}

export async function validateProducerPublication(input: Task10ValidateProducerPublicationInput): Promise<Task10ValidatedPublication> {
  const validated = await validatePackageCore({
    packageDirectoryPath: input.packageDirectoryPath,
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
    archive: input.archive,
    privateSources: input.privateSources,
    publicationRootNameForReceipt: input.publicationRootNameForReceipt,
  });

  return {
    packageName: validated.files.packageName,
    packageDirectoryPath: input.packageDirectoryPath,
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
    archiveSha256: validated.archiveSha256,
    archiveSizeBytes: validated.archiveSizeBytes,
    receipt: validated.receipt,
    checks: {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    },
    validationMode: 'producer',
    privateSourceBytesReverified: true,
  };
}

export async function validateOfflinePublication(input: Task10ValidatePublicationInput): Promise<Task10ValidatedPublication> {
  const validated = await validatePackageCore({
    packageDirectoryPath: input.packageDirectoryPath,
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
    archive: input.archive,
    privateSources: null,
    publicationRootNameForReceipt: input.publicationRootNameForReceipt,
  });

  return {
    packageName: validated.files.packageName,
    packageDirectoryPath: input.packageDirectoryPath,
    archivePath: input.archivePath,
    receiptPath: input.receiptPath,
    archiveSha256: validated.archiveSha256,
    archiveSizeBytes: validated.archiveSizeBytes,
    receipt: validated.receipt,
    checks: {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: true,
      receiptVerified: true,
    },
    validationMode: 'offline',
    privateSourceBytesReverified: false,
  };
}

function normalizeDecision(decision: Task10PublicationDecision): Task10PublicationDecision {
  if (decision.conclusion !== 'passed' && decision.conclusion !== 'blocked') {
    throw new Error('task10 publication decision must use a supported conclusion');
  }
  return {
    conclusion: decision.conclusion,
    reasonCodes: codeUnitSort([...decision.reasonCodes]),
    missingEvidence: codeUnitSort([...decision.missingEvidence]),
  };
}

function sanitizeDecision(
  decision: Task10PublicationDecision,
  catalog: Task10ProhibitedValueCatalog,
  scanState: ScanState,
): Task10PublicationDecision {
  const sanitizedReasonCodes = decision.reasonCodes.map((value) => sanitizeString(value, catalog, scanState).sanitized);
  const sanitizedMissingEvidence = decision.missingEvidence.map((value) => sanitizeString(value, catalog, scanState).sanitized);
  return {
    conclusion: decision.conclusion,
    reasonCodes: codeUnitSort([...new Set(sanitizedReasonCodes)]),
    missingEvidence: codeUnitSort([...new Set(sanitizedMissingEvidence)]),
  };
}

function buildClientConclusion(decision: Task10PublicationDecision): Task10ClientConclusion {
  return {
    schemaVersion: 'bidvia-client-task10-owner-conclusion/v1',
    evidenceOwner: 'client',
    attemptId: TASK10_AUTHORITY.attemptId,
    conclusion: decision.conclusion,
    reasonCodes: [...decision.reasonCodes],
    missingEvidence: [...decision.missingEvidence],
    authorityRef: {
      issueUrl: TASK10_AUTHORITY.issueUrl,
      coreHandoffRunbookUrl: TASK10_AUTHORITY.coreHandoffRunbookUrl,
      coreBundleUrl: TASK10_AUTHORITY.coreBundleUrl,
      coreBundlePath: TASK10_AUTHORITY.coreBundlePath,
      coreBundleSha256: TASK10_AUTHORITY.coreBundleSha256,
      corePreflightPath: TASK10_AUTHORITY.corePreflightPath,
      corePreflightSha256: TASK10_AUTHORITY.corePreflightSha256,
    },
    nonClaims: TASK10_NON_CLAIMS,
  };
}

function buildScenarioMatrix(rows: readonly Task10ScenarioRow[], generatedAt: string): Task10ScenarioMatrix {
  requireCanonicalUtcTimestamp(generatedAt, 'generatedAt');
  const scenarios = [...rows].sort((left, right) => {
    const familyComparison = (scenarioFamilyOrder.get(left.scenarioFamily) ?? Number.MAX_SAFE_INTEGER)
      - (scenarioFamilyOrder.get(right.scenarioFamily) ?? Number.MAX_SAFE_INTEGER);
    if (familyComparison !== 0) {
      return familyComparison;
    }
    return compareCodeUnits(left.timestamp, right.timestamp)
      || compareCodeUnits(left.request, right.request);
  });
  const passedCount = scenarios.filter((row) => row.result === 'passed').length;
  const blockedCount = scenarios.length - passedCount;
  const presentFamilies = new Set(scenarios.map((row) => row.scenarioFamily));
  const missingFamilies = TASK10_REQUIRED_SCENARIO_FAMILIES.filter((family) => !presentFamilies.has(family));
  return {
    schemaVersion: 'bidvia-client-task10-scenario-matrix/v1' as const,
    attemptId: TASK10_AUTHORITY.attemptId,
    generatedAt,
    requiredFamilies: TASK10_REQUIRED_SCENARIO_FAMILIES,
    summary: {
      requiredFamilyCount: TASK10_REQUIRED_SCENARIO_FAMILIES.length as 5,
      rowCount: scenarios.length,
      passedCount,
      blockedCount,
      missingFamilies,
    },
    scenarios,
  };
}

function buildSecretReview(input: {
  candidateStatus: Task10Conclusion;
  packageName: string;
  findings: readonly SecretFinding[];
}): Task10SecretReview {
  return {
    schemaVersion: 'bidvia-client-task10-secret-review/v1',
    status: 'passed',
    candidateStatus: input.candidateStatus,
    scope: {
      contentFiles: TASK10_CONTENT_FILES,
      wrapperFiles: buildTask10WrapperFiles(input.packageName),
      privateSourceValuesPublished: false,
    },
    scannedFiles: TASK10_CONTENT_FILES,
    prohibitedValueFamilies: TASK10_PROHIBITED_VALUE_FAMILIES,
    findings: input.findings.map((finding) => ({
      code: finding.code,
      family: finding.family,
      count: finding.count,
    })),
    rawProducerOutputsPublished: false,
    rawLogsPublished: false,
  };
}

function buildReadme(input: {
  packageName: string;
  clientConclusion: Task10ClientConclusion;
  fingerprint: Task10ClientFingerprint;
  commandLog: Task10CommandLog;
  scenarioMatrix: Task10ScenarioMatrix;
}): string {
  const executedCommands = input.commandLog.commands.filter((row) => row.status === 'executed');
  const zeroExitCommands = executedCommands.filter((row) => row.exitCode === 0);
  const lines = [
    '# Task10 publication package',
    '',
    `Package name: \`${input.packageName}\``,
    '',
    'This package is a client-owned reproducibility publication for review only.',
    'It is bounded to the approved Task10 authority references and does not become a Core-authored conclusion.',
    '',
    '## Conclusion',
    '',
    `- Client-owned conclusion: \`${input.clientConclusion.conclusion}\``,
    `- Reason-code count: ${input.clientConclusion.reasonCodes.length}`,
    `- Authority issue: ${TASK10_AUTHORITY.issueUrl}`,
    '- [Client conclusion](./client-conclusion.json)',
    '',
    '## Frozen identities',
    '',
    `- Core runtime commit: \`${input.fingerprint.coreRuntimeSha}\``,
    `- Client baseline commit: \`${input.fingerprint.clientBaselineSha}\``,
    `- Site baseline commit: \`${input.fingerprint.siteBaselineSha}\``,
    `- Core evidence publication commit: \`${input.fingerprint.coreEvidencePublicationCommit}\``,
    '- [Client fingerprint](./client-fingerprint.json)',
    '',
    '## Command summary',
    '',
    `- Required commands: ${input.commandLog.commands.length}`,
    `- Executed commands: ${executedCommands.length}`,
    `- Zero-exit commands: ${zeroExitCommands.length}`,
    '- [Command log](./command-log.json)',
    '',
    '## Scenario summary',
    '',
    `- Required families: ${input.scenarioMatrix.summary.requiredFamilyCount}`,
    `- Scenario rows: ${input.scenarioMatrix.summary.rowCount}`,
    `- Passed rows: ${input.scenarioMatrix.summary.passedCount}`,
    `- Blocked rows: ${input.scenarioMatrix.summary.blockedCount}`,
    '- [Scenario matrix](./scenario-matrix.json)',
    '',
    '## Secret review',
    '',
    '- Status: `passed`',
    '- Private source values published: `false`',
    '- [Secret review](./secret-review.json)',
    '',
    '## Hashes',
    '',
    '- [Internal hash manifest](./SHA256SUMS.txt)',
    '- The sibling publication receipt binds the conclusion, manifest, and archive hashes.',
    '',
    '## Non-claims',
    '',
    ...input.clientConclusion.nonClaims.map((value) => `- ${value}`),
    '',
  ];
  return lines.join('\n');
}

function buildManifestText(fileBytes: ReadonlyMap<string, Uint8Array>): string {
  const hashedMembers = codeUnitSort([
    ...TASK10_CONTENT_FILES,
    SECRET_REVIEW_FILE,
  ]);
  const lines = hashedMembers.map((memberName) => {
    const bytes = fileBytes.get(memberName);
    if (!bytes) {
      throw new Error('task10 content bytes are incomplete');
    }
    return `${hashBytesHex(bytes)}  ${memberName}`;
  });
  return `${lines.join('\n')}\n`;
}

function buildSecretFindings(scanState: ScanState): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const family of TASK10_PROHIBITED_VALUE_FAMILIES) {
    const count = scanState.findings.get(family) ?? 0;
    if (count === 0) {
      continue;
    }
    findings.push({
      code: prohibitedFamilyCodes[family],
      family,
      count,
    });
  }
  return findings.sort((left, right) => compareCodeUnits(left.code, right.code) || compareCodeUnits(left.family, right.family));
}

function createScanState(): ScanState {
  return { findings: new Map<Task10ProhibitedValueFamily, number>() };
}

function sanitizeValue(value: unknown, catalog: Task10ProhibitedValueCatalog, scanState: ScanState): unknown {
  if (typeof value === 'string') {
    return sanitizeString(value, catalog, scanState).sanitized;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, catalog, scanState));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const entries = Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeValue(entry, catalog, scanState)]);
  return Object.fromEntries(entries);
}

function sanitizeString(value: string, catalog: Task10ProhibitedValueCatalog, scanState: ScanState): StringSanitization {
  let sanitized = value;
  let changed = false;
  for (const family of TASK10_PROHIBITED_VALUE_FAMILIES) {
    const redaction = `[${prohibitedFamilyCodes[family]}]`;
    for (const rawValue of catalog[family]) {
      if (!rawValue) {
        continue;
      }
      let index = sanitized.indexOf(rawValue);
      while (index !== -1) {
        changed = true;
        sanitized = `${sanitized.slice(0, index)}${redaction}${sanitized.slice(index + rawValue.length)}`;
        scanState.findings.set(family, (scanState.findings.get(family) ?? 0) + 1);
        index = sanitized.indexOf(rawValue, index + redaction.length);
      }
    }
  }
  return { sanitized, changed };
}

async function requireSafePublicationRoot(value: string): Promise<string> {
  const publicationRoot = path.resolve(value);
  await assertNoSymlinkInExistingPath(publicationRoot, 'publication root');
  let entry: Awaited<ReturnType<typeof lstat>> | null = null;
  try {
    entry = await lstat(publicationRoot);
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }
  }
  if (entry?.isSymbolicLink()) {
    throw new Error('publication root must not be a symlink');
  }
  if (entry === null) {
    await mkdir(publicationRoot, { recursive: true, mode: PACKAGE_DIR_MODE });
    entry = await lstat(publicationRoot);
  }
  if (entry.isSymbolicLink()) {
    throw new Error('publication root must not be a symlink');
  }
  if (!entry.isDirectory()) {
    throw new Error('publication root must be a directory');
  }
  await chmod(publicationRoot, PACKAGE_DIR_MODE);
  return publicationRoot;
}

function buildFinalPaths(publicationRoot: string, packageName: string) {
  return {
    packageDirectoryPath: path.join(publicationRoot, packageName),
    archivePath: path.join(publicationRoot, `${packageName}.tar.gz`),
    receiptPath: path.join(publicationRoot, `${packageName}.publication.json`),
  };
}

async function assertFinalTargetsAbsent(pathsToCheck: { packageDirectoryPath: string; archivePath: string; receiptPath: string }): Promise<void> {
  for (const targetPath of [pathsToCheck.packageDirectoryPath, pathsToCheck.archivePath, pathsToCheck.receiptPath]) {
    try {
      const entry = await lstat(targetPath);
      if (entry.isSymbolicLink()) {
        throw new Error('task10 publication target must not be a symlink');
      }
      throw new Error('task10 publication target already exists');
    } catch (error) {
      if (isMissingPathError(error)) {
        continue;
      }
      throw error;
    }
  }
}

async function writeSecureFile(filePath: string, bytes: Uint8Array): Promise<void> {
  await writeFile(filePath, bytes, { mode: PACKAGE_FILE_MODE, flag: 'wx' });
  await chmod(filePath, PACKAGE_FILE_MODE);
}

async function validatePackageCore(input: {
  packageDirectoryPath: string;
  archivePath: string;
  receiptPath: string | null;
  archive: Task10ArchiveDependencies;
  privateSources: Task10PrivateSourceMap | null;
  publicationRootNameForReceipt?: string;
  archiveBytesOverride?: Uint8Array;
}) {
  const files = await runVerificationStep('internalManifestVerified', () => readAndValidatePackageDirectory(input.packageDirectoryPath));
  const archiveBytes = input.archiveBytesOverride
    ?? await runVerificationStep('archiveVerified', async () => {
      await requireRegularNonSymlinkFile(input.archivePath, 'archive');
      return readBoundedRegularFile(input.archivePath, ARCHIVE_MAX_BYTES, 'archive');
    });
  const archiveStat = { size: archiveBytes.byteLength };
  const archiveSha256 = hashBytesHex(archiveBytes);
  await runVerificationStep('archiveVerified', async () => {
    await withArchiveSnapshot(input.packageDirectoryPath, archiveBytes, async (snapshotPath) => {
      const archiveMembers = await input.archive.listArchiveMembers({ archivePath: snapshotPath });
      validateArchiveMembers(archiveMembers, files.packageName, files.memberNames);
      await validateArchiveContent(input.archive, snapshotPath, archiveMembers, files.packageName, files.memberBytes);
    });
  });
  await runVerificationStep('internalManifestVerified', () => Promise.resolve(validateScenarioEvidence(files.scenarioMatrix.scenarios, new Set(files.memberNames), input.privateSources)));

  let receipt: Task10PublicationReceipt;
  let receiptValidation: ReceiptValidationFlags;
  if (input.receiptPath === null) {
    receiptValidation = {
      authorityVerified: true,
      commandsVerified: true,
      scenariosVerified: true,
      privateHandleAttestationsVerified: true,
      secretReviewVerified: true,
      packageMembershipVerified: true,
      internalHashesVerified: true,
      archiveVerified: true,
      receiptBindingsVerified: true,
    };
    receipt = buildPublicationReceipt({
      packageDirectoryPath: input.packageDirectoryPath,
      archivePath: input.archivePath,
      publicationRoot: path.dirname(input.packageDirectoryPath),
      packageName: files.packageName,
      conclusion: files.conclusion,
      archiveSha256,
      archiveSizeBytes: archiveStat.size,
      manifestSha256: files.manifestSha256,
      validation: receiptValidation,
    });
  } else {
    const receiptPath = input.receiptPath;
    if (receiptPath === null) {
      throw new Error('receiptPath must be present when validating a published receipt');
    }
    receipt = await runVerificationStep('receiptVerified', () => readAndValidateReceipt(receiptPath));
    receiptValidation = receipt.validation;
    await runVerificationStep('receiptVerified', () => Promise.resolve(validateReceiptBindings({
      receipt,
      packageDirectoryPath: input.packageDirectoryPath,
      archivePath: input.archivePath,
      archiveSha256,
      archiveSizeBytes: archiveStat.size,
      files,
      publicationRootNameForReceipt: normalizePublicationRootNameForReceipt(input.publicationRootNameForReceipt),
    })));
  }

  return {
    files,
    archiveSha256,
    archiveSizeBytes: archiveStat.size,
    receipt,
    receiptValidation,
  };
}

async function readAndValidatePackageDirectory(packageDirectoryPath: string): Promise<ValidatedPackageFiles> {
  const packageEntry = await lstat(packageDirectoryPath);
  if (!packageEntry.isDirectory() || packageEntry.isSymbolicLink()) {
    throw new Error('task10 package directory must be a non-symlink directory');
  }
  const packageName = path.basename(packageDirectoryPath);
  const memberNames = codeUnitSort(await readdir(packageDirectoryPath));
  requireExactPackageMembers(memberNames);
  const memberBytes = new Map<string, Uint8Array>();
  for (const memberName of memberNames) {
    const absoluteMemberPath = path.join(packageDirectoryPath, memberName);
    const entry = await lstat(absoluteMemberPath);
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error('task10 package members must be regular files');
    }
    memberBytes.set(memberName, await readBoundedRegularFile(absoluteMemberPath, PACKAGE_MEMBER_MAX_BYTES, `package member ${memberName}`));
  }

  validateReadme(memberBytes.get(README_FILE)!, new Set(memberNames));
  const conclusionWire = parseJsonUtf8(memberBytes.get('client-conclusion.json')!, 'client-conclusion.json');
  parseTask10ClientConclusionWire(conclusionWire);
  const fingerprintWire = parseJsonUtf8(memberBytes.get('client-fingerprint.json')!, 'client-fingerprint.json');
  parseTask10ClientFingerprintWire(fingerprintWire);
  const commandLogWire = parseJsonUtf8(memberBytes.get('command-log.json')!, 'command-log.json');
  parseTask10CommandLogWire(commandLogWire);
  const scenarioMatrixWire = parseJsonUtf8(memberBytes.get('scenario-matrix.json')!, 'scenario-matrix.json');
  parseTask10ScenarioMatrixWire(scenarioMatrixWire);
  const secretReviewWire = parseJsonUtf8(memberBytes.get(SECRET_REVIEW_FILE)!, SECRET_REVIEW_FILE);
  parseTask10SecretReviewWire(secretReviewWire);

  const manifestText = decodeUtf8(memberBytes.get(MANIFEST_FILE)!);
  const manifestSha256 = hashBytesHex(memberBytes.get(MANIFEST_FILE)!);
  validateManifest(memberBytes, manifestText);
  rescanFinalBytes(memberBytes, EMPTY_TASK10_PROHIBITED_VALUE_CATALOG);

  const conclusion = parseClientConclusion(conclusionWire);
  const fingerprint = parseClientFingerprint(fingerprintWire);
  const commandLog = parseCommandLog(commandLogWire);
  const scenarioMatrix = parseScenarioMatrix(scenarioMatrixWire);
  const secretReview = parseSecretReview(secretReviewWire);
  validatePackageCrossBindings(packageName, conclusion, fingerprint, scenarioMatrix, secretReview);

  return {
    packageName,
    memberNames,
    memberBytes,
    conclusion,
    fingerprint,
    commandLog,
    scenarioMatrix,
    secretReview,
    manifestText,
    manifestSha256,
  };
}

function requireExactPackageMembers(memberNames: readonly string[]): void {
  const expected = codeUnitSort([
    README_FILE,
    ...TASK10_CONTENT_FILES.filter((fileName) => fileName !== README_FILE),
    SECRET_REVIEW_FILE,
    MANIFEST_FILE,
  ]);
  if (memberNames.length !== expected.length) {
    throw new Error('task10 package members must exactly match the frozen membership');
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (memberNames[index] !== expected[index]) {
      throw new Error('task10 package members must exactly match the frozen membership');
    }
  }
}

function validateManifest(memberBytes: ReadonlyMap<string, Uint8Array>, manifestText: string): void {
  const expectedText = buildManifestText(memberBytes);
  if (manifestText !== expectedText) {
    throw new Task10PublicationVerificationError('internalManifestVerified', 'task10 internal hash manifest is invalid');
  }
  if (manifestText.includes(`  ${MANIFEST_FILE}\n`) || manifestText.endsWith(`  ${MANIFEST_FILE}`)) {
    throw new Task10PublicationVerificationError('internalManifestVerified', 'task10 internal hash manifest must never hash itself');
  }
}

function validateReadme(readmeBytes: Uint8Array, packageMembers: ReadonlySet<string>): void {
  const readme = decodeUtf8(readmeBytes);
  if (!readme.endsWith('\n')) {
    throw new Error('task10 README must end with a newline');
  }
  const linkMatches = readme.matchAll(README_LINK_PATTERN);
  for (const match of linkMatches) {
    const linkTarget = match[1] ?? '';
    validateRelativeReference(linkTarget, packageMembers, 'README link');
  }
}

function validateScenarioEvidence(
  rows: readonly Task10ScenarioRow[],
  packageMembers: ReadonlySet<string>,
  privateSources: Task10PrivateSourceMap | null,
): void {
  for (const row of rows) {
    for (const evidenceRef of row.evidenceRefs) {
      validateEvidenceReference(evidenceRef, packageMembers);
    }
    if (row.privateEvidenceHandles.length !== row.privateEvidenceAttestations.length) {
      throw new Error('task10 private evidence handles and attestations must align');
    }
    const seenRowHandles = new Set<string>();
    for (let index = 0; index < row.privateEvidenceHandles.length; index += 1) {
      const handle = row.privateEvidenceHandles[index]!;
      const attestation = row.privateEvidenceAttestations[index]!;
      if (handle !== attestation.handle) {
        throw new Error('task10 private evidence handles and attestations must align');
      }
      if (!SHA256_HANDLE_PATTERN.test(handle)) {
        throw new Error('task10 private evidence handle is invalid');
      }
      if (!requireCanonicalUtcTimestamp(attestation.verifiedAt, 'verifiedAt')) {
        throw new Error('task10 private evidence attestation timestamp is invalid');
      }
      if (seenRowHandles.has(handle)) {
        throw new Error('task10 private evidence handles must be unique within each row');
      }
      seenRowHandles.add(handle);
      if (privateSources !== null) {
        const privateSource = privateSources.get(handle);
        if (!privateSource) {
          throw new Error('task10 private evidence bytes are missing');
        }
        if (privateSource.sourceClass !== attestation.sourceClass) {
          throw new Error('task10 private evidence source class does not match attestation');
        }
        const expectedHandle = `sha256:${hashBytesHex(privateSource.bytes)}` as const;
        if (expectedHandle !== handle) {
          throw new Error('task10 private evidence bytes do not match their committed handle');
        }
      }
    }
  }
}

function validateEvidenceReference(reference: string, packageMembers: ReadonlySet<string>): void {
  if (/^https:\/\//.test(reference)) {
    if (!TASK10_AUTHORITY.authorityUrls.includes(reference)) {
      throw new Error('task10 external evidence reference is not allowlisted');
    }
    return;
  }
  validateRelativeReference(reference, packageMembers, 'scenario evidence reference');
}

function validateRelativeReference(reference: string, packageMembers: ReadonlySet<string>, fieldName: string): void {
  if (!reference || reference.includes('\0') || reference.includes('\\') || reference.includes('?') || reference.includes('#')) {
    throw new Error(`${fieldName} is unsafe`);
  }
  if (reference.includes('//') || reference.includes('/./') || path.posix.isAbsolute(reference) || reference.includes('%2e') || reference.includes('%2E') || /%2f/i.test(reference) || /%5c/i.test(reference)) {
    throw new Error(`${fieldName} is unsafe`);
  }
  const normalized = path.posix.normalize(reference.replace(/^\.\//, ''));
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.includes('/./')) {
    throw new Error(`${fieldName} is unsafe`);
  }
  if (!packageMembers.has(normalized)) {
    throw new Error(`${fieldName} does not resolve inside the package`);
  }
}

async function readAndValidateReceipt(receiptPath: string): Promise<Task10PublicationReceipt> {
  const receiptWire = parseJsonUtf8(await readBoundedRegularFile(receiptPath, RECEIPT_MAX_BYTES, 'receipt'), path.basename(receiptPath));
  try {
    parseTask10PublicationReceiptWire(receiptWire);
  } catch {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt must match the frozen receipt schema');
  }
  return parsePublicationReceipt(receiptWire);
}

function buildPublicationReceipt(input: {
  packageDirectoryPath: string;
  archivePath: string;
  publicationRoot: string;
  packageName: string;
  conclusion: Task10ClientConclusion;
  archiveSha256: string;
  archiveSizeBytes: number;
  manifestSha256: string;
  validation: ReceiptValidationFlags;
}): Task10PublicationReceipt {
  const repoBase = path.posix.basename(input.publicationRoot);
  const packageDirectory = `${repoBase}/${input.packageName}`;
  const conclusionPath = `${packageDirectory}/client-conclusion.json`;
  const archivePath = `${repoBase}/${input.packageName}.tar.gz`;
  const internalHashManifest = `${packageDirectory}/${MANIFEST_FILE}`;
  return {
    schemaVersion: 'bidvia-client-task10-publication/v1',
    publicationState: 'published_for_review',
    attemptId: TASK10_AUTHORITY.attemptId,
    clientOwnedConclusion: input.conclusion.conclusion,
    issueUrl: TASK10_AUTHORITY.issueUrl,
    packageDirectory,
    conclusionPath,
    conclusionSha256: hashBytesHex(serializeStableJson(buildTask10ClientConclusionWire(input.conclusion))),
    archivePath,
    archiveSha256: input.archiveSha256,
    archiveSizeBytes: input.archiveSizeBytes,
    internalHashManifest,
    internalHashManifestSha256: input.manifestSha256,
    validation: input.validation,
    nonClaims: TASK10_NON_CLAIMS,
  };
}

function validateReceiptBindings(input: {
  receipt: Task10PublicationReceipt;
  packageDirectoryPath: string;
  archivePath: string;
  archiveSha256: string;
  archiveSizeBytes: number;
  files: ValidatedPackageFiles;
  publicationRootNameForReceipt?: string;
}): void {
  const publicationRootBasename = input.publicationRootNameForReceipt
    ?? path.posix.basename(path.dirname(input.packageDirectoryPath));
  const expectedPackageDirectory = `${publicationRootBasename}/${input.files.packageName}`;
  const expectedConclusionPath = `${expectedPackageDirectory}/client-conclusion.json`;
  const expectedArchivePath = `${publicationRootBasename}/${input.files.packageName}.tar.gz`;
  const expectedManifestPath = `${expectedPackageDirectory}/${MANIFEST_FILE}`;
  if (input.receipt.issueUrl !== TASK10_AUTHORITY.issueUrl) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt issue URL does not match frozen authority');
  }
  if (input.receipt.packageDirectory !== expectedPackageDirectory) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt package directory is invalid');
  }
  if (input.receipt.conclusionPath !== expectedConclusionPath) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt conclusion path is invalid');
  }
  if (input.receipt.archivePath !== expectedArchivePath) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt archive path is invalid');
  }
  if (input.receipt.internalHashManifest !== expectedManifestPath) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt internal manifest path is invalid');
  }
  if (input.receipt.archiveSha256 !== input.archiveSha256) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt archive hash is invalid');
  }
  if (input.receipt.archiveSizeBytes !== input.archiveSizeBytes) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt archive size is invalid');
  }
  if (input.receipt.internalHashManifestSha256 !== input.files.manifestSha256) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt internal manifest hash is invalid');
  }
  if (input.receipt.clientOwnedConclusion !== input.files.conclusion.conclusion) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt conclusion does not match the packaged client conclusion');
  }
  if (input.receipt.conclusionSha256 !== hashBytesHex(input.files.memberBytes.get('client-conclusion.json')!)) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt conclusion hash is invalid');
  }
  const validationFlags = Object.values(input.receipt.validation);
  if (validationFlags.some((value) => value !== true)) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 receipt validation booleans must all be true');
  }
}

function validateArchiveMembers(archiveMembers: readonly Task10ArchiveMember[], packageName: string, expectedFiles: readonly string[]): void {
  const seenPaths = new Set<string>();
  const expectedPaths = new Set<string>([
    packageName,
    ...expectedFiles.map((memberName) => `${packageName}/${memberName}`),
  ]);
  for (const member of archiveMembers) {
    const normalizedPath = normalizeArchiveMemberPath(member.path);
    if (seenPaths.has(normalizedPath)) {
      throw new Error('task10 archive contains duplicate members');
    }
    seenPaths.add(normalizedPath);
    if (member.type === 'symlink' || member.type === 'hardlink' || member.type === 'other') {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive must not contain link or non-file entries');
    }
    if (normalizedPath === packageName && member.type !== 'directory') {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive root entry must be a directory');
    }
    if (normalizedPath !== packageName && member.type !== 'file') {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive package members must be files');
    }
    if (!expectedPaths.has(normalizedPath)) {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive contains unexpected members');
    }
  }
  for (const expectedPath of expectedPaths) {
    if (!seenPaths.has(expectedPath)) {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive is missing required members');
    }
  }
}

async function validateArchiveContent(
  archive: Task10ArchiveDependencies,
  archivePath: string,
  archiveMembers: readonly Task10ArchiveMember[],
  packageName: string,
  memberBytes: ReadonlyMap<string, Uint8Array>,
): Promise<void> {
  for (const member of archiveMembers) {
    const normalizedPath = normalizeArchiveMemberPath(member.path);
    if (normalizedPath === packageName) {
      continue;
    }
    const expectedBytes = memberBytes.get(normalizedPath.slice(`${packageName}/`.length));
    if (!expectedBytes) {
      throw new Error('task10 archive contains unexpected members');
    }
    const archivedBytes = await archive.readArchiveMember({
      archivePath,
      memberPath: normalizedPath,
    });
    if (hashBytesHex(archivedBytes) !== hashBytesHex(expectedBytes)) {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member bytes do not match the unpacked package');
    }
  }
}

function validatePackageCrossBindings(
  packageName: string,
  conclusion: Task10ClientConclusion,
  fingerprint: Task10ClientFingerprint,
  scenarioMatrix: Task10ScenarioMatrix,
  secretReview: Task10SecretReview,
): void {
  if (packageName !== buildTask10PackageName(fingerprint.runStartedAt)) {
    throw new Error('task10 package name does not match fingerprint.runStartedAt');
  }
  if (secretReview.candidateStatus !== conclusion.conclusion) {
    throw new Error('task10 secret review candidate status does not match the packaged conclusion');
  }
  if (scenarioMatrix.attemptId !== conclusion.attemptId || fingerprint.attemptId !== conclusion.attemptId) {
    throw new Error('task10 packaged identities are inconsistent');
  }
  const expectedWrapperFiles = buildTask10WrapperFiles(packageName);
  if (secretReview.scope.wrapperFiles.length !== expectedWrapperFiles.length || secretReview.scope.wrapperFiles.some((value, index) => value !== expectedWrapperFiles[index])) {
    throw new Error('task10 secret review wrapper members do not match the package name');
  }
  if (secretReview.scope.contentFiles.length !== TASK10_CONTENT_FILES.length || secretReview.scope.contentFiles.some((value, index) => value !== TASK10_CONTENT_FILES[index])) {
    throw new Error('task10 secret review content files do not match the frozen package members');
  }
  if (secretReview.scannedFiles.length !== TASK10_CONTENT_FILES.length || secretReview.scannedFiles.some((value, index) => value !== TASK10_CONTENT_FILES[index])) {
    throw new Error('task10 secret review scanned files do not match the frozen package members');
  }
}

function normalizeArchiveMemberPath(value: string): string {
  const trimmed = value.endsWith('/') && value !== '/' ? value.slice(0, -1) : value;
  if (!trimmed || trimmed.includes('\0') || trimmed.includes('\\') || path.posix.isAbsolute(trimmed)) {
    throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member path is unsafe');
  }
  if (trimmed.includes('//') || trimmed.includes('/./') || trimmed.includes('?') || trimmed.includes('#')) {
    throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member path is unsafe');
  }
  if (trimmed === '..' || trimmed.startsWith('../') || trimmed.includes('/../') || trimmed.endsWith('/..')) {
    throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member path is unsafe');
  }
  if (trimmed.includes('%2e') || trimmed.includes('%2E')) {
    throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member path is unsafe');
  }
  const normalized = path.posix.normalize(trimmed);
  if (normalized !== trimmed || normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive member path is unsafe');
  }
  return normalized;
}

function parseTarListings(namesOutput: string, verboseOutput: string): readonly Task10ArchiveMember[] {
  const names = namesOutput.split(/\r?\n/).filter(Boolean);
  const verboseLines = verboseOutput.split(/\r?\n/).filter(Boolean);
  if (names.length !== verboseLines.length) {
    throw new Error('task10 tar listing output is inconsistent');
  }
  const members: Task10ArchiveMember[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const mode = verboseLines[index]!.trim().split(/\s+/)[0] ?? '';
    let type: Task10ArchiveMember['type'];
    if (mode.startsWith('d')) {
      type = 'directory';
    } else if (mode.startsWith('-')) {
      type = 'file';
    } else if (mode.startsWith('l')) {
      type = 'symlink';
    } else if (mode.startsWith('h')) {
      type = 'hardlink';
    } else {
      type = 'other';
    }
    members.push({ path: names[index]!, type });
  }
  return members;
}

function parseClientConclusion(value: unknown): Task10ClientConclusion {
  const parsed = parseTask10ClientConclusionWire(value);
  return {
    schemaVersion: parsed.schema_version,
    evidenceOwner: parsed.evidence_owner,
    attemptId: parsed.attempt_id,
    conclusion: parsed.conclusion,
    reasonCodes: [...parsed.reason_codes],
    missingEvidence: [...parsed.missing_evidence],
    authorityRef: {
      issueUrl: parsed.authority_ref.issue_url,
      coreHandoffRunbookUrl: parsed.authority_ref.core_handoff_runbook_url,
      coreBundleUrl: parsed.authority_ref.core_bundle_url,
      coreBundlePath: parsed.authority_ref.core_bundle_path,
      coreBundleSha256: parsed.authority_ref.core_bundle_sha256,
      corePreflightPath: parsed.authority_ref.core_preflight_path,
      corePreflightSha256: parsed.authority_ref.core_preflight_sha256,
    },
    nonClaims: parsed.non_claims,
  };
}

function parseClientFingerprint(value: unknown): Task10ClientFingerprint {
  const parsed = parseTask10ClientFingerprintWire(value);
  return {
    schemaVersion: parsed.schema_version,
    repository: parsed.repository,
    attemptId: parsed.attempt_id,
    clientBaselineSha: parsed.client_baseline_sha,
    coreRuntimeSha: parsed.core_runtime_sha,
    siteBaselineSha: parsed.site_baseline_sha,
    coreEvidencePublicationCommit: parsed.core_evidence_publication_commit,
    coreBundlePath: parsed.core_bundle_path,
    coreBundleSha256: parsed.core_bundle_sha256,
    packageIdentities: {
      core: parsed.package_identities.core,
      client: parsed.package_identities.client,
      site: parsed.package_identities.site,
    },
    lockfileSha256: {
      core: parsed.lockfile_sha256.core,
      client: parsed.lockfile_sha256.client,
      site: parsed.lockfile_sha256.site,
    },
    runtimeMarkers: {
      sourceMainCommitMarker: parsed.runtime_markers.source_main_commit_marker,
      runtimeReportedVersionMarker: parsed.runtime_markers.runtime_reported_version_marker,
      bootstrapPackageVersionMarker: parsed.runtime_markers.bootstrap_package_version_marker,
      scenarioPackageVersionMarker: parsed.runtime_markers.scenario_package_version_marker,
      providerFixtureIdentity: parsed.runtime_markers.provider_fixture_identity,
      providerProtocolVersion: parsed.runtime_markers.provider_protocol_version,
      postgresPort: parsed.runtime_markers.postgres_port,
      runtimePort: parsed.runtime_markers.runtime_port,
      operatorPort: parsed.runtime_markers.operator_port,
      fixturePort: parsed.runtime_markers.fixture_port,
    },
    toolVersions: {
      node: parsed.tool_versions.node,
      npm: parsed.tool_versions.npm,
      docker: parsed.tool_versions.docker,
      dockerCompose: parsed.tool_versions.docker_compose,
      postgresClient: parsed.tool_versions.postgres_client,
    },
    checkoutProofs: {
      coreRuntime: {
        headCommit: parsed.checkout_proofs.core_runtime.head_commit,
        branch: parsed.checkout_proofs.core_runtime.branch,
        upstreamRef: parsed.checkout_proofs.core_runtime.upstream_ref,
        detachedHead: parsed.checkout_proofs.core_runtime.detached_head,
        porcelainStatus: parsed.checkout_proofs.core_runtime.porcelain_status,
        lockfileSha256: parsed.checkout_proofs.core_runtime.lockfile_sha256,
      },
      clientValidation: {
        headCommit: parsed.checkout_proofs.client_validation.head_commit,
        branch: parsed.checkout_proofs.client_validation.branch,
        upstreamRef: parsed.checkout_proofs.client_validation.upstream_ref,
        detachedHead: parsed.checkout_proofs.client_validation.detached_head,
        porcelainStatus: parsed.checkout_proofs.client_validation.porcelain_status,
        lockfileSha256: parsed.checkout_proofs.client_validation.lockfile_sha256,
      },
      siteValidation: {
        headCommit: parsed.checkout_proofs.site_validation.head_commit,
        branch: parsed.checkout_proofs.site_validation.branch,
        upstreamRef: parsed.checkout_proofs.site_validation.upstream_ref,
        detachedHead: parsed.checkout_proofs.site_validation.detached_head,
        porcelainStatus: parsed.checkout_proofs.site_validation.porcelain_status,
        lockfileSha256: parsed.checkout_proofs.site_validation.lockfile_sha256,
      },
      coreEvidence: {
        headCommit: parsed.checkout_proofs.core_evidence.head_commit,
        branch: parsed.checkout_proofs.core_evidence.branch,
        upstreamRef: parsed.checkout_proofs.core_evidence.upstream_ref,
        detachedHead: parsed.checkout_proofs.core_evidence.detached_head,
        porcelainStatus: parsed.checkout_proofs.core_evidence.porcelain_status,
        lockfileSha256: parsed.checkout_proofs.core_evidence.lockfile_sha256,
      },
    },
    runStartedAt: parsed.run_started_at,
  };
}

function parseCommandLog(value: unknown): Task10CommandLog {
  const parsed = parseTask10CommandLogWire(value);
  return {
    schemaVersion: parsed.schema_version,
    attemptId: parsed.attempt_id,
    commands: parsed.commands.map((row) => ({
      command: row.command,
      cwd: row.cwd,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      status: row.status,
      exitCode: row.exit_code,
      skippedDueTo: row.skipped_due_to,
    })),
  };
}

function parseScenarioMatrix(value: unknown): Task10ScenarioMatrix {
  const parsed = parseTask10ScenarioMatrixWire(value);
  return {
    schemaVersion: parsed.schema_version,
    attemptId: parsed.attempt_id,
    generatedAt: parsed.generated_at,
    requiredFamilies: parsed.required_families,
    summary: {
      requiredFamilyCount: parsed.summary.required_family_count,
      rowCount: parsed.summary.row_count,
      passedCount: parsed.summary.passed_count,
      blockedCount: parsed.summary.blocked_count,
      missingFamilies: [...parsed.summary.missing_families],
    },
    scenarios: parsed.scenarios.map((row) => ({
      scenarioFamily: row.scenario_family,
      tenant: row.tenant,
      actor: row.actor,
      company: row.company,
      authority: row.authority,
      request: row.request,
      sourceObject: row.source_object,
      targetObject: row.target_object,
      proofClass: row.proof_class,
      evidenceRefs: [...row.evidence_refs],
      privateEvidenceHandles: [...row.private_evidence_handles],
      privateEvidenceAttestations: row.private_handle_attestations.map((attestation) => ({
        handle: attestation.handle,
        sourceClass: attestation.source_class,
        verified: attestation.verified,
        verifiedAt: attestation.verified_at,
      })),
      result: row.result,
      timestamp: row.timestamp,
      reasonCodes: [...row.reason_codes],
    })),
  };
}

function parseSecretReview(value: unknown): Task10SecretReview {
  const parsed = parseTask10SecretReviewWire(value);
  return {
    schemaVersion: parsed.schema_version,
    status: parsed.status,
    candidateStatus: parsed.candidate_status,
    scope: {
      contentFiles: parsed.scope.content_files,
      wrapperFiles: parsed.scope.wrapper_files,
      privateSourceValuesPublished: parsed.scope.private_source_values_published,
    },
    scannedFiles: parsed.scanned_files,
    prohibitedValueFamilies: parsed.prohibited_value_families,
    findings: parsed.findings.map((finding) => ({
      code: finding.code,
      family: finding.family,
      count: finding.count,
    })),
    rawProducerOutputsPublished: parsed.raw_producer_outputs_published,
    rawLogsPublished: parsed.raw_logs_published,
  };
}

function parsePublicationReceipt(value: unknown): Task10PublicationReceipt {
  const parsed = parseTask10PublicationReceiptWire(value);
  return {
    schemaVersion: parsed.schema_version,
    publicationState: parsed.publication_state,
    attemptId: parsed.attempt_id,
    clientOwnedConclusion: parsed.client_owned_conclusion,
    issueUrl: parsed.issue_url,
    packageDirectory: parsed.package_directory,
    conclusionPath: parsed.conclusion_path,
    conclusionSha256: parsed.conclusion_sha256,
    archivePath: parsed.archive_path,
    archiveSha256: parsed.archive_sha256,
    archiveSizeBytes: parsed.archive_size_bytes,
    internalHashManifest: parsed.internal_hash_manifest,
    internalHashManifestSha256: parsed.internal_hash_manifest_sha256,
    validation: {
      authorityVerified: parsed.validation.authority_verified,
      commandsVerified: parsed.validation.commands_verified,
      scenariosVerified: parsed.validation.scenarios_verified,
      privateHandleAttestationsVerified: parsed.validation.private_handle_attestations_verified,
      secretReviewVerified: parsed.validation.secret_review_verified,
      packageMembershipVerified: parsed.validation.package_membership_verified,
      internalHashesVerified: parsed.validation.internal_hashes_verified,
      archiveVerified: parsed.validation.archive_verified,
      receiptBindingsVerified: parsed.validation.receipt_bindings_verified,
    },
    nonClaims: parsed.non_claims,
  };
}

function rescanFinalBytes(fileBytes: ReadonlyMap<string, Uint8Array>, catalog: Task10ProhibitedValueCatalog): void {
  for (const [memberName, bytes] of fileBytes) {
    const text = decodeUtf8(bytes);
    for (const family of TASK10_PROHIBITED_VALUE_FAMILIES) {
      for (const rawValue of catalog[family]) {
        if (rawValue && text.includes(rawValue)) {
          throw new Task10PublicationVerificationError('secretScanVerified', 'task10 publication still contains prohibited values');
        }
      }
    }
    assertNoIntrinsicLeaks(text, memberName);
  }
}

function assertNoIntrinsicLeaks(text: string, memberName: string): void {
  const intrinsicLeakPatterns: readonly RegExp[] = [
    /(?:^|[^\w])(?:\/Users\/|\/home\/|\/var\/folders\/|[A-Za-z]:\\)/,
    /(^|[^\w])\.\.\//,
    /(^|[^\w])\.\.\\/,
    /(?:password|token|credential[_-]?secret|secret[_-]?ref)\s*[:=]\s*[^\s,}\]]+/i,
    /"(?:request|response)[^"]*"\s*:\s*\{/i,
    /\b(?:admin-session|account-session|generated-account)[:_-][A-Za-z0-9_-]{12,}\b/i,
  ];
  if (text.includes('@') && /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) {
    throw new Task10PublicationVerificationError('secretScanVerified', `task10 publication ${memberName} contains unsafe intrinsic content`);
  }
  for (const pattern of intrinsicLeakPatterns) {
    if (pattern.test(text)) {
      throw new Task10PublicationVerificationError('secretScanVerified', `task10 publication ${memberName} contains unsafe intrinsic content`);
    }
  }
}

function serializeStableJson(value: unknown): Uint8Array {
  return encodeUtf8(`${JSON.stringify(value, null, 2)}\n`);
}

function hashBytesHex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value) as T;
  }
  for (const entry of Object.values(value as Record<string, unknown>)) {
    deepFreeze(entry);
  }
  return Object.freeze(value);
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value: Uint8Array): string {
  return new TextDecoder().decode(value);
}

function parseJsonUtf8(bytes: Uint8Array, fieldName: string): unknown {
  const text = decodeUtf8(bytes);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${fieldName} must contain valid JSON`);
  }
}

function codeUnitSort(values: readonly string[]): string[] {
  return [...values].sort(compareCodeUnits);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireCanonicalUtcTimestamp(value: string, fieldName: string): true {
  if (!CANONICAL_UTC_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a canonical UTC timestamp`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new Error(`${fieldName} must be a canonical UTC timestamp`);
  }
  return true;
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function checksForVerificationFailure(check: keyof Task10PublicationChecks): Task10PublicationChecks {
  if (check === 'secretScanVerified') {
    return {
      secretScanVerified: false,
      internalManifestVerified: false,
      archiveVerified: false,
      receiptVerified: false,
    };
  }
  if (check === 'internalManifestVerified') {
    return {
      secretScanVerified: true,
      internalManifestVerified: false,
      archiveVerified: false,
      receiptVerified: false,
    };
  }
  if (check === 'archiveVerified') {
    return {
      secretScanVerified: true,
      internalManifestVerified: true,
      archiveVerified: false,
      receiptVerified: false,
    };
  }
  return {
    secretScanVerified: true,
    internalManifestVerified: true,
    archiveVerified: true,
    receiptVerified: false,
  };
}

async function requireRegularNonSymlinkFile(filePath: string, fieldName: string): Promise<void> {
  const flags = fsConstants.O_RDONLY | (typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0);
  const handle = await open(filePath, flags);
  try {
    const entry = await handle.stat();
    if (!entry.isFile()) {
      throw new Error(`${fieldName} must be a regular non-symlink file`);
    }
  } finally {
    await handle.close();
  }
}

async function assertNoSymlinkInExistingPath(candidatePath: string, fieldName: string): Promise<void> {
  const resolvedPath = path.resolve(candidatePath);
  const parsedPath = path.parse(resolvedPath);
  let currentPath = parsedPath.root;
  const segments = resolvedPath.slice(parsedPath.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) {
        throw new Error(`${fieldName} must not include symlinked path segments`);
      }
    } catch (error) {
      if (isMissingPathError(error)) {
        continue;
      }
      throw error;
    }
  }
}

function normalizePublicationRootNameForReceipt(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\') || value.includes('\0')) {
    throw new Task10PublicationVerificationError('receiptVerified', 'task10 publication root name for receipt must be a safe basename');
  }
  return value;
}

async function cleanupStagedPublicationState(state: InternalStagedPublicationState): Promise<void> {
  await rm(path.dirname(state.packageDirectoryPath), { recursive: true, force: true });
}

function takeStagedPublicationState(staged: Task10StagedPublication, operation: 'freeze' | 'discard'): InternalStagedPublicationState {
  const state = stagedPublicationState.get(staged);
  if (!state || state.consumed) {
    throw new Error(`task10 staged publication cannot ${operation}`);
  }
  state.consumed = true;
  stagedPublicationState.delete(staged);
  return state;
}

async function withArchiveSnapshot<T>(
  trustedBaseDirectory: string,
  archiveBytes: Uint8Array,
  callback: (snapshotPath: string) => Promise<T>,
): Promise<T> {
  const snapshotRoot = await mkdtemp(path.join(path.dirname(trustedBaseDirectory), '.task10-archive-snapshot-'));
  const snapshotPath = path.join(snapshotRoot, 'archive-snapshot.tar.gz');
  await chmod(snapshotRoot, PACKAGE_DIR_MODE);
  await writeSecureFile(snapshotPath, archiveBytes);
  const initialDigest = hashBytesHex(archiveBytes);
  try {
    const result = await callback(snapshotPath);
    const finalSnapshotBytes = await readBoundedRegularFile(snapshotPath, ARCHIVE_MAX_BYTES, 'archive snapshot');
    if (hashBytesHex(finalSnapshotBytes) !== initialDigest) {
      throw new Task10PublicationVerificationError('archiveVerified', 'task10 archive snapshot changed during inspection');
    }
    return result;
  } finally {
    await rm(snapshotRoot, { recursive: true, force: true });
  }
}

async function rollbackPromotedOutputs(promotedPaths: readonly string[]): Promise<void> {
  for (const promotedPath of [...promotedPaths].reverse()) {
    await rm(promotedPath, { recursive: true, force: true });
  }
}

async function validateArchiveAndPackageOnly(input: {
  packageDirectoryPath: string;
  archivePath: string;
  archive: Task10ArchiveDependencies;
}): Promise<void> {
  const files = await readAndValidatePackageDirectory(input.packageDirectoryPath);
  await requireRegularNonSymlinkFile(input.archivePath, 'archive');
  const archiveBytes = await readBoundedRegularFile(input.archivePath, ARCHIVE_MAX_BYTES, 'archive');
  await withArchiveSnapshot(input.packageDirectoryPath, archiveBytes, async (snapshotPath) => {
    const archiveMembers = await input.archive.listArchiveMembers({ archivePath: snapshotPath });
    validateArchiveMembers(archiveMembers, files.packageName, files.memberNames);
    await validateArchiveContent(input.archive, snapshotPath, archiveMembers, files.packageName, files.memberBytes);
  });
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function runVerificationStep<T>(
  check: keyof Task10PublicationChecks,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Task10ToolingError || error instanceof Task10PublicationVerificationError) {
      throw error;
    }
    throw new Task10PublicationVerificationError(check, normalizeError(error).message);
  }
}

async function spawnAndCapture(command: string, args: readonly string[], maxOutputBytes: number, timeoutMs: number): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const result = await spawnAndCaptureBinary(command, args, maxOutputBytes, timeoutMs);
  return {
    exitCode: result.exitCode,
    stdout: Buffer.from(result.stdout).toString('utf8'),
    stderr: Buffer.from(result.stderr).toString('utf8'),
  };
}

async function spawnAndCaptureBinary(command: string, args: readonly string[], maxOutputBytes: number, timeoutMs: number): Promise<{ exitCode: number; stdout: Uint8Array; stderr: Uint8Array }> {
  const child = spawn(command, args, {
    shell: false,
    env: SAFE_TAR_ENV,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let stdoutSize = 0;
  let stderrSize = 0;
  let overflowError: Error | null = null;
  let timeoutHandle: NodeJS.Timeout | null = setTimeout(() => {
    overflowError = new Task10ToolingError('task10 tar command timed out');
    child.kill('SIGKILL');
  }, timeoutMs);

  child.stdout.on('data', (chunk: Buffer) => {
    if (stdoutSize + chunk.length > maxOutputBytes) {
      overflowError = new Task10PublicationVerificationError('archiveVerified', 'task10 archive command output exceeded the allowed bound');
      child.kill('SIGKILL');
      return;
    }
    stdoutChunks.push(chunk);
    stdoutSize += chunk.length;
  });
  child.stderr.on('data', (chunk: Buffer) => {
    if (stderrSize + chunk.length > maxOutputBytes) {
      overflowError = new Task10PublicationVerificationError('archiveVerified', 'task10 archive command output exceeded the allowed bound');
      child.kill('SIGKILL');
      return;
    }
    stderrChunks.push(chunk);
    stderrSize += chunk.length;
  });

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      callback();
    };
    child.once('error', () => finish(() => reject(new Task10ToolingError('task10 tar spawn failed'))));
    child.once('close', (exitCode) => {
      finish(() => {
        if (overflowError) {
          reject(overflowError);
          return;
        }
        resolve({
          exitCode: exitCode ?? 1,
          stdout: new Uint8Array(Buffer.concat(stdoutChunks)),
          stderr: new Uint8Array(Buffer.concat(stderrChunks)),
        });
      });
    });
  });
}

export function isTask10TarAvailable(): boolean {
  const result = spawnSync('tar', ['--version'], {
    shell: false,
    env: SAFE_TAR_ENV,
    stdio: 'ignore',
    timeout: 3000,
  });
  return result.status === 0 && !result.error;
}

async function readBoundedRegularFile(filePath: string, maxBytes: number, fieldName: string): Promise<Uint8Array> {
  const flags = fsConstants.O_RDONLY | (typeof fsConstants.O_NOFOLLOW === 'number' ? fsConstants.O_NOFOLLOW : 0);
  const handle = await open(filePath, flags);
  try {
    const fileStat = await handle.stat();
    if (!fileStat.isFile()) {
      throw new Error(`${fieldName} must be a regular file`);
    }
    if (fileStat.size > maxBytes) {
      throw new Error(`${fieldName} exceeds the allowed size bound`);
    }
    const buffer = Buffer.alloc(fileStat.size);
    let offset = 0;
    while (offset < fileStat.size) {
      const readResult = await handle.read(buffer, offset, fileStat.size - offset, offset);
      if (readResult.bytesRead === 0) {
        break;
      }
      offset += readResult.bytesRead;
    }
    return new Uint8Array(buffer.subarray(0, offset));
  } finally {
    await handle.close();
  }
}
