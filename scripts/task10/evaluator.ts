import { TASK10_AUTHORITY, TASK10_REQUIRED_SCENARIO_FAMILIES, requireCompleteTask10ScenarioRow } from './contracts.js';
import type {
  Task10ClientFingerprint,
  Task10CommandLog,
  Task10CommandRow,
  Task10Conclusion,
  Task10PrivateEvidenceAttestation,
  Task10ScenarioFamily,
  Task10ScenarioRow,
} from './contracts.js';
import type { Task10AuthorityVerificationResult } from './authority.js';
import type { RunTask10CoreProducerOutcome, Task10PrivateEvidenceGroup } from './core-producer-adapter.js';

const TASK10_GATE_COMMANDS = [
  'npm test',
  'npm run typecheck',
  'npm run build',
  'npm run validate',
  'npm run validate:release-readiness',
  'npm run validate:release-gate',
] as const;

const COMPLETED_PRODUCER_GROUPS = [
  'runtime',
  'reset',
  'preflight',
  'success-001',
  'recovery-001',
  'success-002-reuse',
] as const;

const FAMILY_MINIMUMS: Record<Task10ScenarioFamily, number> = {
  'session-access': 1,
  readiness: 2,
  dispatch: 1,
  'replay-recovery': 2,
  'result-submission': 1,
};

const FAMILY_ORDER = new Map(TASK10_REQUIRED_SCENARIO_FAMILIES.map((family, index) => [family, index]));
const COMPLETED_PRODUCER_GROUP_SET = new Set<Task10PrivateEvidenceGroup['sourceClass']>(COMPLETED_PRODUCER_GROUPS);

export interface Task10ExecutionInput {
  readonly authorityVerification: Task10AuthorityVerificationResult;
  readonly fingerprint: Task10ClientFingerprint;
  readonly commandLog: Task10CommandLog;
  readonly scenarioRows: readonly Task10ScenarioRow[];
  readonly producerOutcome: RunTask10CoreProducerOutcome;
}

export interface Task10ExecutionEvaluation {
  candidateConclusion: Task10Conclusion;
  reasonCodes: string[];
  missingEvidence: string[];
}

export interface Task10PublicationChecks {
  readonly secretScanVerified: boolean;
  readonly internalManifestVerified: boolean;
  readonly archiveVerified: boolean;
  readonly receiptVerified: boolean;
}

type ValidatedProducerEvidence = Map<Task10PrivateEvidenceGroup['sourceClass'], Map<string, Task10PrivateEvidenceAttestation>>;

export interface Task10FinalConclusion {
  conclusion: Task10Conclusion;
  reasonCodes: string[];
  missingEvidence: string[];
}

export function evaluateExecutionEvidence(input: Task10ExecutionInput): Task10ExecutionEvaluation {
  const reasons = new Set<string>();
  const missingEvidence = new Set<string>();
  let validatedProducerEvidence: ValidatedProducerEvidence = new Map();

  safelyValidateDomain(() => {
    validateAuthority(input.authorityVerification, reasons);
  }, 'authority', 'authority-evidence', reasons, missingEvidence);
  safelyValidateDomain(() => {
    validateFingerprint(input.fingerprint, reasons);
  }, 'fingerprint', 'fingerprint-evidence', reasons, missingEvidence);
  safelyValidateDomain(() => {
    validateCommandLog(input.commandLog, reasons, missingEvidence);
  }, 'commandLog', 'command-log', reasons, missingEvidence);
  safelyValidateDomain(() => {
    validatedProducerEvidence = validateProducerOutcome(input.producerOutcome, reasons, missingEvidence);
  }, 'producerOutcome', 'producer-evidence', reasons, missingEvidence);
  safelyValidateDomain(() => {
    validateScenarioRows(input.scenarioRows, validatedProducerEvidence, reasons, missingEvidence);
  }, 'scenarioRows', 'scenario-rows', reasons, missingEvidence);

  const sortedReasons = sortUniqueStrings(reasons);
  const sortedMissingEvidence = sortUniqueStrings(missingEvidence);

  return {
    candidateConclusion: sortedReasons.length === 0 && sortedMissingEvidence.length === 0 ? 'passed' : 'blocked',
    reasonCodes: sortedReasons,
    missingEvidence: sortedMissingEvidence,
  };
}

