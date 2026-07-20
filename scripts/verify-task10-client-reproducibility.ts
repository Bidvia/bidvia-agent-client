import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import {
  lstat,
  open,
  readdir,
  realpath,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Task10ExpectedCheckoutInspectionError,
  verifyTask10Authority,
  type Task10AuthorityVerificationResult,
  type Task10AuthorityVerifierDependencies,
  type Task10CheckoutInspection,
  type VerifyTask10AuthorityInput,
} from './task10/authority.js';
import { recordTask10GateCommands } from './task10/command-recorder.js';
import {
  TASK10_AUTHORITY,
  type Task10ClientFingerprint,
  type Task10CommandLog,
  type Task10CommandRow,
  type Task10Conclusion,
  type Task10PrivateEvidenceAttestation,
  type Task10ScenarioRow,
} from './task10/contracts.js';
import {
  runTask10CoreProducer,
  type RunTask10CoreProducerCompletedOutcome,
  type RunTask10CoreProducerOutcome,
  type RunTask10CoreProducerReportableBlockedOutcome,
} from './task10/core-producer-adapter.js';
import {
  evaluateExecutionEvidence,
  finalizeTask10Conclusion,
  type Task10ExecutionEvaluation,
  type Task10ExecutionInput,
  type Task10FinalConclusion,
  type Task10PublicationChecks,
} from './task10/evaluator.js';
import {
  assembleCandidatePayload,
  assessCandidatePublication,
  createDefaultTask10ArchiveDependencies,
  discardTask10Publication,
  freezeTask10Publication,
  type Task10ArchiveDependencies,
  type Task10AssessedCandidatePublication,
  type Task10CandidatePayload,
  type Task10PrivateSourceEntry,
  type Task10PrivateSourceMap,
  type Task10ProhibitedValueCatalog,
  type Task10PublicationDecision,
  type Task10StagedPublication,
  type Task10ValidatedPublication,
} from './task10/publication.js';
import {
  buildTask10ScenarioRows,
  type BuildTask10ScenarioRowsInput,
  type SanitizedRunIdentity,
} from './task10/scenario-adapter.js';

const COMMAND_NAME = 'verify-task10-client-reproducibility';
const GATE_COMMANDS = [
  'npm test',
  'npm run typecheck',
  'npm run build',
  'npm run validate',
  'npm run validate:release-readiness',
  'npm run validate:release-gate',
] as const satisfies readonly Task10CommandRow['command'][];
const SAFE_CHILD_TIMEOUT_MS = 15_000;
const SAFE_CHILD_MAX_OUTPUT_BYTES = 16_384;
const MAX_AUTHORITY_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LOCKFILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_PRIVATE_SOURCE_MAX_DEPTH = 6;
const DEFAULT_PRIVATE_SOURCE_MAX_FILES = 256;
const DEFAULT_PRIVATE_SOURCE_MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFAULT_PRIVATE_SOURCE_MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const SAFE_SPAWN_ENV_KEYS = [
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
const BLOCKED_CONCLUSION: Task10Conclusion = 'blocked';

type Awaitable<T> = T | Promise<T>;
type RequiredFlag = (typeof REQUIRED_FLAGS)[number];
type CheckoutKey = keyof Task10ClientFingerprint['checkoutProofs'];

type ResolvedPaths = {
  privateInput: string;
  privateOutput: string;
  privateLogRoot: string;
  publicationRoot: string;
  coreCheckout: string;
  coreEvidenceCheckout: string;
  clientCheckout: string;
  siteCheckout: string;
  coreBundle: string;
  corePreflight: string;
};

type NamedRoot = {
  name: RequiredFlag | '--derived-core-preflight';
  value: string;
};

type AuthorityReasonCode =
  | 'authority-verification-blocked'
  | 'checkout-inspection-missing-or-unreadable'
  | 'bundle-sha256-mismatch'
  | 'bundle-json-unreadable'
  | 'bundle-reference-malformed'
  | 'bundle-path-escaped-core-evidence-root'
  | 'bundle-path-mismatch'
  | 'bundle-missing-or-unreadable'
  | 'checkout-root-overlap'
  | 'checkout-root-symlinked'
  | 'core-evidence-head-mismatch'
  | 'core-evidence-detached-mismatch'
  | 'core-evidence-porcelain-mismatch'
  | 'core-evidence-upstream-mismatch'
  | 'core-runtime-branch-mismatch'
  | 'core-runtime-head-mismatch'
  | 'core-runtime-lockfile-mismatch'
  | 'core-runtime-upstream-mismatch'
  | 'preflight-artifact-hash-mismatch'
  | 'preflight-artifact-missing-or-unreadable'
  | 'preflight-artifact-path-escaped-core-evidence-root'
  | 'preflight-artifact-path-mismatch'
  | 'preflight-authority-facts-invalid'
  | 'preflight-json-unreadable'
  | 'site-validation-head-mismatch'
  | 'site-validation-lockfile-mismatch'
  | 'site-validation-upstream-mismatch'
  | 'unknown-authority-blocked';

type InspectCheckoutDependencies = {
  runGitCommand?: (rootPath: string, args: readonly string[]) => string | null;
};

type CollectFingerprintDependencies = {
  inspectCheckout?: (rootPath: string) => Task10CheckoutInspection;
  runVersionCommand?: (command: string, args: readonly string[]) => string;
};

type PrivateSourceCollectionDependencies = {
  maxDepth?: number;
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
};

export interface VerifyTask10ClientReproducibilityArgs {
  privateInput: string;
  privateOutput: string;
  privateLogRoot: string;
  publicationRoot: string;
  coreCheckout: string;
  coreEvidenceCheckout: string;
  clientCheckout: string;
  siteCheckout: string;
  coreBundle: string;
}

export interface VerifyTask10ClientReproducibilityResult {
  exitCode: number;
}

export interface VerifyTask10ClientReproducibilityDependencies {
  now?: () => string;
  stdout?: { write(value: string): void };
  stderr?: { write(value: string): void };
  verifyTask10Authority?: (
    input: VerifyTask10AuthorityInput,
  ) => Awaitable<Task10AuthorityVerificationResult>;
  recordTask10GateCommands?: (input: {
    frozenClientRoot: string;
    privateLogRoot: string;
    forbiddenOverlapRoots: readonly string[];
  }) => Awaitable<Task10CommandRow[]>;
  runTask10CoreProducer?: (input: {
    coreRoot: string;
    clientRoot: string;
    siteRoot: string;
    privateInputRoot: string;
    privateOutputRoot: string;
  }) => Awaitable<RunTask10CoreProducerOutcome>;
  collectTask10ClientFingerprint?: (input: {
    runStartedAt: string;
    roots: ResolvedPaths;
  }) => Awaitable<Task10ClientFingerprint>;
  adaptTask10ScenarioRows?: (input: {
    producerOutcome: RunTask10CoreProducerOutcome;
    runStartedAt: string;
  }) => Awaitable<Task10ScenarioRow[]>;
  evaluateExecutionEvidence?: (input: Task10ExecutionInput) => Awaitable<Task10ExecutionEvaluation>;
  finalizeTask10Conclusion?: (
    execution: Task10ExecutionEvaluation,
    publication: Task10PublicationChecks,
  ) => Awaitable<Task10FinalConclusion>;
  createTask10ArchiveDependencies?: () => Awaitable<Task10ArchiveDependencies>;
  collectTask10PrivateSources?: (input: {
    scenarioRows: readonly Task10ScenarioRow[];
    roots: ResolvedPaths;
  }) => Awaitable<Task10PrivateSourceMap>;
  assembleCandidatePayload?: (input: {
    decision: Task10PublicationDecision;
    fingerprint: Task10ClientFingerprint;
    commandLog: Task10CommandLog;
    scenarioRows: readonly Task10ScenarioRow[];
    generatedAt: string;
    prohibitedValues: Task10ProhibitedValueCatalog;
  }) => Awaitable<Task10CandidatePayload>;
  assessCandidatePublication?: (input: {
    publicationRoot: string;
    candidate: Task10CandidatePayload;
    privateSources: Task10PrivateSourceMap;
    archive: Task10ArchiveDependencies;
  }) => Awaitable<Task10AssessedCandidatePublication>;
  discardTask10Publication?: (staged: Task10StagedPublication) => Awaitable<void>;
  freezeTask10Publication?: (staged: Task10StagedPublication) => Awaitable<Task10ValidatedPublication>;
  validateProducerPublication?: (input: {
    packageDirectoryPath: string;
    archivePath: string;
    receiptPath: string;
    archive: Task10ArchiveDependencies;
    privateSources: Task10PrivateSourceMap;
  }) => Awaitable<Task10ValidatedPublication>;
  validateOfflinePublication?: (input: {
    packageDirectoryPath: string;
    archivePath: string;
    receiptPath: string;
    archive: Task10ArchiveDependencies;
  }) => Awaitable<Task10ValidatedPublication>;
}

class SanitizedCliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'SanitizedCliError';
    this.exitCode = exitCode;
  }
}

