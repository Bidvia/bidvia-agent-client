import test from 'node:test';
import assert from 'node:assert/strict';

import { exportVerificationBundle } from '../src/client.ts';
import { buildScenarioRouteStep } from '../src/scenarios.ts';
import { buildIndustryUniverseScenarioPlan } from '../src/universe.ts';
import {
  appendCompletedRouteStep,
  buildReviewPacket,
  buildScenarioVerificationBundle,
  exportReviewPacket,
  exportScenarioVerificationBundle,
} from '../src/verification.ts';
import type {
  BidviaReviewPacket,
  BidviaReviewPacketSection,
} from '../src/contracts.ts';
import {
  bidviaReviewPacketSectionKeys,
  bidviaReviewPacketStatuses,
} from '../src/contracts.ts';
import { buildEnterpriseIntegrationPlaneView } from '../src/index.ts';

test('review packet contracts represent reviewer-ready summary and bounded status', () => {
  assert.deepEqual(bidviaReviewPacketStatuses, ['complete', 'partial', 'pending-review']);

  const packet: BidviaReviewPacket = {
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    scenarioFamily: 'industry-universe',
    verificationMode: 'review-safe',
    status: 'partial',
    summary: {
      sourceRefCount: 1,
      evidenceRefCount: 1,
      traceIdCount: 1,
      workflowIdCount: 1,
      expectedRouteCount: 3,
      completedRouteCount: 1,
      pendingRouteCount: 2,
      recordGroupCount: 1,
      totalRecordCount: 1,
    },
    details: {
      boundary: {
        derivedFromScenarioFacts: true,
        derivedFromVerificationFacts: true,
        localDerivedExplanationIncluded: true,
        serverOwnedFactsIncluded: true,
        dependencyGatedSeamsIncluded: true,
        serverTruthClaimed: false,
        adjudicationOutcomeIncluded: false,
      },
      verification: {
        expectedRouteKeys: ['createListing', 'activateListing', 'generateMatchCandidates'],
        completedRouteKeys: ['createListing'],
        pendingRouteKeys: ['activateListing', 'generateMatchCandidates'],
        totalRecordCount: 1,
        localDerivedExplanation: [
          'review-packet-status',
          'next-pending-route',
          'route-coverage-note',
        ],
        serverOwnedFacts: [
          'scenario-source-refs',
          'scenario-evidence-refs',
          'traceability-refs',
          'recorded-ids',
        ],
        dependencyGatedSeams: [
          'server-truth-claimed:false',
          'adjudication-outcome-included:false',
          'core-truth-closure:deferred',
        ],
        roleSplit: {
          user: [
            'user-create-listing',
            'user-activate-listing',
            'user-generate-match-candidates',
          ],
          operator: [],
          admin: [],
        },
      },
      routeDetails: [
        {
          sequence: 1,
          routeKey: 'createListing',
          stepName: 'user-create-listing',
          actorRole: 'user',
          requiredContext: ['tenantId', 'principalId', 'companyId'],
          completed: true,
        },
      ],
      recordDetails: [
        {
          recordGroupKey: 'listings',
          count: 1,
          ids: ['listing-1'],
        },
      ],
    },
    sections: [
      {
        sectionKey: 'scenario',
        title: 'Scenario facts',
        entries: ['source://market/soda-ash-light'],
      },
      {
        sectionKey: 'evidence',
        title: 'Evidence refs',
        entries: ['evidence://supply/soda-ash-light'],
      },
      {
        sectionKey: 'traceability',
        title: 'Traceability refs',
        entries: ['trace-1', 'wf-1'],
      },
      {
        sectionKey: 'routes',
        title: 'Route coverage',
        entries: [
          'completed:1/3:createListing:user-create-listing:actor=user:requires=tenantId|principalId|companyId',
          'pending-review:2/3:activateListing:user-activate-listing:actor=user:requires=tenantId|principalId|companyId',
          'pending-review:3/3:generateMatchCandidates:user-generate-match-candidates:actor=user:requires=tenantId|principalId|companyId',
        ],
      },
      {
        sectionKey: 'verification',
        title: 'Verification facts',
        entries: [
          'verification-mode:review-safe',
          'review-packet-status:partial',
          'completed-routes:1/3',
          'pending-routes:2',
          'next-pending-route:activateListing',
          'route-coverage-note:completed-prefix-only',
          'local-derived-explanation:review-packet-status:partial',
          'local-derived-explanation:next-pending-route:activateListing',
          'local-derived-explanation:route-coverage-note:completed-prefix-only',
          'server-owned-facts:scenario-source-refs:1',
          'server-owned-facts:scenario-evidence-refs:1',
          'server-owned-facts:traceability-refs:2',
          'server-owned-facts:recorded-ids:1',
          'server-truth-claimed:false',
          'adjudication-outcome-included:false',
          'dependency-gated-seams:core-truth-closure:deferred',
        ],
      },
      {
        sectionKey: 'records',
        title: 'Recorded ids',
        entries: ['record-group:listings:count=1', 'listings:listing-1'],
      },
    ],
  };

  assert.equal(packet.status, 'partial');
  assert.equal(packet.summary.expectedRouteCount, 3);
  assert.equal(packet.summary.completedRouteCount, 1);
  assert.equal(packet.details.routeDetails[0]?.completed, true);
  assert.equal(packet.details.recordDetails[0]?.recordGroupKey, 'listings');
  assert.deepEqual(
    packet.sections.map((section) => section.sectionKey),
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );
  assert.equal(packet.details.boundary.serverTruthClaimed, false);
  assert.equal(packet.details.boundary.localDerivedExplanationIncluded, true);
  assert.deepEqual(packet.details.verification.localDerivedExplanation, [
    'review-packet-status',
    'next-pending-route',
    'route-coverage-note',
  ]);
  assert.deepEqual(packet.details.verification.serverOwnedFacts, [
    'scenario-source-refs',
    'scenario-evidence-refs',
    'traceability-refs',
    'recorded-ids',
  ]);
  assert.deepEqual(packet.details.verification.dependencyGatedSeams, [
    'server-truth-claimed:false',
    'adjudication-outcome-included:false',
    'core-truth-closure:deferred',
  ]);
  assert.deepEqual(packet.details.verification.roleSplit, {
    user: [
      'user-create-listing',
      'user-activate-listing',
      'user-generate-match-candidates',
    ],
    operator: [],
    admin: [],
  });
  assert.deepEqual(packet.details.verification.pendingRouteKeys, ['activateListing', 'generateMatchCandidates']);
});

