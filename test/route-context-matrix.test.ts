import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildRouteContextMatrix separates public provisional onboarding from governed-run support and governed-run execution', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildRouteContextMatrix, 'function');

  const matrix = (exports.buildRouteContextMatrix as () => unknown)();

  const typedMatrix = matrix as {
    defaults: {
      baseUrl: string;
      environmentMode: string;
      environmentSelectionRequired: boolean;
    };
    governedReadPosture: Record<string, unknown>;
    rows: Array<Record<string, unknown>>;
    firstSuccessNextSteps: Record<string, unknown>;
  };

  assert.deepEqual(typedMatrix.defaults, {
    baseUrl: 'https://api.bidvia.ai',
    environmentMode: 'production',
    environmentSelectionRequired: false,
  });

  assert.deepEqual(typedMatrix.governedReadPosture, {
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
    adminSessionOptional: true,
    operatorGuidance: 'On local docker host, authority and presence require a valid admin session plus operator context. Authority-ladder is an operator-governed write and not a workspace admin-session route.',
  });

  assert.deepEqual(typedMatrix.rows.slice(0, 6), [
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'createProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional',
      routeFamily: 'agent-onboarding',
      journeyStage: 'public-provisional',
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'execute',
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
      accessContextFamily: 'tenant',
      contextSemantic: 'public-provisional',
      requiredContext: ['tenantId'],
      operationKind: 'read-only',
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
      accessContextFamily: 'session',
      contextSemantic: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      operationKind: 'execute',
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
      accessContextFamily: 'principal-governed-read',
      contextSemantic: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      operationKind: 'read-only',
      localCapabilityRiskTier: 'observe-only',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'truth-fetch-result',
    },
    {
      journeyKey: 'governed-run',
      helperKey: 'postHeartbeat',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-execution',
      accessContextFamily: 'registration',
      contextSemantic: 'registration',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'governed-run',
      helperKey: 'createCommercialAction',
      routePathTemplate: '/runtime/commercial-actions',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-execution',
      accessContextFamily: 'operator-company',
      contextSemantic: 'operator-company',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'governed-commercial',
      relevance: 'governed-run-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
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
    ['getAgentReadiness', 'postHeartbeat', 'createCommercialAction'],
  );

  assert.deepEqual(typedMatrix.firstSuccessNextSteps, {
    'public-first-onboarding': {
      command: 'registration-lifecycle-plan',
      rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      journeyStage: 'governed-run-execution',
    },
    'governed-run': {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      journeyStage: 'governed-run-execution',
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
        relevance: 'public-first-common',
        command: 'registration-lifecycle-plan',
        rationale: 'Use the lifecycle plan next so the first successful onboarding path stays aligned with the shipped provisional-to-registration chain.',
      },
      {
        journeyKey: 'governed-run',
        journeyStage: 'governed-run-execution',
        relevance: 'governed-run-secondary',
        command: 'registered-agent-operations-plan',
        rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      },
    ],
  );
});
