import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOnboardingReadiness defines a public-first readiness journey on the official endpoint without environment switching', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOnboardingReadiness, 'function');

  const readiness = (exports.buildOnboardingReadiness as () => unknown)();

  assert.deepEqual(readiness, {
    defaults: {
      baseUrl: 'https://api.bidvia.ai',
      environmentMode: 'production',
      environmentSelectionRequired: false,
    },
    journey: {
      journeyKey: 'public-first-onboarding',
      label: 'Public-first onboarding readiness',
      steps: [
        {
          helperKey: 'createProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional',
          accessContextFamily: 'tenant',
          requiredContext: ['tenantId'],
        },
        {
          helperKey: 'queryProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional',
          accessContextFamily: 'tenant',
          requiredContext: ['tenantId'],
        },
        {
          helperKey: 'claimProvisionalAgent',
          routePathTemplate: '/runtime/agents/provisional/claim',
          accessContextFamily: 'session',
          requiredContext: ['tenantId', 'sessionId'],
        },
        {
          helperKey: 'getAgentReadiness',
          routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
          accessContextFamily: 'admin-session',
          requiredContext: ['tenantId', 'adminSessionId'],
        },
      ],
      firstSuccessNextStep: {
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      },
    },
  });
});
