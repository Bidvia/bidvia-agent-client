import test from 'node:test';
import assert from 'node:assert/strict';

import { TASK10_AUTHORITY, buildTask10ScenarioMatrixWire, requireCompleteTask10ScenarioRow, type Task10ScenarioRow } from '../scripts/task10/contracts.ts';
import {
  buildDispatchRows,
  buildReadinessRows,
  buildReplayRecoveryRows,
  buildResultSubmissionRows,
  buildSessionAccessRows,
  buildTask10ScenarioRows,
  type BuildTask10ScenarioRowsInput,
  type SanitizedDispatchSuccessReport,
  type SanitizedPreflightReport,
  type SanitizedProducerScenarioFact,
  type SanitizedRecoveryReport,
  type SanitizedReplayReuseReport,
  type SanitizedResetReport,
  type SanitizedRunIdentity,
  type SanitizedRuntimeReport,
} from '../scripts/task10/scenario-adapter.ts';
import type {
  RunTask10CoreProducerCompletedOutcome,
  RunTask10CoreProducerReportableBlockedOutcome,
  Task10PrivateEvidenceGroup,
} from '../scripts/task10/core-producer-adapter.ts';

function buildHandle(seed: string): `sha256:${string}` {
  return `sha256:${seed.repeat(64).slice(0, 64)}`;
}

function buildEvidenceGroup(sourceClass: Task10PrivateEvidenceGroup['sourceClass'], seeds: readonly string[]): Task10PrivateEvidenceGroup {
  const handles = seeds.map((seed) => buildHandle(seed)).sort();
  return {
    sourceClass,
    handles,
    attestations: handles.map((handle, index) => ({
      handle,
      sourceClass,
      verified: true,
      verifiedAt: `2026-07-19T07:16:0${index + 1}.000Z`,
    })),
  };
}

function buildCompletedOutcome(): RunTask10CoreProducerCompletedOutcome {
  return {
    status: 'completed',
    evidence: {
      groups: [
        buildEvidenceGroup('runtime', ['2']),
        buildEvidenceGroup('reset', ['3']),
        buildEvidenceGroup('preflight', ['1', '4']),
        buildEvidenceGroup('success-001', ['5', '6', '7']),
        buildEvidenceGroup('recovery-001', ['8', '9', 'a']),
        buildEvidenceGroup('success-002-reuse', ['b', 'c', 'd']),
      ],
    },
  };
}

function buildProbeBlockedOutcome(): RunTask10CoreProducerReportableBlockedOutcome {
  return {
    status: 'reportable-blocked',
    reasonCodes: ['core-producer-private-root-contract-unsatisfied'],
    affectedModes: ['producer-contract-probe'],
    affectedFamilies: ['dispatch', 'replay-recovery', 'result-submission'],
    evidence: {
      groups: [
        buildEvidenceGroup('producer-contract-probe', ['f']),
      ],
    },
  };
}

function buildScenarioFact(overrides: Partial<SanitizedProducerScenarioFact> = {}): SanitizedProducerScenarioFact {
  return {
    tenantRef: 'tenant:task10-owner',
    actorRef: 'actor:operator-admin',
    companyRef: 'company:owner',
    authorityRef: TASK10_AUTHORITY.coreBundleUrl,
    requestId: 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
    sourceObjectRef: 'registration-bound-dispatch',
    targetObjectRef: 'persisted-dispatch-readback',
    proofClass: 'dispatch-proof',
    evidenceRefs: [TASK10_AUTHORITY.coreBundleUrl],
    occurredAt: '2026-07-19T07:16:04.000Z',
    ...overrides,
  };
}

function buildRunIdentity(overrides: Partial<SanitizedRunIdentity> = {}): SanitizedRunIdentity {
  return {
    tenant: 'tenant:task10-owner',
    actor: 'actor:operator-admin',
    company: 'company:owner',
    request: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
    sourceObject: 'admin-session-bootstrap',
    targetObject: 'rehearsal-run-identity',
    timestamp: '2026-07-19T07:16:01.000Z',
    proofClass: 'session-access-proof',
    ...overrides,
  };
}

