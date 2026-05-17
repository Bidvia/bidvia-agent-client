import test from 'node:test';
import assert from 'node:assert/strict';

import { dispatchMcpToolCall, getMcpToolDescriptor } from '../src/mcp.ts';

test('claimant product MCP descriptors are discoverable', () => {
  assert.ok(getMcpToolDescriptor('claimant-precondition-inspect-read'));
  assert.ok(getMcpToolDescriptor('claimant-readiness-repair-execution'));
  assert.ok(getMcpToolDescriptor('claimant-task-entry-run-execution'));
  assert.ok(getMcpToolDescriptor('claimant-handoff-opportunity-status-read'));
  assert.ok(getMcpToolDescriptor('claimant-handoff-opportunity-end-state-read'));
  assert.ok(getMcpToolDescriptor('account-agent-execution-opportunity-status-read'));
  assert.ok(getMcpToolDescriptor('account-agent-execution-opportunity-end-state-read'));
});

test('dispatchMcpToolCall routes claimant precondition inspect through the claimant facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'claimant-precondition-inspect-read',
    arguments: {},
  }, {
    createExecutionClient: () => ({
      getAccountMe: async () => ({
        account: { tenant_id: 'tenant-public' },
        active_org_context: { org_id: 'company-public' },
        memberships: [{ org_id: 'company-public', role: 'enterprise_admin' }],
      }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as any).stageSnapshot.state, 'ready');
});

test('dispatchMcpToolCall routes claimant task entry execution through the claimant facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'claimant-task-entry-run-execution',
    arguments: {
      agentId: 'agent-1',
      taskKind: 'COMMERCIAL_ACTION_REVIEW',
      taskRef: 'task://agent-1',
      reason: 'run claimant task entry',
      now: '2026-05-10T12:20:00.000Z',
    },
  }, {
    createExecutionClient: () => ({
      options: {
        context: {
          tenantId: 'tenant-public',
          sessionId: 'sess-1',
          principalId: 'claimed:agent-1',
          companyId: 'company-public',
        },
      },
      createTaskDispatch: async () => ({ dispatch: { agent_task_dispatch_id: 'dispatch-1' } }),
    }) as never,
  });

  assert.equal((response.result?.executionResult as any).dispatch.agent_task_dispatch_id, 'dispatch-1');
});


test('dispatchMcpToolCall routes claimant opportunity status read through the shipped SDK helper', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'account-agent-execution-opportunity-status-read',
    arguments: {
      agentId: 'agent-1',
      targetRef: 'opp-1',
    },
  }, {
    createExecutionClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({ continuation_state: 'ALLOCATED' }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as any).continuation_state, 'ALLOCATED');
});

test('dispatchMcpToolCall routes claimant opportunity end-state read through the shipped SDK helper', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'account-agent-execution-opportunity-end-state-read',
    arguments: {
      agentId: 'agent-1',
      targetRef: 'opp-1',
    },
  }, {
    createExecutionClient: () => ({
      getAccountAgentExecutionOpportunityEndState: async () => ({ closure_class: 'product_closed' }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as any).closure_class, 'product_closed');
});

test('dispatchMcpToolCall routes claimant handoff opportunity status read through the claimant facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'claimant-handoff-opportunity-status-read',
    arguments: {
      agentId: 'agent-1',
      targetRef: 'opp-1',
    },
  }, {
    createExecutionClient: () => ({
      getAccountAgentExecutionOpportunityStatus: async () => ({ continuation_state: 'ALLOCATED' }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as any).continuation_state, 'ALLOCATED');
});

test('dispatchMcpToolCall routes claimant handoff opportunity end-state read through the claimant facade', async () => {
  const response = await dispatchMcpToolCall({
    toolName: 'claimant-handoff-opportunity-end-state-read',
    arguments: {
      agentId: 'agent-1',
      targetRef: 'opp-1',
    },
  }, {
    createExecutionClient: () => ({
      getAccountAgentExecutionOpportunityEndState: async () => ({ closure_class: 'product_closed' }),
    }) as never,
  });

  assert.equal((response.result?.truthFetchResult as any).closure_class, 'product_closed');
});
