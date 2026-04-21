import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOnboardingReadiness keeps official onboarding focused on public provisional create query claim and surfaces one coherent post-claim task-write-ready chain', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOnboardingReadiness, 'function');
  assert.equal(typeof exports.buildIdentitySessionPlaneView, 'function');

  const readiness = (exports.buildOnboardingReadiness as () => unknown)();
  const identitySessionPlane = (exports.buildIdentitySessionPlaneView as () => unknown)();

  assert.deepEqual(readiness, {
    defaults: {
      baseUrl: 'https://api.bidvia.cn',
      environmentMode: 'production',
      environmentSelectionRequired: false,
    },
    identitySessionPlane,
    governedReadPosture: {
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      adminSessionOptional: true,
      operatorGuidance: 'On local docker host, authority and presence reads require principal-governed tenant context. Authority-ladder reads use the same principal-governed posture, while ladder writes remain operator-governed and separate from workspace admin-session routes.',
    },
    journey: {
      journeyKey: 'public-first-onboarding',
      label: 'Public provisional onboarding',
      steps: [
        {
          helperKey: 'createProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional',
          accessContextFamily: 'tenant',
          contextSemantic: 'public-provisional',
          requiredContext: ['tenantId'],
        },
        {
          helperKey: 'queryProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional',
          accessContextFamily: 'tenant',
          contextSemantic: 'public-provisional',
          requiredContext: ['tenantId'],
        },
        {
          helperKey: 'claimProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional/claim',
          accessContextFamily: 'session',
          contextSemantic: 'session',
          requiredContext: ['tenantId', 'sessionId'],
        },
      ],
      firstSuccessNextStep: {
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: 'local-only',
      },
    },
    postClaimSupport: {
      label: 'Governed-run support',
      progression: {
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
            surfacedSteps: [
              {
                helperKey: 'getAgentReadiness',
                routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
                accessContextFamily: 'principal-governed-read',
                contextSemantic: 'principal-governed-read',
                requiredContext: ['tenantId', 'principalId'],
              },
              {
                helperKey: 'getAccountMe',
                routePathTemplate: '/runtime/account/me',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
              {
                helperKey: 'selectOrg',
                routePathTemplate: '/runtime/account/select-org',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
              {
                helperKey: 'patchAgentSelfService',
                routePathTemplate: '/runtime/account/agents/:agentId/self-service',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
            ],
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
            surfacedSteps: [
              {
                helperKey: 'getAccountAgentDispatchAuthority',
                routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
              {
                helperKey: 'createAccountAgentDispatchAuthorityRequest',
                routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority-requests',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
            ],
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
            surfacedSteps: [
              {
                helperKey: 'getAccountAgentDispatchAuthority',
                routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
            ],
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
            surfacedSteps: [
              {
                helperKey: 'listAccountAgentBindings',
                routePathTemplate: '/runtime/account/agent-bindings',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
            ],
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
            surfacedSteps: [
              {
                helperKey: 'getAgentReadiness',
                routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
                accessContextFamily: 'principal-governed-read',
                contextSemantic: 'principal-governed-read',
                requiredContext: ['tenantId', 'principalId'],
              },
              {
                helperKey: 'getAccountAgentDispatchAuthority',
                routePathTemplate: '/runtime/account/agents/:agent_registration_id/dispatch-authority',
                accessContextFamily: 'session',
                contextSemantic: 'session',
                requiredContext: ['tenantId', 'sessionId'],
              },
            ],
            verificationCheckpoint: {
              helperKeys: ['getAgentReadiness', 'getAccountAgentDispatchAuthority'],
              truthFields: ['taskWriteReady', 'dispatchEligibility'],
              guidance: 'Only treat the progression as complete when the returned truth confirms task-write-ready and dispatch-eligibility state.',
            },
            failClosedState: 'If the post-step reads do not confirm both truth fields, remain fail-closed and do not treat the subject as runnable.',
          },
        ],
      },
    },
  });
});

test('buildOnboardingReadiness keeps the public-first helper chain aligned with the route-context matrix journey rows', () => {
  const exports = publicSurface as Record<string, unknown>;

  const readiness = (exports.buildOnboardingReadiness as () => {
    identitySessionPlane: {
      canonicalOnboarding: {
        helperSteps: Array<{ helperKey: string }>;
      };
    };
    journey: {
      journeyKey: string;
      steps: Array<{ helperKey: string }>;
    };
  })();
  const matrix = (exports.buildRouteContextMatrix as () => {
    rows: Array<{ journeyKey: string; helperKey: string }>;
  })();

  assert.deepEqual(
    matrix.rows
      .filter((row) => row.journeyKey === readiness.journey.journeyKey)
      .map((row) => row.helperKey),
    readiness.journey.steps.map((step) => step.helperKey),
  );

  assert.deepEqual(
    readiness.journey.steps.map((step) => step.helperKey),
    readiness.identitySessionPlane.canonicalOnboarding.helperSteps.map((step) => step.helperKey),
  );

  assert.equal(
    matrix.rows.some((row) => (
      row.journeyKey === readiness.journey.journeyKey
      && row.helperKey === 'getAgentReadiness'
    )),
    false,
  );
});

test('public surface exposes a blocked Stage 3 release gate with required validator evidence', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildStage3ReleaseGate, 'function');

  const gate = (exports.buildStage3ReleaseGate as () => {
    status: string;
    blockedBy: string[];
    requiredValidatorCommands: string[];
    waves: Array<{ wave: string; status: string; planes: string[] }>;
  })();

  assert.deepEqual(gate, {
    status: 'blocked',
    blockedBy: ['plane-adoption-incomplete'],
    requiredValidatorCommands: [
      'npm test',
      'npm run typecheck',
      'npm run build',
      'npm run validate',
      'npm run validate:release-readiness',
      'npm run validate:release-gate',
    ],
    waves: [
      {
        wave: 'P0',
        status: 'complete',
        planes: ['identity-session', 'task', 'event-notification'],
      },
      {
        wave: 'P1',
        status: 'blocked',
        planes: ['capability', 'workflow-stage'],
      },
      {
        wave: 'P2',
        status: 'complete',
        planes: ['enterprise-integration'],
      },
    ],
  });
});
