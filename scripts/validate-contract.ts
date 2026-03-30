import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.js';
import { buildHeartbeatInput } from '../src/heartbeat.js';
import { buildSyncUploadInput } from '../src/sync.js';
import { buildEvidenceSubmissionInput } from '../src/evidence.js';
import { buildProposalSubmissionInput } from '../src/proposals.js';
import {
  buildCommercialActionScenarioPlan,
  readCommercialActionScenarioReview,
  runCommercialActionScenario,
} from '../src/commercial-action.js';
import {
  buildRegistrationLifecycleScenarioPlan,
  runRegistrationLifecycleScenario,
} from '../src/registration-lifecycle.js';
import {
  buildRegisteredAgentOperationsScenarioPlan,
  runRegisteredAgentOperationsScenario,
} from '../src/registered-agent-operations.js';
import {
  buildConnectionApprovalScenarioPlan,
  runConnectionApprovalScenario,
} from '../src/connection.js';
import {
  buildOpportunityPackageHandoffPlan,
  runOpportunityPackageHandoff,
} from '../src/handoffs.js';
import { buildIndustryUniverseScenarioPlan, runIndustryUniverseScenario } from '../src/universe.js';
import {
  buildMultiBusinessChainCoordinatorPlan,
  runMultiBusinessChainCoordinatorPostHandoff,
  runMultiBusinessChainCoordinatorPreHandoff,
} from '../src/coordinator.js';
import {
  buildReviewPacket,
  buildScenarioVerificationBundle,
  exportReviewPacket,
} from '../src/verification.js';

function createFetchRecorder() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchImpl };
}

