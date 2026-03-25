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
      workflowIdCount: 1,
      expectedRouteCount: 3,
      completedRouteCount: 1,
    },
    details: {
      routeDetails: [
        {
          routeKey: 'createListing',
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
        entries: ['source://market/soda-ash-light', 'evidence://supply/soda-ash-light'],
      },
      {
        sectionKey: 'routes',
        title: 'Route coverage',
        entries: ['createListing', 'activateListing', 'generateMatchCandidates'],
      },
      {
        sectionKey: 'records',
        title: 'Recorded ids',
        entries: ['listing-1'],
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
    ['scenario', 'routes', 'records'],
  );
});

test('review packet section contract supports additive reviewer-facing sections', () => {
  assert.deepEqual(bidviaReviewPacketSectionKeys, ['scenario', 'routes', 'records']);

  const sections: BidviaReviewPacketSection[] = [
    {
      sectionKey: 'scenario',
      title: 'Scenario facts',
      entries: ['source://market/soda-ash-light'],
    },
    {
      sectionKey: 'records',
      title: 'Recorded ids',
      entries: ['listing-1'],
    },
  ];

  assert.deepEqual(sections[0], {
    sectionKey: 'scenario',
    title: 'Scenario facts',
    entries: ['source://market/soda-ash-light'],
  });
  assert.deepEqual(sections[1], {
    sectionKey: 'records',
    title: 'Recorded ids',
    entries: ['listing-1'],
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
    bundle.expectedRouteChain.map((step) => step.routeKey),
    ['createListing', 'activateListing', 'generateMatchCandidates'],
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
    workflowIdCount: 1,
    expectedRouteCount: 3,
    completedRouteCount: 3,
  });
  assert.deepEqual(packet.details, {
    routeDetails: [
      {
        routeKey: 'createListing',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        completed: true,
      },
      {
        routeKey: 'activateListing',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        completed: true,
      },
      {
        routeKey: 'generateMatchCandidates',
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
      entries: [
        'source://market/soda-ash-light',
        'evidence://supply/soda-ash-light',
        'trace-1',
        'wf-1',
      ],
    },
    {
      sectionKey: 'routes',
      title: 'Route coverage',
      entries: ['createListing', 'activateListing', 'generateMatchCandidates'],
    },
    {
      sectionKey: 'records',
      title: 'Recorded ids',
      entries: ['listing-1', 'match-1'],
    },
  ]);
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
