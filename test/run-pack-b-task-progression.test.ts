import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunPackBTaskProgressionArgs,
  runPackBTaskProgression,
} from '../scripts/live-probes/run-pack-b-task-progression.ts';

function createFetchStub(responseBodies: Array<{ status: number; body: unknown }>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const response = responseBodies[calls.length - 1] ?? { status: 200, body: { ok: true } };
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  };

  return { calls, fetchStub };
}

test('parseRunPackBTaskProgressionArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunPackBTaskProgressionArgs([]), /--base-url is required/);
  assert.throws(() => parseRunPackBTaskProgressionArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunPackBTaskProgressionArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunPackBTaskProgressionArgs([
      '--base-url', ' http://127.0.0.1:8787 ',
      '--state-path', ' /tmp/state.json ',
      '--output', ' /tmp/report.json ',
      '--email', ' user@example.com ',
      '--password', ' secret-live-1 ',
      '--company-name', ' Example Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/state.json',
      outputPath: '/tmp/report.json',
      email: 'user@example.com',
      password: 'secret-live-1',
      companyName: 'Example Co',
    },
  );
});

test('runPackBTaskProgression executes success and failure branches and records closure canonical refs', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { recommended_next_step: 'dispatch_ready', dispatch_eligibility: { allowed: true } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', outcome_ref: null, confirmation_cycle_ref: null } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', task_state: 'ASSIGNED' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', task_state: 'COMPLETED', outcome_ref: 'outcome://success-1' }, outcome: { outcome_ref: 'outcome://success-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', outcome_ref: 'outcome://success-1' }, outcome: { outcome_ref: 'outcome://success-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', evidence_bundle_ref: 'evidence-bundle://success-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-success-1', confirmation_cycle_ref: 'cycle-success-1' }, confirmation_cycle: { confirmation_cycle_id: 'cycle-success-1', outcome_ref: 'outcome://success-1' } } },
    { status: 200, body: { governed_work_closure: { canonicalRefs: { dispatchRef: 'dispatch-success-1', outcomeRef: 'outcome://success-1', evidenceBundleRef: 'evidence-bundle://success-1', confirmationCycleRef: 'cycle-success-1' } } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', outcome_ref: null, confirmation_cycle_ref: null } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', task_state: 'ASSIGNED' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', task_state: 'FAILED', outcome_ref: 'outcome://fail-1' }, outcome: { outcome_ref: 'outcome://fail-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', outcome_ref: 'outcome://fail-1' }, outcome: { outcome_ref: 'outcome://fail-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', evidence_bundle_ref: 'evidence-bundle://fail-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-fail-1', confirmation_cycle_ref: 'cycle-fail-1' }, confirmation_cycle: { confirmation_cycle_id: 'cycle-fail-1', outcome_ref: 'outcome://fail-1' } } },
    { status: 200, body: { governed_work_closure: { canonicalRefs: { dispatchRef: 'dispatch-fail-1', outcomeRef: 'outcome://fail-1', evidenceBundleRef: 'evidence-bundle://fail-1', confirmationCycleRef: 'cycle-fail-1' } } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runPackBTaskProgression({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/pack-b-state.json',
    outputPath: '/tmp/pack-b-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-16T08:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/pack-b-state.json',
      admin: {
        email: 'ops-admin@example.com',
        adminSessionId: 'admin-session-1',
        adminAccountId: 'admin-acct-1',
      },
      invitation: {
        invitationId: 'invite-1',
        invitationType: 'ENTERPRISE_ACCOUNT',
        status: 'ACTIVE',
      },
      claimant: {
        email: 'user@example.com',
        accountId: 'acct-1',
        sessionId: 'sess-1',
        tenantId: 'tenant-public',
        companyId: 'company-public',
        membershipRole: 'enterprise_admin',
        agentOnboardingAllowed: true,
        agentId: 'agent-1',
        principalId: 'claimed:agent-1',
        registrationId: 'areg-1',
      },
      dispatchAuthority: {
        requestId: 'daar-1',
        status: 'APPROVED',
        authorityProfileId: 'authp-1',
      },
      externalBinding: {
        bindingId: 'eab-1',
        status: 'active',
        systemName: 'bootstrap-live-seeded',
        externalAccountRef: 'ext-seeded',
      },
    }),
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/pack-b-report.json' };
    },
  } as never);

  assert.equal(calls.length, 15);
  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/self-service');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches?tenant_id=tenant-public');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-success-1/assign?tenant_id=tenant-public');
  assert.equal(String(calls[7]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-success-1/governed-work-closure?tenant_id=tenant-public');
  assert.equal(String(calls[8]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches?tenant_id=tenant-public');
  assert.equal(String(calls[14]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-fail-1/governed-work-closure?tenant_id=tenant-public');
  assert.deepEqual((result as any).successBranch.closureRefs, {
    dispatchRef: 'dispatch-success-1',
    outcomeRef: 'outcome://success-1',
    evidenceBundleRef: 'evidence-bundle://success-1',
    confirmationCycleRef: 'cycle-success-1',
  });
  assert.deepEqual((result as any).failureBranch.closureRefs, {
    dispatchRef: 'dispatch-fail-1',
    outcomeRef: 'outcome://fail-1',
    evidenceBundleRef: 'evidence-bundle://fail-1',
    confirmationCycleRef: 'cycle-fail-1',
  });
  assert.deepEqual(writtenReport, result);
});
