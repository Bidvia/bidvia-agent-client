import type { BidviaClient } from './client.js';
import type {
  BidviaConnectionApprovalScenarioPlanInput,
  BidviaMcpToolCallRequest,
  BidviaMcpToolCallResponse,
  BidviaMcpToolDescriptor,
} from './contracts.js';
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
import {
  buildLocalMcpProductizationSnapshot as buildSharedLocalMcpProductizationSnapshot,
  buildLocalMcpToolCatalog,
  getLocalMcpToolDescriptor,
} from './discovery-catalog.js';
import {
  buildMcpExecutionPreflight,
  buildMcpMissingContextMessage,
} from './operator-ergonomics.js';
import type { BidviaLocalMcpProductizationSnapshot } from './discovery-catalog.js';
import type { BidviaOpportunityPackageHandoffPlanInput } from './handoffs.js';
import type { BidviaIndustryUniverseScenarioPlanInput } from './universe.js';

function cloneMcpToolCatalog(catalog: ReadonlyArray<BidviaMcpToolDescriptor>): BidviaMcpToolDescriptor[] {
  return structuredClone([...catalog]);
}

export const bidviaMcpTools: ReadonlyArray<BidviaMcpToolDescriptor> = buildLocalMcpToolCatalog();

export function getMcpToolDescriptor(toolName: string): BidviaMcpToolDescriptor | undefined {
  return getLocalMcpToolDescriptor(toolName);
}

export function exportMcpToolCatalog(): BidviaMcpToolDescriptor[] {
  return cloneMcpToolCatalog(bidviaMcpTools);
}

export function buildLocalMcpProductizationSnapshot(): BidviaLocalMcpProductizationSnapshot {
  return buildSharedLocalMcpProductizationSnapshot();
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

  const client = dependencies.createExecutionClient();
  const preflight = buildMcpExecutionPreflight(descriptor, client);
  if (preflight && preflight.missingContext.length > 0) {
    throw new Error(buildMcpMissingContextMessage(descriptor.toolName, preflight.missingContext));
  }

  const executionResult = await adapter.run(client, input);

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    preflight,
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
    throw new Error('agentRegistrationId is required for principal-governed agent reads');
  }

  const registrationId =
    ('agentRegistrationId' in input && typeof input.agentRegistrationId === 'string'
      ? input.agentRegistrationId
      : undefined) ??
    ('registrationId' in input && typeof input.registrationId === 'string'
      ? input.registrationId
      : undefined);

  if (!registrationId) {
    throw new Error('agentRegistrationId is required for principal-governed agent reads');
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
