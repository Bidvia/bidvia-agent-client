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

function withRuntimeResultCommit<T>(client: T): T & {
  commitRuntimeResult: () => Promise<{ outcomeRef: string }>;
} {
  return {
    ...(client as object),
    async commitRuntimeResult() {
      return {
        outcomeRef: 'outcome://test/runtime-commit',
      };
    },
  } as T & {
    commitRuntimeResult: () => Promise<{ outcomeRef: string }>;
  };
}

type BidviaMcpDescriptorWithContext = BidviaMcpToolDescriptor & {
  accessContextFamily: string;
  contextSemantic?: string;
  requiredContext: string[];
};

const expectedBidviaMcpToolNames = [
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
  'query-provisional-agent-read',
  'agent-readiness-read',
  'agent-summary-read',
  'agent-registrations-read',
  'agent-registration-read',
  'authority-profiles-read',
  'agent-authority-profile-read',
  'agent-authority-ladder-read',
  'capability-profiles-read',
  'agent-capability-profile-read',
  'participation-states-read',
  'participation-state-read',
  'task-dispatches-read',
  'task-dispatch-read',
  'create-provisional-agent-execution',
  'claim-provisional-agent-execution',
  'download-sync-execution',
  'create-participation-state-execution',
  'create-lease-execution',
  'create-task-dispatch-execution',
  'assign-task-dispatch-execution',
  'suspend-task-dispatch-execution',
  'resume-task-dispatch-execution',
  'complete-task-dispatch-execution',
  'fail-task-dispatch-execution',
  'create-claim-execution',
  'accept-claim-execution',
  'reject-claim-execution',
  'agent-authority-profile-write-execution',
  'agent-authority-ladder-write-execution',
  'agent-capability-profile-write-execution',
  'create-commercial-action-execution',
  'request-commercial-action-approval-execution',
  'execute-commercial-action-execution',
] as const;

const expectedBidviaReadToolNames = expectedBidviaMcpToolNames.filter((toolName) => toolName.endsWith('-read'));

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
  assert.deepEqual(bidviaMcpTools.map((tool) => tool.toolName), expectedBidviaMcpToolNames);

  assert.equal(bidviaMcpTools.some((tool) => tool.toolName === 'agent-readiness-read'), true);
  assert.equal(bidviaMcpTools.some((tool) => tool.toolName === 'agent-capability-profile-read'), true);
  assert.equal(bidviaMcpTools.some((tool) => tool.toolName === 'create-task-dispatch-execution'), true);
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

test('MCP provisional descriptors keep public create query semantics distinct from session-bound claim', () => {
  assert.deepEqual(getMcpToolDescriptor('query-provisional-agent-read') as BidviaMcpDescriptorWithContext, {
    toolName: 'query-provisional-agent-read',
    description: 'Reads public provisional agent status through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaQueryProvisionalAgentInput',
    },
    outputMode: 'truth-fetch-result',
    helperRef: {
      helperKey: 'queryProvisionalAgent',
      capabilityKey: 'queryProvisionalAgent',
    },
    localCapabilityTier: 'L0-observe-only',
    localCapabilityRiskTier: 'observe-only',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('create-provisional-agent-execution') as BidviaMcpDescriptorWithContext, {
    toolName: 'create-provisional-agent-execution',
    description: 'Executes public provisional agent creation through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaProvisionalAgentCreateInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'createProvisionalAgent',
      capabilityKey: 'createProvisionalAgent',
    },
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'tenant',
    contextSemantic: 'public-provisional',
    requiredContext: ['tenantId'],
  });

  assert.deepEqual(getMcpToolDescriptor('claim-provisional-agent-execution') as BidviaMcpDescriptorWithContext, {
    toolName: 'claim-provisional-agent-execution',
    description: 'Executes the session-bound provisional agent claim through the shipped SDK helper.',
    inputSchemaRef: {
      schemaKey: 'BidviaProvisionalAgentClaimInput',
    },
    outputMode: 'execution-result',
    helperRef: {
      helperKey: 'claimProvisionalAgent',
      capabilityKey: 'claimProvisionalAgent',
    },
    localCapabilityTier: 'L2-registration-runtime',
    localCapabilityRiskTier: 'runtime-execution',
    accessContextFamily: 'session',
    requiredContext: ['tenantId', 'sessionId'],
  });
});

