import type { BidviaExecutionGuidanceEntry } from './contracts.js';

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
