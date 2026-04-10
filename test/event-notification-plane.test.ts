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
  const readHelperKeys = executionGates
    .filter((gate) => gate.executionTruth === 'packet-grounded-read')
    .map((gate) => gate.helperKey);
  const executionHelperKeys = executionGates
    .filter((gate) => gate.executionTruth === 'packet-grounded-execution')
    .map((gate) => gate.helperKey);

  assert.equal(plane.adoptionStatus.plane, 'event-notification');
  assert.equal(plane.adoptionStatus.frozenInCore, true);
  assert.equal(plane.adoptionStatus.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.notificationReadTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.executionTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(plane.executionTruth.remotePayloadSupported, true);
  assert.deepEqual(plane.capabilityModes.visibilityOnlyHelperKeys, readHelperKeys);
  assert.deepEqual(plane.capabilityModes.executionHelperKeys, executionHelperKeys);
  assert.deepEqual(plane.executionRoutes.map((route) => route.routePathTemplate), [
    '/runtime/notifications/deliveries',
    '/runtime/notifications/:notification_id/acknowledgements',
    '/runtime/notifications/:notification_id/retry',
    '/runtime/notifications/:notification_id/expire',
  ]);
  assert.equal(getEventNotificationPlaneCapabilityMode('getNotification'), 'visibility-only');
  assert.equal(getEventNotificationPlaneCapabilityMode('acknowledgeNotification'), 'packet-grounded-execution');
  assert.deepEqual(
    plane.executionRoutes.map((route) => ({
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

test('BidviaClient uses operator action headers and frozen payloads for notification execution wrappers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });

  await client.createNotificationDelivery({
    notificationId: 'notification-1',
    channel: 'email',
    destination: 'ops@example.com',
    deliveryRef: 'delivery://1',
    now: '2026-04-10T00:00:00.000Z',
  });
  await client.acknowledgeNotification('notification-1', {
    acknowledgedBy: 'operator-1',
    now: '2026-04-10T00:01:00.000Z',
  });
  await client.retryNotification('notification-1', {
    retryReason: 'transient-failure',
    now: '2026-04-10T00:02:00.000Z',
  });
  await client.expireNotification('notification-1', {
    expirationReason: 'superseded',
    now: '2026-04-10T00:03:00.000Z',
  });

  assert.equal(calls.length, 4);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/notifications/deliveries?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/notifications/notification-1/acknowledgements?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/notifications/notification-1/retry?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/notifications/notification-1/expire?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    notification_id: 'notification-1',
    channel: 'email',
    destination: 'ops@example.com',
    delivery_ref: 'delivery://1',
    now: '2026-04-10T00:00:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    acknowledged_by: 'operator-1',
    now: '2026-04-10T00:01:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    retry_reason: 'transient-failure',
    now: '2026-04-10T00:02:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    expiration_reason: 'superseded',
    now: '2026-04-10T00:03:00.000Z',
  });
});
