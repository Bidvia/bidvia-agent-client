import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';

test('runCli claimant-precondition-inspect prints machine-readable precondition snapshot', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli(['claimant-precondition-inspect'], {
    createClient: () => ({
      getAccountMe: async () => ({
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }],
      }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).stageSnapshot.stage, 'entry');
  assert.equal((printed[0] as any).stageSnapshot.state, 'ready');
});

test('runCli claimant-precondition-establish-canonical-company-public routes through claimant facade and selects canonical org', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  let selected = false;
  const exitCode = await runCli([
    'claimant-precondition-establish-canonical-company-public',
    '--input',
    '{"invitationToken":"invite-1","now":"2026-05-10T12:00:00.000Z"}',
  ], {
    createClient: () => ({
      acceptAccountMembershipInvitation: async ({ invitationToken }: any) => {
        calls.push(`accept:${invitationToken}`);
        return { ok: true };
      },
      selectOrg: async ({ orgId }: any) => {
        calls.push(`select:${orgId}`);
        selected = true;
        return { ok: true };
      },
      getAccountMe: async () => selected
        ? { account: { tenant_id: 'tenant-public' }, active_org_context: { org_id: 'company-public' }, memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }] }
        : { account: { tenant_id: 'tenant-public' }, active_org_context: null, memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }] },
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['accept:invite-1', 'select:company-public']);
  assert.equal((printed[0] as any).stageSnapshot.state, 'ready');
});

test('runCli claimant-handoff-inspect reports executable handoff for canonical company-public listing', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'claimant-handoff-inspect',
    '--agent-id',
    'agent-1',
    '--listing-id',
    'listing-1',
  ], {
    createClient: () => ({
      getAccountMe: async () => ({ account: { tenant_id: 'tenant-public' }, active_org_context: { org_id: 'company-public' } }),
      getAccountAgentExecutionListingMaterializationStatus: async () => ({
        materialization_stage: 'match_prerequisites_ready',
        recommended_next_step: 'handoff_to_operator_for_matching',
        next_step_kind: 'handoff_to_operator',
        operator_handoff: { owner: 'operator', route: '/operator/matches?tenant_id=tenant-public&source_listing_id=listing-1' },
      }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).stageSnapshot.executability, 'executable-handoff');
});


test('runCli claimant-readiness-inspect prints machine-readable readiness snapshot', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'claimant-readiness-inspect',
    '--agent-id',
    'agent-1',
  ], {
    createClient: () => ({
      getAccountAgent: async () => ({
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-1',
          owner_account_id: 'company-public',
        },
      }),
      getAccountAgentClosureStatus: async () => ({
        recommended_next_step: 'complete_claimed_agent_self_service',
        next_step_kind: 'self_service_patch',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['capability_profile_missing', 'participation_state_missing'],
        },
      }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).stageSnapshot.recommendedNextStep, 'complete_claimed_agent_self_service');
});

test('runCli claimant-readiness-repair routes to external binding when closure-status says complete_external_binding', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'claimant-readiness-repair',
    '--agent-id',
    'agent-2',
    '--input',
    '{"now":"2026-05-10T12:10:00.000Z","externalBinding":{"systemType":"wms","systemName":"closure-live-wms","externalAccountRef":"ext-agent-2"}}',
  ], {
    createClient: () => ({
      getAccountAgent: async () => ({
        registration: {
          tenant_id: 'tenant-public',
          principal_id: 'claimed:agent-2',
          owner_account_id: 'company-public',
        },
      }),
      getAccountAgentClosureStatus: async () => ({
        recommended_next_step: 'complete_external_binding',
        next_step_kind: 'external_binding',
        dispatch_eligibility: {
          allowed: false,
          reason_codes: ['external_account_binding_missing'],
        },
      }),
      patchAgentSelfService: async () => {
        throw new Error('unexpected self-service patch');
      },
      createAccountAgentExternalBinding: async (_agentId: string, input: any) => {
        calls.push(`${input.systemType}:${input.systemName}`);
        return { ok: true };
      },
      createAccountAgentDispatchAuthorityRequest: async () => {
        throw new Error('unexpected dispatch authority request');
      },
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['wms:closure-live-wms']);
  assert.equal((printed[0] as any).actionTaken, 'complete_external_binding');
});

