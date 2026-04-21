import test from 'node:test';
import assert from 'node:assert/strict';

import type { BidviaClient } from '../src/client.ts';
import {
  buildMultiBusinessChainCoordinatorPlan,
  runMultiBusinessChainCoordinatorPreHandoff,
  runMultiBusinessChainCoordinatorPostHandoff,
} from '../src/coordinator.ts';

type PreHandoffCoordinatorClient = Pick<BidviaClient,
  'createListing'
  | 'activateListing'
  | 'generateMatchCandidates'
  | 'createConnectionRequest'
  | 'approveConnectionRequest'>;

type PostHandoffCoordinatorClient = Pick<BidviaClient,
  'exportOpportunityPackage'
  | 'createCommercialAction'
  | 'policyCheckCommercialAction'
  | 'requestCommercialActionApproval'
  | 'executeCommercialAction'>;

test('buildMultiBusinessChainCoordinatorPlan composes shipped slice plans with an explicit approval-to-opportunity handoff boundary', () => {
  const plan = buildMultiBusinessChainCoordinatorPlan({
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
        riskTier: 'HIGH',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'CONTACT_SHARE',
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

  assert.equal(plan.coordinatorId, 'coordinator-1');
  assert.equal(plan.coordinatorLabel, 'industry-to-package-with-commercial-action');
  assert.deepEqual(plan.industryUniverse.closureGuidance, {
    lane: 'runtime-generated',
    fixedFixtureAssumptions: false,
    prerequisites: [
      'create supply and demand listings first',
      'activate both listings',
      'use the returned activation event id to generate a real persisted match',
      'continue downstream with the returned match and approval ids',
    ],
  });
  assert.deepEqual(plan.opportunityPackageHandoff.closureGuidance, {
    lane: 'runtime-generated',
    fixedFixtureAssumptions: false,
    prerequisites: [
      'use a real opportunity id returned by surfaced upstream steps',
      'do not assume proof fixture ids are available on the default business lane',
    ],
  });
  assert.equal(plan.industryUniverse.envelope.scenarioFamily, 'industry-universe');
  assert.equal(plan.connectionApproval.envelope.scenarioFamily, 'connection-approval');
  assert.deepEqual(plan.externalHandoffBoundary, {
    boundaryKey: 'approval-to-opportunity',
    status: 'requires-caller-known-ids',
    approvalRequestId: 'approval-1',
    requiredKnownIds: ['opportunityId'],
    suppliedKnownIds: {
      opportunityId: 'opportunity-1',
    },
    handoffStepName: 'operator-confirm-opportunity-handoff',
    handoffOwnerRole: 'operator',
    checkpointGuidance: 'verify the approvalRequestId and caller-supplied opportunityId before exporting the review-safe package',
  });
  assert.deepEqual(
    plan.opportunityPackageHandoff.envelope.expectedRouteChain.map((step) => ({
      routeKey: step.routeKey,
      stepName: step.stepName,
      actorRole: step.actorRole,
      checkpointName: step.progressionCheckpoint?.checkpointName ?? null,
    })),
    [
      {
        routeKey: 'exportOpportunityPackage',
        stepName: 'operator-export-opportunity-package',
        actorRole: 'operator',
        checkpointName: 'verify-package-export-record-before-commercial-action',
      },
    ],
  );
  assert.equal(plan.opportunityPackageHandoff.exportOpportunityPackageInput.opportunityId, 'opportunity-1');
  assert.equal(plan.commercialActionContinuation?.requestCommercialActionApprovalInput.approvalRequestId, 'approval-1');
});

test('buildMultiBusinessChainCoordinatorPlan rejects mismatched commercial-action approval linkage across the external handoff seam', () => {
  assert.throws(
    () => buildMultiBusinessChainCoordinatorPlan({
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
          riskTier: 'HIGH',
          policyVersion: 'policy-v1',
          approvalMatrixVersion: 'matrix-v1',
          actionType: 'CONTACT_SHARE',
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
          approvalRequestId: 'approval-2',
          now: '2026-03-27T10:08:00Z',
        },
        executeCommercialAction: {
          commercialActionRequestId: 'commercial-action-1',
          approvalRequestId: 'approval-2',
          receiptId: 'receipt-1',
          approvalResult: 'APPROVED',
          resultStatus: 'SUCCEEDED',
          auditId: 'audit-1',
          now: '2026-03-27T10:09:00Z',
        },
      },
    }),
    /commercial action continuation approvalRequestId must match the explicit connection approval handoff/,
  );
});

