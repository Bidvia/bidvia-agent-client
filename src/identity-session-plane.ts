import type {
  BidviaClientContext,
  BidviaCorePlaneAdoptionStatus,
  BidviaIdentitySessionPlaneCanonicalOnboardingStep,
  BidviaIdentitySessionPlaneGovernedReadPosture,
  BidviaIdentitySessionPlaneOnboardingSupportStep,
  BidviaIdentitySessionPlaneView,
  BidviaScenarioContextKey,
} from './contracts.js';
import { getCorePlaneExecutionSummary } from './plane-execution-gate.js';
import { getWorkflowStageLocalSemantics } from './workflow-stage-plane.js';

type BidviaIdentitySessionPlaneProgressInput = {
  lastCompletedStep: string | null;
  tenantIdPresent: boolean;
  principalIdPresent: boolean;
  registrationIdPresent: boolean;
};

const identitySessionPlaneAdoptionStatus: BidviaCorePlaneAdoptionStatus = {
  plane: 'identity-session',
  frozenInCore: true,
  payloadPacketStatus: 'blocked-pending-packet',
  ...getCorePlaneExecutionSummary('identity-session'),
  blockedBy: 'core-plane-payload-packet-not-yet-frozen',
  notes: ['Adopt canonical onboarding and governed-read posture without inventing broader session semantics.'],
};

const identitySessionGovernedReadPosture: BidviaIdentitySessionPlaneGovernedReadPosture = {
  accessContextFamily: 'principal-governed-read',
  requiredContext: ['tenantId', 'principalId'],
  adminSessionOptional: true,
  operatorGuidance: 'On local docker host, authority and presence reads require principal-governed tenant context. Authority-ladder reads use the same principal-governed posture, while ladder writes remain operator-governed and separate from workspace admin-session routes.',
};

const identitySessionCanonicalOnboardingSteps: readonly BidviaIdentitySessionPlaneCanonicalOnboardingStep[] = [
  {
    helperKey: 'createProvisionalAgent',
    journeyStage: 'public-provisional',
    routePathTemplate: '/runtime/agents/provisional',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    command: 'bidvia create-provisional-agent --provisional-agent-ref ...',
    rationale: 'Start the canonical public provisional create -> query -> claim path once tenant context is available locally for deterministic CLI execution.',
  },
  {
    helperKey: 'queryProvisionalAgent',
    journeyStage: 'public-provisional',
    routePathTemplate: '/runtime/agents/provisional',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
    command: 'bidvia query-provisional-agent --provisional-agent-ref ...',
    rationale: 'Check public provisional status before you attempt the canonical session-bound claim step.',
  },
  {
    helperKey: 'claimProvisionalAgent',
    journeyStage: 'public-provisional',
    routePathTemplate: '/runtime/agents/provisional/claim',
    accessContextFamily: 'session',
    contextSemantic: 'session',
    requiredContext: ['tenantId', 'sessionId'],
    command: 'bidvia claim-provisional-agent --provisional-agent-ref ... --claim-token ...',
    rationale: 'Complete the canonical session-bound provisional claim when claim material is available.',
  },
];