function buildPreflightReport(overrides: Partial<SanitizedPreflightReport> = {}): SanitizedPreflightReport {
  return {
    requestId: 'POST /runtime/admin/sessions/sign-in request:session-access:001',
    sourceObjectRef: 'admin-session-bootstrap',
    targetObjectRef: 'rehearsal-run-identity',
    proofClass: 'session-access-proof',
    occurredAt: '2026-07-19T07:16:01.000Z',
    identityMatched: true,
    evidenceRefs: [TASK10_AUTHORITY.coreHandoffRunbookUrl, TASK10_AUTHORITY.corePreflightUrl].sort(),
    ...overrides,
  };
}

function buildRuntimeReport(overrides: Partial<SanitizedRuntimeReport> = {}): SanitizedRuntimeReport {
  return {
    requestId: 'GET /readyz request:readiness:001',
    sourceObjectRef: 'runtime-readyz',
    targetObjectRef: 'runtime-identity-check',
    proofClass: 'readiness-runtime-proof',
    occurredAt: '2026-07-19T07:16:02.000Z',
    identityMatched: true,
    evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    ...overrides,
  };
}

function buildResetReport(overrides: Partial<SanitizedResetReport> = {}): SanitizedResetReport {
  return {
    requestId: 'POST /runtime/rehearsals/merged-main/reset request:readiness:002',
    sourceObjectRef: 'reset-freshness-inspection',
    targetObjectRef: 'reset-proof',
    proofClass: 'readiness-reset-proof',
    occurredAt: '2026-07-19T07:16:03.000Z',
    resetState: 'passed',
    freshBusinessIds: true,
    schemaColumnsComplete: true,
    evidenceRefs: [TASK10_AUTHORITY.corePreflightUrl],
    ...overrides,
  };
}

function buildSuccessReport(overrides: Partial<SanitizedDispatchSuccessReport> = {}): SanitizedDispatchSuccessReport {
  return {
    dispatchScenarioFact: buildScenarioFact(),
    resultSubmissionScenarioFact: buildScenarioFact({
      requestId: 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
      sourceObjectRef: 'commercial-action-execution',
      targetObjectRef: 'provider-receipt-evidence',
      proofClass: 'result-submission-proof',
      occurredAt: '2026-07-19T07:16:07.000Z',
    }),
    readbackPersisted: true,
    providerProofRef: 'provider-proof:success-001',
    providerReceiptRef: 'provider-receipt:success-001',
    providerReceiptPersisted: true,
    ...overrides,
  };
}

function buildRecoveryReport(overrides: Partial<SanitizedRecoveryReport> = {}): SanitizedRecoveryReport {
  return {
    scenarioFact: buildScenarioFact({
      requestId: 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001',
      sourceObjectRef: 'rollback-request',
      targetObjectRef: 'recovery-lineage',
      proofClass: 'recovery-proof',
      occurredAt: '2026-07-19T07:16:05.000Z',
    }),
    hasRecoveryLineage: true,
    ...overrides,
  };
}

function buildReuseReport(overrides: Partial<SanitizedReplayReuseReport> = {}): SanitizedReplayReuseReport {
  return {
    scenarioFact: buildScenarioFact({
      requestId: 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002',
      sourceObjectRef: 'reuse-readback',
      targetObjectRef: 'distinct-current-execution-ids',
      proofClass: 'reuse-proof',
      occurredAt: '2026-07-19T07:16:06.000Z',
    }),
    isDistinctReuse: true,
    ...overrides,
  };
}

function buildPassingInput(overrides: Partial<BuildTask10ScenarioRowsInput> = {}): BuildTask10ScenarioRowsInput {
  return {
    producerOutcome: buildCompletedOutcome(),
    runIdentity: buildRunIdentity(),
    preflight: buildPreflightReport(),
    runtime: buildRuntimeReport(),
    reset: buildResetReport(),
    success001: buildSuccessReport(),
    recovery001: buildRecoveryReport(),
    success002Reuse: buildReuseReport(),
    ...overrides,
  };
}

