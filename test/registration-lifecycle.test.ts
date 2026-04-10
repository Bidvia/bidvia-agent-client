import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRegistrationLifecycleScenarioPlan,
  runRegistrationLifecycleScenario,
} from '../src/registration-lifecycle.ts';
import { buildIdentitySessionPlaneView } from '../src/index.ts';
import type { BidviaClient } from '../src/client.ts';
import type {
  BidviaRegistrationLifecycleScenarioPlan,
} from '../src/contracts.ts';

type RegistrationLifecycleRunnerClient = Pick<BidviaClient,
  'createProvisionalAgent'
  | 'queryProvisionalAgent'
  | 'claimProvisionalAgent'
  | 'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'>;

test('buildRegistrationLifecycleScenarioPlan builds the full onboarding and registration-bound route chain', () => {
  const plan = buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-1',
    scenarioLabel: 'registration-lifecycle-agent-1',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-1'],
    traceIds: ['trace-registration-1'],
    workflowIds: ['wf-registration-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      now: '2026-03-28T10:00:00Z',
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      claimToken: 'claim-token-1',
      now: '2026-03-28T10:01:00Z',
    },
    postHeartbeat: {
      now: '2026-03-28T10:02:00Z',
      expiresAt: '2026-03-28T10:07:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-1',
      objectCount: 3,
      now: '2026-03-28T10:03:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'receipt evidence',
      now: '2026-03-28T10:04:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://agent/1',
      summary: 'template change',
      now: '2026-03-28T10:05:00Z',
    },
    registrationId: 'areg-1',
  });
  const identitySessionPlane = buildIdentitySessionPlaneView();

  assert.equal(plan.envelope.scenarioFamily, 'registration-lifecycle');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.slice(0, 3).map((step) => step.routeKey),
    identitySessionPlane.canonicalOnboarding.helperSteps.map((step) => step.helperKey),
  );
  assert.deepEqual(
    plan.envelope.expectedRouteChain.slice(3).map((step) => step.routeKey),
    ['postHeartbeat', 'uploadSync', 'downloadSync', 'submitEvidence', 'submitProposal'],
  );
  assert.deepEqual(plan.envelope.recordIds, {
    registrations: ['areg-1'],
  });
  assert.deepEqual(plan.envelope.workflowStage, {
    workflowIds: ['wf-registration-1'],
    localStageLabel: 'public-provisional',
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'packet-grounded-read',
    blockedBy: null,
    transitionRule: null,
  });
  assert.equal(plan.queryProvisionalAgentRef, 'prov-agent-1');
});

test('buildRegistrationLifecycleScenarioPlan returns deterministic aligned lifecycle inputs', () => {
  const plan: BidviaRegistrationLifecycleScenarioPlan = buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-1',
    scenarioLabel: 'registration-lifecycle-agent-1',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-1'],
    traceIds: ['trace-registration-1'],
    workflowIds: ['wf-registration-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      now: '2026-03-28T10:00:00Z',
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      claimToken: 'claim-token-1',
      now: '2026-03-28T10:01:00Z',
    },
    postHeartbeat: {
      now: '2026-03-28T10:02:00Z',
      expiresAt: '2026-03-28T10:07:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-1',
      objectCount: 3,
      now: '2026-03-28T10:03:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'receipt evidence',
      now: '2026-03-28T10:04:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://agent/1',
      summary: 'template change',
      now: '2026-03-28T10:05:00Z',
    },
    registrationId: 'areg-1',
  });

  assert.equal(plan.claimProvisionalAgentInput.provisionalAgentRef, 'prov-agent-1');
  assert.equal(plan.postHeartbeatInput.expiresAt, '2026-03-28T10:07:00Z');
  assert.equal(plan.uploadSyncInput.cursorRef, 'cursor-1');
  assert.equal(plan.submitProposalInput.proposalRef, 'proposal://agent/1');
  assert.equal(plan.registrationId, 'areg-1');
});

test('buildRegistrationLifecycleScenarioPlan rejects provisional ref drift across onboarding steps', () => {
  assert.throws(
    () => buildRegistrationLifecycleScenarioPlan({
      scenarioId: 'scenario-registration-lifecycle-1',
      scenarioLabel: 'registration-lifecycle-agent-1',
      sourceRefs: ['source://registration/bootstrap'],
      evidenceRefs: ['evidence://registration/receipt-1'],
      traceIds: ['trace-registration-1'],
      workflowIds: ['wf-registration-1'],
      createProvisionalAgent: {
        provisionalAgentRef: 'prov-agent-1',
        now: '2026-03-28T10:00:00Z',
      },
      queryProvisionalAgent: {
        provisionalAgentRef: 'prov-agent-2',
      },
      claimProvisionalAgent: {
        provisionalAgentRef: 'prov-agent-1',
        claimToken: 'claim-token-1',
        now: '2026-03-28T10:01:00Z',
      },
      postHeartbeat: {
        now: '2026-03-28T10:02:00Z',
        expiresAt: '2026-03-28T10:07:00Z',
      },
      uploadSync: {
        cursorRef: 'cursor-1',
        objectCount: 3,
        now: '2026-03-28T10:03:00Z',
      },
      submitEvidence: {
        evidenceRef: 'evidence://agent/1',
        evidenceKind: 'provider_receipt',
        summary: 'receipt evidence',
        now: '2026-03-28T10:04:00Z',
      },
      submitProposal: {
        proposalType: 'template_change',
        proposalRef: 'proposal://agent/1',
        summary: 'template change',
        now: '2026-03-28T10:05:00Z',
      },
      registrationId: 'areg-1',
    }),
    /provisionalAgentRef must stay aligned across the registration lifecycle scenario plan/,
  );
});

