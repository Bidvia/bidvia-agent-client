import { TASK10_AUTHORITY, TASK10_REQUIRED_SCENARIO_FAMILIES, requireCompleteTask10ScenarioRow } from './contracts.js';
import type { Task10PrivateEvidenceAttestation, Task10ScenarioFamily, Task10ScenarioRow, Task10ScenarioRowWire } from './contracts.js';
import type {
  RunTask10CoreProducerCompletedOutcome,
  RunTask10CoreProducerReportableBlockedOutcome,
  Task10PrivateEvidenceGroup,
} from './core-producer-adapter.js';

type ProducerOutcome = RunTask10CoreProducerCompletedOutcome | RunTask10CoreProducerReportableBlockedOutcome;
type EvidenceSourceClass = Task10PrivateEvidenceGroup['sourceClass'];
type CanonicalEvidenceRef =
  | typeof TASK10_AUTHORITY.coreHandoffRunbookUrl
  | typeof TASK10_AUTHORITY.corePreflightUrl
  | typeof TASK10_AUTHORITY.coreBundleUrl;

const GROUP_PROGRESS_ORDER: readonly EvidenceSourceClass[] = [
  'runtime',
  'reset',
  'preflight',
  'success-001',
  'recovery-001',
  'success-002-reuse',
  'producer-contract-probe',
];

const FAMILY_ORDER: readonly Task10ScenarioFamily[] = TASK10_REQUIRED_SCENARIO_FAMILIES;

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export interface SanitizedProducerScenarioFact {
  tenantRef: string;
  actorRef: string;
  companyRef: string;
  authorityRef: typeof TASK10_AUTHORITY.coreBundleUrl;
  requestId: string;
  sourceObjectRef: string;
  targetObjectRef: string;
  proofClass: string;
  evidenceRefs: CanonicalEvidenceRef[];
  occurredAt: string;
}

export interface SanitizedRunIdentity {
  tenant: string;
  actor: string;
  company: string;
  request: string;
  sourceObject: string;
  targetObject: string;
  timestamp: string;
  proofClass: string;
}

export interface SanitizedPreflightReport {
  requestId: string;
  sourceObjectRef: string;
  targetObjectRef: string;
  proofClass: string;
  occurredAt: string;
  identityMatched: boolean;
  evidenceRefs: CanonicalEvidenceRef[];
}

export interface SanitizedRuntimeReport {
  requestId: string;
  sourceObjectRef: string;
  targetObjectRef: string;
  proofClass: string;
  occurredAt: string;
  identityMatched: boolean;
  evidenceRefs: CanonicalEvidenceRef[];
}

export interface SanitizedResetReport {
  requestId: string;
  sourceObjectRef: string;
  targetObjectRef: string;
  proofClass: string;
  occurredAt: string;
  resetState: 'passed' | 'failed' | 'ambiguous';
  freshBusinessIds: boolean;
  schemaColumnsComplete: boolean;
  evidenceRefs: CanonicalEvidenceRef[];
}

export interface SanitizedDispatchSuccessReport {
  dispatchScenarioFact: SanitizedProducerScenarioFact;
  resultSubmissionScenarioFact: SanitizedProducerScenarioFact;
  readbackPersisted: boolean;
  providerProofRef: string | null;
  providerReceiptRef: string | null;
  providerReceiptPersisted: boolean;
}

export interface SanitizedRecoveryReport {
  scenarioFact: SanitizedProducerScenarioFact;
  hasRecoveryLineage: boolean;
}

export interface SanitizedReplayReuseReport {
  scenarioFact: SanitizedProducerScenarioFact;
  isDistinctReuse: boolean;
}

export interface BuildTask10ScenarioRowsInput {
  producerOutcome: ProducerOutcome;
  runIdentity: SanitizedRunIdentity;
  preflight?: SanitizedPreflightReport;
  runtime?: SanitizedRuntimeReport;
  reset?: SanitizedResetReport;
  success001?: SanitizedDispatchSuccessReport;
  recovery001?: SanitizedRecoveryReport;
  success002Reuse?: SanitizedReplayReuseReport;
}

type NormalizedEvidenceGroup = {
  sourceClass: EvidenceSourceClass;
  handles: Array<`sha256:${string}`>;
  attestations: Task10PrivateEvidenceAttestation[];
};

