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
    descriptiveVisibility: string;
    executableHelperEligibility: string;
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
  assert.equal(statuses.every((status) => status.descriptiveVisibility === 'descriptive-plane-visible'), true);
  assert.deepEqual(
    Object.fromEntries(statuses.map((status) => [status.plane, status.executableHelperEligibility])),
    {
      'identity-session': 'packet-grounded-execution',
      task: 'packet-grounded-execution',
      capability: 'packet-grounded-read',
      'workflow-stage': 'blocked-pending-packet',
      'event-notification': 'packet-grounded-execution',
      'enterprise-integration': 'packet-grounded-read',
    },
  );
  assert.deepEqual(
    Object.fromEntries(statuses.map((status) => [status.plane, status.payloadPacketStatus])),
    {
      'identity-session': 'packet-grounded',
      task: 'packet-grounded',
      capability: 'packet-grounded',
      'workflow-stage': 'blocked-pending-packet',
      'event-notification': 'packet-grounded',
      'enterprise-integration': 'packet-grounded',
    },
  );
  assert.deepEqual(
    Object.fromEntries(statuses.map((status) => [status.plane, status.blockedBy])),
    {
      'identity-session': null,
      task: null,
      capability: null,
      'workflow-stage': 'core-plane-payload-packet-not-yet-frozen',
      'event-notification': null,
      'enterprise-integration': null,
    },
  );
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
      descriptiveVisibility: string;
      executableHelperEligibility: string;
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
  assert.deepEqual(
    snapshot.statuses.map((status) => [status.plane, status.payloadPacketStatus]),
    [
      ['identity-session', 'packet-grounded'],
      ['task', 'packet-grounded'],
      ['capability', 'packet-grounded'],
      ['workflow-stage', 'blocked-pending-packet'],
      ['event-notification', 'packet-grounded'],
      ['enterprise-integration', 'packet-grounded'],
    ],
  );
  assert.equal(snapshot.statuses.every((status) => status.descriptiveVisibility === 'descriptive-plane-visible'), true);
  assert.deepEqual(
    snapshot.statuses.map((status) => [status.plane, status.executableHelperEligibility]),
    [
      ['identity-session', 'packet-grounded-execution'],
      ['task', 'packet-grounded-execution'],
      ['capability', 'packet-grounded-read'],
      ['workflow-stage', 'blocked-pending-packet'],
      ['event-notification', 'packet-grounded-execution'],
      ['enterprise-integration', 'packet-grounded-read'],
    ],
  );
});

test('stage 3 release waves stay blocked on helper-level matrix gaps without collapsing grounded planes back to blanket defaults', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.listCorePlaneAdoptionStatuses, 'function');
  assert.equal(typeof exports.listCorePlaneWaveStatuses, 'function');

  const adoptionStatuses = (exports.listCorePlaneAdoptionStatuses as () => Array<{
    plane: string;
    payloadPacketStatus: string;
  }>)();
  const waveStatuses = (exports.listCorePlaneWaveStatuses as () => Array<{
    wave: string;
    status: string;
    planes: string[];
  }>)();

  assert.deepEqual(
    adoptionStatuses
      .filter((status) => ['identity-session', 'task', 'event-notification', 'enterprise-integration'].includes(status.plane))
      .map((status) => [status.plane, status.payloadPacketStatus]),
    [
      ['identity-session', 'packet-grounded'],
      ['task', 'packet-grounded'],
      ['event-notification', 'packet-grounded'],
      ['enterprise-integration', 'packet-grounded'],
    ],
  );
  assert.deepEqual(waveStatuses, [
    {
      wave: 'P0',
      status: 'blocked',
      planes: ['identity-session', 'task', 'event-notification'],
    },
    {
      wave: 'P1',
      status: 'blocked',
      planes: ['capability', 'workflow-stage'],
    },
    {
      wave: 'P2',
      status: 'blocked',
      planes: ['enterprise-integration'],
    },
  ]);
});