test('dispatchMcpToolCall missing-context wording keeps public provisional create distinct from session-bound claim', async () => {
  await assert.rejects(
    () => dispatchMcpToolCallWithExecution(
      {
        toolName: 'create-provisional-agent-execution',
        arguments: {
          displayName: 'Operator Seed Agent',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {},
          },
          async createProvisionalAgent() {
            throw new Error('should not dispatch without required context');
          },
        }) as never,
      },
    ),
    {
      message: 'MCP tool create-provisional-agent-execution stays in public provisional entry, but this local stdio MCP tool still needs tenantId for deterministic execution against the configured API. Use bidvia route-context-matrix to confirm the next Bidvia context family, then set BIDVIA_TENANT_ID before retrying this local stdio MCP tool.',
    },
  );

  await assert.rejects(
    () => dispatchMcpToolCallWithExecution(
      {
        toolName: 'claim-provisional-agent-execution',
        arguments: {
          provisionalAgentRef: 'prov-claim-1',
          claimToken: 'claim-token-1',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {},
          },
          async claimProvisionalAgent() {
            throw new Error('should not dispatch without required context');
          },
        }) as never,
      },
    ),
    {
      message: 'MCP tool claim-provisional-agent-execution is the session-bound provisional claim step and needs tenantId, sessionId before retrying this local stdio MCP tool. Use bidvia route-context-matrix to confirm the next Bidvia context family, then set BIDVIA_TENANT_ID and BIDVIA_SESSION_ID before retrying this local stdio MCP tool.',
    },
  );
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

  assert.deepEqual(governanceToolNames, expectedBidviaReadToolNames);
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
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
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
    accessContextFamily: 'principal-governed-read',
    requiredContext: ['tenantId', 'principalId'],
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

test('dispatchMcpToolCall exposes widened Task 1 governance read descriptors in the MCP catalog', () => {
  assert.equal(getMcpToolDescriptor('agent-readiness-read')?.toolName, 'agent-readiness-read');
  assert.equal(getMcpToolDescriptor('agent-summary-read')?.toolName, 'agent-summary-read');
  assert.equal(getMcpToolDescriptor('agent-capability-profile-read')?.toolName, 'agent-capability-profile-read');
  assert.equal(getMcpToolDescriptor('task-dispatch-read')?.toolName, 'task-dispatch-read');
});

test('dispatchMcpToolCall routes widened Task 2 collection and onboarding read tools through shipped SDK helpers', async () => {
  const calls: Array<{ helper: string; input?: unknown }> = [];
  const client = {
    async queryProvisionalAgent(input: string) {
      calls.push({ helper: 'queryProvisionalAgent', input });
      return {
        provisionalAgentRef: input,
      };
    },
    async listAgentRegistrations() {
      calls.push({ helper: 'listAgentRegistrations' });
      return {
        items: [{ registrationId: 'areg-1' }],
      };
    },
    async listAuthorityProfiles() {
      calls.push({ helper: 'listAuthorityProfiles' });
      return {
        items: [{ authorityProfileId: 'authority-profile-1' }],
      };
    },
    async listCapabilityProfiles() {
      calls.push({ helper: 'listCapabilityProfiles' });
      return {
        items: [{ capabilityProfileId: 'capability-profile-1' }],
      };
    },
  };

  const results = await Promise.all([
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'query-provisional-agent-read',
        arguments: {
          provisionalAgentRef: 'prov-42',
        },
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'agent-registrations-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'authority-profiles-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'capability-profiles-read',
        arguments: {},
      },
      {
        createExecutionClient: () => client as never,
      },
    ),
  ]);

  assert.deepEqual(calls, [
    {
      helper: 'queryProvisionalAgent',
      input: 'prov-42',
    },
    { helper: 'listAgentRegistrations' },
    { helper: 'listAuthorityProfiles' },
    { helper: 'listCapabilityProfiles' },
  ]);
  assert.deepEqual(results.map((result) => result.result), [
    {
      truthFetchResult: {
        provisionalAgentRef: 'prov-42',
      },
    },
    {
      truthFetchResult: {
        items: [{ registrationId: 'areg-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ authorityProfileId: 'authority-profile-1' }],
      },
    },
    {
      truthFetchResult: {
        items: [{ capabilityProfileId: 'capability-profile-1' }],
      },
    },
  ]);
});