async function main() {
  const { calls, fetchImpl } = createFetchRecorder();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-validate-1',
      sessionId: 'sess-validate-1',
      adminSessionId: 'admin-sess-validate-1',
      companyId: 'company-a',
    },
    fetchImpl,
  });
  const lifecycleClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-lifecycle-validate-1',
      sessionId: 'sess-validate-1',
    },
    fetchImpl,
  });
  const registeredOperationsClient = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      registrationId: 'areg-registered-ops-validate-1',
    },
    fetchImpl,
  });

  await client.createProvisionalAgent({ provisionalAgentRef: 'prov-validate-1', now: '2026-03-25T19:00:00Z' });
  await client.queryProvisionalAgent('prov-validate-1');
  await client.claimProvisionalAgent({ provisionalAgentRef: 'prov-validate-1', claimToken: 'claim-validate-1', now: '2026-03-25T19:01:00Z' });
  await client.postHeartbeat(buildHeartbeatInput('2026-03-25T19:02:00Z', '2026-03-25T19:07:00Z'));
  await client.uploadSync(buildSyncUploadInput('cursor-validate-1', 2, '2026-03-25T19:03:00Z'));
  await client.downloadSync();
  await client.submitEvidence(buildEvidenceSubmissionInput('evidence://validate/1', 'provider_receipt', 'validation evidence payload', '2026-03-25T19:04:00Z'));
  await client.submitProposal(buildProposalSubmissionInput('template_change', 'proposal://validate/1', 'validation proposal payload', '2026-03-25T19:05:00Z'));
  const industryUniversePlan = buildIndustryUniverseScenarioPlan({
    scenarioId: 'scenario-industry-universe-validate-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://validate/1'],
    traceIds: ['trace-validate-1'],
    workflowIds: ['wf-validate-1'],
    createListing: {
      listingId: 'listing-validate-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-03-25T19:06:00Z',
      traceId: 'trace-validate-1',
      idempotencyKey: 'listing-validate-1',
      now: '2026-03-25T19:06:00Z',
    },
    activateListing: {
      now: '2026-03-25T19:07:00Z',
    },
    generateMatchCandidates: {
      upstreamDecision: 'READY_FOR_ROUTING',
      requiredEvidenceLevel: 1,
      detectedEvidenceLevel: 1,
      workflowRunId: 'wf-validate-1',
      triggerEventId: 'evt-validate-1',
      topN: 10,
      now: '2026-03-25T19:08:00Z',
    },
  });
  const industryUniverseBundle = buildScenarioVerificationBundle({
    scenario: industryUniversePlan.envelope,
    verificationMode: 'review-safe',
    completedRouteChain: industryUniversePlan.envelope.expectedRouteChain,
    recordIds: {
      listings: ['listing-validate-1'],
      matches: ['match-validate-1'],
    },
  });
  const reviewPacket = buildReviewPacket({
    scenario: industryUniversePlan.envelope,
    bundle: industryUniverseBundle,
  });
  const exportedReviewPacket = exportReviewPacket(reviewPacket);
  await runIndustryUniverseScenario(client, industryUniversePlan);
  const commercialActionPlan = buildCommercialActionScenarioPlan({
    scenarioId: 'scenario-commercial-action-validate-1',
    scenarioLabel: 'commercial-action-package-send',
    sourceRefs: ['source://package/pkg-validate-1'],
    evidenceRefs: ['evidence://approval/apr-validate-1'],
    traceIds: ['trace-validate-commercial-1'],
    workflowIds: ['wf-validate-commercial-1'],
    createCommercialAction: {
      governedAction: 'OPPORTUNITY_PACKAGE_SEND',
      subjectType: 'OPPORTUNITY_PACKAGE',
      subjectId: 'pkg-validate-1',
      traceId: 'trace-validate-commercial-1',
      workflowId: 'wf-validate-commercial-1',
      now: '2026-03-25T19:08:30Z',
    },
    policyCheckCommercialAction: {
      commercialActionRequestId: 'commercial-action-validate-1',
      policyVersion: 'policy-external-write-minimum-boundary',
      outcome: 'PASS',
      now: '2026-03-25T19:08:45Z',
    },
    requestCommercialActionApproval: {
      commercialActionRequestId: 'commercial-action-validate-1',
      approvalRequestId: 'apr-validate-1',
      now: '2026-03-25T19:08:50Z',
    },
    executeCommercialAction: {
      commercialActionRequestId: 'commercial-action-validate-1',
      approvalRequestId: 'apr-validate-1',
      receiptId: 'receipt-validate-1',
      approvalResult: 'APPROVED',
      resultStatus: 'SUCCEEDED',
      auditId: 'audit-validate-1',
      now: '2026-03-25T19:08:55Z',
    },
  });
  await runCommercialActionScenario(client, commercialActionPlan);
  await readCommercialActionScenarioReview(client, commercialActionPlan);
  const connectionApprovalPlan = buildConnectionApprovalScenarioPlan({
    scenarioId: 'scenario-connection-approval-validate-1',
    scenarioLabel: 'connection-approval-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://validate/1'],
    traceIds: ['trace-validate-2'],
    workflowIds: ['wf-validate-2'],
    createConnectionRequest: {
      sourceMatchId: 'match-validate-1',
      requesterActorId: 'actor-1',
      requesterCompanyId: 'company-a',
      riskTier: 'medium',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'buyer_contact_request',
      now: '2026-03-25T19:09:00Z',
    },
    approveConnectionRequest: {
      approvalRequestId: 'approval-validate-1',
      actorId: 'actor-1',
      decision: 'approve',
      now: '2026-03-25T19:10:00Z',
    },
  });
  await runConnectionApprovalScenario(client, connectionApprovalPlan);
  const opportunityPackageHandoffPlan = buildOpportunityPackageHandoffPlan({
    scenarioId: 'scenario-opportunity-package-handoff-validate-1',
    scenarioLabel: 'opportunity-package-handoff-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://validate/1'],
    traceIds: ['trace-validate-3'],
    workflowIds: ['wf-validate-3'],
    exportOpportunityPackage: {
      opportunityId: 'opportunity-validate-1',
      renderTemplateId: 'template-validate-1',
      contentRef: 'content://packages/opportunity-validate-1',
      redactionProfile: 'review-safe',
      targetSystem: 'downstream-dataroom',
      operationType: 'export',
      nodeId: 'node-validate-1',
      runtimeId: 'runtime-validate-1',
      agentId: 'agent-validate-1',
      boundAccountId: 'account-validate-1',
      now: '2026-03-25T19:11:00Z',
    },
  });
  await runOpportunityPackageHandoff(client, opportunityPackageHandoffPlan);
  const coordinatorPlan = buildMultiBusinessChainCoordinatorPlan({
    coordinatorId: 'coordinator-validate-1',
    coordinatorLabel: 'industry-to-package-with-commercial-action',
    industryUniverse: {
      scenarioId: 'scenario-industry-universe-validate-1',
      scenarioLabel: 'industry-universe-soda-ash-light',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://validate/1'],
      traceIds: ['trace-validate-1'],
      workflowIds: ['wf-validate-1'],
      createListing: {
        listingId: 'listing-validate-1',
        listingType: 'supply',
        category: 'basic inorganic industrial chemical',
        sku: 'sodium-carbonate-soda-ash-light',
        quantityValue: '15',
        quantityUnit: 'tons',
        regionSummary: 'China -> Vietnam',
        verificationStatus: 'verified',
        freshnessTs: '2026-03-25T19:06:00Z',
        traceId: 'trace-validate-1',
        idempotencyKey: 'listing-validate-1',
        now: '2026-03-25T19:06:00Z',
      },
      activateListing: {
        now: '2026-03-25T19:07:00Z',
      },
      generateMatchCandidates: {
        upstreamDecision: 'READY_FOR_ROUTING',
        requiredEvidenceLevel: 1,
        detectedEvidenceLevel: 1,
        workflowRunId: 'wf-validate-1',
        triggerEventId: 'evt-validate-1',
        topN: 10,
        now: '2026-03-25T19:08:00Z',
      },
    },
    connectionApproval: {
      scenarioId: 'scenario-connection-approval-validate-1',
      scenarioLabel: 'connection-approval-soda-ash-light',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://validate/1'],
      traceIds: ['trace-validate-2'],
      workflowIds: ['wf-validate-2'],
      createConnectionRequest: {
        sourceMatchId: 'match-validate-1',
        requesterActorId: 'actor-1',
        requesterCompanyId: 'company-a',
        riskTier: 'medium',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'buyer_contact_request',
        now: '2026-03-25T19:09:00Z',
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-validate-1',
        actorId: 'actor-1',
        decision: 'approve',
        now: '2026-03-25T19:10:00Z',
      },
    },
    opportunityPackageHandoff: {
      scenarioId: 'scenario-opportunity-package-handoff-validate-1',
      scenarioLabel: 'opportunity-package-handoff-soda-ash-light',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://validate/1'],
      traceIds: ['trace-validate-3'],
      workflowIds: ['wf-validate-3'],
      exportOpportunityPackage: {
        opportunityId: 'opportunity-validate-1',
        renderTemplateId: 'template-validate-1',
        contentRef: 'content://packages/opportunity-validate-1',
        redactionProfile: 'review-safe',
        targetSystem: 'downstream-dataroom',
        operationType: 'export',
        nodeId: 'node-validate-1',
        runtimeId: 'runtime-validate-1',
        agentId: 'agent-validate-1',
        boundAccountId: 'account-validate-1',
        now: '2026-03-25T19:11:00Z',
      },
    },
    commercialActionContinuation: {
      scenarioId: 'scenario-commercial-action-validate-1',
      scenarioLabel: 'commercial-action-package-send',
      sourceRefs: ['source://package/pkg-validate-1'],
      evidenceRefs: ['evidence://approval/apr-validate-1'],
      traceIds: ['trace-validate-commercial-1'],
      workflowIds: ['wf-validate-commercial-1'],
      createCommercialAction: {
        governedAction: 'OPPORTUNITY_PACKAGE_SEND',
        subjectType: 'OPPORTUNITY_PACKAGE',
        subjectId: 'pkg-validate-1',
        traceId: 'trace-validate-commercial-1',
        workflowId: 'wf-validate-commercial-1',
        now: '2026-03-25T19:08:30Z',
      },
      policyCheckCommercialAction: {
        commercialActionRequestId: 'commercial-action-validate-1',
        policyVersion: 'policy-external-write-minimum-boundary',
        outcome: 'PASS',
        now: '2026-03-25T19:08:45Z',
      },
      requestCommercialActionApproval: {
        commercialActionRequestId: 'commercial-action-validate-1',
        approvalRequestId: 'approval-validate-1',
        now: '2026-03-25T19:08:50Z',
      },
      executeCommercialAction: {
        commercialActionRequestId: 'commercial-action-validate-1',
        approvalRequestId: 'approval-validate-1',
        receiptId: 'receipt-validate-1',
        approvalResult: 'APPROVED',
        resultStatus: 'SUCCEEDED',
        auditId: 'audit-validate-1',
        now: '2026-03-25T19:08:55Z',
      },
    },
  });
  const coordinatorPreHandoff = await runMultiBusinessChainCoordinatorPreHandoff(client, coordinatorPlan);
  const coordinatorPostHandoff = await runMultiBusinessChainCoordinatorPostHandoff(
    client,
    coordinatorPlan,
    coordinatorPreHandoff.externalHandoffBoundary,
  );
  const registrationLifecyclePlan = buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-validate-1',
    scenarioLabel: 'registration-lifecycle-agent-1',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-1'],
    traceIds: ['trace-registration-1'],
    workflowIds: ['wf-registration-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-lifecycle-validate-1',
      now: '2026-03-25T19:12:00Z',
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-lifecycle-validate-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-lifecycle-validate-1',
      claimToken: 'claim-lifecycle-validate-1',
      now: '2026-03-25T19:13:00Z',
    },
    postHeartbeat: {
      now: '2026-03-25T19:14:00Z',
      expiresAt: '2026-03-25T19:19:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-lifecycle-validate-1',
      objectCount: 4,
      now: '2026-03-25T19:15:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registration/receipt-1',
      evidenceKind: 'provider_receipt',
      summary: 'registration evidence payload',
      now: '2026-03-25T19:16:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registration/1',
      summary: 'registration proposal payload',
      now: '2026-03-25T19:17:00Z',
    },
    registrationId: 'areg-lifecycle-validate-1',
  });
  await runRegistrationLifecycleScenario(lifecycleClient, registrationLifecyclePlan);
  const registeredAgentOperationsPlan = buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-validate-1',
    scenarioLabel: 'registered-agent-operations-agent-1',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-1'],
    traceIds: ['trace-registered-agent-1'],
    workflowIds: ['wf-registered-agent-1'],
    postHeartbeat: {
      now: '2026-03-25T19:18:00Z',
      expiresAt: '2026-03-25T19:23:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-registered-ops-validate-1',
      objectCount: 5,
      now: '2026-03-25T19:19:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registered-agent/receipt-1',
      evidenceKind: 'provider_receipt',
      summary: 'registered operations evidence payload',
      now: '2026-03-25T19:20:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered operations proposal payload',
      now: '2026-03-25T19:21:00Z',
    },
    registrationId: 'areg-registered-ops-validate-1',
  });
  await runRegisteredAgentOperationsScenario(registeredOperationsClient, registeredAgentOperationsPlan);

  const urls = calls.map((call) => String(call.input));
  assert.deepEqual(urls, [
    'http://127.0.0.1:8787/runtime/agents/provisional',
    'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-validate-1',
    'http://127.0.0.1:8787/runtime/agents/provisional/claim',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/heartbeat?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/sync/upload?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/sync/download?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/evidence-submissions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-validate-1/proposals?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/activate?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/match-candidates?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/policy-check?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/request-approval?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/execute?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/status?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/receipt?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/audit?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/connection-requests?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/approvals/approval-validate-1/decision?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/opportunities/opportunity-validate-1/package-export?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/activate?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/listings/listing-validate-1/match-candidates?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/connection-requests?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/approvals/approval-validate-1/decision?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/opportunities/opportunity-validate-1/package-export?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/policy-check?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/request-approval?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/commercial-actions/commercial-action-validate-1/execute?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/provisional',
    'http://127.0.0.1:8787/runtime/agents/provisional?provisional_agent_ref=prov-lifecycle-validate-1',
    'http://127.0.0.1:8787/runtime/agents/provisional/claim',
    'http://127.0.0.1:8787/runtime/agents/areg-lifecycle-validate-1/heartbeat?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-lifecycle-validate-1/sync/upload?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-lifecycle-validate-1/sync/download?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-lifecycle-validate-1/evidence-submissions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-lifecycle-validate-1/proposals?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-registered-ops-validate-1/heartbeat?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-registered-ops-validate-1/sync/upload?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-registered-ops-validate-1/sync/download?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-registered-ops-validate-1/evidence-submissions?tenant_id=tenant-a',
    'http://127.0.0.1:8787/runtime/agents/areg-registered-ops-validate-1/proposals?tenant_id=tenant-a',
  ]);

  const claimHeaders = calls[2]?.init?.headers as Record<string, string>;
  const heartbeatHeaders = calls[3]?.init?.headers as Record<string, string>;
  const listingHeaders = calls[8]?.init?.headers as Record<string, string>;
  const createCommercialActionHeaders = calls[11]?.init?.headers as Record<string, string>;
  const getCommercialActionStatusHeaders = calls[15]?.init?.headers as Record<string, string>;
  const createConnectionRequestHeaders = calls[18]?.init?.headers as Record<string, string>;
  const approveConnectionRequestHeaders = calls[19]?.init?.headers as Record<string, string>;
  const exportOpportunityPackageHeaders = calls[20]?.init?.headers as Record<string, string>;
  const lifecycleClaimHeaders = calls[33]?.init?.headers as Record<string, string>;
  const lifecycleHeartbeatHeaders = calls[34]?.init?.headers as Record<string, string>;
  const registeredOperationsHeartbeatHeaders = calls[39]?.init?.headers as Record<string, string>;

  assert.equal(claimHeaders['x-bidvia-session-id'], 'sess-validate-1');
  assert.equal(heartbeatHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(heartbeatHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(listingHeaders['x-authorized-company-id'], 'company-a');
  assert.equal(createCommercialActionHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(createCommercialActionHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(createCommercialActionHeaders['x-authorized-company-id'], 'company-a');
  assert.equal(getCommercialActionStatusHeaders['x-bidvia-admin-session-id'], 'admin-sess-validate-1');
  assert.equal(createConnectionRequestHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(approveConnectionRequestHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(exportOpportunityPackageHeaders['x-authorized-company-id'], 'company-a');
  assert.equal(lifecycleClaimHeaders['x-bidvia-session-id'], 'sess-validate-1');
  assert.equal(lifecycleHeartbeatHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(lifecycleHeartbeatHeaders['x-bidvia-principal-id'], 'actor-1');
  assert.equal(registeredOperationsHeartbeatHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(registeredOperationsHeartbeatHeaders['x-bidvia-principal-id'], 'actor-1');

  const claimBody = JSON.parse(String(calls[2]?.init?.body));
  const heartbeatBody = JSON.parse(String(calls[3]?.init?.body));
  const listingBody = JSON.parse(String(calls[8]?.init?.body));
  const matchCandidatesBody = JSON.parse(String(calls[10]?.init?.body));
  const createCommercialActionBody = JSON.parse(String(calls[11]?.init?.body));
  const policyCheckCommercialActionBody = JSON.parse(String(calls[12]?.init?.body));
  const requestCommercialActionApprovalBody = JSON.parse(String(calls[13]?.init?.body));
  const executeCommercialActionBody = JSON.parse(String(calls[14]?.init?.body));
  const createConnectionRequestBody = JSON.parse(String(calls[18]?.init?.body));
  const approveConnectionRequestBody = JSON.parse(String(calls[19]?.init?.body));
  const exportOpportunityPackageBody = JSON.parse(String(calls[20]?.init?.body));

  assert.deepEqual(claimBody, {
    provisional_agent_ref: 'prov-validate-1',
    claim_token: 'claim-validate-1',
    now: '2026-03-25T19:01:00Z',
  });
  assert.deepEqual(heartbeatBody, {
    now: '2026-03-25T19:02:00Z',
    expires_at: '2026-03-25T19:07:00Z',
  });
  assert.equal(listingBody.listing_id, 'listing-validate-1');
  assert.equal(listingBody.trace_id, 'trace-validate-1');
  assert.equal(matchCandidatesBody.workflow_run_id, 'wf-validate-1');
  assert.equal(matchCandidatesBody.trigger_event_id, 'evt-validate-1');
  assert.deepEqual(createCommercialActionBody, {
    governed_action: 'OPPORTUNITY_PACKAGE_SEND',
    subject_type: 'OPPORTUNITY_PACKAGE',
    subject_id: 'pkg-validate-1',
    trace_id: 'trace-validate-commercial-1',
    workflow_id: 'wf-validate-commercial-1',
    now: '2026-03-25T19:08:30Z',
  });
  assert.deepEqual(policyCheckCommercialActionBody, {
    policy_version: 'policy-external-write-minimum-boundary',
    outcome: 'PASS',
    now: '2026-03-25T19:08:45Z',
  });
  assert.deepEqual(requestCommercialActionApprovalBody, {
    approval_request_id: 'apr-validate-1',
    now: '2026-03-25T19:08:50Z',
  });
  assert.deepEqual(executeCommercialActionBody, {
    approval_request_id: 'apr-validate-1',
    receipt_id: 'receipt-validate-1',
    approval_result: 'APPROVED',
    result_status: 'SUCCEEDED',
    audit_id: 'audit-validate-1',
    now: '2026-03-25T19:08:55Z',
  });
  assert.equal(createConnectionRequestBody.source_match_id, 'match-validate-1');
  assert.equal(createConnectionRequestBody.requester_company_id, 'company-a');
  assert.equal(approveConnectionRequestBody.actor_id, 'actor-1');
  assert.equal(approveConnectionRequestBody.decision, 'approve');
  assert.equal(exportOpportunityPackageBody.render_template_id, 'template-validate-1');
  assert.equal(exportOpportunityPackageBody.bound_account_id, 'account-validate-1');

  assert.deepEqual(coordinatorPreHandoff.externalHandoffBoundary, {
    boundaryKey: 'approval-to-opportunity',
    status: 'requires-caller-known-ids',
    approvalRequestId: 'approval-validate-1',
    requiredKnownIds: ['opportunityId'],
    suppliedKnownIds: {
      opportunityId: 'opportunity-validate-1',
    },
  });
  assert.equal(coordinatorPreHandoff.industryUniverse.completedRouteChain.length, 3);
  assert.equal(coordinatorPreHandoff.connectionApproval.completedRouteChain.length, 2);
  assert.deepEqual(coordinatorPostHandoff.externalHandoffBoundary, coordinatorPreHandoff.externalHandoffBoundary);
  assert.equal(coordinatorPostHandoff.opportunityPackageHandoff.completedRouteChain.length, 1);
  assert.equal(coordinatorPostHandoff.commercialActionContinuation?.verificationBundle.completedRouteChain.length, 4);

  const coordinatorCreateConnectionRequestHeaders = calls[24]?.init?.headers as Record<string, string>;
  const coordinatorExportOpportunityPackageHeaders = calls[26]?.init?.headers as Record<string, string>;
  assert.equal(coordinatorCreateConnectionRequestHeaders['x-authorized-tenant-id'], 'tenant-a');
  assert.equal(coordinatorExportOpportunityPackageHeaders['x-authorized-company-id'], 'company-a');

  const coordinatorCreateConnectionRequestBody = JSON.parse(String(calls[24]?.init?.body));
  const coordinatorExportOpportunityPackageBody = JSON.parse(String(calls[26]?.init?.body));
  const coordinatorCreateCommercialActionBody = JSON.parse(String(calls[27]?.init?.body));
  const lifecycleClaimBody = JSON.parse(String(calls[33]?.init?.body));
  const lifecycleHeartbeatBody = JSON.parse(String(calls[34]?.init?.body));
  const lifecycleUploadSyncBody = JSON.parse(String(calls[35]?.init?.body));
  const lifecycleEvidenceBody = JSON.parse(String(calls[37]?.init?.body));
  const lifecycleProposalBody = JSON.parse(String(calls[38]?.init?.body));
  const registeredOperationsHeartbeatBody = JSON.parse(String(calls[39]?.init?.body));
  const registeredOperationsUploadSyncBody = JSON.parse(String(calls[40]?.init?.body));
  const registeredOperationsEvidenceBody = JSON.parse(String(calls[42]?.init?.body));
  const registeredOperationsProposalBody = JSON.parse(String(calls[43]?.init?.body));
  assert.equal(coordinatorCreateConnectionRequestBody.source_match_id, 'match-validate-1');
  assert.equal(coordinatorExportOpportunityPackageBody.render_template_id, 'template-validate-1');
  assert.equal(coordinatorCreateCommercialActionBody.subject_id, 'pkg-validate-1');
  assert.deepEqual(lifecycleClaimBody, {
    provisional_agent_ref: 'prov-lifecycle-validate-1',
    claim_token: 'claim-lifecycle-validate-1',
    now: '2026-03-25T19:13:00Z',
  });
  assert.deepEqual(lifecycleHeartbeatBody, {
    now: '2026-03-25T19:14:00Z',
    expires_at: '2026-03-25T19:19:00Z',
  });
  assert.deepEqual(lifecycleUploadSyncBody, {
    cursor_ref: 'cursor-lifecycle-validate-1',
    object_count: 4,
    now: '2026-03-25T19:15:00Z',
  });
  assert.deepEqual(lifecycleEvidenceBody, {
    evidence_ref: 'evidence://registration/receipt-1',
    evidence_kind: 'provider_receipt',
    summary: 'registration evidence payload',
    now: '2026-03-25T19:16:00Z',
  });
  assert.deepEqual(lifecycleProposalBody, {
    proposal_type: 'template_change',
    proposal_ref: 'proposal://registration/1',
    summary: 'registration proposal payload',
    now: '2026-03-25T19:17:00Z',
  });
  assert.deepEqual(registeredOperationsHeartbeatBody, {
    now: '2026-03-25T19:18:00Z',
    expires_at: '2026-03-25T19:23:00Z',
  });
  assert.deepEqual(registeredOperationsUploadSyncBody, {
    cursor_ref: 'cursor-registered-ops-validate-1',
    object_count: 5,
    now: '2026-03-25T19:19:00Z',
  });
  assert.deepEqual(registeredOperationsEvidenceBody, {
    evidence_ref: 'evidence://registered-agent/receipt-1',
    evidence_kind: 'provider_receipt',
    summary: 'registered operations evidence payload',
    now: '2026-03-25T19:20:00Z',
  });
  assert.deepEqual(registeredOperationsProposalBody, {
    proposal_type: 'template_change',
    proposal_ref: 'proposal://registered-agent/1',
    summary: 'registered operations proposal payload',
    now: '2026-03-25T19:21:00Z',
  });

  assert.equal(reviewPacket.verificationMode, 'review-safe');
  assert.equal(reviewPacket.status, 'complete');
  assert.deepEqual(reviewPacket.summary, {
    sourceRefCount: industryUniversePlan.envelope.sourceRefs.length,
    evidenceRefCount: industryUniversePlan.envelope.evidenceRefs.length,
    traceIdCount: industryUniversePlan.envelope.traceIds.length,
    workflowIdCount: industryUniversePlan.envelope.workflowIds.length,
    expectedRouteCount: industryUniversePlan.envelope.expectedRouteChain.length,
    completedRouteCount: industryUniverseBundle.completedRouteChain.length,
    pendingRouteCount:
      industryUniversePlan.envelope.expectedRouteChain.length - industryUniverseBundle.completedRouteChain.length,
    recordGroupCount: 2,
    totalRecordCount: 2,
  });
  assert.deepEqual(reviewPacket.sections, [
    {
      sectionKey: 'scenario',
      title: 'Scenario facts',
      entries: [...industryUniversePlan.envelope.sourceRefs],
    },
    {
      sectionKey: 'evidence',
      title: 'Evidence refs',
      entries: [...industryUniversePlan.envelope.evidenceRefs],
    },
    {
      sectionKey: 'traceability',
      title: 'Traceability refs',
      entries: [
        ...industryUniversePlan.envelope.traceIds,
        ...industryUniversePlan.envelope.workflowIds,
      ],
    },
    {
      sectionKey: 'routes',
      title: 'Route coverage',
      entries: industryUniversePlan.envelope.expectedRouteChain.map(
        (routeStep, index) => `completed:${index + 1}/${industryUniversePlan.envelope.expectedRouteChain.length}:${routeStep.routeKey}:requires=${routeStep.requiredContext.join('|')}`,
      ),
    },
    {
      sectionKey: 'verification',
      title: 'Verification facts',
      entries: [
        'verification-mode:review-safe',
        'review-packet-status:complete',
        `completed-routes:${industryUniverseBundle.completedRouteChain.length}/${industryUniversePlan.envelope.expectedRouteChain.length}`,
        'pending-routes:0',
        'next-pending-route:none',
        'route-coverage-note:completed-prefix-only',
        'server-truth-claimed:false',
        'adjudication-outcome-included:false',
      ],
    },
    {
      sectionKey: 'records',
      title: 'Recorded ids',
      entries: [
        'record-group:listings:count=1',
        'listings:listing-validate-1',
        'record-group:matches:count=1',
        'matches:match-validate-1',
      ],
    },
  ]);
  assert.notEqual(exportedReviewPacket, reviewPacket);
  assert.deepEqual(exportedReviewPacket, reviewPacket);
  assert.throws(
    () => {
      exportedReviewPacket.sections[0]?.entries.push('mutated-entry');
    },
    /object is not extensible|read only|readonly/i,
  );

  console.log('Bidvia agent client contract validation passed.');
}

void main();