type ScenarioRowContext = {
  evidenceGroups: Map<EvidenceSourceClass, NormalizedEvidenceGroup>;
  fallbackGroup: NormalizedEvidenceGroup;
  producerReasons: string[];
  producerBlocked: boolean;
  affectedFamilies: Set<Task10ScenarioFamily>;
};

export function buildSessionAccessRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const context = createScenarioRowContext(input);
  const preflight = input.preflight;
  const blockedReasons = [] as string[];
  const evidenceGroup = pickEvidenceGroup(context, 'preflight');

  if (preflight === undefined) {
    blockedReasons.push(context.producerBlocked ? 'unexecuted-session-access' : 'missing-preflight-report');
  } else if (!preflight.identityMatched) {
    blockedReasons.push('identity-disagreement');
  }
  if (!context.evidenceGroups.has('preflight')) {
    blockedReasons.push(context.producerBlocked ? 'unexecuted-preflight-evidence' : 'missing-preflight-evidence');
  }
  if (shouldApplyProducerReasons(context, 'session-access', blockedReasons.length > 0)) {
    blockedReasons.push(...context.producerReasons);
  }

  const row: Task10ScenarioRow = {
    scenarioFamily: 'session-access',
    tenant: input.runIdentity.tenant,
    actor: input.runIdentity.actor,
    company: input.runIdentity.company,
    authority: TASK10_AUTHORITY.corePreflightUrl,
    request: preflight?.requestId ?? input.runIdentity.request,
    sourceObject: preflight?.sourceObjectRef ?? input.runIdentity.sourceObject,
    targetObject: preflight?.targetObjectRef ?? input.runIdentity.targetObject,
    proofClass: preflight?.proofClass ?? input.runIdentity.proofClass,
    evidenceRefs: preflight?.evidenceRefs ? sortUniqueEvidenceRefs(preflight.evidenceRefs) : [TASK10_AUTHORITY.corePreflightUrl],
    privateEvidenceHandles: [...evidenceGroup.handles],
    privateEvidenceAttestations: evidenceGroup.attestations.map(copyAttestation),
    result: blockedReasons.length === 0 ? 'passed' : 'blocked',
    timestamp: preflight?.occurredAt ?? input.runIdentity.timestamp,
    reasonCodes: blockedReasons.length === 0 ? ['authority-identity-match'] : sortUniqueStrings(blockedReasons),
  };

  return finalizeRows([row]);
}

export function buildReadinessRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const context = createScenarioRowContext(input);
  const runtimeGroup = pickEvidenceGroup(context, 'runtime');
  const resetGroup = pickEvidenceGroup(context, 'reset');

  const runtimeReasons = [] as string[];
  if (input.runtime === undefined) {
    runtimeReasons.push(context.producerBlocked ? 'unexecuted-runtime-readiness' : 'missing-runtime-report');
  } else if (!input.runtime.identityMatched) {
    runtimeReasons.push('failed-runtime-identity');
  }
  if (!context.evidenceGroups.has('runtime')) {
    runtimeReasons.push(context.producerBlocked ? 'unexecuted-runtime-evidence' : 'missing-runtime-evidence');
  }
  if (shouldApplyProducerReasons(context, 'readiness', runtimeReasons.length > 0)) {
    runtimeReasons.push(...context.producerReasons);
  }

  const resetReasons = [] as string[];
  if (input.reset === undefined) {
    resetReasons.push(context.producerBlocked ? 'unexecuted-reset-readiness' : 'missing-reset-report');
  } else if (input.reset.resetState !== 'passed' || !input.reset.freshBusinessIds || !input.reset.schemaColumnsComplete) {
    resetReasons.push('stale-reset');
  }
  if (!context.evidenceGroups.has('reset')) {
    resetReasons.push(context.producerBlocked ? 'unexecuted-reset-evidence' : 'missing-reset-evidence');
  }
  if (shouldApplyProducerReasons(context, 'readiness', resetReasons.length > 0)) {
    resetReasons.push(...context.producerReasons);
  }

  const rows: Task10ScenarioRow[] = [
    {
      scenarioFamily: 'readiness',
      tenant: input.runIdentity.tenant,
      actor: input.runIdentity.actor,
      company: input.runIdentity.company,
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: input.runtime?.requestId ?? 'GET /readyz request:readiness:001',
      sourceObject: input.runtime?.sourceObjectRef ?? 'runtime-readyz',
      targetObject: input.runtime?.targetObjectRef ?? 'runtime-identity-check',
      proofClass: input.runtime?.proofClass ?? 'readiness-runtime-proof',
      evidenceRefs: input.runtime?.evidenceRefs ? sortUniqueEvidenceRefs(input.runtime.evidenceRefs) : [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [...runtimeGroup.handles],
      privateEvidenceAttestations: runtimeGroup.attestations.map(copyAttestation),
      result: runtimeReasons.length === 0 ? 'passed' : 'blocked',
      timestamp: input.runtime?.occurredAt ?? input.runIdentity.timestamp,
      reasonCodes: runtimeReasons.length === 0 ? ['readyz-markers-match'] : sortUniqueStrings(runtimeReasons),
    },
    {
      scenarioFamily: 'readiness',
      tenant: input.runIdentity.tenant,
      actor: input.runIdentity.actor,
      company: input.runIdentity.company,
      authority: TASK10_AUTHORITY.corePreflightUrl,
      request: input.reset?.requestId ?? 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
      sourceObject: input.reset?.sourceObjectRef ?? 'reset-freshness-inspection',
      targetObject: input.reset?.targetObjectRef ?? 'reset-proof',
      proofClass: input.reset?.proofClass ?? 'readiness-reset-proof',
      evidenceRefs: input.reset?.evidenceRefs ? sortUniqueEvidenceRefs(input.reset.evidenceRefs) : [TASK10_AUTHORITY.corePreflightUrl],
      privateEvidenceHandles: [...resetGroup.handles],
      privateEvidenceAttestations: resetGroup.attestations.map(copyAttestation),
      result: resetReasons.length === 0 ? 'passed' : 'blocked',
      timestamp: input.reset?.occurredAt ?? input.runIdentity.timestamp,
      reasonCodes: resetReasons.length === 0 ? ['reset-schema-ready'] : sortUniqueStrings(resetReasons),
    },
  ];

  return finalizeRows(rows);
}

