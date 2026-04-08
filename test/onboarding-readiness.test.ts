import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOnboardingReadiness keeps official onboarding focused on public provisional create query claim and moves readiness to post-claim support', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOnboardingReadiness, 'function');

  const readiness = (exports.buildOnboardingReadiness as () => unknown)();

  assert.deepEqual(readiness, {
    defaults: {
      baseUrl: 'https://api.bidvia.cn',
      environmentMode: 'production',
      environmentSelectionRequired: false,
    },
    governedReadPosture: {
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      adminSessionOptional: true,
      operatorGuidance: 'On local docker host, authority and presence require a valid admin session plus operator context. Authority-ladder is an operator-governed write and not a workspace admin-session route.',
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
      ],
    },
  });
});

test('buildOnboardingReadiness keeps the public-first helper chain aligned with the route-context matrix journey rows', () => {
  const exports = publicSurface as Record<string, unknown>;

  const readiness = (exports.buildOnboardingReadiness as () => {
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

  assert.equal(
    matrix.rows.some((row) => (
      row.journeyKey === readiness.journey.journeyKey
      && row.helperKey === 'getAgentReadiness'
    )),
    false,
  );
});
