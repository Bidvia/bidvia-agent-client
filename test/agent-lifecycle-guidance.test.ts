import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEventNotificationPlaneView,
  buildLocalRuntimeCapabilitySnapshot,
  buildRouteContextMatrix,
  buildTaskPlaneView,
} from '../src/index.ts';

test('runtime capability snapshot and route context matrix surface the same honest agent lifecycle guidance', () => {
  const runtimeSnapshot = buildLocalRuntimeCapabilitySnapshot() as {
    agentLifecycleGuidance?: unknown;
  };
  const routeContextMatrix = buildRouteContextMatrix() as {
    agentLifecycleGuidance?: unknown;
  };

  const expectedGuidance = {
    lifecycleBoundary: 'Guidance only: the client can heartbeat, observe wakeup surfaces, execute bounded task helpers, and report results, but it does not become a daemon, scheduler, polling loop, or delivery engine.',
    heartbeat: {
      helperKey: 'postHeartbeat',
      lane: 'default-local-docker',
      responsibility: 'Refresh registration liveness for an already-governed agent session after readiness is real.',
      doesNotImply: 'Heartbeat does not imply task wakeup, assignment delivery, notification consumption, or result completion by itself.',
    },
    taskWakeupByLane: {
      noDaemonClaim: 'Task wakeup stays lane-specific and descriptive-only in this client; the repo does not ship an automatic worker runtime.',
      lanes: [
        {
          lane: 'default-local-docker',
          wakeupPath: 'Use account-scoped task-dispatch reads and notification reads to observe work that Core/runtime has already surfaced, then execute the bounded task helpers explicitly.',
        },
        {
          lane: 'proof-lane-admin-session',
          wakeupPath: 'Use a real admin session for deterministic proof-lane walkthroughs instead of assuming ordinary default-lane wakeup behavior.',
        },
        {
          lane: 'runtime-generated',
          wakeupPath: 'Create the required runtime objects yourself, then continue with the returned ids and the shipped task or notification read surfaces.',
        },
      ],
    },
    resultReporting: {
      helperKeys: ['createClaim', 'createLease', 'completeTaskDispatch', 'failTaskDispatch', 'acknowledgeNotification'],
      responsibility: 'Use claim or lease when the surfaced runtime path expects explicit task acceptance, then complete or fail the task dispatch and acknowledge the consumed notification when that account-scoped acknowledgement path is present.',
      failClosedState: 'Do not treat heartbeat or notification visibility alone as proof that a task was accepted, completed, failed, or acknowledged.',
    },
    notificationAcknowledgementPath: {
      status: 'client-side-fixed',
      helperKey: 'acknowledgeNotification',
      routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id/acknowledgements',
      requiredContext: ['tenantId', 'principalId', 'companyId'],
      guidance: 'Current repo proof shows the client uses the canonical account-scoped acknowledgement route and frozen payload fields when the required operator-company context is present. Remaining delivery semantics stay upstream/runtime-owned.',
    },
  };

  assert.deepEqual(runtimeSnapshot.agentLifecycleGuidance, expectedGuidance);
  assert.deepEqual(routeContextMatrix.agentLifecycleGuidance, expectedGuidance);
});

test('task and event-notification plane views expose the lifecycle seams without pretending the client is a worker runtime', () => {
  const taskPlane = buildTaskPlaneView() as {
    lifecycleGuidance?: unknown;
  };
  const eventNotificationPlane = buildEventNotificationPlaneView() as {
    acknowledgementPath?: unknown;
  };

  assert.deepEqual(taskPlane.lifecycleGuidance, {
    wakeupByLane: {
      noDaemonClaim: 'Task wakeup stays lane-specific and descriptive-only in this client; the repo does not ship an automatic worker runtime.',
      lanes: [
        {
          lane: 'default-local-docker',
          wakeupPath: 'Use account-scoped task-dispatch reads and notification reads to observe work that Core/runtime has already surfaced, then execute the bounded task helpers explicitly.',
        },
        {
          lane: 'proof-lane-admin-session',
          wakeupPath: 'Use a real admin session for deterministic proof-lane walkthroughs instead of assuming ordinary default-lane wakeup behavior.',
        },
        {
          lane: 'runtime-generated',
          wakeupPath: 'Create the required runtime objects yourself, then continue with the returned ids and the shipped task or notification read surfaces.',
        },
      ],
    },
    resultReporting: {
      helperKeys: ['createClaim', 'createLease', 'completeTaskDispatch', 'failTaskDispatch', 'acknowledgeNotification'],
      responsibility: 'Use claim or lease when the surfaced runtime path expects explicit task acceptance, then complete or fail the task dispatch and acknowledge the consumed notification when that account-scoped acknowledgement path is present.',
      failClosedState: 'Do not treat heartbeat or notification visibility alone as proof that a task was accepted, completed, failed, or acknowledged.',
    },
  });
  assert.deepEqual(eventNotificationPlane.acknowledgementPath, {
    status: 'client-side-fixed',
    helperKey: 'acknowledgeNotification',
    routePathTemplate: '/runtime/account/agents/:agentId/notifications/:notification_id/acknowledgements',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
    guidance: 'Current repo proof shows the client uses the canonical account-scoped acknowledgement route and frozen payload fields when the required operator-company context is present. Remaining delivery semantics stay upstream/runtime-owned.',
  });
});