test('review packet section contract supports additive reviewer-facing sections', () => {
  assert.deepEqual(
    bidviaReviewPacketSectionKeys,
    ['scenario', 'evidence', 'traceability', 'routes', 'verification', 'records'],
  );

  const sections: BidviaReviewPacketSection[] = [
    {
      sectionKey: 'scenario',
      title: 'Scenario facts',
      entries: ['source://market/soda-ash-light'],
    },
    {
      sectionKey: 'verification',
      title: 'Verification facts',
      entries: ['server-truth-claimed:false'],
    },
    {
      sectionKey: 'records',
      title: 'Recorded ids',
      entries: ['listings:listing-1'],
    },
  ];

  assert.deepEqual(sections[0], {
    sectionKey: 'scenario',
    title: 'Scenario facts',
    entries: ['source://market/soda-ash-light'],
  });
  assert.deepEqual(sections[1], {
    sectionKey: 'verification',
    title: 'Verification facts',
    entries: ['server-truth-claimed:false'],
  });
  assert.deepEqual(sections[2], {
    sectionKey: 'records',
    title: 'Recorded ids',
    entries: ['listings:listing-1'],
  });
});

test('scenario verification bundle carries expected and completed route chains', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
    recordIds: {
      listings: ['listing-1'],
    },
  });

  assert.equal(bundle.scenarioId, 'scenario-industry-universe-1');
  assert.equal(bundle.scenarioFamily, 'industry-universe');
  assert.equal(bundle.verificationMode, 'review-safe');
  assert.deepEqual(
    bundle.expectedRouteChain.map((step) => ({
      routeKey: step.routeKey,
      stepName: step.stepName,
      actorRole: step.actorRole,
      verifyRecordGroups: step.progressionCheckpoint?.verifyRecordGroups ?? null,
    })),
    [
      {
        routeKey: 'createListing',
        stepName: 'user-create-listing',
        actorRole: 'user',
        verifyRecordGroups: null,
      },
      {
        routeKey: 'activateListing',
        stepName: 'user-activate-listing',
        actorRole: 'user',
        verifyRecordGroups: ['listings'],
      },
      {
        routeKey: 'generateMatchCandidates',
        stepName: 'user-generate-match-candidates',
        actorRole: 'user',
        verifyRecordGroups: ['matches'],
      },
    ],
  );
  assert.deepEqual(
    bundle.completedRouteChain.map((step) => step.routeKey),
    ['createListing'],
  );
  assert.deepEqual(bundle.recordIds, { listings: ['listing-1'] });
});

