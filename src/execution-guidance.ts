import type {
  BidviaClaimantContinuationSurface,
  BidviaExecutionGuidanceEntry,
  BidviaPostClaimDecisionRule,
} from './contracts.js';

const claimantContinuationSurfaces = [
  {
    stepKey: 'self-service-patch',
    actor: 'external-claimed-agent',
    command: 'agent-self-service --agent-id ... --input ...',
    recognizedCoreSuggestedNextSteps: ['patch_agent_self_service'],
    recognizedCoreNextStepKinds: ['self_service_patch'],
  },
  {
    stepKey: 'dispatch-authority-request',
    actor: 'external-claimed-agent',
    command: 'account-agent-dispatch-authority-request --agent-id ...',
    recognizedCoreSuggestedNextSteps: ['create_dispatch_authority_request'],
    recognizedCoreNextStepKinds: ['dispatch_authority_request'],
  },
] as const satisfies BidviaClaimantContinuationSurface[];

const postClaimDecisionTable = [
  {
    decisionKey: 'broken-core-suggested-next-step',
    priority: 300,
  },
  {
    decisionKey: 'supported-claimant-next-step',
    priority: 200,
  },
  {
    decisionKey: 'authorization-projection-gate',
    priority: 100,
  },
] as const satisfies BidviaPostClaimDecisionRule[];

function normalizePostClaimSignal(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.toLowerCase() : undefined;
}

export function buildClaimantContinuationSurfaces(): BidviaClaimantContinuationSurface[] {
  return claimantContinuationSurfaces.map((continuation) => ({
    ...continuation,
    recognizedCoreSuggestedNextSteps: [...continuation.recognizedCoreSuggestedNextSteps],
    recognizedCoreNextStepKinds: [...continuation.recognizedCoreNextStepKinds],
  }));
}

export function buildPostClaimDecisionTable(): BidviaPostClaimDecisionRule[] {
  return postClaimDecisionTable.map((rule) => ({ ...rule }));
}

export function resolveCoreSuggestedClaimantContinuation(
  recommendedNextStep: string | undefined,
  nextStepKind: string | undefined,
  requiredActor?: string,
  canSelfResolve?: boolean,
): {
  status: 'none' | 'supported' | 'broken';
  continuation?: BidviaClaimantContinuationSurface;
} {
  const normalizedRecommendedNextStep = normalizePostClaimSignal(recommendedNextStep);
  const normalizedNextStepKind = normalizePostClaimSignal(nextStepKind);

  if (!normalizedRecommendedNextStep && !normalizedNextStepKind) {
    return { status: 'none' };
  }

  const normalizedRequiredActor = normalizePostClaimSignal(requiredActor);
  const claimantOwnedActor = normalizedRequiredActor === 'user'
    || normalizedRequiredActor === 'claimant'
    || normalizedRequiredActor === 'external_claimed_agent'
    || normalizedRequiredActor === 'external-claimed-agent';

  const continuationBySuggestedStep = normalizedRecommendedNextStep
    ? claimantContinuationSurfaces.find((continuation) => (continuation.recognizedCoreSuggestedNextSteps as readonly string[])
      .some((value) => value === normalizedRecommendedNextStep))
    : undefined;
  const continuationByStepKind = normalizedNextStepKind
    ? claimantContinuationSurfaces.find((continuation) => (continuation.recognizedCoreNextStepKinds as readonly string[])
      .some((value) => value === normalizedNextStepKind))
    : undefined;

  if (continuationBySuggestedStep && continuationByStepKind) {
    if (continuationBySuggestedStep.stepKey !== continuationByStepKind.stepKey) {
      return { status: 'broken' };
    }

    return claimantOwnedActor && canSelfResolve === true
      ? { status: 'supported', continuation: { ...continuationBySuggestedStep } }
      : { status: 'broken' };
  }

  if (continuationBySuggestedStep && !normalizedNextStepKind) {
    return claimantOwnedActor && canSelfResolve === true
      ? { status: 'supported', continuation: { ...continuationBySuggestedStep } }
      : { status: 'broken' };
  }

  if (continuationByStepKind && !normalizedRecommendedNextStep) {
    return claimantOwnedActor && canSelfResolve === true
      ? { status: 'supported', continuation: { ...continuationByStepKind } }
      : { status: 'broken' };
  }

  if (continuationBySuggestedStep || continuationByStepKind) {
    return { status: 'broken' };
  }

  return { status: 'none' };
}

