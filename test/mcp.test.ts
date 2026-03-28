import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  BidviaReviewPacket,
  BidviaMcpToolCallRequest,
  BidviaMcpToolCallResponse,
  BidviaMcpToolDescriptor,
  BidviaMcpToolOutputMode,
} from '../src/contracts.ts';
import {
  bidviaLocalCapabilityRiskTiers,
  bidviaLocalCapabilityTiers,
  bidviaMcpToolOutputModes,
} from '../src/contracts.ts';
import {
  bidviaMcpTools,
  dispatchMcpToolCall,
  exportMcpToolCatalog,
  getMcpToolDescriptor,
} from '../src/mcp.ts';
import type { BidviaIndustryUniverseScenarioPlan } from '../src/universe.ts';

type BidviaMcpDescriptorWithContext = BidviaMcpToolDescriptor & {
  accessContextFamily: string;
  requiredContext: string[];
};

const dispatchMcpToolCallWithExecution = dispatchMcpToolCall as unknown as (
  request: BidviaMcpToolCallRequest,
  dependencies?: {
    createExecutionClient?: () => unknown;
  },
) => Promise<BidviaMcpToolCallResponse>;

test('MCP descriptor contract exposes bounded output modes for shipped slices', () => {
  assert.equal(bidviaLocalCapabilityTiers.includes('L1-review-safe'), true);
  assert.equal(bidviaLocalCapabilityTiers.includes('L2-registration-runtime'), true);
  assert.equal(bidviaLocalCapabilityRiskTiers.includes('review-safe'), true);
  assert.equal(bidviaLocalCapabilityRiskTiers.includes('runtime-execution'), true);
  assert.deepEqual(bidviaMcpToolOutputModes, [
    'plan-preview',
    'review-packet-preview',
    'review-packet-export',
    'execution-result',
  ]);
});

test('MCP descriptor contract represents bounded plan-preview metadata without transport semantics', () => {
  const outputMode: BidviaMcpToolOutputMode = 'plan-preview';
  const descriptor: BidviaMcpDescriptorWithContext = {
    toolName: 'industry-universe-plan-preview',
    description: 'Previews the bounded industry universe scenario plan payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    },
    outputMode,
    helperRef: {
      helperKey: 'buildIndustryUniverseScenarioPlan',
    },
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
  };

  assert.equal(descriptor.toolName, 'industry-universe-plan-preview');
  assert.equal(descriptor.outputMode, 'plan-preview');
  assert.deepEqual(descriptor.inputSchemaRef, {
    schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
  });
  assert.deepEqual(descriptor.helperRef, {
    helperKey: 'buildIndustryUniverseScenarioPlan',
  });
  assert.equal(descriptor.localCapabilityTier, 'L1-review-safe');
  assert.equal(descriptor.localCapabilityRiskTier, 'review-safe');
  assert.equal(descriptor.accessContextFamily, 'scenario');
  assert.deepEqual(descriptor.requiredContext, ['tenantId', 'principalId', 'companyId']);
});

test('MCP descriptor contract represents review-packet descriptor metadata for shipped bounded tools', () => {
  const descriptor: BidviaMcpDescriptorWithContext = {
    toolName: 'connection-approval-review-packet-export',
    description: 'Exports the bounded connection approval review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    },
    outputMode: 'review-packet-export',
    helperRef: {
      helperKey: 'buildConnectionApprovalScenarioPlan',
      capabilityKey: 'buildConnectionApprovalScenarioPlan',
    },
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
  };

  assert.equal(descriptor.toolName, 'connection-approval-review-packet-export');
  assert.equal(descriptor.outputMode, 'review-packet-export');
  assert.equal(descriptor.helperRef.helperKey, 'buildConnectionApprovalScenarioPlan');
  assert.equal(descriptor.helperRef.capabilityKey, 'buildConnectionApprovalScenarioPlan');
  assert.equal(descriptor.localCapabilityTier, 'L1-review-safe');
  assert.equal(descriptor.localCapabilityRiskTier, 'review-safe');
  assert.equal(descriptor.accessContextFamily, 'scenario');
  assert.deepEqual(descriptor.requiredContext, ['tenantId', 'principalId', 'companyId']);
});