test('scenario verification bundle rejects completed step outside expected chain', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  assert.throws(
    () => appendCompletedRouteStep(bundle, buildScenarioRouteStep('requestApproval', ['tenantId'])),
    /completed route chain must match the expected route chain prefix/,
  );
});

test('scenario verification bundle rejects completed step with mismatched required context', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  assert.throws(
    () => appendCompletedRouteStep(bundle, buildScenarioRouteStep('createListing', ['tenantId'])),
    /completed route chain must match the expected route chain prefix/,
  );
});

test('scenario verification bundle rejects duplicate or out-of-order completion entries', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  assert.throws(
    () => buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
      completedRouteChain: [plan.envelope.expectedRouteChain[1]!],
    }),
    /completed route chain must match the expected route chain prefix/,
  );

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
  });

  assert.throws(
    () => appendCompletedRouteStep(bundle, plan.envelope.expectedRouteChain[0]!),
    /completed route chain must match the expected route chain prefix/,
  );
});

test('scenario verification bundle prevents direct mutation of review-safe state', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });

  assert.throws(
    () => {
      bundle.completedRouteChain.push(plan.envelope.expectedRouteChain[0]!);
    },
    /object is not extensible|read only|readonly/i,
  );
  assert.deepEqual(bundle.completedRouteChain, []);
});