export function buildExecutionGuidanceEntries(): BidviaExecutionGuidanceEntry[] {
  return [
    {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      nextStepOwner: 'operator-or-admin',
      nextStepAction: 'Follow the surfaced task-write-ready progression and keep unresolved Core-owned progression visible instead of assuming claim is sufficient.',
      checkpoints: [
        {
          stepKey: 'self-service-patch',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Patch claimed-agent self-service state first so task-dispatch acceptance and related readiness inputs are explicit before requesting operator intervention.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read readiness after the self-service patch and stay blocked if Core truth still does not show task-write-ready or dispatch-eligible state.',
          },
          failClosedState: 'A successful self-service patch does not itself make the claimed agent task-write-ready or dispatch-eligible.',
        },
        {
          stepKey: 'dispatch-authority-request',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'If readiness is still blocked, submit the bounded dispatch-authority request rather than assuming claim already granted runnable authority.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Re-read dispatch-authority and readiness after the request; treat the request as pending until Core-owned truth changes.',
          },
          failClosedState: 'Submitting the request alone does not make the subject dispatchable and does not close operator/admin review.',
        },
        {
          stepKey: 'operator-review-closure',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Wait for the real operator/admin review closure on the requested authority path instead of inventing a client-side approval outcome.',
          verificationCheckpoint: {
            helperKeys: ['getAccountAgentDispatchAuthority', 'getAgentReadiness'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'After review closes, re-read the surfaced truth helpers to confirm whether Core now reports runnable authority.',
          },
          failClosedState: 'If operator/admin closure is absent or unresolved, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'external-binding-completion-unresolved',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Inspect the shipped account-agent binding read surface to see whether an external binding already exists. Current repo truth does not prove a binding-completion write or closure helper, so keep this step unresolved and fail-closed instead of inventing completion.',
          verificationCheckpoint: {
            helperKeys: ['listAccountAgentBindings'],
            truthFields: [],
            guidance: 'Use the account-agent binding read surface only for visibility. Current repo truth does not expose a packet-grounded completion helper or completion truth field for external binding closure.',
          },
          failClosedState: 'Until Core exposes a concrete binding-completion path and the returned reads confirm runnable truth, keep the subject non-dispatchable.',
        },
        {
          stepKey: 'post-step-truth-check',
          actor: 'external-claimed-agent',
          lane: 'default-local-docker',
          surfacedAction: 'Use the shipped read helpers to verify the final task-write-ready and dispatch-eligibility truth before attempting task execution.',
          verificationCheckpoint: {
            helperKeys: ['getAgentReadiness', 'getAccountAgentDispatchAuthority'],
            truthFields: ['taskWriteReady', 'dispatchEligibility'],
            guidance: 'Only treat the progression as complete when the returned truth confirms task-write-ready and dispatch-eligibility state.',
          },
          failClosedState: 'If the post-step reads do not confirm both truth fields, remain fail-closed and do not treat the subject as runnable.',
        },
      ],
    },
    {
      guidanceKey: 'authorization-projection',
      lane: 'default-local-docker',
      appliesWhen: 'account-plane-succeeds-but-governed-runtime-still-denied',
      signal: 'active_role_binding_required',
      nextStepOwner: 'enterprise-admin',
      nextStepAction: 'Keep claimant continuation on the account-owned plane, use only the allowed account/session/org repair actions surfaced by Core, and if the gate still remains after those repairs, treat it as an unresolved Core-owned authorization projection issue rather than inventing a new claimant or operator workflow.',
    },
    {
      guidanceKey: 'proof-lane',
      lane: 'proof-lane-admin-session',
      appliesWhen: 'deterministic-proof-validation',
      signal: 'admin-session-required',
      nextStepOwner: 'admin',
      nextStepAction: 'Use a real admin session for proof-lane walkthroughs rather than assuming fixed proof ids are runnable on default local docker.',
    },
    {
      guidanceKey: 'runtime-generated-closure',
      lane: 'runtime-generated',
      appliesWhen: 'business-universe-closure',
      signal: 'fixed-fixture-not-required',
      nextStepOwner: 'agent',
      nextStepAction: 'Create the required runtime objects yourself and continue with the returned ids instead of depending on fixed fixture identifiers.',
    },
  ];
}