export function parseVerifyTask10ClientReproducibilityArgs(argv: string[]): VerifyTask10ClientReproducibilityArgs {
  const values = new Map<RequiredFlag, string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error('positional arguments are not allowed');
    }
    if (!REQUIRED_FLAGS.includes(token as RequiredFlag)) {
      throw new Error(`unknown flag: ${token}`);
    }
    if (values.has(token as RequiredFlag)) {
      throw new Error(`duplicate flag: ${token}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--') || value.trim().length === 0) {
      throw new Error(`missing value for ${token}`);
    }
    values.set(token as RequiredFlag, value.trim());
    index += 1;
  }

  for (const flag of REQUIRED_FLAGS) {
    if (!values.has(flag)) {
      throw new Error(`${flag} is required`);
    }
  }

  return {
    privateInput: values.get('--private-input')!,
    privateOutput: values.get('--private-output')!,
    privateLogRoot: values.get('--private-log-root')!,
    publicationRoot: values.get('--publication-root')!,
    coreCheckout: values.get('--core-checkout')!,
    coreEvidenceCheckout: values.get('--core-evidence-checkout')!,
    clientCheckout: values.get('--client-checkout')!,
    siteCheckout: values.get('--site-checkout')!,
    coreBundle: values.get('--core-bundle')!,
  };
}

export function inspectTask10Checkout(
  rootPath: string,
  dependencies: InspectCheckoutDependencies = {},
): Task10CheckoutInspection {
  const resolvedRoot = path.resolve(rootPath);
  let symlinked = false;
  let realPath: string;

  try {
    symlinked = lstatSync(resolvedRoot).isSymbolicLink();
    realPath = realpathSync(resolvedRoot);
  } catch (error) {
    throw mapInspectionError(error);
  }

  const runGitCommand = dependencies.runGitCommand ?? runGitCommandSync;
  const headCommit = requireNonEmptyGitValue(runGitCommand(resolvedRoot, ['rev-parse', 'HEAD']));
  const headName = requireNonEmptyGitValue(runGitCommand(resolvedRoot, ['rev-parse', '--abbrev-ref', 'HEAD']));
  const detachedHead = headName === 'HEAD';
  const branch = detachedHead ? null : requireNonEmptyGitValue(runGitCommand(resolvedRoot, ['branch', '--show-current']));
  const upstreamRef = detachedHead ? null : runGitCommand(resolvedRoot, ['rev-parse', '--abbrev-ref', '@{upstream}']);
  const porcelainRaw = runGitCommand(resolvedRoot, ['status', '--porcelain']);
  const packageLockPath = path.join(resolvedRoot, 'package-lock.json');

  let lockfileSha256: string;
  try {
    lockfileSha256 = hashBytes(readBoundedRegularFileSync(packageLockPath, MAX_LOCKFILE_BYTES));
  } catch (error) {
    throw mapInspectionError(error);
  }

  return {
    headCommit,
    branch,
    upstreamRef,
    detachedHead,
    porcelainStatus: porcelainRaw === '' ? 'empty' : 'non-empty',
    lockfileSha256,
    realPath,
    symlinked,
  };
}

export function collectTask10ClientFingerprint(
  input: {
    runStartedAt: string;
    roots: ResolvedPaths;
  },
  dependencies: CollectFingerprintDependencies = {},
): Task10ClientFingerprint {
  const inspectCheckout = dependencies.inspectCheckout ?? inspectTask10Checkout;
  const runVersionCommand = dependencies.runVersionCommand ?? runVersionCommandSync;

  const checkoutProofs = {
    coreRuntime: toCheckoutProof(inspectCheckout(input.roots.coreCheckout)),
    clientValidation: toCheckoutProof(inspectCheckout(input.roots.clientCheckout)),
    siteValidation: toCheckoutProof(inspectCheckout(input.roots.siteCheckout)),
    coreEvidence: toCheckoutProof(inspectCheckout(input.roots.coreEvidenceCheckout)),
  } satisfies Task10ClientFingerprint['checkoutProofs'];

  if (!/^[0-9a-f]{64}$/.test(checkoutProofs.coreEvidence.lockfileSha256)) {
    throw new Error('core evidence lockfile must be lowercase sha256');
  }

  const toolVersions = {
    node: requireNonBlankVersion(process.version),
    npm: requireToolVersion(runVersionCommand, 'npm', ['--version']),
    docker: requireToolVersion(runVersionCommand, 'docker', ['--version']),
    dockerCompose: requireToolVersion(runVersionCommand, 'docker', ['compose', 'version']),
    postgresClient: requireToolVersion(runVersionCommand, 'psql', ['--version']),
  } satisfies Task10ClientFingerprint['toolVersions'];

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
    toolVersions,
    checkoutProofs,
    runStartedAt: input.runStartedAt,
  };
}

export function buildDefaultTask10ScenarioRowsInput(input: {
  producerOutcome: RunTask10CoreProducerOutcome;
  runStartedAt: string;
}): BuildTask10ScenarioRowsInput {
  if (input.producerOutcome.status === 'tooling-failure') {
    throw new Error('tooling-failure producer outcomes cannot build scenario rows');
  }
  const producerOutcome: RunTask10CoreProducerCompletedOutcome | RunTask10CoreProducerReportableBlockedOutcome = input.producerOutcome;
  const sanitizedFacts = producerOutcome.sanitizedFacts;

  if (producerOutcome.status === 'completed') {
    if (sanitizedFacts?.runIdentity === undefined
      || sanitizedFacts.preflight === undefined
      || sanitizedFacts.runtime === undefined
      || sanitizedFacts.reset === undefined
      || sanitizedFacts.success001 === undefined
      || sanitizedFacts.recovery001 === undefined
      || sanitizedFacts.success002Reuse === undefined) {
      throw new Error('completed producer outcome is missing sanitized facts');
    }
    return {
      producerOutcome,
      runIdentity: sanitizedFacts.runIdentity,
      preflight: sanitizedFacts.preflight,
      runtime: sanitizedFacts.runtime,
      reset: sanitizedFacts.reset,
      success001: sanitizedFacts.success001,
      recovery001: sanitizedFacts.recovery001,
      success002Reuse: sanitizedFacts.success002Reuse,
    };
  }

  if (isContractProbeOnlyOutcome(producerOutcome) && sanitizedFacts === undefined) {
    return {
      producerOutcome,
      runIdentity: buildCanonicalRunIdentity(input.runStartedAt),
    };
  }

  if (sanitizedFacts?.runIdentity === undefined) {
    throw new Error('reportable producer outcome is missing sanitized run identity');
  }

  return {
    producerOutcome,
    runIdentity: sanitizedFacts.runIdentity,
    preflight: sanitizedFacts.preflight,
    runtime: sanitizedFacts.runtime,
    reset: sanitizedFacts.reset,
    success001: sanitizedFacts.success001,
    recovery001: sanitizedFacts.recovery001,
    success002Reuse: sanitizedFacts.success002Reuse,
  };
}

function isContractProbeOnlyOutcome(
  producerOutcome: RunTask10CoreProducerReportableBlockedOutcome,
): boolean {
  return producerOutcome.reasonCodes.length === 1
    && producerOutcome.reasonCodes[0] === 'core-producer-private-root-contract-unsatisfied';
}

export async function collectTask10PrivateSources(
  input: {
    scenarioRows: readonly Task10ScenarioRow[];
    roots: ResolvedPaths;
  },
  dependencies: PrivateSourceCollectionDependencies = {},
): Promise<Task10PrivateSourceMap> {
  const expected = buildExpectedHandleMap(input.scenarioRows);
  const resolved = new Map<`sha256:${string}`, Task10PrivateSourceEntry>();
  const canonicalRoots = {
    coreBundleParent: await realpath(path.dirname(input.roots.coreBundle)),
    corePreflightParent: await realpath(path.dirname(input.roots.corePreflight)),
    privateInput: await realpath(input.roots.privateInput),
    privateOutput: await realpath(input.roots.privateOutput),
  };
  const maxDepth = dependencies.maxDepth ?? DEFAULT_PRIVATE_SOURCE_MAX_DEPTH;
  const maxFiles = dependencies.maxFiles ?? DEFAULT_PRIVATE_SOURCE_MAX_FILES;
  const maxFileBytes = dependencies.maxFileBytes ?? DEFAULT_PRIVATE_SOURCE_MAX_FILE_BYTES;
  const maxTotalBytes = dependencies.maxTotalBytes ?? DEFAULT_PRIVATE_SOURCE_MAX_TOTAL_BYTES;
  let scannedFiles = 0;
  let totalBytes = 0;

  const considerFile = async (filePath: string): Promise<void> => {
    const canonicalPath = await realpath(filePath);
    if (!isWithinAllowedRoots(canonicalPath, [
      canonicalRoots.coreBundleParent,
      canonicalRoots.corePreflightParent,
      canonicalRoots.privateInput,
      canonicalRoots.privateOutput,
    ])) {
      throw new Error('private source path escaped allowed roots');
    }
    const entry = await lstat(filePath);
    if (entry.isSymbolicLink()) {
      throw new Error('symlinked private source path is not allowed');
    }
    if (!entry.isFile()) {
      throw new Error('special private source node is not allowed');
    }
    if (entry.size > maxFileBytes) {
      throw new Error('private source oversize file');
    }
    scannedFiles += 1;
    if (scannedFiles > maxFiles) {
      throw new Error('private source file count exceeds bound');
    }
    const handle = await readFileHandle(filePath, entry.size);
    totalBytes += handle.bytes.byteLength;
    if (totalBytes > maxTotalBytes) {
      throw new Error('private source bytes exceed bound');
    }
    const expectedEntry = expected.get(handle.handle);
    if (expectedEntry !== undefined) {
      resolved.set(handle.handle, {
        sourceClass: expectedEntry.sourceClass,
        bytes: handle.bytes,
      });
    }
  };

  const visitDirectory = async (rootPath: string, depth: number): Promise<void> => {
    if (depth > maxDepth) {
      throw new Error('private source scan depth exceeds bound');
    }
    const entry = await lstat(rootPath);
    if (entry.isSymbolicLink()) {
      throw new Error('symlinked private source path is not allowed');
    }
    if (!entry.isDirectory()) {
      return;
    }
    const entries = await readdir(rootPath, { withFileTypes: true });
    for (const directoryEntry of entries) {
      const childPath = path.join(rootPath, directoryEntry.name);
      if (directoryEntry.isSymbolicLink()) {
        throw new Error('symlinked private source path is not allowed');
      }
      if (directoryEntry.isDirectory()) {
        await visitDirectory(childPath, depth + 1);
      } else if (directoryEntry.isFile()) {
        await considerFile(childPath);
      } else {
        throw new Error('special private source node is not allowed');
      }
    }
  };

  await considerFile(input.roots.coreBundle);
  await considerFile(input.roots.corePreflight);
  await visitDirectory(input.roots.privateInput, 0);
  await visitDirectory(input.roots.privateOutput, 0);

  for (const handle of expected.keys()) {
    if (!resolved.has(handle)) {
      throw new Error('missing expected private evidence handle');
    }
  }

  return resolved;
}

export function buildDefaultTask10ProhibitedValues(input: {
  roots: ResolvedPaths;
  env: NodeJS.ProcessEnv;
}): Task10ProhibitedValueCatalog {
  const absolutePaths = sortUniqueStrings([
    input.roots.privateInput,
    input.roots.privateOutput,
    input.roots.privateLogRoot,
    input.roots.publicationRoot,
    input.roots.coreCheckout,
    input.roots.coreEvidenceCheckout,
    input.roots.clientCheckout,
    input.roots.siteCheckout,
    input.roots.coreBundle,
    input.roots.corePreflight,
  ]);

  return Object.freeze({
    'admin session ids': Object.freeze([]),
    'account session ids': Object.freeze([]),
    passwords: Object.freeze([]),
    tokens: Object.freeze(input.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN
      ? [input.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN]
      : []),
    'credential secret refs': Object.freeze([]),
    'fixture credentials': Object.freeze([]),
    'email addresses': Object.freeze([]),
    'generated account identifiers': Object.freeze([]),
    'request and response bodies': Object.freeze([]),
    'absolute local paths': Object.freeze(absolutePaths),
  });
}

export async function runVerifyTask10ClientReproducibility(
  args: VerifyTask10ClientReproducibilityArgs,
  dependencies: VerifyTask10ClientReproducibilityDependencies = {},
): Promise<VerifyTask10ClientReproducibilityResult> {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  let stagedPublication: Task10StagedPublication | null = null;
  let stageConsumed = false;

  try {
    const runStartedAt = now();
    const resolvedPaths = await resolveAndValidatePaths(args);

    const authority = await (dependencies.verifyTask10Authority ?? defaultVerifyTask10AuthorityWrapper)({
      checkoutRoots: {
        coreRuntimeRoot: resolvedPaths.coreCheckout,
        clientValidationRoot: resolvedPaths.clientCheckout,
        siteValidationRoot: resolvedPaths.siteCheckout,
        coreEvidenceRoot: resolvedPaths.coreEvidenceCheckout,
      },
      bundleRepoPath: TASK10_AUTHORITY.coreBundlePath,
    });

    if (authority.status === 'tooling-failure') {
      throw new SanitizedCliError('sanitized tooling failure');
    }

    const commandRows = authority.status === 'reportable-blocked'
      ? buildSkippedGateRows(runStartedAt, 'authority-verification-blocked')
      : await (dependencies.recordTask10GateCommands ?? recordTask10GateCommands)({
          frozenClientRoot: resolvedPaths.clientCheckout,
          privateLogRoot: resolvedPaths.privateLogRoot,
          forbiddenOverlapRoots: [
            resolvedPaths.coreCheckout,
            resolvedPaths.siteCheckout,
            resolvedPaths.coreEvidenceCheckout,
            resolvedPaths.privateInput,
            resolvedPaths.privateOutput,
            resolvedPaths.publicationRoot,
          ],
        });

    const gateBlocked = authority.status === 'verified'
      && commandRows.some((row) => row.status === 'skipped' || row.exitCode !== 0);

    const producerOutcome = authority.status === 'reportable-blocked'
      ? buildAuthorityBlockedProducerOutcome()
      : gateBlocked
        ? buildGateBlockedProducerOutcome()
        : await (dependencies.runTask10CoreProducer ?? runTask10CoreProducer)({
            coreRoot: resolvedPaths.coreCheckout,
            clientRoot: resolvedPaths.clientCheckout,
            siteRoot: resolvedPaths.siteCheckout,
            privateInputRoot: resolvedPaths.privateInput,
            privateOutputRoot: resolvedPaths.privateOutput,
          });

    if (producerOutcome.status === 'tooling-failure') {
      throw new SanitizedCliError('sanitized tooling failure');
    }

    const scenarioRows = authority.status === 'reportable-blocked'
      ? await buildAuthorityBlockedScenarioRowsFromFilesystem(
          runStartedAt,
          ['authority-verification-blocked', ...authority.reasons],
          resolvedPaths,
        )
      : gateBlocked
        ? await buildGateBlockedScenarioRowsFromFilesystem(runStartedAt, commandRows, resolvedPaths)
      : await (dependencies.adaptTask10ScenarioRows ?? defaultAdaptTask10ScenarioRows)({
          producerOutcome,
          runStartedAt,
        });

    const fingerprint = await (dependencies.collectTask10ClientFingerprint ?? collectTask10ClientFingerprint)({
      runStartedAt,
      roots: resolvedPaths,
    });
    const commandLog: Task10CommandLog = {
      schemaVersion: 'bidvia-client-task10-command-log/v1',
      attemptId: TASK10_AUTHORITY.attemptId,
      commands: [...commandRows],
    };
    const executionInput: Task10ExecutionInput = {
      authorityVerification: authority,
      fingerprint,
      commandLog,
      scenarioRows,
      producerOutcome,
    };
    const execution = await (dependencies.evaluateExecutionEvidence ?? evaluateExecutionEvidence)(executionInput);
    const privateSources = await (dependencies.collectTask10PrivateSources ?? collectTask10PrivateSources)({
      scenarioRows,
      roots: resolvedPaths,
    });
    const prohibitedValues = buildDefaultTask10ProhibitedValues({
      roots: resolvedPaths,
      env: process.env,
    });

    const candidateDecision: Task10PublicationDecision = {
      conclusion: execution.candidateConclusion,
      reasonCodes: [...execution.reasonCodes],
      missingEvidence: [...execution.missingEvidence],
    };
    const firstCandidate = await (dependencies.assembleCandidatePayload ?? assembleCandidatePayload)({
      decision: candidateDecision,
      fingerprint,
      commandLog,
      scenarioRows,
      generatedAt: runStartedAt,
      prohibitedValues,
    });
    const firstAssessment = await (dependencies.assessCandidatePublication ?? assessCandidatePublication)({
      publicationRoot: resolvedPaths.publicationRoot,
      candidate: firstCandidate,
      privateSources,
      archive: await (dependencies.createTask10ArchiveDependencies ?? createDefaultTask10ArchiveDependencies)(),
    });
    if (firstAssessment.ok) {
      stagedPublication = firstAssessment.staged;
    }

    const finalConclusion = await (dependencies.finalizeTask10Conclusion ?? finalizeTask10Conclusion)(
      execution,
      firstAssessment.checks,
    );

    let selectedAssessment = firstAssessment;
    if (!matchesFinalConclusion(candidateDecision, finalConclusion) || !firstAssessment.ok || !publicationChecksAllTrue(firstAssessment.checks)) {
      if (finalConclusion.conclusion !== BLOCKED_CONCLUSION) {
        throw new SanitizedCliError('sanitized tooling inconsistency');
      }
      if (stagedPublication !== null) {
        await (dependencies.discardTask10Publication ?? discardTask10Publication)(stagedPublication);
        stagedPublication = null;
      }
      const rebuiltCandidate = await (dependencies.assembleCandidatePayload ?? assembleCandidatePayload)({
        decision: {
          conclusion: finalConclusion.conclusion,
          reasonCodes: [...finalConclusion.reasonCodes],
          missingEvidence: [...finalConclusion.missingEvidence],
        },
        fingerprint,
        commandLog,
        scenarioRows,
        generatedAt: runStartedAt,
        prohibitedValues,
      });
      selectedAssessment = await (dependencies.assessCandidatePublication ?? assessCandidatePublication)({
        publicationRoot: resolvedPaths.publicationRoot,
        candidate: rebuiltCandidate,
        privateSources,
        archive: await (dependencies.createTask10ArchiveDependencies ?? createDefaultTask10ArchiveDependencies)(),
      });
      if (!selectedAssessment.ok || !publicationChecksAllTrue(selectedAssessment.checks)) {
        throw new SanitizedCliError('sanitized tooling failure');
      }
      stagedPublication = selectedAssessment.staged;
    }

    if (stagedPublication === null) {
      throw new SanitizedCliError('sanitized tooling failure');
    }

    const frozen = await (dependencies.freezeTask10Publication ?? freezeTask10Publication)(stagedPublication);
    stageConsumed = true;
    stagedPublication = null;
    assertFinalPublication(frozen, finalConclusion.conclusion);

    if (frozen.validationMode !== 'producer' || frozen.privateSourceBytesReverified !== true) {
      throw new SanitizedCliError('sanitized tooling failure');
    }

    stdout.write(`${JSON.stringify({
      command: COMMAND_NAME,
      conclusion: finalConclusion.conclusion,
      packageName: frozen.packageName,
      packagePath: requireSafeReceiptPath(frozen.receipt.packageDirectory, 'packageDirectory'),
      conclusionPath: requireSafeReceiptPath(frozen.receipt.conclusionPath, 'conclusionPath'),
      conclusionSha256: frozen.receipt.conclusionSha256,
      archivePath: requireSafeReceiptPath(frozen.receipt.archivePath, 'archivePath'),
      archiveSha256: frozen.receipt.archiveSha256,
    }, null, 2)}\n`);
    return { exitCode: 0 };
  } catch (error) {
    if (stagedPublication !== null && !stageConsumed) {
      try {
        await (dependencies.discardTask10Publication ?? discardTask10Publication)(stagedPublication);
      } catch (_cleanupError) {
        stderr.write('sanitized cleanup failure\n');
        return { exitCode: 1 };
      }
    }
    stderr.write(`${sanitizeErrorMessage(error)}\n`);
    return { exitCode: error instanceof SanitizedCliError ? error.exitCode : 1 };
  }
}

export async function main(
  argv: string[] = process.argv.slice(2),
  dependencies: VerifyTask10ClientReproducibilityDependencies = {},
): Promise<VerifyTask10ClientReproducibilityResult> {
  try {
    const args = parseVerifyTask10ClientReproducibilityArgs(argv);
    const result = await runVerifyTask10ClientReproducibility(args, dependencies);
    if (dependencies.stdout === undefined && dependencies.stderr === undefined) {
      process.exitCode = result.exitCode;
    }
    return result;
  } catch (error) {
    const stderr = dependencies.stderr ?? process.stderr;
    stderr.write(`${sanitizeErrorMessage(error)}\n`);
    if (dependencies.stdout === undefined && dependencies.stderr === undefined) {
      process.exitCode = error instanceof SanitizedCliError ? error.exitCode : 1;
    }
    return { exitCode: error instanceof SanitizedCliError ? error.exitCode : 1 };
  }
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof SanitizedCliError) {
    return error.message;
  }
  return 'sanitized tooling failure';
}

function runGitCommandSync(rootPath: string, args: readonly string[]): string | null {
  const result = spawnSync('git', args, {
    cwd: rootPath,
    shell: false,
    env: buildSafeSpawnEnv(process.env),
    encoding: 'utf8',
    timeout: SAFE_CHILD_TIMEOUT_MS,
    maxBuffer: SAFE_CHILD_MAX_OUTPUT_BYTES,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    if (args[0] === 'rev-parse' && args[2] === '@{upstream}') {
      return null;
    }
    throw new Error('git command failed');
  }
  return result.stdout.trim();
}

function runVersionCommandSync(command: string, args: readonly string[]): string {
  const result = spawnSync(command, args, {
    shell: false,
    env: buildSafeSpawnEnv(process.env),
    encoding: 'utf8',
    timeout: SAFE_CHILD_TIMEOUT_MS,
    maxBuffer: SAFE_CHILD_MAX_OUTPUT_BYTES,
  });
  if (result.error || result.status !== 0) {
    throw new Error('tool version command failed');
  }
  return result.stdout.trim() || result.stderr.trim();
}

function buildSafeSpawnEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};
  for (const key of SAFE_SPAWN_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      safeEnv[key] = value;
    }
  }
  return safeEnv;
}

function requireNonEmptyGitValue(value: string | null): string {
  if (value === null || value.trim().length === 0) {
    throw new Error('git value missing');
  }
  return value.trim();
}

function requireNonBlankVersion(value: string): string {
  if (value.trim().length === 0) {
    throw new Error('tool version missing');
  }
  return value.trim();
}

function readBoundedRegularFileSync(filePath: string, maxBytes: number): Uint8Array {
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.isSymbolicLink() || stats.size > maxBytes) {
    throw new Error('bounded file read rejected');
  }

  const descriptor = openSync(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    const bytes = new Uint8Array(readFileSync(descriptor));
    if (bytes.byteLength !== stats.size) {
      throw new Error('bounded file read changed during read');
    }
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function requireToolVersion(
  runVersionCommand: (command: string, args: readonly string[]) => string,
  command: string,
  args: readonly string[],
): string {
  try {
    return requireNonBlankVersion(runVersionCommand(command, args));
  } catch {
    throw new Error(`${command} version unavailable`);
  }
}

function mapInspectionError(error: unknown): Task10ExpectedCheckoutInspectionError {
  if (isErrnoCode(error, 'ENOENT')) {
    return new Task10ExpectedCheckoutInspectionError('missing');
  }
  return new Task10ExpectedCheckoutInspectionError('unreadable');
}

function isErrnoCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === code;
}

function toCheckoutProof(inspection: Task10CheckoutInspection): Task10ClientFingerprint['checkoutProofs'][CheckoutKey] {
  return {
    headCommit: inspection.headCommit,
    branch: inspection.branch,
    upstreamRef: inspection.upstreamRef,
    detachedHead: inspection.detachedHead,
    porcelainStatus: inspection.porcelainStatus,
    lockfileSha256: inspection.lockfileSha256 ?? '',
  };
}

function buildCanonicalRunIdentity(timestamp: string): SanitizedRunIdentity {
  return {
    tenant: 'tenant:task10-owner',
    actor: 'actor:operator-admin',
    company: 'company:owner',
    request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
    sourceObject: 'admin-session-bootstrap',
    targetObject: 'rehearsal-run-identity',
    timestamp,
    proofClass: 'session-access-proof',
  };
}

function buildExpectedHandleMap(
  scenarioRows: readonly Task10ScenarioRow[],
): Map<`sha256:${string}`, { sourceClass: Task10PrivateEvidenceAttestation['sourceClass'] }> {
  const expected = new Map<`sha256:${string}`, { sourceClass: Task10PrivateEvidenceAttestation['sourceClass'] }>();
  for (const row of scenarioRows) {
    if (row.privateEvidenceHandles.length !== row.privateEvidenceAttestations.length) {
      throw new Error('private evidence handle alignment is invalid');
    }
    for (let index = 0; index < row.privateEvidenceHandles.length; index += 1) {
      const handle = row.privateEvidenceHandles[index]!;
      const attestation = row.privateEvidenceAttestations[index]!;
      if (handle !== attestation.handle) {
        throw new Error('private evidence handle alignment is invalid');
      }
      const existing = expected.get(handle);
      if (existing !== undefined && existing.sourceClass !== attestation.sourceClass) {
        throw new Error('private evidence source class conflict');
      }
      expected.set(handle, { sourceClass: attestation.sourceClass });
    }
  }
  return expected;
}

async function readFileHandle(filePath: string, expectedSize: number): Promise<{ handle: `sha256:${string}`; bytes: Uint8Array }> {
  if (expectedSize > DEFAULT_PRIVATE_SOURCE_MAX_FILE_BYTES) {
    throw new Error('private source oversize file');
  }
  const fileDescriptor = await open(filePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK);
  try {
    const stats = await fileDescriptor.stat();
    if (!stats.isFile() || stats.size !== expectedSize) {
      throw new Error('private source file changed during read');
    }
    const bytes = new Uint8Array(await fileDescriptor.readFile());
    const finalStats = await fileDescriptor.stat();
    if (finalStats.size !== expectedSize || bytes.byteLength !== expectedSize) {
      throw new Error('private source file changed during read');
    }
    return {
      handle: `sha256:${hashBytes(bytes)}`,
      bytes,
    };
  } finally {
    await fileDescriptor.close();
  }
}

async function resolveAndValidatePaths(args: VerifyTask10ClientReproducibilityArgs): Promise<ResolvedPaths> {
  const privateInput = await requireSafeDirectory(args.privateInput, '--private-input');
  const privateOutput = await requireSafeDirectory(args.privateOutput, '--private-output');
  const privateLogRoot = await requireSafeDirectory(args.privateLogRoot, '--private-log-root');
  const publicationRoot = await requireSafeDirectory(args.publicationRoot, '--publication-root');
  const coreCheckout = await requireSafeDirectory(args.coreCheckout, '--core-checkout');
  const coreEvidenceCheckout = await requireSafeDirectory(args.coreEvidenceCheckout, '--core-evidence-checkout');
  const clientCheckout = await requireSafeDirectory(args.clientCheckout, '--client-checkout');
  const siteCheckout = await requireSafeDirectory(args.siteCheckout, '--site-checkout');
  const coreBundle = await requireSafeRegularFile(args.coreBundle, '--core-bundle');
  if (!isInside(coreEvidenceCheckout, coreBundle)) {
    throw new SanitizedCliError('sanitized bundle path failure');
  }
  const bundleRepoPath = toRepoRelative(coreEvidenceCheckout, coreBundle);
  if (bundleRepoPath !== TASK10_AUTHORITY.coreBundlePath) {
    throw new SanitizedCliError('sanitized coreBundlePath relative mismatch');
  }

  const corePreflight = await requireSafeRegularFile(
    path.join(coreEvidenceCheckout, TASK10_AUTHORITY.corePreflightPath),
    '--derived-core-preflight',
  );

  const roots: NamedRoot[] = [
    { name: '--private-input', value: privateInput },
    { name: '--private-output', value: privateOutput },
    { name: '--private-log-root', value: privateLogRoot },
    { name: '--publication-root', value: publicationRoot },
    { name: '--core-checkout', value: coreCheckout },
    { name: '--core-evidence-checkout', value: coreEvidenceCheckout },
    { name: '--client-checkout', value: clientCheckout },
    { name: '--site-checkout', value: siteCheckout },
  ];
  validateDistinctRoots(roots);
  validateRootTopology(roots);

  return {
    privateInput,
    privateOutput,
    privateLogRoot,
    publicationRoot,
    coreCheckout,
    coreEvidenceCheckout,
    clientCheckout,
    siteCheckout,
    coreBundle,
    corePreflight,
  };
}

async function requireSafeDirectory(rawValue: string, label: NamedRoot['name']): Promise<string> {
  const resolved = path.resolve(rawValue);
  await rejectSymlinkAncestors(resolved, label);
  const real = await realpath(resolved);
  const entry = await lstat(real);
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    throw new SanitizedCliError(`${label} must be a real directory`);
  }
  return real;
}

async function requireSafeRegularFile(rawValue: string, label: NamedRoot['name']): Promise<string> {
  const resolved = path.resolve(rawValue);
  await rejectSymlinkAncestors(resolved, label);
  const real = await realpath(resolved);
  const entry = await lstat(real);
  if (entry.isSymbolicLink() || !entry.isFile()) {
    throw new SanitizedCliError(`${label} must be a real file`);
  }
  return real;
}

async function rejectSymlinkAncestors(targetPath: string, label: NamedRoot['name']): Promise<void> {
  const parsedPath = path.parse(targetPath);
  let currentPath = parsedPath.root;
  const segments = targetPath.slice(parsedPath.root.length).split(path.sep).filter(Boolean);
  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    let entry: Awaited<ReturnType<typeof lstat>>;
    try {
      entry = await lstat(currentPath);
    } catch (error) {
      if (isErrnoCode(error, 'ENOENT')) {
        throw new SanitizedCliError(label === '--core-bundle' ? 'bundle path missing' : `${label} path missing`);
      }
      throw error;
    }
    if (entry.isSymbolicLink()) {
      throw new SanitizedCliError(label === '--core-bundle' ? 'bundle path must not be symlinked' : `${label} must not include symlinked path segments`);
    }
  }
}

function validateDistinctRoots(roots: readonly NamedRoot[]): void {
  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root.value)) {
      throw new SanitizedCliError('duplicate root paths are not allowed');
    }
    seen.add(root.value);
  }
}

function validateRootTopology(roots: readonly NamedRoot[]): void {
  for (let leftIndex = 0; leftIndex < roots.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < roots.length; rightIndex += 1) {
      const left = roots[leftIndex]!;
      const right = roots[rightIndex]!;
      if (isSameOrNested(left.value, right.value) || isSameOrNested(right.value, left.value)) {
        throw new SanitizedCliError(left.name === '--publication-root' || right.name === '--publication-root'
          ? 'publication root must not overlap another root'
          : 'roots must not overlap or nest');
      }
    }
  }
}

function isSameOrNested(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === ''
    || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
}

function isInside(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath !== ''
    && !relativePath.startsWith(`..${path.sep}`)
    && relativePath !== '..'
    && !path.isAbsolute(relativePath);
}

function isWithinAllowedRoots(candidatePath: string, rootPaths: readonly string[]): boolean {
  return rootPaths.some((rootPath) => {
    const relativePath = path.relative(rootPath, candidatePath);
    return relativePath === ''
      || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));
  });
}

function toRepoRelative(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).split(path.sep).join('/');
}

function buildSkippedGateRows(runStartedAt: string, reason: string): Task10CommandRow[] {
  return GATE_COMMANDS.map((command) => ({
    command,
    cwd: 'frozen-client-root',
    startedAt: runStartedAt,
    endedAt: runStartedAt,
    status: 'skipped',
    exitCode: null,
    skippedDueTo: reason,
  }));
}

function buildAuthorityBlockedProducerOutcome(): RunTask10CoreProducerReportableBlockedOutcome {
  return {
    status: 'reportable-blocked',
    reasonCodes: ['producer-output-preflight-blocked'],
    affectedModes: ['preflight'],
    affectedFamilies: ['session-access', 'readiness', 'dispatch', 'replay-recovery', 'result-submission'],
    evidence: { groups: [] },
  };
}

function buildGateBlockedProducerOutcome(): RunTask10CoreProducerReportableBlockedOutcome {
  return {
    status: 'reportable-blocked',
    reasonCodes: ['producer-output-preflight-blocked'],
    affectedModes: ['preflight'],
    affectedFamilies: ['session-access', 'readiness', 'dispatch', 'replay-recovery', 'result-submission'],
    evidence: { groups: [] },
    publicDiagnostic: undefined,
  };
}

async function buildGateBlockedScenarioRowsFromFilesystem(
  runStartedAt: string,
  commandRows: readonly Task10CommandRow[],
  roots: ResolvedPaths,
): Promise<Task10ScenarioRow[]> {
  const bundleBytes = await readFileHandle(roots.coreBundle, (await lstat(roots.coreBundle)).size);
  const preflightBytes = await readFileHandle(roots.corePreflight, (await lstat(roots.corePreflight)).size);
  const reasonCodes = buildGateBlockedReasonCodes(commandRows);
  return [
    buildBlockedScenarioRow('session-access', TASK10_AUTHORITY.corePreflightUrl, 'POST /runtime/admin/sessions/sign-in request:session-access:001', 'admin-session-bootstrap', 'rehearsal-run-identity', 'session-access-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('readiness', TASK10_AUTHORITY.corePreflightUrl, 'GET /readyz request:readiness:001', 'runtime-readyz', 'runtime-identity-check', 'readiness-runtime-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('readiness', TASK10_AUTHORITY.corePreflightUrl, 'POST /runtime/rehearsals/merged-main/reset request:readiness:002', 'reset-freshness-inspection', 'reset-proof', 'readiness-reset-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('dispatch', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001', 'registration-bound-dispatch', 'persisted-dispatch-readback', 'dispatch-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('replay-recovery', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001', 'rollback-request', 'recovery-lineage', 'recovery-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('replay-recovery', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002', 'reuse-readback', 'distinct-current-execution-ids', 'reuse-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('result-submission', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/commercial-actions/:id/execute request:result-submission:001', 'commercial-action-execution', 'provider-receipt-evidence', 'result-submission-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
  ];
}

function buildGateBlockedReasonCodes(commandRows: readonly Task10CommandRow[]): string[] {
  const codes = ['gate-execution-blocked'];
  for (const row of commandRows) {
    if (row.status === 'executed' && row.exitCode !== 0) {
      codes.push(`command-${sanitizeCommandToken(row.command)}-exit-${String(row.exitCode)}`);
    }
    if (row.status === 'skipped' && row.skippedDueTo !== null) {
      codes.push(`command-${sanitizeCommandToken(row.command)}-skipped-${sanitizeCommandToken(row.skippedDueTo)}`);
    }
  }
  return sortUniqueStrings(codes);
}

function sanitizeCommandToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function buildAuthorityBlockedScenarioRowsFromFilesystem(
  runStartedAt: string,
  reasons: readonly string[],
  roots: ResolvedPaths,
): Promise<Task10ScenarioRow[]> {
  const bundleBytes = await readFileHandle(roots.coreBundle, (await lstat(roots.coreBundle)).size);
  const preflightBytes = await readFileHandle(roots.corePreflight, (await lstat(roots.corePreflight)).size);
  const reasonCodes = sortUniqueStrings(['authority-verification-blocked', ...reasons.map(sanitizeAuthorityReason)]);
  return [
    buildBlockedScenarioRow('session-access', TASK10_AUTHORITY.corePreflightUrl, 'POST /runtime/admin/sessions/sign-in request:session-access:001', 'admin-session-bootstrap', 'rehearsal-run-identity', 'session-access-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('readiness', TASK10_AUTHORITY.corePreflightUrl, 'GET /readyz request:readiness:001', 'runtime-readyz', 'runtime-identity-check', 'readiness-runtime-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('readiness', TASK10_AUTHORITY.corePreflightUrl, 'POST /runtime/rehearsals/merged-main/reset request:readiness:002', 'reset-freshness-inspection', 'reset-proof', 'readiness-reset-proof', preflightBytes.handle, 'preflight', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('dispatch', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001', 'registration-bound-dispatch', 'persisted-dispatch-readback', 'dispatch-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('replay-recovery', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001', 'rollback-request', 'recovery-lineage', 'recovery-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('replay-recovery', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002', 'reuse-readback', 'distinct-current-execution-ids', 'reuse-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
    buildBlockedScenarioRow('result-submission', TASK10_AUTHORITY.coreBundleUrl, 'POST /runtime/commercial-actions/:id/execute request:result-submission:001', 'commercial-action-execution', 'provider-receipt-evidence', 'result-submission-proof', bundleBytes.handle, 'authority-bundle', runStartedAt, reasonCodes),
  ];
}

function buildBlockedScenarioRow(
  scenarioFamily: Task10ScenarioRow['scenarioFamily'],
  authority: string,
  request: string,
  sourceObject: string,
  targetObject: string,
  proofClass: string,
  handle: `sha256:${string}`,
  sourceClass: Task10PrivateEvidenceAttestation['sourceClass'],
  timestamp: string,
  reasonCodes: readonly string[],
): Task10ScenarioRow {
  return {
    scenarioFamily,
    tenant: 'tenant:authority-blocked',
    actor: 'actor:authority-blocked',
    company: 'company:authority-blocked',
    authority,
    request,
    sourceObject,
    targetObject,
    proofClass,
    evidenceRefs: [authority],
    privateEvidenceHandles: [handle],
    privateEvidenceAttestations: [{
      handle,
      sourceClass,
      verified: true,
      verifiedAt: timestamp,
    }],
    result: BLOCKED_CONCLUSION,
    timestamp,
    reasonCodes: [...reasonCodes],
  };
}

function sanitizeAuthorityReason(reason: string): AuthorityReasonCode {
  const normalized = reason.toLowerCase();
  if (normalized.includes('bundle sha256 mismatch') || normalized.includes('bundle sha mismatch')) {
    return 'bundle-sha256-mismatch';
  }
  if (normalized.includes('bundle json is unreadable')) {
    return 'bundle-json-unreadable';
  }
  if (normalized.includes('bundle reference is malformed')) {
    return 'bundle-reference-malformed';
  }
  if (normalized.includes('bundle path escaped')) {
    return 'bundle-path-escaped-core-evidence-root';
  }
  if (normalized.includes('bundle repo path mismatch') || normalized.includes('bundle path mismatch')) {
    return 'bundle-path-mismatch';
  }
  if (normalized.includes('bundle is missing or unreadable')) {
    return 'bundle-missing-or-unreadable';
  }
  if (normalized.includes('preflight artifact hash mismatch')) {
    return 'preflight-artifact-hash-mismatch';
  }
  if (normalized.includes('preflight artifact path mismatch')) {
    return 'preflight-artifact-path-mismatch';
  }
  if (normalized.includes('preflight artifact path escaped')) {
    return 'preflight-artifact-path-escaped-core-evidence-root';
  }
  if (normalized.includes('preflight artifact is missing or unreadable')) {
    return 'preflight-artifact-missing-or-unreadable';
  }
  if (normalized.includes('preflight json is unreadable')) {
    return 'preflight-json-unreadable';
  }
  if (normalized.includes('preflight authority facts are invalid')) {
    return 'preflight-authority-facts-invalid';
  }
  if (normalized.includes('checkout roots must not resolve to the same real path') || normalized.includes('nested or overlapping')) {
    return 'checkout-root-overlap';
  }
  if (normalized.includes('symlinked path')) {
    return 'checkout-root-symlinked';
  }
  if (normalized.includes('checkout inspection is missing or unreadable')) {
    return 'checkout-inspection-missing-or-unreadable';
  }
  if (normalized.includes('core runtime root head commit mismatch')) {
    return 'core-runtime-head-mismatch';
  }
  if (normalized.includes('core runtime root branch mismatch')) {
    return 'core-runtime-branch-mismatch';
  }
  if (normalized.includes('core runtime root upstream ref mismatch')) {
    return 'core-runtime-upstream-mismatch';
  }
  if (normalized.includes('core runtime root lockfile hash mismatch')) {
    return 'core-runtime-lockfile-mismatch';
  }
  if (normalized.includes('site validation root head commit mismatch')) {
    return 'site-validation-head-mismatch';
  }
  if (normalized.includes('site validation root upstream ref mismatch')) {
    return 'site-validation-upstream-mismatch';
  }
  if (normalized.includes('site validation root lockfile hash mismatch')) {
    return 'site-validation-lockfile-mismatch';
  }
  if (normalized.includes('core evidence root head commit mismatch')) {
    return 'core-evidence-head-mismatch';
  }
  if (normalized.includes('core evidence root must be detached')) {
    return 'core-evidence-detached-mismatch';
  }
  if (normalized.includes('core evidence root upstream ref must be null')) {
    return 'core-evidence-upstream-mismatch';
  }
  if (normalized.includes('core evidence root porcelain status')) {
    return 'core-evidence-porcelain-mismatch';
  }
  return 'unknown-authority-blocked';
}

async function defaultAdaptTask10ScenarioRows(input: {
  producerOutcome: RunTask10CoreProducerOutcome;
  runStartedAt: string;
}): Promise<Task10ScenarioRow[]> {
  return buildTask10ScenarioRows(buildDefaultTask10ScenarioRowsInput(input));
}

async function defaultVerifyTask10AuthorityWrapper(
  input: VerifyTask10AuthorityInput,
): Promise<Task10AuthorityVerificationResult> {
  const authorityDependencies: Task10AuthorityVerifierDependencies = {
    readFile(filePath) {
      return readBoundedRegularFileSync(filePath, MAX_AUTHORITY_FILE_BYTES);
    },
    hashBytes(bytes) {
      return hashBytes(bytes);
    },
    inspectCheckout(rootPath) {
      return inspectTask10Checkout(rootPath);
    },
  };
  return verifyTask10Authority(input, authorityDependencies);
}

function matchesFinalConclusion(
  candidate: Task10PublicationDecision,
  finalConclusion: Task10FinalConclusion,
): boolean {
  return candidate.conclusion === finalConclusion.conclusion
    && compareStringArrays(candidate.reasonCodes, finalConclusion.reasonCodes)
    && compareStringArrays(candidate.missingEvidence, finalConclusion.missingEvidence);
}

function compareStringArrays(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function publicationChecksAllTrue(checks: Task10PublicationChecks): boolean {
  return checks.secretScanVerified
    && checks.internalManifestVerified
    && checks.archiveVerified
    && checks.receiptVerified;
}

function assertFinalPublication(
  publication: Task10ValidatedPublication,
  conclusion: Task10Conclusion,
): void {
  if (publication.receipt.clientOwnedConclusion !== conclusion) {
    throw new SanitizedCliError('sanitized conclusion mismatch');
  }
  if (!publicationChecksAllTrue(publication.checks)) {
    throw new SanitizedCliError('sanitized tooling failure');
  }
}

function requireSafeReceiptPath(value: string, label: 'packageDirectory' | 'conclusionPath' | 'archivePath'): string {
  if (!value || value.includes('\\') || path.posix.isAbsolute(value)) {
    throw new SanitizedCliError(`sanitized receipt ${label} failure`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new SanitizedCliError(`sanitized receipt ${label} failure`);
  }
  return normalized;
}

function sortUniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareCodeUnits);
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main();
}
