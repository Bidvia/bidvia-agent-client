import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient, exportVerificationBundle } from '../src/client.ts';
import { buildIdentitySessionPlaneView } from '../src/index.ts';

function createFetchStub() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('BidviaClient uses the frozen provisional->query->claim onboarding contract', async () => {
  const { calls, fetchStub } = createFetchStub();
  const identitySessionPlane = buildIdentitySessionPlaneView();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createProvisionalAgent({
    provisionalAgentRef: 'prov-agent-1',
    now: '2026-03-25T18:00:00Z',
  }, {
    timeoutMs: 250,
  });
  await client.queryProvisionalAgent('prov-agent-1');
  await client.claimProvisionalAgent({
    provisionalAgentRef: 'prov-agent-1',
    claimToken: 'claim-token-1',
    now: '2026-03-25T18:01:00Z',
  });

  assert.equal(calls.length, 3);
  assert.deepEqual(
    identitySessionPlane.canonicalOnboarding.helperSteps.map((step) => step.helperKey),
    ['createProvisionalAgent', 'queryProvisionalAgent', 'claimProvisionalAgent'],
  );
  assert.equal(identitySessionPlane.canonicalOnboarding.primaryForAgentOnboarding, true);
  assert.deepEqual(identitySessionPlane.canonicalOnboarding.claim.requiredContext, ['tenantId', 'sessionId']);
  assert.equal(identitySessionPlane.onboardingSupport.label, 'Bounded V1 account/session prerequisite support');
  assert.equal(identitySessionPlane.onboardingSupport.fullAccountProductClaim, false);
  assert.equal(identitySessionPlane.onboardingSupport.prerequisiteSupportOnly, true);
  assert.deepEqual(
    identitySessionPlane.onboardingSupport.helperSteps.map((step) => step.helperKey),
    [
      'signUpPersonalAccount',
      'signUpEnterpriseAccount',
      'signIn',
      'refreshSession',
      'revokeSession',
      'getAccountMe',
      'selectOrg',
    ],
  );
  assert.equal(identitySessionPlane.sessionTruth.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-agent-1');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional/claim');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
});

test('BidviaClient includes the bounded V1 account and session prerequisite helper surface in the client contract', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.signUpPersonalAccount({
    email: 'person@example.com',
    password: 'secret-1',
    displayName: 'Ada Lovelace',
    now: '2026-04-10T10:00:00Z',
  });
  await client.signUpEnterpriseAccount({
    email: 'ops@example.com',
    password: 'secret-2',
    companyName: 'Bidvia Labs',
    now: '2026-04-10T10:01:00Z',
  });
  await client.signIn({
    email: 'person@example.com',
    password: 'secret-1',
    now: '2026-04-10T10:02:00Z',
  });
  await client.refreshSession();
  await client.revokeSession();
  await client.getAccountMe();
  await client.selectOrg({ orgId: 'org-2' });

  assert.equal(calls.length, 7);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/accounts/personal/sign-up');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/accounts/enterprise/sign-up');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/sessions/sign-in');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/sessions/refresh');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/sessions/revoke');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/account/me');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/account/select-org');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    email: 'person@example.com',
    password: 'secret-1',
    display_name: 'Ada Lovelace',
    now: '2026-04-10T10:00:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    email: 'ops@example.com',
    password: 'secret-2',
    company_name: 'Bidvia Labs',
    now: '2026-04-10T10:01:00Z',
  });
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    email: 'person@example.com',
    password: 'secret-1',
    now: '2026-04-10T10:02:00Z',
  });
  assert.equal((calls[3]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[4]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[5]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal((calls[6]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[6]?.init?.body)), {
    org_id: 'org-2',
  });
});

test('BidviaClient accepts object-shaped provisional query input for onboarding symmetry', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    fetchImpl: fetchStub,
  });

  const queryProvisionalAgent = Reflect.get(client, 'queryProvisionalAgent');

  assert.equal(typeof queryProvisionalAgent, 'function');

  await Reflect.apply(queryProvisionalAgent, client, [{
    provisionalAgentRef: 'prov-agent-2',
  }]);

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-agent-2');
});

test('BidviaClient uses the frozen registration-bound heartbeat/sync/evidence/proposal contract', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-client-1',
    },
    fetchImpl: fetchStub,
  });

  await client.postHeartbeat({ now: '2026-03-25T18:02:00Z', expiresAt: '2026-03-25T18:07:00Z' });
  await client.uploadSync({ cursorRef: 'cursor-1', objectCount: 3, now: '2026-03-25T18:03:00Z' });
  await client.downloadSync();
  await client.submitEvidence({ evidenceRef: 'evidence://agent/1', evidenceKind: 'provider_receipt', summary: 'receipt evidence', now: '2026-03-25T18:04:00Z' });
  await client.submitProposal({ proposalType: 'template_change', proposalRef: 'proposal://agent/1', summary: 'template change', now: '2026-03-25T18:05:00Z' });

  assert.equal(calls.length, 5);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/heartbeat?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/sync/upload?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/sync/download?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/evidence-submissions?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-client-1/proposals?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
});

