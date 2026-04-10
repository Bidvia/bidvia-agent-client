import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaConnectionApprovalScenarioPlanInput,
} from '../src/contracts.js';
import { BidviaClient } from '../src/client.ts';
import {
  buildConnectionApprovalScenarioPlan,
  runConnectionApprovalScenario,
} from '../src/connection.js';

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

function createConnectionApprovalScenarioInput(): BidviaConnectionApprovalScenarioPlanInput {
  return {
    scenarioId: 'scenario-connection-approval-1',
    scenarioLabel: 'connection-approval-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    createConnectionRequest: {
      sourceMatchId: 'match-1',
      requesterActorId: 'actor-1',
      requesterCompanyId: 'company-a',
      riskTier: 'medium',
      policyVersion: 'policy-v1',
      approvalMatrixVersion: 'matrix-v1',
      actionType: 'buyer_contact_request',
      now: '2026-03-25T20:22:00Z',
    },
    approveConnectionRequest: {
      approvalRequestId: 'approval-1',
      actorId: 'actor-1',
      decision: 'approve',
      now: '2026-03-25T20:23:00Z',
    },
  };
}

test('connection scenario contract expresses createConnectionRequest then approveConnectionRequest', () => {
  const plan = buildConnectionApprovalScenarioPlan(
    createConnectionApprovalScenarioInput(),
  );

  assert.equal(plan.envelope.scenarioFamily, 'connection-approval');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.map((step) => step.routeKey),
    ['createConnectionRequest', 'approveConnectionRequest'],
  );
  assert.deepEqual(plan.envelope.workflowStage, {
    workflowIds: ['wf-1'],
    localStageLabel: 'governed-run-execution',
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'packet-grounded-read',
    blockedBy: null,
    transitionRule: null,
  });
  assert.equal(plan.createConnectionRequestInput.sourceMatchId, 'match-1');
  assert.equal(plan.approveConnectionRequestInput.approvalRequestId, 'approval-1');
});

test('connection scenario contract rejects mismatched actor identities', () => {
  const input = createConnectionApprovalScenarioInput();
  input.approveConnectionRequest.actorId = 'actor-2';

  assert.throws(
    () => buildConnectionApprovalScenarioPlan(input),
    /requesterActorId and actorId must stay aligned across the connection approval scenario plan/,
  );
});

test('buildConnectionApprovalScenarioPlan rejects blank source match ids', () => {
  const input = createConnectionApprovalScenarioInput();
  input.createConnectionRequest.sourceMatchId = '  ';

  assert.throws(
    () => buildConnectionApprovalScenarioPlan(input),
    /sourceMatchId is required for the connection approval scenario plan/,
  );
});

test('buildConnectionApprovalScenarioPlan rejects missing approval request ids', () => {
  const input = createConnectionApprovalScenarioInput();
  input.approveConnectionRequest.approvalRequestId = '  ';

  assert.throws(
    () => buildConnectionApprovalScenarioPlan(input),
    /approvalRequestId is required for the connection approval scenario plan/,
  );
});

test('runConnectionApprovalScenario executes createConnectionRequest then approveConnectionRequest in order', async () => {
  const { calls, fetchStub } = createFetchStub();
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });
  const plan = buildConnectionApprovalScenarioPlan(
    createConnectionApprovalScenarioInput(),
  );

  const bundle = await runConnectionApprovalScenario(client, plan);

  assert.equal(calls.length, 2);
  assert.equal(
    String(calls[0]?.input),
    'http://127.0.0.1:8787/runtime/connection-requests?tenant_id=tenant-a',
  );
  assert.equal(
    String(calls[1]?.input),
    'http://127.0.0.1:8787/runtime/approvals/approval-1/decision?tenant_id=tenant-a',
  );
  assert.deepEqual(bundle.completedRouteChain.map((step) => step.routeKey), [
    'createConnectionRequest',
    'approveConnectionRequest',
  ]);
  assert.deepEqual(bundle.recordIds, {
    matches: ['match-1'],
    approvals: ['approval-1'],
  });
});

test('runConnectionApprovalScenario surfaces createConnectionRequest failures without swallowing', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    throw new Error('createConnectionRequest failed');
  };
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });
  const plan = buildConnectionApprovalScenarioPlan(
    createConnectionApprovalScenarioInput(),
  );

  await assert.rejects(
    () => runConnectionApprovalScenario(client, plan),
    /createConnectionRequest failed/,
  );
  assert.equal(calls.length, 1);
});

test('runConnectionApprovalScenario surfaces approveConnectionRequest failures without swallowing', async () => {
  let callCount = 0;
  const fetchStub: typeof fetch = async () => {
    callCount += 1;

    if (callCount === 1) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw new Error('approveConnectionRequest failed');
  };
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
      principalId: 'actor-1',
      companyId: 'company-a',
    },
    fetchImpl: fetchStub,
  });
  const plan = buildConnectionApprovalScenarioPlan(
    createConnectionApprovalScenarioInput(),
  );

  await assert.rejects(
    () => runConnectionApprovalScenario(client, plan),
    /approveConnectionRequest failed/,
  );
  assert.equal(callCount, 2);
});
