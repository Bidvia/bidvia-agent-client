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
import type { BidviaClientContext } from './contracts.js';
import {
  buildBidviaSurfaceRuntimeIdentityContext,
  runBidviaSurfaceCapability,
} from './runtime/surface-runtime.js';

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
  localAccumulationPath?: string;
  now?: () => string;
};

function extractExecutionClientContext(client: unknown): Partial<BidviaClientContext> | undefined {
  return typeof client === 'object'
    && client !== null
    && 'options' in client
    && typeof client.options === 'object'
    && client.options !== null
    && 'context' in client.options
    && typeof client.options.context === 'object'
    && client.options.context !== null
    ? client.options.context as Partial<BidviaClientContext>
    : undefined;
}

function buildRuntimeExecutionIdentity(
  preflight: ReturnType<typeof buildMcpExecutionPreflight>,
  client: unknown,
): Partial<BidviaClientContext> {
  const clientContext = extractExecutionClientContext(client);

  if (clientContext) {
    return clientContext;
  }

  const fallbackIdentity: Partial<BidviaClientContext> = {};

  for (const contextKey of preflight?.requiredContext ?? []) {
    fallbackIdentity[contextKey] = 'available-via-local-client-seam';
  }

  return fallbackIdentity;
}

type BidviaGenericExecutionDispatch = (client: BidviaClient, input: unknown) => Promise<unknown>;

function createReviewSafeDispatchClient(): BidviaClient {
  return {} as BidviaClient;
}

function requireObjectInput(input: unknown, errorMessage: string): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new Error(errorMessage);
  }

  return input as Record<string, unknown>;
}

function buildExecutionPayload(
  input: unknown,
  fieldNamesToStrip: readonly string[],
  errorMessage: string,
): Record<string, unknown> {
  const objectInput = requireObjectInput(input, errorMessage);
  const payload = { ...objectInput };

  for (const fieldName of fieldNamesToStrip) {
    delete payload[fieldName];
  }

  return payload;
}

function requireExecutionStringInput(
  input: unknown,
  fieldNames: readonly string[],
  errorMessage: string,
): string {
  const objectInput = requireObjectInput(input, errorMessage);

  for (const fieldName of fieldNames) {
    if (typeof objectInput[fieldName] === 'string' && objectInput[fieldName]) {
      return objectInput[fieldName] as string;
    }
  }

  throw new Error(errorMessage);
}