test('dispatchMcpToolCall routes widened Task 2 registration-bound read tools through shipped SDK helpers', async () => {
  const calls: Array<{ helper: string; registrationId: string; id?: string }> = [];
  const client = {
    async getAgentReadiness(registrationId: string) {
      calls.push({ helper: 'getAgentReadiness', registrationId });
      return {
        registrationId,
        readiness: 'ready',
      };
    },
    async getAgentSummary(registrationId: string) {
      calls.push({ helper: 'getAgentSummary', registrationId });
      return {
        registrationId,
        summary: 'ok',
      };
    },
    async getAgentRegistration(registrationId: string) {
      calls.push({ helper: 'getAgentRegistration', registrationId });
      return {
        registrationId,
      };
    },
    async getAgentAuthorityProfile(registrationId: string) {
      calls.push({ helper: 'getAgentAuthorityProfile', registrationId });
      return {
        registrationId,
        authorityProfileId: 'authority-profile-1',
      };
    },
    async getAgentAuthorityLadder(registrationId: string) {
      calls.push({ helper: 'getAgentAuthorityLadder', registrationId });
      return {
        registrationId,
        ladder: 'operator',
      };
    },
    async getAgentCapabilityProfile(registrationId: string) {
      calls.push({ helper: 'getAgentCapabilityProfile', registrationId });
      return {
        registrationId,
        capabilityProfileId: 'capability-profile-1',
      };
    },
    async listParticipationStates(registrationId: string) {
      calls.push({ helper: 'listParticipationStates', registrationId });
      return {
        items: [{ participationStateId: 'ps-1' }],
      };
    },
    async getParticipationState(registrationId: string, participationStateId: string) {
      calls.push({ helper: 'getParticipationState', registrationId, id: participationStateId });
      return {
        registrationId,
        participationStateId,
      };
    },
    async listTaskDispatches(registrationId: string) {
      calls.push({ helper: 'listTaskDispatches', registrationId });
      return {
        items: [{ taskDispatchId: 'td-1' }],
      };
    },
    async getTaskDispatch(registrationId: string, taskDispatchId: string) {
      calls.push({ helper: 'getTaskDispatch', registrationId, id: taskDispatchId });
      return {
        registrationId,
        taskDispatchId,
      };
    },
  };

  const results = await Promise.all([
    dispatchMcpToolCallWithExecution({ toolName: 'agent-readiness-read', arguments: { registrationId: 'areg-10' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'agent-summary-read', arguments: { registrationId: 'areg-11' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'agent-registration-read', arguments: { registrationId: 'areg-12' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'agent-authority-profile-read', arguments: { registrationId: 'areg-13' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'agent-authority-ladder-read', arguments: { registrationId: 'areg-14' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'agent-capability-profile-read', arguments: { registrationId: 'areg-15' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'participation-states-read', arguments: { registrationId: 'areg-16' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'participation-state-read', arguments: { registrationId: 'areg-17', participationStateId: 'ps-42' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'task-dispatches-read', arguments: { registrationId: 'areg-18' } }, { createExecutionClient: () => client as never }),
    dispatchMcpToolCallWithExecution({ toolName: 'task-dispatch-read', arguments: { registrationId: 'areg-19', taskDispatchId: 'td-42' } }, { createExecutionClient: () => client as never }),
  ]);

  assert.deepEqual(calls, [
    { helper: 'getAgentReadiness', registrationId: 'areg-10' },
    { helper: 'getAgentSummary', registrationId: 'areg-11' },
    { helper: 'getAgentRegistration', registrationId: 'areg-12' },
    { helper: 'getAgentAuthorityProfile', registrationId: 'areg-13' },
    { helper: 'getAgentAuthorityLadder', registrationId: 'areg-14' },
    { helper: 'getAgentCapabilityProfile', registrationId: 'areg-15' },
    { helper: 'listParticipationStates', registrationId: 'areg-16' },
    { helper: 'getParticipationState', registrationId: 'areg-17', id: 'ps-42' },
    { helper: 'listTaskDispatches', registrationId: 'areg-18' },
    { helper: 'getTaskDispatch', registrationId: 'areg-19', id: 'td-42' },
  ]);
  assert.deepEqual(results.map((result) => result.result), [
    { truthFetchResult: { registrationId: 'areg-10', readiness: 'ready' } },
    { truthFetchResult: { registrationId: 'areg-11', summary: 'ok' } },
    { truthFetchResult: { registrationId: 'areg-12' } },
    { truthFetchResult: { registrationId: 'areg-13', authorityProfileId: 'authority-profile-1' } },
    { truthFetchResult: { registrationId: 'areg-14', ladder: 'operator' } },
    { truthFetchResult: { registrationId: 'areg-15', capabilityProfileId: 'capability-profile-1' } },
    { truthFetchResult: { items: [{ participationStateId: 'ps-1' }] } },
    { truthFetchResult: { registrationId: 'areg-17', participationStateId: 'ps-42' } },
    { truthFetchResult: { items: [{ taskDispatchId: 'td-1' }] } },
    { truthFetchResult: { registrationId: 'areg-19', taskDispatchId: 'td-42' } },
  ]);
});

test('dispatchMcpToolCall reports principal-governed registration input requirements for agent reads', async () => {
  await assert.rejects(
    async () => dispatchMcpToolCallWithExecution(
      {
        toolName: 'agent-presence-read',
        arguments: {},
      },
      {
        createExecutionClient: () => ({}) as never,
      },
    ),
    /agentRegistrationId is required for principal-governed agent reads/,
  );
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
          async commitRuntimeResult() {
            return {
              outcomeRef: 'outcome://test/runtime-commit',
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

test('dispatchMcpToolCall routes widened Task 2 execution helpers through the shipped local client surface', async () => {
  const calls: Array<{ helper: string; input?: unknown }> = [];

  const results = await Promise.all([
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'create-provisional-agent-execution',
        arguments: {
          displayName: 'Operator Seed Agent',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {
              tenantId: 'tenant-a',
            },
          },
          async createProvisionalAgent(input: unknown) {
            calls.push({ helper: 'createProvisionalAgent', input });
            return {
              provisionalAgentRef: 'prov-1',
            };
          },
          async createCommercialAction(input: unknown) {
            calls.push({ helper: 'createCommercialAction', input });
            return {
              commercialActionId: 'commercial-action-1',
            };
          },
          async commitRuntimeResult() {
            return {
              outcomeRef: 'outcome://test/runtime-commit',
            };
          },
        }) as never,
      },
    ),
    dispatchMcpToolCallWithExecution(
      {
        toolName: 'create-commercial-action-execution',
        arguments: {
          commercialActionId: 'commercial-action-1',
        },
      },
      {
        createExecutionClient: () => ({
          options: {
            context: {
              tenantId: 'tenant-a',
              principalId: 'principal-a',
              companyId: 'company-a',
            },
          },
          async createProvisionalAgent(input: unknown) {
            calls.push({ helper: 'createProvisionalAgent', input });
            return {
              provisionalAgentRef: 'prov-1',
            };
          },
          async createCommercialAction(input: unknown) {
            calls.push({ helper: 'createCommercialAction', input });
            return {
              commercialActionId: 'commercial-action-1',
            };
          },
          async commitRuntimeResult() {
            return {
              outcomeRef: 'outcome://test/runtime-commit',
            };
          },
        }) as never,
      },
    ),
  ]);

  assert.deepEqual(
    [...calls].sort((left, right) => left.helper.localeCompare(right.helper)),
    [
      {
        helper: 'createCommercialAction',
        input: {
          commercialActionId: 'commercial-action-1',
        },
      },
      {
        helper: 'createProvisionalAgent',
        input: {
          displayName: 'Operator Seed Agent',
        },
      },
    ],
  );
  assert.deepEqual(results.map((result) => result.result), [
    {
      executionResult: {
        provisionalAgentRef: 'prov-1',
      },
    },
    {
      executionResult: {
        commercialActionId: 'commercial-action-1',
      },
    },
  ]);
});

test('dispatchMcpToolCall gives widened MCP execution tools precise missing-context remediation', async () => {
  await assert.rejects(
    () => dispatchMcpToolCallWithExecution(
      {
        toolName: 'create-commercial-action-execution',
        arguments: {
          commercialActionId: 'commercial-action-1',
        },
      },
      {
        createExecutionClient: () => withRuntimeResultCommit({
          options: {
            context: {
              tenantId: 'tenant-a',
            },
          },
        }) as never,
      },
    ),
    /MCP tool create-commercial-action-execution is missing required local execution context: principalId, companyId\. Use bidvia route-context-matrix to confirm the next Bidvia context family, then set BIDVIA_PRINCIPAL_ID and BIDVIA_COMPANY_ID before retrying this local stdio MCP tool\./,
  );
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

test('dispatchMcpToolCall routes governance truth-fetch presence and authority tools through principal-governed SDK reads', async () => {
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