export function buildDispatchRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const context = createScenarioRowContext(input);
  const success = input.success001;
  const evidenceGroup = pickEvidenceGroup(context, 'success-001');
  const reasons = [] as string[];
  const fact = success?.dispatchScenarioFact;

  if (success === undefined) {
    reasons.push(context.producerBlocked ? 'unexecuted-success-001' : 'missing-success-001-report');
  } else {
    reasons.push(...collectIdentityDisagreementReasons(input.runIdentity, success.dispatchScenarioFact));
    if (!success.readbackPersisted) {
      reasons.push('dispatch-without-persisted-readback');
    }
  }
  if (!context.evidenceGroups.has('success-001')) {
    reasons.push(context.producerBlocked ? 'unexecuted-success-001-evidence' : 'missing-success-001-evidence');
  }
  if (shouldApplyProducerReasons(context, 'dispatch', reasons.length > 0)) {
    reasons.push(...context.producerReasons);
  }

  const row: Task10ScenarioRow = {
    scenarioFamily: 'dispatch',
    tenant: fact?.tenantRef ?? input.runIdentity.tenant,
    actor: fact?.actorRef ?? input.runIdentity.actor,
    company: fact?.companyRef ?? input.runIdentity.company,
    authority: validateBundleAuthority(fact?.authorityRef),
    request: fact?.requestId ?? 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
    sourceObject: fact?.sourceObjectRef ?? 'registration-bound-dispatch',
    targetObject: fact?.targetObjectRef ?? 'persisted-dispatch-readback',
    proofClass: fact?.proofClass ?? 'dispatch-proof',
    evidenceRefs: fact?.evidenceRefs ? sortUniqueEvidenceRefs(fact.evidenceRefs) : [TASK10_AUTHORITY.coreBundleUrl],
    privateEvidenceHandles: [...evidenceGroup.handles],
    privateEvidenceAttestations: evidenceGroup.attestations.map(copyAttestation),
    result: reasons.length === 0 ? 'passed' : 'blocked',
    timestamp: fact?.occurredAt ?? input.runIdentity.timestamp,
    reasonCodes: reasons.length === 0 ? ['dispatch-readback-persisted'] : sortUniqueStrings(reasons),
  };

  return finalizeRows([row]);
}

