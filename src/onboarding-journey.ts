import {
  buildIdentitySessionPlaneView,
  listIdentitySessionPlaneCommandHints,
} from './identity-session-plane.js';
import { getWorkflowStageLocalSemantics } from './workflow-stage-plane.js';

export type BidviaOnboardingJourneyKey =
  | 'public-first-onboarding'
  | 'governed-run';

export type BidviaOnboardingJourneyHelperKey =
  | 'createProvisionalAgent'
  | 'queryProvisionalAgent'
  | 'claimProvisionalAgent'
  | 'getAgentReadiness'
  | 'postHeartbeat'
  | 'createCommercialAction';

export type BidviaOnboardingJourneyRelevance =
  | 'public-first-common'
  | 'governed-run-secondary';

export type BidviaOnboardingJourneyPresentationTier = 'primary' | 'secondary';

export type BidviaOnboardingJourneyStage =
  | 'public-provisional'
  | 'governed-run-support'
  | 'governed-run-execution';

export interface BidviaOnboardingJourneyDefinition {
  journeyKey: BidviaOnboardingJourneyKey;
  label: string;
  helperSteps: ReadonlyArray<{
    helperKey: BidviaOnboardingJourneyHelperKey;
    journeyStage: BidviaOnboardingJourneyStage;
    journeyStageSemantics: 'local-only';
  }>;
  relevance: BidviaOnboardingJourneyRelevance;
  presentationTier: BidviaOnboardingJourneyPresentationTier;
  firstSuccessNextStep: {
    command: string;
    rationale: string;
    journeyStage: BidviaOnboardingJourneyStage;
    journeyStageSemantics: 'local-only';
  };
}

export interface BidviaOnboardingJourneyCommandHint {
  helperKey: BidviaOnboardingJourneyHelperKey;
  command: string;
  rationale: string;
}

const identitySessionPlane = buildIdentitySessionPlaneView();
const identitySessionPlaneCommandHints = listIdentitySessionPlaneCommandHints();

const onboardingJourneyCommandHints: Record<BidviaOnboardingJourneyHelperKey, BidviaOnboardingJourneyCommandHint | null> = {
  createProvisionalAgent: identitySessionPlaneCommandHints[0]!,
  queryProvisionalAgent: identitySessionPlaneCommandHints[1]!,
  claimProvisionalAgent: identitySessionPlaneCommandHints[2]!,
  getAgentReadiness: null,
  postHeartbeat: null,
  createCommercialAction: null,
};

const onboardingJourneyDefinitions: readonly BidviaOnboardingJourneyDefinition[] = [
  {
    journeyKey: identitySessionPlane.canonicalOnboarding.journeyKey,
    label: identitySessionPlane.canonicalOnboarding.label,
    helperSteps: identitySessionPlane.canonicalOnboarding.helperSteps.map((step) => ({
      helperKey: step.helperKey,
      journeyStage: step.journeyStage,
      journeyStageSemantics: getWorkflowStageLocalSemantics(step.journeyStage),
    })),
    relevance: 'public-first-common',
    presentationTier: 'primary',
    firstSuccessNextStep: {
      ...identitySessionPlane.canonicalOnboarding.firstSuccessNextStep,
      journeyStageSemantics: getWorkflowStageLocalSemantics(
        identitySessionPlane.canonicalOnboarding.firstSuccessNextStep.journeyStage,
      ),
    },
  },
  {
    journeyKey: 'governed-run',
    label: 'Governed Run',
    helperSteps: [
      {
        helperKey: 'getAgentReadiness',
        journeyStage: 'governed-run-support',
        journeyStageSemantics: getWorkflowStageLocalSemantics('governed-run-support'),
      },
      {
        helperKey: 'postHeartbeat',
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: getWorkflowStageLocalSemantics('governed-run-execution'),
      },
      {
        helperKey: 'createCommercialAction',
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: getWorkflowStageLocalSemantics('governed-run-execution'),
      },
    ],
    relevance: 'governed-run-secondary',
    presentationTier: 'secondary',
    firstSuccessNextStep: {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
    },
  },
] as const;

export function listOnboardingJourneyDefinitions(): readonly BidviaOnboardingJourneyDefinition[] {
  return onboardingJourneyDefinitions;
}

export function requireOnboardingJourneyDefinition(
  journeyKey: BidviaOnboardingJourneyKey,
): BidviaOnboardingJourneyDefinition {
  const definition = onboardingJourneyDefinitions.find((entry) => entry.journeyKey === journeyKey);

  if (!definition) {
    throw new Error(`Missing onboarding journey definition for ${journeyKey}`);
  }

  return definition;
}

export function listOnboardingJourneyCommandHints(
  journeyKey: BidviaOnboardingJourneyKey,
): readonly BidviaOnboardingJourneyCommandHint[] {
  return requireOnboardingJourneyDefinition(journeyKey).helperSteps.flatMap(({ helperKey }) => {
    const hint = onboardingJourneyCommandHints[helperKey];
    return hint ? [hint] : [];
  });
}
