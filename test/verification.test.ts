import test from 'node:test';
import assert from 'node:assert/strict';

import { exportVerificationBundle } from '../src/client.ts';
import { buildScenarioRouteStep } from '../src/scenarios.ts';
import { buildIndustryUniverseScenarioPlan } from '../src/universe.ts';
import {
  appendCompletedRouteStep,
  buildScenarioVerificationBundle,
  exportScenarioVerificationBundle,
} from '../src/verification.ts';

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
