import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaScenarioEnvelope,
  BidviaScenarioRouteStep,
} from '../src/contracts.ts';
import {
  buildScenarioEnvelope,
  buildScenarioRouteStep,
  requireNonEmptyScenarioRouteChain,
} from '../src/scenarios.ts';

test('scenario core accepts route chain and context keys', () => {
  const expectedRouteChain: BidviaScenarioRouteStep[] = [
    {
      routeKey: 'createListing',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
    },
    {
      routeKey: 'activateListing',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
    },
    {
      routeKey: 'generateMatchCandidates',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
    },
  ];

  const envelope: BidviaScenarioEnvelope = {
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    scenarioFamily: 'industry-universe',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    expectedRouteChain,
    recordIds: {
      listings: ['listing-1'],
    },
  };

  assert.deepEqual(requireNonEmptyScenarioRouteChain(envelope.expectedRouteChain), expectedRouteChain);
  assert.deepEqual(envelope.expectedRouteChain[0]?.requiredContext, ['tenantId', 'principalId', 'companyId']);
});

test('scenario core rejects empty expected route chain', () => {
  assert.throws(
    () => requireNonEmptyScenarioRouteChain([]),
    /expectedRouteChain must contain at least one route step/,
  );
});

test('generic scenario builder normalizes refs and route steps', () => {
  const createListing = buildScenarioRouteStep('createListing', [
    'tenantId',
    'principalId',
    'companyId',
    'companyId',
  ]);
  const activateListing = buildScenarioRouteStep('activateListing', [
    'tenantId',
    'principalId',
    'companyId',
  ]);

  const envelope = buildScenarioEnvelope({
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    scenarioFamily: 'industry-universe',
    sourceRefs: ['source://market/soda-ash-light', 'source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light', 'evidence://supply/soda-ash-light'],
    traceIds: ['trace-1', 'trace-1'],
    workflowIds: ['wf-1', 'wf-1'],
    expectedRouteChain: [createListing, activateListing],
  });

  assert.deepEqual(envelope.sourceRefs, ['source://market/soda-ash-light']);
  assert.deepEqual(envelope.evidenceRefs, ['evidence://supply/soda-ash-light']);
  assert.deepEqual(envelope.traceIds, ['trace-1']);
  assert.deepEqual(envelope.workflowIds, ['wf-1']);
  assert.deepEqual(envelope.expectedRouteChain[0]?.requiredContext, ['tenantId', 'principalId', 'companyId']);
});

test('generic scenario builder rejects missing scenarioId', () => {
  assert.throws(
    () => buildScenarioEnvelope({
      scenarioId: '',
      scenarioLabel: 'industry-universe-soda-ash-light',
      scenarioFamily: 'industry-universe',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://supply/soda-ash-light'],
      traceIds: ['trace-1'],
      workflowIds: ['wf-1'],
      expectedRouteChain: [
        buildScenarioRouteStep('createListing', ['tenantId', 'principalId', 'companyId']),
      ],
    }),
    /scenarioId is required/,
  );
});
