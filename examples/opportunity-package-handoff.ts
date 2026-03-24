import {
  buildOpportunityPackageHandoffPlan,
} from '../src/handoffs.js';
import {
  buildScenarioVerificationBundle,
} from '../src/verification.js';

const scenarioPlan = buildOpportunityPackageHandoffPlan({
  scenarioId: 'scenario-opportunity-package-handoff-1',
  scenarioLabel: 'opportunity-package-handoff-soda-ash-light',
  sourceRefs: ['source://market/soda-ash-light'],
  evidenceRefs: ['evidence://approval/soda-ash-light'],
  traceIds: ['trace-handoff-1'],
  workflowIds: ['wf-handoff-1'],
  exportOpportunityPackage: {
    opportunityId: 'opportunity-1',
    renderTemplateId: 'template-1',
    contentRef: 'content://packages/opportunity-1',
    redactionProfile: 'review-safe',
    targetSystem: 'downstream-dataroom',
    operationType: 'export',
    nodeId: 'node-1',
    runtimeId: 'runtime-1',
    agentId: 'agent-1',
    boundAccountId: 'account-1',
    now: '2026-03-25T20:25:00Z',
  },
});

const verificationBundle = buildScenarioVerificationBundle({
  scenario: scenarioPlan.envelope,
  verificationMode: 'review-safe',
});

console.log(JSON.stringify({ scenarioPlan, verificationBundle }, null, 2));
