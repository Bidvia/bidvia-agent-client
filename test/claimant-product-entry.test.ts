import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANONICAL_COMPANY_PUBLIC_ORG_ID,
  establishClaimantCanonicalCompanyPublicPrecondition,
  inspectClaimantHandoff,
  inspectClaimantOpportunityEndState,
  inspectClaimantOpportunityStatus,
  inspectClaimantPrecondition,
  inspectClaimantReadiness,
  repairClaimantReadiness,
  runClaimantHandoffPreparation,
  runClaimantTaskEntry,
} from '../src/business-universe/claimant.js';

test('inspectClaimantPrecondition reports ready when active org already matches canonical company-public', async () => {
  const result = await inspectClaimantPrecondition({
    async getAccountMe() {
      return {
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }],
      };
    },
  }, CANONICAL_COMPANY_PUBLIC_ORG_ID);

  assert.equal(result.stageSnapshot.stage, 'entry');
  assert.equal(result.stageSnapshot.state, 'ready');
  assert.equal(result.stageSnapshot.executability, 'canonical');
});

test('establishClaimantCanonicalCompanyPublicPrecondition accepts invite then selects canonical org when multi-org unresolved', async () => {
  const calls: string[] = [];
  let selected = false;
  const result = await establishClaimantCanonicalCompanyPublicPrecondition({
    async acceptAccountMembershipInvitation(input) {
      calls.push(`accept:${input.invitationToken}`);
      return { ok: true };
    },
    async selectOrg(input) {
      calls.push(`select:${input.orgId}`);
      selected = true;
      return { ok: true };
    },
    async getAccountMe() {
      return selected
        ? {
            account: { tenant_id: 'tenant-public' },
            active_org_context: { org_id: 'company-public' },
            memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }],
          }
        : {
            account: { tenant_id: 'tenant-public' },
            active_org_context: null,
            memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }],
          };
    },
  }, {
    invitationToken: 'invite-1',
    canonicalOrgId: 'company-public',
    now: '2026-05-10T12:00:00.000Z',
  });

  assert.deepEqual(calls, ['accept:invite-1', 'select:company-public']);
  assert.equal(result.stageSnapshot.state, 'ready');
});

test('inspectClaimantReadiness normalizes closure-status into a repairable stage snapshot', async () => {
  const result = await inspectClaimantReadiness({
    async getAccountAgent() {
      return {
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-1',
          owner_account_id: 'company-public',
        },
      };
    },
    async getAccountAgentClosureStatus() {
      return {
        recommended_next_step: 'complete_claimed_agent_self_service',
        next_step_kind: 'self_service_patch',
        next_step_route: '/runtime/account/agents/:agentId/self-service',
        next_action_owner: 'claimant',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['capability_profile_missing', 'participation_state_missing'],
        },
      };
    },
  }, 'agent-1');

  assert.equal(result.stageSnapshot.state, 'repairable');
  assert.equal(result.stageSnapshot.recommendedNextStep, 'complete_claimed_agent_self_service');
});

test('repairClaimantReadiness routes complete_claimed_agent_self_service to patchAgentSelfService', async () => {
  const calls: string[] = [];
  const result = await repairClaimantReadiness({
    async getAccountAgent() {
      return {
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-2',
          owner_account_id: 'company-public',
        },
      };
    },
    async getAccountAgentClosureStatus() {
      return {
        recommended_next_step: 'complete_claimed_agent_self_service',
        next_step_kind: 'self_service_patch',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['capability_profile_missing', 'participation_state_missing'],
        },
      };
    },
    async patchAgentSelfService(_agentId, input) {
      calls.push(JSON.stringify(input));
      return { dispatch_eligibility: { allowed: true } };
    },
    async createAccountAgentExternalBinding() {
      throw new Error('unexpected external binding');
    },
    async createAccountAgentDispatchAuthorityRequest() {
      throw new Error('unexpected dispatch authority request');
    },
  }, {
    agentId: 'agent-2',
    now: '2026-05-10T12:10:00.000Z',
    capabilityProfile: {
      domainStrengths: ['commercial-governance'],
      templateDomains: ['governed-assets'],
      workflowRoles: ['dispatcher'],
      allowedRuntimeScopes: ['live-control-plane'],
      qualitySignals: ['agent-self-described'],
      adoptionRate: 0.91,
      evidenceScore: 0.94,
      riskReliabilityBand: 'HIGH',
      routingPriority: 8,
    },
    participationState: {
      state: 'commercial-authority-bound',
      reason: 'ready',
      now: '2026-05-10T12:10:00.000Z',
    },
  });

  assert.equal(result.actionTaken, 'complete_claimed_agent_self_service');
  assert.equal(calls.length, 1);
});

