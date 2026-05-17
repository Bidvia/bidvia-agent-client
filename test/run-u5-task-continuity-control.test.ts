import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunU5TaskContinuityControlArgs,
  runU5TaskContinuityControl,
} from '../scripts/live-probes/run-u5-task-continuity-control.ts';

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

test('parseRunU5TaskContinuityControlArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunU5TaskContinuityControlArgs([]), /--base-url is required/);
  assert.throws(() => parseRunU5TaskContinuityControlArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunU5TaskContinuityControlArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );
  assert.throws(
    () => parseRunU5TaskContinuityControlArgs([
      '--base-url', 'http://127.0.0.1:8787',
      '--state-path', '/tmp/state.json',
      '--output', '/tmp/report.json',
    ]),
    /--assigned-to-registration-id is required/,
  );

  assert.deepEqual(
    parseRunU5TaskContinuityControlArgs([
      '--base-url', ' http://127.0.0.1:8787 ',
      '--state-path', ' /tmp/state.json ',
      '--output', ' /tmp/report.json ',
      '--assigned-to-registration-id', ' areg-2 ',
      '--email', ' user@example.com ',
      '--password', ' secret-live-1 ',
      '--company-name', ' Example Co ',
    ]),
    {
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/state.json',
      outputPath: '/tmp/report.json',
      assignedToRegistrationId: 'areg-2',
      email: 'user@example.com',
      password: 'secret-live-1',
      companyName: 'Example Co',
    },
  );
});

test('runU5TaskContinuityControl executes continuity-control steps and returns machine-readable proof', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { recommended_next_step: 'dispatch_ready', dispatch_eligibility: { allowed: true } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED', assigned_to_registration_id: 'areg-2' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'SUSPENDED' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED', assigned_to_registration_id: 'areg-2' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runU5TaskContinuityControl({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/u5-state.json',
    outputPath: '/tmp/u5-report.json',
    assignedToRegistrationId: 'areg-2',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-16T13:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/u5-state.json',
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
      return { outputPath: '/tmp/u5-report.json' };
    },
  } as never);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/self-service');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches?tenant_id=tenant-public');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1/assign?tenant_id=tenant-public');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1/suspend?tenant_id=tenant-public');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1/resume?tenant_id=tenant-public');
  assert.equal(String(calls[5]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/task-dispatches/dispatch-1?tenant_id=tenant-public');

  assert.deepEqual(result, {
    command: 'run-u5-task-continuity-control',
    generatedAt: '2026-05-16T13:00:00Z',
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/u5-state.json',
    outputPath: '/tmp/u5-report.json',
    status: 'passed',
    family: 'u5-multi-agent-growth-operator-takeover-continuity',
    phases: [
      {
        phaseKey: 'bootstrap',
        status: 'passed',
        classification: 'pass',
        detail: 'bootstrap claimant completed successfully',
      },
      {
        phaseKey: 'continuity-control',
        status: 'passed',
        classification: 'pass',
        detail: 'task dispatch assignment, suspend, resume, and readback completed successfully',
      },
    ],
    ids: {
      taskDispatchId: 'dispatch-1',
      assignedToRegistrationId: 'areg-2',
    },
    steps: [
      {
        stepKey: 'bootstrap-claimant',
        status: 'passed',
        route: 'bootstrap-claimant-local-docker',
        requestBody: {
          email: 'user@example.com',
        },
        responseBody: {
          command: 'bootstrap-claimant-local-docker',
          baseUrl: 'http://127.0.0.1:8787',
          statePath: '/tmp/u5-state.json',
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
        },
      },
      {
        stepKey: 'self-service-patch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/self-service',
        requestBody: {
          now: '2026-05-16T13:00:00Z',
          capability_profile: {
            domain_strengths: ['commercial-governance'],
            template_domains: ['governed-assets'],
            workflow_roles: ['dispatcher'],
            allowed_runtime_scopes: ['live-control-plane'],
            quality_signals: ['agent-self-described'],
            adoption_rate: 0.91,
            evidence_score: 0.94,
            risk_reliability_band: 'HIGH',
            routing_priority: 8,
          },
          participation_state: {
            state: 'commercial-authority-bound',
            reason: 'ready',
          },
          task_dispatch_acceptance: {
            accepts_task_dispatches: true,
            accepted_task_dispatch_scopes: ['COMMERCIAL_ACTION_REVIEW', 'EXTERNAL_WRITE'],
          },
        },
        responseBody: { recommended_next_step: 'dispatch_ready', dispatch_eligibility: { allowed: true } },
      },
      {
        stepKey: 'create-task-dispatch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/task-dispatches',
        requestBody: {
          task_kind: 'COMMERCIAL_ACTION_REVIEW',
          task_ref: 'task://u5/continuity',
          reason: 'u5 continuity control scenario',
          now: '2026-05-16T13:00:00Z',
        },
        responseBody: { dispatch: { agent_task_dispatch_id: 'dispatch-1' } },
      },
      {
        stepKey: 'assign-task-dispatch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/assign',
        requestBody: {
          assigned_to_registration_id: 'areg-2',
          now: '2026-05-16T13:00:00Z',
          reason: 'handoff to active worker',
        },
        responseBody: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED', assigned_to_registration_id: 'areg-2' } },
      },
      {
        stepKey: 'suspend-task-dispatch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/suspend',
        requestBody: {
          now: '2026-05-16T13:00:00Z',
          reason: 'waiting for upstream dependency',
        },
        responseBody: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'SUSPENDED' } },
      },
      {
        stepKey: 'resume-task-dispatch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/resume',
        requestBody: {
          now: '2026-05-16T13:00:00Z',
          reason: 'dependency resolved',
        },
        responseBody: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED' } },
      },
      {
        stepKey: 'get-task-dispatch',
        status: 'passed',
        route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId',
        requestBody: null,
        responseBody: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'ASSIGNED', assigned_to_registration_id: 'areg-2' } },
      },
    ],
  });
  assert.deepEqual(writtenReport, result);
});

