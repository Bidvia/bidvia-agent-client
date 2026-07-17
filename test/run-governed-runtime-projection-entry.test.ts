import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunGovernedRuntimeProjectionEntryArgs,
  runGovernedRuntimeProjectionEntry,
} from '../scripts/live-probes/run-governed-runtime-projection-entry.ts';

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

test('parseRunGovernedRuntimeProjectionEntryArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunGovernedRuntimeProjectionEntryArgs([]), /--base-url is required/);
  assert.throws(() => parseRunGovernedRuntimeProjectionEntryArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunGovernedRuntimeProjectionEntryArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunGovernedRuntimeProjectionEntryArgs([
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

test('runGovernedRuntimeProjectionEntry validates governed-runtime reads from a session-projected enterprise account', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { registration: { agent_id: 'agent-1', tenant_id: 'tenant-public' } } },
    { status: 200, body: { recommended_next_step: 'complete_external_binding', next_step_kind: 'external_binding' } },
    { status: 200, body: { dispatch_authority: { availability_state: 'approved_dispatch_authority' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runGovernedRuntimeProjectionEntry({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/projection-state.json',
    outputPath: '/tmp/projection-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-19T05:00:00Z',
    bootstrapClaimant: async () => ({
      command: 'bootstrap-claimant-local-docker',
      baseUrl: 'http://127.0.0.1:8787',
      statePath: '/tmp/projection-state.json',
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
      return { outputPath: '/tmp/projection-report.json' };
    },
  } as never);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/closure-status?tenant_id=tenant-public');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/dispatch-authority');
  assert.equal((calls[0]?.init?.headers as Record<string, string>)['x-bidvia-session-id'], 'sess-1');
  assert.equal(result.status, 'passed');
  assert.equal(result.accountOwnedReads.accountAgent.status, 200);
  assert.equal(result.accountOwnedReads.closureStatus.status, 200);
  assert.equal(result.accountOwnedReads.dispatchAuthority.status, 200);
  assert.deepEqual(writtenReport, result);
});

test('runGovernedRuntimeProjectionEntry returns a machine-readable bootstrap failure report with phase markers', async () => {
  let writtenReport: unknown = null;

  const result = await runGovernedRuntimeProjectionEntry({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/projection-state.json',
    outputPath: '/tmp/projection-report.json',
  }, {
    now: () => '2026-05-19T05:10:00Z',
    bootstrapClaimant: async () => {
      throw new Error('bootstrap sign-in failed: inactive_membership');
    },
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/projection-report.json' };
    },
  } as never);

  assert.equal(result.status, 'failed');
  assert.equal((result as any).failure.phaseKey, 'bootstrap');
  assert.deepEqual(writtenReport, result);
});