function toWireRow(row: ReturnType<typeof buildTask10ScenarioRows>[number]) {
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

test('Task 10 scenario adapter exports the explicit family builders and emits the canonical seven-row passing matrix', () => {
  assert.equal(typeof buildSessionAccessRows, 'function');
  assert.equal(typeof buildReadinessRows, 'function');
  assert.equal(typeof buildDispatchRows, 'function');
  assert.equal(typeof buildReplayRecoveryRows, 'function');
  assert.equal(typeof buildResultSubmissionRows, 'function');
  assert.equal(typeof buildTask10ScenarioRows, 'function');

  const input = buildPassingInput();
  const rows = buildTask10ScenarioRows(input);

  assert.deepEqual(rows.map((row) => row.scenarioFamily), [
    'session-access',
    'readiness',
    'readiness',
    'dispatch',
    'replay-recovery',
    'replay-recovery',
    'result-submission',
  ]);
  assert.equal(rows.length, 7);
  assert.equal(rows.filter((row) => row.scenarioFamily === 'readiness').length, 2);
  assert.equal(rows.filter((row) => row.scenarioFamily === 'replay-recovery').length, 2);
  assert.ok(rows.every((row) => row.result === 'passed'));

  for (const row of rows) {
    assert.deepEqual(requireCompleteTask10ScenarioRow(toWireRow(row)), toWireRow(row));
  }

  assert.deepEqual(buildTask10ScenarioMatrixWire({
    schemaVersion: 'bidvia-client-task10-scenario-matrix/v1',
    attemptId: TASK10_AUTHORITY.attemptId,
    generatedAt: '2026-07-19T07:17:00.000Z',
    requiredFamilies: ['session-access', 'readiness', 'dispatch', 'replay-recovery', 'result-submission'],
    summary: {
      requiredFamilyCount: 5,
      rowCount: 7,
      passedCount: 7,
      blockedCount: 0,
      missingFamilies: [],
    },
    scenarios: rows,
  }).summary, {
    required_family_count: 5,
    row_count: 7,
    passed_count: 7,
    blocked_count: 0,
    missing_families: [],
  });
});

test('Task 10 scenario adapter blocks each invalid family condition without leaving the affected row passed', () => {
  const cases: Array<{
    name: string;
    input: BuildTask10ScenarioRowsInput;
    blockedRequests: string[];
    expectedReason: string;
  }> = [
    {
      name: 'identity disagreement',
      input: buildPassingInput({
        success001: buildSuccessReport({
          dispatchScenarioFact: buildScenarioFact({ companyRef: 'company:other' }),
          resultSubmissionScenarioFact: buildScenarioFact({
            companyRef: 'company:other',
            requestId: 'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
            sourceObjectRef: 'commercial-action-execution',
            targetObjectRef: 'provider-receipt-evidence',
            proofClass: 'result-submission-proof',
            occurredAt: '2026-07-19T07:16:07.000Z',
          }),
        }),
      }),
      blockedRequests: [
        'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001',
        'POST /runtime/commercial-actions/:id/execute request:result-submission:001',
      ],
      expectedReason: 'identity-disagreement',
    },
    {
      name: 'failed runtime identity',
      input: buildPassingInput({ runtime: buildRuntimeReport({ identityMatched: false }) }),
      blockedRequests: ['GET /readyz request:readiness:001'],
      expectedReason: 'failed-runtime-identity',
    },
    {
      name: 'stale reset',
      input: buildPassingInput({ reset: buildResetReport({ freshBusinessIds: false }) }),
      blockedRequests: ['POST /runtime/rehearsals/merged-main/reset request:readiness:002'],
      expectedReason: 'stale-reset',
    },
    {
      name: 'dispatch without persisted readback',
      input: buildPassingInput({ success001: buildSuccessReport({ readbackPersisted: false }) }),
      blockedRequests: ['POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001'],
      expectedReason: 'dispatch-without-persisted-readback',
    },
    {
      name: 'duplicate reuse truth',
      input: buildPassingInput({ success002Reuse: buildReuseReport({ isDistinctReuse: false }) }),
      blockedRequests: ['POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002'],
      expectedReason: 'duplicate-reuse-truth',
    },
    {
      name: 'missing recovery lineage',
      input: buildPassingInput({ recovery001: buildRecoveryReport({ hasRecoveryLineage: false }) }),
      blockedRequests: ['POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001'],
      expectedReason: 'missing-recovery-lineage',
    },
    {
      name: 'missing provider proof or receipt refs',
      input: buildPassingInput({
        success001: buildSuccessReport({ providerProofRef: null, providerReceiptRef: null }),
      }),
      blockedRequests: ['POST /runtime/commercial-actions/:id/execute request:result-submission:001'],
      expectedReason: 'missing-provider-proof-or-receipt-refs',
    },
  ];

  for (const entry of cases) {
    const rows = buildTask10ScenarioRows(entry.input);
    const blockedRows = rows.filter((row) => row.reasonCodes.includes(entry.expectedReason));
    assert.ok(blockedRows.length >= 1, entry.name);
    assert.ok(blockedRows.every((row) => row.result === 'blocked'), entry.name);
    assert.deepEqual(blockedRows.map((row) => row.request), entry.blockedRequests, entry.name);
  }
});

test('Task 10 scenario adapter emits seven complete blocked rows for reportable-blocked contract probe evidence only', () => {
  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: buildProbeBlockedOutcome(),
    preflight: undefined,
    runtime: undefined,
    reset: undefined,
    success001: undefined,
    recovery001: undefined,
    success002Reuse: undefined,
  }));

  assert.equal(rows.length, 7);
  assert.ok(rows.every((row) => row.result === 'blocked'));
  assert.ok(rows.every((row) => row.reasonCodes.includes('core-producer-private-root-contract-unsatisfied')));
  for (const row of rows) {
    assert.deepEqual(requireCompleteTask10ScenarioRow(toWireRow(row)), toWireRow(row));
  }
  assert.deepEqual(
    rows.map((row) => ({
      handles: row.privateEvidenceHandles,
      sourceClasses: row.privateEvidenceAttestations.map((attestation) => attestation.sourceClass),
    })),
    rows.map(() => ({
      handles: ['sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'],
      sourceClasses: ['producer-contract-probe'],
    })),
  );
});

