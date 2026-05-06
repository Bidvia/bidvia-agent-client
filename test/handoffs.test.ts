import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaExportOpportunityPackageInput,
} from '../src/contracts.js';
import { BidviaClient } from '../src/client.ts';
import {
  buildOpportunityPackageHandoffEnterpriseBoundary,
  buildOpportunityPackageHandoffPlan,
  executeOpportunityPackageHandoff,
  runOpportunityPackageHandoff,
} from '../src/handoffs.js';

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

function createOpportunityPackageHandoffInput(): {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  exportOpportunityPackage: BidviaExportOpportunityPackageInput;
} {
  return {
    scenarioId: 'scenario-opportunity-package-handoff-1',
    scenarioLabel: 'opportunity-package-handoff-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    exportOpportunityPackage: {
      opportunityId: 'opportunity-1',
      renderTemplateId: 'template-1',
      contentRef: 'content://packages/opportunity-1',
      redactionProfile: 'review-safe',
      targetSystem: 'downstream-dataroom',
      operationType: 'export',
      nodeId: 'node-1',
      runtimeId: 'runtime-1',
      agentId: 'agent-1',
      boundAccountId: 'account-1',
      now: '2026-03-25T20:24:00Z',
    },
  };
}

test('OpportunityPackageHandoff plan builds an explicit package handoff route', () => {
  const plan = buildOpportunityPackageHandoffPlan(
    createOpportunityPackageHandoffInput(),
  );

  assert.equal(plan.envelope.scenarioFamily, 'opportunity-package-handoff');
  assert.deepEqual(
    plan.envelope.expectedRouteChain.map((step) => step.routeKey),
    ['exportOpportunityPackage'],
  );
  assert.deepEqual(plan.exportOpportunityPackageInput, {
    ...createOpportunityPackageHandoffInput().exportOpportunityPackage,
    opportunityId: 'opportunity-1',
  });
  assert.deepEqual(plan.envelope.recordIds, {
    opportunities: ['opportunity-1'],
  });
  assert.deepEqual(plan.envelope.workflowStage, {
    workflowIds: ['wf-1'],
    localStageLabel: 'governed-run-execution',
    localStageSemantics: 'local-only',
    coreStageIdentifier: null,
    coreStageSemantics: 'blocked-pending-packet',
    blockedBy: 'core-write-semantics-not-frozen',
    transitionRule: null,
  });
});

test('package handoff builder rejects blank opportunity ids', () => {
  const input = createOpportunityPackageHandoffInput();
  input.exportOpportunityPackage.opportunityId = '   ';

  assert.throws(
    () => buildOpportunityPackageHandoffPlan(input),
    /opportunityId is required for the opportunity package handoff plan/,
  );
});

test('OpportunityPackageHandoff plan does not introduce additional route steps', () => {
  const plan = buildOpportunityPackageHandoffPlan(
    createOpportunityPackageHandoffInput(),
  );

  assert.equal(plan.envelope.expectedRouteChain.length, 1);
  assert.equal(plan.envelope.expectedRouteChain[0]?.routeKey, 'exportOpportunityPackage');
});

test('opportunity package handoff helpers expose a bounded enterprise integration boundary', () => {
  const boundary = buildOpportunityPackageHandoffEnterpriseBoundary();

  assert.equal(boundary.groupKey, 'opportunity-handoffs');
  assert.deepEqual(boundary.helperKeys, [
    'buildOpportunityPackageHandoffPlan',
    'runOpportunityPackageHandoff',
  ]);
  assert.equal(boundary.broaderEnterpriseAuthorityClaimed, false);
  assert.equal(boundary.broaderSystemAuthorityClaimed, false);
  assert.equal(boundary.payloadPacketStatus, 'blocked-pending-packet');
  assert.equal(boundary.blockedBy, 'core-plane-payload-packet-not-yet-frozen');
});

test('runOpportunityPackageHandoff calls only exportOpportunityPackage and returns a review-safe verification bundle', async () => {
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
  const plan = buildOpportunityPackageHandoffPlan(
    createOpportunityPackageHandoffInput(),
  );

  const bundle = await runOpportunityPackageHandoff(client, plan);

  assert.equal(calls.length, 1);
  assert.equal(
    String(calls[0]?.input),
    'http://127.0.0.1:8787/runtime/opportunities/opportunity-1/package-export?tenant_id=tenant-a',
  );
  assert.equal(bundle.verificationMode, 'review-safe');
  assert.deepEqual(bundle.completedRouteChain.map((step) => step.routeKey), [
    'exportOpportunityPackage',
  ]);
  assert.deepEqual(bundle.recordIds, {
    opportunities: ['opportunity-1'],
  });
});

test('runOpportunityPackageHandoff records returned package ids without widening caller-known opportunity truth', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({ package_id: 'pkg-runtime-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
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
  const plan = buildOpportunityPackageHandoffPlan(
    createOpportunityPackageHandoffInput(),
  );

  const bundle = await runOpportunityPackageHandoff(client, plan);

  assert.equal(calls.length, 1);
  assert.deepEqual(bundle.recordIds, {
    opportunities: ['opportunity-1'],
    packages: ['pkg-runtime-1'],
  });
});

test('runOpportunityPackageHandoff surfaces exportOpportunityPackage failures without swallowing', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchStub: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    throw new Error('exportOpportunityPackage failed');
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
  const plan = buildOpportunityPackageHandoffPlan(
    createOpportunityPackageHandoffInput(),
  );

  await assert.rejects(
    () => runOpportunityPackageHandoff(client, plan),
    /exportOpportunityPackage failed/,
  );
  assert.equal(calls.length, 1);
});

test('executeOpportunityPackageHandoff returns verification bundle plus execution result', async () => {
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
  const plan = buildOpportunityPackageHandoffPlan(createOpportunityPackageHandoffInput());

  const result = await executeOpportunityPackageHandoff(client, plan);

  assert.equal(calls.length, 1);
  assert.deepEqual(result.verificationBundle.completedRouteChain.map((step) => step.routeKey), ['exportOpportunityPackage']);
  assert.equal(result.executionResult.status, 'succeeded');
  assert.equal(result.executionResult.ownership, 'operator-admin');
});