export function buildReplayRecoveryRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const context = createScenarioRowContext(input);
  const recovery = input.recovery001;
  const reuse = input.success002Reuse;
  const recoveryGroup = pickEvidenceGroup(context, 'recovery-001');
  const reuseGroup = pickEvidenceGroup(context, 'success-002-reuse');

  const recoveryReasons = [] as string[];
  if (recovery === undefined) {
    recoveryReasons.push(context.producerBlocked ? 'unexecuted-recovery-001' : 'missing-recovery-001-report');
  } else {
    recoveryReasons.push(...collectIdentityDisagreementReasons(input.runIdentity, recovery.scenarioFact));
    if (!recovery.hasRecoveryLineage) {
      recoveryReasons.push('missing-recovery-lineage');
    }
  }
  if (!context.evidenceGroups.has('recovery-001')) {
    recoveryReasons.push(context.producerBlocked ? 'unexecuted-recovery-001-evidence' : 'missing-recovery-001-evidence');
  }
  if (shouldApplyProducerReasons(context, 'replay-recovery', recoveryReasons.length > 0)) {
    recoveryReasons.push(...context.producerReasons);
  }

  const reuseReasons = [] as string[];
  if (reuse === undefined) {
    reuseReasons.push(context.producerBlocked ? 'unexecuted-success-002-reuse' : 'missing-success-002-reuse-report');
  } else {
    reuseReasons.push(...collectIdentityDisagreementReasons(input.runIdentity, reuse.scenarioFact));
    if (!reuse.isDistinctReuse) {
      reuseReasons.push('duplicate-reuse-truth');
    }
  }
  if (!context.evidenceGroups.has('success-002-reuse')) {
    reuseReasons.push(context.producerBlocked ? 'unexecuted-success-002-reuse-evidence' : 'missing-success-002-reuse-evidence');
  }
  if (shouldApplyProducerReasons(context, 'replay-recovery', reuseReasons.length > 0)) {
    reuseReasons.push(...context.producerReasons);
  }

  const rows: Task10ScenarioRow[] = [
    {
      scenarioFamily: 'replay-recovery',
      tenant: recovery?.scenarioFact.tenantRef ?? input.runIdentity.tenant,
      actor: recovery?.scenarioFact.actorRef ?? input.runIdentity.actor,
      company: recovery?.scenarioFact.companyRef ?? input.runIdentity.company,
      authority: validateBundleAuthority(recovery?.scenarioFact.authorityRef),
      request: recovery?.scenarioFact.requestId ?? 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001',
      sourceObject: recovery?.scenarioFact.sourceObjectRef ?? 'rollback-request',
      targetObject: recovery?.scenarioFact.targetObjectRef ?? 'recovery-lineage',
      proofClass: recovery?.scenarioFact.proofClass ?? 'recovery-proof',
      evidenceRefs: recovery?.scenarioFact.evidenceRefs ? sortUniqueEvidenceRefs(recovery.scenarioFact.evidenceRefs) : [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [...recoveryGroup.handles],
      privateEvidenceAttestations: recoveryGroup.attestations.map(copyAttestation),
      result: recoveryReasons.length === 0 ? 'passed' : 'blocked',
      timestamp: recovery?.scenarioFact.occurredAt ?? input.runIdentity.timestamp,
      reasonCodes: recoveryReasons.length === 0 ? ['recovery-lineage-present'] : sortUniqueStrings(recoveryReasons),
    },
    {
      scenarioFamily: 'replay-recovery',
      tenant: reuse?.scenarioFact.tenantRef ?? input.runIdentity.tenant,
      actor: reuse?.scenarioFact.actorRef ?? input.runIdentity.actor,
      company: reuse?.scenarioFact.companyRef ?? input.runIdentity.company,
      authority: validateBundleAuthority(reuse?.scenarioFact.authorityRef),
      request: reuse?.scenarioFact.requestId ?? 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002',
      sourceObject: reuse?.scenarioFact.sourceObjectRef ?? 'reuse-readback',
      targetObject: reuse?.scenarioFact.targetObjectRef ?? 'distinct-current-execution-ids',
      proofClass: reuse?.scenarioFact.proofClass ?? 'reuse-proof',
      evidenceRefs: reuse?.scenarioFact.evidenceRefs ? sortUniqueEvidenceRefs(reuse.scenarioFact.evidenceRefs) : [TASK10_AUTHORITY.coreBundleUrl],
      privateEvidenceHandles: [...reuseGroup.handles],
      privateEvidenceAttestations: reuseGroup.attestations.map(copyAttestation),
      result: reuseReasons.length === 0 ? 'passed' : 'blocked',
      timestamp: reuse?.scenarioFact.occurredAt ?? input.runIdentity.timestamp,
      reasonCodes: reuseReasons.length === 0 ? ['distinct-reuse-truth'] : sortUniqueStrings(reuseReasons),
    },
  ];

  return finalizeRows(rows);
}