test('Task 10 scenario adapter uses code-unit ordering for canonical row sorting and preserves authority-bundle structurally', () => {
  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: buildCompletedOutcome(),
    success001: buildSuccessReport({
      dispatchScenarioFact: buildScenarioFact({
        requestId: 'é-dispatch',
      }),
      resultSubmissionScenarioFact: buildScenarioFact({
        requestId: 'ß-result',
        sourceObjectRef: 'commercial-action-execution',
        targetObjectRef: 'provider-receipt-evidence',
        proofClass: 'result-submission-proof',
        occurredAt: '2026-07-19T07:16:07.000Z',
      }),
    }),
    recovery001: buildRecoveryReport({
      scenarioFact: buildScenarioFact({
        requestId: 'z-recovery',
        sourceObjectRef: 'rollback-request',
        targetObjectRef: 'recovery-lineage',
        proofClass: 'recovery-proof',
        occurredAt: '2026-07-19T07:16:05.000Z',
      }),
    }),
    success002Reuse: buildReuseReport({
      scenarioFact: buildScenarioFact({
        requestId: 'a-reuse',
        sourceObjectRef: 'reuse-readback',
        targetObjectRef: 'distinct-current-execution-ids',
        proofClass: 'reuse-proof',
        occurredAt: '2026-07-19T07:16:05.000Z',
      }),
    }),
  }));

  const orderedReplayRequests = rows.filter((row) => row.scenarioFamily === 'replay-recovery').map((row) => row.request);
  assert.deepEqual(orderedReplayRequests, ['a-reuse', 'z-recovery']);

  const authorityBundlePassedRows = rows.map((row): Task10ScenarioRow => row.scenarioFamily === 'dispatch'
    ? {
        ...row,
        privateEvidenceAttestations: [{
          ...row.privateEvidenceAttestations[0]!,
          sourceClass: 'authority-bundle',
        }],
      }
    : row);
  const dispatchRow = authorityBundlePassedRows.find((row) => row.scenarioFamily === 'dispatch');
  assert.ok(dispatchRow);
  const wireDispatchRow = toWireRow(dispatchRow);
  assert.equal(wireDispatchRow.private_handle_attestations[0]?.source_class, 'authority-bundle');
});

