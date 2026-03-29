import type { BidviaClient } from './client.js';
import type {
  BidviaConnectionApprovalScenarioPlanInput,
  BidviaMcpToolCallRequest,
  BidviaMcpToolCallResponse,
  BidviaMcpToolDescriptor,
} from './contracts.js';
import { getRouteCapability } from './capabilities.js';
import {
  connectionApprovalScenarioAdapter,
  industryUniverseScenarioAdapter,
  opportunityPackageHandoffAdapter,
  registeredAgentExecutionAdapters,
} from './adapters.js';
import type {
  BidviaConnectionApprovalAdapterResult,
  BidviaExecutionAdapter,
  BidviaIndustryUniverseAdapterResult,
  BidviaOpportunityPackageHandoffAdapterResult,
} from './adapters.js';
import type { BidviaOpportunityPackageHandoffPlanInput } from './handoffs.js';
import type { BidviaIndustryUniverseScenarioPlanInput } from './universe.js';

function cloneMcpToolCatalog(catalog: ReadonlyArray<BidviaMcpToolDescriptor>): BidviaMcpToolDescriptor[] {
  return structuredClone([...catalog]);
}

function createMcpToolDescriptor(params: {
  toolName: string;
  description: string;
  inputSchemaKey: string;
  outputMode: BidviaMcpToolDescriptor['outputMode'];
  helperKey: string;
  capabilityKey?: string;
}): BidviaMcpToolDescriptor {
  const capability = getRouteCapability(params.capabilityKey ?? params.helperKey);
  if (!capability) {
    throw new Error(`missing MCP capability metadata for ${params.toolName}`);
  }

  return {
    toolName: params.toolName,
    description: params.description,
    inputSchemaRef: {
      schemaKey: params.inputSchemaKey,
    },
    outputMode: params.outputMode,
    helperRef: {
      helperKey: params.helperKey,
      capabilityKey: params.capabilityKey,
    },
    localCapabilityTier: capability.localCapabilityTier,
    localCapabilityRiskTier: capability.localCapabilityRiskTier,
    accessContextFamily: capability.accessContextFamily,
    requiredContext: [...capability.requiredContext],
  };
}

