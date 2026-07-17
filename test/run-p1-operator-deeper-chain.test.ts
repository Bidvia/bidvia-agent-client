import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunP1OperatorDeeperChainArgs,
  runP1OperatorDeeperChain,
} from '../scripts/live-probes/run-p1-operator-deeper-chain.ts';

function createFetchStub(responseBodies: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const response = responseBodies[calls.length - 1] ?? { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

function buildBootstrapReport() {
  return {
    command: 'bootstrap-claimant-local-docker' as const,
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/bidvia-live-state.json',
    admin: {
      email: 'ops-admin@example.com',
      adminSessionId: 'admin-session-1',
      adminAccountId: 'admin-acct-1',
    },
    invitation: {
      invitationId: 'invite-1',
      invitationType: 'ENTERPRISE_ACCOUNT' as const,
      status: 'ACTIVE',
    },
    claimant: {
      email: 'live@example.com',
      accountId: 'acct-1',
      sessionId: 'sess-1',
      tenantId: 'tenant-public',
      companyId: 'company-public',
      membershipRole: 'enterprise_admin',
      agentOnboardingAllowed: true,
      agentId: 'agent-1',
      principalId: 'claimed:agent-1',
      registrationId: 'areg-1',
    },
    dispatchAuthority: {
      requestId: 'daar-1',
      status: 'APPROVED',
      authorityProfileId: 'authp-1',
    },
    externalBinding: {
      bindingId: 'eab-1',
      status: 'active',
      systemName: 'bootstrap-live-seeded',
      externalAccountRef: 'ext-seeded',
    },
  };
}

test('parseRunP1OperatorDeeperChainArgs requires base-url, state-path, and output', () => {
  assert.throws(
    () => parseRunP1OperatorDeeperChainArgs([]),
    /--base-url is required/,
  );

  assert.throws(
    () => parseRunP1OperatorDeeperChainArgs(['--base-url', 'http://127.0.0.1:8787']),
    /--state-path is required/,
  );

  assert.throws(
    () => parseRunP1OperatorDeeperChainArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunP1OperatorDeeperChainArgs([
      '--base-url',
      ' http://127.0.0.1:8787 ',
      '--state-path',
      ' /tmp/state.json ',
      '--output',
      ' /tmp/report.json ',
      '--email',
      ' live@example.com ',
      '--password',
      ' secret-live-1 ',
      '--company-name',
      ' Live Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/state.json',
      outputPath: '/tmp/report.json',
      email: 'live@example.com',
      password: 'secret-live-1',
      companyName: 'Live Co',
    },
  );
});

test('runP1OperatorDeeperChain executes the operator chain and finishes with claimant readbacks', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { listing: { listing_id: 'source-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'source-listing-1', status: 'active', last_event_id: 'evt-source-activate-1' } } },
    { status: 200, body: { materialization_stage: 'match_prerequisites_ready', recommended_next_step: 'handoff_to_operator_for_matching', next_step_kind: 'handoff_to_operator', operator_handoff: { owner: 'operator', route: '/operator/matches?tenant_id=tenant-public&source_listing_id=source-listing-seeded' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1', status: 'active' } } },
    { status: 200, body: { upserts: [{ match_id: 'match-1' }] } },
    { status: 200, body: { items: [{ match_id: 'match-1' }] } },
    { status: 200, body: { connectionRequest: { connection_request_id: 'conn-1', approval_request_id: 'apr-conn-1', source_match_id: 'match-1' } } },
    { status: 200, body: { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } } },
    { status: 200, body: { package: { package_id: 'pkg-1', opportunity_id: 'opp-1' }, handoff: { package_id: 'pkg-1', bound_account_id: 'company-public' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1', subject_id: 'pkg-1' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, policy_check: { outcome: 'APPROVAL_REQUIRED' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, approval_binding: { approval_request_id: 'apr-car-1' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, receipt: { receipt_id: 'receipt-1', result_status: 'SUCCEEDED' }, audit_link: { audit_id: 'audit-1' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, continuity_state: 'EXECUTION_RECORDED', governance_refs: { approval_request_id: 'apr-car-1', receipt_id: 'receipt-1', audit_id: 'audit-1' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, receipt: { receipt_id: 'receipt-1' } } },
    { status: 200, body: { request: { commercial_action_request_id: 'car-1' }, audit_link: { audit_id: 'audit-1' } } },
    { status: 200, body: { continuation_state: 'ALLOCATED', operator_handoff: { owner: 'operator', opportunity_id: 'opp-1' } } },
    { status: 200, body: { closure_class: 'product_closed', proof_class: 'product_closure_only', operator_handoff: { owner: 'operator', opportunity_id: 'opp-1' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runP1OperatorDeeperChain({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/bidvia-live-state.json',
    outputPath: '/tmp/operator-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-14T12:00:00Z',
    randomSuffix: () => 'seeded',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/bidvia-live-state.json',
      admin: {
        email: 'ops-admin@example.com',
        adminSessionId: 'admin-session-1',
        adminAccountId: 'admin-acct-1',
      },
      invitation: {
        invitationId: 'invite-1',
        invitationType: 'ENTERPRISE_ACCOUNT',
        status: 'ACTIVE',
      },
      claimant: {
        email: 'live@example.com',
        accountId: 'acct-1',
        sessionId: 'sess-1',
        tenantId: 'tenant-public',
        companyId: 'company-public',
        membershipRole: 'enterprise_admin',
        agentOnboardingAllowed: true,
        agentId: 'agent-1',
        principalId: 'claimed:agent-1',
        registrationId: 'areg-1',
      },
      dispatchAuthority: {
        requestId: 'daar-1',
        status: 'APPROVED',
        authorityProfileId: 'authp-1',
      },
      externalBinding: {
        bindingId: 'eab-1',
        status: 'active',
        systemName: 'bootstrap-live-seeded',
        externalAccountRef: 'ext-seeded',
      },
    }),
    writeReport: async (_outputPath, report) => {
      writtenReport = report;
      return { outputPath: '/tmp/operator-report.json' };
    },
  });

  assert.equal(calls.length, 19);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/operator/execution/listings?tenant_id=tenant-public');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    listing_id: 'source-listing-seeded',
    listing_type: 'supply',
    company_id: 'company-public',
    actor_id: 'operator-system',
    category: 'basic inorganic industrial chemical',
    sku: 'sku-strict-seeded',
    quantity_value: '15',
    quantity_unit: 'tons',
    region_summary: 'China -> Vietnam',
    verification_status: 'verified',
    freshness_ts: '2026-05-14T12:00:00Z',
    trace_id: 'trace-source-seeded',
    idempotency_key: 'source-listing-seeded',
    now: '2026-05-14T12:00:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    listing_id: 'candidate-listing-seeded',
    listing_type: 'demand',
    company_id: 'company-public',
    actor_id: 'operator-system',
    category: 'basic inorganic industrial chemical',
    sku: 'sku-strict-seeded',
    quantity_value: '15',
    quantity_unit: 'tons',
    region_summary: 'China -> Vietnam',
    verification_status: 'verified',
    freshness_ts: '2026-05-14T12:00:00Z',
    trace_id: 'trace-candidate-seeded',
    idempotency_key: 'candidate-listing-seeded',
    now: '2026-05-14T12:00:00Z',
  });
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/listings/source-listing-seeded/materialization-status?tenant_id=tenant-public');
  assert.deepEqual(JSON.parse(String(calls[5]?.init?.body)), {
    workflow_run_id: 'wf-seeded',
    trigger_event_id: 'evt-source-activate-1',
    upstream_decision: 'READY_FOR_ROUTING',
    detected_evidence_level: 2,
    required_evidence_level: 2,
    missing_fields: [],
    freshness_ts: '2026-05-14T12:00:00Z',
    trace_id: 'trace-source-seeded',
    idempotency_key: 'idem-match-seeded',
    now: '2026-05-14T12:00:00Z',
  });
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/operator/matches?tenant_id=tenant-public&source_listing_id=source-listing-seeded');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/operator/opportunities/opp-1/package-export?tenant_id=tenant-public');
  const commercialCreateHeaders = new Headers(calls[10]?.init?.headers);
  assert.equal(commercialCreateHeaders.get('x-bidvia-admin-session-id'), 'admin-session-1');
  assert.equal(commercialCreateHeaders.get('x-bidvia-principal-id'), null);
  assert.equal(commercialCreateHeaders.get('x-authorized-company-id'), null);
  assert.equal(String(calls[17]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/status?tenant_id=tenant-public');
  assert.equal(String(calls[18]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/end-state?tenant_id=tenant-public');

  const typedResult = result as typeof result & {
    materializationReadback: {
      materialization: { materialization_stage: string };
      stageSnapshot: {
        stage: string;
        state: string;
        executability: string;
      };
    };
    claimantReadbacks: {
      status: { continuation_state: string };
      endState: { closure_class: string };
    };
  };

  assert.equal(typedResult.ids.matchId, 'match-1');
  assert.equal(typedResult.ids.connectionRequestId, 'conn-1');
  assert.equal(typedResult.ids.opportunityId, 'opp-1');
  assert.equal(typedResult.ids.packageId, 'pkg-1');
  assert.equal(typedResult.ids.commercialActionRequestId, 'car-1');
  assert.equal(typedResult.ids.commercialActionApprovalRequestId, 'apr-car-1');
  assert.equal(typedResult.ids.receiptId, 'receipt-1');
  assert.equal(typedResult.ids.auditId, 'audit-1');
  assert.equal(typedResult.materializationReadback.materialization.materialization_stage, 'match_prerequisites_ready');
  assert.equal(typedResult.materializationReadback.stageSnapshot.stage, 'handoff');
  assert.equal(typedResult.materializationReadback.stageSnapshot.state, 'handoff-required');
  assert.equal(typedResult.materializationReadback.stageSnapshot.executability, 'executable-handoff');
  assert.equal(typedResult.claimantReadbacks.status.continuation_state, 'ALLOCATED');
  assert.equal(typedResult.claimantReadbacks.endState.closure_class, 'product_closed');
  assert.deepEqual(writtenReport, result);
});

test('runP1OperatorDeeperChain stops commercial action diagnostics after create failure while preserving claimant closure readbacks', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { listing: { listing_id: 'source-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'source-listing-1', status: 'active', last_event_id: 'evt-source-activate-1' } } },
    { status: 200, body: { materialization_stage: 'match_prerequisites_ready', recommended_next_step: 'handoff_to_operator_for_matching', next_step_kind: 'handoff_to_operator', operator_handoff: { owner: 'operator', route: '/operator/matches?tenant_id=tenant-public&source_listing_id=source-listing-seeded' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1', status: 'active' } } },
    { status: 200, body: { upserts: [{ match_id: 'match-1' }] } },
    { status: 200, body: { items: [{ match_id: 'match-1' }] } },
    { status: 200, body: { connectionRequest: { connection_request_id: 'conn-1', approval_request_id: 'apr-conn-1', source_match_id: 'match-1' } } },
    { status: 200, body: { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } } },
    { status: 200, body: { package: { package_id: 'pkg-1', opportunity_id: 'opp-1' }, handoff: { package_id: 'pkg-1', bound_account_id: 'company-public' } } },
    { status: 403, body: { error: { code: 'auth_source_disallowed', message: 'operator auth is not accepted on this commercial action route' } } },
    { status: 200, body: { continuation_state: 'ALLOCATED', operator_handoff: { owner: 'operator', opportunity_id: 'opp-1' } } },
    { status: 200, body: { closure_class: 'product_closed', proof_class: 'product_closure_only', operator_handoff: { owner: 'operator', opportunity_id: 'opp-1' } } },
  ]);

  const result = await runP1OperatorDeeperChain({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/bidvia-live-state.json',
    outputPath: '/tmp/operator-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-14T12:00:00Z',
    randomSuffix: () => 'seeded',
    bootstrapClaimant: async () => buildBootstrapReport(),
  });

  const requestedUrls = calls.map((call) => String(call.input));
  assert.equal(calls.length, 13);
  assert.ok(!requestedUrls.some((url) => url.includes('/policy-check')));
  assert.ok(!requestedUrls.some((url) => url.includes('/request-approval')));
  assert.ok(!requestedUrls.some((url) => url.includes('/execute')));
  assert.ok(!requestedUrls.some((url) => url.includes('/receipt')));
  assert.ok(!requestedUrls.some((url) => url.includes('/audit')));
  assert.equal(String(calls[11]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/status?tenant_id=tenant-public');
  assert.equal(String(calls[12]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/execution/opportunities/opp-1/end-state?tenant_id=tenant-public');

  assert.equal(result.ids.commercialActionRequestId, null);
  assert.equal(result.ids.commercialActionApprovalRequestId, null);
  assert.equal(result.ids.receiptId, null);
  assert.equal(result.ids.auditId, null);
  assert.deepEqual(
    result.steps
      .filter((step) => step.stepKey.startsWith('operator-commercial-action'))
      .map((step) => [step.stepKey, step.status, step.responseBody]),
    [
      ['operator-commercial-action-create', 'blocked', { error: { code: 'auth_source_disallowed', message: 'operator auth is not accepted on this commercial action route' } }],
    ],
  );
  assert.deepEqual(result.commercialActionDiagnostic, {
    classification: 'operator-transitional-diagnostic',
    status: 'blocked',
    blockedBy: ['auth_source_disallowed'],
    notes: ['Commercial action create stopped at the operator/transitional diagnostic boundary; downstream commercial action routes were not attempted without a request id.'],
    stepKeys: ['operator-commercial-action-create'],
  });
  assert.deepEqual(result.claimantReadbacks.endState, {
    closure_class: 'product_closed',
    proof_class: 'product_closure_only',
    operator_handoff: { owner: 'operator', opportunity_id: 'opp-1' },
  });
});

test('runP1OperatorDeeperChain stops at the deeper boundary when approval does not yield an opportunity id', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { listing: { listing_id: 'source-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'source-listing-1', status: 'active', last_event_id: 'evt-source-activate-1' } } },
    { status: 200, body: { materialization_stage: 'match_prerequisites_ready', recommended_next_step: 'handoff_to_operator_for_matching', next_step_kind: 'handoff_to_operator', operator_handoff: { owner: 'operator', route: '/operator/matches?tenant_id=tenant-public&source_listing_id=source-listing-seeded' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1' } } },
    { status: 200, body: { listing: { listing_id: 'candidate-listing-1', status: 'active' } } },
    { status: 200, body: { upserts: [{ match_id: 'match-1' }] } },
    { status: 200, body: { items: [{ match_id: 'match-1' }] } },
    { status: 200, body: { connectionRequest: { connection_request_id: 'conn-1', approval_request_id: 'apr-conn-1', source_match_id: 'match-1' } } },
    { status: 500, body: { error: { code: 'internal_error', message: 'internal server error' } } },
  ]);

  const result = await runP1OperatorDeeperChain({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/bidvia-live-state.json',
    outputPath: '/tmp/operator-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-14T12:00:00Z',
    randomSuffix: () => 'seeded',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/bidvia-live-state.json',
      admin: {
        email: 'ops-admin@example.com',
        adminSessionId: 'admin-session-1',
        adminAccountId: 'admin-acct-1',
      },
      invitation: {
        invitationId: 'invite-1',
        invitationType: 'ENTERPRISE_ACCOUNT',
        status: 'ACTIVE',
      },
      claimant: {
        email: 'live@example.com',
        accountId: 'acct-1',
        sessionId: 'sess-1',
        tenantId: 'tenant-public',
        companyId: 'company-public',
        membershipRole: 'enterprise_admin',
        agentOnboardingAllowed: true,
        agentId: 'agent-1',
        principalId: 'claimed:agent-1',
        registrationId: 'areg-1',
      },
      dispatchAuthority: {
        requestId: 'daar-1',
        status: 'APPROVED',
        authorityProfileId: 'authp-1',
      },
      externalBinding: {
        bindingId: 'eab-1',
        status: 'active',
        systemName: 'bootstrap-live-seeded',
        externalAccountRef: 'ext-seeded',
      },
    }),
  });

  const typedResult = result as typeof result & {
    steps: Array<{ stepKey: string; status: string; responseBody: unknown }>;
    ids: { opportunityId: string | null; packageId: string | null; commercialActionRequestId: string | null };
  };

  assert.equal(calls.length, 9);
  assert.equal(typedResult.ids.opportunityId, null);
  assert.equal(typedResult.ids.packageId, null);
  assert.equal(typedResult.ids.commercialActionRequestId, null);
  assert.deepEqual(
    typedResult.steps.slice(-6).map((step) => [step.stepKey, step.status, step.responseBody]),
    [
      ['operator-approve-connection', 'failed', { error: { code: 'internal_error', message: 'internal server error' } }],
      ['operator-package-export', 'blocked', { skipped: true, blockedBy: 'missing_opportunity_id' }],
      ['operator-commercial-action-create', 'blocked', { skipped: true, blockedBy: 'missing_package_id' }],
      ['operator-commercial-action-status', 'blocked', { skipped: true, blockedBy: 'missing_commercial_action_request_id' }],
      ['claimant-opportunity-status', 'blocked', { skipped: true, blockedBy: 'missing_opportunity_id' }],
      ['claimant-opportunity-end-state', 'blocked', { skipped: true, blockedBy: 'missing_opportunity_id' }],
    ],
  );
});
