import test from 'node:test';
import assert from 'node:assert/strict';

import {
  consumeOperatorHandoff,
  inspectOperatorHandoffFailure,
  runOperatorCommercialAction,
  runOperatorConnectionContinuation,
  runOperatorMatching,
  runOperatorPackageExport,
} from '../src/business-universe/operator.ts';

test('consumeOperatorHandoff routes source listing into operator matches readback', async () => {
  const result = await consumeOperatorHandoff({
    listOperatorMatches: async ({ sourceListingId }: any) => ({ items: [{ sourceListingId }] }),
  } as never, {
    sourceListingId: 'listing-1',
  });

  assert.deepEqual(result, { items: [{ sourceListingId: 'listing-1' }] });
});

test('runOperatorMatching creates candidate, activates it, generates matches, and re-reads operator matches', async () => {
  const calls: string[] = [];
  const result = await runOperatorMatching({
    createOperatorExecutionListing: async (input: any) => {
      calls.push(`create:${input.listingId}`);
      return { listing: { listing_id: input.listingId } };
    },
    activateOperatorExecutionListing: async (listingId: string) => {
      calls.push(`activate:${listingId}`);
      return { listing: { listing_id: listingId } };
    },
    generateOperatorMatchCandidates: async (listingId: string) => {
      calls.push(`match:${listingId}`);
      return { upserts: [{ matchId: 'match-1' }] };
    },
    listOperatorMatches: async ({ sourceListingId }: any) => {
      calls.push(`list:${sourceListingId}`);
      return { items: [{ match_id: 'match-1' }] };
    },
  } as never, {
    sourceListingId: 'source-1',
    candidateListing: {
      listingId: 'candidate-1',
      listingType: 'demand',
      companyId: 'company-public',
      actorId: 'operator-system',
      category: 'basic inorganic industrial chemical',
      sku: 'sku-1',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-05-10T14:00:00.000Z',
      traceId: 'trace-1',
      idempotencyKey: 'candidate-1',
      now: '2026-05-10T14:00:00.000Z',
    },
    candidateActivation: {
      companyId: 'company-public',
      actorId: 'operator-system',
      verificationStatus: 'verified',
      now: '2026-05-10T14:00:10.000Z',
    },
    matchCandidates: {
      workflowRunId: 'wf-run-1',
      triggerEventId: 'evt-1',
      upstreamDecision: 'READY_FOR_ROUTING',
      detectedEvidenceLevel: 2,
      requiredEvidenceLevel: 2,
      missingFields: [],
      freshnessTs: '2026-05-10T14:00:20.000Z',
      traceId: 'trace-1',
      idempotencyKey: 'idem-match-1',
      now: '2026-05-10T14:00:20.000Z',
    },
  });

  assert.deepEqual(calls, ['create:candidate-1', 'activate:candidate-1', 'match:source-1', 'list:source-1']);
  assert.equal(result.matches.items[0].match_id, 'match-1');
});

test('runOperatorConnectionContinuation creates connection and approves using the returned approval request id', async () => {
  const calls: string[] = [];
  const result = await runOperatorConnectionContinuation({
    createOperatorConnection: async () => ({ connectionRequest: { approval_request_id: 'apr-returned-1' } }),
    approveOperatorConnection: async (input: any) => {
      calls.push(input.approvalRequestId);
      return { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } };
    },
  } as never, {
    connection: {
      companyId: 'company-public',
      sourceMatchId: 'match-1',
      requesterActorId: 'operator-system',
      requesterCompanyId: 'company-public',
      riskTier: 'HIGH',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'CONTACT_SHARE',
      now: '2026-05-10T15:00:00.000Z',
    },
    approval: {
      approvalRequestId: 'apr-placeholder',
      actorId: 'operator-system',
      decision: 'APPROVE',
      now: '2026-05-10T15:01:00.000Z',
    },
  });

  assert.equal(result.connection.connectionRequest.approval_request_id, 'apr-returned-1');
  assert.deepEqual(calls, ['apr-returned-1']);
  assert.equal(result.approval.resolution.artifacts.opportunity.opportunity_id, 'opp-1');
});

test('runOperatorPackageExport delegates to operator opportunity package export helper', async () => {
  const result = await runOperatorPackageExport({
    exportOperatorOpportunityPackage: async () => ({ package: { package_id: 'pkg-1' } }),
  } as never, {
    opportunityId: 'opp-1',
    renderTemplateId: 'template-1',
    contentRef: 'content://packages/opp-1',
    redactionProfile: 'review-safe',
    targetSystem: 'downstream-dataroom',
    operationType: 'export',
    nodeId: 'node-1',
    runtimeId: 'runtime-1',
    agentId: 'operator-system',
    boundAccountId: 'company-public',
    now: '2026-05-10T15:02:00.000Z',
  });

  assert.equal(result.package.package_id, 'pkg-1');
});

test('runOperatorCommercialAction executes the write chain and admin-session-backed inspection reads', async () => {
  const result = await runOperatorCommercialAction({
    createCommercialAction: async () => ({ request: { commercial_action_request_id: 'car-1' } }),
    policyCheckCommercialAction: async () => ({ ok: true }),
    requestCommercialActionApproval: async () => ({ ok: true }),
    executeCommercialAction: async () => ({ receipt: { result_status: 'SUCCEEDED' } }),
    getOperatorCommercialActionStatus: async () => ({ continuity_state: 'EXECUTION_RECORDED' }),
    getOperatorCommercialActionReceipt: async () => ({ receipt: { receipt_id: 'receipt-1' } }),
    getOperatorCommercialActionAudit: async () => ({ audit_link: { audit_id: 'audit-1' } }),
  } as never, {
    create: {
      governedAction: 'EXTERNAL_WRITE',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-1',
      traceId: 'trace-1',
      workflowId: 'WF-6',
      now: '2026-05-10T15:03:00.000Z',
    },
    policyCheck: {
      commercialActionRequestId: 'car-1',
      policyVersion: 'policy-v1',
      outcome: 'APPROVAL_REQUIRED',
      now: '2026-05-10T15:03:10.000Z',
    },
    requestApproval: {
      commercialActionRequestId: 'car-1',
      approvalRequestId: 'apr-1',
      now: '2026-05-10T15:03:20.000Z',
    },
    execute: {
      commercialActionRequestId: 'car-1',
      approvalRequestId: 'apr-1',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-05-10T15:03:30.000Z',
    },
  });

  assert.equal(result.status.continuity_state, 'EXECUTION_RECORDED');
  assert.equal(result.receipt.receipt.receipt_id, 'receipt-1');
  assert.equal(result.audit.audit_link.audit_id, 'audit-1');
});

test('inspectOperatorHandoffFailure preserves non-canonical fail-close semantics', () => {
  const snapshot = inspectOperatorHandoffFailure({
    status: 404,
    body: {
      error: {
        code: 'source_listing_not_found',
        message: 'source listing not found within authorized tenant/company scope',
      },
    },
    tenantId: 'tenant-public',
    principalId: 'operator-system',
    authorizedCompanyId: 'company-public',
  });

  assert.equal(snapshot.executability, 'non-canonical-fail-close');
});
