import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaRouteCapability,
  BidviaRouteCapabilityLevel,
} from '../src/contracts.ts';
import {
  bidviaLocalCapabilityRiskTiers,
  bidviaLocalCapabilityTiers,
  bidviaRouteCapabilityAccessContextFamilies,
  bidviaRouteCapabilityHttpMethods,
  bidviaRouteCapabilityLevels,
  bidviaRouteCapabilityScopes,
} from '../src/contracts.ts';
import {
  bidviaRouteCapabilities,
  getRouteCapability,
} from '../src/capabilities.ts';

test('capability contract exposes bounded descriptive metadata labels', () => {
  assert.deepEqual(bidviaLocalCapabilityTiers, [
    'L0-observe-only',
    'L1-review-safe',
    'L2-registration-runtime',
    'L3-governed-commercial',
  ]);
  assert.deepEqual(bidviaLocalCapabilityRiskTiers, [
    'observe-only',
    'review-safe',
    'runtime-execution',
    'governed-commercial',
  ]);
  assert.deepEqual(bidviaRouteCapabilityHttpMethods, ['GET', 'POST']);
  assert.deepEqual(bidviaRouteCapabilityAccessContextFamilies, [
    'tenant',
    'registration',
    'session',
    'admin-session',
    'operator-company',
    'scenario',
  ]);
  assert.deepEqual(bidviaRouteCapabilityScopes, ['read', 'write']);
  assert.deepEqual(bidviaRouteCapabilityLevels, ['atomic-route', 'chain-step', 'scenario-helper']);
});

test('capability contract represents atomic-route metadata without runtime behavior', () => {
  const level: BidviaRouteCapabilityLevel = 'atomic-route';
  const capability: BidviaRouteCapability = {
    helperKey: 'submitProposal',
    routePathTemplate: '/agent/proposals/submit',
    httpMethod: 'POST',
    accessContextFamily: 'registration',
    requiredContext: ['tenantId', 'registrationId'],
    scope: 'write',
    level,
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
  };

  assert.equal(capability.helperKey, 'submitProposal');
  assert.equal(capability.routePathTemplate, '/agent/proposals/submit');
  assert.equal(capability.httpMethod, 'POST');
  assert.equal(capability.accessContextFamily, 'registration');
  assert.deepEqual(capability.requiredContext, ['tenantId', 'registrationId']);
  assert.equal(capability.scope, 'write');
  assert.equal(capability.level, 'atomic-route');
  assert.equal(capability.localCapabilityTier, 'L2-registration-runtime');
  assert.equal(capability.localCapabilityRiskTier, 'runtime-execution');
});

test('capability contract represents scenario-helper metadata with scenario route facts', () => {
  const capability: BidviaRouteCapability = {
    helperKey: 'industryUniverseScenarioPlan',
    routePathTemplate: '/scenarios/industry-universe',
    httpMethod: 'POST',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId'],
    scope: 'write',
    level: 'scenario-helper',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    scenarioRouteSteps: [
      {
        routeKey: 'createListing',
        requiredContext: ['tenantId', 'companyId'],
      },
      {
        routeKey: 'activateListing',
        requiredContext: ['tenantId'],
      },
    ],
  };

  assert.equal(capability.helperKey, 'industryUniverseScenarioPlan');
  assert.equal(capability.accessContextFamily, 'scenario');
  assert.equal(capability.level, 'scenario-helper');
  assert.equal(capability.localCapabilityTier, 'L1-review-safe');
  assert.equal(capability.localCapabilityRiskTier, 'review-safe');
  assert.deepEqual(
    capability.scenarioRouteSteps?.map((routeStep) => routeStep.routeKey),
    ['createListing', 'activateListing'],
  );
});

test('capability registry gives every shipped route complete local tier and risk metadata', () => {
  assert.equal(bidviaRouteCapabilities.every((capability) => capability.localCapabilityTier !== undefined), true);
  assert.equal(
    bidviaRouteCapabilities.every((capability) => capability.localCapabilityRiskTier !== undefined),
    true,
  );
});

test('capability registry covers representative shipped helpers and route families', () => {
  assert.ok(bidviaRouteCapabilities.length >= 10);
  assert.deepEqual(
    bidviaRouteCapabilities
      .filter((capability) => [
        'createProvisionalAgent',
        'queryProvisionalAgent',
        'claimProvisionalAgent',
        'postHeartbeat',
        'submitProposal',
        'getCommercialActionStatus',
        'getCommercialActionReceipt',
        'createListing',
        'createConnectionRequest',
        'exportOpportunityPackage',
        'buildIndustryUniverseScenarioPlan',
        'buildConnectionApprovalScenarioPlan',
        'buildOpportunityPackageHandoffPlan',
      ].includes(capability.helperKey))
      .map((capability) => capability.helperKey),
    [
      'createProvisionalAgent',
      'queryProvisionalAgent',
      'claimProvisionalAgent',
      'postHeartbeat',
      'submitProposal',
      'getCommercialActionStatus',
      'getCommercialActionReceipt',
      'createListing',
      'createConnectionRequest',
      'exportOpportunityPackage',
      'buildIndustryUniverseScenarioPlan',
      'buildConnectionApprovalScenarioPlan',
      'buildOpportunityPackageHandoffPlan',
    ],
  );
});

test('capability registry lookup returns descriptive admin and operator route metadata', () => {
  assert.deepEqual(getRouteCapability('getCommercialActionStatus'), {
    helperKey: 'getCommercialActionStatus',
    routePathTemplate: '/runtime/commercial-actions/:commercialActionRequestId/status',
    httpMethod: 'GET',
    accessContextFamily: 'admin-session',
    requiredContext: ['tenantId', 'adminSessionId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
  });

  assert.deepEqual(getRouteCapability('createListing'), {
    helperKey: 'createListing',
    routePathTemplate: '/runtime/listings',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
  });
});

test('capability registry lookup returns shipped scenario-helper route metadata', () => {
  assert.deepEqual(getRouteCapability('buildIndustryUniverseScenarioPlan'), {
    helperKey: 'buildIndustryUniverseScenarioPlan',
    routePathTemplate: '/scenarios/industry-universe',
    httpMethod: 'POST',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'scenario-helper',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    scenarioRouteSteps: [
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
    ],
  });

  assert.equal(getRouteCapability('missing-helper'), undefined);
});
