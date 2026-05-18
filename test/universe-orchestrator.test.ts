import test from 'node:test';
import assert from 'node:assert/strict';

import { explainUniverse, inspectUniverse, runUniverse } from '../src/business-universe/orchestrator.ts';

test('inspectUniverse detects claimant entry and emits deterministic readiness next step', async () => {
  const result = await inspectUniverse({
    getAccountMe: async () => ({
      account: { tenant_id: 'tenant-public' },
      active_org_context: { org_id: 'company-public' },
      memberships: [{ org_id: 'company-public' }],
    }),
  } as never, {
    claimant: {},
  });

  assert.equal(result.role, 'claimant');
  assert.equal(result.stageSnapshot.stage, 'entry');
  assert.equal(result.nextStep.role, 'claimant');
  assert.equal(result.nextStep.stage, 'readiness');
  assert.equal(result.nextStep.kind, 'continue');
});

test('inspectUniverse maps executable claimant handoff into an operator baton handoff', async () => {
  const result = await inspectUniverse({
    getAccountMe: async () => ({
      account: { tenant_id: 'tenant-public' },
      active_org_context: { org_id: 'company-public' },
    }),
    getAccountAgentExecutionListingMaterializationStatus: async () => ({
      dispatch_eligibility: { allowed: true },
      operator_handoff: { route: '/operator/matches', owner: 'operator', mode: 'executable' },
      next_step_kind: 'operator_handoff',
      recommended_next_step: 'continue_operator_handoff',
    }),
  } as never, {
    claimant: {
      agentId: 'agent-1',
      listingId: 'listing-1',
    },
  });

  assert.equal(result.role, 'claimant');
  assert.equal(result.stageSnapshot.executability, 'executable-handoff');
  assert.equal(result.nextStep.role, 'operator');
  assert.equal(result.nextStep.stage, 'handoff');
  assert.equal(result.nextStep.kind, 'handoff');
});

