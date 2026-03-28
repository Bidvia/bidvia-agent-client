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

  if (descriptor.outputMode === 'execution-result') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
}