export function buildResultSubmissionRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const context = createScenarioRowContext(input);
  const success = input.success001;
  const evidenceGroup = pickEvidenceGroup(context, 'success-001');
  const reasons = [] as string[];
  const fact = success?.resultSubmissionScenarioFact;

  if (success === undefined) {
    reasons.push(context.producerBlocked ? 'unexecuted-result-submission' : 'missing-success-001-report');
  } else {
    reasons.push(...collectIdentityDisagreementReasons(input.runIdentity, success.resultSubmissionScenarioFact));
    if (!isNonBlankString(success.providerProofRef) || !isNonBlankString(success.providerReceiptRef) || !success.providerReceiptPersisted) {
      reasons.push('missing-provider-proof-or-receipt-refs');
    }
  }
  if (!context.evidenceGroups.has('success-001')) {
    reasons.push(context.producerBlocked ? 'unexecuted-success-001-evidence' : 'missing-success-001-evidence');
  }
  if (shouldApplyProducerReasons(context, 'result-submission', reasons.length > 0)) {
    reasons.push(...context.producerReasons);
  }

  const row: Task10ScenarioRow = {
    scenarioFamily: 'result-submission',
    tenant: fact?.tenantRef ?? input.runIdentity.tenant,
    actor: fact?.actorRef ?? input.runIdentity.actor,
    company: fact?.companyRef ?? input.runIdentity.company,
    authority: validateBundleAuthority(fact?.authorityRef),
    request: fact?.requestId ?? 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
    sourceObject: fact?.sourceObjectRef ?? 'commercial-action-execution',
    targetObject: fact?.targetObjectRef ?? 'provider-receipt-evidence',
    proofClass: fact?.proofClass ?? 'result-submission-proof',
    evidenceRefs: fact?.evidenceRefs ? sortUniqueEvidenceRefs(fact.evidenceRefs) : [TASK10_AUTHORITY.coreBundleUrl],
    privateEvidenceHandles: [...evidenceGroup.handles],
    privateEvidenceAttestations: evidenceGroup.attestations.map(copyAttestation),
    result: reasons.length === 0 ? 'passed' : 'blocked',
    timestamp: fact?.occurredAt ?? input.runIdentity.timestamp,
    reasonCodes: reasons.length === 0 ? ['provider-proof-and-receipt-present'] : sortUniqueStrings(reasons),
  };

  return finalizeRows([row]);
}

export function buildTask10ScenarioRows(input: BuildTask10ScenarioRowsInput): Task10ScenarioRow[] {
  const rows = [
    ...buildSessionAccessRows(input),
    ...buildReadinessRows(input),
    ...buildDispatchRows(input),
    ...buildReplayRecoveryRows(input),
    ...buildResultSubmissionRows(input),
  ];
  return finalizeRows(rows);
}

function createScenarioRowContext(input: BuildTask10ScenarioRowsInput): ScenarioRowContext {
  validateNoSensitiveContent(input, 'input');
  validateInputTimestamps(input);
  const evidenceGroups = normalizeEvidenceGroups(input.producerOutcome.evidence.groups);
  const fallbackGroup = pickFallbackGroup(evidenceGroups);
  return {
    evidenceGroups,
    fallbackGroup,
    producerBlocked: input.producerOutcome.status === 'reportable-blocked',
    affectedFamilies: new Set(input.producerOutcome.status === 'reportable-blocked' ? input.producerOutcome.affectedFamilies : []),
    producerReasons: input.producerOutcome.status === 'reportable-blocked'
      ? sortUniqueStrings([...input.producerOutcome.reasonCodes])
      : [],
  };
}