test('repairClaimantReadiness routes complete_task_dispatch_opt_in to patchAgentSelfService', async () => {
  const calls: string[] = [];
  const result = await repairClaimantReadiness({
    async getAccountAgent() {
      return {
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-2b',
          owner_account_id: 'company-public',
        },
      };
    },
    async getAccountAgentClosureStatus() {
      return {
        recommended_next_step: 'complete_task_dispatch_opt_in',
        next_step_kind: 'task_dispatch_opt_in',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['task_dispatch_acceptance_missing'],
        },
      };
    },
    async patchAgentSelfService(_agentId, input) {
      calls.push(`patch:${JSON.stringify(input)}`);
      return { dispatch_eligibility: { allowed: true } };
    },
    async createAccountAgentExternalBinding() {
      throw new Error('unexpected external binding');
    },
    async createAccountAgentDispatchAuthorityRequest() {
      throw new Error('unexpected dispatch authority request');
    },
  }, {
    agentId: 'agent-2b',
    now: '2026-05-10T12:11:00.000Z',
    capabilityProfile: {
      domainStrengths: ['commercial-governance'],
      templateDomains: ['governed-assets'],
      workflowRoles: ['dispatcher'],
      allowedRuntimeScopes: ['live-control-plane'],
      qualitySignals: ['agent-self-described'],
      adoptionRate: 0.91,
      evidenceScore: 0.94,
      riskReliabilityBand: 'HIGH',
      routingPriority: 8,
    },
    participationState: {
      state: 'commercial-authority-bound',
      reason: 'ready',
      now: '2026-05-10T12:11:00.000Z',
    },
    taskDispatchAcceptance: {
      acceptsTaskDispatches: true,
      acceptedTaskDispatchScopes: ['COMMERCIAL_ACTION_REVIEW'],
    },
  });

  assert.equal(result.actionTaken, 'complete_task_dispatch_opt_in');
  assert.equal(calls.length, 1);
  assert.match(calls[0] ?? '', /taskDispatchAcceptance/);
  assert.match(calls[0] ?? '', /COMMERCIAL_ACTION_REVIEW/);
});

test('repairClaimantReadiness routes complete_external_binding to createAccountAgentExternalBinding', async () => {
  const calls: string[] = [];
  const result = await repairClaimantReadiness({
    async getAccountAgent() {
      return {
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-3',
          owner_account_id: 'company-public',
        },
      };
    },
    async getAccountAgentClosureStatus() {
      return {
        recommended_next_step: 'complete_external_binding',
        next_step_kind: 'external_binding',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['external_account_binding_missing'],
        },
      };
    },
    async patchAgentSelfService() {
      throw new Error('unexpected self-service patch');
    },
    async createAccountAgentExternalBinding(_agentId, input) {
      calls.push(`binding:${input.systemName}`);
      return { ok: true };
    },
    async createAccountAgentDispatchAuthorityRequest() {
      throw new Error('unexpected dispatch authority request');
    },
  }, {
    agentId: 'agent-3',
    now: '2026-05-10T12:20:00.000Z',
    externalBinding: {
      systemType: 'wms',
      systemName: 'closure-live-wms',
      externalAccountRef: 'ext-agent-3',
    },
  });

  assert.equal(result.actionTaken, 'complete_external_binding');
  assert.deepEqual(calls, ['binding:closure-live-wms']);
});