test('BidviaClient makes admin-session commercial action reads explicit', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.getCommercialActionStatus({
    commercialActionRequestId: 'commercial-action-1',
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/status?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
});

test('BidviaClient makes commercial action writes explicit under operator principal context', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.createCommercialAction({
    governedAction: 'OPPORTUNITY_PACKAGE_SEND',
    subjectType: 'OPPORTUNITY_PACKAGE',
    subjectId: 'pkg-1',
    traceId: 'trace-1',
    workflowId: 'WF-3',
    now: '2026-03-25T19:10:00Z',
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
});

test('BidviaClient supports frozen governance write wrappers under principal-governed headers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      principalType: 'operator',
      authorizedRole: 'admin',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.postAgentAuthorityProfile('areg-1', {
    principalRef: 'principal://actor-1',
    tenantScope: 'tenant-a',
    companyScope: 'company-a',
    authorizedActionScopes: ['agents:governance:write'],
    commercialAuthorityLevel: 'LEVEL_3',
    status: 'ACTIVE',
  });
  await client.postAgentAuthorityLadder('areg-1', {
    authorityRung: 'RUNG_2',
    grantedActionScopes: ['agents:governance:write'],
    downgradedFromRung: 'RUNG_3',
    grantedAt: '2026-03-25T19:10:00Z',
    rationale: 'operator approval',
  });
  await client.postAgentCapabilityProfile('areg-1', {
    domainStrengths: ['industrial-chemicals'],
    templateDomains: ['supply-match'],
    workflowRoles: ['coordinator'],
    allowedRuntimeScopes: ['routing:governed'],
    qualitySignals: ['verified-evidence'],
    adoptionRate: 0.8,
    evidenceScore: 0.91,
    riskReliabilityBand: 'LOW_RISK',
    routingPriority: 10,
  });

  assert.equal(calls.length, 3);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-profile?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/authority-ladder?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/capability-profile?tenant_id=tenant-a');
  assert.equal(calls[0]?.init?.method, 'POST');
  assert.equal(calls[1]?.init?.method, 'POST');
  assert.equal(calls[2]?.init?.method, 'POST');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-type'], 'operator');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-role'], 'admin');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-principal-type'], 'operator');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-authorized-role'], 'admin');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-bidvia-principal-type'], 'operator');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-authorized-role'], 'admin');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    principal_ref: 'principal://actor-1',
    tenant_scope: 'tenant-a',
    company_scope: 'company-a',
    authorized_action_scopes: ['agents:governance:write'],
    commercial_authority_level: 'LEVEL_3',
    status: 'ACTIVE',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    authority_rung: 'RUNG_2',
    granted_action_scopes: ['agents:governance:write'],
    downgraded_from_rung: 'RUNG_3',
    granted_at: '2026-03-25T19:10:00Z',
    rationale: 'operator approval',
  });
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    domain_strengths: ['industrial-chemicals'],
    template_domains: ['supply-match'],
    workflow_roles: ['coordinator'],
    allowed_runtime_scopes: ['routing:governed'],
    quality_signals: ['verified-evidence'],
    adoption_rate: 0.8,
    evidence_score: 0.91,
    risk_reliability_band: 'LOW_RISK',
    routing_priority: 10,
  });
});

test('BidviaClient operator-governed writes omit principal-type and authorized-role headers when absent', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.postAgentAuthorityLadder('areg-1', {
    authorityRung: 'RUNG_2',
    grantedActionScopes: ['agents:governance:write'],
    grantedAt: '2026-03-25T19:10:00Z',
    rationale: 'operator approval',
  });

  const headers = calls[0]?.init?.headers as Record<string, string>;
  assert.equal(headers['x-bidvia-principal-type'], undefined);
  assert.equal(headers['x-authorized-role'], undefined);
});

test('BidviaClient supports the commercial-action helper family proven in production wave-3', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createCommercialAction({
    governedAction: 'OPPORTUNITY_PACKAGE_SEND',
    subjectType: 'OPPORTUNITY_PACKAGE',
    subjectId: 'pkg-1',
    traceId: 'trace-1',
    workflowId: 'WF-3',
    now: '2026-03-25T19:10:00Z',
  });
  await client.policyCheckCommercialAction({
    commercialActionRequestId: 'commercial-action-1',
    policyVersion: 'policy_external_write_minimum_boundary',
    outcome: 'PASS',
    now: '2026-03-25T19:11:00Z',
  });
  await client.requestCommercialActionApproval({
    commercialActionRequestId: 'commercial-action-1',
    approvalRequestId: 'apr-2',
    now: '2026-03-25T19:12:00Z',
  });
  await client.executeCommercialAction({
    commercialActionRequestId: 'commercial-action-1',
    approvalRequestId: 'apr-2',
    receiptId: 'commercial-receipt-1',
    approvalResult: 'APPROVED',
    resultStatus: 'SUCCEEDED',
    auditId: 'commercial-audit-1',
    now: '2026-03-25T19:13:00Z',
  });
  await client.getCommercialActionStatus({ commercialActionRequestId: 'commercial-action-1' });
  await client.getCommercialActionReceipt({ commercialActionRequestId: 'commercial-action-1' });
  await client.getCommercialActionAudit({ commercialActionRequestId: 'commercial-action-1' });

  assert.equal(calls.length, 7);
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/policy-check?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/request-approval?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/execute?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/status?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/receipt?tenant_id=tenant-a');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-1/audit?tenant_id=tenant-a');
  assert.equal((calls[4]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
});

