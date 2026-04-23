import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaNextStageReadRouteDiscoveryGroup,
  BidviaRouteCapability,
  BidviaRouteCapabilityLevel,
} from '../src/contracts.ts';
import {
  bidviaRouteCapabilityContextSemantics,
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
import { buildCapabilityPlaneView } from '../src/capability-plane.ts';

function withDefaultContextSemantic(capability: BidviaRouteCapability): BidviaRouteCapability {
  return {
    ...capability,
    contextSemantic: capability.accessContextFamily,
  };
}

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
  assert.deepEqual(bidviaRouteCapabilityHttpMethods, ['GET', 'POST', 'PATCH']);
  assert.deepEqual(bidviaRouteCapabilityAccessContextFamilies, [
    'tenant',
    'registration',
    'session',
    'admin-session',
    'principal-governed-read',
    'operator-company',
    'scenario',
  ]);
  assert.deepEqual(bidviaRouteCapabilityContextSemantics, [
    'public-provisional',
    'tenant',
    'registration',
    'session',
    'admin-session',
    'principal-governed-read',
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

test('capability plane view keeps capability discovery descriptive-only until packet-complete core truth exists', () => {
  const capabilityPlane = buildCapabilityPlaneView();

  assert.deepEqual(capabilityPlane.adoptionStatus, {
    plane: 'capability',
    frozenInCore: true,
    payloadPacketStatus: 'packet-grounded',
    descriptiveVisibility: 'descriptive-plane-visible',
    executableHelperEligibility: 'packet-grounded-read',
    blockedBy: null,
    notes: ['Route remote capability refresh through one fail-closed capability-plane adapter.'],
  });
  assert.equal(capabilityPlane.localSnapshots.descriptiveOnly, true);
  assert.equal(capabilityPlane.localSnapshots.liveServerNegotiationClaimed, false);
  assert.equal(capabilityPlane.localSnapshots.remoteRegistryBehaviorClaimed, false);
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
  assert.deepEqual(getRouteCapability('createProvisionalAgent'), {
    helperKey: 'createProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional',
    httpMethod: 'POST',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
  });

  assert.deepEqual(getRouteCapability('queryProvisionalAgent'), {
    helperKey: 'queryProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional',
    httpMethod: 'GET',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
  });

  assert.deepEqual(getRouteCapability('claimProvisionalAgent'), {
    helperKey: 'claimProvisionalAgent',
    routePathTemplate: '/runtime/agents/provisional/claim',
    httpMethod: 'POST',
    accessContextFamily: 'session',
    contextSemantic: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
  });

  assert.deepEqual(getRouteCapability('getCommercialActionStatus'), {
    helperKey: 'getCommercialActionStatus',
    routePathTemplate: '/runtime/commercial-actions/:commercialActionRequestId/status',
    httpMethod: 'GET',
    accessContextFamily: 'admin-session',
    contextSemantic: 'admin-session',
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
    contextSemantic: 'operator-company',
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
    contextSemantic: 'scenario',
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
      routePathTemplate: '/runtime/account/agents/:agentId',
      httpMethod: 'GET',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAccountAgentDispatchAuthority',
      routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
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
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      scope: 'read',
      level: 'atomic-route',
      localCapabilityTier: 'L0-observe-only',
      localCapabilityRiskTier: 'observe-only',
    },
    {
      helperKey: 'getAgentAuthority',
      routePathTemplate: '/runtime/agents/:agent_registration_id/authority',
      httpMethod: 'GET',
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
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
    expectedTruthFetchCapabilities.map((capability) => withDefaultContextSemantic(capability)),
  );
});

test('capability registry marks dispatch-authority review as a session-bound account-agent request distinct from role-binding activation', () => {
  assert.deepEqual(getRouteCapability('createAccountAgentDispatchAuthorityRequest'), {
    helperKey: 'createAccountAgentDispatchAuthorityRequest',
    routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority-requests',
    httpMethod: 'POST',
    accessContextFamily: 'session',
    contextSemantic: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
  });

  const dispatchAuthorityReviewBoundary = {
    code: 'authority_class_not_dispatchable',
    permanentlyIneligible: false,
    reviewFamily: 'dispatch-authority-review',
  };
  const activeRoleBindingBoundary = {
    code: 'active_role_binding_required',
    blockedOn: 'active-role-binding',
  };

  assert.equal(dispatchAuthorityReviewBoundary.code, 'authority_class_not_dispatchable');
  assert.equal(dispatchAuthorityReviewBoundary.permanentlyIneligible, false);
  assert.equal(dispatchAuthorityReviewBoundary.reviewFamily, 'dispatch-authority-review');
  assert.equal(activeRoleBindingBoundary.code, 'active_role_binding_required');
  assert.notEqual(dispatchAuthorityReviewBoundary.reviewFamily, activeRoleBindingBoundary.blockedOn);
});

test('capability registry exposes shipped widened T2 and T3 truth-fetch helpers as real route capabilities', () => {
  const shippedExpandedHelperKeys = [
    'getAgentReadiness',
    'getAgentSummary',
    'listAgentRegistrations',
    'getAgentRegistration',
    'listAuthorityProfiles',
    'listCapabilityProfiles',
    'getAgentAuthorityProfile',
    'getAgentAuthorityLadder',
    'getAgentCapabilityProfile',
    'listCanonicalSemanticLabels',
    'getCanonicalSemanticLabel',
    'listCanonicalSemanticMappings',
    'getCanonicalSemanticMapping',
    'listParticipationStates',
    'getParticipationState',
    'createParticipationState',
    'createLease',
    'listTaskDispatches',
    'getTaskDispatch',
    'createTaskDispatch',
    'assignTaskDispatch',
    'suspendTaskDispatch',
    'resumeTaskDispatch',
    'completeTaskDispatch',
    'failTaskDispatch',
    'createClaim',
    'acceptClaim',
    'rejectClaim',
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
    'listAgentRegistrations',
    'getAgentRegistration',
    'listAuthorityProfiles',
    'listCapabilityProfiles',
    'getAgentAuthorityProfile',
    'getAgentAuthorityLadder',
    'getAgentCapabilityProfile',
    'listCanonicalSemanticLabels',
    'getCanonicalSemanticLabel',
    'listCanonicalSemanticMappings',
    'getCanonicalSemanticMapping',
    'listParticipationStates',
    'getParticipationState',
    'createParticipationState',
    'createLease',
    'listTaskDispatches',
    'getTaskDispatch',
    'createTaskDispatch',
    'assignTaskDispatch',
    'suspendTaskDispatch',
    'resumeTaskDispatch',
    'completeTaskDispatch',
    'failTaskDispatch',
    'createClaim',
    'acceptClaim',
    'rejectClaim',
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

test('capability registry keeps singular capability-profile truth canonical and demotes stale alias-only metadata', () => {
  assert.deepEqual(getRouteCapability('getAgentCapabilityProfile'), {
    helperKey: 'getAgentCapabilityProfile',
    routePathTemplate: '/runtime/agents/:agent_registration_id/capability-profile',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    contextSemantic: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
  });

  assert.equal(getRouteCapability('listAgentCapabilityProfiles'), undefined);
  assert.equal(getRouteCapability('listCanonicalSemanticTaxonomyEntries'), undefined);
  assert.equal(getRouteCapability('getCanonicalSemanticTaxonomyEntry'), undefined);
  assert.equal(getRouteCapability('listCanonicalSemanticLineageLinks'), undefined);
  assert.equal(getRouteCapability('getCanonicalSemanticLineageLink'), undefined);
});

test('capability registry describes principal-governed reads and canonical participation or account-scoped task families honestly', () => {
  assert.deepEqual(getRouteCapability('getAgentReadiness'), {
    helperKey: 'getAgentReadiness',
    routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    contextSemantic: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
  });

  assert.deepEqual(getRouteCapability('getAgentSummary'), {
    helperKey: 'getAgentSummary',
    routePathTemplate: '/runtime/agents/:agent_registration_id/summary',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    contextSemantic: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    capabilityPlaneCapabilityMode: 'packet-grounded-read',
    dispatchEligibilityDerivedFromCapabilityReadTruth: false,
    governedRunAuthorizationDerivedFromCapabilityReadTruth: false,
  });

  assert.deepEqual(getRouteCapability('listParticipationStates'), {
    helperKey: 'listParticipationStates',
    routePathTemplate: '/runtime/agents/:agent_registration_id/participation-states',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    contextSemantic: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    taskPlaneCapabilityMode: 'visibility-only',
  });

  assert.deepEqual(getRouteCapability('listTaskDispatches'), {
    helperKey: 'listTaskDispatches',
    routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches',
    httpMethod: 'GET',
    accessContextFamily: 'principal-governed-read',
    contextSemantic: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    scope: 'read',
    level: 'atomic-route',
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    taskPlaneCapabilityMode: 'visibility-only',
  });

  assert.deepEqual(
    [
      'createLease',
      'createTaskDispatch',
      'assignTaskDispatch',
      'suspendTaskDispatch',
      'resumeTaskDispatch',
      'completeTaskDispatch',
      'failTaskDispatch',
      'createClaim',
      'acceptClaim',
      'rejectClaim',
    ].map((helperKey) => getRouteCapability(helperKey)),
    [
      {
        helperKey: 'createLease',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/leases',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'createTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'assignTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/assign',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'suspendTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/suspend',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'resumeTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/resume',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'completeTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/complete',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'failTaskDispatch',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/fail',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'createClaim',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'acceptClaim',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims/:claim_id/accept',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
      {
        helperKey: 'rejectClaim',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims/:claim_id/reject',
        httpMethod: 'POST',
        accessContextFamily: 'operator-company',
        contextSemantic: 'operator-company',
        requiredContext: ['tenantId', 'principalId', 'companyId'],
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L3-governed-commercial',
        localCapabilityRiskTier: 'governed-commercial',
        taskPlaneCapabilityMode: 'packet-grounded-execution',
      },
    ],
  );
});

test('capability registry promotes shipped governed profile writes into canonical route metadata', () => {
  assert.deepEqual(getRouteCapability('postAgentAuthorityProfile'), {
    helperKey: 'postAgentAuthorityProfile',
    routePathTemplate: '/runtime/agents/:agent_registration_id/authority-profile',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    contextSemantic: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
  });

  assert.deepEqual(getRouteCapability('postAgentAuthorityLadder'), {
    helperKey: 'postAgentAuthorityLadder',
    routePathTemplate: '/runtime/agents/:agent_registration_id/authority-ladder',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    contextSemantic: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
  });

  assert.deepEqual(getRouteCapability('postAgentCapabilityProfile'), {
    helperKey: 'postAgentCapabilityProfile',
    routePathTemplate: '/runtime/agents/:agent_registration_id/capability-profile',
    httpMethod: 'POST',
    accessContextFamily: 'operator-company',
    contextSemantic: 'operator-company',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    scope: 'write',
    level: 'atomic-route',
    localCapabilityTier: 'L3-governed-commercial',
    localCapabilityRiskTier: 'governed-commercial',
  });
});

test('next-stage governance discovery group stays metadata-only after shipped principal-governed reads moved into canonical route metadata', () => {
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
