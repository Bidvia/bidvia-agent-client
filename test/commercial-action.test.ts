import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCommercialActionEnterpriseBoundary,
  buildCommercialActionScenarioPlan,
  readCommercialActionScenarioReview,
  runCommercialActionScenario,
} from '../src/commercial-action.ts';
import type { BidviaClient } from '../src/client.ts';
import type {
  BidviaCommercialActionScenarioPlan,
} from '../src/contracts.ts';

test('buildCommercialActionScenarioPlan builds the exact commercial-action continuation route chain', () => {
  const plan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  assert.equal(plan.envelope.scenarioFamily, 'commercial-action');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.map((step) => step.routeKey),
    [
      'createCommercialAction',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
    ],
  );
  assert.deepEqual(plan.envelope.recordIds, {
    commercialActions: ['commercial-action-1'],
    approvals: ['apr-2'],
    receipts: ['receipt-1'],
  });
  assert.deepEqual(plan.envelope.workflowStage, {
    workflowIds: ['wf-3'],
    localStageLabel: 'governed-run-execution',
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'blocked-pending-packet',
    blockedBy: 'core-write-semantics-not-frozen',
    transitionRule: null,
  });
});

test('buildCommercialActionScenarioPlan returns deterministic bounded plan inputs', () => {
  const plan: BidviaCommercialActionScenarioPlan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  assert.equal(plan.policyCheckCommercialActionInput.commercialActionRequestId, 'commercial-action-1');
  assert.equal(plan.requestCommercialActionApprovalInput.approvalRequestId, 'apr-2');
  assert.equal(plan.executeCommercialActionInput.receiptId, 'receipt-1');
});