test('runUniverse prepares claimant handoff and emits an operator baton handoff state', async () => {
  const calls: string[] = [];
  const result = await runUniverse({
    createAccountAgentExecutionListing: async (agentId: string, input: { listingId: string }) => {
      calls.push(`create:${agentId}:${input.listingId}`);
      return { listing: { listing_id: input.listingId } };
    },
    activateAccountAgentExecutionListing: async (agentId: string, listingId: string) => {
      calls.push(`activate:${agentId}:${listingId}`);
      return { listing: { listing_id: listingId } };
    },
    getAccountMe: async () => ({
      account: { tenant_id: 'tenant-public' },
      active_org_context: { org_id: 'company-public' },
    }),
    getAccountAgentExecutionListingMaterializationStatus: async () => ({
      materialization_stage: 'match_prerequisites_ready',
      recommended_next_step: 'handoff_to_operator_for_matching',
      next_step_kind: 'handoff_to_operator',
      operator_handoff: { owner: 'operator', route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1' },
    }),
  } as never, {
    claimant: {
      agentId: 'agent-1',
      handoffPreparation: {
        listing: {
          listingId: 'listing-1',
          listingType: 'supply',
          category: 'basic inorganic industrial chemical',
          sku: 'sku-1',
          quantityValue: '15',
          quantityUnit: 'tons',
          regionSummary: 'China -> Vietnam',
          verificationStatus: 'verified',
          freshnessTs: '2026-05-11T12:59:00.000Z',
          traceId: 'trace-1',
          idempotencyKey: 'idem-1',
          now: '2026-05-11T12:59:00.000Z',
        },
        activation: {
          verificationStatus: 'verified',
          now: '2026-05-11T12:59:01.000Z',
        },
      },
    },
  });

  assert.deepEqual(calls, ['create:agent-1:listing-1', 'activate:agent-1:listing-1']);
  assert.equal(result.current.role, 'claimant');
  assert.equal(result.current.nextStep.role, 'operator');
  assert.equal(result.current.nextStep.kind, 'handoff');
});

test('inspectUniverse detects operator handoff and emits progression next step', async () => {
  const result = await inspectUniverse({
    listOperatorMatches: async () => ({ items: [{ match_id: 'match-1' }] }),
  } as never, {
    operator: { sourceListingId: 'listing-1' },
  });

  assert.equal(result.role, 'operator');
  assert.equal(result.stageSnapshot.stage, 'handoff');
  assert.equal(result.nextStep.stage, 'progression');
  assert.equal(result.nextStep.kind, 'continue');
});

test('runUniverse resumes from a claimant handoff artifact and executes operator continuation', async () => {
  const calls: string[] = [];
  const result = await runUniverse({
    createOperatorExecutionListing: async () => { calls.push('create'); return { listing: { listing_id: 'candidate-1' } }; },
    activateOperatorExecutionListing: async () => { calls.push('activate'); return { listing: { listing_id: 'candidate-1' } }; },
    generateOperatorMatchCandidates: async () => { calls.push('match'); return { upserts: [{ matchId: 'match-1' }] }; },
    listOperatorMatches: async () => { calls.push('list'); return { items: [{ match_id: 'match-1' }] }; },
  } as never, {
    resumeFrom: {
      role: 'claimant',
      stageSnapshot: {
        roleWorkspace: {
          role: 'claimant',
          sessionPresent: true,
          adminSessionPresent: false,
          canonicality: 'canonical',
        },
        stage: 'handoff',
        state: 'handoff-required',
        executability: 'executable-handoff',
        action: { kind: 'handoff', owner: 'operator', executability: 'executable-handoff' },
        handoff: { owner: 'operator', route: '/operator/matches', mode: 'executable', canonicality: 'canonical' },
      },
      nextStep: { role: 'operator', stage: 'handoff', kind: 'handoff', executability: 'executable-handoff' },
    },
    operator: {
      matching: {
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
          freshnessTs: '2026-05-11T13:00:00.000Z',
          traceId: 'trace-1',
          idempotencyKey: 'idem-1',
          now: '2026-05-11T13:00:00.000Z',
        },
        candidateActivation: {
          companyId: 'company-public',
          actorId: 'operator-system',
          verificationStatus: 'verified',
          now: '2026-05-11T13:00:01.000Z',
        },
        matchCandidates: {
          workflowRunId: 'wf-1',
          triggerEventId: 'evt-1',
          upstreamDecision: 'READY_FOR_ROUTING',
          detectedEvidenceLevel: 2,
          requiredEvidenceLevel: 2,
          missingFields: [],
          freshnessTs: '2026-05-11T13:00:02.000Z',
          traceId: 'trace-1',
          idempotencyKey: 'idem-match-1',
          now: '2026-05-11T13:00:02.000Z',
        },
      },
    },
  });

  assert.deepEqual(calls, ['create', 'activate', 'match', 'list']);
  assert.equal(result.current.role, 'operator');
  assert.equal(result.current.stageSnapshot.stage, 'progression');
});

test('runUniverse emits a fail-closed stop from prior artifact without executing further calls', async () => {
  let called = false;
  const result = await runUniverse({
    listOperatorMatches: async () => {
      called = true;
      return { items: [] };
    },
  } as never, {
    resumeFrom: {
      role: 'operator',
      stageSnapshot: {
        roleWorkspace: {
          role: 'operator',
          sessionPresent: false,
          adminSessionPresent: true,
          canonicality: 'non-canonical',
        },
        stage: 'handoff',
        state: 'blocked',
        executability: 'non-canonical-fail-close',
        action: { kind: 'read', owner: 'operator', executability: 'non-canonical-fail-close' },
      },
      nextStep: { role: 'operator', stage: 'handoff', kind: 'stop', executability: 'non-canonical-fail-close', reason: 'mixed-family-fail-close' },
    },
  });

  assert.equal(called, false);
  assert.equal(result.current.nextStep.kind, 'stop');
  assert.equal(result.current.nextStep.executability, 'non-canonical-fail-close');
});

test('explainUniverse returns machine-readable explanation for the current stage and next step', async () => {
  const explanation = await explainUniverse({
    getAccountMe: async () => ({
      account: { tenant_id: 'tenant-public' },
      active_org_context: { org_id: 'company-public' },
      memberships: [{ org_id: 'company-public' }],
    }),
  } as never, {
    claimant: {},
  });

  assert.equal(explanation.current.role, 'claimant');
  assert.equal(explanation.current.nextStep.stage, 'readiness');
  assert.match(explanation.summary, /claimant/i);
});