test('MCP tool catalog gives every shipped tool complete local tier and risk metadata', () => {
  assert.equal(bidviaMcpTools.every((tool) => tool.localCapabilityTier !== undefined), true);
  assert.equal(bidviaMcpTools.every((tool) => tool.localCapabilityRiskTier !== undefined), true);
  assert.equal(
    bidviaMcpTools.every((tool) => (tool as BidviaMcpDescriptorWithContext).accessContextFamily !== undefined),
    true,
  );
  assert.equal(
    bidviaMcpTools.every((tool) => Array.isArray((tool as BidviaMcpDescriptorWithContext).requiredContext)),
    true,
  );
});

test('MCP tool catalog covers the current bounded preview, export, and local execution slices only', () => {
  assert.deepEqual(
    bidviaMcpTools.map((tool) => tool.toolName),
    [
      'industry-universe-plan-preview',
      'industry-universe-review-packet-preview',
      'industry-universe-review-packet-export',
      'connection-approval-plan-preview',
      'connection-approval-review-packet-preview',
      'connection-approval-review-packet-export',
      'opportunity-package-handoff-plan-preview',
      'opportunity-package-handoff-review-packet-preview',
      'opportunity-package-handoff-review-packet-export',
      'heartbeat-execution',
      'sync-upload-execution',
      'evidence-execution',
      'proposal-execution',
    ],
  );
});

test('MCP tool catalog lookup returns descriptive bounded slice metadata', () => {
  assert.deepEqual(getMcpToolDescriptor('industry-universe-review-packet-preview') as BidviaMcpDescriptorWithContext, {
    toolName: 'industry-universe-review-packet-preview',
    description: 'Previews the bounded industry universe review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    },
    outputMode: 'review-packet-preview',
    helperRef: {
      helperKey: 'buildIndustryUniverseScenarioPlan',
      capabilityKey: 'buildIndustryUniverseScenarioPlan',
    },
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
  });

  assert.deepEqual(getMcpToolDescriptor('heartbeat-execution') as BidviaMcpDescriptorWithContext, {
    toolName: 'heartbeat-execution',
    description: 'Executes the real remote heartbeat over the local registration-bound client seam.',
    inputSchemaRef: {
      schemaKey: 'BidviaHeartbeatInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'heartbeat-execution',
      capabilityKey: 'postHeartbeat',
    },
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'registration',
    requiredContext: ['tenantId', 'registrationId', 'principalId'],
  });

  assert.equal(getMcpToolDescriptor('missing-tool'), undefined);
});

test('MCP tool catalog export returns stable machine-readable descriptor data', () => {
  const exportedCatalog = exportMcpToolCatalog();

  assert.notEqual(exportedCatalog, bidviaMcpTools);
  assert.deepEqual(exportedCatalog, bidviaMcpTools);
  exportedCatalog.push({
    toolName: 'mutated-tool',
    description: 'mutated',
    inputSchemaRef: {
      schemaKey: 'MutatedInput',
    },
    outputMode: 'plan-preview',
    helperRef: {
      helperKey: 'buildIndustryUniverseScenarioPlan',
    },
    localCapabilityTier: 'L1-review-safe',
    localCapabilityRiskTier: 'review-safe',
    accessContextFamily: 'scenario',
    requiredContext: ['tenantId', 'principalId', 'companyId'],
  } as BidviaMcpDescriptorWithContext);
  assert.equal(bidviaMcpTools.some((tool) => tool.toolName === 'mutated-tool'), false);
});

test('MCP tool-call contracts represent bounded local dispatch requests and responses', () => {
  const request: BidviaMcpToolCallRequest = {
    toolName: 'industry-universe-plan-preview',
    arguments: {
      scenarioId: 'scenario-industry-universe-1',
    },
  };
  const response: BidviaMcpToolCallResponse = {
    toolName: 'industry-universe-plan-preview',
    outputMode: 'plan-preview',
    result: {
      scenarioPlan: {
        scenarioLabel: 'industry-universe-soda-ash-light',
      },
    },
  };

  assert.equal(request.toolName, 'industry-universe-plan-preview');
  assert.equal(response.outputMode, 'plan-preview');
});