export function finalizeTask10Conclusion(
  execution: Task10ExecutionEvaluation,
  publication: Task10PublicationChecks,
): Task10FinalConclusion {
  const reasons = new Set<string>();
  const missingEvidence = new Set<string>();

  const candidateConclusion = execution !== null && typeof execution === 'object' && 'candidateConclusion' in execution
    ? (execution as { candidateConclusion?: unknown }).candidateConclusion
    : undefined;
  const normalizedCandidate = candidateConclusion === 'passed' || candidateConclusion === 'blocked'
    ? candidateConclusion
    : null;

  const normalizedReasonCodes = normalizeStringArray(
    execution !== null && typeof execution === 'object' && 'reasonCodes' in execution
      ? (execution as { reasonCodes?: unknown }).reasonCodes
      : undefined,
    'execution.reasonCodes.invalid',
    reasons,
  );
  const normalizedMissingEvidence = normalizeStringArray(
    execution !== null && typeof execution === 'object' && 'missingEvidence' in execution
      ? (execution as { missingEvidence?: unknown }).missingEvidence
      : undefined,
    'execution.missingEvidence.invalid',
    reasons,
  );

  for (const reason of normalizedReasonCodes) {
    reasons.add(reason);
  }
  for (const missing of normalizedMissingEvidence) {
    missingEvidence.add(missing);
  }

  if (normalizedCandidate === 'blocked') {
    reasons.add('execution.candidate.blocked');
  } else if (normalizedCandidate !== 'passed') {
    reasons.add('execution.candidate.invalid');
  }

  if (publication?.secretScanVerified !== true) {
    reasons.add('publication.secret-scan.unverified');
    missingEvidence.add('secret-scan');
  }
  if (publication?.internalManifestVerified !== true) {
    reasons.add('publication.internal-manifest.unverified');
    missingEvidence.add('internal-manifest');
  }
  if (publication?.archiveVerified !== true) {
    reasons.add('publication.archive.unverified');
    missingEvidence.add('archive');
  }
  if (publication?.receiptVerified !== true) {
    reasons.add('publication.receipt.unverified');
    missingEvidence.add('receipt');
  }

  const sortedReasons = sortUniqueStrings(reasons);
  const sortedMissingEvidence = sortUniqueStrings(missingEvidence);

  return {
    conclusion: normalizedCandidate === 'passed' && sortedReasons.length === 0 && sortedMissingEvidence.length === 0
      ? 'passed'
      : 'blocked',
    reasonCodes: sortedReasons,
    missingEvidence: sortedMissingEvidence,
  };
}

function safelyValidateDomain(
  operation: () => void,
  domain: 'authority' | 'fingerprint' | 'commandLog' | 'scenarioRows' | 'producerOutcome',
  missingEvidenceName: string,
  reasons: Set<string>,
  missingEvidence: Set<string>,
): void {
  try {
    operation();
  } catch {
    reasons.add(`${domain}.malformed`);
    missingEvidence.add(missingEvidenceName);
  }
}

function validateAuthority(authority: Task10AuthorityVerificationResult, reasons: Set<string>): void {
  if (typeof authority !== 'object' || authority === null || !('status' in authority) || !('reasons' in authority) || !Array.isArray(authority.reasons)) {
    throw new Error('authority verification must be an object with status and reasons array');
  }
  if (authority.status === 'verified') {
    if (authority.reasons.length > 0) {
      reasons.add('authority.verified.reasons-present');
    }
    return;
  }

  for (const reason of authority.reasons) {
    reasons.add(`authority.${authority.status}:${reason}`);
  }
  if (authority.reasons.length === 0) {
    reasons.add(`authority.${authority.status}:missing-reason`);
  }
}