function validateInputTimestamps(input: BuildTask10ScenarioRowsInput): void {
  validateIsoUtcTimestamp(input.runIdentity.timestamp, 'input.runIdentity.timestamp');
  if (input.preflight !== undefined) {
    validateIsoUtcTimestamp(input.preflight.occurredAt, 'input.preflight.occurredAt');
  }
  if (input.runtime !== undefined) {
    validateIsoUtcTimestamp(input.runtime.occurredAt, 'input.runtime.occurredAt');
  }
  if (input.reset !== undefined) {
    validateIsoUtcTimestamp(input.reset.occurredAt, 'input.reset.occurredAt');
  }
  if (input.success001 !== undefined) {
    validateIsoUtcTimestamp(input.success001.dispatchScenarioFact.occurredAt, 'input.success001.dispatchScenarioFact.occurredAt');
    validateIsoUtcTimestamp(input.success001.resultSubmissionScenarioFact.occurredAt, 'input.success001.resultSubmissionScenarioFact.occurredAt');
  }
  if (input.recovery001 !== undefined) {
    validateIsoUtcTimestamp(input.recovery001.scenarioFact.occurredAt, 'input.recovery001.scenarioFact.occurredAt');
  }
  if (input.success002Reuse !== undefined) {
    validateIsoUtcTimestamp(input.success002Reuse.scenarioFact.occurredAt, 'input.success002Reuse.scenarioFact.occurredAt');
  }
}

function finalizeRows(rows: Task10ScenarioRow[]): Task10ScenarioRow[] {
  const normalizedRows: Task10ScenarioRow[] = rows.map((row): Task10ScenarioRow => ({
    ...row,
    evidenceRefs: sortUniqueEvidenceRefs(row.evidenceRefs),
    privateEvidenceHandles: sortUniqueStrings([...row.privateEvidenceHandles]) as Array<`sha256:${string}`>,
    privateEvidenceAttestations: sortAttestationsByHandle(row.privateEvidenceAttestations),
    reasonCodes: sortUniqueStrings(row.reasonCodes),
  }));
  for (const row of normalizedRows) {
    validateIsoUtcTimestamp(row.timestamp, `row.${row.scenarioFamily}.timestamp`);
  }
  normalizedRows.sort((left, right) => {
    return FAMILY_ORDER.indexOf(left.scenarioFamily) - FAMILY_ORDER.indexOf(right.scenarioFamily)
      || compareCodeUnits(left.timestamp, right.timestamp)
      || compareCodeUnits(left.request, right.request);
  });
  for (const row of normalizedRows) {
    requireCompleteTask10ScenarioRow(toWireRow(row));
  }
  validateNoSensitiveContent(normalizedRows, 'rows');
  return normalizedRows;
}

function shouldApplyProducerReasons(context: ScenarioRowContext, family: Task10ScenarioFamily, alreadyBlocked: boolean): boolean {
  if (!context.producerBlocked) {
    return false;
  }
  return context.affectedFamilies.has(family) || alreadyBlocked;
}

function pickEvidenceGroup(context: ScenarioRowContext, preferred: EvidenceSourceClass): NormalizedEvidenceGroup {
  return context.evidenceGroups.get(preferred) ?? context.fallbackGroup;
}

function pickFallbackGroup(groups: Map<EvidenceSourceClass, NormalizedEvidenceGroup>): NormalizedEvidenceGroup {
  const contractProbeGroup = groups.get('producer-contract-probe');
  if (contractProbeGroup !== undefined) {
    return contractProbeGroup;
  }
  for (let index = GROUP_PROGRESS_ORDER.length - 1; index >= 0; index -= 1) {
    const candidate = groups.get(GROUP_PROGRESS_ORDER[index]!);
    if (candidate !== undefined) {
      return candidate;
    }
  }
  throw new Error('producerOutcome.evidence.groups must contain at least one validated evidence group');
}