const identitySessionOnboardingSupportSteps:
  readonly BidviaIdentitySessionPlaneOnboardingSupportStep[] = [
    {
      helperKey: 'signUpPersonalAccount',
      routePathTemplate: '/runtime/accounts/personal/sign-up',
      requiredContext: [],
      rationale: 'Allow bounded personal account creation as pre-claim support without changing the primary provisional agent onboarding chain.',
    },
    {
      helperKey: 'signUpEnterpriseAccount',
      routePathTemplate: '/runtime/accounts/enterprise/sign-up',
      requiredContext: [],
      rationale: 'Allow bounded enterprise account creation as pre-claim support without promoting a broader account product model in the client.',
    },
    {
      helperKey: 'signIn',
      routePathTemplate: '/runtime/sessions/sign-in',
      requiredContext: [],
      rationale: 'Allow bounded session establishment before the canonical provisional claim step when Core returns session truth.',
    },
    {
      helperKey: 'refreshSession',
      routePathTemplate: '/runtime/sessions/refresh',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Preserve bounded session freshness support only after a session already exists.',
    },
    {
      helperKey: 'revokeSession',
      routePathTemplate: '/runtime/sessions/revoke',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Preserve bounded session invalidation support without widening local login semantics.',
    },
    {
      helperKey: 'getAccountMe',
      routePathTemplate: '/runtime/account/me',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Read the bounded account/session payload returned by Core without treating it as a client-owned account product.',
    },
    {
      helperKey: 'selectOrg',
      routePathTemplate: '/runtime/account/select-org',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Support bounded active-org selection when Core requires session-scoped organization resolution before claim or governed-run continuation.',
    },
    {
      helperKey: 'patchAgentSelfService',
      routePathTemplate: '/runtime/account/agents/:agentId/self-service',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Support bounded self-service updates for task dispatch acceptance, accepted scopes, participation state, and limited claimed-agent metadata without widening platform authority.',
    },
    {
      helperKey: 'getAccountAgentDispatchAuthority',
      routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Read bounded session-scoped dispatch-authority status for a claimed account agent without widening into operator or approval workflow semantics.',
    },
    {
      helperKey: 'createAccountAgentDispatchAuthorityRequest',
      routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority-requests',
      requiredContext: ['tenantId', 'sessionId'],
      rationale: 'Request dispatch-authority review through a bounded session-scoped account-agent route distinct from active role-binding activation.',
    },
  ];

function cloneRequiredContext(
  requiredContext: readonly BidviaScenarioContextKey[],
): BidviaScenarioContextKey[] {
  return [...requiredContext];
}

function cloneCanonicalOnboardingStep(
  step: BidviaIdentitySessionPlaneCanonicalOnboardingStep,
): BidviaIdentitySessionPlaneCanonicalOnboardingStep {
  return {
    ...step,
    requiredContext: cloneRequiredContext(step.requiredContext),
  };
}

function cloneOnboardingSupportStep(
  step: BidviaIdentitySessionPlaneOnboardingSupportStep,
): BidviaIdentitySessionPlaneOnboardingSupportStep {
  return {
    ...step,
    requiredContext: cloneRequiredContext(step.requiredContext),
  };
}

export function buildIdentitySessionPlaneView(): BidviaIdentitySessionPlaneView {
  const helperSteps = identitySessionCanonicalOnboardingSteps.map(cloneCanonicalOnboardingStep);
  const onboardingSupportSteps = identitySessionOnboardingSupportSteps.map(cloneOnboardingSupportStep);
  const claim = helperSteps[2]!;

  return {
    adoptionStatus: {
      ...identitySessionPlaneAdoptionStatus,
      notes: [...identitySessionPlaneAdoptionStatus.notes],
    },
    governedReadPosture: {
      ...identitySessionGovernedReadPosture,
      requiredContext: [...identitySessionGovernedReadPosture.requiredContext],
    },
    sessionTruth: {
      broaderPlatformLoginClaim: false,
      payloadPacketStatus: identitySessionPlaneAdoptionStatus.payloadPacketStatus,
      blockedBy: identitySessionPlaneAdoptionStatus.blockedBy,
      notes: [
        'Treat freshness and invalidation as blocked pending Core packet completion rather than broader login/session truth.',
        'Governed reads stay honest: tenantId plus principalId are required, with adminSessionId only as an optional companion on some routes.',
        'Account and session helpers are bounded onboarding prerequisites only and do not turn this client into a full account product.',
        'Dispatch-authority reads and requests stay session-bound and account-agent scoped, with review boundaries kept distinct from active role-binding activation.',
      ],
    },
    journeyBoundary: {
      publicProvisional: {
        label: 'Public Provisional',
        chain: 'create -> query -> claim',
        claimIsSessionBound: true,
      },
      governedRun: {
        label: 'Governed Run',
        startsAfter: 'successful claim',
      },
    },
    canonicalOnboarding: {
      journeyKey: 'public-first-onboarding',
      label: 'Public provisional onboarding',
      primaryForAgentOnboarding: true,
      helperSteps,
      claim,
      firstSuccessNextStep: {
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: getWorkflowStageLocalSemantics('governed-run-execution'),
      },
    },
    onboardingSupport: {
      label: 'Bounded V1 account/session prerequisite support',
      prerequisiteSupportOnly: true,
      fullAccountProductClaim: false,
      helperSteps: onboardingSupportSteps,
      notes: [
        'These helpers support V1 account/session prerequisites around onboarding and session continuity only.',
        'The public provisional create -> query -> claim chain remains the primary agent onboarding path.',
      ],
    },
  };
}

