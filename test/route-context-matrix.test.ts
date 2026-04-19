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
    {
      journeyKey: 'governed-run',
      helperKey: 'postHeartbeat',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      routeFamily: 'agent-runtime',
      journeyStage: 'governed-run-execution',
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'registration',
      contextSemantic: 'registration',
      requiredContext: ['tenantId', 'registrationId', 'principalId'],
      operationKind: 'execute',
      executionTruth: 'packet-grounded-execution',
      executionBlockedBy: null,
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
      journeyStageSemantics: 'local-only',
      accessContextFamily: 'operator-company',
      contextSemantic: 'operator-company',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
      operationKind: 'execute',
      executionTruth: 'compatibility-only',
      executionBlockedBy: null,
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
      journeyStageSemantics: 'local-only',
    },
    'governed-run': {
      command: 'registered-agent-operations-plan',
      rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      journeyStage: 'governed-run-execution',
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
        journeyStage: 'governed-run-execution',
        journeyStageSemantics: 'local-only',
        relevance: 'governed-run-secondary',
        command: 'registered-agent-operations-plan',
        rationale: 'Use the post-onboarding operations plan after Governed Run has the required registration context.',
      },
    ],
  );

  assert.deepEqual(typedMatrix.executionGuidance, [
    {
      guidanceKey: 'task-write-ready',
      lane: 'default-local-docker',
      appliesWhen: 'route-exists-but-subject-not-runnable',
      signal: 'authority_class_not_dispatchable',
      nextStepOwner: 'operator-or-admin',
      nextStepAction: 'Follow the surfaced task-write-ready progression and keep unresolved Core-owned progression visible instead of assuming claim is sufficient.',
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
    (
      typedMatrix.rows.find((row) => row.helperKey === 'postHeartbeat') as { executionTruth: string }
    ).executionTruth,
    'packet-grounded-execution',
  );
  assert.equal(
    (
      typedMatrix.rows.find((row) => row.helperKey === 'getAgentReadiness') as { executionTruth: string }
    ).executionTruth,
    'packet-grounded-read',
  );
});