function normalizeEvidenceGroups(groups: Task10PrivateEvidenceGroup[]): Map<EvidenceSourceClass, NormalizedEvidenceGroup> {
  const normalized = new Map<EvidenceSourceClass, NormalizedEvidenceGroup>();
  for (const group of groups) {
    if (normalized.has(group.sourceClass)) {
      throw new Error(`producerOutcome.evidence.groups contains duplicate sourceClass: ${group.sourceClass}`);
    }
    if (group.handles.length === 0 || group.attestations.length === 0) {
      throw new Error(`producerOutcome.evidence.groups.${group.sourceClass} must include at least one handle and attestation`);
    }
    const paired = group.attestations.map((attestation, index) => ({
      attestation,
      handle: group.handles[index],
    }));
    if (group.handles.length !== group.attestations.length) {
      throw new Error(`producerOutcome.evidence.groups.${group.sourceClass} must align handles and attestations one-to-one`);
    }
    for (const entry of paired) {
      if (entry.handle === undefined || entry.attestation.handle !== entry.handle) {
        throw new Error(`producerOutcome.evidence.groups.${group.sourceClass} attestations must align one-to-one with handles`);
      }
      validateHandle(entry.handle, `producerOutcome.evidence.groups.${group.sourceClass}.handles`);
      if (entry.attestation.sourceClass !== group.sourceClass) {
        throw new Error(`producerOutcome.evidence.groups.${group.sourceClass} attestation sourceClass must match the group`);
      }
      if (entry.attestation.verified !== true) {
        throw new Error(`producerOutcome.evidence.groups.${group.sourceClass} attestation verified must remain true`);
      }
      validateIsoUtcTimestamp(entry.attestation.verifiedAt, `producerOutcome.evidence.groups.${group.sourceClass}.verifiedAt`);
    }
    paired.sort((left, right) => compareCodeUnits(left.handle, right.handle));
    const handles = paired.map((entry) => entry.handle!);
    assertUniqueSortedStrings(handles, `producerOutcome.evidence.groups.${group.sourceClass}.handles`);
    normalized.set(group.sourceClass, {
      sourceClass: group.sourceClass,
      handles,
      attestations: paired.map((entry) => copyAttestation(entry.attestation)),
    });
  }
  return normalized;
}

function collectIdentityDisagreementReasons(runIdentity: SanitizedRunIdentity, fact: SanitizedProducerScenarioFact): string[] {
  const reasons = [] as string[];
  if (fact.tenantRef !== runIdentity.tenant || fact.actorRef !== runIdentity.actor || fact.companyRef !== runIdentity.company) {
    reasons.push('identity-disagreement');
  }
  return reasons;
}

function validateBundleAuthority(authorityRef: string | undefined): typeof TASK10_AUTHORITY.coreBundleUrl {
  if (authorityRef !== undefined && authorityRef !== TASK10_AUTHORITY.coreBundleUrl) {
    throw new Error('dispatch, replay-recovery, and result-submission rows must use TASK10_AUTHORITY.coreBundleUrl');
  }
  return TASK10_AUTHORITY.coreBundleUrl;
}

function sortUniqueEvidenceRefs(value: readonly string[]): CanonicalEvidenceRef[] {
  const refs = sortUniqueStrings([...value]);
  if (refs.length === 0) {
    throw new Error('evidenceRefs must contain at least one immutable authority ref');
  }
  for (const ref of refs) {
    if (!isAllowedEvidenceRef(ref)) {
      throw new Error(`evidenceRefs contains unsupported publication ref: ${ref}`);
    }
  }
  return refs as CanonicalEvidenceRef[];
}

function sortAttestationsByHandle(attestations: Task10PrivateEvidenceAttestation[]): Task10PrivateEvidenceAttestation[] {
  const copied = attestations.map(copyAttestation);
  copied.sort((left, right) => compareCodeUnits(left.handle, right.handle));
  return copied;
}

function copyAttestation(attestation: Task10PrivateEvidenceAttestation): Task10PrivateEvidenceAttestation {
  validateHandle(attestation.handle, 'attestation.handle');
  validateIsoUtcTimestamp(attestation.verifiedAt, 'attestation.verifiedAt');
  if (attestation.verified !== true) {
    throw new Error('attestation.verified must remain literal true');
  }
  return {
    handle: attestation.handle,
    sourceClass: attestation.sourceClass,
    verified: attestation.verified,
    verifiedAt: attestation.verifiedAt,
  };
}

function sortUniqueStrings(values: string[]): string[] {
  const sorted = [...new Set(values)].sort(compareCodeUnits);
  return sorted;
}

function assertUniqueSortedStrings(values: string[], fieldName: string): void {
  for (let index = 1; index < values.length; index += 1) {
    if (values[index - 1] === values[index]) {
      throw new Error(`${fieldName} must not contain duplicates`);
    }
    if (compareCodeUnits(values[index - 1]!, values[index]!) > 0) {
      throw new Error(`${fieldName} must stay lexically sorted`);
    }
  }
}