export const bidviaMcpTools: ReadonlyArray<BidviaMcpToolDescriptor> = [
  createMcpToolDescriptor({
    toolName: 'industry-universe-plan-preview',
    description: 'Previews the bounded industry universe scenario plan payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'industry-universe-review-packet-preview',
    description: 'Previews the bounded industry universe review packet payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'industry-universe-review-packet-export',
    description: 'Exports the bounded industry universe review packet payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'connection-approval-plan-preview',
    description: 'Previews the bounded connection approval scenario plan payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'connection-approval-review-packet-preview',
    description: 'Previews the bounded connection approval review packet payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'connection-approval-review-packet-export',
    description: 'Exports the bounded connection approval review packet payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'opportunity-package-handoff-plan-preview',
    description: 'Previews the bounded opportunity package handoff scenario plan payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'opportunity-package-handoff-review-packet-preview',
    description: 'Previews the bounded opportunity package handoff review packet payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'opportunity-package-handoff-review-packet-export',
    description: 'Exports the bounded opportunity package handoff review packet payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  }),
  createMcpToolDescriptor({
    toolName: 'account-agents-read',
    description: 'Reads the current governed account agent records through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountAgents',
    capabilityKey: 'listAccountAgents',
  }),
  createMcpToolDescriptor({
    toolName: 'account-agent-bindings-read',
    description: 'Reads the current governed account agent bindings through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountAgentBindings',
    capabilityKey: 'listAccountAgentBindings',
  }),
  createMcpToolDescriptor({
    toolName: 'account-records-read',
    description: 'Reads the current governed account records through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountRecords',
    capabilityKey: 'listAccountRecords',
  }),
  createMcpToolDescriptor({
    toolName: 'agent-presence-read',
    description: 'Reads the current governed agent presence through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentPresence',
    capabilityKey: 'getAgentPresence',
  }),
  createMcpToolDescriptor({
    toolName: 'agent-authority-read',
    description: 'Reads the current governed agent authority through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentAuthority',
    capabilityKey: 'getAgentAuthority',
  }),
  createMcpToolDescriptor({
    toolName: 'canonical-semantic-concepts-read',
    description: 'Reads the current business canonical semantic concepts through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listCanonicalSemanticConcepts',
    capabilityKey: 'listCanonicalSemanticConcepts',
  }),
  createMcpToolDescriptor({
    toolName: 'canonical-semantic-concept-read',
    description: 'Reads the current business canonical semantic concept through the shipped SDK helper.',
    inputSchemaKey: 'BidviaCanonicalSemanticConceptIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getCanonicalSemanticConcept',
    capabilityKey: 'getCanonicalSemanticConcept',
  }),
  createMcpToolDescriptor({
    toolName: 'pricing-bases-read',
    description: 'Reads the current business pricing bases through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listPricingBases',
    capabilityKey: 'listPricingBases',
  }),
  createMcpToolDescriptor({
    toolName: 'pricing-basis-read',
    description: 'Reads the current business pricing basis through the shipped SDK helper.',
    inputSchemaKey: 'BidviaPricingBasisIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getPricingBasis',
    capabilityKey: 'getPricingBasis',
  }),
  createMcpToolDescriptor({
    toolName: 'document-artifacts-read',
    description: 'Reads the current business document artifacts through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listDocumentArtifacts',
    capabilityKey: 'listDocumentArtifacts',
  }),
  createMcpToolDescriptor({
    toolName: 'document-artifact-read',
    description: 'Reads the current business document artifact through the shipped SDK helper.',
    inputSchemaKey: 'BidviaDocumentArtifactIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getDocumentArtifact',
    capabilityKey: 'getDocumentArtifact',
  }),
  createMcpToolDescriptor({
    toolName: 'media-assets-read',
    description: 'Reads the current business media assets through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listMediaAssets',
    capabilityKey: 'listMediaAssets',
  }),
  createMcpToolDescriptor({
    toolName: 'media-asset-read',
    description: 'Reads the current business media asset through the shipped SDK helper.',
    inputSchemaKey: 'BidviaMediaAssetIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getMediaAsset',
    capabilityKey: 'getMediaAsset',
  }),
  createMcpToolDescriptor({
    toolName: 'evidence-assets-read',
    description: 'Reads the current business evidence assets through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listEvidenceAssets',
    capabilityKey: 'listEvidenceAssets',
  }),
  createMcpToolDescriptor({
    toolName: 'evidence-asset-read',
    description: 'Reads the current business evidence asset through the shipped SDK helper.',
    inputSchemaKey: 'BidviaEvidenceAssetIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getEvidenceAsset',
    capabilityKey: 'getEvidenceAsset',
  }),
  createMcpToolDescriptor({
    toolName: 'attachment-bindings-read',
    description: 'Reads the current business attachment bindings through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAttachmentBindings',
    capabilityKey: 'listAttachmentBindings',
  }),
  createMcpToolDescriptor({
    toolName: 'attachment-binding-read',
    description: 'Reads the current business attachment binding through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAttachmentBindingIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAttachmentBinding',
    capabilityKey: 'getAttachmentBinding',
  }),
  createMcpToolDescriptor({
    toolName: registeredAgentExecutionAdapters.heartbeat.name,
    description: 'Executes the real remote heartbeat over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaHeartbeatInput',
    outputMode: 'execution-result',
    helperKey: registeredAgentExecutionAdapters.heartbeat.name,
    capabilityKey: registeredAgentExecutionAdapters.heartbeat.capabilityKey,
  }),
  createMcpToolDescriptor({
    toolName: registeredAgentExecutionAdapters['sync-upload'].name,
    description: 'Executes the real remote sync upload over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaSyncUploadInput',
    outputMode: 'execution-result',
    helperKey: registeredAgentExecutionAdapters['sync-upload'].name,
    capabilityKey: registeredAgentExecutionAdapters['sync-upload'].capabilityKey,
  }),
  createMcpToolDescriptor({
    toolName: registeredAgentExecutionAdapters.evidence.name,
    description: 'Executes the real remote evidence submission over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaEvidenceSubmissionInput',
    outputMode: 'execution-result',
    helperKey: registeredAgentExecutionAdapters.evidence.name,
    capabilityKey: registeredAgentExecutionAdapters.evidence.capabilityKey,
  }),
  createMcpToolDescriptor({
    toolName: registeredAgentExecutionAdapters.proposal.name,
    description: 'Executes the real remote proposal submission over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaProposalSubmissionInput',
    outputMode: 'execution-result',
    helperKey: registeredAgentExecutionAdapters.proposal.name,
    capabilityKey: registeredAgentExecutionAdapters.proposal.capabilityKey,
  }),
];

export function getMcpToolDescriptor(toolName: string): BidviaMcpToolDescriptor | undefined {
  return bidviaMcpTools.find((tool) => tool.toolName === toolName);
}

export function exportMcpToolCatalog(): BidviaMcpToolDescriptor[] {
  return cloneMcpToolCatalog(bidviaMcpTools);
}

type BidviaMcpDispatchResult = {
  scenarioPlan?: unknown;
  reviewPacket?: unknown;
  exportedReviewPacket?: unknown;
  truthFetchResult?: unknown;
  executionResult?: unknown;
};

type BidviaMcpDispatchDependencies = {
  createExecutionClient?: () => BidviaClient;
};

function createReviewSafeDispatchClient(): BidviaClient {
  return {} as BidviaClient;
}

function dispatchIndustryUniverseTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
): BidviaMcpToolCallResponse<BidviaMcpDispatchResult> {
  const result = industryUniverseScenarioAdapter.run(
    createReviewSafeDispatchClient(),
    input as BidviaIndustryUniverseScenarioPlanInput,
  ) as BidviaIndustryUniverseAdapterResult;

  if (descriptor.outputMode === 'plan-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
      },
    };
  }

  if (descriptor.outputMode === 'review-packet-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
        reviewPacket: result.reviewPacket,
      },
    };
  }

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    result: {
      scenarioPlan: result.scenarioPlan,
      exportedReviewPacket: result.exportedReviewPacket,
    },
  };
}

function dispatchConnectionApprovalTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
): BidviaMcpToolCallResponse<BidviaMcpDispatchResult> {
  const result = connectionApprovalScenarioAdapter.run(
    createReviewSafeDispatchClient(),
    input as BidviaConnectionApprovalScenarioPlanInput,
  ) as BidviaConnectionApprovalAdapterResult;

  if (descriptor.outputMode === 'plan-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
      },
    };
  }

  if (descriptor.outputMode === 'review-packet-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
        reviewPacket: result.reviewPacket,
      },
    };
  }

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    result: {
      scenarioPlan: result.scenarioPlan,
      exportedReviewPacket: result.exportedReviewPacket,
    },
  };
}

function dispatchOpportunityPackageHandoffTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
): BidviaMcpToolCallResponse<BidviaMcpDispatchResult> {
  const result = opportunityPackageHandoffAdapter.run(
    createReviewSafeDispatchClient(),
    input as BidviaOpportunityPackageHandoffPlanInput,
  ) as BidviaOpportunityPackageHandoffAdapterResult;

  if (descriptor.outputMode === 'plan-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
      },
    };
  }

  if (descriptor.outputMode === 'review-packet-preview') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        scenarioPlan: result.scenarioPlan,
        reviewPacket: result.reviewPacket,
      },
    };
  }

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    result: {
      scenarioPlan: result.scenarioPlan,
      exportedReviewPacket: result.exportedReviewPacket,
    },
  };
}

const registeredAgentExecutionAdaptersByName = Object.fromEntries(
  Object.values(registeredAgentExecutionAdapters).map((adapter) => [adapter.name, adapter]),
) as Record<string, BidviaExecutionAdapter<unknown, unknown>>;

function getRegisteredAgentExecutionAdapter(
  helperKey: string,
): BidviaExecutionAdapter<unknown, unknown> | undefined {
  return registeredAgentExecutionAdaptersByName[helperKey];
}

async function dispatchRegisteredAgentExecutionTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
  dependencies: BidviaMcpDispatchDependencies,
): Promise<BidviaMcpToolCallResponse<BidviaMcpDispatchResult>> {
  const adapter = getRegisteredAgentExecutionAdapter(descriptor.helperRef.helperKey);
  if (!adapter) {
    throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
  }

  if (!dependencies.createExecutionClient) {
    throw new Error(`MCP tool ${descriptor.toolName} requires a local execution client factory`);
  }

  const executionResult = await adapter.run(dependencies.createExecutionClient(), input);

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    result: {
      executionResult,
    },
  };
}

function requireDispatchExecutionClient(
  descriptor: BidviaMcpToolDescriptor,
  dependencies: BidviaMcpDispatchDependencies,
): BidviaClient {
  if (!dependencies.createExecutionClient) {
    throw new Error(`MCP tool ${descriptor.toolName} requires a local execution client factory`);
  }

  return dependencies.createExecutionClient();
}

