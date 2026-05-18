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

type OperatorMatchingResult = {
  matches: {
    items: Array<{
      match_id: string;
    }>;
  };
};

type OperatorConnectionContinuationResult = {
  connection: {
    connectionRequest: {
      approval_request_id: string;
      connection_request_id: string;
      source_match_id: string;
    };
  };
  approval: {
    resolution: {
      artifacts: {
        opportunity: {
          opportunity_id: string;
        };
        connectionRequest: {
          connection_request_id: string;
        };
      };
    };
  };
};

type OperatorPackageExportResult = {
  package: {
    package_id: string;
    opportunity_id: string;
    package_version: number;
  };
  handoff: {
    bound_account_id: string;
  };
};

type OperatorCommercialActionResult = {
  create: {
    request: {
      commercial_action_request_id: string;
      subject_id: string;
    };
  };
  policyCheck: {
    policy_check: {
      outcome: string;
    };
  };
  requestApproval: {
    approval_binding: {
      approval_request_id: string;
    };
  };
  execute: {
    receipt: {
      receipt_id: string;
    };
  };
  status: {
    continuity_state: string;
    governance_refs: {
      approval_request_id: string;
      receipt_id: string;
      audit_id: string;
    };
  };
  receipt: {
    receipt: {
      receipt_id: string;
    };
  };
  audit: {
    audit_link: {
      audit_id: string;
    };
  };
};

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

  const typedResult = result as OperatorMatchingResult;

  assert.deepEqual(calls, ['create:candidate-1', 'activate:candidate-1', 'match:source-1', 'list:source-1']);
  assert.equal(typedResult.matches.items[0].match_id, 'match-1');
});

test('runOperatorConnectionContinuation creates connection and approves using the returned approval request id', async () => {
  const calls: string[] = [];
  const result = await runOperatorConnectionContinuation({
    createOperatorConnection: async () => ({
      connectionRequest: {
        connection_request_id: 'conn-1',
        approval_request_id: 'apr-returned-1',
        source_match_id: 'match-1',
      },
    }),
    approveOperatorConnection: async (input: any) => {
      calls.push(input.approvalRequestId);
      return {
        resolution: {
          artifacts: {
            opportunity: { opportunity_id: 'opp-1' },
            connectionRequest: { connection_request_id: 'conn-1' },
          },
        },
      };
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

  const typedResult = result as OperatorConnectionContinuationResult;

  assert.equal(typedResult.connection.connectionRequest.approval_request_id, 'apr-returned-1');
  assert.deepEqual(calls, ['apr-returned-1']);
  assert.equal(typedResult.connection.connectionRequest.connection_request_id, 'conn-1');
  assert.equal(typedResult.connection.connectionRequest.source_match_id, 'match-1');
  assert.equal(typedResult.approval.resolution.artifacts.opportunity.opportunity_id, 'opp-1');
  assert.equal(typedResult.approval.resolution.artifacts.connectionRequest.connection_request_id, 'conn-1');
});

test('runOperatorPackageExport delegates to operator opportunity package export helper', async () => {
  const result = await runOperatorPackageExport({
    exportOperatorOpportunityPackage: async () => ({
      package: {
        package_id: 'pkg-1',
        opportunity_id: 'opp-1',
        package_version: 1,
        receipt_id: 'receipt-1',
      },
      handoff: {
        package_id: 'pkg-1',
        bound_account_id: 'company-public',
      },
    }),
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

  const typedResult = result as OperatorPackageExportResult;

  assert.equal(typedResult.package.package_id, 'pkg-1');
  assert.equal(typedResult.package.opportunity_id, 'opp-1');
  assert.equal(typedResult.package.package_version, 1);
  assert.equal(typedResult.handoff.bound_account_id, 'company-public');
});

test('runOperatorCommercialAction executes the write chain and admin-session-backed inspection reads', async () => {
  const executeApprovalRequestIds: string[] = [];
  const result = await runOperatorCommercialAction({
    createCommercialAction: async () => ({
      request: {
        commercial_action_request_id: 'car-1',
        subject_id: 'pkg-1',
      },
    }),
    policyCheckCommercialAction: async () => ({
      request: { commercial_action_request_id: 'car-1' },
      policy_check: { outcome: 'APPROVAL_REQUIRED' },
    }),
    requestCommercialActionApproval: async () => ({
      request: { commercial_action_request_id: 'car-1' },
      approval_binding: { approval_request_id: 'apr-returned-1' },
    }),
    executeCommercialAction: async (input: any) => {
      executeApprovalRequestIds.push(input.approvalRequestId);
      return {
      request: { commercial_action_request_id: 'car-1' },
      receipt: { receipt_id: 'receipt-1', result_status: 'SUCCEEDED' },
      audit_link: { audit_id: 'audit-1' },
      };
    },
    getOperatorCommercialActionStatus: async () => ({
      request: { commercial_action_request_id: 'car-1' },
      continuity_state: 'EXECUTION_RECORDED',
      governance_refs: { approval_request_id: 'apr-returned-1', receipt_id: 'receipt-1', audit_id: 'audit-1' },
    }),
    getOperatorCommercialActionReceipt: async () => ({
      request: { commercial_action_request_id: 'car-1' },
      receipt: { receipt_id: 'receipt-1' },
    }),
    getOperatorCommercialActionAudit: async () => ({
      request: { commercial_action_request_id: 'car-1' },
      audit_link: { audit_id: 'audit-1' },
    }),
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
      approvalRequestId: 'apr-placeholder',
      now: '2026-05-10T15:03:20.000Z',
    },
    execute: {
      commercialActionRequestId: 'car-1',
      approvalRequestId: 'apr-placeholder',
      receiptId: 'receipt-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-1',
      now: '2026-05-10T15:03:30.000Z',
    },
  });

  const typedResult = result as OperatorCommercialActionResult;

  assert.equal(typedResult.create.request.commercial_action_request_id, 'car-1');
  assert.equal(typedResult.create.request.subject_id, 'pkg-1');
  assert.equal(typedResult.policyCheck.policy_check.outcome, 'APPROVAL_REQUIRED');
  assert.equal(typedResult.requestApproval.approval_binding.approval_request_id, 'apr-returned-1');
  assert.deepEqual(executeApprovalRequestIds, ['apr-returned-1']);
  assert.equal(typedResult.execute.receipt.receipt_id, 'receipt-1');
  assert.equal(typedResult.status.continuity_state, 'EXECUTION_RECORDED');
  assert.equal(typedResult.status.governance_refs.approval_request_id, 'apr-returned-1');
  assert.equal(typedResult.status.governance_refs.receipt_id, 'receipt-1');
  assert.equal(typedResult.status.governance_refs.audit_id, 'audit-1');
  assert.equal(typedResult.receipt.receipt.receipt_id, 'receipt-1');
  assert.equal(typedResult.audit.audit_link.audit_id, 'audit-1');
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
