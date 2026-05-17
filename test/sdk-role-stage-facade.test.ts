import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

test('BidviaClient exposes claimant role-stage facade methods without requiring raw helper stitching', async () => {
  const client = Object.assign(new BidviaClient({
    baseUrl: 'https://api.bidvia.cn',
    context: {
      tenantId: 'tenant-public',
      sessionId: 'sess-1',
      principalId: 'claimed:agent-1',
      companyId: 'company-public',
    },
  }), {
    async getAccountMe() {
      return {
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public' }],
      };
    },
    async getAccountAgent() {
      return { registration: { tenant_id: 'tenant-public', principal_id: 'claimed:agent-1', owner_account_id: 'company-public' } };
    },
    async getAccountAgentClosureStatus() {
      return { dispatch_eligibility: { allowed: true }, recommended_next_step: 'dispatch_ready', next_step_kind: 'task_entry_ready' };
    },
    async updateAccountAgentExecutionListing() {
      return { listing: { listing_id: 'listing-1', status: 'draft' } };
    },
    async getAccountAgentExecutionOpportunityStatus() {
      return { continuation_state: 'ALLOCATED' };
    },
    async getAccountAgentExecutionOpportunityEndState() {
      return { closure_class: 'product_closed' };
    },
  });

  const precondition = await client.claimant.precondition.inspect();
  const readiness = await client.claimant.readiness.inspect('agent-1');
  const listingUpdate = await client.claimant.handoff.updateListing('agent-1', 'listing-1', {
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '18',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-05-12T11:00:00Z',
    traceId: 'trace-1',
    now: '2026-05-12T11:00:00Z',
  });
  const opportunityStatus = await client.claimant.handoff.readOpportunityStatus('agent-1', 'opp-1');
  const opportunityEndState = await client.claimant.handoff.readOpportunityEndState('agent-1', 'opp-1');

  assert.equal(precondition.stageSnapshot.stage, 'entry');
  assert.equal(readiness.stageSnapshot.stage, 'task-entry');
  assert.equal(listingUpdate.listing.listing_id, 'listing-1');
  assert.equal(opportunityStatus.continuation_state, 'ALLOCATED');
  assert.equal(opportunityEndState.closure_class, 'product_closed');
});

test('BidviaClient exposes operator progression and closure facades', async () => {
  const client = Object.assign(new BidviaClient({
    baseUrl: 'https://api.bidvia.cn',
    context: {
      tenantId: 'tenant-public',
      adminSessionId: 'admin-session-1',
      principalId: 'operator-system',
      companyId: 'company-public',
    },
  }), {
    async createOperatorConnection() {
      return { connectionRequest: { approval_request_id: 'apr-1' } };
    },
    async approveOperatorConnection() {
      return { resolution: { artifacts: { opportunity: { opportunity_id: 'opp-1' } } } };
    },
    async getOperatorCommercialActionStatus() {
      return { continuity_state: 'EXECUTION_RECORDED' };
    },
    async getOperatorCommercialActionReceipt() {
      return { receipt: { receipt_id: 'receipt-1' } };
    },
    async getOperatorCommercialActionAudit() {
      return { audit_link: { audit_id: 'audit-1' } };
    },
  });

  const progression = await client.operator.progression.connect({
    connection: {
      companyId: 'company-public',
      sourceMatchId: 'match-1',
      requesterActorId: 'operator-system',
      requesterCompanyId: 'company-public',
      riskTier: 'HIGH',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'CONTACT_SHARE',
      now: '2026-05-11T18:00:00.000Z',
    },
    approval: {
      approvalRequestId: 'placeholder',
      actorId: 'operator-system',
      decision: 'APPROVE',
      now: '2026-05-11T18:00:01.000Z',
    },
  });
  const closure = await client.operator.closure.inspect({ commercialActionRequestId: 'car-1' });

  assert.equal(progression.approval.resolution.artifacts.opportunity.opportunity_id, 'opp-1');
  assert.equal(closure.audit.audit_link.audit_id, 'audit-1');
});

test('BidviaClient exposes universe facade methods above claimant and operator packages', async () => {
  const client = Object.assign(new BidviaClient({
    baseUrl: 'https://api.bidvia.cn',
    context: { tenantId: 'tenant-public', sessionId: 'sess-1' },
  }), {
    async getAccountMe() {
      return {
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public' }],
      };
    },
  });

  const inspectResult = await client.universe.inspect({ claimant: {} });
  const explainResult = await client.universe.explain({ claimant: {} });

  assert.equal(inspectResult.role, 'claimant');
  assert.equal(explainResult.current.nextStep.stage, 'readiness');
});

test('BidviaClient exposes a bounded platformManaged facade instead of omitting the role namespace', async () => {
  const client = new BidviaClient({
    baseUrl: 'https://api.bidvia.cn',
    context: { tenantId: 'tenant-public', principalId: 'platform-system', companyId: 'company-public' },
  });

  const entry = await client.platformManaged.entry.inspect();
  const readiness = await client.platformManaged.readiness.inspect();
  const progression = await client.platformManaged.progression.run();

  assert.equal(entry.stageSnapshot.executability, 'later-wave-stop');
  assert.equal(readiness.stageSnapshot.executability, 'later-wave-stop');
  assert.equal(progression.stageSnapshot.executability, 'later-wave-stop');
});