test('dispatchMcpToolCall routes shipped preview/export tools through existing bounded adapter behavior', async () => {
  const planPreview = await dispatchMcpToolCallWithExecution({
    toolName: 'industry-universe-plan-preview',
    arguments: {
      scenarioId: 'scenario-industry-universe-1',
      scenarioLabel: 'industry-universe-soda-ash-light',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://supply/soda-ash-light'],
      traceIds: ['trace-1'],
      workflowIds: ['wf-1'],
      createListing: {
        listingId: 'listing-1',
        listingType: 'supply',
        category: 'basic inorganic industrial chemical',
        sku: 'sodium-carbonate-soda-ash-light',
        quantityValue: '15',
        quantityUnit: 'tons',
        regionSummary: 'China -> Vietnam',
        verificationStatus: 'verified',
        freshnessTs: '2026-03-27T10:00:00Z',
        traceId: 'trace-1',
        idempotencyKey: 'listing-1',
        now: '2026-03-27T10:00:00Z',
      },
      activateListing: {
        now: '2026-03-27T10:01:00Z',
      },
      generateMatchCandidates: {
        upstreamDecision: 'READY_FOR_ROUTING',
        requiredEvidenceLevel: 1,
        detectedEvidenceLevel: 1,
        workflowRunId: 'wf-1',
        triggerEventId: 'evt-1',
        topN: 10,
        now: '2026-03-27T10:02:00Z',
      },
    },
  });
  const packetExport = await dispatchMcpToolCallWithExecution({
    toolName: 'connection-approval-review-packet-export',
    arguments: {
      scenarioId: 'scenario-connection-approval-1',
      scenarioLabel: 'connection-approval-soda-ash-light',
      sourceRefs: ['source://market/soda-ash-light'],
      evidenceRefs: ['evidence://approval/approval-1'],
      traceIds: ['trace-2'],
      workflowIds: ['wf-2'],
      createConnectionRequest: {
        sourceMatchId: 'match-1',
        requesterActorId: 'actor-1',
        requesterCompanyId: 'company-1',
        riskTier: 'medium',
        policyVersion: 'policy-v1',
        approvalMatrixVersion: 'matrix-v1',
        actionType: 'buyer_contact_request',
        now: '2026-03-27T10:03:00Z',
      },
      approveConnectionRequest: {
        approvalRequestId: 'approval-1',
        actorId: 'actor-1',
        decision: 'approve',
        now: '2026-03-27T10:04:00Z',
      },
    },
  });

  const planPreviewResult = planPreview.result as {
    scenarioPlan: BidviaIndustryUniverseScenarioPlan;
  };
  const packetExportResult = packetExport.result as {
    exportedReviewPacket: BidviaReviewPacket;
  };

  assert.equal(planPreview.toolName, 'industry-universe-plan-preview');
  assert.equal(planPreview.outputMode, 'plan-preview');
  assert.equal(planPreviewResult.scenarioPlan.envelope.scenarioFamily, 'industry-universe');
  assert.equal(packetExport.toolName, 'connection-approval-review-packet-export');
  assert.equal(packetExport.outputMode, 'review-packet-export');
  assert.equal(packetExportResult.exportedReviewPacket.scenarioFamily, 'connection-approval');
  assert.ok(Array.isArray(packetExportResult.exportedReviewPacket.details.routeDetails));
});

test('dispatchMcpToolCall routes local execution tools through the explicit runtime adapter seam', async () => {
  const heartbeat = await dispatchMcpToolCallWithExecution(
    {
      toolName: 'heartbeat-execution',
      arguments: {
        now: '2026-03-29T10:00:00Z',
        expiresAt: '2026-03-29T10:05:00Z',
      },
    },
    {
      createExecutionClient: () => ({
        async postHeartbeat(input: { expiresAt: string }) {
          return {
            ok: true,
            route: 'heartbeat',
            expiresAt: input.expiresAt,
          };
        },
      }) as never,
    },
  );

  assert.equal(heartbeat.toolName, 'heartbeat-execution');
  assert.equal(heartbeat.outputMode, 'execution-result');
  assert.deepEqual(heartbeat.result, {
    executionResult: {
      ok: true,
      route: 'heartbeat',
      expiresAt: '2026-03-29T10:05:00Z',
    },
  });
});

test('dispatchMcpToolCall rejects unknown tools outside the static catalog', () => {
  assert.rejects(
    () => dispatchMcpToolCallWithExecution({
      toolName: 'missing-tool',
      arguments: {},
    }),
    /unknown MCP tool: missing-tool/,
  );
});

test('dispatchMcpToolCall rejects runtime execution tools without a local execution client factory', () => {
  assert.rejects(
    () => dispatchMcpToolCallWithExecution({
      toolName: 'heartbeat-execution',
      arguments: {
        now: '2026-03-29T10:00:00Z',
        expiresAt: '2026-03-29T10:05:00Z',
      },
    }),
    /requires a local execution client factory/,
  );
});