function validateFingerprint(fingerprint: Task10ClientFingerprint, reasons: Set<string>): void {
  if (typeof fingerprint !== 'object' || fingerprint === null) {
    throw new Error('fingerprint must be an object');
  }
  checkLiteral(fingerprint.schemaVersion, 'bidvia-client-task10-fingerprint/v1', 'fingerprint.schemaVersion.mismatch', reasons);
  checkLiteral(fingerprint.repository, TASK10_AUTHORITY.repository, 'fingerprint.repository.mismatch', reasons);
  checkLiteral(fingerprint.attemptId, TASK10_AUTHORITY.attemptId, 'fingerprint.attemptId.mismatch', reasons);
  checkLiteral(fingerprint.clientBaselineSha, TASK10_AUTHORITY.clientBaselineSha, 'fingerprint.clientBaselineSha.mismatch', reasons);
  checkLiteral(fingerprint.coreRuntimeSha, TASK10_AUTHORITY.coreRuntimeSha, 'fingerprint.coreRuntimeSha.mismatch', reasons);
  checkLiteral(fingerprint.siteBaselineSha, TASK10_AUTHORITY.siteBaselineSha, 'fingerprint.siteBaselineSha.mismatch', reasons);
  checkLiteral(fingerprint.coreEvidencePublicationCommit, TASK10_AUTHORITY.coreEvidencePublicationCommit, 'fingerprint.coreEvidencePublicationCommit.mismatch', reasons);
  checkLiteral(fingerprint.coreBundlePath, TASK10_AUTHORITY.coreBundlePath, 'fingerprint.coreBundlePath.mismatch', reasons);
  checkLiteral(fingerprint.coreBundleSha256, TASK10_AUTHORITY.coreBundleSha256, 'fingerprint.coreBundleSha256.mismatch', reasons);
  checkLiteral(fingerprint.packageIdentities.core, TASK10_AUTHORITY.packageIdentities.core, 'fingerprint.packageIdentities.core.mismatch', reasons);
  checkLiteral(fingerprint.packageIdentities.client, TASK10_AUTHORITY.packageIdentities.client, 'fingerprint.packageIdentities.client.mismatch', reasons);
  checkLiteral(fingerprint.packageIdentities.site, TASK10_AUTHORITY.packageIdentities.site, 'fingerprint.packageIdentities.site.mismatch', reasons);
  checkLiteral(fingerprint.lockfileSha256.core, TASK10_AUTHORITY.lockfileSha256.core, 'fingerprint.lockfileSha256.core.mismatch', reasons);
  checkLiteral(fingerprint.lockfileSha256.client, TASK10_AUTHORITY.lockfileSha256.client, 'fingerprint.lockfileSha256.client.mismatch', reasons);
  checkLiteral(fingerprint.lockfileSha256.site, TASK10_AUTHORITY.lockfileSha256.site, 'fingerprint.lockfileSha256.site.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.sourceMainCommitMarker, TASK10_AUTHORITY.runtimeMarkers.sourceMainCommitMarker, 'fingerprint.runtimeMarkers.sourceMainCommitMarker.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.runtimeReportedVersionMarker, TASK10_AUTHORITY.runtimeMarkers.runtimeReportedVersionMarker, 'fingerprint.runtimeMarkers.runtimeReportedVersionMarker.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.bootstrapPackageVersionMarker, TASK10_AUTHORITY.runtimeMarkers.bootstrapPackageVersionMarker, 'fingerprint.runtimeMarkers.bootstrapPackageVersionMarker.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.scenarioPackageVersionMarker, TASK10_AUTHORITY.runtimeMarkers.scenarioPackageVersionMarker, 'fingerprint.runtimeMarkers.scenarioPackageVersionMarker.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.providerFixtureIdentity, TASK10_AUTHORITY.providerFixtureIdentity, 'fingerprint.runtimeMarkers.providerFixtureIdentity.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.providerProtocolVersion, TASK10_AUTHORITY.providerProtocolVersion, 'fingerprint.runtimeMarkers.providerProtocolVersion.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.postgresPort, TASK10_AUTHORITY.ports.postgres, 'fingerprint.runtimeMarkers.postgresPort.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.runtimePort, TASK10_AUTHORITY.ports.runtime, 'fingerprint.runtimeMarkers.runtimePort.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.operatorPort, TASK10_AUTHORITY.ports.operator, 'fingerprint.runtimeMarkers.operatorPort.mismatch', reasons);
  checkLiteral(fingerprint.runtimeMarkers.fixturePort, TASK10_AUTHORITY.ports.fixture, 'fingerprint.runtimeMarkers.fixturePort.mismatch', reasons);

  checkNonBlank(fingerprint.toolVersions.node, 'fingerprint.toolVersions.node.blank', reasons);
  checkNonBlank(fingerprint.toolVersions.npm, 'fingerprint.toolVersions.npm.blank', reasons);
  checkNonBlank(fingerprint.toolVersions.docker, 'fingerprint.toolVersions.docker.blank', reasons);
  checkNonBlank(fingerprint.toolVersions.dockerCompose, 'fingerprint.toolVersions.dockerCompose.blank', reasons);
  checkNonBlank(fingerprint.toolVersions.postgresClient, 'fingerprint.toolVersions.postgresClient.blank', reasons);

  if (!isCanonicalUtcTimestamp(fingerprint.runStartedAt)) {
    reasons.add('fingerprint.runStartedAt.invalid');
  }

  validateMainCheckout('coreRuntime', fingerprint.checkoutProofs.coreRuntime, {
    headCommit: TASK10_AUTHORITY.coreRuntimeSha,
    lockfileSha256: TASK10_AUTHORITY.lockfileSha256.core,
  }, reasons);
  validateMainCheckout('clientValidation', fingerprint.checkoutProofs.clientValidation, {
    headCommit: TASK10_AUTHORITY.clientBaselineSha,
    lockfileSha256: TASK10_AUTHORITY.lockfileSha256.client,
  }, reasons);
  validateMainCheckout('siteValidation', fingerprint.checkoutProofs.siteValidation, {
    headCommit: TASK10_AUTHORITY.siteBaselineSha,
    lockfileSha256: TASK10_AUTHORITY.lockfileSha256.site,
  }, reasons);

  checkLiteral(fingerprint.checkoutProofs.coreEvidence.headCommit, TASK10_AUTHORITY.coreEvidencePublicationCommit, 'fingerprint.checkoutProofs.coreEvidence.headCommit.mismatch', reasons);
  checkLiteral(fingerprint.checkoutProofs.coreEvidence.branch, null, 'fingerprint.checkoutProofs.coreEvidence.branch.mismatch', reasons);
  checkLiteral(fingerprint.checkoutProofs.coreEvidence.upstreamRef, null, 'fingerprint.checkoutProofs.coreEvidence.upstreamRef.mismatch', reasons);
  checkLiteral(fingerprint.checkoutProofs.coreEvidence.detachedHead, true, 'fingerprint.checkoutProofs.coreEvidence.detachedHead.mismatch', reasons);
  checkLiteral(fingerprint.checkoutProofs.coreEvidence.porcelainStatus, 'empty', 'fingerprint.checkoutProofs.coreEvidence.porcelainStatus.mismatch', reasons);
  if (!/^[0-9a-f]{64}$/.test(fingerprint.checkoutProofs.coreEvidence.lockfileSha256)) {
    reasons.add('fingerprint.checkoutProofs.coreEvidence.lockfileSha256.invalid');
  }
}

function validateMainCheckout(
  label: 'coreRuntime' | 'clientValidation' | 'siteValidation',
  proof: Task10ClientFingerprint['checkoutProofs']['coreRuntime'],
  expected: { headCommit: string; lockfileSha256: string },
  reasons: Set<string>,
): void {
  checkLiteral(proof.headCommit, expected.headCommit, `fingerprint.checkoutProofs.${label}.headCommit.mismatch`, reasons);
  checkLiteral(proof.branch, 'main', `fingerprint.checkoutProofs.${label}.branch.mismatch`, reasons);
  checkLiteral(proof.upstreamRef, 'origin/main', `fingerprint.checkoutProofs.${label}.upstreamRef.mismatch`, reasons);
  checkLiteral(proof.detachedHead, false, `fingerprint.checkoutProofs.${label}.detachedHead.mismatch`, reasons);
  checkLiteral(proof.porcelainStatus, 'empty', `fingerprint.checkoutProofs.${label}.porcelainStatus.mismatch`, reasons);
  checkLiteral(proof.lockfileSha256, expected.lockfileSha256, `fingerprint.checkoutProofs.${label}.lockfileSha256.mismatch`, reasons);
}

function validateCommandLog(
  commandLog: Task10CommandLog,
  reasons: Set<string>,
  missingEvidence: Set<string>,
): void {
  if (typeof commandLog !== 'object' || commandLog === null || !Array.isArray(commandLog.commands)) {
    throw new Error('commandLog must be an object with commands array');
  }
  checkLiteral(commandLog.schemaVersion, 'bidvia-client-task10-command-log/v1', 'commandLog.schemaVersion.mismatch', reasons);
  checkLiteral(commandLog.attemptId, TASK10_AUTHORITY.attemptId, 'commandLog.attemptId.mismatch', reasons);

  const actualCommands = commandLog.commands.map((row) => row.command);
  const expectedCommands = [...TASK10_GATE_COMMANDS];
  const counts = new Map<string, number>();

  for (const command of actualCommands) {
    counts.set(command, (counts.get(command) ?? 0) + 1);
  }

  for (const command of expectedCommands) {
    const count = counts.get(command) ?? 0;
    if (count === 0) {
      reasons.add(`command.missing:${command}`);
      missingEvidence.add(`command:${command}`);
    }
    if (count > 1) {
      reasons.add(`command.duplicate:${command}`);
    }
  }

  for (const command of actualCommands) {
    if (!TASK10_GATE_COMMANDS.includes(command)) {
      reasons.add(`command.extra:${command}`);
    }
  }

  if (actualCommands.length !== expectedCommands.length || actualCommands.some((command, index) => command !== expectedCommands[index])) {
    reasons.add('command.order.mismatch');
  }

  let previousEndedAt: string | null = null;
  for (const row of commandLog.commands) {
    validateCommandRow(row, reasons);
    if (previousEndedAt !== null && isCanonicalUtcTimestamp(previousEndedAt) && isCanonicalUtcTimestamp(row.startedAt) && row.startedAt < previousEndedAt) {
      reasons.add(`command.globalChronology.invalid:${row.command}`);
    }
    previousEndedAt = row.endedAt;
  }
}

function validateCommandRow(row: Task10CommandRow, reasons: Set<string>): void {
  if (row.cwd !== 'frozen-client-root') {
    reasons.add(`command.cwd.invalid:${row.command}`);
  }
  if (!isCanonicalUtcTimestamp(row.startedAt)) {
    reasons.add(`command.timestamp.invalid:${row.command}`);
  }
  if (!isCanonicalUtcTimestamp(row.endedAt)) {
    reasons.add(`command.timestamp.invalid:${row.command}`);
  }
  if (isCanonicalUtcTimestamp(row.startedAt) && isCanonicalUtcTimestamp(row.endedAt) && row.endedAt < row.startedAt) {
    reasons.add(`command.timestamp.order:${row.command}`);
  }

  if (row.status === 'executed') {
    if (row.exitCode !== 0) {
      reasons.add(`command.${row.command}.exitCode.${String(row.exitCode)}`);
    }
    if (row.skippedDueTo !== null) {
      reasons.add(`command.${row.command}.executed.skippedDueTo.invalid`);
    }
    return;
  }

  if (row.status === 'skipped') {
    reasons.add(`command.${row.command}.skipped:${row.skippedDueTo ?? 'unknown'}`);
    return;
  }

  reasons.add(`command.${row.command}.status.invalid`);
}

function validateScenarioRows(
  scenarioRows: readonly Task10ScenarioRow[],
  validatedProducerEvidence: ValidatedProducerEvidence,
  reasons: Set<string>,
  missingEvidence: Set<string>,
): void {
  if (!Array.isArray(scenarioRows)) {
    throw new Error('scenarioRows must be an array');
  }
  const counts = new Map<Task10ScenarioFamily, number>();
  for (const family of TASK10_REQUIRED_SCENARIO_FAMILIES) {
    counts.set(family, 0);
  }

  let previousKey: [number, string, string] | null = null;
  for (const row of scenarioRows) {
    if (typeof row !== 'object' || row === null) {
      throw new Error('scenario row must be an object');
    }
    const familyIndex = FAMILY_ORDER.get(row.scenarioFamily);
    if (familyIndex === undefined) {
      reasons.add(`scenario.row.unknown-family:${row.request}`);
      continue;
    }

    counts.set(row.scenarioFamily, (counts.get(row.scenarioFamily) ?? 0) + 1);
    try {
      requireCompleteTask10ScenarioRow(toWireScenarioRow(row));
      validateScenarioAuthority(row, reasons);
      validateScenarioPassingRow(row, validatedProducerEvidence, reasons);
    } catch {
      reasons.add(`scenario.row.malformed:${row.request}`);
    }

    if (row.result === 'blocked') {
      if (row.reasonCodes.length === 0) {
        reasons.add(`scenario.${row.scenarioFamily}.blocked`);
      }
      for (const reason of row.reasonCodes) {
        reasons.add(`scenario.${row.scenarioFamily}.blocked:${reason}`);
      }
    }

    const currentKey: [number, string, string] = [familyIndex, row.timestamp, row.request];
    if (previousKey !== null && compareScenarioKeys(previousKey, currentKey) > 0) {
      reasons.add('scenario.order.mismatch');
    }
    previousKey = currentKey;
  }

  for (const family of TASK10_REQUIRED_SCENARIO_FAMILIES) {
    const count = counts.get(family) ?? 0;
    if (count < FAMILY_MINIMUMS[family]) {
      reasons.add(`scenario.family.${family}.undercount`);
      missingEvidence.add(`scenario-family:${family}`);
    }
  }
}

function validateScenarioAuthority(row: Task10ScenarioRow, reasons: Set<string>): void {
  const expectedAuthority = row.scenarioFamily === 'session-access' || row.scenarioFamily === 'readiness'
    ? TASK10_AUTHORITY.corePreflightUrl
    : TASK10_AUTHORITY.coreBundleUrl;
  if (row.authority !== expectedAuthority) {
    reasons.add(`scenario.${row.scenarioFamily}.authority.mismatch`);
  }
}

function validateScenarioPassingRow(
  row: Task10ScenarioRow,
  validatedProducerEvidence: ValidatedProducerEvidence,
  reasons: Set<string>,
): void {
  if (row.result !== 'passed') {
    return;
  }

  if (row.reasonCodes.length === 0) {
    reasons.add(`scenario.${row.scenarioFamily}.passed.reasonCodes.empty`);
  }
  if (!isCanonicalUtcTimestamp(row.timestamp)) {
    reasons.add(`scenario.${row.scenarioFamily}.timestamp.invalid`);
  }
  if (row.evidenceRefs.length === 0) {
    reasons.add(`scenario.${row.scenarioFamily}.evidenceRefs.empty`);
  }
  if (!isSortedUnique(row.evidenceRefs) || row.evidenceRefs.some((ref) => !isAllowedScenarioEvidenceRef(ref))) {
    reasons.add(`scenario.${row.scenarioFamily}.evidenceRefs.invalid`);
  }
  if (row.privateEvidenceHandles.length === 0 || row.privateEvidenceAttestations.length === 0) {
    reasons.add(`scenario.${row.scenarioFamily}.privateEvidence.empty`);
    return;
  }
  if (!isSortedUnique(row.privateEvidenceHandles) || row.privateEvidenceHandles.length !== row.privateEvidenceAttestations.length) {
    reasons.add(`scenario.${row.scenarioFamily}.privateEvidence.invalid`);
    return;
  }

  const expectedSourceClass = getExpectedScenarioSourceClass(row.scenarioFamily, row.proofClass, reasons);
  if (expectedSourceClass === null) {
    return;
  }

  for (let index = 0; index < row.privateEvidenceHandles.length; index += 1) {
    const handle = row.privateEvidenceHandles[index]!;
    const attestation = row.privateEvidenceAttestations[index]!;
    if (!/^sha256:[0-9a-f]{64}$/.test(handle) || attestation.handle !== handle || attestation.verified !== true) {
      reasons.add(`scenario.${row.scenarioFamily}.privateEvidence.invalid`);
      continue;
    }
    if (!isCanonicalUtcTimestamp(attestation.verifiedAt)) {
      reasons.add(`scenario.${row.scenarioFamily}.attestation.verifiedAt.invalid`);
    }
    if (attestation.sourceClass !== expectedSourceClass) {
      reasons.add(`scenario.${row.scenarioFamily}.proofClass.binding.invalid`);
      continue;
    }
    const validatedGroup = validatedProducerEvidence.get(expectedSourceClass);
    const validatedAttestation = validatedGroup?.get(handle);
    if (validatedAttestation === undefined
      || validatedAttestation.handle !== attestation.handle
      || validatedAttestation.verified !== attestation.verified
      || validatedAttestation.verifiedAt !== attestation.verifiedAt) {
      reasons.add(`scenario.${row.scenarioFamily}.privateEvidence.unbound`);
    }
  }
}

function getExpectedScenarioSourceClass(
  scenarioFamily: Task10ScenarioFamily,
  proofClass: string,
  reasons: Set<string>,
): Task10PrivateEvidenceGroup['sourceClass'] | null {
  switch (proofClass) {
    case 'session-access-proof':
      if (scenarioFamily !== 'session-access') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'preflight';
    case 'readiness-runtime-proof':
      if (scenarioFamily !== 'readiness') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'runtime';
    case 'readiness-reset-proof':
      if (scenarioFamily !== 'readiness') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'reset';
    case 'dispatch-proof':
      if (scenarioFamily !== 'dispatch') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'success-001';
    case 'recovery-proof':
      if (scenarioFamily !== 'replay-recovery') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'recovery-001';
    case 'reuse-proof':
      if (scenarioFamily !== 'replay-recovery') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'success-002-reuse';
    case 'result-submission-proof':
      if (scenarioFamily !== 'result-submission') {
        reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
        return null;
      }
      return 'success-001';
    default:
      reasons.add(`scenario.${scenarioFamily}.proofClass.invalid`);
      return null;
  }
}

function validateProducerOutcome(
  producerOutcome: RunTask10CoreProducerOutcome,
  reasons: Set<string>,
  missingEvidence: Set<string>,
): ValidatedProducerEvidence {
  if (typeof producerOutcome !== 'object' || producerOutcome === null || typeof producerOutcome.status !== 'string') {
    throw new Error('producerOutcome must be an object with status');
  }
  if (producerOutcome.status === 'tooling-failure') {
    reasons.add(`producer.tooling-failure:${producerOutcome.errorCode}`);
    missingEvidence.add('producer-evidence');
    return new Map();
  }

  if (typeof producerOutcome.evidence !== 'object' || producerOutcome.evidence === null || !Array.isArray(producerOutcome.evidence.groups)) {
    throw new Error('producerOutcome.evidence.groups must be an array');
  }

  const groups = validateEvidenceGroups(producerOutcome.evidence.groups, reasons);
  if (producerOutcome.status === 'completed') {
    if (producerOutcome.evidence.groups.length === 0) {
      reasons.add('producer.completed.groups.empty');
      missingEvidence.add('producer-evidence');
    }
    for (const sourceClass of groups.keys()) {
      if (!COMPLETED_PRODUCER_GROUP_SET.has(sourceClass)) {
        reasons.add(`producer.completed.group.unexpected:${sourceClass}`);
      }
    }
    for (const sourceClass of COMPLETED_PRODUCER_GROUPS) {
      if (!groups.has(sourceClass)) {
        reasons.add(`producer.completed.group.missing:${sourceClass}`);
        missingEvidence.add(`producer-group:${sourceClass}`);
      }
    }
    return groups;
  }

  if (producerOutcome.evidence.groups.length === 0) {
    reasons.add('producer.reportable-blocked.groups.empty');
    missingEvidence.add('producer-evidence');
  }

  for (const reason of producerOutcome.reasonCodes) {
    reasons.add(`producer.reportable-blocked:${reason}`);
  }
  if (producerOutcome.reasonCodes.length === 0) {
    reasons.add('producer.reportable-blocked:missing-reason');
  }
  for (const mode of producerOutcome.affectedModes) {
    missingEvidence.add(`producer-mode:${mode}`);
  }
  for (const family of producerOutcome.affectedFamilies) {
    missingEvidence.add(`producer-family:${family}`);
  }
  return groups;
}

function validateEvidenceGroups(
  groups: Task10PrivateEvidenceGroup[],
  reasons: Set<string>,
): ValidatedProducerEvidence {
  if (!Array.isArray(groups)) {
    throw new Error('producer evidence groups must be an array');
  }
  const result: ValidatedProducerEvidence = new Map();
  for (const group of groups) {
    if (typeof group !== 'object' || group === null || !Array.isArray(group.handles) || !Array.isArray(group.attestations)) {
      throw new Error('producer evidence group must contain handles and attestations arrays');
    }
    if (result.has(group.sourceClass)) {
      reasons.add(`producer.evidence.group.${group.sourceClass}.duplicate`);
      continue;
    }

    if (group.handles.length === 0 || group.attestations.length === 0) {
      reasons.add(`producer.evidence.group.${group.sourceClass}.empty`);
      continue;
    }
    if (group.handles.length !== group.attestations.length) {
      reasons.add(`producer.evidence.group.${group.sourceClass}.alignment.invalid`);
    }
    if (!isSortedUnique(group.handles)) {
      reasons.add(`producer.evidence.group.${group.sourceClass}.handles.unsorted`);
    }
    const validatedGroup = new Map<string, Task10PrivateEvidenceAttestation>();
    let groupValid = true;
    for (let index = 0; index < group.handles.length; index += 1) {
      const handle = group.handles[index]!;
      const attestation = group.attestations[index];
      if (!/^sha256:[0-9a-f]{64}$/.test(handle)) {
        reasons.add(`producer.evidence.group.${group.sourceClass}.handle.invalid`);
        groupValid = false;
      }
      if (attestation === undefined || attestation.handle !== handle) {
        reasons.add(`producer.evidence.group.${group.sourceClass}.alignment.invalid`);
        groupValid = false;
        continue;
      }
      const attestationValid = validateAttestation(group.sourceClass, attestation, reasons);
      if (!attestationValid) {
        groupValid = false;
        continue;
      }
      validatedGroup.set(handle, attestation);
    }
    if (groupValid && validatedGroup.size === group.handles.length && isSortedUnique(group.handles) && group.handles.length === group.attestations.length) {
      result.set(group.sourceClass, validatedGroup);
    }
  }
  return result;
}

function validateAttestation(
  sourceClass: Task10PrivateEvidenceGroup['sourceClass'],
  attestation: Task10PrivateEvidenceAttestation,
  reasons: Set<string>,
): boolean {
  let valid = true;
  if (attestation.sourceClass !== sourceClass) {
    reasons.add(`producer.evidence.group.${sourceClass}.attestationSourceClass.mismatch`);
    valid = false;
  }
  if (attestation.verified !== true) {
    reasons.add(`producer.evidence.group.${sourceClass}.verified.invalid`);
    valid = false;
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(attestation.handle)) {
    reasons.add(`producer.evidence.group.${sourceClass}.attestationHandle.invalid`);
    valid = false;
  }
  if (!isCanonicalUtcTimestamp(attestation.verifiedAt)) {
    reasons.add(`producer.evidence.group.${sourceClass}.verifiedAt.invalid`);
    valid = false;
  }
  return valid;
}

function toWireScenarioRow(row: Task10ScenarioRow) {
  return {
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
  };
}

function compareScenarioKeys(left: [number, string, string], right: [number, string, string]): number {
  return left[0] - right[0] || compareCodeUnits(left[1], right[1]) || compareCodeUnits(left[2], right[2]);
}

function checkLiteral<T>(actual: T, expected: T, reason: string, reasons: Set<string>): void {
  if (actual !== expected) {
    reasons.add(reason);
  }
}

function checkNonBlank(value: string, reason: string, reasons: Set<string>): void {
  if (value.trim().length === 0) {
    reasons.add(reason);
  }
}

function isCanonicalUtcTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isSortedUnique(values: readonly string[]): boolean {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] === values[index]) {
      return false;
    }
    if (compareCodeUnits(values[index - 1]!, values[index]!) > 0) {
      return false;
    }
  }
  return true;
}

function sortUniqueStrings(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareCodeUnits);
}

function normalizeStringArray(
  value: unknown,
  invalidReason: string,
  reasons: Set<string>,
): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    reasons.add(invalidReason);
    return [];
  }
  return [...value];
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isAllowedScenarioEvidenceRef(value: string): boolean {
  return value === TASK10_AUTHORITY.coreHandoffRunbookUrl
    || value === TASK10_AUTHORITY.corePreflightUrl
    || value === TASK10_AUTHORITY.coreBundleUrl;
}
