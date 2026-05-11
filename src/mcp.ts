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
  buildMcpPlaneBlockedMessage,
} from './operator-ergonomics.js';
import type { BidviaLocalMcpProductizationSnapshot } from './discovery-catalog.js';
import type { BidviaOpportunityPackageHandoffPlanInput } from './handoffs.js';
import {
  buildIndustryUniverseScenarioPlan,
  executeIndustryUniverseScenario,
} from './universe.js';
import type { BidviaIndustryUniverseScenarioPlanInput } from './universe.js';
import type { BidviaClientContext } from './contracts.js';
import {
  buildBidviaSurfaceRuntimeIdentityContext,
  runBidviaSurfaceCapability,
} from './runtime/surface-runtime.js';
import { isBlockedCapabilityExecutionError } from './runtime/capability-orchestration.js';
import {
  establishClaimantCanonicalCompanyPublicPrecondition,
  inspectClaimantHandoff,
  inspectClaimantPrecondition,
  inspectClaimantReadiness,
  repairClaimantReadiness,
  runClaimantTaskEntry,
} from './business-universe/claimant.js';
import {
  consumeOperatorHandoff,
  inspectOperatorCommercialAction,
  runOperatorApprovalContinuation,
  runOperatorCommercialAction,
  runOperatorConnectionContinuation,
  runOperatorMatching,
  runOperatorPackageExport,
} from './business-universe/operator.js';
import {
  inspectPlatformManagedEntry,
  inspectPlatformManagedReadiness,
  runPlatformManagedProgression,
} from './business-universe/platform-managed.js';
import { buildProductEvidenceEnvelope } from './business-universe/evidence.js';


function buildFallbackStageSnapshotFromDescriptor(descriptor: BidviaMcpToolDescriptor): import('./business-universe/contracts.js').BidviaStageSnapshot | undefined {
  if (!descriptor.role || !descriptor.stage || !descriptor.executability || !descriptor.canonicality) {
    return undefined;
  }

  return {
    roleWorkspace: {
      role: descriptor.role,
      sessionPresent: false,
      adminSessionPresent: false,
      canonicality: descriptor.canonicality,
    },
    stage: descriptor.stage,
    state: descriptor.executability === 'later-wave-stop' ? 'later-wave-stop' : 'completed',
    executability: descriptor.executability,
    action: {
      kind: descriptor.mayReadHere ? 'read' : 'continue',
      owner: descriptor.role,
      executability: descriptor.executability,
    },
    ...(descriptor.executability === 'later-wave-stop'
      ? {
          boundary: {
            boundaryClass: 'later-wave-stop',
            reasonCodes: ['product-evidence-fallback'],
          },
        }
      : {}),
  };
}

