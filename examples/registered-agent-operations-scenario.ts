import type { BidviaClient } from '../src/client.js';
import {
  buildRegisteredAgentOperationsScenarioPlan,
  runRegisteredAgentOperationsScenario,
} from '../src/registered-agent-operations.js';

const scenarioPlan = buildRegisteredAgentOperationsScenarioPlan({
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

const client = {
  async postHeartbeat() {
    return { ok: true };
  },
  async uploadSync() {
    return { ok: true };
  },
  async downloadSync() {
    return { ok: true };
  },
  async submitEvidence() {
    return { ok: true };
  },
  async submitProposal() {
    return { ok: true };
  },
} as Pick<BidviaClient,
  'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'> as BidviaClient;

const scenarioResult = await runRegisteredAgentOperationsScenario(client, scenarioPlan);

console.log(JSON.stringify({
  scenarioPlan,
  verificationBundle: scenarioResult.verificationBundle,
  reviewPacket: scenarioResult.reviewPacket,
}, null, 2));