function requireAgentRegistrationId(input: unknown): string {
  if (typeof input !== 'object' || input === null) {
    throw new Error('agentRegistrationId is required for governance agent reads');
  }

  const registrationId =
    ('agentRegistrationId' in input && typeof input.agentRegistrationId === 'string'
      ? input.agentRegistrationId
      : undefined) ??
    ('registrationId' in input && typeof input.registrationId === 'string'
      ? input.registrationId
      : undefined);

  if (!registrationId) {
    throw new Error('agentRegistrationId is required for governance agent reads');
  }

  return registrationId;
}

function requireStringInput(input: unknown, fieldName: string, errorMessage: string): string {
  if (typeof input !== 'object' || input === null) {
    throw new Error(errorMessage);
  }

  const value = fieldName in input && typeof input[fieldName as keyof typeof input] === 'string'
    ? input[fieldName as keyof typeof input]
    : undefined;

  if (!value) {
    throw new Error(errorMessage);
  }

  return value;
}

async function dispatchGovernanceTruthFetchTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
  dependencies: BidviaMcpDispatchDependencies,
): Promise<BidviaMcpToolCallResponse<BidviaMcpDispatchResult>> {
  const client = requireDispatchExecutionClient(descriptor, dependencies);

  if (descriptor.helperRef.helperKey === 'listAccountAgents') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAccountAgents(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAccountAgentBindings') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAccountAgentBindings(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAccountRecords') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAccountRecords(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listCanonicalSemanticConcepts') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listCanonicalSemanticConcepts(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getCanonicalSemanticConcept') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getCanonicalSemanticConcept(
          requireStringInput(
            input,
            'canonicalSemanticConceptId',
            'canonicalSemanticConceptId is required for business canonical semantic concept reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listPricingBases') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listPricingBases(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getPricingBasis') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getPricingBasis(
          requireStringInput(input, 'pricingBasisId', 'pricingBasisId is required for business pricing basis reads'),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listDocumentArtifacts') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listDocumentArtifacts(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getDocumentArtifact') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getDocumentArtifact(
          requireStringInput(
            input,
            'documentArtifactId',
            'documentArtifactId is required for business document artifact reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listMediaAssets') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listMediaAssets(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getMediaAsset') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getMediaAsset(
          requireStringInput(input, 'mediaAssetId', 'mediaAssetId is required for business media asset reads'),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listEvidenceAssets') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listEvidenceAssets(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getEvidenceAsset') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getEvidenceAsset(
          requireStringInput(
            input,
            'evidenceAssetId',
            'evidenceAssetId is required for business evidence asset reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAttachmentBindings') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAttachmentBindings(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAttachmentBinding') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAttachmentBinding(
          requireStringInput(
            input,
            'attachmentBindingId',
            'attachmentBindingId is required for business attachment binding reads',
          ),
        ),
      },
    };
  }

  const registrationId = requireAgentRegistrationId(input);

  if (descriptor.helperRef.helperKey === 'getAgentPresence') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentPresence(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthority') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentAuthority(registrationId),
      },
    };
  }

  throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
}

export async function dispatchMcpToolCall(
  request: BidviaMcpToolCallRequest,
  dependencies: BidviaMcpDispatchDependencies = {},
): Promise<BidviaMcpToolCallResponse<BidviaMcpDispatchResult>> {
  const descriptor = getMcpToolDescriptor(request.toolName);
  if (!descriptor) {
    throw new Error(`unknown MCP tool: ${request.toolName}`);
  }

  if (descriptor.helperRef.helperKey === 'buildIndustryUniverseScenarioPlan') {
    return dispatchIndustryUniverseTool(descriptor, request.arguments);
  }

  if (descriptor.helperRef.helperKey === 'buildConnectionApprovalScenarioPlan') {
    return dispatchConnectionApprovalTool(descriptor, request.arguments);
  }

  if (descriptor.helperRef.helperKey === 'buildOpportunityPackageHandoffPlan') {
    return dispatchOpportunityPackageHandoffTool(descriptor, request.arguments);
  }

  if (descriptor.outputMode === 'truth-fetch-result') {
    return dispatchGovernanceTruthFetchTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.outputMode === 'execution-result') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
}