function isAllowedEvidenceRef(value: string): value is CanonicalEvidenceRef {
  return value === TASK10_AUTHORITY.coreHandoffRunbookUrl
    || value === TASK10_AUTHORITY.corePreflightUrl
    || value === TASK10_AUTHORITY.coreBundleUrl;
}

function validateHandle(value: string, fieldPath: string): void {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${fieldPath} must be a sha256:<64 lowercase hex> handle`);
  }
}

function validateIsoUtcTimestamp(value: string, fieldPath: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`${fieldPath} must be a canonical ISO UTC timestamp`);
  }
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime()) || timestamp.toISOString() !== value) {
    throw new Error(`${fieldPath} must be a real canonical ISO UTC timestamp`);
  }
}

function isNonBlankString(value: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toWireRow(row: Task10ScenarioRow): Task10ScenarioRowWire {
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

function validateNoSensitiveContent(value: unknown, fieldPath: string): void {
  if (typeof value === 'string') {
    validateSafeString(value, fieldPath);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validateNoSensitiveContent(entry, `${fieldPath}[${index}]`));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, entry] of Object.entries(value)) {
      validateSafeKey(key, `${fieldPath}.${key}`);
      validateNoSensitiveContent(entry, `${fieldPath}.${key}`);
    }
  }
}

function validateSafeKey(key: string, fieldPath: string): void {
  const normalizedKey = normalizeSensitiveToken(key);
  if (endsWithSensitiveSuffix(normalizedKey, ['sessionid', 'session'])) {
    throw new Error(`${fieldPath} must not contain session identifiers`);
  }
  if (endsWithSensitiveSuffix(normalizedKey, ['token', 'secret', 'password', 'credential', 'credentialref', 'apikey'])) {
    throw new Error(`${fieldPath} must not contain secret material`);
  }
  if (isSensitiveBodyKey(normalizedKey)) {
    throw new Error(`${fieldPath} must not contain request or response bodies`);
  }
}

function validateSafeString(value: string, fieldPath: string): void {
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value)) {
    throw new Error(`${fieldPath} must not contain an email address`);
  }
  if (/(?:^|[^A-Za-z0-9_-])(session|account):[A-Za-z0-9._:-]+/i.test(value)) {
    throw new Error(`${fieldPath} must not contain generated session or account identifiers`);
  }
  if (/(?:admin[ _-]*session[ _-]*id|session[ _-]*id)/i.test(value)) {
    throw new Error(`${fieldPath} must not contain session identifier markers`);
  }
  if (/(?:password|access[ _-]*token|refresh[ _-]*token|api[ _-]*key|credential(?:[ _-]*ref)?|fixture[ _-]*secret|secret)(?:\s*[:=]|\s+is\s+|\s+value\s+|\s+set\s+to\s+)/i.test(value)) {
    throw new Error(`${fieldPath} must not contain secret material`);
  }
  if (/(?:request[ _-]*(?:body|payload)|response[ _-]*(?:body|payload)|payload)(?:\s*[:=]|\s+is\s+)/i.test(value)) {
    throw new Error(`${fieldPath} must not contain request or response body markers`);
  }
  if (isAbsoluteLocalPath(value)) {
    throw new Error(`${fieldPath} must not contain an absolute local path`);
  }
}

function normalizeSensitiveToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function endsWithSensitiveSuffix(normalizedKey: string, suffixes: readonly string[]): boolean {
  return suffixes.some((suffix) => normalizedKey.endsWith(suffix));
}

function isSensitiveBodyKey(normalizedKey: string): boolean {
  return normalizedKey === 'body'
    || normalizedKey === 'rawbody'
    || normalizedKey === 'requestdata'
    || normalizedKey === 'responsedata'
    || normalizedKey.endsWith('body')
    || normalizedKey.endsWith('payload');
}

function isAbsoluteLocalPath(value: string): boolean {
  if (value.includes('..')) {
    return true;
  }
  if (/^(?:POST|GET|PUT|PATCH|DELETE|HEAD|OPTIONS) \/(?:runtime|readyz|healthz)(?:\b|\/)/.test(value)) {
    return false;
  }
  if (/^\/runtime(?:\/[^?]*)?$/.test(value)) {
    return false;
  }
  if (value === '/readyz' || value === '/healthz') {
    return false;
  }
  return /^(?:[A-Za-z]:\\|\\\\)/.test(value)
    || value.startsWith('/');
}
