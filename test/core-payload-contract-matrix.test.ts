import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('core payload contract matrix exposes one authoritative helper truth table with all four helper states', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.listCorePayloadContractMatrixEntries, 'function');
  assert.equal(typeof exports.getCorePayloadContractMatrixEntry, 'function');

  const entries = (exports.listCorePayloadContractMatrixEntries as () => Array<{
    plane: string;
    helperKey: string;
    helperState: string;
    routePathTemplate: string | null;
    blockedBy: string | null;
    capabilityPlaneCapabilityMode?: string | null;
    stage3RouteModelWave?: string | null;
  }>)();

  const entryByHelperKey = new Map(entries.map((entry) => [entry.helperKey, entry]));

  const taskEntrySnapshot = (helperKey: string) => entryByHelperKey.get(helperKey) && {
    plane: entryByHelperKey.get(helperKey)?.plane,
    helperKey: entryByHelperKey.get(helperKey)?.helperKey,
    helperState: entryByHelperKey.get(helperKey)?.helperState,
    routePathTemplate: entryByHelperKey.get(helperKey)?.routePathTemplate,
    blockedBy: entryByHelperKey.get(helperKey)?.blockedBy,
  };

  assert.deepEqual(
    taskEntrySnapshot('postHeartbeat'),
    {
      plane: 'task',
      helperKey: 'postHeartbeat',
      helperState: 'packet-grounded-execution',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      blockedBy: null,
    },
  );
  assert.deepEqual(
    [
      'listTaskDispatches',
      'getTaskDispatch',
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
    ].map((helperKey) => taskEntrySnapshot(helperKey)),
    [
      {
        plane: 'task',
        helperKey: 'listTaskDispatches',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'getTaskDispatch',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'createLease',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/leases',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'createTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'assignTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/assign',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'suspendTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/suspend',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'resumeTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/resume',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'completeTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/complete',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'failTaskDispatch',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/task-dispatches/:task_dispatch_id/fail',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'createClaim',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'acceptClaim',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims/:claim_id/accept',
        blockedBy: null,
      },
      {
        plane: 'task',
        helperKey: 'rejectClaim',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agent_registration_id/claims/:claim_id/reject',
        blockedBy: null,
      },
    ],
  );
  assert.deepEqual(
    entryByHelperKey.get('buildCommercialActionScenarioPlan') && {
      plane: entryByHelperKey.get('buildCommercialActionScenarioPlan')?.plane,
      helperKey: entryByHelperKey.get('buildCommercialActionScenarioPlan')?.helperKey,
      helperState: entryByHelperKey.get('buildCommercialActionScenarioPlan')?.helperState,
      routePathTemplate: entryByHelperKey.get('buildCommercialActionScenarioPlan')?.routePathTemplate,
      blockedBy: entryByHelperKey.get('buildCommercialActionScenarioPlan')?.blockedBy,
    },
    {
      plane: 'enterprise-integration',
      helperKey: 'buildCommercialActionScenarioPlan',
      helperState: 'blocked-pending-packet',
      routePathTemplate: null,
      blockedBy: 'core-plane-payload-packet-not-yet-frozen',
    },
  );
  assert.deepEqual(
    entryByHelperKey.get('refreshRemoteCapabilityTruth') && {
      plane: entryByHelperKey.get('refreshRemoteCapabilityTruth')?.plane,
      helperKey: entryByHelperKey.get('refreshRemoteCapabilityTruth')?.helperKey,
      helperState: entryByHelperKey.get('refreshRemoteCapabilityTruth')?.helperState,
      routePathTemplate: entryByHelperKey.get('refreshRemoteCapabilityTruth')?.routePathTemplate,
      blockedBy: entryByHelperKey.get('refreshRemoteCapabilityTruth')?.blockedBy,
    },
    {
      plane: 'capability',
      helperKey: 'refreshRemoteCapabilityTruth',
      helperState: 'compatibility-only',
      routePathTemplate: null,
      blockedBy: null,
    },
  );
  assert.deepEqual(
    [
      'getAccountAgentDispatchAuthority',
      'createAccountAgentDispatchAuthorityRequest',
    ].map((helperKey) => taskEntrySnapshot(helperKey)),
    [
      {
        plane: 'identity-session',
        helperKey: 'getAccountAgentDispatchAuthority',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority',
        blockedBy: null,
      },
      {
        plane: 'identity-session',
        helperKey: 'createAccountAgentDispatchAuthorityRequest',
        helperState: 'packet-grounded-execution',
        routePathTemplate: '/runtime/account/agents/:agentId/dispatch-authority-requests',
        blockedBy: null,
      },
    ],
  );
  assert.deepEqual(
    [
      'listAgentRegistrations',
      'getAgentRegistration',
      'listAuthorityProfiles',
      'listCapabilityProfiles',
    ].map((helperKey) => taskEntrySnapshot(helperKey)),
    [
      {
        plane: 'identity-session',
        helperKey: 'listAgentRegistrations',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/agents/registrations',
        blockedBy: null,
      },
      {
        plane: 'identity-session',
        helperKey: 'getAgentRegistration',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/agents/:agent_registration_id',
        blockedBy: null,
      },
      {
        plane: 'capability',
        helperKey: 'listAuthorityProfiles',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/authority-profiles',
        blockedBy: null,
      },
      {
        plane: 'capability',
        helperKey: 'listCapabilityProfiles',
        helperState: 'packet-grounded-read',
        routePathTemplate: '/runtime/capability-profiles',
        blockedBy: null,
      },
    ],
  );
  assert.deepEqual(
    [
      'getAgentReadiness',
      'listAuthorityProfiles',
      'listCapabilityProfiles',
      'getAgentSummary',
      'getAgentCapabilityProfile',
      'refreshRemoteCapabilityTruth',
    ].map((helperKey) => entryByHelperKey.get(helperKey) && {
      helperKey: entryByHelperKey.get(helperKey)?.helperKey,
      capabilityPlaneCapabilityMode: entryByHelperKey.get(helperKey)?.capabilityPlaneCapabilityMode ?? null,
    }),
    [
      {
        helperKey: 'getAgentReadiness',
        capabilityPlaneCapabilityMode: 'packet-grounded-read',
      },
      {
        helperKey: 'listAuthorityProfiles',
        capabilityPlaneCapabilityMode: 'packet-grounded-read',
      },
      {
        helperKey: 'listCapabilityProfiles',
        capabilityPlaneCapabilityMode: 'packet-grounded-read',
      },
      {
        helperKey: 'getAgentSummary',
        capabilityPlaneCapabilityMode: 'packet-grounded-read',
      },
      {
        helperKey: 'getAgentCapabilityProfile',
        capabilityPlaneCapabilityMode: 'packet-grounded-read',
      },
      {
        helperKey: 'refreshRemoteCapabilityTruth',
        capabilityPlaneCapabilityMode: 'compatibility-only',
      },
    ],
  );
  assert.deepEqual(
    [
      'getAgentReadiness',
      'getAgentCapabilityProfile',
      'submitIntegrationOnboardingContract',
      'refreshRemoteCapabilityTruth',
    ].map((helperKey) => entryByHelperKey.get(helperKey) && {
      helperKey: entryByHelperKey.get(helperKey)?.helperKey,
      stage3RouteModelWave: entryByHelperKey.get(helperKey)?.stage3RouteModelWave ?? null,
    }),
    [
      {
        helperKey: 'getAgentReadiness',
        stage3RouteModelWave: 'P0',
      },
      {
        helperKey: 'getAgentCapabilityProfile',
        stage3RouteModelWave: 'P1',
      },
      {
        helperKey: 'submitIntegrationOnboardingContract',
        stage3RouteModelWave: 'P2',
      },
      {
        helperKey: 'refreshRemoteCapabilityTruth',
        stage3RouteModelWave: null,
      },
    ],
  );
});