test('buildReviewPacket derives reviewer-ready sections and complete status from scenario bundle facts', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    completedRouteChain: plan.envelope.expectedRouteChain,
    recordIds: {
      listings: ['listing-1'],
      matches: ['match-1'],
    },
  });

  const packet = buildReviewPacket({
    scenario: plan.envelope,
    bundle,
  });

  assert.equal(packet.status, 'complete');
  assert.deepEqual(packet.summary, {
    sourceRefCount: 1,
    evidenceRefCount: 1,
    traceIdCount: 1,
    workflowIdCount: 1,
    expectedRouteCount: 3,
    completedRouteCount: 3,
    pendingRouteCount: 0,
    recordGroupCount: 2,
    totalRecordCount: 2,
  });
  assert.deepEqual(packet.details, {
    boundary: {
      derivedFromScenarioFacts: true,
      derivedFromVerificationFacts: true,
      localDerivedExplanationIncluded: true,
      serverOwnedFactsIncluded: true,
      dependencyGatedSeamsIncluded: true,
      serverTruthClaimed: false,
      adjudicationOutcomeIncluded: false,
    },
    verification: {
      expectedRouteKeys: ['createListing', 'activateListing', 'generateMatchCandidates'],
      completedRouteKeys: ['createListing', 'activateListing', 'generateMatchCandidates'],
      pendingRouteKeys: [],
      totalRecordCount: 2,
      localDerivedExplanation: [
        'review-packet-status',
        'next-pending-route',
        'route-coverage-note',
      ],
      serverOwnedFacts: [
        'scenario-source-refs',
        'scenario-evidence-refs',
        'traceability-refs',
        'recorded-ids',
      ],
      dependencyGatedSeams: [
        'server-truth-claimed:false',
        'adjudication-outcome-included:false',
        'core-truth-closure:deferred',
      ],
      roleSplit: {
        user: [
          'user-create-listing',
          'user-activate-listing',
          'user-generate-match-candidates',
        ],
        operator: [],
        admin: [],
      },
    },
    routeDetails: [
      {
        sequence: 1,
        routeKey: 'createListing',
        stepName: 'user-create-listing',
        actorRole: 'user',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        completed: true,
      },
      {
        sequence: 2,
        routeKey: 'activateListing',
        stepName: 'user-activate-listing',
        actorRole: 'user',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        completed: true,
        progressionCheckpoint: {
          checkpointName: 'verify-activation-before-match-generation',
          verifyRecordGroups: ['listings'],
          guidance: 'confirm the activated listing id remains the record carried into match generation on the runtime-generated lane',
        },
      },
      {
        sequence: 3,
        routeKey: 'generateMatchCandidates',
        stepName: 'user-generate-match-candidates',
        actorRole: 'user',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        completed: true,
        progressionCheckpoint: {
          checkpointName: 'verify-match-id-before-connection-approval',
          verifyRecordGroups: ['matches'],
          guidance: 'capture the returned match id before continuing into downstream connection approval on the runtime-generated lane',
        },
      },
    ],
    recordDetails: [
      {
        recordGroupKey: 'listings',
        count: 1,
        ids: ['listing-1'],
      },
      {
        recordGroupKey: 'matches',
        count: 1,
        ids: ['match-1'],
      },
    ],
  });
  assert.deepEqual(packet.sections, [
    {
      sectionKey: 'scenario',
      title: 'Scenario facts',
      entries: ['source://market/soda-ash-light'],
    },
    {
      sectionKey: 'evidence',
      title: 'Evidence refs',
      entries: ['evidence://supply/soda-ash-light'],
    },
    {
      sectionKey: 'traceability',
      title: 'Traceability refs',
      entries: ['trace-1', 'wf-1'],
    },
      {
        sectionKey: 'routes',
        title: 'Route coverage',
        entries: [
          'completed:1/3:createListing:user-create-listing:actor=user:requires=tenantId|principalId|companyId',
          'completed:2/3:activateListing:user-activate-listing:actor=user:requires=tenantId|principalId|companyId',
          'completed:3/3:generateMatchCandidates:user-generate-match-candidates:actor=user:requires=tenantId|principalId|companyId',
        ],
      },
    {
      sectionKey: 'verification',
      title: 'Verification facts',
      entries: [
        'verification-mode:review-safe',
        'review-packet-status:complete',
        'completed-routes:3/3',
        'pending-routes:0',
        'next-pending-route:none',
        'route-coverage-note:completed-prefix-only',
        'local-derived-explanation:review-packet-status:complete',
        'local-derived-explanation:next-pending-route:none',
        'local-derived-explanation:route-coverage-note:completed-prefix-only',
        'server-owned-facts:scenario-source-refs:1',
        'server-owned-facts:scenario-evidence-refs:1',
        'server-owned-facts:traceability-refs:2',
        'server-owned-facts:recorded-ids:2',
        'server-truth-claimed:false',
        'adjudication-outcome-included:false',
        'dependency-gated-seams:core-truth-closure:deferred',
      ],
    },
    {
      sectionKey: 'records',
      title: 'Recorded ids',
      entries: [
        'record-group:listings:count=1',
        'listings:listing-1',
        'record-group:matches:count=1',
        'matches:match-1',
      ],
    },
  ]);
});

test('buildReviewPacket rejects expected route metadata drift between scenario and verification bundle', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });
  const driftedBundle = {
    ...bundle,
    expectedRouteChain: bundle.expectedRouteChain.map((step, index) => index === 1
      ? {
        ...step,
        stepName: 'drifted-step-name',
      }
      : step),
  };

  assert.throws(
    () => buildReviewPacket({
      scenario: plan.envelope,
      bundle: driftedBundle,
    }),
    /scenario and verification bundle facts must match/,
  );
});

