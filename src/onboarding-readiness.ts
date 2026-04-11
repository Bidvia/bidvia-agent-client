import { getRouteCapability } from './capabilities.js';
import {
  requireOnboardingJourneyDefinition,
} from './onboarding-journey.js';
import { buildIdentitySessionPlaneView } from './identity-session-plane.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import type {
  BidviaRouteCapability,
  BidviaScenarioContextKey,
} from './contracts.js';

interface BidviaGuidedRouteStep {
  helperKey: string;
  routePathTemplate: string;
  accessContextFamily: BidviaRouteCapability['accessContextFamily'];
  contextSemantic: BidviaRouteCapability['contextSemantic'];
  requiredContext: BidviaScenarioContextKey[];
}

function requireGuidedRouteStep(helperKey: string): BidviaGuidedRouteStep {
  const capability = getRouteCapability(helperKey);
  if (!capability) {
    throw new Error(`Missing route capability metadata for ${helperKey}`);
  }

  return {
    helperKey: capability.helperKey,
    routePathTemplate: capability.routePathTemplate,
    accessContextFamily: capability.accessContextFamily,
    contextSemantic: capability.contextSemantic,
    requiredContext: [...capability.requiredContext],
  };
}

function buildPublicDefaults() {
  const runtimeSnapshot = buildLocalRuntimeCapabilitySnapshot();

  return {
    baseUrl: runtimeSnapshot.baseUrl,
    environmentMode: runtimeSnapshot.environmentMode,
    environmentSelectionRequired: false,
  };
}

export function buildOnboardingReadiness() {
  const identitySessionPlane = buildIdentitySessionPlaneView();
  const journey = requireOnboardingJourneyDefinition('public-first-onboarding');
  const postClaimSupportSteps = [
    requireGuidedRouteStep('getAgentReadiness'),
    requireGuidedRouteStep('getAccountMe'),
    requireGuidedRouteStep('selectOrg'),
    requireGuidedRouteStep('patchAgentSelfService'),
  ];

  return {
    defaults: buildPublicDefaults(),
    identitySessionPlane,
    governedReadPosture: identitySessionPlane.governedReadPosture,
    journey: {
      journeyKey: journey.journeyKey,
      label: journey.label,
      steps: journey.helperSteps.map(({ helperKey }) => requireGuidedRouteStep(helperKey)),
      firstSuccessNextStep: journey.firstSuccessNextStep,
    },
    postClaimSupport: {
      label: 'Governed-run support',
      steps: postClaimSupportSteps,
    },
  };
}
