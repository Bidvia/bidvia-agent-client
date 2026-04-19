import {
  buildConnectionApprovalScenarioPlan,
} from '../src/connection.js';
import {
  buildScenarioVerificationBundle,
} from '../src/verification.js';

const scenarioPlan = buildConnectionApprovalScenarioPlan({
  scenarioId: 'scenario-connection-approval-1',
  scenarioLabel: 'connection-approval-soda-ash-light',
  sourceRefs: ['source://market/soda-ash-light'],
  evidenceRefs: ['evidence://match/soda-ash-light'],
  traceIds: ['trace-connection-1'],
  workflowIds: ['wf-connection-1'],
  createConnectionRequest: {
    sourceMatchId: 'match-1',
    requesterActorId: 'actor-1',
    requesterCompanyId: 'company-1',
    riskTier: 'HIGH',
    policyVersion: 'policy-v1',
    approvalMatrixVersion: 'matrix-v1',
    actionType: 'CONTACT_SHARE',
    now: '2026-03-25T20:23:00Z',
  },
  approveConnectionRequest: {
    approvalRequestId: 'approval-1',
    actorId: 'actor-1',
    decision: 'approve',
    now: '2026-03-25T20:24:00Z',
  },
});

const verificationBundle = buildScenarioVerificationBundle({
  scenario: scenarioPlan.envelope,
  verificationMode: 'review-safe',
});

console.log(JSON.stringify({ scenarioPlan, verificationBundle }, null, 2));
