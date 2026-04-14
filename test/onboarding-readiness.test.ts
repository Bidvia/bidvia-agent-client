import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOnboardingReadiness keeps official onboarding focused on public provisional create query claim and moves readiness to post-claim support', () => {
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
      steps: [
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
    blockedBy: [
      'plane-adoption-incomplete',
      'canonical-route-model-alignment-stale',
    ],
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
        status: 'blocked',
        planes: ['identity-session', 'task', 'event-notification'],
      },
      {
        wave: 'P1',
        status: 'blocked',
        planes: ['capability', 'workflow-stage'],
      },
      {
        wave: 'P2',
        status: 'blocked',
        planes: ['enterprise-integration'],
      },
    ],
  });
});