test('runMultiBusinessChainCoordinatorPreHandoff executes industry-universe then connection-approval and returns the explicit handoff boundary', async () => {
  const calls: string[] = [];
  const client = {
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
  } as PreHandoffCoordinatorClient;

  const plan = buildMultiBusinessChainCoordinatorPlan({
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
          riskTier: 'HIGH',
          policyVersion: 'policy-v1',
          approvalMatrixVersion: 'matrix-v1',
          actionType: 'CONTACT_SHARE',
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
  });

  const result = await runMultiBusinessChainCoordinatorPreHandoff(client, plan);

  assert.deepEqual(calls, [
    'createListing:listing-1',
    'activateListing:listing-1',
    'generateMatchCandidates:listing-1',
    'createConnectionRequest:match-1',
    'approveConnectionRequest:approval-1',
  ]);
  assert.equal(result.industryUniverse.completedRouteChain.length, 3);
  assert.equal(result.connectionApproval.completedRouteChain.length, 2);
  assert.deepEqual(result.externalHandoffBoundary, plan.externalHandoffBoundary);
});

test('runMultiBusinessChainCoordinatorPreHandoff surfaces pre-handoff runner failures directly', async () => {
  const client = {
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
      throw new Error('connection request failed');
    },
    async approveConnectionRequest() {
      throw new Error('should not reach approval');
    },
  } as PreHandoffCoordinatorClient;

  const plan = buildMultiBusinessChainCoordinatorPlan({
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
        riskTier: 'HIGH',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'CONTACT_SHARE',
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
  });

  await assert.rejects(
    () => runMultiBusinessChainCoordinatorPreHandoff(client, plan),
    /connection request failed/,
  );
});

test('runMultiBusinessChainCoordinatorPostHandoff executes package handoff then optional commercial-action continuation', async () => {
  const calls: string[] = [];
  const client = {
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
  } as PostHandoffCoordinatorClient;

  const plan = buildMultiBusinessChainCoordinatorPlan({
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
        riskTier: 'HIGH',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'CONTACT_SHARE',
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

  const result = await runMultiBusinessChainCoordinatorPostHandoff(client, plan, plan.externalHandoffBoundary);

  assert.deepEqual(calls, [
    'exportOpportunityPackage:opportunity-1',
    'createCommercialAction:pkg-1',
    'policyCheckCommercialAction:commercial-action-1',
    'requestCommercialActionApproval:approval-1',
    'executeCommercialAction:receipt-1',
  ]);
  assert.equal(result.opportunityPackageHandoff.completedRouteChain.length, 1);
  assert.equal(result.commercialActionContinuation?.verificationBundle.completedRouteChain.length, 4);
  assert.deepEqual(result.externalHandoffBoundary, plan.externalHandoffBoundary);
});

test('runMultiBusinessChainCoordinatorPostHandoff surfaces package handoff failures directly and keeps the boundary explicit', async () => {
  const client = {
    async exportOpportunityPackage() {
      throw new Error('package export failed');
    },
    async createCommercialAction() {
      throw new Error('should not reach commercial action');
    },
    async policyCheckCommercialAction() {
      throw new Error('should not reach policy check');
    },
    async requestCommercialActionApproval() {
      throw new Error('should not reach request approval');
    },
    async executeCommercialAction() {
      throw new Error('should not reach execute');
    },
  } as PostHandoffCoordinatorClient;

  const plan = buildMultiBusinessChainCoordinatorPlan({
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
        riskTier: 'HIGH',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'CONTACT_SHARE',
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
  });

  await assert.rejects(
    () => runMultiBusinessChainCoordinatorPostHandoff(client, plan, plan.externalHandoffBoundary),
    /package export failed/,
  );
});
