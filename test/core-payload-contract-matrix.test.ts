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
  }>)();

  const entryByHelperKey = new Map(entries.map((entry) => [entry.helperKey, entry]));

  assert.deepEqual(
    entryByHelperKey.get('postHeartbeat') && {
      plane: entryByHelperKey.get('postHeartbeat')?.plane,
      helperKey: entryByHelperKey.get('postHeartbeat')?.helperKey,
      helperState: entryByHelperKey.get('postHeartbeat')?.helperState,
      routePathTemplate: entryByHelperKey.get('postHeartbeat')?.routePathTemplate,
      blockedBy: entryByHelperKey.get('postHeartbeat')?.blockedBy,
    },
    {
      plane: 'task',
      helperKey: 'postHeartbeat',
      helperState: 'packet-grounded-execution',
      routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
      blockedBy: null,
    },
  );
  assert.deepEqual(
    entryByHelperKey.get('listTaskDispatches') && {
      plane: entryByHelperKey.get('listTaskDispatches')?.plane,
      helperKey: entryByHelperKey.get('listTaskDispatches')?.helperKey,
      helperState: entryByHelperKey.get('listTaskDispatches')?.helperState,
      routePathTemplate: entryByHelperKey.get('listTaskDispatches')?.routePathTemplate,
      blockedBy: entryByHelperKey.get('listTaskDispatches')?.blockedBy,
    },
    {
      plane: 'task',
      helperKey: 'listTaskDispatches',
      helperState: 'packet-grounded-read',
      routePathTemplate: '/runtime/agents/:agent_registration_id/task-dispatches',
      blockedBy: null,
    },
  );
  assert.deepEqual(
    entryByHelperKey.get('createTaskDispatch') && {
      plane: entryByHelperKey.get('createTaskDispatch')?.plane,
      helperKey: entryByHelperKey.get('createTaskDispatch')?.helperKey,
      helperState: entryByHelperKey.get('createTaskDispatch')?.helperState,
      routePathTemplate: entryByHelperKey.get('createTaskDispatch')?.routePathTemplate,
      blockedBy: entryByHelperKey.get('createTaskDispatch')?.blockedBy,
    },
    {
      plane: 'task',
      helperKey: 'createTaskDispatch',
      helperState: 'compatibility-only',
      routePathTemplate: '/runtime/agents/:agent_registration_id/task-dispatches',
      blockedBy: null,
    },
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
});
