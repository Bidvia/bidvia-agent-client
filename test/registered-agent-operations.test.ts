import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRegisteredAgentOperationsScenarioPlan,
  runRegisteredAgentOperationsScenario,
} from '../src/registered-agent-operations.ts';
import type { BidviaClient } from '../src/client.ts';
import type {
  BidviaRegisteredAgentOperationsScenarioPlan,
} from '../src/contracts.ts';

type RegisteredAgentOperationsRunnerClient = Pick<BidviaClient,
  'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'>;

test('buildRegisteredAgentOperationsScenarioPlan builds the exact post-onboarding registration-bound route chain', () => {
  const plan = buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-1',
    scenarioLabel: 'registered-agent-operations-agent-1',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-1'],
    traceIds: ['trace-registered-agent-1'],
    workflowIds: ['wf-registered-agent-1'],
    postHeartbeat: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-registered-1',
      objectCount: 4,
      now: '2026-03-29T10:01:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registered-agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'registered agent evidence',
      now: '2026-03-29T10:02:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered agent proposal',
      now: '2026-03-29T10:03:00Z',
    },
    registrationId: 'areg-registered-1',
  });

  assert.equal(plan.envelope.scenarioFamily, 'registered-agent-operations');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.map((step) => step.routeKey),
    [
      'postHeartbeat',
      'uploadSync',
      'downloadSync',
      'submitEvidence',
      'submitProposal',
    ],
  );
  assert.deepEqual(plan.envelope.recordIds, {
    registrations: ['areg-registered-1'],
  });
  assert.deepEqual(plan.envelope.workflowStage, {
    workflowIds: ['wf-registered-agent-1'],
    localStageLabel: 'governed-run-execution',
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'packet-grounded-read',
    blockedBy: null,
    transitionRule: null,
  });
});

test('buildRegisteredAgentOperationsScenarioPlan returns deterministic registration-bound inputs', () => {
  const plan: BidviaRegisteredAgentOperationsScenarioPlan = buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-1',
    scenarioLabel: 'registered-agent-operations-agent-1',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-1'],
    traceIds: ['trace-registered-agent-1'],
    workflowIds: ['wf-registered-agent-1'],
    postHeartbeat: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-registered-1',
      objectCount: 4,
      now: '2026-03-29T10:01:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registered-agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'registered agent evidence',
      now: '2026-03-29T10:02:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered agent proposal',
      now: '2026-03-29T10:03:00Z',
    },
    registrationId: 'areg-registered-1',
  });

  assert.equal(plan.postHeartbeatInput.expiresAt, '2026-03-29T10:05:00Z');
  assert.equal(plan.uploadSyncInput.cursorRef, 'cursor-registered-1');
  assert.equal(plan.submitEvidenceInput.evidenceRef, 'evidence://registered-agent/1');
  assert.equal(plan.submitProposalInput.proposalRef, 'proposal://registered-agent/1');
  assert.equal(plan.registrationId, 'areg-registered-1');
});

test('buildRegisteredAgentOperationsScenarioPlan rejects missing registration id', () => {
  assert.throws(
    () => buildRegisteredAgentOperationsScenarioPlan({
      scenarioId: 'scenario-registered-agent-operations-1',
      scenarioLabel: 'registered-agent-operations-agent-1',
      sourceRefs: ['source://registered-agent/runtime'],
      evidenceRefs: ['evidence://registered-agent/receipt-1'],
      traceIds: ['trace-registered-agent-1'],
      workflowIds: ['wf-registered-agent-1'],
      postHeartbeat: {
        now: '2026-03-29T10:00:00Z',
        expiresAt: '2026-03-29T10:05:00Z',
      },
      uploadSync: {
        cursorRef: 'cursor-registered-1',
        objectCount: 4,
        now: '2026-03-29T10:01:00Z',
      },
      submitEvidence: {
        evidenceRef: 'evidence://registered-agent/1',
        evidenceKind: 'provider_receipt',
        summary: 'registered agent evidence',
        now: '2026-03-29T10:02:00Z',
      },
      submitProposal: {
        proposalType: 'template_change',
        proposalRef: 'proposal://registered-agent/1',
        summary: 'registered agent proposal',
        now: '2026-03-29T10:03:00Z',
      },
      registrationId: '   ',
    }),
    /registrationId is required for the registered agent operations scenario plan/,
  );
});

test('runRegisteredAgentOperationsScenario executes the exact post-onboarding helper path in order', async () => {
  const calls: string[] = [];
  const client = {
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
  } as RegisteredAgentOperationsRunnerClient;

  const plan = buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-1',
    scenarioLabel: 'registered-agent-operations-agent-1',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-1'],
    traceIds: ['trace-registered-agent-1'],
    workflowIds: ['wf-registered-agent-1'],
    postHeartbeat: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-registered-1',
      objectCount: 4,
      now: '2026-03-29T10:01:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registered-agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'registered agent evidence',
      now: '2026-03-29T10:02:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered agent proposal',
      now: '2026-03-29T10:03:00Z',
    },
    registrationId: 'areg-registered-1',
  });

  const result = await runRegisteredAgentOperationsScenario(client, plan);

  assert.deepEqual(calls, [
    'postHeartbeat:2026-03-29T10:05:00Z',
    'uploadSync:cursor-registered-1',
    'downloadSync',
    'submitEvidence:evidence://registered-agent/1',
    'submitProposal:proposal://registered-agent/1',
  ]);
  assert.equal(result.verificationBundle.verificationMode, 'review-safe');
  assert.equal(result.verificationBundle.completedRouteChain.length, 5);
  assert.equal(result.reviewPacket.status, 'complete');
});

test('runRegisteredAgentOperationsScenario surfaces helper failures directly', async () => {
  const client = {
    async postHeartbeat() {
      return { ok: true };
    },
    async uploadSync() {
      return { ok: true };
    },
    async downloadSync() {
      throw new Error('download failed');
    },
    async submitEvidence() {
      throw new Error('should not reach evidence');
    },
    async submitProposal() {
      throw new Error('should not reach proposal');
    },
  } as RegisteredAgentOperationsRunnerClient;

  const plan = buildRegisteredAgentOperationsScenarioPlan({
    scenarioId: 'scenario-registered-agent-operations-1',
    scenarioLabel: 'registered-agent-operations-agent-1',
    sourceRefs: ['source://registered-agent/runtime'],
    evidenceRefs: ['evidence://registered-agent/receipt-1'],
    traceIds: ['trace-registered-agent-1'],
    workflowIds: ['wf-registered-agent-1'],
    postHeartbeat: {
      now: '2026-03-29T10:00:00Z',
      expiresAt: '2026-03-29T10:05:00Z',
    },
    uploadSync: {
      cursorRef: 'cursor-registered-1',
      objectCount: 4,
      now: '2026-03-29T10:01:00Z',
    },
    submitEvidence: {
      evidenceRef: 'evidence://registered-agent/1',
      evidenceKind: 'provider_receipt',
      summary: 'registered agent evidence',
      now: '2026-03-29T10:02:00Z',
    },
    submitProposal: {
      proposalType: 'template_change',
      proposalRef: 'proposal://registered-agent/1',
      summary: 'registered agent proposal',
      now: '2026-03-29T10:03:00Z',
    },
    registrationId: 'areg-registered-1',
  });

  await assert.rejects(
    () => runRegisteredAgentOperationsScenario(client, plan),
    /download failed/,
  );
});
