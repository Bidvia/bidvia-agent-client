import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchMcpToolCall, getMcpToolDescriptor } from '../src/mcp.ts';

test('operator product MCP descriptors are discoverable', () => {
  assert.ok(getMcpToolDescriptor('operator-handoff-consume-read'));
  assert.ok(getMcpToolDescriptor('operator-progression-match-execution'));
  assert.ok(getMcpToolDescriptor('operator-progression-connect-execution'));
  assert.ok(getMcpToolDescriptor('operator-progression-approve-execution'));
  assert.ok(getMcpToolDescriptor('operator-progression-package-export-execution'));
  assert.ok(getMcpToolDescriptor('operator-closure-commercial-action-run-execution'));
  assert.ok(getMcpToolDescriptor('operator-closure-inspect-read'));
});

test('dispatchMcpToolCall routes operator handoff consume through operator facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-handoff-consume-read',
    arguments: { sourceListingId: 'listing-1' },
  }, {
    createExecutionClient: () => ({
      listOperatorMatches: async () => ({ items: [{ match_id: 'match-1' }] }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as { items: Array<{ match_id: string }> }).items[0].match_id, 'match-1');
});

test('dispatchMcpToolCall routes operator progression match through operator facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-progression-match-execution',
    arguments: {
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
        freshnessTs: '2026-05-10T12:10:00.000Z',
        traceId: 'trace-1',
        idempotencyKey: 'idem-1',
        now: '2026-05-10T12:10:00.000Z',
      },
      candidateActivation: {
        companyId: 'company-public',
        actorId: 'operator-system',
        verificationStatus: 'verified',
        now: '2026-05-10T12:10:01.000Z',
      },
      matchCandidates: {
        workflowRunId: 'wf-1',
        triggerEventId: 'evt-1',
        upstreamDecision: 'READY_FOR_ROUTING',
        detectedEvidenceLevel: 2,
        requiredEvidenceLevel: 2,
        missingFields: [],
        freshnessTs: '2026-05-10T12:10:02.000Z',
        traceId: 'trace-1',
        idempotencyKey: 'idem-match-1',
        now: '2026-05-10T12:10:02.000Z',
      },
    },
  }, {
    createExecutionClient: () => ({
      options: { context: { tenantId: 'tenant-public', adminSessionId: 'admin-session-1' } },
      createOperatorExecutionListing: async () => ({ listing: { listing_id: 'candidate-1' } }),
      activateOperatorExecutionListing: async () => ({ listing: { listing_id: 'candidate-1' } }),
      generateOperatorMatchCandidates: async () => ({ upserts: [{ matchId: 'match-1' }] }),
      listOperatorMatches: async () => ({ items: [{ match_id: 'match-1' }] }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as { matches: { items: Array<{ match_id: string }> } }).matches.items[0].match_id, 'match-1');
});

test('dispatchMcpToolCall routes operator progression connect through operator continuation helper', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-progression-connect-execution',
    arguments: {
      companyId: 'company-public',
      sourceMatchId: 'match-1',
      requesterActorId: 'operator-system',
      requesterCompanyId: 'company-public',
      riskTier: 'HIGH',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'CONTACT_SHARE',
      now: '2026-05-10T12:20:00.000Z',
      approval: {
        approvalRequestId: 'apr-placeholder',
        actorId: 'operator-system',
        decision: 'APPROVE',
        now: '2026-05-10T12:20:10.000Z',
      },
    },
  }, {
    createExecutionClient: () => ({
      options: { context: { tenantId: 'tenant-public', adminSessionId: 'admin-session-1' } },
      createOperatorConnection: async () => ({ connectionRequest: { approval_request_id: 'apr-1' } }),
      approveOperatorConnection: async () => ({ resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as { approval: { resolution: { artifacts: { opportunity: { opportunity_id: string } } } } }).approval.resolution.artifacts.opportunity.opportunity_id, 'opp-1');
});

test('dispatchMcpToolCall routes operator progression approve through operator approval helper', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-progression-approve-execution',
    arguments: {
      approvalRequestId: 'apr-1',
      actorId: 'operator-system',
      decision: 'APPROVE',
      now: '2026-05-10T12:21:00.000Z',
    },
  }, {
    createExecutionClient: () => ({
      options: { context: { tenantId: 'tenant-public', adminSessionId: 'admin-session-1' } },
      approveOperatorConnection: async () => ({ resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as { resolution: { artifacts: { opportunity: { opportunity_id: string } } } }).resolution.artifacts.opportunity.opportunity_id, 'opp-1');
});

test('dispatchMcpToolCall routes operator progression package export through operator facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-progression-package-export-execution',
    arguments: {
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
      now: '2026-05-10T12:22:00.000Z',
    },
  }, {
    createExecutionClient: () => ({
      options: { context: { tenantId: 'tenant-public', adminSessionId: 'admin-session-1' } },
      exportOperatorOpportunityPackage: async () => ({ package: { package_id: 'pkg-1' } }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as { package: { package_id: string } }).package.package_id, 'pkg-1');
});

test('dispatchMcpToolCall routes operator closure commercial action through operator facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-closure-commercial-action-run-execution',
    arguments: {
      create: {
        governedAction: 'EXTERNAL_WRITE',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-1',
        traceId: 'trace-1',
        workflowId: 'WF-6',
        now: '2026-05-10T12:23:00.000Z',
      },
      policyCheck: {
        commercialActionRequestId: 'placeholder',
        policyVersion: 'policy-v1',
        outcome: 'APPROVAL_REQUIRED',
        now: '2026-05-10T12:23:10.000Z',
      },
      requestApproval: {
        commercialActionRequestId: 'placeholder',
        approvalRequestId: 'apr-1',
        now: '2026-05-10T12:23:20.000Z',
      },
      execute: {
        commercialActionRequestId: 'placeholder',
        approvalRequestId: 'apr-1',
        receiptId: 'receipt-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-1',
        now: '2026-05-10T12:23:30.000Z',
      },
    },
  }, {
    createExecutionClient: () => ({
      options: { context: { tenantId: 'tenant-public', adminSessionId: 'admin-session-1' } },
      createCommercialAction: async () => ({ request: { commercial_action_request_id: 'car-1' } }),
      policyCheckCommercialAction: async () => ({ ok: true }),
      requestCommercialActionApproval: async () => ({ ok: true }),
      executeCommercialAction: async () => ({ ok: true }),
      getOperatorCommercialActionStatus: async () => ({ continuity_state: 'EXECUTION_RECORDED' }),
      getOperatorCommercialActionReceipt: async () => ({ receipt: { receipt_id: 'receipt-1' } }),
      getOperatorCommercialActionAudit: async () => ({ audit_link: { audit_id: 'audit-1' } }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as { status: { continuity_state: string } }).status.continuity_state, 'EXECUTION_RECORDED');
});

test('dispatchMcpToolCall routes operator closure inspect through operator facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'operator-closure-inspect-read',
    arguments: { commercialActionRequestId: 'car-1' },
  }, {
    createExecutionClient: () => ({
      getOperatorCommercialActionStatus: async () => ({ continuity_state: 'EXECUTION_RECORDED' }),
      getOperatorCommercialActionReceipt: async () => ({ receipt: { receipt_id: 'receipt-1' } }),
      getOperatorCommercialActionAudit: async () => ({ audit_link: { audit_id: 'audit-1' } }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as { audit: { audit_link: { audit_id: string } } }).audit.audit_link.audit_id, 'audit-1');
});
