import type { BidviaClient } from '../src/client.js';
import {
  buildRegistrationLifecycleScenarioPlan,
  runRegistrationLifecycleScenario,
} from '../src/registration-lifecycle.js';

const scenarioPlan = buildRegistrationLifecycleScenarioPlan({
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

const client = {
  async createProvisionalAgent() {
    return { ok: true };
  },
  async queryProvisionalAgent() {
    return { ok: true };
  },
  async claimProvisionalAgent() {
    return { ok: true };
  },
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
  'createProvisionalAgent'
  | 'queryProvisionalAgent'
  | 'claimProvisionalAgent'
  | 'postHeartbeat'
  | 'uploadSync'
  | 'downloadSync'
  | 'submitEvidence'
  | 'submitProposal'> as BidviaClient;

const scenarioResult = await runRegistrationLifecycleScenario(client, scenarioPlan);

console.log(JSON.stringify({
  scenarioPlan,
  verificationBundle: scenarioResult.verificationBundle,
  reviewPacket: scenarioResult.reviewPacket,
}, null, 2));