test('Task 10 scenario adapter rejects malformed evidence alignment and unsafe serialized values', () => {
  const badOutcome: RunTask10CoreProducerCompletedOutcome = {
    status: 'completed',
    evidence: {
      groups: [{
        sourceClass: 'preflight',
        handles: [buildHandle('1')],
        attestations: [{
          handle: buildHandle('2'),
          sourceClass: 'preflight',
          verified: true,
          verifiedAt: '2026-07-19T07:16:01.000Z',
        }],
      }],
    },
  };
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({ producerOutcome: badOutcome })), /align/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [{
          sourceClass: 'preflight',
          handles: [],
          attestations: [],
        }],
      },
    },
  })), /at least one|empty|handle/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [{
          sourceClass: 'preflight',
          handles: ['sha256:not-a-real-hash'],
          attestations: [{
            handle: 'sha256:not-a-real-hash',
            sourceClass: 'preflight',
            verified: true,
            verifiedAt: '2026-07-19T07:16:01.000Z',
          }],
        }],
      },
    },
  })), /sha256/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [{
          sourceClass: 'preflight',
          handles: [buildHandle('1')],
          attestations: [{
            handle: buildHandle('1'),
            sourceClass: 'preflight',
            verified: true,
            verifiedAt: 'not-an-iso-timestamp',
          }],
        }],
      },
    },
  })), /ISO UTC timestamp|verifiedAt/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    preflight: buildPreflightReport({ evidenceRefs: [] as never[] }),
  })), /evidenceRefs/i);
  for (const input of [
    buildPassingInput({ success001: buildSuccessReport({ providerProofRef: '', providerReceiptRef: 'provider-receipt:success-001' }) }),
    buildPassingInput({ success001: buildSuccessReport({ providerProofRef: '   ', providerReceiptRef: 'provider-receipt:success-001' }) }),
    buildPassingInput({ success001: buildSuccessReport({ providerProofRef: 'provider-proof:success-001', providerReceiptRef: '' }) }),
  ]) {
    const rows = buildTask10ScenarioRows(input);
    const resultSubmissionRow = rows.find((row) => row.scenarioFamily === 'result-submission');
    assert.ok(resultSubmissionRow);
    assert.equal(resultSubmissionRow.result, 'blocked');
    assert.ok(resultSubmissionRow.reasonCodes.includes('missing-provider-proof-or-receipt-refs'));
  }
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runIdentity: buildRunIdentity({ timestamp: '2026-02-30T07:16:01.000Z' }),
  })), /timestamp/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runtime: buildRuntimeReport({ occurredAt: '2026-07-19T07:16:02.000+08:00' as never }),
  })), /timestamp/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    preflight: buildPreflightReport({ occurredAt: '2026-07-19T07:16:01Z' as never }),
  })), /timestamp/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [{
          sourceClass: 'preflight',
          handles: [buildHandle('1')],
          attestations: [{
            handle: buildHandle('1'),
            sourceClass: 'preflight',
            verified: true,
            verifiedAt: '2026-02-30T07:16:01.000Z',
          }],
        }],
      },
    },
  })), /timestamp/i);

  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runIdentity: buildRunIdentity({ actor: 'owner@example.com' }),
  })), /email/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runIdentity: buildRunIdentity({ sourceObject: '/Users/private/output.json' }),
  })), /absolute local path/i);
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runIdentity: buildRunIdentity({ targetObject: 'session:generated-001' }),
  })), /session/i);

  const sensitivePositiveCases: Array<{ name: string; input: BuildTask10ScenarioRowsInput; pattern: RegExp }> = [
    {
      name: 'embedded account identifier',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ targetObject: 'memo account:generated-001 review' }) }),
      pattern: /account/i,
    },
    {
      name: 'session marker alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          'admin-session-id': 'session:generated-002',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /session/i,
    },
    {
      name: 'access token alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          access_token: 'secret=abc123',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /secret|token/i,
    },
    {
      name: 'client secret alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          clientSecret: 'secret=value',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /secret/i,
    },
    {
      name: 'bearer token alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          bearerToken: 'token=abc123',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /token/i,
    },
    {
      name: 'session token alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          sessionToken: 'token=abc123',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /token|session/i,
    },
    {
      name: 'admin session alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          adminSession: 'session:generated-003',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /session/i,
    },
    {
      name: 'body exact key alias',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          body: '{"hidden":true}',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /body/i,
    },
    {
      name: 'raw body alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          rawBody: '{"hidden":true}',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /body/i,
    },
    {
      name: 'request data alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          requestData: '{"hidden":true}',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /request|data/i,
    },
    {
      name: 'response data alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          responseData: '{"hidden":true}',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /response|data/i,
    },
    {
      name: 'response payload alias in key',
      input: buildPassingInput({
        runtime: {
          ...buildRuntimeReport(),
          responsePayload: '{"hidden":true}',
        } as unknown as SanitizedRuntimeReport,
      }),
      pattern: /response|payload/i,
    },
    {
      name: 'generic posix path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/usr/local/private.log' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'srv path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/srv/app/private.log' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'data path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/data/private.log' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'library path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/Library/Application Support/private.log' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'workspace path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/workspace/private.log' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'runtime traversal path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '/runtime/../../etc' }) }),
      pattern: /absolute local path|travers/i,
    },
    {
      name: 'windows path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: 'C:\\secret\\proof.txt' }) }),
      pattern: /absolute local path/i,
    },
    {
      name: 'unc path',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: '\\\\server\\share\\secret.txt' }) }),
      pattern: /absolute local path/i,
    },
  ];
  for (const entry of sensitivePositiveCases) {
    assert.throws(() => buildTask10ScenarioRows(entry.input), entry.pattern, entry.name);
  }

  const sensitiveNegativeCases: Array<{ name: string; input: BuildTask10ScenarioRowsInput }> = [
    {
      name: 'safe runtime route request',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ request: 'POST /runtime/admin/sessions/sign-in request:session-access:001' }) }),
    },
    {
      name: 'safe health route source',
      input: buildPassingInput({ runtime: buildRuntimeReport({ sourceObjectRef: '/healthz', targetObjectRef: '/readyz' }) }),
    },
    {
      name: 'benign tokenized proof wording',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ sourceObject: 'tokenized-proof-review' }) }),
    },
    {
      name: 'benign credential policy wording',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ targetObject: 'credential-policy-review' }) }),
    },
    {
      name: 'benign result submission property name',
      input: buildPassingInput({ runIdentity: buildRunIdentity({ targetObject: 'resultSubmissionScenarioFact' }) }),
    },
    {
      name: 'safe runtime route path',
      input: buildPassingInput({ runtime: buildRuntimeReport({ sourceObjectRef: '/runtime/account/agents', targetObjectRef: '/runtime/commercial-actions/execute' }) }),
    },
    {
      name: 'safe readyz path',
      input: buildPassingInput({ runtime: buildRuntimeReport({ sourceObjectRef: '/readyz' }) }),
    },
    {
      name: 'safe healthz path',
      input: buildPassingInput({ runtime: buildRuntimeReport({ targetObjectRef: '/healthz' }) }),
    },
  ];
  for (const entry of sensitiveNegativeCases) {
    assert.doesNotThrow(() => buildTask10ScenarioRows(entry.input), entry.name);
  }

  const rows = buildTask10ScenarioRows(buildPassingInput());
  const serialized = JSON.stringify(rows);
  assert.doesNotMatch(serialized, /@/);
  assert.doesNotMatch(serialized, /adminSessionId|sessionId|admin_session_id|session_id/);
  assert.doesNotMatch(serialized, /password|token|credential|fixture-secret/i);
  assert.doesNotMatch(serialized, /requestBody|responseBody|request_body|response_body/);
  assert.doesNotMatch(serialized, /"account:[^"]+"/i);
  assert.doesNotMatch(serialized, /(?:^|["\s])(?:[A-Z]:\\\\|\/Users\/|\/private\/|\/var\/|\/tmp\/)/);
});

test('Task 10 scenario adapter keeps evidence refs frozen, sorted, unique, and attestation-aligned per family builder', () => {
  const input = buildPassingInput();

  const familyRows = [
    ...buildSessionAccessRows(input),
    ...buildReadinessRows(input),
    ...buildDispatchRows(input),
    ...buildReplayRecoveryRows(input),
    ...buildResultSubmissionRows(input),
  ];

  for (const row of familyRows) {
    assert.deepEqual([...row.evidenceRefs], [...row.evidenceRefs].sort());
    assert.equal(new Set(row.evidenceRefs).size, row.evidenceRefs.length);
    assert.ok(row.evidenceRefs.every((ref) => ref === TASK10_AUTHORITY.coreHandoffRunbookUrl || ref === TASK10_AUTHORITY.corePreflightUrl || ref === TASK10_AUTHORITY.coreBundleUrl));
    assert.deepEqual([...row.privateEvidenceHandles], [...row.privateEvidenceHandles].sort());
    assert.deepEqual(
      row.privateEvidenceHandles,
      row.privateEvidenceAttestations.map((attestation) => attestation.handle),
    );
  }
});

test('Task 10 scenario adapter rejects non-allowlisted and traversal-capable evidence refs', () => {
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    success001: buildSuccessReport({
      dispatchScenarioFact: buildScenarioFact({
        evidenceRefs: ['provider-proof-terminal-client-validation-artifacts/../secret.json' as never],
      }),
    }),
  })), /unsupported publication ref|absolute local path|travers/i);

  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    success001: buildSuccessReport({
      dispatchScenarioFact: buildScenarioFact({
        evidenceRefs: ['https://example.com/not-allowlisted.json' as never],
      }),
    }),
  })), /unsupported publication ref/i);
});

