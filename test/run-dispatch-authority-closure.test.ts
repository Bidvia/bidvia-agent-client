import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseRunDispatchAuthorityClosureArgs,
  runDispatchAuthorityClosure,
} from '../scripts/live-probes/run-dispatch-authority-closure.ts';

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

test('parseRunDispatchAuthorityClosureArgs requires base-url, state-path, and output', () => {
  assert.throws(() => parseRunDispatchAuthorityClosureArgs([]), /--base-url is required/);
  assert.throws(() => parseRunDispatchAuthorityClosureArgs(['--base-url', 'http://127.0.0.1:8787']), /--state-path is required/);
  assert.throws(
    () => parseRunDispatchAuthorityClosureArgs(['--base-url', 'http://127.0.0.1:8787', '--state-path', '/tmp/state.json']),
    /--output is required/,
  );

  assert.deepEqual(
    parseRunDispatchAuthorityClosureArgs([
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

test('runDispatchAuthorityClosure validates claimant request, operator approval, and claimant reread truth', async () => {
  const { calls, fetchStub } = createFetchStub([
    { status: 200, body: { dispatch_authority: { availability_state: 'request_open' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-2', status: 'OPEN' } } },
    { status: 200, body: { request: { dispatch_authority_activation_request_id: 'daar-2', status: 'APPROVED' }, authority_profile: { authority_profile_id: 'authp-2', status: 'active' } } },
    { status: 200, body: { recommended_next_step: 'complete_external_binding', dispatch_eligibility: { allowed: false } } },
    { status: 200, body: { dispatch_authority: { availability_state: 'approved_dispatch_authority' } } },
  ]);

  let writtenReport: unknown = null;

  const result = await runDispatchAuthorityClosure({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/dispatch-authority-state.json',
    outputPath: '/tmp/dispatch-authority-report.json',
  }, {
    fetchImpl: fetchStub,
    now: () => '2026-05-19T05:20:00Z',
    bootstrapClaimant: async (bootstrapArgs) => {
      assert.equal((bootstrapArgs as any).stopBeforeDispatchAuthorityApproval, true);
      return {
        command: 'bootstrap-claimant-local-docker',
        baseUrl: 'http://127.0.0.1:8787',
        statePath: '/tmp/dispatch-authority-state.json',
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
          requestId: null,
          status: 'NOT_REQUESTED',
          authorityProfileId: null,
        },
        externalBinding: {
          bindingId: null,
          status: 'missing',
          systemName: 'bootstrap-live-seeded',
          externalAccountRef: 'ext-seeded',
        },
      } as never;
    },
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/dispatch-authority-report.json' };
    },
  } as never);

  assert.equal(String(calls[0]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/dispatch-authority');
  assert.equal(String(calls[1]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/dispatch-authority-requests');
  assert.equal(String(calls[2]?.input), 'http://127.0.0.1:8787/operator/dispatch-authority-requests/daar-2/decision?tenant_id=tenant-public');
  assert.equal(String(calls[3]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/closure-status');
  assert.equal(String(calls[4]?.input), 'http://127.0.0.1:8787/runtime/account/agents/agent-1/dispatch-authority');
  assert.equal(result.status, 'passed');
  assert.equal(result.requestId, 'daar-2');
  assert.equal(result.approvalStatus, 'APPROVED');
  assert.deepEqual(writtenReport, result);
});

test('runDispatchAuthorityClosure returns a machine-readable bootstrap failure report with phase markers', async () => {
  let writtenReport: unknown = null;

  const result = await runDispatchAuthorityClosure({
    baseUrl: 'http://127.0.0.1:8787',
    statePath: '/tmp/dispatch-authority-state.json',
    outputPath: '/tmp/dispatch-authority-report.json',
  }, {
    now: () => '2026-05-19T05:30:00Z',
    bootstrapClaimant: async () => {
      throw new Error('bootstrap claim failed: claim_token_missing');
    },
    writeReport: async (_outputPath: string, report: unknown) => {
      writtenReport = report;
      return { outputPath: '/tmp/dispatch-authority-report.json' };
    },
  } as never);

  assert.equal(result.status, 'failed');
  assert.equal((result as any).failure.phaseKey, 'bootstrap');
  assert.deepEqual(writtenReport, result);
});