test('buildReviewPacket rejects checkpoint metadata drift between scenario and verification bundle', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const bundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
  });
  const driftedBundle = {
    ...bundle,
    expectedRouteChain: bundle.expectedRouteChain.map((step, index) => index === 2
      ? {
        ...step,
        progressionCheckpoint: {
          ...step.progressionCheckpoint!,
          verifyRecordGroups: ['listings'] as Array<'listings'>,
        },
      }
      : step),
  };

  assert.throws(
    () => buildReviewPacket({
      scenario: plan.envelope,
      bundle: driftedBundle,
    }),
    /scenario and verification bundle facts must match/,
  );
});

test('buildReviewPacket derives partial and pending-review only from completed route counts', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const pendingPacket = buildReviewPacket({
    scenario: plan.envelope,
    bundle: buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
    }),
  });
  const partialPacket = buildReviewPacket({
    scenario: plan.envelope,
    bundle: buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
      completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
    }),
  });

  assert.equal(pendingPacket.status, 'pending-review');
  assert.equal(partialPacket.status, 'partial');
  assert.deepEqual(pendingPacket.details.routeDetails.map((detail) => detail.completed), [false, false, false]);
  assert.deepEqual(partialPacket.details.routeDetails.map((detail) => detail.completed), [true, false, false]);
  assert.deepEqual(pendingPacket.details.verification.pendingRouteKeys, [
    'createListing',
    'activateListing',
    'generateMatchCandidates',
  ]);
  assert.deepEqual(partialPacket.details.verification.pendingRouteKeys, [
    'activateListing',
    'generateMatchCandidates',
  ]);
});

test('buildReviewPacket exposes richer route-chain and record-group readback from existing bounded facts only', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const packet = buildReviewPacket({
    scenario: plan.envelope,
    bundle: buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
      completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
      recordIds: {
        listings: ['listing-1'],
        matches: ['match-1', 'match-2'],
      },
    }),
  });

  const routesSection = packet.sections.find((section) => section.sectionKey === 'routes');
  const verificationSection = packet.sections.find((section) => section.sectionKey === 'verification');
  const recordsSection = packet.sections.find((section) => section.sectionKey === 'records');

  assert.deepEqual(routesSection?.entries, [
    'completed:1/3:createListing:user-create-listing:actor=user:requires=tenantId|principalId|companyId',
    'pending-review:2/3:activateListing:user-activate-listing:actor=user:requires=tenantId|principalId|companyId',
    'pending-review:3/3:generateMatchCandidates:user-generate-match-candidates:actor=user:requires=tenantId|principalId|companyId',
  ]);
  assert.deepEqual(verificationSection?.entries, [
    'verification-mode:review-safe',
    'review-packet-status:partial',
    'completed-routes:1/3',
    'pending-routes:2',
    'next-pending-route:activateListing',
    'route-coverage-note:completed-prefix-only',
    'local-derived-explanation:review-packet-status:partial',
    'local-derived-explanation:next-pending-route:activateListing',
    'local-derived-explanation:route-coverage-note:completed-prefix-only',
    'server-owned-facts:scenario-source-refs:1',
    'server-owned-facts:scenario-evidence-refs:1',
    'server-owned-facts:traceability-refs:2',
    'server-owned-facts:recorded-ids:3',
    'server-truth-claimed:false',
    'adjudication-outcome-included:false',
    'dependency-gated-seams:core-truth-closure:deferred',
  ]);
  assert.deepEqual(recordsSection?.entries, [
    'record-group:listings:count=1',
    'listings:listing-1',
    'record-group:matches:count=2',
    'matches:match-1',
    'matches:match-2',
  ]);
});

