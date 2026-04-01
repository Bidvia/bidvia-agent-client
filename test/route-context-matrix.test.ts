import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildRouteContextMatrix defines the guided route-context rows for public onboarding and local operator execution', () => {
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
      accessContextFamily: 'tenant',
      requiredContext: ['tenantId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'claimProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional/claim',
      routeFamily: 'agent-onboarding',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'public-first-onboarding',
      helperKey: 'getAgentReadiness',
      routePathTemplate: '/runtime/agents/:agent_registration_id/readiness',
      routeFamily: 'agent-runtime',
      accessContextFamily: 'principal-governed-read',
      requiredContext: ['tenantId', 'principalId'],
      operationKind: 'read-only',
      localCapabilityRiskTier: 'observe-only',
      relevance: 'public-first-common',
      presentationTier: 'primary',
      recommendedOutputMode: 'truth-fetch-result',
    },
    {
      journeyKey: 'local-openclaw-operator',
      helperKey: 'claimProvisionalAgent',
      routePathTemplate: '/runtime/agents/provisional/claim',
      routeFamily: 'agent-onboarding',
      accessContextFamily: 'session',
      requiredContext: ['tenantId', 'sessionId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'operator-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'local-openclaw-operator',
      helperKey: 'postHeartbeat',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      routeFamily: 'agent-runtime',
      accessContextFamily: 'registration',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'runtime-execution',
      relevance: 'operator-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
    },
    {
      journeyKey: 'local-openclaw-operator',
      helperKey: 'createCommercialAction',
      routePathTemplate: '/runtime/commercial-actions',
      routeFamily: 'agent-runtime',
      accessContextFamily: 'operator-company',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
      operationKind: 'execute',
      localCapabilityRiskTier: 'governed-commercial',
      relevance: 'operator-secondary',
      presentationTier: 'secondary',
      recommendedOutputMode: 'execution-result',
    },
  ]);

  assert.deepEqual(typedMatrix.firstSuccessNextSteps, {
    'public-first-onboarding': {
      command: 'registration-lifecycle-plan',
      rationale: 'Stay on the shipped onboarding chain before switching into post-registration runtime execution.',
    },
    'local-openclaw-operator': {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after the local MCP operator path has the required registration context.',
    },
  });
});