export function listIdentitySessionPlaneCommandHints(): Array<{
  helperKey: BidviaIdentitySessionPlaneCanonicalOnboardingStep['helperKey'];
  command: string;
  rationale: string;
}> {
  return buildIdentitySessionPlaneView().canonicalOnboarding.helperSteps.map((step) => ({
    helperKey: step.helperKey,
    command: step.command,
    rationale: step.rationale,
  }));
}

export function listIdentitySessionPlaneCanonicalHelperKeys(): Array<
  BidviaIdentitySessionPlaneCanonicalOnboardingStep['helperKey']
> {
  return buildIdentitySessionPlaneView().canonicalOnboarding.helperSteps.map((step) => step.helperKey);
}

export function buildIdentitySessionPlaneProgress(
  input: BidviaIdentitySessionPlaneProgressInput,
): {
  readinessEligibility: {
    eligible: boolean;
    missingContext: Array<'tenantId' | 'principalId' | 'registrationId'>;
  };
  lastCompletedStep: string | null;
  hasClaimCompleted: boolean;
  hasExplicitProvisionalProgress: boolean;
  publicProvisionalStatus: 'available' | 'in-progress' | 'claimed';
  governedRunStatus: 'not-ready' | 'needs-context' | 'ready';
} {
  const missingContext = [
    input.tenantIdPresent ? null : 'tenantId',
    input.principalIdPresent ? null : 'principalId',
    input.registrationIdPresent ? null : 'registrationId',
  ].filter((value): value is 'tenantId' | 'principalId' | 'registrationId' => value !== null);
  const hasExplicitProvisionalProgress = input.lastCompletedStep === 'create-provisional-agent'
    || input.lastCompletedStep === 'query-provisional-agent';
  const hasClaimCompleted = input.lastCompletedStep === 'claim-provisional-agent'
    || (!hasExplicitProvisionalProgress && input.registrationIdPresent);

  return {
    readinessEligibility: {
      eligible: missingContext.length === 0,
      missingContext,
    },
    lastCompletedStep: input.lastCompletedStep,
    hasClaimCompleted,
    hasExplicitProvisionalProgress,
    publicProvisionalStatus: hasClaimCompleted
      ? 'claimed'
      : hasExplicitProvisionalProgress
        ? 'in-progress'
        : 'available',
    governedRunStatus: !input.registrationIdPresent
      ? 'not-ready'
      : missingContext.length === 0
        ? 'ready'
        : 'needs-context',
  };
}

export function buildIdentitySessionPlaneJourneyBoundaryStatuses(input: {
  publicProvisionalStatus: 'available' | 'in-progress' | 'claimed';
  governedRunStatus: 'not-ready' | 'needs-context' | 'ready';
}) {
  const journeyBoundary = buildIdentitySessionPlaneView().journeyBoundary;

  return {
    publicProvisional: {
      ...journeyBoundary.publicProvisional,
      status: input.publicProvisionalStatus,
    },
    governedRun: {
      ...journeyBoundary.governedRun,
      status: input.governedRunStatus,
    },
  };
}

export function buildIdentitySessionPlaneCliSnapshot() {
  const plane = buildIdentitySessionPlaneView();

  return {
    adoptionStatus: plane.adoptionStatus,
    sessionTruth: plane.sessionTruth,
  };
}

export function requireIdentitySessionClaimContext(context: BidviaClientContext): {
  tenantId: string;
  sessionId: string;
} {
  const tenantId = context.tenantId?.trim();
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped read routes');
  }

  const sessionId = context.sessionId?.trim();
  if (!sessionId) {
    throw new Error('sessionId is required for session routes');
  }

  return {
    tenantId,
    sessionId,
  };
}

export function requireIdentitySessionGovernedReadContext(context: BidviaClientContext): {
  tenantId: string;
  principalId: string;
} {
  const tenantId = context.tenantId?.trim();
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped read routes');
  }

  const principalId = context.principalId?.trim();
  if (!principalId) {
    throw new Error('principalId is required for governed read routes');
  }

  return {
    tenantId,
    principalId,
  };
}