test('Task 10 scenario adapter falls back to the latest actually available non-probe evidence group when the preferred group is absent', () => {
  const nonProbeBlockedOutcome: RunTask10CoreProducerReportableBlockedOutcome = {
    status: 'reportable-blocked',
    reasonCodes: ['producer-output-readback-blocked'],
    affectedModes: ['success-001'],
    affectedFamilies: ['dispatch'],
    evidence: {
      groups: [
        buildEvidenceGroup('runtime', ['2']),
        buildEvidenceGroup('reset', ['3']),
        buildEvidenceGroup('preflight', ['1', '4']),
        buildEvidenceGroup('success-001', ['5', '6', '7']),
      ],
    },
  };

  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: nonProbeBlockedOutcome,
    recovery001: undefined,
    success002Reuse: undefined,
  }));

  const blockedRecoveryRow = rows.find((row) => row.request === 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001');
  assert.ok(blockedRecoveryRow);
  assert.equal(blockedRecoveryRow.result, 'blocked');
  assert.deepEqual(blockedRecoveryRow.privateEvidenceHandles, [
    buildHandle('5'),
    buildHandle('6'),
    buildHandle('7'),
  ]);
  assert.deepEqual(
    blockedRecoveryRow.privateEvidenceAttestations.map((attestation) => [attestation.handle, attestation.sourceClass]),
    [
      [buildHandle('5'), 'success-001'],
      [buildHandle('6'), 'success-001'],
      [buildHandle('7'), 'success-001'],
    ],
  );
  assert.deepEqual(requireCompleteTask10ScenarioRow(toWireRow(blockedRecoveryRow)), toWireRow(blockedRecoveryRow));
});