test('BidviaClient supports the first business-chain helper slice for listing activation and match generation', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.createListing({
    listingId: 'listing-1',
    listingType: 'supply',
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-03-25T20:20:00Z',
    traceId: 'trace-1',
    idempotencyKey: 'listing-1',
    now: '2026-03-25T20:20:00Z',
  });
  await client.activateListing({
    listingId: 'listing-1',
    now: '2026-03-25T20:21:00Z',
  });
  await client.generateMatchCandidates({
    listingId: 'listing-1',
    upstreamDecision: 'READY_FOR_ROUTING',
    requiredEvidenceLevel: 1,
    detectedEvidenceLevel: 1,
    workflowRunId: 'wf-1',
    triggerEventId: 'evt-1',
    topN: 10,
    now: '2026-03-25T20:22:00Z',
  });

  assert.equal(calls.length, 3);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/listings?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/listings/listing-1/activate?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/listings/listing-1/match-candidates?tenant_id=tenant-a');
  assert.equal((calls[2]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
});

test('BidviaClient supports the connection, approval, and opportunity helper slice proven in production wave-2', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.createConnectionRequest({
    sourceMatchId: 'match-1',
    requesterActorId: 'actor-1',
    requesterCompanyId: 'company-a',
    riskTier: 'HIGH',
    policyVersion: 'policy-v1',
    approvalMatrixVersion: 'matrix-v1',
    actionType: 'CONTACT_SHARE',
    now: '2026-03-25T20:30:00Z',
  });
  await client.approveConnectionRequest({
    approvalRequestId: 'apr-2',
    actorId: 'approver-1',
    decision: 'APPROVE',
    now: '2026-03-25T20:31:00Z',
  });

  assert.equal(calls.length, 2);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/connection-requests?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/approvals/apr-2/decision?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
});

test('BidviaClient supports the opportunity package export helper proven in production wave-2', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.exportOpportunityPackage({
    opportunityId: 'opp-1',
    renderTemplateId: 'tmpl-opportunity-v1',
    contentRef: 's3://packages/pkg-1/v1.json',
    redactionProfile: 'buyer-safe-v1',
    targetSystem: 'CRM',
    operationType: 'UPSERT',
    nodeId: 'node-prd-1',
    runtimeId: 'runtime-prd-1',
    agentId: 'agent-prd-1',
    boundAccountId: 'acct-prd-1',
    now: '2026-03-25T20:40:00Z',
  });

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/opportunities/opp-1/package-export?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
});

test('BidviaClient exports a production verification bundle with source, evidence, trace, workflow, and record ids', () => {
  const bundle = exportVerificationBundle({
    scenarioLabel: 'wave-2-soda-ash-light',
    sourceRefs: [
      'vtip://soda-ash-import-procedure',
      'alibaba://soda-ash-light-supply',
    ],
    evidenceRefs: [
      'evidence://prd-real-account/1',
      'proposal://prd-real-account/1',
    ],
    traceIds: ['trace-prd-real-soda-ash-light-supply-1774333087'],
    workflowIds: ['WF-3'],
    recordIds: {
      listings: ['listing-prd-real-soda-ash-light-supply-1774333087', 'listing-prd-real-soda-ash-light-demand-1774333087'],
      matches: ['match-6ac88aca90208f0f'],
      connections: ['conn-1'],
      approvals: ['apr-2'],
      receipts: ['receipt-2'],
      opportunities: ['opp-1'],
      packages: ['pkg-1'],
      commercialActions: ['commercial-action-1774334377950'],
    },
  });

  assert.deepEqual(bundle, {
    scenarioLabel: 'wave-2-soda-ash-light',
    sourceRefs: [
      'vtip://soda-ash-import-procedure',
      'alibaba://soda-ash-light-supply',
    ],
    evidenceRefs: [
      'evidence://prd-real-account/1',
      'proposal://prd-real-account/1',
    ],
    traceIds: ['trace-prd-real-soda-ash-light-supply-1774333087'],
    workflowIds: ['WF-3'],
    recordIds: {
      listings: ['listing-prd-real-soda-ash-light-supply-1774333087', 'listing-prd-real-soda-ash-light-demand-1774333087'],
      matches: ['match-6ac88aca90208f0f'],
      connections: ['conn-1'],
      approvals: ['apr-2'],
      receipts: ['receipt-2'],
      opportunities: ['opp-1'],
      packages: ['pkg-1'],
      commercialActions: ['commercial-action-1774334377950'],
    },
  });
});
