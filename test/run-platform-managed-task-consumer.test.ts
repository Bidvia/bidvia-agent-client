import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunPlatformManagedTaskConsumerArgs,
  runPlatformManagedTaskConsumer,
} from '../scripts/live-probes/run-platform-managed-task-consumer.ts';

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

test('parseRunPlatformManagedTaskConsumerArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunPlatformManagedTaskConsumerArgs([]), /--base-url is required/);
  assert.throws(() => parseRunPlatformManagedTaskConsumerArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunPlatformManagedTaskConsumerArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunPlatformManagedTaskConsumerArgs([
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

test('runPlatformManagedTaskConsumer validates bounded allowed actions and rejects create-dispatch for platform-managed agents', async () => {
  const { calls, fetchStub } = createFetchStub([
    {
      status: 200,
      body: {
        lease: { lease_id: 'lease-1', status: 'ACTIVE' },
      },
    },
    {
      status: 403,
      body: {
        error: {
          code: 'platform_managed_dispatch_creation_forbidden',
          message: 'platform-managed agents may not create dispatches on the account-scoped plane',
        },
      },
    },
  ]);

  let writtenReport: unknown = null;

  const result = await runPlatformManagedTaskConsumer({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/platform-managed-task-state.json',
    outputPath: '/tmp/platform-managed-task-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-19T09:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/platform-managed-task-state.json',
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
    platformManagedRegistration: async () => ({
      actor_family: 'platform_internal_operating_agent',
      allowed_actions: [
        'acknowledge_notification',
        'create_claim',
        'accept_claim',
        'reject_claim',
        'create_lease',
        'complete_dispatch',
        'fail_dispatch',
      ],
      registration: { agent_id: 'pm-agent-1', registration_mode: 'platform_managed' },
    }),
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/platform-managed-task-report.json' };
    },
  } as never);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/pm-agent-1/leases?tenant_id=tenant-public');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/pm-agent-1/task-dispatches?tenant_id=tenant-public');
  assert.equal(result.status, 'passed');
  assert.deepEqual(result.allowedActions, [
    'acknowledge_notification',
    'create_claim',
    'accept_claim',
    'reject_claim',
    'create_lease',
    'complete_dispatch',
    'fail_dispatch',
  ]);
  assert.equal(result.leaseAttempt.status, 200);
  assert.equal(result.createDispatchAttempt.status, 403);
  assert.deepEqual(writtenReport, result);
});