test('runClaimantHandoffPreparation creates and activates a claimant listing before inspecting handoff readiness', async () => {
  const calls: string[] = [];
  const result = await runClaimantHandoffPreparation({
    async createAccountAgentExecutionListing(agentId, input) {
      calls.push(`create:${agentId}:${input.listingId}`);
      return { listing: { listing_id: input.listingId } };
    },
    async activateAccountAgentExecutionListing(agentId, listingId) {
      calls.push(`activate:${agentId}:${listingId}`);
      return { listing: { listing_id: listingId } };
    },
    async getAccountMe() {
      return {
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
      };
    },
    async getAccountAgentExecutionListingMaterializationStatus() {
      return {
        materialization_stage: 'match_prerequisites_ready',
        recommended_next_step: 'handoff_to_operator_for_matching',
        next_step_kind: 'handoff_to_operator',
        operator_handoff: {
          owner: 'operator',
          route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1',
        },
      };
    },
  } as never, 'agent-4b', {
    listingId: 'listing-1',
    listingType: 'supply',
    category: 'basic inorganic industrial chemical',
    sku: 'sku-1',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-05-10T12:25:00.000Z',
    traceId: 'trace-1',
    idempotencyKey: 'idem-1',
    now: '2026-05-10T12:25:00.000Z',
  }, {
    verificationStatus: 'verified',
    now: '2026-05-10T12:25:01.000Z',
  });

  assert.deepEqual(calls, ['create:agent-4b:listing-1', 'activate:agent-4b:listing-1']);
  assert.equal(result.handoff.stageSnapshot.executability, 'executable-handoff');
});

test('runClaimantTaskEntry delegates to createTaskDispatch', async () => {
  const calls: string[] = [];
  const result = await runClaimantTaskEntry({
    async createTaskDispatch(agentId, input) {
      calls.push(`${agentId}:${input.taskKind}`);
      return { ok: true };
    },
  }, 'agent-4', {
    taskKind: 'COMMERCIAL_ACTION_REVIEW',
    taskRef: 'task://agent-4',
    reason: 'run task entry',
    now: '2026-05-10T12:30:00.000Z',
  });

  assert.deepEqual(calls, ['agent-4:COMMERCIAL_ACTION_REVIEW']);
  assert.deepEqual(result, { ok: true });
});

test('inspectClaimantHandoff marks company-public materialization as executable handoff', async () => {
  const result = await inspectClaimantHandoff({
    async getAccountMe() {
      return {
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
      };
    },
    async getAccountAgentExecutionListingMaterializationStatus() {
      return {
        materialization_stage: 'match_prerequisites_ready',
        recommended_next_step: 'handoff_to_operator_for_matching',
        next_step_kind: 'handoff_to_operator',
        operator_handoff: {
          owner: 'operator',
          route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1',
        },
      };
    },
  }, 'agent-5', 'listing-1');

  assert.equal(result.stageSnapshot.executability, 'executable-handoff');
  assert.equal(result.stageSnapshot.handoff?.mode, 'executable');
});

test('inspectClaimantOpportunityStatus routes claimant deeper readback through the claimant product helper', async () => {
  const result = await inspectClaimantOpportunityStatus({
    async getAccountAgentExecutionOpportunityStatus() {
      return {
        continuation_state: 'ALLOCATED',
        operator_handoff: {
          owner: 'operator',
          opportunity_id: 'opp-1',
        },
      };
    },
  } as never, 'agent-5', 'opp-1');

  assert.equal((result as { continuation_state: string }).continuation_state, 'ALLOCATED');
  assert.equal((result as { operator_handoff: { opportunity_id: string } }).operator_handoff.opportunity_id, 'opp-1');
});

test('inspectClaimantOpportunityEndState routes claimant deeper end-state readback through the claimant product helper', async () => {
  const result = await inspectClaimantOpportunityEndState({
    async getAccountAgentExecutionOpportunityEndState() {
      return {
        closure_class: 'product_closed',
        operator_handoff: {
          owner: 'operator',
          opportunity_id: 'opp-1',
        },
      };
    },
  } as never, 'agent-5', 'opp-1');

  assert.equal((result as { closure_class: string }).closure_class, 'product_closed');
  assert.equal((result as { operator_handoff: { opportunity_id: string } }).operator_handoff.opportunity_id, 'opp-1');
});
