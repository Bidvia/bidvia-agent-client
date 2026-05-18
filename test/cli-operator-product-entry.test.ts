import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

test('runCli operator-handoff-consume prints machine-readable operator matches readback', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'operator-handoff-consume',
    '--listing-id',
    'listing-1',
  ], {
    createClient: () => ({
      listOperatorMatches: async () => ({ items: [{ match_id: 'match-1' }] }),
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { items: Array<{ match_id: string }> }).items[0].match_id, 'match-1');
});

test('runCli operator-progression-match routes through operator matching helper', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'operator-progression-match',
    '--input',
    JSON.stringify({
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
        freshnessTs: '2026-05-11T12:00:00.000Z',
        traceId: 'trace-1',
        idempotencyKey: 'idem-1',
        now: '2026-05-11T12:00:00.000Z',
      },
      candidateActivation: {
        companyId: 'company-public',
        actorId: 'operator-system',
        verificationStatus: 'verified',
        now: '2026-05-11T12:00:01.000Z',
      },
      matchCandidates: {
        workflowRunId: 'wf-1',
        triggerEventId: 'evt-1',
        upstreamDecision: 'READY_FOR_ROUTING',
        detectedEvidenceLevel: 2,
        requiredEvidenceLevel: 2,
        missingFields: [],
        freshnessTs: '2026-05-11T12:00:02.000Z',
        traceId: 'trace-1',
        idempotencyKey: 'idem-match-1',
        now: '2026-05-11T12:00:02.000Z',
      },
    }),
  ], {
    createClient: () => ({
      createOperatorExecutionListing: async () => { calls.push('create'); return { listing: { listing_id: 'candidate-1' } }; },
      activateOperatorExecutionListing: async () => { calls.push('activate'); return { listing: { listing_id: 'candidate-1' } }; },
      generateOperatorMatchCandidates: async () => { calls.push('match'); return { upserts: [{ matchId: 'match-1' }] }; },
      listOperatorMatches: async () => { calls.push('list'); return { items: [{ match_id: 'match-1' }] }; },
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['create', 'activate', 'match', 'list']);
  assert.equal((printed[0] as { matches: { items: Array<{ match_id: string }> } }).matches.items[0].match_id, 'match-1');
});

test('runCli operator-progression-connect routes through operator connection helper', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'operator-progression-connect',
    '--input',
    JSON.stringify({
      companyId: 'company-public',
      sourceMatchId: 'match-1',
      requesterActorId: 'operator-system',
      requesterCompanyId: 'company-public',
      riskTier: 'HIGH',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'CONTACT_SHARE',
      now: '2026-05-11T12:00:00.000Z',
    }),
  ], {
    createClient: () => ({
      createOperatorConnection: async (input: { companyId: string; sourceMatchId: string }) => {
        calls.push(`${input.companyId}:${input.sourceMatchId}`);
        return { connectionRequest: { connection_request_id: 'conn-1' } };
      },
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['company-public:match-1']);
  assert.equal((printed[0] as { connectionRequest: { connection_request_id: string } }).connectionRequest.connection_request_id, 'conn-1');
});

test('runCli operator-progression-approve routes through operator approval helper', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'operator-progression-approve',
    '--input',
    JSON.stringify({
      approvalRequestId: 'apr-1',
      actorId: 'operator-system',
      decision: 'APPROVE',
      now: '2026-05-11T12:00:10.000Z',
    }),
  ], {
    createClient: () => ({
      approveOperatorConnection: async (input: { approvalRequestId: string }) => {
        calls.push(input.approvalRequestId);
        return { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } };
      },
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['apr-1']);
  assert.equal((printed[0] as { resolution: { artifacts: { opportunity: { opportunity_id: string } } } }).resolution.artifacts.opportunity.opportunity_id, 'opp-1');
});

test('runCli operator-progression-package-export routes through operator package export helper', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'operator-progression-package-export',
    '--input',
    JSON.stringify({
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
      now: '2026-05-11T12:00:20.000Z',
    }),
  ], {
    createClient: () => ({
      exportOperatorOpportunityPackage: async (input: { opportunityId: string }) => {
        calls.push(input.opportunityId);
        return { package: { package_id: 'pkg-1' } };
      },
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['opp-1']);
  assert.equal((printed[0] as { package: { package_id: string } }).package.package_id, 'pkg-1');
});

test('runCli operator-closure-commercial-action-run routes through operator commercial action helper', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'operator-closure-commercial-action-run',
    '--input',
    JSON.stringify({
      create: {
        governedAction: 'EXTERNAL_WRITE',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-1',
        traceId: 'trace-1',
        workflowId: 'WF-6',
        now: '2026-05-11T12:00:30.000Z',
      },
      policyCheck: {
        commercialActionRequestId: 'placeholder',
        policyVersion: 'policy-v1',
        outcome: 'APPROVAL_REQUIRED',
        now: '2026-05-11T12:00:31.000Z',
      },
      requestApproval: {
        commercialActionRequestId: 'placeholder',
        approvalRequestId: 'apr-1',
        now: '2026-05-11T12:00:32.000Z',
      },
      execute: {
        commercialActionRequestId: 'placeholder',
        approvalRequestId: 'apr-1',
        receiptId: 'receipt-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-1',
        now: '2026-05-11T12:00:33.000Z',
      },
    }),
  ], {
    createClient: () => ({
      createCommercialAction: async () => ({ request: { commercial_action_request_id: 'car-1' } }),
      policyCheckCommercialAction: async () => ({ ok: true }),
      requestCommercialActionApproval: async () => ({ ok: true }),
      executeCommercialAction: async () => ({ ok: true }),
      getOperatorCommercialActionStatus: async () => ({ continuity_state: 'EXECUTION_RECORDED' }),
      getOperatorCommercialActionReceipt: async () => ({ receipt: { receipt_id: 'receipt-1' } }),
      getOperatorCommercialActionAudit: async () => ({ audit_link: { audit_id: 'audit-1' } }),
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as { status: { continuity_state: string } }).status.continuity_state, 'EXECUTION_RECORDED');
});

test('runCli operator-closure-inspect routes through operator commercial action inspection helper', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'operator-closure-inspect',
    '--input',
    JSON.stringify({ commercialActionRequestId: 'car-1' }),
  ], {
    createClient: () => ({
      getOperatorCommercialActionStatus: async ({ commercialActionRequestId }: { commercialActionRequestId: string }) => {
        calls.push(`status:${commercialActionRequestId}`);
        return { continuity_state: 'EXECUTION_RECORDED' };
      },
      getOperatorCommercialActionReceipt: async ({ commercialActionRequestId }: { commercialActionRequestId: string }) => {
        calls.push(`receipt:${commercialActionRequestId}`);
        return { receipt: { receipt_id: 'receipt-1' } };
      },
      getOperatorCommercialActionAudit: async ({ commercialActionRequestId }: { commercialActionRequestId: string }) => {
        calls.push(`audit:${commercialActionRequestId}`);
        return { audit_link: { audit_id: 'audit-1' } };
      },
    }) as never,
    resolveExecutionContext: () => ({ tenantId: 'tenant-public', adminSessionId: 'admin-session-1' }),
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['status:car-1', 'receipt:car-1', 'audit:car-1']);
  assert.equal((printed[0] as { audit: { audit_link: { audit_id: string } } }).audit.audit_link.audit_id, 'audit-1');
});