test('runRegistrationLifecycleScenario executes the exact onboarding and registration-bound helper path in order', async () => {
  const calls: string[] = [];
  const client = {
    async createProvisionalAgent(input) {
      calls.push(`createProvisionalAgent:${input.provisionalAgentRef}`);
      return { ok: true };
    },
    async queryProvisionalAgent(provisionalAgentRef: string) {
      calls.push(`queryProvisionalAgent:${provisionalAgentRef}`);
      return { ok: true };
    },
    async claimProvisionalAgent(input) {
      calls.push(`claimProvisionalAgent:${input.provisionalAgentRef}`);
      return { ok: true };
    },
    async postHeartbeat(input) {
      calls.push(`postHeartbeat:${input.expiresAt}`);
      return { ok: true };
    },
    async uploadSync(input) {
      calls.push(`uploadSync:${input.cursorRef}`);
      return { ok: true };
    },
    async downloadSync() {
      calls.push('downloadSync');
      return { ok: true };
    },
    async submitEvidence(input) {
      calls.push(`submitEvidence:${input.evidenceRef}`);
      return { ok: true };
    },
    async submitProposal(input) {
      calls.push(`submitProposal:${input.proposalRef}`);
      return { ok: true };
    },
  } as RegistrationLifecycleRunnerClient;

  const plan = buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-1',
    scenarioLabel: 'registration-lifecycle-agent-1',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-1'],
    traceIds: ['trace-registration-1'],
    workflowIds: ['wf-registration-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      now: '2026-03-28T10:00:00Z',
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      claimToken: 'claim-token-1',
      now: '2026-03-28T10:01:00Z',
    },
    postHeartbeat: {
      now: '2026-03-28T10:02:00Z',
      expiresAt: '2026-03-28T10:07:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-1',
      objectCount: 3,
      now: '2026-03-28T10:03:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'receipt evidence',
      now: '2026-03-28T10:04:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://agent/1',
      summary: 'template change',
      now: '2026-03-28T10:05:00Z',
    },
    registrationId: 'areg-1',
  });

  const result = await runRegistrationLifecycleScenario(client, plan);

  assert.deepEqual(calls, [
    'createProvisionalAgent:prov-agent-1',
    'queryProvisionalAgent:prov-agent-1',
    'claimProvisionalAgent:prov-agent-1',
    'postHeartbeat:2026-03-28T10:07:00Z',
    'uploadSync:cursor-1',
    'downloadSync',
    'submitEvidence:evidence://agent/1',
    'submitProposal:proposal://agent/1',
  ]);
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.verificationBundle.completedRouteChain.length, 8);
  assert.equal(result.reviewPacket.status, 'complete');
});

test('runRegistrationLifecycleScenario surfaces helper failures directly', async () => {
  const client = {
    async createProvisionalAgent() {
      return { ok: true };
    },
    async queryProvisionalAgent() {
      return { ok: true };
    },
    async claimProvisionalAgent() {
      throw new Error('claim failed');
    },
    async postHeartbeat() {
      throw new Error('should not reach heartbeat');
    },
    async uploadSync() {
      throw new Error('should not reach upload');
    },
    async downloadSync() {
      throw new Error('should not reach download');
    },
    async submitEvidence() {
      throw new Error('should not reach evidence');
    },
    async submitProposal() {
      throw new Error('should not reach proposal');
    },
  } as RegistrationLifecycleRunnerClient;

  const plan = buildRegistrationLifecycleScenarioPlan({
    scenarioId: 'scenario-registration-lifecycle-1',
    scenarioLabel: 'registration-lifecycle-agent-1',
    sourceRefs: ['source://registration/bootstrap'],
    evidenceRefs: ['evidence://registration/receipt-1'],
    traceIds: ['trace-registration-1'],
    workflowIds: ['wf-registration-1'],
    createProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      now: '2026-03-28T10:00:00Z',
    },
    queryProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
    },
    claimProvisionalAgent: {
      provisionalAgentRef: 'prov-agent-1',
      claimToken: 'claim-token-1',
      now: '2026-03-28T10:01:00Z',
    },
    postHeartbeat: {
      now: '2026-03-28T10:02:00Z',
      expiresAt: '2026-03-28T10:07:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-1',
      objectCount: 3,
      now: '2026-03-28T10:03:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'receipt evidence',
      now: '2026-03-28T10:04:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://agent/1',
      summary: 'template change',
      now: '2026-03-28T10:05:00Z',
    },
    registrationId: 'areg-1',
  });

  await assert.rejects(
    () => runRegistrationLifecycleScenario(client, plan),
    /claim failed/,
  );
});