test('core payload contract matrix marks canonical notification consumption as account-scoped read plus acknowledgement-only execution', () => {
  const exports = publicSurface as Record<string, unknown>;
  const entries = (exports.listCorePayloadContractMatrixEntries as () => Array<{
    plane: string;
    helperKey: string;
    helperState: string;
    routePathTemplate: string | null;
    blockedBy: string | null;
  }>)();

  const entryByHelperKey = new Map(entries.map((entry) => [entry.helperKey, entry]));
  const notificationEntrySnapshot = (helperKey: string) => entryByHelperKey.get(helperKey) && {
    plane: entryByHelperKey.get(helperKey)?.plane,
    helperKey: entryByHelperKey.get(helperKey)?.helperKey,
    helperState: entryByHelperKey.get(helperKey)?.helperState,
    routePathTemplate: entryByHelperKey.get(helperKey)?.routePathTemplate,
    blockedBy: entryByHelperKey.get(helperKey)?.blockedBy,
  };

  assert.deepEqual(notificationEntrySnapshot('getNotification'), {
    plane: 'event-notification',
    helperKey: 'getNotification',
    helperState: 'packet-grounded-read',
    routePathTemplate: '/runtime/account/agents/:agent_registration_id/notifications/:notification_id',
    blockedBy: null,
  });
  assert.deepEqual(notificationEntrySnapshot('acknowledgeNotification'), {
    plane: 'event-notification',
    helperKey: 'acknowledgeNotification',
    helperState: 'packet-grounded-execution',
    routePathTemplate: '/runtime/account/agents/:agent_registration_id/notifications/:notification_id/acknowledgements',
    blockedBy: null,
  });
  assert.deepEqual(
    ['createNotificationDelivery', 'retryNotification', 'expireNotification'].map((helperKey) =>
      notificationEntrySnapshot(helperKey),
    ),
    [
      {
        plane: 'event-notification',
        helperKey: 'createNotificationDelivery',
        helperState: 'compatibility-only',
        routePathTemplate: null,
        blockedBy: null,
      },
      {
        plane: 'event-notification',
        helperKey: 'retryNotification',
        helperState: 'compatibility-only',
        routePathTemplate: null,
        blockedBy: null,
      },
      {
        plane: 'event-notification',
        helperKey: 'expireNotification',
        helperState: 'compatibility-only',
        routePathTemplate: null,
        blockedBy: null,
      },
    ],
  );
});
