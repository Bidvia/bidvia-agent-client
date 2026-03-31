import { getRouteCapability } from './capabilities.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import type {
  BidviaRouteCapability,
  BidviaScenarioContextKey,
} from './contracts.js';

interface BidviaGuidedRouteStep {
  helperKey: string;
  routePathTemplate: string;
  accessContextFamily: BidviaRouteCapability['accessContextFamily'];
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
  return {
    defaults: buildPublicDefaults(),
    journey: {
      journeyKey: 'public-first-onboarding',
      label: 'Public-first onboarding readiness',
      steps: [
        requireGuidedRouteStep('createProvisionalAgent'),
        requireGuidedRouteStep('queryProvisionalAgent'),
        requireGuidedRouteStep('claimProvisionalAgent'),
        requireGuidedRouteStep('getAgentReadiness'),
      ],
      firstSuccessNextStep: {
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      },
    },
  };
}
