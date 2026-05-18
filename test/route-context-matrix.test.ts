import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildRouteContextMatrix separates public provisional onboarding from governed-run support and governed-run execution', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildRouteContextMatrix, 'function');
  assert.equal(typeof exports.buildIdentitySessionPlaneView, 'function');
  assert.equal(typeof exports.buildTaskPlaneView, 'function');

  const matrix = (exports.buildRouteContextMatrix as () => unknown)();
  const identitySessionPlane = (exports.buildIdentitySessionPlaneView as () => unknown)();
  const taskPlane = (exports.buildTaskPlaneView as () => unknown)();

  const typedMatrix = matrix as {
    defaults: {
      baseUrl: string;
      environmentMode: string;
      environmentSelectionRequired: boolean;
    };
    identitySessionPlane: unknown;
    taskPlane: unknown;
    workflowStagePlane: {
      localJourneyStages: {
        labels: string[];
      };
      coreStageSemantics: {
        payloadPacketStatus: string;
        blockedBy: string | null;
        packetGroundedStageIdentifiers: string[];
        transitionRules: string[];
      };
    };
    governedReadPosture: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    firstSuccessNextSteps: Record<string, unknown>;
    executionGuidance: Array<Record<string, unknown>>;
  };

  assert.deepEqual(typedMatrix.defaults, {
    baseUrl: 'https://api.bidvia.cn',
    environmentMode: 'production',
    environmentSelectionRequired: false,
  });

  assert.deepEqual(typedMatrix.identitySessionPlane, identitySessionPlane);
  assert.deepEqual(typedMatrix.taskPlane, taskPlane);
  assert.deepEqual(typedMatrix.workflowStagePlane.localJourneyStages.labels, [
    'public-provisional',
    'governed-run-support',
    'governed-run-execution',
  ]);
  assert.equal(typedMatrix.workflowStagePlane.coreStageSemantics.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(typedMatrix.workflowStagePlane.coreStageSemantics.blockedBy, 'core-write-semantics-not-frozen');
  assert.deepEqual(typedMatrix.workflowStagePlane.coreStageSemantics.packetGroundedStageIdentifiers, []);
  assert.deepEqual(typedMatrix.workflowStagePlane.coreStageSemantics.transitionRules, []);

  assert.deepEqual(typedMatrix.governedReadPosture, {
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    adminSessionOptional: true,
    operatorGuidance: 'On local docker host, authority and presence reads require principal-governed tenant context. Authority-ladder reads use the same principal-governed posture, while ladder writes remain operator-governed and separate from workspace admin-session routes.',
  });

  assert.deepEqual(typedMatrix.rows.slice(0, 6), [
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'createProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'queryProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'read-only',
      executionTruth: 'packet-grounded-read',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'observe-only',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'truth-fetch-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'claimProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional/claim',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'session',
      contextSemantic: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'governed-run',
      helperKey: 'getAgentReadiness',
      routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-support',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'principal-governed-read',
      contextSemantic: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      operationKind: 'read-only',
      executionTruth: 'packet-grounded-read',
      executionBlockedBy: null,
      localCapabilityRiskTier: 'observe-only',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'truth-fetch-result',
    },
  ]);

  assert.deepEqual(
    typedMatrix.rows
      .filter((row) => row.journeyKey === 'public-first-onboarding')
      .map((row) => row.helperKey),
    [
      'createProvisionalAgent',
      'queryProvisionalAgent',
      'claimProvisionalAgent',
    ],
  );

  assert.deepEqual(
    typedMatrix.rows
      .filter((row) => row.journeyKey === 'governed-run')
      .map((row) => row.helperKey),
    ['getAgentReadiness'],
  );

  assert.deepEqual(typedMatrix.firstSuccessNextSteps, {
    'public-first-onboarding': {
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
    },
    'governed-run': {
      command: 'account-agent --agent-id ...',
      rationale: 'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
      journeyStage: 'governed-run-support',
      journeyStageSemantics: 'local-only',
    },
  });

  assert.deepEqual(
    typedMatrix.rows
      .filter((row) => row.journeyStage === 'public-provisional')
      .map((row) => row.helperKey),
    ['createProvisionalAgent', 'queryProvisionalAgent', 'claimProvisionalAgent'],
  );

  assert.deepEqual(
    typedMatrix.rows
      .filter((row) => row.journeyStage === 'governed-run-support')
      .map((row) => row.helperKey),
    ['getAgentReadiness'],
  );

  assert.deepEqual(
    (exports.buildRouteContextMatrixNextStepHints as () => unknown)(),
    [
      {
        journeyKey: 'public-first-onboarding',
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: 'local-only',
        relevance: 'public-first-common',
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      },
      {
        journeyKey: 'governed-run',
        journeyStage: 'governed-run-support',
        journeyStageSemantics: 'local-only',
        relevance: 'governed-run-secondary',
        command: 'account-agent --agent-id ...',
        rationale: 'Use the canonical account-plane claimed-agent detail readback first so post-claim continuation starts from the current account-owned surface instead of older registration-bound operational packaging.',
      },
    ],
  );

  assert.deepEqual(typedMatrix.executionGuidance, [
    {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      errorCategory: 'expected-bounded-behavior',
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
          stepKey: 'external-binding-completion',
          actor: 'operator-or-admin',
          lane: 'default-local-docker',
          surfacedAction: 'Use the shipped first-class account-plane external binding write helper together with the account-agent binding read surface when the current Core-owned route/body contract for that lane is explicit, then verify returned task-write-ready and dispatch-eligibility truth before treating the subject as runnable.',
          verificationCheckpoint: {
            helperKeys: ['createAccountAgentExternalBinding', 'listAccountAgentBindings'],
            truthFields: [],
            guidance: 'Use the shipped external binding write helper plus the account-agent binding read surface for visibility, and verify returned task-write-ready or dispatch-eligibility truth after any binding write. Claimant and operator routes still use different body contracts, so remain fail-closed when the current lane lacks an explicit Core-owned route/body contract.',
          },
          failClosedState: 'Until the current lane has an explicit Core-owned binding route/body contract and the returned reads confirm runnable truth, keep the subject non-dispatchable.',
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
      errorCategory: 'probable-core-contradiction',
      nextStepOwner: 'enterprise-admin',
      nextStepAction: 'Keep claimant continuation on the account-owned plane, use only the allowed account/session/org repair actions surfaced by Core, and if the gate still remains after those repairs, treat it as an unresolved Core-owned authorization projection issue rather than inventing a new claimant or operator workflow.',
    },
    {
      guidanceKey: 'proof-lane',
      lane: 'proof-lane-admin-session',
      appliesWhen: 'deterministic-proof-validation',
      signal: 'admin-session-required',
      errorCategory: 'client-misuse',
      nextStepOwner: 'admin',
      nextStepAction: 'Use a real admin session for proof-lane walkthroughs rather than assuming fixed proof ids are runnable on default local docker.',
    },
    {
      guidanceKey: 'runtime-generated-closure',
      lane: 'runtime-generated',
      appliesWhen: 'business-universe-closure',
      signal: 'fixed-fixture-not-required',
      errorCategory: 'client-misuse',
      nextStepOwner: 'agent',
      nextStepAction: 'Create the required runtime objects yourself and continue with the returned ids instead of depending on fixed fixture identifiers.',
    },
  ]);

  assert.equal((typedMatrix.taskPlane as { timeoutTruth: { payloadPacketStatus: string } }).timeoutTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal((typedMatrix.taskPlane as { localShellBoundary: { descriptiveOnly: boolean } }).localShellBoundary.descriptiveOnly, true);
  assert.deepEqual(
    (
      typedMatrix.taskPlane as {
        capabilityModes: {
          visibilityOnlyHelperKeys: string[];
          executableHelperKeys: string[];
        };
      }
    ).capabilityModes.visibilityOnlyHelperKeys.filter((helperKey) => (
      helperKey === 'listTaskDispatches' || helperKey === 'getTaskDispatch'
    )),
    ['listTaskDispatches', 'getTaskDispatch'],
  );
  assert.deepEqual(
    (
      typedMatrix.taskPlane as {
        capabilityModes: {
          visibilityOnlyHelperKeys: string[];
          executableHelperKeys: string[];
        };
      }
    ).capabilityModes.executableHelperKeys.filter((helperKey) => (
      helperKey === 'createLease'
      || helperKey === 'createTaskDispatch'
      || helperKey === 'assignTaskDispatch'
      || helperKey === 'suspendTaskDispatch'
      || helperKey === 'resumeTaskDispatch'
      || helperKey === 'completeTaskDispatch'
      || helperKey === 'failTaskDispatch'
      || helperKey === 'createClaim'
      || helperKey === 'acceptClaim'
      || helperKey === 'rejectClaim'
    )),
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
    ],
  );
  assert.equal(
    typedMatrix.rows.some((row) => row.helperKey === 'postHeartbeat'),
    false,
  );
  assert.equal(
    (
      typedMatrix.rows.find((row) => row.helperKey === 'getAgentReadiness') as { executionTruth: string }
    ).executionTruth,
    'packet-grounded-read',
  );
});