test('Task 10 scenario adapter keeps blocked reason codes lexical and final row order canonical under unsorted producer reasons and mixed requests', () => {
  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'reportable-blocked',
      reasonCodes: [
        'producer-output-success-002-reuse-duplicate',
        'core-producer-private-root-contract-unsatisfied',
        'producer-output-readback-blocked',
      ],
      affectedModes: ['success-001', 'recovery-001', 'success-002-reuse'],
      affectedFamilies: ['dispatch', 'replay-recovery', 'result-submission'],
      evidence: {
        groups: buildCompletedOutcome().evidence.groups,
      },
    },
    success001: buildSuccessReport({
      dispatchScenarioFact: buildScenarioFact({
        requestId: 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:002',
        occurredAt: '2026-07-19T07:16:09.000Z',
      }),
      resultSubmissionScenarioFact: buildScenarioFact({
        requestId: 'POST /runtime/commercial-actions/:id/execute request:result-submission:002',
        sourceObjectRef: 'commercial-action-execution-z',
        targetObjectRef: 'provider-receipt-evidence-z',
        proofClass: 'result-submission-proof-z',
        occurredAt: '2026-07-19T07:16:08.000Z',
      }),
    }),
    recovery001: buildRecoveryReport({
      scenarioFact: buildScenarioFact({
        requestId: 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:009',
        sourceObjectRef: 'rollback-request-z',
        targetObjectRef: 'recovery-lineage-z',
        proofClass: 'recovery-proof-z',
        occurredAt: '2026-07-19T07:16:11.000Z',
      }),
    }),
    success002Reuse: buildReuseReport({
      scenarioFact: buildScenarioFact({
        requestId: 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:001',
        sourceObjectRef: 'reuse-readback-a',
        targetObjectRef: 'distinct-current-execution-ids-a',
        proofClass: 'reuse-proof-a',
        occurredAt: '2026-07-19T07:16:10.000Z',
      }),
    }),
  }));

  for (const row of rows.filter((entry) => entry.result === 'blocked')) {
    assert.deepEqual(row.reasonCodes, [...row.reasonCodes].sort());
  }

  assert.deepEqual(rows.map((row) => [row.scenarioFamily, row.timestamp, row.request]), [
    ['session-access', '2026-07-19T07:16:01.000Z', 'POST /runtime/admin/sessions/sign-in request:session-access:001'],
    ['readiness', '2026-07-19T07:16:02.000Z', 'GET /readyz request:readiness:001'],
    ['readiness', '2026-07-19T07:16:03.000Z', 'POST /runtime/rehearsals/merged-main/reset request:readiness:002'],
    ['dispatch', '2026-07-19T07:16:09.000Z', 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:002'],
    ['replay-recovery', '2026-07-19T07:16:10.000Z', 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:001'],
    ['replay-recovery', '2026-07-19T07:16:11.000Z', 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:009'],
    ['result-submission', '2026-07-19T07:16:08.000Z', 'POST /runtime/commercial-actions/:id/execute request:result-submission:002'],
  ]);
});

test('Task 10 scenario adapter rejects direct account identifiers and forbidden runtime key markers in sanitized input', () => {
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runIdentity: buildRunIdentity({ targetObject: 'account:generated-001' }),
  })), /account/i);

  const runtimeWithForbiddenKey = {
    ...buildRuntimeReport(),
    sessionId: 'session:generated-001',
  } as SanitizedRuntimeReport & { sessionId: string };
  assert.throws(() => buildTask10ScenarioRows(buildPassingInput({
    runtime: runtimeWithForbiddenKey as unknown as SanitizedRuntimeReport,
  })), /session identifiers|session/i);
});