function buildMcpProductEvidence(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
  result: unknown,
): Pick<BidviaMcpDispatchResult, 'evidencePacket' | 'resultTaxonomy'> {
  const envelope = buildProductEvidenceEnvelope({
    command: descriptor.toolName,
    input,
    result,
    fallbackStageSnapshot: buildFallbackStageSnapshotFromDescriptor(descriptor),
  });
  return {
    evidencePacket: envelope.evidencePacket,
    resultTaxonomy: envelope.resultTaxonomy,
  };
}

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
  evidencePacket?: unknown;
  resultTaxonomy?: unknown;
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
  descriptor: BidviaMcpToolDescriptor,
  preflight: ReturnType<typeof buildMcpExecutionPreflight>,
  client: unknown,
): Partial<BidviaClientContext> {
  const clientContext = extractExecutionClientContext(client);

  if (clientContext) {
    if (descriptor.contextSemantic === 'public-provisional') {
      return {
        tenantId: clientContext.tenantId,
      };
    }

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
  establishClaimantCanonicalCompanyPublicPrecondition(client, input) {
    const objectInput = requireObjectInput(input, 'claimant canonical precondition input is required for MCP execution');
    return establishClaimantCanonicalCompanyPublicPrecondition(client, {
      invitationToken: typeof objectInput.invitationToken === 'string' ? objectInput.invitationToken : undefined,
      canonicalOrgId: typeof objectInput.canonicalOrgId === 'string' ? objectInput.canonicalOrgId : undefined,
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for claimant canonical precondition execution'),
    });
  },
  repairClaimantReadiness(client, input) {
    const objectInput = requireObjectInput(input, 'claimant readiness repair input is required for MCP execution');
    return repairClaimantReadiness(client, {
      agentId: requireAccountAgentId(objectInput),
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for claimant readiness repair execution'),
      ...(objectInput.capabilityProfile === undefined ? {} : { capabilityProfile: objectInput.capabilityProfile as any }),
      ...(objectInput.participationState === undefined ? {} : { participationState: objectInput.participationState as any }),
      ...(objectInput.externalBinding === undefined ? {} : { externalBinding: objectInput.externalBinding as any }),
    });
  },
  runClaimantTaskEntry(client, input) {
    const objectInput = requireObjectInput(input, 'claimant task entry input is required for MCP execution');
    return runClaimantTaskEntry(client, requireAccountAgentId(objectInput), {
      taskKind: requireExecutionStringInput(objectInput, ['taskKind'], 'taskKind is required for claimant task entry execution'),
      taskRef: requireExecutionStringInput(objectInput, ['taskRef'], 'taskRef is required for claimant task entry execution'),
      reason: requireExecutionStringInput(objectInput, ['reason'], 'reason is required for claimant task entry execution'),
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for claimant task entry execution'),
    });
  },
  runOperatorMatching(client, input) {
    const objectInput = requireObjectInput(input, 'operator matching input is required for MCP execution');
    return runOperatorMatching(client, {
      sourceListingId: requireExecutionStringInput(objectInput, ['sourceListingId'], 'sourceListingId is required for operator progression match'),
      candidateListing: requireObjectInput(objectInput.candidateListing, 'candidateListing is required for operator progression match') as never,
      candidateActivation: requireObjectInput(objectInput.candidateActivation, 'candidateActivation is required for operator progression match') as never,
      matchCandidates: requireObjectInput(objectInput.matchCandidates, 'matchCandidates is required for operator progression match') as never,
    });
  },
  runOperatorConnectionContinuation(client, input) {
    const objectInput = requireObjectInput(input, 'operator connection continuation input is required for MCP execution');
    const connection = {
      companyId: requireExecutionStringInput(objectInput, ['companyId'], 'companyId is required for operator progression connect'),
      sourceMatchId: requireExecutionStringInput(objectInput, ['sourceMatchId'], 'sourceMatchId is required for operator progression connect'),
      requesterActorId: requireExecutionStringInput(objectInput, ['requesterActorId'], 'requesterActorId is required for operator progression connect'),
      requesterCompanyId: requireExecutionStringInput(objectInput, ['requesterCompanyId'], 'requesterCompanyId is required for operator progression connect'),
      riskTier: requireExecutionStringInput(objectInput, ['riskTier'], 'riskTier is required for operator progression connect') as 'HIGH' | 'CRITICAL',
      policyVersion: requireExecutionStringInput(objectInput, ['policyVersion'], 'policyVersion is required for operator progression connect'),
      approvalMatrixVersion: requireExecutionStringInput(objectInput, ['approvalMatrixVersion'], 'approvalMatrixVersion is required for operator progression connect'),
      actionType: requireExecutionStringInput(objectInput, ['actionType'], 'actionType is required for operator progression connect') as 'CONTACT_SHARE',
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for operator progression connect'),
    };
    if (objectInput.approval === undefined) {
      return client.createOperatorConnection(connection);
    }
    const approvalInput = requireObjectInput(objectInput.approval, 'approval is required for operator progression connect continuation');
    return runOperatorConnectionContinuation(client, {
      connection,
      approval: {
        approvalRequestId: requireExecutionStringInput(approvalInput, ['approvalRequestId'], 'approvalRequestId is required for operator progression connect continuation'),
        actorId: requireExecutionStringInput(approvalInput, ['actorId'], 'actorId is required for operator progression connect continuation'),
        decision: requireExecutionStringInput(approvalInput, ['decision'], 'decision is required for operator progression connect continuation'),
        now: requireExecutionStringInput(approvalInput, ['now'], 'now is required for operator progression connect continuation'),
      },
    });
  },
  runOperatorApprovalContinuation(client, input) {
    const objectInput = requireObjectInput(input, 'operator approval continuation input is required for MCP execution');
    return runOperatorApprovalContinuation(client, {
      approvalRequestId: requireExecutionStringInput(objectInput, ['approvalRequestId'], 'approvalRequestId is required for operator progression approve'),
      actorId: requireExecutionStringInput(objectInput, ['actorId'], 'actorId is required for operator progression approve'),
      decision: requireExecutionStringInput(objectInput, ['decision'], 'decision is required for operator progression approve'),
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for operator progression approve'),
    });
  },
  runOperatorPackageExport(client, input) {
    const objectInput = requireObjectInput(input, 'operator package export input is required for MCP execution');
    return runOperatorPackageExport(client, {
      opportunityId: requireExecutionStringInput(objectInput, ['opportunityId'], 'opportunityId is required for operator package export'),
      renderTemplateId: requireExecutionStringInput(objectInput, ['renderTemplateId'], 'renderTemplateId is required for operator package export'),
      contentRef: requireExecutionStringInput(objectInput, ['contentRef'], 'contentRef is required for operator package export'),
      redactionProfile: requireExecutionStringInput(objectInput, ['redactionProfile'], 'redactionProfile is required for operator package export'),
      targetSystem: requireExecutionStringInput(objectInput, ['targetSystem'], 'targetSystem is required for operator package export'),
      operationType: requireExecutionStringInput(objectInput, ['operationType'], 'operationType is required for operator package export'),
      nodeId: requireExecutionStringInput(objectInput, ['nodeId'], 'nodeId is required for operator package export'),
      runtimeId: requireExecutionStringInput(objectInput, ['runtimeId'], 'runtimeId is required for operator package export'),
      agentId: requireExecutionStringInput(objectInput, ['agentId'], 'agentId is required for operator package export'),
      boundAccountId: requireExecutionStringInput(objectInput, ['boundAccountId'], 'boundAccountId is required for operator package export'),
      now: requireExecutionStringInput(objectInput, ['now'], 'now is required for operator package export'),
    });
  },
  runOperatorCommercialAction(client, input) {
    const objectInput = requireObjectInput(input, 'operator commercial action input is required for MCP execution');
    return runOperatorCommercialAction(client, {
      create: requireObjectInput(objectInput.create, 'create is required for operator commercial action') as never,
      policyCheck: requireObjectInput(objectInput.policyCheck, 'policyCheck is required for operator commercial action') as never,
      requestApproval: requireObjectInput(objectInput.requestApproval, 'requestApproval is required for operator commercial action') as never,
      execute: requireObjectInput(objectInput.execute, 'execute is required for operator commercial action') as never,
    });
  },
  runPlatformManagedProgression() {
    return runPlatformManagedProgression();
  },
  createProvisionalAgent(client, input) {
    return client.createProvisionalAgent(
      requireObjectInput(input, 'createProvisionalAgent input is required for MCP execution') as never,
    );
  },
  async executeIndustryUniverseScenario(client, input) {
    const scenarioInput: unknown = requireObjectInput(
      input,
      'industry universe scenario input is required for MCP execution',
    );
    return executeIndustryUniverseScenario(
      client,
      buildIndustryUniverseScenarioPlan(
        scenarioInput as BidviaIndustryUniverseScenarioPlanInput,
      ),
    );
  },
  createNotificationDelivery(client, input) {
    return client.createNotificationDelivery(
      requireObjectInput(input, 'createNotificationDelivery input is required for notification delivery execution') as never,
    );
  },
  acknowledgeNotification(client, input) {
    const agentId = requireAccountAgentId(input);
    return client.acknowledgeNotification(
      agentId,
      requireExecutionStringInput(
        input,
        ['notificationId'],
        'notificationId is required for governed notification acknowledgement execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'notificationId'],
        'agentId is required for governed notification acknowledgement execution',
      ) as never,
    );
  },
  retryNotification(client, input) {
    return client.retryNotification(
      requireExecutionStringInput(
        input,
        ['notificationId'],
        'notificationId is required for governed notification retry execution',
      ),
      buildExecutionPayload(
        input,
        ['notificationId'],
        'notificationId is required for governed notification retry execution',
      ) as never,
    );
  },
  expireNotification(client, input) {
    return client.expireNotification(
      requireExecutionStringInput(
        input,
        ['notificationId'],
        'notificationId is required for governed notification expiration execution',
      ),
      buildExecutionPayload(
        input,
        ['notificationId'],
        'notificationId is required for governed notification expiration execution',
      ) as never,
    );
  },
  claimProvisionalAgent(client, input) {
    return client.claimProvisionalAgent(
      requireObjectInput(input, 'claimProvisionalAgent input is required for MCP execution') as never,
    );
  },
  postAccountAgentExecutionPresence(client, input) {
    return client.postAccountAgentExecutionPresence(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for claimant execution presence',
      ) as never,
    );
  },
  uploadAccountAgentExecutionSync(client, input) {
    return client.uploadAccountAgentExecutionSync(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for claimant execution sync upload',
      ) as never,
    );
  },
  downloadAccountAgentExecutionSync(client, input) {
    return client.downloadAccountAgentExecutionSync(requireAccountAgentId(input));
  },
  submitAccountAgentExecutionEvidence(client, input) {
    return client.submitAccountAgentExecutionEvidence(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for claimant execution evidence submission',
      ) as never,
    );
  },
  submitAccountAgentExecutionProposal(client, input) {
    return client.submitAccountAgentExecutionProposal(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for claimant execution proposal submission',
      ) as never,
    );
  },
  createAccountAgentExecutionListing(client, input) {
    return client.createAccountAgentExecutionListing(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for claimant execution listing creation',
      ) as never,
    );
  },
  activateAccountAgentExecutionListing(client, input) {
    return client.activateAccountAgentExecutionListing(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['listingId'],
        'listingId is required for claimant execution listing activation',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'listingId'],
        'agentId and listingId are required for claimant execution listing activation',
      ) as never,
    );
  },
  refreshAccountAgentAuthorization(client, input) {
    return client.refreshAccountAgentAuthorization(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for canonical account-plane authorization refresh execution',
      ) as never,
    );
  },
  createAccountAgentExternalBinding(client, input) {
    return client.createAccountAgentExternalBinding(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for canonical account-plane external binding execution',
      ) as never,
    );
  },
  decideDispatchAuthorityRequest(client, input) {
    return client.decideDispatchAuthorityRequest(
      requireExecutionStringInput(
        input,
        ['requestId'],
        'requestId is required for operator dispatch-authority decision execution',
      ),
      buildExecutionPayload(
        input,
        ['requestId'],
        'requestId is required for operator dispatch-authority decision execution',
      ) as never,
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
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for canonical account-plane governed lease execution',
      ) as never,
    );
  },
  createTaskDispatch(client, input) {
    return client.createTaskDispatch(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for canonical account-plane governed task dispatch execution',
      ) as never,
    );
  },
  assignTaskDispatch(client, input) {
    return client.assignTaskDispatch(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch assignment execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentId and taskDispatchId are required for canonical account-plane governed task dispatch assignment execution',
      ) as never,
    );
  },
  suspendTaskDispatch(client, input) {
    return client.suspendTaskDispatch(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch suspension execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentId and taskDispatchId are required for canonical account-plane governed task dispatch suspension execution',
      ) as never,
    );
  },
  resumeTaskDispatch(client, input) {
    return client.resumeTaskDispatch(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch resume execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentId and taskDispatchId are required for canonical account-plane governed task dispatch resume execution',
      ) as never,
    );
  },
  completeTaskDispatch(client, input) {
    return client.completeTaskDispatch(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch completion execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentId and taskDispatchId are required for canonical account-plane governed task dispatch completion execution',
      ) as never,
    );
  },
  failTaskDispatch(client, input) {
    return client.failTaskDispatch(
      requireAccountAgentId(input),
      requireExecutionStringInput(
        input,
        ['taskDispatchId'],
        'taskDispatchId is required for governed task dispatch failure execution',
      ),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'taskDispatchId'],
        'agentId and taskDispatchId are required for canonical account-plane governed task dispatch failure execution',
      ) as never,
    );
  },
  createClaim(client, input) {
    return client.createClaim(
      requireAccountAgentId(input),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId'],
        'agentId is required for canonical account-plane governed claim execution',
      ) as never,
    );
  },
  acceptClaim(client, input) {
    return client.acceptClaim(
      requireAccountAgentId(input),
      requireExecutionStringInput(input, ['claimId'], 'claimId is required for governed claim acceptance execution'),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'claimId'],
        'agentId and claimId are required for canonical account-plane governed claim acceptance execution',
      ) as never,
    );
  },
  rejectClaim(client, input) {
    return client.rejectClaim(
      requireAccountAgentId(input),
      requireExecutionStringInput(input, ['claimId'], 'claimId is required for governed claim rejection execution'),
      buildExecutionPayload(
        input,
        ['agentId', 'agentRegistrationId', 'registrationId', 'claimId'],
        'agentId and claimId are required for canonical account-plane governed claim rejection execution',
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
  const executionContext = buildRuntimeExecutionIdentity(descriptor, preflight, client);
  let executionResult: unknown;

  try {
    executionResult = await runBidviaSurfaceCapability({
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
  } catch (error) {
    if (isBlockedCapabilityExecutionError(error) && error.blockedByPlaneGate) {
      throw new Error(buildMcpPlaneBlockedMessage(descriptor.toolName, error.blockedByPlaneGate));
    }

    throw error;
  }

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    preflight,
    result: {
      executionResult,
      ...((descriptor.role && descriptor.stage) ? buildMcpProductEvidence(descriptor, input, executionResult) : {}),
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

async function dispatchIndustryUniverseScenarioExecutionTool(
  descriptor: BidviaMcpToolDescriptor,
  input: unknown,
  dependencies: BidviaMcpDispatchDependencies,
): Promise<BidviaMcpToolCallResponse<BidviaMcpDispatchResult>> {
  const client = requireDispatchExecutionClient(descriptor, dependencies);
  const preflight = buildMcpExecutionPreflight(descriptor, client);
  if (preflight && preflight.missingContext.length > 0) {
    throw new Error(buildMcpMissingContextMessage(descriptor.toolName, preflight.missingContext));
  }

  const scenarioInput: unknown = requireObjectInput(
    input,
    'industry universe scenario input is required for MCP execution',
  );

  return {
    toolName: descriptor.toolName,
    outputMode: descriptor.outputMode,
    preflight,
    result: {
      executionResult: await executeIndustryUniverseScenario(
        client,
        buildIndustryUniverseScenarioPlan(
          scenarioInput as BidviaIndustryUniverseScenarioPlanInput,
        ),
      ),
    },
  };
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

function requireAccountAgentId(input: unknown): string {
  if (typeof input !== 'object' || input === null) {
    throw new Error('agentId is required for canonical account-plane operations; agentRegistrationId remains compatibility-only');
  }

  const agentId =
    ('agentId' in input && typeof input.agentId === 'string'
      ? input.agentId
      : undefined) ??
    ('agentRegistrationId' in input && typeof input.agentRegistrationId === 'string'
      ? input.agentRegistrationId
      : undefined) ??
    ('registrationId' in input && typeof input.registrationId === 'string'
      ? input.registrationId
      : undefined);

  if (!agentId) {
    throw new Error('agentId is required for canonical account-plane operations; agentRegistrationId remains compatibility-only');
  }

  return agentId;
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

  if (descriptor.helperRef.helperKey === 'getAccountAgentClosureStatus') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentClosureStatus(requireAccountAgentId(input)),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAccountAgentExecutionStatus') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentExecutionStatus(requireAccountAgentId(input)),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAccountAgentExecutionListingStatus') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentExecutionListingStatus(
          agentId,
          requireStringInput(input, 'listingId', 'listingId is required for claimant execution listing status reads'),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAccountAgentExecutionListingMaterializationStatus') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentExecutionListingMaterializationStatus(
          agentId,
          requireStringInput(input, 'listingId', 'listingId is required for claimant execution materialization-status reads'),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listAccountIntegrationCapabilities') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listAccountIntegrationCapabilities(),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAccountAgentIntegrationEligibility') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentIntegrationEligibility(
          agentId,
          requireStringInput(
            input,
            'integrationCode',
            'integrationCode is required for account-agent integration eligibility reads',
          ),
        ),
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

  if (descriptor.helperRef.helperKey === 'getNotification') {
    const inputObject = requireObjectInput(input, 'notification read input is required') as Record<string, unknown>;
    const agentIdCandidate = inputObject.agentId;
    const compatibilityRegistrationIdCandidate = inputObject.agentRegistrationId;
    const agentId = typeof agentIdCandidate === 'string' && agentIdCandidate.length > 0
      ? agentIdCandidate
      : typeof compatibilityRegistrationIdCandidate === 'string' && compatibilityRegistrationIdCandidate.length > 0
        ? compatibilityRegistrationIdCandidate
        : (() => {
            throw new Error('agentId is required for notification reads; agentRegistrationId remains compatibility-only');
          })();

    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getNotification(
          {
            agentId,
            notificationId: requireStringInput(
              input,
              'notificationId',
              'notificationId is required for notification reads',
            ),
          },
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentReadiness') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentReadiness(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentSummary') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentSummary(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentRegistration') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentRegistration(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'consumeOperatorHandoff') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await consumeOperatorHandoff(client, {
          sourceListingId: requireExecutionStringInput(
            input,
            ['sourceListingId'],
            'sourceListingId is required for operator handoff consume',
          ),
        }),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectOperatorCommercialAction') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectOperatorCommercialAction(client, {
          commercialActionRequestId: requireExecutionStringInput(
            input,
            ['commercialActionRequestId'],
            'commercialActionRequestId is required for operator commercial action inspection',
          ),
        }),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectPlatformManagedEntry') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectPlatformManagedEntry(),
        ...buildMcpProductEvidence(descriptor, input, await inspectPlatformManagedEntry()),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectPlatformManagedReadiness') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectPlatformManagedReadiness(),
        ...buildMcpProductEvidence(descriptor, input, await inspectPlatformManagedReadiness()),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectClaimantPrecondition') {
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectClaimantPrecondition(client),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectClaimantReadiness') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectClaimantReadiness(client, agentId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'inspectClaimantHandoff') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await inspectClaimantHandoff(
          client,
          agentId,
          requireExecutionStringInput(
            input,
            ['listingId'],
            'listingId is required for claimant handoff inspection',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthorityProfile') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentAuthorityProfile(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthorityLadder') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentAuthorityLadder(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentCapabilityProfile') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentCapabilityProfile(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'listParticipationStates') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listParticipationStates(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getParticipationState') {
    const registrationId = requireAgentRegistrationId(input);
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
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.listTaskDispatches(agentId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getTaskDispatch') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getTaskDispatch(
          agentId,
          requireStringInput(
            input,
            'taskDispatchId',
            'taskDispatchId is required for task dispatch reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAccountAgentGovernedWorkClosure') {
    const agentId = requireAccountAgentId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAccountAgentGovernedWorkClosure(
          agentId,
          requireStringInput(
            input,
            'taskDispatchId',
            'taskDispatchId is required for governed-work-closure reads',
          ),
        ),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentPresence') {
    const registrationId = requireAgentRegistrationId(input);
    return {
      toolName: descriptor.toolName,
      outputMode: descriptor.outputMode,
      result: {
        truthFetchResult: await client.getAgentPresence(registrationId),
      },
    };
  }

  if (descriptor.helperRef.helperKey === 'getAgentAuthority') {
    const registrationId = requireAgentRegistrationId(input);
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

  if (descriptor.helperRef.helperKey === 'establishClaimantCanonicalCompanyPublicPrecondition') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.helperRef.helperKey === 'repairClaimantReadiness') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.helperRef.helperKey === 'runClaimantTaskEntry') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.helperRef.helperKey === 'executeIndustryUniverseScenario') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.outputMode === 'truth-fetch-result') {
    return dispatchGovernanceTruthFetchTool(descriptor, request.arguments, dependencies);
  }

  if (descriptor.outputMode === 'execution-result') {
    return dispatchRegisteredAgentExecutionTool(descriptor, request.arguments, dependencies);
  }

  throw new Error(`unsupported MCP helper dispatch: ${descriptor.helperRef.helperKey}`);
}
