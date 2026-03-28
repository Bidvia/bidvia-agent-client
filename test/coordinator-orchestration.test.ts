import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaClient } from '../src/client.ts';
import {
  buildMultiBusinessChainCoordinatorPlan,
  runMultiBusinessChainCoordinatorWithExplicitHandoff,
} from '../src/coordinator.ts';

type FullCoordinatorClient = Pick<BidviaClient,
  'createListing'
  | 'activateListing'
  | 'generateMatchCandidates'
  | 'createConnectionRequest'
  | 'approveConnectionRequest'
  | 'exportOpportunityPackage'
  | 'createCommercialAction'
  | 'policyCheckCommercialAction'
  | 'requestCommercialActionApproval'
  | 'executeCommercialAction'>;

function createCoordinatorPlan() {
  return buildMultiBusinessChainCoordinatorPlan({
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
}

function createFullCoordinatorClient(calls: string[]): FullCoordinatorClient {
  return {
    async createListing(input) {
      calls.push(`createListing:${input.listingId}`);
      return { ok: true };
    },
    async activateListing(input) {
      calls.push(`activateListing:${input.listingId}`);
      return { ok: true };
    },
    async generateMatchCandidates(input) {
      calls.push(`generateMatchCandidates:${input.listingId}`);
      return { ok: true };
    },
    async createConnectionRequest(input) {
      calls.push(`createConnectionRequest:${input.sourceMatchId}`);
      return { ok: true };
    },
    async approveConnectionRequest(input) {
      calls.push(`approveConnectionRequest:${input.approvalRequestId}`);
      return { ok: true };
    },
    async exportOpportunityPackage(input) {
      calls.push(`exportOpportunityPackage:${input.opportunityId}`);
      return { ok: true };
    },
    async createCommercialAction(input) {
      calls.push(`createCommercialAction:${input.subjectId}`);
      return { ok: true };
    },
    async policyCheckCommercialAction(input) {
      calls.push(`policyCheckCommercialAction:${input.commercialActionRequestId}`);
      return { ok: true };
    },
    async requestCommercialActionApproval(input) {
      calls.push(`requestCommercialActionApproval:${input.approvalRequestId}`);
      return { ok: true };
    },
    async executeCommercialAction(input) {
      calls.push(`executeCommercialAction:${input.receiptId}`);
      return { ok: true };
    },
  } as FullCoordinatorClient;
}

test('runMultiBusinessChainCoordinatorWithExplicitHandoff executes the shipped pre-handoff and post-handoff slices in order when the caller supplies the seam boundary', async () => {
  const calls: string[] = [];
  const client = createFullCoordinatorClient(calls);
  const plan = createCoordinatorPlan();

  const result = await runMultiBusinessChainCoordinatorWithExplicitHandoff(
    client,
    plan,
    plan.externalHandoffBoundary,
  );

  assert.deepEqual(calls, [
    'createListing:listing-1',
    'activateListing:listing-1',
    'generateMatchCandidates:listing-1',
    'createConnectionRequest:match-1',
    'approveConnectionRequest:approval-1',
    'exportOpportunityPackage:opportunity-1',
    'createCommercialAction:pkg-1',
    'policyCheckCommercialAction:commercial-action-1',
    'requestCommercialActionApproval:approval-1',
    'executeCommercialAction:receipt-1',
  ]);
  assert.equal(result.preHandoff.industryUniverse.completedRouteChain.length, 3);
  assert.equal(result.preHandoff.connectionApproval.completedRouteChain.length, 2);
  assert.equal(result.postHandoff.opportunityPackageHandoff.completedRouteChain.length, 1);
  assert.equal(result.postHandoff.commercialActionContinuation?.verificationBundle.completedRouteChain.length, 4);
  assert.deepEqual(result.preHandoff.externalHandoffBoundary, plan.externalHandoffBoundary);
  assert.deepEqual(result.postHandoff.externalHandoffBoundary, plan.externalHandoffBoundary);
});

test('runMultiBusinessChainCoordinatorWithExplicitHandoff rejects seam crossing when the caller boundary omits opportunityId', async () => {
  const calls: string[] = [];
  const client = createFullCoordinatorClient(calls);
  const plan = createCoordinatorPlan();

  await assert.rejects(
    () => runMultiBusinessChainCoordinatorWithExplicitHandoff(
      client,
      plan,
      {
        boundaryKey: 'approval-to-opportunity',
        status: 'requires-caller-known-ids',
        approvalRequestId: 'approval-1',
        requiredKnownIds: ['opportunityId'],
        suppliedKnownIds: {},
      } as unknown as typeof plan.externalHandoffBoundary,
    ),
    /opportunityId is required at the approval-to-opportunity handoff boundary/,
  );
  assert.deepEqual(calls, []);
});

test('runMultiBusinessChainCoordinatorWithExplicitHandoff rejects seam crossing when the caller boundary does not match the coordinator plan', async () => {
  const calls: string[] = [];
  const client = createFullCoordinatorClient(calls);
  const plan = createCoordinatorPlan();

  await assert.rejects(
    () => runMultiBusinessChainCoordinatorWithExplicitHandoff(
      client,
      plan,
      {
        ...plan.externalHandoffBoundary,
        suppliedKnownIds: {
          opportunityId: 'opportunity-2',
        },
      },
    ),
    /explicit approval-to-opportunity handoff boundary must match the coordinator plan/,
  );
  assert.deepEqual(calls, []);
});