test('Task 10 scenario adapter uses family-specific success facts and limits producer blocking to affected or unexecuted rows', () => {
  const blockedOutcome: RunTask10CoreProducerReportableBlockedOutcome = {
    status: 'reportable-blocked',
    reasonCodes: ['producer-output-readback-blocked'],
    affectedModes: ['success-001'],
    affectedFamilies: ['dispatch'],
    evidence: {
      groups: [
        buildEvidenceGroup('runtime', ['2']),
        buildEvidenceGroup('reset', ['3']),
        buildEvidenceGroup('preflight', ['1', '4']),
        buildEvidenceGroup('success-001', ['5', '6', '7']),
      ],
    },
  };

  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: blockedOutcome,
    recovery001: undefined,
    success002Reuse: undefined,
  }));

  assert.deepEqual(rows.map((row) => [row.scenarioFamily, row.request, row.result]), [
    ['session-access', 'POST /runtime/admin/sessions/sign-in request:session-access:001', 'passed'],
    ['readiness', 'GET /readyz request:readiness:001', 'passed'],
    ['readiness', 'POST /runtime/rehearsals/merged-main/reset request:readiness:002', 'passed'],
    ['dispatch', 'POST /runtime/agents/:registrationId/task-dispatches request:dispatch:001', 'blocked'],
    ['replay-recovery', 'POST /runtime/commercial-actions/:id/rollback request:replay-recovery:001', 'blocked'],
    ['replay-recovery', 'POST /runtime/rehearsals/merged-main/readback/:runId request:replay-recovery:002', 'blocked'],
    ['result-submission', 'POST /runtime/commercial-actions/:id/execute request:result-submission:001', 'passed'],
  ]);
  assert.ok(rows[3]!.reasonCodes.includes('producer-output-readback-blocked'));
  assert.ok(!rows[0]!.reasonCodes.includes('producer-output-readback-blocked'));
  assert.ok(!rows[1]!.reasonCodes.includes('producer-output-readback-blocked'));
  assert.ok(!rows[2]!.reasonCodes.includes('producer-output-readback-blocked'));
});

test('Task 10 scenario adapter keeps completed attempt-007 rows blocked when completed producer evidence is missing required mode groups', () => {
  const rows = buildTask10ScenarioRows(buildPassingInput({
    producerOutcome: {
      status: 'completed',
      evidence: {
        groups: [
          buildEvidenceGroup('runtime', ['2']),
          buildEvidenceGroup('reset', ['3']),
          buildEvidenceGroup('preflight', ['1', '4']),
          buildEvidenceGroup('success-001', ['5', '6', '7']),
        ],
      },
    },
  }));

  assert.deepEqual(rows.map((row) => [row.scenarioFamily, row.result]), [
    ['session-access', 'passed'],
    ['readiness', 'passed'],
    ['readiness', 'passed'],
    ['dispatch', 'passed'],
    ['replay-recovery', 'blocked'],
    ['replay-recovery', 'blocked'],
    ['result-submission', 'passed'],
  ]);
  assert.ok(rows[4]!.reasonCodes.includes('missing-recovery-001-evidence'));
  assert.ok(rows[5]!.reasonCodes.includes('missing-success-002-reuse-evidence'));
});
