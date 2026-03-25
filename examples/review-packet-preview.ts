import {
  buildIndustryUniverseScenarioPlan,
} from '../src/universe.js';
import {
  buildReviewPacket,
  buildScenarioVerificationBundle,
  exportReviewPacket,
} from '../src/verification.js';

const scenarioPlan = buildIndustryUniverseScenarioPlan({
  scenarioId: 'scenario-review-packet-preview-1',
  scenarioLabel: 'review-packet-preview-soda-ash-light',
  sourceRefs: ['source://market/soda-ash-light'],
  evidenceRefs: ['evidence://review/soda-ash-light'],
  traceIds: ['trace-review-packet-1'],
  workflowIds: ['wf-review-packet-1'],
  createListing: {
    listingId: 'listing-review-packet-1',
    listingType: 'supply',
    category: 'basic inorganic industrial chemical',
    sku: 'sodium-carbonate-soda-ash-light',
    quantityValue: '15',
    quantityUnit: 'tons',
    regionSummary: 'China -> Vietnam',
    verificationStatus: 'verified',
    freshnessTs: '2026-03-25T20:20:00Z',
    traceId: 'trace-review-packet-1',
    idempotencyKey: 'listing-review-packet-1',
    now: '2026-03-25T20:20:00Z',
  },
  activateListing: {
    now: '2026-03-25T20:21:00Z',
  },
  generateMatchCandidates: {
    upstreamDecision: 'READY_FOR_ROUTING',
    requiredEvidenceLevel: 1,
    detectedEvidenceLevel: 1,
    workflowRunId: 'wf-review-packet-1',
    triggerEventId: 'evt-review-packet-1',
    topN: 10,
    now: '2026-03-25T20:22:00Z',
  },
});

const verificationBundle = buildScenarioVerificationBundle({
  scenario: scenarioPlan.envelope,
  verificationMode: 'review-safe',
  completedRouteChain: [scenarioPlan.envelope.expectedRouteChain[0]!],
  recordIds: {
    listings: ['listing-review-packet-1'],
  },
});

const reviewPacket = buildReviewPacket({
  scenario: scenarioPlan.envelope,
  bundle: verificationBundle,
});

console.log(JSON.stringify(exportReviewPacket(reviewPacket), null, 2));
