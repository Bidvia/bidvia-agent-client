import type { BidviaClient } from '../src/client.js';
import {
  buildMultiBusinessChainCoordinatorPlan,
  runMultiBusinessChainCoordinatorPostHandoff,
  runMultiBusinessChainCoordinatorPreHandoff,
} from '../src/coordinator.js';

const coordinatorPlan = buildMultiBusinessChainCoordinatorPlan({
  coordinatorId: 'coordinator-1',
  coordinatorLabel: 'industry-to-package-with-commercial-action',
  industryUniverse: {
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    createListing: {
      listingId: 'listing-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-03-27T10:00:00Z',
      traceId: 'trace-1',
      idempotencyKey: 'listing-1',
      now: '2026-03-27T10:00:00Z',
    },
    activateListing: {
      now: '2026-03-27T10:01:00Z',
    },
    generateMatchCandidates: {
      upstreamDecision: 'READY_FOR_ROUTING',
      requiredEvidenceLevel: 1,
      detectedEvidenceLevel: 1,
      workflowRunId: 'wf-1',
      triggerEventId: 'evt-1',
      topN: 10,
      now: '2026-03-27T10:02:00Z',
    },
  },
  connectionApproval: {
    scenarioId: 'scenario-connection-approval-1',
    scenarioLabel: 'connection-approval-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://approval/approval-1'],
    traceIds: ['trace-2'],
    workflowIds: ['wf-2'],
    createConnectionRequest: {
      sourceMatchId: 'match-1',
      requesterActorId: 'actor-1',
      requesterCompanyId: 'company-1',
      riskTier: 'medium',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'buyer_contact_request',
      now: '2026-03-27T10:03:00Z',
    },
    approveConnectionRequest: {
      approvalRequestId: 'approval-1',
      actorId: 'actor-1',
      decision: 'approve',
      now: '2026-03-27T10:04:00Z',
    },
  },
  opportunityPackageHandoff: {
    scenarioId: 'scenario-opportunity-package-handoff-1',
    scenarioLabel: 'opportunity-package-handoff-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://package/package-1'],
    traceIds: ['trace-3'],
    workflowIds: ['wf-3'],
    exportOpportunityPackage: {
      opportunityId: 'opportunity-1',
      renderTemplateId: 'template-1',
      contentRef: 'content://packages/opportunity-1',
      redactionProfile: 'review-safe',
      targetSystem: 'downstream-dataroom',
      operationType: 'export',
      nodeId: 'node-1',
      runtimeId: 'runtime-1',
      agentId: 'agent-1',
      boundAccountId: 'account-1',
      now: '2026-03-27T10:05:00Z',
    },
  },
  commercialActionContinuation: {
    scenarioId: 'scenario-commercial-action-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-1'],
    evidenceRefs: ['evidence://approval/approval-1'],
    traceIds: ['trace-4'],
    workflowIds: ['wf-4'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-4',
      workflowId: 'wf-4',
      now: '2026-03-27T10:06:00Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      policyVersion: 'policy-v1',
      outcome: 'PASS',
      now: '2026-03-27T10:07:00Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'approval-1',
      now: '2026-03-27T10:08:00Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-1',
      approvalRequestId: 'approval-1',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-03-27T10:09:00Z',
    },
  },
});

const preHandoffClient = {
  async createListing() {
    return { ok: true };
  },
  async activateListing() {
    return { ok: true };
  },
  async generateMatchCandidates() {
    return { ok: true };
  },
  async createConnectionRequest() {
    return { ok: true };
  },
  async approveConnectionRequest() {
    return { ok: true };
  },
} as Pick<BidviaClient,
  'createListing'
  | 'activateListing'
  | 'generateMatchCandidates'
  | 'createConnectionRequest'
  | 'approveConnectionRequest'> as BidviaClient;

const postHandoffClient = {
  async exportOpportunityPackage() {
    return { ok: true };
  },
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
} as Pick<BidviaClient,
  'exportOpportunityPackage'
  | 'createCommercialAction'
  | 'policyCheckCommercialAction'
  | 'requestCommercialActionApproval'
  | 'executeCommercialAction'> as BidviaClient;

const preHandoffResult = await runMultiBusinessChainCoordinatorPreHandoff(
  preHandoffClient,
  coordinatorPlan,
);

const explicitHandoffBoundary = preHandoffResult.externalHandoffBoundary;

const postHandoffResult = await runMultiBusinessChainCoordinatorPostHandoff(
  postHandoffClient,
  coordinatorPlan,
  explicitHandoffBoundary,
);

console.log(JSON.stringify({
  coordinatorPlan,
  preHandoffResult,
  explicitHandoffBoundary,
  postHandoffResult,
}, null, 2));
