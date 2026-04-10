import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('core-plane adoption exports one frozen Core entry per Stage 2 plane and keeps local planes out of the shared catalog', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.listCorePlaneAdoptionStatuses, 'function');

  const statuses = (exports.listCorePlaneAdoptionStatuses as () => Array<{
    plane: string;
    frozenInCore: boolean;
    payloadPacketStatus: string;
    canExecuteNow: boolean;
    blockedBy: string | null;
    notes: string[];
  }>)();

  assert.deepEqual(statuses.map((status) => status.plane), [
    'identity-session',
    'task',
    'capability',
    'workflow-stage',
    'event-notification',
    'enterprise-integration',
  ]);
  assert.equal(statuses.every((status) => status.frozenInCore), true);
  assert.equal(statuses.every((status) => status.payloadPacketStatus === 'blocked-pending-packet'), true);
  assert.equal(statuses.every((status) => status.canExecuteNow), true);
  assert.equal(statuses.every((status) => status.blockedBy === 'core-plane-payload-packet-not-yet-frozen'), true);
  assert.equal(statuses.some((status) => status.plane === 'local-runtime-execution-session'), false);
  assert.equal(statuses.some((status) => status.plane === 'local-accumulation-memory'), false);
  assert.equal(statuses.every((status) => status.notes.length > 0), true);
});

test('core-plane adoption snapshot stays scoped to frozen Core-facing truth and packet gating', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildCorePlaneAdoptionSnapshot, 'function');

  const snapshot = (exports.buildCorePlaneAdoptionSnapshot as () => {
    sourceOfTruth: string;
    statuses: Array<{
      plane: string;
      payloadPacketStatus: string;
      canExecuteNow: boolean;
    }>;
  })();

  assert.equal(snapshot.sourceOfTruth, 'core-downstream-contract-center');
  assert.deepEqual(snapshot.statuses.map((status) => status.plane), [
    'identity-session',
    'task',
    'capability',
    'workflow-stage',
    'event-notification',
    'enterprise-integration',
  ]);
  assert.equal(snapshot.statuses.every((status) => status.payloadPacketStatus === 'blocked-pending-packet'), true);
  assert.equal(snapshot.statuses.every((status) => status.canExecuteNow), true);
});