test('runU5TaskContinuityControl marks the report blocked when continuity-control steps fail after bootstrap', async () => {
  const { fetchStub } = createFetchStub([
    { status: 200, body: { recommended_next_step: 'dispatch_ready', dispatch_eligibility: { allowed: true } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1' } } },
    { status: 403, body: { error: { code: 'account_scoped_assignment_forbidden', message: 'account-scoped assign may only target the owned agent registration' } } },
    { status: 409, body: { error: { code: 'invalid_task_dispatch_transition', message: 'cannot apply suspension when notification=ACCEPTED task=DISPATCHED' } } },
    { status: 409, body: { error: { code: 'invalid_task_dispatch_transition', message: 'cannot apply resumption when notification=ACCEPTED task=DISPATCHED' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'DISPATCHED', assigned_to_registration_id: null } } },
  ]);

  const result = await runU5TaskContinuityControl({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/u5-state.json',
    outputPath: '/tmp/u5-report.json',
    assignedToRegistrationId: 'areg-2',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-16T13:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/u5-state.json',
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
  } as never);

  assert.equal(result.status, 'blocked');
  assert.deepEqual(result.phases, [
    {
      phaseKey: 'bootstrap',
      status: 'passed',
      classification: 'pass',
      detail: 'bootstrap claimant completed successfully',
    },
    {
      phaseKey: 'continuity-control',
      status: 'blocked',
      classification: 'bounded-stop',
      detail: 'task dispatch continuity control reached at least one bounded stop',
    },
  ]);
});

test('runU5TaskContinuityControl stops after assignment is forbidden and skips later write steps', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { recommended_next_step: 'dispatch_ready', dispatch_eligibility: { allowed: true } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1' } } },
    { status: 403, body: { error: { code: 'account_scoped_assignment_forbidden', message: 'account-scoped assign may only target the owned agent registration' } } },
    { status: 200, body: { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'DISPATCHED', assigned_to_registration_id: null } } },
  ]);

  const result = await runU5TaskContinuityControl({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/u5-state.json',
    outputPath: '/tmp/u5-report.json',
    assignedToRegistrationId: 'areg-2',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-16T13:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/u5-state.json',
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
  } as never);

  const typedResult = result as typeof result & {
    steps: Array<{ stepKey: string; status: string; responseBody: unknown }>;
  };

  assert.equal(calls.length, 4);
  assert.deepEqual(
    typedResult.steps.slice(-4).map((step) => [step.stepKey, step.status, step.responseBody]),
    [
      ['assign-task-dispatch', 'failed', { error: { code: 'account_scoped_assignment_forbidden', message: 'account-scoped assign may only target the owned agent registration' } }],
      ['suspend-task-dispatch', 'blocked', { skipped: true, blockedBy: 'assignment_forbidden' }],
      ['resume-task-dispatch', 'blocked', { skipped: true, blockedBy: 'assignment_forbidden' }],
      ['get-task-dispatch', 'passed', { dispatch: { agent_task_dispatch_id: 'dispatch-1', task_state: 'DISPATCHED', assigned_to_registration_id: null } }],
    ],
  );
});