const widenedExecutionDispatchersByCapabilityKey: Record<string, BidviaGenericExecutionDispatch> = {
  createProvisionalAgent(client, input) {
    return client.createProvisionalAgent(
      requireObjectInput(input, 'createProvisionalAgent input is required for MCP execution') as never,
    );
  },
  claimProvisionalAgent(client, input) {
    return client.claimProvisionalAgent(
      requireObjectInput(input, 'claimProvisionalAgent input is required for MCP execution') as never,
    );
  },
  downloadSync(client) {
    return client.downloadSync();
  },
  createParticipationState(client, input) {
    return client.createParticipationState(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed participation execution',
      ) as never,
    );
  },
  createLease(client, input) {
    return client.createLease(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed lease execution',
      ) as never,
    );
  },
  createTaskDispatch(client, input) {
    return client.createTaskDispatch(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed task dispatch execution',
      ) as never,
    );
  },
  assignTaskDispatch(client, input) {
    return client.assignTaskDispatch(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch assignment execution',
      ),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentRegistrationId and taskDispatchId are required for governed task dispatch assignment execution',
      ) as never,
    );
  },
  suspendTaskDispatch(client, input) {
    return client.suspendTaskDispatch(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch suspension execution',
      ),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentRegistrationId and taskDispatchId are required for governed task dispatch suspension execution',
      ) as never,
    );
  },
  resumeTaskDispatch(client, input) {
    return client.resumeTaskDispatch(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch resume execution',
      ),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentRegistrationId and taskDispatchId are required for governed task dispatch resume execution',
      ) as never,
    );
  },
  completeTaskDispatch(client, input) {
    return client.completeTaskDispatch(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch completion execution',
      ),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentRegistrationId and taskDispatchId are required for governed task dispatch completion execution',
      ) as never,
    );
  },
  failTaskDispatch(client, input) {
    return client.failTaskDispatch(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch failure execution',
      ),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentRegistrationId and taskDispatchId are required for governed task dispatch failure execution',
      ) as never,
    );
  },
  createClaim(client, input) {
    return client.createClaim(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed claim execution',
      ) as never,
    );
  },
  acceptClaim(client, input) {
    return client.acceptClaim(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(input, ['claimId'], 'claimId is required for governed claim acceptance execution'),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'claimId'],
        'agentRegistrationId and claimId are required for governed claim acceptance execution',
      ) as never,
    );
  },
  rejectClaim(client, input) {
    return client.rejectClaim(
      requireAgentRegistrationId(input),
      requireExecutionStringInput(input, ['claimId'], 'claimId is required for governed claim rejection execution'),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId', 'claimId'],
        'agentRegistrationId and claimId are required for governed claim rejection execution',
      ) as never,
    );
  },
  postAgentAuthorityProfile(client, input) {
    return client.postAgentAuthorityProfile(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed authority profile execution',
      ) as never,
    );
  },
  postAgentAuthorityLadder(client, input) {
    return client.postAgentAuthorityLadder(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed authority ladder execution',
      ) as never,
    );
  },
  postAgentCapabilityProfile(client, input) {
    return client.postAgentCapabilityProfile(
      requireAgentRegistrationId(input),
      buildExecutionPayload(
        input,
        ['agentRegistrationId', 'registrationId'],
        'agentRegistrationId is required for governed capability profile execution',
      ) as never,
    );
  },
  createCommercialAction(client, input) {
    return client.createCommercialAction(
      requireObjectInput(input, 'createCommercialAction input is required for MCP execution') as never,
    );
  },
  requestCommercialActionApproval(client, input) {
    return client.requestCommercialActionApproval(
      requireObjectInput(input, 'requestCommercialActionApproval input is required for MCP execution') as never,
    );
  },
  executeCommercialAction(client, input) {
    return client.executeCommercialAction(
      requireObjectInput(input, 'executeCommercialAction input is required for MCP execution') as never,
    );
  },
};

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
  if (!dependencies.createExecutionClient) {
    throw new Error(`MCP tool ${descriptor.toolName} requires a local execution client factory`);
  }

  const client = dependencies.createExecutionClient();
  const preflight = buildMcpExecutionPreflight(descriptor, client);
  if (preflight && preflight.missingContext.length > 0) {
    throw new Error(buildMcpMissingContextMessage(descriptor.toolName, preflight.missingContext));
  }

  const adapter = getRegisteredAgentExecutionAdapter(descriptor.helperRef.helperKey);
  const directDispatcher = descriptor.helperRef.capabilityKey === undefined
    ? undefined
    : widenedExecutionDispatchersByCapabilityKey[descriptor.helperRef.capabilityKey];

  if (!adapter && !directDispatcher) {
    throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
  }

  const helperKey = descriptor.helperRef.capabilityKey ?? descriptor.helperRef.helperKey;
  const executionContext = buildRuntimeExecutionIdentity(preflight, client);
  const executionResult = await runBidviaSurfaceCapability({
    transport: 'mcp',
    helperKey,
    capabilityKey: helperKey,
    identity: buildBidviaSurfaceRuntimeIdentityContext(executionContext),
    input,
    createClient: () => client,
    execute: async (runtimeClient) => adapter
      ? adapter.run(runtimeClient, input)
      : directDispatcher!(runtimeClient, input),
    now: dependencies.now ?? (() => new Date().toISOString()),
    accumulation: dependencies.localAccumulationPath
      ? { path: dependencies.localAccumulationPath }
      : undefined,
  });

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

  if (descriptor.helperRef.helperKey === 'queryProvisionalAgent') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.queryProvisionalAgent(
          requireStringInput(
            input,
            'provisionalAgentRef',
            'provisionalAgentRef is required for provisional agent reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAgentRegistrations') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAgentRegistrations(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAuthorityProfiles') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAuthorityProfiles(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listCapabilityProfiles') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listCapabilityProfiles(),
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

  if (descriptor.helperRef.helperKey === 'getAgentReadiness') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentReadiness(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentSummary') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentSummary(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentRegistration') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentRegistration(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthorityProfile') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentAuthorityProfile(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthorityLadder') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentAuthorityLadder(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentCapabilityProfile') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentCapabilityProfile(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listParticipationStates') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listParticipationStates(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getParticipationState') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getParticipationState(
          registrationId,
          requireStringInput(
            input,
            'participationStateId',
            'participationStateId is required for participation state reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listTaskDispatches') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listTaskDispatches(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getTaskDispatch') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getTaskDispatch(
          registrationId,
          requireStringInput(
            input,
            'taskDispatchId',
            'taskDispatchId is required for task dispatch reads',
          ),
        ),
      },
    };
  }

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
