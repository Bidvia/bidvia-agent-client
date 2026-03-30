import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaNextStageReadRouteDiscoveryGroup,
  BidviaRouteCapability,
  BidviaRouteCapabilityLevel,
} from '../src/contracts.ts';
import {
  bidviaLocalCapabilityRiskTiers,
  bidviaLocalCapabilityTiers,
  bidviaNextStageReadRouteDiscoveryGroupKeys,
  bidviaNextStageReadRouteDiscoveryStatuses,
  bidviaRouteCapabilityAccessContextFamilies,
  bidviaRouteCapabilityHttpMethods,
  bidviaRouteCapabilityLevels,
  bidviaRouteCapabilityScopes,
} from '../src/contracts.ts';
import {
  bidviaRouteCapabilities,
  bidviaNextStageReadRouteDiscoveryGroups,
  getRouteCapability,
  getNextStageReadRouteDiscoveryGroup,
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

test('capability registry exposes approved truth-fetch helpers as local read-only route metadata', () => {
  const expectedTruthFetchCapabilities: BidviaRouteCapability[] = [
    {
      helperKey: 'listAccountAgents',
      routePathTemplate: '/runtime/account/agents',
      httpMethod: 'GET',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAccountAgent',
      routePathTemplate: '/runtime/account/agents/:agent_registration_id',
      httpMethod: 'GET',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listAccountAgentBindings',
      routePathTemplate: '/runtime/account/agent-bindings',
      httpMethod: 'GET',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listAccountRecords',
      routePathTemplate: '/runtime/account/records',
      httpMethod: 'GET',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAgentPresence',
      routePathTemplate: '/runtime/agents/:agent_registration_id/presence',
      httpMethod: 'GET',
      accessContextFamily: 'admin-session',
      requiredContext: ['tenantId', 'adminSessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAgentAuthority',
      routePathTemplate: '/runtime/agents/:agent_registration_id/authority',
      httpMethod: 'GET',
      accessContextFamily: 'admin-session',
      requiredContext: ['tenantId', 'adminSessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listCanonicalSemanticConcepts',
      routePathTemplate: '/runtime/canonical-semantic-concepts',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getCanonicalSemanticConcept',
      routePathTemplate: '/runtime/canonical-semantic-concepts/:canonical_semantic_concept_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listPricingBases',
      routePathTemplate: '/runtime/pricing-bases',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getPricingBasis',
      routePathTemplate: '/runtime/pricing-bases/:pricing_basis_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listDocumentArtifacts',
      routePathTemplate: '/runtime/document-artifacts',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getDocumentArtifact',
      routePathTemplate: '/runtime/document-artifacts/:document_artifact_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listMediaAssets',
      routePathTemplate: '/runtime/media-assets',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getMediaAsset',
      routePathTemplate: '/runtime/media-assets/:media_asset_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listEvidenceAssets',
      routePathTemplate: '/runtime/evidence-assets',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getEvidenceAsset',
      routePathTemplate: '/runtime/evidence-assets/:evidence_asset_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'listAttachmentBindings',
      routePathTemplate: '/runtime/attachment-bindings',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAttachmentBinding',
      routePathTemplate: '/runtime/attachment-bindings/:attachment_binding_id',
      httpMethod: 'GET',
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
  ];

  assert.deepEqual(
    expectedTruthFetchCapabilities.map((capability) => getRouteCapability(capability.helperKey)),
    expectedTruthFetchCapabilities,
  );
});

test('capability registry exposes shipped widened T2 and T3 truth-fetch helpers as real route capabilities', () => {
  const shippedExpandedHelperKeys = [
    'getAgentReadiness',
    'getAgentSummary',
    'getAgentAuthorityProfile',
    'getAgentAuthorityLadder',
    'listAgentCapabilityProfiles',
    'getAgentCapabilityProfile',
    'listCanonicalSemanticLabels',
    'getCanonicalSemanticLabel',
    'listCanonicalSemanticMappings',
    'getCanonicalSemanticMapping',
    'listCanonicalSemanticTaxonomyEntries',
    'getCanonicalSemanticTaxonomyEntry',
    'listCanonicalSemanticLineageLinks',
    'getCanonicalSemanticLineageLink',
    'listPricingRuleAtoms',
    'getPricingRuleAtom',
    'listPricingQuotationMethodModules',
    'getPricingQuotationMethodModule',
    'listPricingQuoteTemplates',
    'getPricingQuoteTemplate',
    'listPricingQuotations',
    'getPricingQuotation',
    'listPricingExplanations',
    'getPricingExplanation',
    'listFileResources',
    'getFileResource',
    'listTargetAttachmentBindings',
  ] as const;

  assert.equal(
    shippedExpandedHelperKeys.every((helperKey) => getRouteCapability(helperKey) !== undefined),
    true,
  );
});

test('next-stage discovery groups no longer relabel shipped widened helpers as metadata-only futures', () => {
  const shippedExpandedHelperKeys = new Set([
    'getAgentReadiness',
    'getAgentSummary',
    'getAgentAuthorityProfile',
    'getAgentAuthorityLadder',
    'listAgentCapabilityProfiles',
    'getAgentCapabilityProfile',
    'listCanonicalSemanticLabels',
    'getCanonicalSemanticLabel',
    'listCanonicalSemanticMappings',
    'getCanonicalSemanticMapping',
    'listCanonicalSemanticTaxonomyEntries',
    'getCanonicalSemanticTaxonomyEntry',
    'listCanonicalSemanticLineageLinks',
    'getCanonicalSemanticLineageLink',
    'listPricingRuleAtoms',
    'getPricingRuleAtom',
    'listPricingQuotationMethodModules',
    'getPricingQuotationMethodModule',
    'listPricingQuoteTemplates',
    'getPricingQuoteTemplate',
    'listPricingQuotations',
    'getPricingQuotation',
    'listPricingExplanations',
    'getPricingExplanation',
    'listFileResources',
    'getFileResource',
    'listTargetAttachmentBindings',
  ]);

  assert.equal(
    bidviaNextStageReadRouteDiscoveryGroups.flatMap((group) => group.members)
      .some((member) => shippedExpandedHelperKeys.has(member.helperKey)),
    false,
  );
});

test('next-stage discovery contracts expose metadata-only route status labels for future read foundations', () => {
  assert.deepEqual(bidviaNextStageReadRouteDiscoveryStatuses, ['metadata-only']);
  assert.deepEqual(bidviaNextStageReadRouteDiscoveryGroupKeys, [
    'governance-deep-reads',
    'semantic-truth-fetch-expansion',
    'pricing-truth-fetch-expansion',
    'asset-truth-fetch-expansion',
  ]);
});

test('next-stage governance discovery group describes richer admin-session deep reads without claiming server truth', () => {
  const expectedGroup: BidviaNextStageReadRouteDiscoveryGroup = {
    groupKey: 'governance-deep-reads',
    label: 'Richer governance deep reads',
    description:
      'Metadata-only bucket reserved for future governance deep-read additions beyond the helpers already shipped in routeCapabilities.',
    discoveryStatus: 'metadata-only',
    discoveryOnly: true,
    serverTruthClaimed: false,
    members: [],
  };

  assert.deepEqual(getNextStageReadRouteDiscoveryGroup('governance-deep-reads'), expectedGroup);
});

test('next-stage truth-fetch discovery groups describe semantic pricing and asset expansion candidates', () => {
  assert.deepEqual(
    bidviaNextStageReadRouteDiscoveryGroups.map((group) => group.groupKey),
    [
      'governance-deep-reads',
      'semantic-truth-fetch-expansion',
      'pricing-truth-fetch-expansion',
      'asset-truth-fetch-expansion',
    ],
  );

  assert.deepEqual(getNextStageReadRouteDiscoveryGroup('semantic-truth-fetch-expansion'), {
    groupKey: 'semantic-truth-fetch-expansion',
    label: 'Broader semantic truth-fetch families',
    description:
      'Metadata-only bucket reserved for future semantic truth-fetch additions beyond the helpers already shipped in routeCapabilities.',
    discoveryStatus: 'metadata-only',
    discoveryOnly: true,
    serverTruthClaimed: false,
    members: [],
  });

  assert.deepEqual(getNextStageReadRouteDiscoveryGroup('pricing-truth-fetch-expansion')?.members, []);

  assert.deepEqual(getNextStageReadRouteDiscoveryGroup('asset-truth-fetch-expansion')?.members, []);
});