test('runCli claimant-task-entry-run routes through the claimant task entry facade and prints dispatch json', async () => {
  const printed: unknown[] = [];
  const calls: string[] = [];
  const exitCode = await runCli([
    'claimant-task-entry-run',
    '--agent-id',
    'agent-3',
    '--input',
    '{"taskKind":"COMMERCIAL_ACTION_REVIEW","taskRef":"task://agent-3","reason":"run claimant task entry","now":"2026-05-10T12:20:00.000Z"}',
  ], {
    createClient: () => ({
      createTaskDispatch: async (agentId: string, input: any) => {
        calls.push(`${agentId}:${input.taskKind}`);
        return { dispatch: { agent_task_dispatch_id: 'dispatch-1' } };
      },
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public', principalId: 'claimed:agent-3', companyId: 'company-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public', principalId: 'claimed:agent-3', companyId: 'company-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['agent-3:COMMERCIAL_ACTION_REVIEW']);
  assert.equal((printed[0] as any).dispatch.agent_task_dispatch_id, 'dispatch-1');
});


test('runCli account-agent-execution-opportunity-status routes through the claimant opportunity status helper', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'account-agent-execution-opportunity-status',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({ continuation_state: 'ALLOCATED' }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).continuation_state, 'ALLOCATED');
});

test('runCli account-agent-execution-opportunity-end-state routes through the claimant opportunity end-state helper', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'account-agent-execution-opportunity-end-state',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityEndState: async () => ({ closure_class: 'product_closed' }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).closure_class, 'product_closed');
});

test('runCli claimant deeper readbacks preserve bounded operator handoff and proof-class wording', async () => {
  const printed: unknown[] = [];
  const statusExitCode = await runCli([
    'account-agent-execution-opportunity-status',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({
        continuation_state: 'ALLOCATED',
        completion_class: 'handoff-to-operator',
        operator_handoff: {
          owner: 'operator',
          route: '/operator/opportunities/opp-1?tenant_id=tenant-public&company_id=company-public',
          opportunity_id: 'opp-1',
        },
      }),
      getAccountAgentExecutionOpportunityEndState: async () => ({
        closure_class: 'product_closed',
        proof_class: 'product_closure_only',
        operator_handoff: {
          owner: 'operator',
          route: '/operator/end-state/opportunities/opp-1?tenant_id=tenant-public&company_id=company-public',
          opportunity_id: 'opp-1',
        },
        recommended_next_step: 'await_operator_end_state',
      }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });
  const endStateExitCode = await runCli([
    'account-agent-execution-opportunity-end-state',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({
        continuation_state: 'ALLOCATED',
      }),
      getAccountAgentExecutionOpportunityEndState: async () => ({
        closure_class: 'product_closed',
        proof_class: 'product_closure_only',
        operator_handoff: {
          owner: 'operator',
          route: '/operator/end-state/opportunities/opp-1?tenant_id=tenant-public&company_id=company-public',
          opportunity_id: 'opp-1',
        },
        recommended_next_step: 'await_operator_end_state',
      }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(statusExitCode, 0);
  assert.equal(endStateExitCode, 0);
  assert.equal((printed[0] as any).completion_class, 'handoff-to-operator');
  assert.equal((printed[0] as any).operator_handoff.owner, 'operator');
  assert.equal((printed[1] as any).proof_class, 'product_closure_only');
  assert.equal((printed[1] as any).recommended_next_step, 'await_operator_end_state');
});

test('runCli claimant-handoff-opportunity-status routes through the claimant product helper', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'claimant-handoff-opportunity-status',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({ continuation_state: 'ALLOCATED' }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).continuation_state, 'ALLOCATED');
});

test('runCli claimant-handoff-opportunity-end-state routes through the claimant product helper', async () => {
  const printed: unknown[] = [];
  const exitCode = await runCli([
    'claimant-handoff-opportunity-end-state',
    '--agent-id',
    'agent-1',
    '--target-ref',
    'opp-1',
  ], {
    createClient: () => ({
      getAccountAgentExecutionOpportunityEndState: async () => ({ closure_class: 'product_closed' }),
    }) as never,
    resolveExecutionContext: () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    readLocalOnboardingState: async () => ({ sessionId: 'sess-1', tenantId: 'tenant-public' }),
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(exitCode, 0);
  assert.equal((printed[0] as any).closure_class, 'product_closed');
});
