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
  assert.equal(bidviaLocalCapabilityTiers.includes('L0-observe-only'), true);
  assert.equal(bidviaLocalCapabilityTiers.includes('L1-review-safe'), true);
  assert.equal(bidviaLocalCapabilityTiers.includes('L2-registration-runtime'), true);
  assert.equal(bidviaLocalCapabilityRiskTiers.includes('observe-only'), true);
  assert.equal(bidviaLocalCapabilityRiskTiers.includes('review-safe'), true);
  assert.equal(bidviaLocalCapabilityRiskTiers.includes('runtime-execution'), true);
  assert.deepEqual(bidviaMcpToolOutputModes, [
    'plan-preview',
    'review-packet-preview',
    'review-packet-export',
    'truth-fetch-result',
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

test('MCP tool catalog covers the current bounded preview, truth-fetch, export, and local execution slices only', () => {
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
      'account-agents-read',
      'account-agent-bindings-read',
      'account-records-read',
      'agent-presence-read',
      'agent-authority-read',
      'canonical-semantic-concepts-read',
      'canonical-semantic-concept-read',
      'pricing-bases-read',
      'pricing-basis-read',
      'document-artifacts-read',
      'document-artifact-read',
      'media-assets-read',
      'media-asset-read',
      'evidence-assets-read',
      'evidence-asset-read',
      'attachment-bindings-read',
      'attachment-binding-read',
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

test('governance truth-fetch descriptor contract exposes a read-only MCP output mode', () => {
  assert.equal((bidviaMcpToolOutputModes as readonly string[]).includes('truth-fetch-result'), true);
});

test('governance truth-fetch MCP catalog exposes the governance-first read-only tool slice', () => {
  const governanceToolNames = bidviaMcpTools
    .filter((tool) => tool.toolName.endsWith('-read'))
    .map((tool) => tool.toolName);

  assert.deepEqual(governanceToolNames, [
    'account-agents-read',
    'account-agent-bindings-read',
    'account-records-read',
    'agent-presence-read',
    'agent-authority-read',
    'canonical-semantic-concepts-read',
    'canonical-semantic-concept-read',
    'pricing-bases-read',
    'pricing-basis-read',
    'document-artifacts-read',
    'document-artifact-read',
    'media-assets-read',
    'media-asset-read',
    'evidence-assets-read',
    'evidence-asset-read',
    'attachment-bindings-read',
    'attachment-binding-read',
  ]);
});

test('governance truth-fetch MCP descriptor metadata matches helper mapping and explicit context', () => {
  assert.deepEqual(getMcpToolDescriptor('account-agents-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'account-agents-read',
    description: 'Reads the current governed account agent records through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listAccountAgents',
      capabilityKey: 'listAccountAgents',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
  });

  assert.deepEqual(getMcpToolDescriptor('account-agent-bindings-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'account-agent-bindings-read',
    description: 'Reads the current governed account agent bindings through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listAccountAgentBindings',
      capabilityKey: 'listAccountAgentBindings',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
  });

  assert.deepEqual(getMcpToolDescriptor('account-records-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'account-records-read',
    description: 'Reads the current governed account records through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listAccountRecords',
      capabilityKey: 'listAccountRecords',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
  });

  assert.deepEqual(getMcpToolDescriptor('agent-presence-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'agent-presence-read',
    description: 'Reads the current governed agent presence through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAgentRegistrationIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAgentPresence',
      capabilityKey: 'getAgentPresence',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'admin-session',
    requiredContext: ['tenantId', 'adminSessionId'],
  });

  assert.deepEqual(getMcpToolDescriptor('agent-authority-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'agent-authority-read',
    description: 'Reads the current governed agent authority through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAgentRegistrationIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAgentAuthority',
      capabilityKey: 'getAgentAuthority',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'admin-session',
    requiredContext: ['tenantId', 'adminSessionId'],
  });

  assert.deepEqual(getMcpToolDescriptor('canonical-semantic-concepts-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'canonical-semantic-concepts-read',
    description: 'Reads the current business canonical semantic concepts through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listCanonicalSemanticConcepts',
      capabilityKey: 'listCanonicalSemanticConcepts',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('canonical-semantic-concept-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'canonical-semantic-concept-read',
    description: 'Reads the current business canonical semantic concept through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaCanonicalSemanticConceptIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getCanonicalSemanticConcept',
      capabilityKey: 'getCanonicalSemanticConcept',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('pricing-bases-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'pricing-bases-read',
    description: 'Reads the current business pricing bases through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listPricingBases',
      capabilityKey: 'listPricingBases',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('pricing-basis-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'pricing-basis-read',
    description: 'Reads the current business pricing basis through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaPricingBasisIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getPricingBasis',
      capabilityKey: 'getPricingBasis',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('document-artifacts-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'document-artifacts-read',
    description: 'Reads the current business document artifacts through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listDocumentArtifacts',
      capabilityKey: 'listDocumentArtifacts',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('document-artifact-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'document-artifact-read',
    description: 'Reads the current business document artifact through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaDocumentArtifactIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getDocumentArtifact',
      capabilityKey: 'getDocumentArtifact',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('media-assets-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'media-assets-read',
    description: 'Reads the current business media assets through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listMediaAssets',
      capabilityKey: 'listMediaAssets',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('media-asset-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'media-asset-read',
    description: 'Reads the current business media asset through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaMediaAssetIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getMediaAsset',
      capabilityKey: 'getMediaAsset',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('evidence-assets-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'evidence-assets-read',
    description: 'Reads the current business evidence assets through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listEvidenceAssets',
      capabilityKey: 'listEvidenceAssets',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('evidence-asset-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'evidence-asset-read',
    description: 'Reads the current business evidence asset through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaEvidenceAssetIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getEvidenceAsset',
      capabilityKey: 'getEvidenceAsset',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('attachment-bindings-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'attachment-bindings-read',
    description: 'Reads the current business attachment bindings through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaTruthFetchEmptyInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'listAttachmentBindings',
      capabilityKey: 'listAttachmentBindings',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('attachment-binding-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'attachment-binding-read',
    description: 'Reads the current business attachment binding through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaAttachmentBindingIdentifierInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'getAttachmentBinding',
      capabilityKey: 'getAttachmentBinding',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    requiredContext: ['tenantId'],
  });
});

test('dispatchMcpToolCall routes business truth-fetch collection tools through tenant SDK reads', async () => {
  const calls: string[] = [];
  const client = {
    async listCanonicalSemanticConcepts() {
      calls.push('listCanonicalSemanticConcepts');
      return {
        items: [{ canonicalSemanticConceptId: 'concept-1' }],
      };
    },
    async listPricingBases() {
      calls.push('listPricingBases');
      return {
        items: [{ pricingBasisId: 'pricing-basis-1' }],
      };
    },
    async listDocumentArtifacts() {
      calls.push('listDocumentArtifacts');
      return {
        items: [{ documentArtifactId: 'document-1' }],
      };
    },
    async listMediaAssets() {
      calls.push('listMediaAssets');
      return {
        items: [{ mediaAssetId: 'media-1' }],
      };
    },
    async listEvidenceAssets() {
      calls.push('listEvidenceAssets');
      return {
        items: [{ evidenceAssetId: 'evidence-1' }],
      };
    },
    async listAttachmentBindings() {
      calls.push('listAttachmentBindings');
      return {
        items: [{ attachmentBindingId: 'attachment-1' }],
      };
    },
  };

  const results = await Promise.all([
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'canonical-semantic-concepts-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'pricing-bases-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'document-artifacts-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'media-assets-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'evidence-assets-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'attachment-bindings-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
  ]);

  assert.deepEqual(calls, [
    'listCanonicalSemanticConcepts',
    'listPricingBases',
    'listDocumentArtifacts',
    'listMediaAssets',
    'listEvidenceAssets',
    'listAttachmentBindings',
  ]);
  assert.deepEqual(results.map((result) => result.result), [
    {
      truthFetchResult: {
        items: [{ canonicalSemanticConceptId: 'concept-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ pricingBasisId: 'pricing-basis-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ documentArtifactId: 'document-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ mediaAssetId: 'media-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ evidenceAssetId: 'evidence-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ attachmentBindingId: 'attachment-1' }],
      },
    },
  ]);
});

test('dispatchMcpToolCall routes business truth-fetch detail tools through tenant SDK reads with explicit IDs', async () => {
  const calls: Array<{ helper: string; id: string }> = [];
  const client = {
    async getCanonicalSemanticConcept(canonicalSemanticConceptId: string) {
      calls.push({ helper: 'getCanonicalSemanticConcept', id: canonicalSemanticConceptId });
      return {
        canonicalSemanticConceptId,
      };
    },
    async getPricingBasis(pricingBasisId: string) {
      calls.push({ helper: 'getPricingBasis', id: pricingBasisId });
      return {
        pricingBasisId,
      };
    },
    async getDocumentArtifact(documentArtifactId: string) {
      calls.push({ helper: 'getDocumentArtifact', id: documentArtifactId });
      return {
        documentArtifactId,
      };
    },
    async getMediaAsset(mediaAssetId: string) {
      calls.push({ helper: 'getMediaAsset', id: mediaAssetId });
      return {
        mediaAssetId,
      };
    },
    async getEvidenceAsset(evidenceAssetId: string) {
      calls.push({ helper: 'getEvidenceAsset', id: evidenceAssetId });
      return {
        evidenceAssetId,
      };
    },
    async getAttachmentBinding(attachmentBindingId: string) {
      calls.push({ helper: 'getAttachmentBinding', id: attachmentBindingId });
      return {
        attachmentBindingId,
      };
    },
  };

  const results = await Promise.all([
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'canonical-semantic-concept-read',
        arguments: {
          canonicalSemanticConceptId: 'concept-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'pricing-basis-read',
        arguments: {
          pricingBasisId: 'pricing-basis-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'document-artifact-read',
        arguments: {
          documentArtifactId: 'document-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'media-asset-read',
        arguments: {
          mediaAssetId: 'media-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'evidence-asset-read',
        arguments: {
          evidenceAssetId: 'evidence-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'attachment-binding-read',
        arguments: {
          attachmentBindingId: 'attachment-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
  ]);

  assert.deepEqual(calls, [
    { helper: 'getCanonicalSemanticConcept', id: 'concept-42' },
    { helper: 'getPricingBasis', id: 'pricing-basis-42' },
    { helper: 'getDocumentArtifact', id: 'document-42' },
    { helper: 'getMediaAsset', id: 'media-42' },
    { helper: 'getEvidenceAsset', id: 'evidence-42' },
    { helper: 'getAttachmentBinding', id: 'attachment-42' },
  ]);
  assert.deepEqual(results.map((result) => result.result), [
    {
      truthFetchResult: {
        canonicalSemanticConceptId: 'concept-42',
      },
    },
    {
      truthFetchResult: {
        pricingBasisId: 'pricing-basis-42',
      },
    },
    {
      truthFetchResult: {
        documentArtifactId: 'document-42',
      },
    },
    {
      truthFetchResult: {
        mediaAssetId: 'media-42',
      },
    },
    {
      truthFetchResult: {
        evidenceAssetId: 'evidence-42',
      },
    },
    {
      truthFetchResult: {
        attachmentBindingId: 'attachment-42',
      },
    },
  ]);
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

test('dispatchMcpToolCall routes governance truth-fetch account tools through session-bound SDK reads', async () => {
  const calls: string[] = [];
  const client = {
    async listAccountAgents() {
      calls.push('listAccountAgents');
      return {
        items: [{ registrationId: 'areg-1' }],
      };
    },
    async listAccountAgentBindings() {
      calls.push('listAccountAgentBindings');
      return {
        items: [{ bindingId: 'binding-1' }],
      };
    },
    async listAccountRecords() {
      calls.push('listAccountRecords');
      return {
        items: [{ accountId: 'acct-1' }],
      };
    },
  };

  const accountAgents = await dispatchMcpToolCallWithExecution(
    {
      toolName: 'account-agents-read',
      arguments: {},
    },
    {
      createExecutionClient: () => client as never,
    },
  );
  const accountBindings = await dispatchMcpToolCallWithExecution(
    {
      toolName: 'account-agent-bindings-read',
      arguments: {},
    },
    {
      createExecutionClient: () => client as never,
    },
  );
  const accountRecords = await dispatchMcpToolCallWithExecution(
    {
      toolName: 'account-records-read',
      arguments: {},
    },
    {
      createExecutionClient: () => client as never,
    },
  );

  assert.deepEqual(calls, [
    'listAccountAgents',
    'listAccountAgentBindings',
    'listAccountRecords',
  ]);
  assert.equal(accountAgents.outputMode, 'truth-fetch-result');
  assert.deepEqual(accountAgents.result, {
    truthFetchResult: {
      items: [{ registrationId: 'areg-1' }],
    },
  });
  assert.deepEqual(accountBindings.result, {
    truthFetchResult: {
      items: [{ bindingId: 'binding-1' }],
    },
  });
  assert.deepEqual(accountRecords.result, {
    truthFetchResult: {
      items: [{ accountId: 'acct-1' }],
    },
  });
});

test('dispatchMcpToolCall routes governance truth-fetch presence and authority tools through admin-session SDK reads', async () => {
  const calls: Array<{ helper: string; registrationId: string }> = [];

  const result = await Promise.all([
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'agent-presence-read',
        arguments: {
          registrationId: 'areg-22',
        },
      },
      {
        createExecutionClient: () => ({
          async getAgentPresence(registrationId: string) {
            calls.push({ helper: 'getAgentPresence', registrationId });
            return {
              registrationId,
              status: 'online',
            };
          },
          async getAgentAuthority(registrationId: string) {
            calls.push({ helper: 'getAgentAuthority', registrationId });
            return {
              registrationId,
              permissions: ['governance:read'],
            };
          },
        }) as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'agent-authority-read',
        arguments: {
          registrationId: 'areg-33',
        },
      },
      {
        createExecutionClient: () => ({
          async getAgentPresence(registrationId: string) {
            calls.push({ helper: 'getAgentPresence', registrationId });
            return {
              registrationId,
              status: 'online',
            };
          },
          async getAgentAuthority(registrationId: string) {
            calls.push({ helper: 'getAgentAuthority', registrationId });
            return {
              registrationId,
              permissions: ['governance:read'],
            };
          },
        }) as never,
      },
    ),
  ]);

  assert.deepEqual(calls, [
    { helper: 'getAgentPresence', registrationId: 'areg-22' },
    { helper: 'getAgentAuthority', registrationId: 'areg-33' },
  ]);
  assert.deepEqual(result[0]?.result, {
    truthFetchResult: {
      registrationId: 'areg-22',
      status: 'online',
    },
  });
  assert.deepEqual(result[1]?.result, {
    truthFetchResult: {
      registrationId: 'areg-33',
      permissions: ['governance:read'],
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
