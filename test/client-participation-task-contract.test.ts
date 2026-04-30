import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';
import { buildTaskPlaneView, getTaskPlaneCapabilityMode } from '../src/index.ts';

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

test('BidviaClient uses governed read headers for canonical participation-state and account-scoped task GET wrappers', async () => {
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

  await client.listParticipationStates('areg-1');
  await client.getParticipationState('areg-1', 'pstate-1');
  await client.listTaskDispatches('areg-1');
  await client.getTaskDispatch('areg-1', 'dispatch-1');

  assert.equal(calls.length, 4);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/participation-states?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/participation-states/pstate-1?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-tenant-id'], 'tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-principal-id'], 'actor-1');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-admin-session-id'], 'admin-sess-1');
});

test('BidviaClient uses operator action, claimant session headers, and frozen payloads for canonical participation-state and account-scoped task POST wrappers', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
      sessionId: 'sess-1',
    },
    fetchImpl: fetchStub,
  });

  await client.createParticipationState('areg-1', {
    state: 'ACTIVE',
    reason: 'handoff accepted',
    now: '2026-03-31T00:00:00.000Z',
    participationRole: 'coordinator',
    visibility: 'tenant',
    contextHandoffState: 'ready',
    contextHandoffRef: 'handoff://state/1',
    coordinationOwnerKind: 'agent-registration',
    coordinationOwnerRef: 'areg-1',
  });
  await client.createLease('areg-1', {
    leaseScope: 'dispatch-window',
    now: '2026-03-31T00:01:00.000Z',
    expiresAt: '2026-03-31T00:06:00.000Z',
  });
  await client.createTaskDispatch('areg-1', {
    taskKind: 'notification-review',
    taskRef: 'task://dispatch/1',
    now: '2026-03-31T00:02:00.000Z',
    reason: 'new notification work',
  });
  await client.assignTaskDispatch('areg-1', 'dispatch-1', {
    assignedToRegistrationId: 'areg-2',
    now: '2026-03-31T00:03:00.000Z',
    reason: 'handoff to active worker',
  });
  await client.suspendTaskDispatch('areg-1', 'dispatch-1', {
    now: '2026-03-31T00:04:00.000Z',
    reason: 'waiting for upstream dependency',
  });
  await client.resumeTaskDispatch('areg-1', 'dispatch-1', {
    now: '2026-03-31T00:05:00.000Z',
    reason: 'dependency resolved',
  });
  await client.completeTaskDispatch('areg-1', 'dispatch-1', {
    now: '2026-03-31T00:06:00.000Z',
    reason: 'task finished',
    outcomeRef: 'outcome://dispatch/1',
  });
  await client.failTaskDispatch('areg-1', 'dispatch-1', {
    now: '2026-03-31T00:07:00.000Z',
    reason: 'task failed',
    outcomeRef: 'outcome://dispatch/1/failure',
  });
  await client.createClaim('areg-1', {
    claimKind: 'ownership',
    claimRef: 'claim://1',
    taskDispatchId: 'dispatch-1',
    now: '2026-03-31T00:08:00.000Z',
  });
  await client.acceptClaim('areg-1', 'claim-1', {
    taskDispatchId: 'dispatch-1',
    now: '2026-03-31T00:09:00.000Z',
  });
  await client.rejectClaim('areg-1', 'claim-1', {
    taskDispatchId: 'dispatch-1',
    reason: 'claim conflicts with active lease',
    now: '2026-03-31T00:10:00.000Z',
  });

  assert.equal(calls.length, 11);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/agents/areg-1/participation-states?tenant_id=tenant-a');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/leases?tenant_id=tenant-a');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches?tenant_id=tenant-a');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1/assign?tenant_id=tenant-a');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1/suspend?tenant_id=tenant-a');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1/resume?tenant_id=tenant-a');
  assert.equal(String(calls[6]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1/complete?tenant_id=tenant-a');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/task-dispatches/dispatch-1/fail?tenant_id=tenant-a');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/claims?tenant_id=tenant-a');
  assert.equal(String(calls[9]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/claims/claim-1/accept?tenant_id=tenant-a');
  assert.equal(String(calls[10]?.input), 'http://127.0.0.1:8787/runtime/account/agents/areg-1/claims/claim-1/reject?tenant_id=tenant-a');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-authorized-company-id'], 'company-a');
  assert.equal((calls[1]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
    state: 'ACTIVE',
    reason: 'handoff accepted',
    now: '2026-03-31T00:00:00.000Z',
    participation_role: 'coordinator',
    visibility: 'tenant',
    context_handoff_state: 'ready',
    context_handoff_ref: 'handoff://state/1',
    coordination_owner_kind: 'agent-registration',
    coordination_owner_ref: 'areg-1',
  });
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    lease_scope: 'dispatch-window',
    now: '2026-03-31T00:01:00.000Z',
    expires_at: '2026-03-31T00:06:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[2]?.init?.body)), {
    task_kind: 'notification-review',
    task_ref: 'task://dispatch/1',
    now: '2026-03-31T00:02:00.000Z',
    reason: 'new notification work',
  });
  assert.deepEqual(JSON.parse(String(calls[3]?.init?.body)), {
    assigned_to_registration_id: 'areg-2',
    now: '2026-03-31T00:03:00.000Z',
    reason: 'handoff to active worker',
  });
  assert.deepEqual(JSON.parse(String(calls[4]?.init?.body)), {
    now: '2026-03-31T00:04:00.000Z',
    reason: 'waiting for upstream dependency',
  });
  assert.deepEqual(JSON.parse(String(calls[5]?.init?.body)), {
    now: '2026-03-31T00:05:00.000Z',
    reason: 'dependency resolved',
  });
  assert.deepEqual(JSON.parse(String(calls[6]?.init?.body)), {
    now: '2026-03-31T00:06:00.000Z',
    reason: 'task finished',
    outcome_ref: 'outcome://dispatch/1',
  });
  assert.deepEqual(JSON.parse(String(calls[7]?.init?.body)), {
    now: '2026-03-31T00:07:00.000Z',
    reason: 'task failed',
    outcome_ref: 'outcome://dispatch/1/failure',
  });
  assert.deepEqual(JSON.parse(String(calls[8]?.init?.body)), {
    claim_kind: 'ownership',
    claim_ref: 'claim://1',
    task_dispatch_id: 'dispatch-1',
    now: '2026-03-31T00:08:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[9]?.init?.body)), {
    task_dispatch_id: 'dispatch-1',
    now: '2026-03-31T00:09:00.000Z',
  });
  assert.deepEqual(JSON.parse(String(calls[10]?.init?.body)), {
    task_dispatch_id: 'dispatch-1',
    reason: 'claim conflicts with active lease',
    now: '2026-03-31T00:10:00.000Z',
  });
});

test('BidviaClient task wrappers stay aligned with the canonical account-scoped task-plane adapter and do not invent timeout payload fields', () => {
  const taskPlane = buildTaskPlaneView();

  assert.equal(taskPlane.outcomeTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(taskPlane.timeoutTruth.payloadPacketStatus, 'packet-grounded');
  assert.equal(taskPlane.timeoutTruth.localOnly, true);
  assert.equal(taskPlane.timeoutTruth.remotePayloadSupported, true);
  assert.equal(getTaskPlaneCapabilityMode('listTaskDispatches'), 'visibility-only');
  assert.equal(getTaskPlaneCapabilityMode('getTaskDispatch'), 'visibility-only');
  assert.equal(getTaskPlaneCapabilityMode('createLease'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('createTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('assignTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('suspendTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('resumeTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('completeTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('failTaskDispatch'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('createClaim'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('acceptClaim'), 'packet-grounded-execution');
  assert.equal(getTaskPlaneCapabilityMode('rejectClaim'), 'packet-grounded-execution');
});
