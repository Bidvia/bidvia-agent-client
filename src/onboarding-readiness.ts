import { getRouteCapability } from './capabilities.js';
import {
  requireOnboardingJourneyDefinition,
} from './onboarding-journey.js';
import { buildIdentitySessionPlaneView } from './identity-session-plane.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import {
  buildClaimantContinuationSurfaces,
  buildExecutionGuidanceEntries,
  buildPostClaimDecisionTable,
} from './execution-guidance.js';
import type {
  BidviaExecutionGuidanceCheckpoint,
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

interface BidviaGuidedProgressionCheckpoint extends BidviaExecutionGuidanceCheckpoint {
  surfacedSteps: BidviaGuidedRouteStep[];
}

function requireTaskWriteReadyProgression() {
  const progression = buildExecutionGuidanceEntries().find((entry) => entry.guidanceKey === 'task-write-ready');
  if (!progression || !progression.checkpoints) {
    throw new Error('Missing task-write-ready execution guidance');
  }

  const checkpoints: BidviaGuidedProgressionCheckpoint[] = progression.checkpoints.map((checkpoint) => {
    switch (checkpoint.stepKey) {
      case 'self-service-patch':
        return {
          ...checkpoint,
          surfacedSteps: [
            requireGuidedRouteStep('getAgentReadiness'),
            requireGuidedRouteStep('getAccountMe'),
            requireGuidedRouteStep('selectOrg'),
            requireGuidedRouteStep('patchAgentSelfService'),
          ],
        };
      case 'dispatch-authority-request':
        return {
          ...checkpoint,
          surfacedSteps: [
            requireGuidedRouteStep('getAccountAgentDispatchAuthority'),
            requireGuidedRouteStep('createAccountAgentDispatchAuthorityRequest'),
          ],
        };
      case 'operator-review-closure':
        return {
          ...checkpoint,
          surfacedSteps: [
            requireGuidedRouteStep('getAccountAgentDispatchAuthority'),
          ],
        };
      case 'external-binding-completion':
        return {
          ...checkpoint,
          surfacedSteps: [
            requireGuidedRouteStep('createAccountAgentExternalBinding'),
            requireGuidedRouteStep('listAccountAgentBindings'),
          ],
        };
      case 'post-step-truth-check':
        return {
          ...checkpoint,
          surfacedSteps: [
            requireGuidedRouteStep('getAgentReadiness'),
            requireGuidedRouteStep('getAccountAgentDispatchAuthority'),
          ],
        };
    }
  });

  return {
    ...progression,
    checkpoints,
  };
}

function requireExecutionGuidanceEntry(
  guidanceKey: 'task-write-ready' | 'authorization-projection' | 'proof-lane' | 'runtime-generated-closure',
) {
  const guidance = buildExecutionGuidanceEntries().find((entry) => entry.guidanceKey === guidanceKey);
  if (!guidance) {
    throw new Error(`Missing execution guidance entry for ${guidanceKey}`);
  }

  return {
    ...guidance,
    ...(guidance.checkpoints === undefined ? {} : { checkpoints: guidance.checkpoints.map((checkpoint) => ({
      ...checkpoint,
      verificationCheckpoint: {
        ...checkpoint.verificationCheckpoint,
        helperKeys: [...checkpoint.verificationCheckpoint.helperKeys],
        truthFields: [...checkpoint.verificationCheckpoint.truthFields],
      },
    })) }),
  };
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
      progression: requireTaskWriteReadyProgression(),
      authorizationProjectionGate: requireExecutionGuidanceEntry('authorization-projection'),
      claimantContinuations: buildClaimantContinuationSurfaces(),
      decisionTable: buildPostClaimDecisionTable(),
    },
  };
}