test('commercial action helpers expose the enterprise integration boundary for bounded governed action flows', () => {
  const boundary = buildCommercialActionEnterpriseBoundary();

  assert.equal(boundary.groupKey, 'commercial-action');
  assert.deepEqual(boundary.helperKeys, [
    'buildCommercialActionScenarioPlan',
    'runCommercialActionScenario',
    'readCommercialActionScenarioReview',
  ]);
  assert.equal(boundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(boundary.broaderSystemAuthorityClaimed, false);
  assert.equal(boundary.payloadPacketStatus, 'packet-grounded');
  assert.equal(boundary.blockedBy, null);
});

test('buildCommercialActionScenarioPlan rejects missing required ids in continuation inputs', () => {
  assert.throws(
    () => buildCommercialActionScenarioPlan({
      scenarioId: 'scenario-commercial-action-1',
      scenarioLabel: 'commercial-action-package-send',
      sourceRefs: ['source://package/pkg-1'],
      evidenceRefs: ['evidence://approval/apr-2'],
      traceIds: ['trace-1'],
      workflowIds: ['wf-3'],
      createCommercialAction: {
        governedAction: 'OPPORTUNITY_PACKAGE_SEND',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-1',
        traceId: 'trace-1',
        workflowId: 'wf-3',
        now: '2026-03-26T10:00:00Z',
      },
      policyCheckCommercialAction: {
        commercialActionRequestId: '   ',
        policyVersion: 'policy-v1',
        outcome: 'PASS',
        now: '2026-03-26T10:01:00Z',
      },
      requestCommercialActionApproval: {
        commercialActionRequestId: 'commercial-action-1',
        approvalRequestId: 'apr-2',
        now: '2026-03-26T10:02:00Z',
      },
      executeCommercialAction: {
        commercialActionRequestId: 'commercial-action-1',
        approvalRequestId: 'apr-2',
        receiptId: 'receipt-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-1',
        now: '2026-03-26T10:03:00Z',
      },
    }),
    /commercialActionRequestId is required for the commercial action scenario plan/,
  );
});

test('buildCommercialActionScenarioPlan rejects mismatched approval linkage across continuation steps', () => {
  assert.throws(
    () => buildCommercialActionScenarioPlan({
      scenarioId: 'scenario-commercial-action-1',
      scenarioLabel: 'commercial-action-package-send',
      sourceRefs: ['source://package/pkg-1'],
      evidenceRefs: ['evidence://approval/apr-2'],
      traceIds: ['trace-1'],
      workflowIds: ['wf-3'],
      createCommercialAction: {
        governedAction: 'OPPORTUNITY_PACKAGE_SEND',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-1',
        traceId: 'trace-1',
        workflowId: 'wf-3',
        now: '2026-03-26T10:00:00Z',
      },
      policyCheckCommercialAction: {
        commercialActionRequestId: 'commercial-action-1',
        policyVersion: 'policy-v1',
        outcome: 'PASS',
        now: '2026-03-26T10:01:00Z',
      },
      requestCommercialActionApproval: {
        commercialActionRequestId: 'commercial-action-1',
        approvalRequestId: 'apr-2',
        now: '2026-03-26T10:02:00Z',
      },
      executeCommercialAction: {
        commercialActionRequestId: 'commercial-action-1',
        approvalRequestId: 'apr-3',
        receiptId: 'receipt-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-1',
        now: '2026-03-26T10:03:00Z',
      },
    }),
    /approvalRequestId must stay aligned across the commercial action scenario plan/,
  );
});

test('runCommercialActionScenario executes the four-step commercial-action write path in order and returns review-safe outputs', async () => {
  const calls: string[] = [];
  const client = {
    async createCommercialAction(input) {
      calls.push(`create:${input.subjectId}`);
      return { ok: true };
    },
    async policyCheckCommercialAction(input) {
      calls.push(`policy:${input.commercialActionRequestId}`);
      return { ok: true };
    },
    async requestCommercialActionApproval(input) {
      calls.push(`approval:${input.approvalRequestId}`);
      return { ok: true };
    },
    async executeCommercialAction(input) {
      calls.push(`execute:${input.receiptId}`);
      return { ok: true };
    },
  } as Pick<BidviaClient,
    'createCommercialAction'
    | 'policyCheckCommercialAction'
    | 'requestCommercialActionApproval'
    | 'executeCommercialAction'> as BidviaClient;

  const plan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  const result = await runCommercialActionScenario(client, plan);

  assert.deepEqual(calls, [
    'create:pkg-1',
    'policy:commercial-action-1',
    'approval:apr-2',
    'execute:receipt-1',
  ]);
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.deepEqual(
    result.verificationBundle.completedRouteChain.map((step) => step.routeKey),
    [
      'createCommercialAction',
      'policyCheckCommercialAction',
      'requestCommercialActionApproval',
      'executeCommercialAction',
    ],
  );
  assert.equal(result.reviewPacket.status, 'complete');
  assert.equal(result.reviewPacket.summary.completedRouteCount, 4);
});

test('runCommercialActionScenario surfaces write-step failures directly', async () => {
  const client = {
    async createCommercialAction() {
      return { ok: true };
    },
    async policyCheckCommercialAction() {
      throw new Error('policy check failed');
    },
    async requestCommercialActionApproval() {
      throw new Error('should not reach approval');
    },
    async executeCommercialAction() {
      throw new Error('should not reach execute');
    },
  } as Pick<BidviaClient,
    'createCommercialAction'
    | 'policyCheckCommercialAction'
    | 'requestCommercialActionApproval'
    | 'executeCommercialAction'> as BidviaClient;

  const plan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  await assert.rejects(
    () => runCommercialActionScenario(client, plan),
    /policy check failed/,
  );
});

test('readCommercialActionScenarioReview reads status, receipt, and audit in order', async () => {
  const calls: string[] = [];
  const client = {
    async getCommercialActionStatus(input) {
      calls.push(`status:${input.commercialActionRequestId}`);
      return { status: 'SUCCEEDED' };
    },
    async getCommercialActionReceipt(input) {
      calls.push(`receipt:${input.commercialActionRequestId}`);
      return { receiptId: 'receipt-1' };
    },
    async getCommercialActionAudit(input) {
      calls.push(`audit:${input.commercialActionRequestId}`);
      return { auditId: 'audit-1' };
    },
  } as Pick<BidviaClient,
    'getCommercialActionStatus'
    | 'getCommercialActionReceipt'
    | 'getCommercialActionAudit'> as BidviaClient;

  const plan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  const result = await readCommercialActionScenarioReview(client, plan);

  assert.deepEqual(calls, [
    'status:commercial-action-1',
    'receipt:commercial-action-1',
    'audit:commercial-action-1',
  ]);
  assert.deepEqual(result, {
    status: { status: 'SUCCEEDED' },
    receipt: { receiptId: 'receipt-1' },
    audit: { auditId: 'audit-1' },
  });
});

test('readCommercialActionScenarioReview surfaces read failures directly', async () => {
  const client = {
    async getCommercialActionStatus() {
      return { status: 'SUCCEEDED' };
    },
    async getCommercialActionReceipt() {
      throw new Error('receipt read failed');
    },
    async getCommercialActionAudit() {
      throw new Error('should not reach audit');
    },
  } as Pick<BidviaClient,
    'getCommercialActionStatus'
    | 'getCommercialActionReceipt'
    | 'getCommercialActionAudit'> as BidviaClient;

  const plan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/apr-2'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-3'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'wf-3',
      now: '2026-03-26T10:00:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-26T10:01:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      now: '2026-03-26T10:02:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'apr-2',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-26T10:03:00Z',
    },
  });

  await assert.rejects(
    () => readCommercialActionScenarioReview(client, plan),
    /receipt read failed/,
  );
});
