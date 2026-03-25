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
} from './adapters.js';
import type {
  BidviaConnectionApprovalAdapterResult,
  BidviaIndustryUniverseAdapterResult,
  BidviaOpportunityPackageHandoffAdapterResult,
} from './adapters.js';
import type { BidviaOpportunityPackageHandoffPlanInput } from './handoffs.js';
import type { BidviaIndustryUniverseScenarioPlanInput } from './universe.js';

function cloneMcpToolCatalog(catalog: ReadonlyArray<BidviaMcpToolDescriptor>): BidviaMcpToolDescriptor[] {
  return structuredClone([...catalog]);
}

export const bidviaMcpTools: ReadonlyArray<BidviaMcpToolDescriptor> = [
  {
    toolName: 'industry-universe-plan-preview',
    description: 'Previews the bounded industry universe scenario plan payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    },
    outputMode: 'plan-preview',
    helperRef: {
      helperKey: 'buildIndustryUniverseScenarioPlan',
      capabilityKey: 'buildIndustryUniverseScenarioPlan',
    },
  },
  {
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
  },
  {
    toolName: 'industry-universe-review-packet-export',
    description: 'Exports the bounded industry universe review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    },
    outputMode: 'review-packet-export',
    helperRef: {
      helperKey: 'buildIndustryUniverseScenarioPlan',
      capabilityKey: 'buildIndustryUniverseScenarioPlan',
    },
  },
  {
    toolName: 'connection-approval-plan-preview',
    description: 'Previews the bounded connection approval scenario plan payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    },
    outputMode: 'plan-preview',
    helperRef: {
      helperKey: 'buildConnectionApprovalScenarioPlan',
      capabilityKey: 'buildConnectionApprovalScenarioPlan',
    },
  },
  {
    toolName: 'connection-approval-review-packet-preview',
    description: 'Previews the bounded connection approval review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    },
    outputMode: 'review-packet-preview',
    helperRef: {
      helperKey: 'buildConnectionApprovalScenarioPlan',
      capabilityKey: 'buildConnectionApprovalScenarioPlan',
    },
  },
  {
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
  },
  {
    toolName: 'opportunity-package-handoff-plan-preview',
    description: 'Previews the bounded opportunity package handoff scenario plan payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    },
    outputMode: 'plan-preview',
    helperRef: {
      helperKey: 'buildOpportunityPackageHandoffPlan',
      capabilityKey: 'buildOpportunityPackageHandoffPlan',
    },
  },
  {
    toolName: 'opportunity-package-handoff-review-packet-preview',
    description: 'Previews the bounded opportunity package handoff review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    },
    outputMode: 'review-packet-preview',
    helperRef: {
      helperKey: 'buildOpportunityPackageHandoffPlan',
      capabilityKey: 'buildOpportunityPackageHandoffPlan',
    },
  },
  {
    toolName: 'opportunity-package-handoff-review-packet-export',
    description: 'Exports the bounded opportunity package handoff review packet payload.',
    inputSchemaRef: {
      schemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    },
    outputMode: 'review-packet-export',
    helperRef: {
      helperKey: 'buildOpportunityPackageHandoffPlan',
      capabilityKey: 'buildOpportunityPackageHandoffPlan',
    },
  },
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
};

function createLocalDispatchClient(): BidviaClient {
  return {} as BidviaClient;
}

function dispatchIndustryUniverseTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
): BidviaMcpToolCallResponse<BidviaMcpDispatchResult> {
  const result = industryUniverseScenarioAdapter.run(
    createLocalDispatchClient(),
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
    createLocalDispatchClient(),
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
    createLocalDispatchClient(),
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

export function dispatchMcpToolCall(
  request: BidviaMcpToolCallRequest,
): BidviaMcpToolCallResponse<BidviaMcpDispatchResult> {
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

  throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
}