test('buildReviewPacket stays explicitly local and derived without server-owned outcomes', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const packet = buildReviewPacket({
    scenario: plan.envelope,
    bundle: buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
      completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
      recordIds: {
        listings: ['listing-1'],
      },
    }),
  });

  assert.equal(packet.details.boundary.serverTruthClaimed, false);
  assert.equal(packet.details.boundary.adjudicationOutcomeIncluded, false);
  assert.equal(packet.details.boundary.serverOwnedFactsIncluded, true);
  assert.equal(packet.details.boundary.dependencyGatedSeamsIncluded, true);
  assert.equal(packet.sections[4]?.entries.includes('server-truth-claimed:false'), true);
  assert.equal(packet.sections[4]?.entries.includes('adjudication-outcome-included:false'), true);
  assert.equal(packet.sections[4]?.entries.includes('local-derived-explanation:route-coverage-note:completed-prefix-only'), true);
  assert.equal(packet.sections[4]?.entries.includes('dependency-gated-seams:core-truth-closure:deferred'), true);
});

test('enterprise integration plane keeps review-safe and discovery visibility bounded to the shipped commercial-universe surface', () => {
  const plane = buildEnterpriseIntegrationPlaneView();

  assert.equal(plane.visibilityBoundary.boundedCommercialUniverseOnly, true);
  assert.equal(plane.visibilityBoundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(plane.visibilityBoundary.broaderSystemAuthorityClaimed, false);
  assert.deepEqual(plane.packetTruthBoundary.packetCompleteFieldFamilies, [
    'identity-mapping-fields',
    'attachment-document-media-evidence-visibility',
  ]);
  assert.equal(plane.packetTruthBoundary.inventedPacketFieldsBlocked, true);
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'evidence-submission')?.cliCommands, [
    'evidence',
  ]);
  assert.deepEqual(plane.helperGroups.find((group) => group.groupKey === 'commercial-action')?.discoveryHelperKeys, [
    'createCommercialAction',
    'getCommercialActionStatus',
    'policyCheckCommercialAction',
    'requestCommercialActionApproval',
    'executeCommercialAction',
    'getCommercialActionReceipt',
    'getCommercialActionAudit',
  ]);
});

test('exportReviewPacket returns a stable cloned packet export', () => {
  const plan = buildIndustryUniverseScenarioPlan({
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

  const packet = buildReviewPacket({
    scenario: plan.envelope,
    bundle: buildScenarioVerificationBundle({
      scenario: plan.envelope,
      verificationMode: 'review-safe',
      recordIds: {
        listings: ['listing-1'],
      },
    }),
  });

  const exportedPacket = exportReviewPacket(packet);

  assert.notEqual(exportedPacket, packet);
  assert.deepEqual(exportedPacket, packet);
  assert.throws(
    () => {
      exportedPacket.sections[0]!.entries.push('mutated-entry');
    },
    /object is not extensible|read only|readonly/i,
  );
  assert.throws(
    () => {
      exportedPacket.details.recordDetails[0]!.ids.push('mutated-id');
    },
    /object is not extensible|read only|readonly/i,
  );
  assert.equal(packet.sections[0]!.entries.includes('mutated-entry'), false);
  assert.equal(packet.details.recordDetails[0]!.ids.includes('mutated-id'), false);
});

test('legacy export remains additive-compatible', () => {
  const legacyBundle = exportVerificationBundle({
    scenarioLabel: 'wave-2-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    recordIds: {
      listings: ['listing-1'],
    },
  });
  const plan = buildIndustryUniverseScenarioPlan({
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
  const scenarioBundle = buildScenarioVerificationBundle({
    scenario: plan.envelope,
    verificationMode: 'review-safe',
    completedRouteChain: [plan.envelope.expectedRouteChain[0]!],
    recordIds: {
      listings: ['listing-1'],
    },
  });

  const exportedScenarioBundle = exportScenarioVerificationBundle(scenarioBundle);

  assert.deepEqual(legacyBundle, {
    scenarioLabel: 'wave-2-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    recordIds: {
      listings: ['listing-1'],
    },
  });
  assert.notEqual(exportedScenarioBundle, scenarioBundle);
  assert.deepEqual(exportedScenarioBundle, scenarioBundle);
});
