import {
  buildIndustryUniverseScenarioPlan,
} from '../src/universe.js';
import {
  buildScenarioVerificationBundle,
} from '../src/verification.js';

const scenarioPlan = buildIndustryUniverseScenarioPlan({
  scenarioId: 'scenario-industry-universe-1',
  scenarioLabel: 'industry-universe-soda-ash-light',
  sourceRefs: ['source://market/soda-ash-light'],
  evidenceRefs: ['evidence://supply/soda-ash-light'],
  traceIds: ['trace-1'],
  workflowIds: ['wf-1'],
  createListing: {
    listingId: 'listing-1',
    listingType: 'supply',
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-03-25T20:20:00Z',
    traceId: 'trace-1',
    idempotencyKey: 'listing-1',
    now: '2026-03-25T20:20:00Z',
  },
  activateListing: {
    now: '2026-03-25T20:21:00Z',
  },
  generateMatchCandidates: {
    upstreamDecision: 'READY_FOR_ROUTING',
    requiredEvidenceLevel: 1,
    detectedEvidenceLevel: 1,
    workflowRunId: 'wf-1',
    triggerEventId: 'evt-1',
    topN: 10,
    now: '2026-03-25T20:22:00Z',
  },
});

const verificationBundle = buildScenarioVerificationBundle({
  scenario: scenarioPlan.envelope,
  verificationMode: 'review-safe',
});

console.log(JSON.stringify({ scenarioPlan, verificationBundle }, null, 2));
