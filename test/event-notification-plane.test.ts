import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import {
  buildEventNotificationPlaneView,
  buildRouteContextMatrix,
  getEventNotificationPlaneCapabilityMode,
  listPlaneExecutionGates,
} from '../src/index.ts';

function createFetchStub() {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('event notification plane exposes frozen read visibility and packet-grounded execution semantics', () => {
  const plane = buildEventNotificationPlaneView();
  const executionGates = listPlaneExecutionGates().filter((gate) => gate.plane === 'event-notification');
  const executionHelperKeys = executionGates
    .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
    .map((gate) => gate.helperKey);

  assert.equal(plane.adoptionStatus.plane, 'event-notification');
  assert.equal(plane.adoptionStatus.frozenInCore, true);
  assert.equal(plane.adoptionStatus.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.notificationReadTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.executionTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.executionTruth.remotePayloadSupported, true);
  assert.deepEqual(plane.capabilityModes.visibilityOnlyHelperKeys, ['getNotification']);
  assert.deepEqual(plane.capabilityModes.blockedExecutionHelperKeys, executionHelperKeys);
  assert.deepEqual(plane.blockedExecutionRoutes.map((route) => route.routePathTemplate), [
    '/runtime/notifications/deliveries',
    '/runtime/notifications/:notification_id/acknowledgements',
    '/runtime/notifications/:notification_id/retry',
    '/runtime/notifications/:notification_id/expire',
  ]);
  assert.equal(getEventNotificationPlaneCapabilityMode('getNotification'), 'visibility-only');
  assert.equal(getEventNotificationPlaneCapabilityMode('acknowledgeNotification'), 'packet-grounded-execution');
  assert.deepEqual(
    plane.blockedExecutionRoutes.map((route) => ({
      helperKey: route.helperKey,
      blockedBy: route.blockedBy,
      notes: route.notes,
    })),
    executionGates
      .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
      .map((gate) => ({
        helperKey: gate.helperKey,
        blockedBy: gate.blockedBy,
        notes: gate.notes,
      })),
  );
});

test('route context matrix surfaces the event notification plane without reopening local runtime semantics', () => {
  const matrix = buildRouteContextMatrix();

  assert.equal(matrix.eventNotificationPlane.adoptionStatus.plane, 'event-notification');
  assert.equal(matrix.eventNotificationPlane.executionTruth.blockedBy, null);
});

test('BidviaClient uses governed read headers for canonical notification visibility reads only', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      adminSessionId: 'admin-sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.getNotification('notification-1');

  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/notifications/notification-1?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
});
