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
  }>;
  relevance: BidviaOnboardingJourneyRelevance;
  presentationTier: BidviaOnboardingJourneyPresentationTier;
  firstSuccessNextStep: {
    command: string;
    rationale: string;
    journeyStage: BidviaOnboardingJourneyStage;
  };
}

export interface BidviaOnboardingJourneyCommandHint {
  helperKey: BidviaOnboardingJourneyHelperKey;
  command: string;
  rationale: string;
}

const onboardingJourneyCommandHints: Record<BidviaOnboardingJourneyHelperKey, BidviaOnboardingJourneyCommandHint | null> = {
  createProvisionalAgent: {
    helperKey: 'createProvisionalAgent',
    command: 'bidvia create-provisional-agent --provisional-agent-ref ...',
    rationale: 'Start the public provisional flow once tenant context is available locally for deterministic CLI execution.',
  },
  queryProvisionalAgent: {
    helperKey: 'queryProvisionalAgent',
    command: 'bidvia query-provisional-agent --provisional-agent-ref ...',
    rationale: 'Check public provisional status before you attempt the session-bound claim step.',
  },
  claimProvisionalAgent: {
    helperKey: 'claimProvisionalAgent',
    command: 'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    rationale: 'Complete the session-bound provisional-to-registration handoff when claim material is available.',
  },
  getAgentReadiness: null,
  postHeartbeat: null,
  createCommercialAction: null,
};

const onboardingJourneyDefinitions: readonly BidviaOnboardingJourneyDefinition[] = [
  {
    journeyKey: 'public-first-onboarding',
    label: 'Public provisional onboarding',
    helperSteps: [
      { helperKey: 'createProvisionalAgent', journeyStage: 'public-provisional' },
      { helperKey: 'queryProvisionalAgent', journeyStage: 'public-provisional' },
      { helperKey: 'claimProvisionalAgent', journeyStage: 'public-provisional' },
    ],
    relevance: 'public-first-common',
    presentationTier: 'primary',
    firstSuccessNextStep: {
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      journeyStage: 'governed-run-execution',
    },
  },
  {
    journeyKey: 'governed-run',
    label: 'Governed Run',
    helperSteps: [
      { helperKey: 'getAgentReadiness', journeyStage: 'governed-run-support' },
      { helperKey: 'postHeartbeat', journeyStage: 'governed-run-execution' },
      { helperKey: 'createCommercialAction', journeyStage: 'governed-run-execution' },
    ],
    relevance: 'governed-run-secondary',
    presentationTier: 'secondary',
    firstSuccessNextStep: {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      journeyStage: 'governed-run-execution',
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
