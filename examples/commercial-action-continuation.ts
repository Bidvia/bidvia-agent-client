import type { BidviaClient } from '../src/client.js';
import {
  buildCommercialActionScenarioPlan,
  readCommercialActionScenarioReview,
  runCommercialActionScenario,
} from '../src/commercial-action.js';

const scenarioPlan = buildCommercialActionScenarioPlan({
  scenarioId: 'scenario-commercial-action-1',
  scenarioLabel: 'commercial-action-package-send',
  sourceRefs: ['source://package/pkg-1'],
  evidenceRefs: ['evidence://approval/apr-2'],
  traceIds: ['trace-commercial-action-1'],
  workflowIds: ['wf-commercial-action-1'],
  createCommercialAction: {
    governedAction: 'OPPORTUNITY_PACKAGE_SEND',
    subjectType: 'OPPORTUNITY_PACKAGE',
    subjectId: 'pkg-1',
    traceId: 'trace-commercial-action-1',
    workflowId: 'wf-commercial-action-1',
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

const client = {
  async createCommercialAction() {
    return { ok: true };
  },
  async policyCheckCommercialAction() {
    return { ok: true };
  },
  async requestCommercialActionApproval() {
    return { ok: true };
  },
  async executeCommercialAction() {
    return { ok: true };
  },
  async getCommercialActionStatus() {
    return { status: 'SUCCEEDED' };
  },
  async getCommercialActionReceipt() {
    return { receiptId: 'receipt-1' };
  },
  async getCommercialActionAudit() {
    return { auditId: 'audit-1' };
  },
} as Pick<BidviaClient,
  'createCommercialAction'
  | 'policyCheckCommercialAction'
  | 'requestCommercialActionApproval'
  | 'executeCommercialAction'
  | 'getCommercialActionStatus'
  | 'getCommercialActionReceipt'
  | 'getCommercialActionAudit'> as BidviaClient;

const scenarioResult = await runCommercialActionScenario(client, scenarioPlan);
const scenarioReview = await readCommercialActionScenarioReview(client, scenarioPlan);

console.log(JSON.stringify({
  scenarioPlan,
  verificationBundle: scenarioResult.verificationBundle,
  reviewPacket: scenarioResult.reviewPacket,
  review: scenarioReview,
}, null, 2));
