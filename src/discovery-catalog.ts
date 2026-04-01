import type {
  BidviaMcpToolDescriptor,
  BidviaMcpToolOutputMode,
  BidviaRouteCapability,
} from './contracts.js';
import { exportRouteCapabilityCatalog } from './capabilities.js';

type BidviaLocalDiscoveryKind = 'read' | 'review-safe' | 'execute';

type BidviaLocalDiscoveryRecommendedOutputMode = BidviaMcpToolOutputMode;

type BidviaLocalDiscoveryCliBinding = {
  command: string;
  helperKey: string;
  recommendedOutputMode: BidviaLocalDiscoveryRecommendedOutputMode;
};

type BidviaLocalDiscoveryMcpBinding = {
  toolName: string;
  description: string;
  inputSchemaKey: string;
  outputMode: BidviaMcpToolOutputMode;
  helperKey: string;
  capabilityKey?: string;
};

export interface BidviaLocalDiscoveryCatalogEntry extends Pick<
  BidviaRouteCapability,
  | 'helperKey'
  | 'routePathTemplate'
  | 'httpMethod'
  | 'accessContextFamily'
  | 'requiredContext'
  | 'scope'
  | 'level'
  | 'localCapabilityTier'
  | 'localCapabilityRiskTier'
> {
  discoveryKind: BidviaLocalDiscoveryKind;
  recommendedOutputMode: BidviaLocalDiscoveryRecommendedOutputMode;
  sourceOfTruth: 'local-sdk-helpers';
  localOnly: true;
  remoteDiscovery: false;
  cliCommands: string[];
  mcpTools: Array<{
    toolName: string;
    outputMode: BidviaMcpToolOutputMode;
  }>;
}

export type BidviaMcpOperatorToolDiscovery = BidviaMcpToolDescriptor & Pick<
  BidviaRouteCapability,
  'routePathTemplate' | 'httpMethod' | 'scope' | 'level'
>;

export interface BidviaLocalMcpProductizationSnapshot {
  serverBoundary: {
    transport: 'stdio';
    hosted: false;
    remoteDiscovery: false;
    sourceOfTruth: 'local-sdk-helpers';
  };
  discoverability: {
    truthFetchReadOnly: true;
    reviewSafeLocalOnly: true;
    executionRequiresLocalExecutionClient: true;
  };
  tools: BidviaMcpOperatorToolDiscovery[];
}

const localDiscoverySourceOfTruth = 'local-sdk-helpers';

const localCliBindings: readonly BidviaLocalDiscoveryCliBinding[] = [
  { command: 'account-agents', helperKey: 'listAccountAgents', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent', helperKey: 'getAccountAgent', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-bindings', helperKey: 'listAccountAgentBindings', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-records', helperKey: 'listAccountRecords', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-presence', helperKey: 'getAgentPresence', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-authority', helperKey: 'getAgentAuthority', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-readiness', helperKey: 'getAgentReadiness', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-summary', helperKey: 'getAgentSummary', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-authority-profile', helperKey: 'getAgentAuthorityProfile', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-authority-ladder', helperKey: 'getAgentAuthorityLadder', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'agent-capability-profile', helperKey: 'getAgentCapabilityProfile', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-concepts', helperKey: 'listCanonicalSemanticConcepts', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-concept', helperKey: 'getCanonicalSemanticConcept', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-labels', helperKey: 'listCanonicalSemanticLabels', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-label', helperKey: 'getCanonicalSemanticLabel', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-mappings', helperKey: 'listCanonicalSemanticMappings', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'canonical-semantic-mapping', helperKey: 'getCanonicalSemanticMapping', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-bases', helperKey: 'listPricingBases', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-basis', helperKey: 'getPricingBasis', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-rule-atoms', helperKey: 'listPricingRuleAtoms', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-rule-atom', helperKey: 'getPricingRuleAtom', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quotation-method-modules', helperKey: 'listPricingQuotationMethodModules', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quotation-method-module', helperKey: 'getPricingQuotationMethodModule', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quote-templates', helperKey: 'listPricingQuoteTemplates', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quote-template', helperKey: 'getPricingQuoteTemplate', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quotations', helperKey: 'listPricingQuotations', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-quotation', helperKey: 'getPricingQuotation', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-explanations', helperKey: 'listPricingExplanations', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'pricing-explanation', helperKey: 'getPricingExplanation', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'document-artifacts', helperKey: 'listDocumentArtifacts', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'document-artifact', helperKey: 'getDocumentArtifact', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'media-assets', helperKey: 'listMediaAssets', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'media-asset', helperKey: 'getMediaAsset', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'evidence-assets', helperKey: 'listEvidenceAssets', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'evidence-asset', helperKey: 'getEvidenceAsset', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'attachment-bindings', helperKey: 'listAttachmentBindings', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'attachment-binding', helperKey: 'getAttachmentBinding', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'file-resources', helperKey: 'listFileResources', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'file-resource', helperKey: 'getFileResource', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'target-attachment-bindings', helperKey: 'listTargetAttachmentBindings', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'industry-universe-plan', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'industry-universe-review-packet-preview', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'industry-universe-review-packet-export', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'connection-approval-plan', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'connection-approval-review-packet-preview', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'connection-approval-review-packet-export', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'opportunity-package-handoff-plan', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'opportunity-package-handoff-review-packet-preview', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'opportunity-package-handoff-review-packet-export', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'heartbeat', helperKey: 'postHeartbeat', recommendedOutputMode: 'execution-result' },
  { command: 'sync-upload', helperKey: 'uploadSync', recommendedOutputMode: 'execution-result' },
  { command: 'evidence', helperKey: 'submitEvidence', recommendedOutputMode: 'execution-result' },
  { command: 'proposal', helperKey: 'submitProposal', recommendedOutputMode: 'execution-result' },
];

const localMcpBindings: readonly BidviaLocalDiscoveryMcpBinding[] = [
  {
    toolName: 'industry-universe-plan-preview',
    description: 'Previews the bounded industry universe scenario plan payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  },
  {
    toolName: 'industry-universe-review-packet-preview',
    description: 'Previews the bounded industry universe review packet payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  },
  {
    toolName: 'industry-universe-review-packet-export',
    description: 'Exports the bounded industry universe review packet payload.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildIndustryUniverseScenarioPlan',
    capabilityKey: 'buildIndustryUniverseScenarioPlan',
  },
  {
    toolName: 'connection-approval-plan-preview',
    description: 'Previews the bounded connection approval scenario plan payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  },
  {
    toolName: 'connection-approval-review-packet-preview',
    description: 'Previews the bounded connection approval review packet payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  },
  {
    toolName: 'connection-approval-review-packet-export',
    description: 'Exports the bounded connection approval review packet payload.',
    inputSchemaKey: 'BidviaConnectionApprovalScenarioPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildConnectionApprovalScenarioPlan',
    capabilityKey: 'buildConnectionApprovalScenarioPlan',
  },
  {
    toolName: 'opportunity-package-handoff-plan-preview',
    description: 'Previews the bounded opportunity package handoff scenario plan payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'plan-preview',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  },
  {
    toolName: 'opportunity-package-handoff-review-packet-preview',
    description: 'Previews the bounded opportunity package handoff review packet payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'review-packet-preview',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  },
  {
    toolName: 'opportunity-package-handoff-review-packet-export',
    description: 'Exports the bounded opportunity package handoff review packet payload.',
    inputSchemaKey: 'BidviaOpportunityPackageHandoffPlanInput',
    outputMode: 'review-packet-export',
    helperKey: 'buildOpportunityPackageHandoffPlan',
    capabilityKey: 'buildOpportunityPackageHandoffPlan',
  },
  {
    toolName: 'account-agents-read',
    description: 'Reads the current governed account agent records through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountAgents',
    capabilityKey: 'listAccountAgents',
  },
  {
    toolName: 'account-agent-bindings-read',
    description: 'Reads the current governed account agent bindings through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountAgentBindings',
    capabilityKey: 'listAccountAgentBindings',
  },
  {
    toolName: 'account-records-read',
    description: 'Reads the current governed account records through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountRecords',
    capabilityKey: 'listAccountRecords',
  },
  {
    toolName: 'agent-presence-read',
    description: 'Reads the current governed agent presence through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentPresence',
    capabilityKey: 'getAgentPresence',
  },
  {
    toolName: 'agent-authority-read',
    description: 'Reads the current governed agent authority through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentAuthority',
    capabilityKey: 'getAgentAuthority',
  },
  {
    toolName: 'canonical-semantic-concepts-read',
    description: 'Reads the current business canonical semantic concepts through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listCanonicalSemanticConcepts',
    capabilityKey: 'listCanonicalSemanticConcepts',
  },
  {
    toolName: 'canonical-semantic-concept-read',
    description: 'Reads the current business canonical semantic concept through the shipped SDK helper.',
    inputSchemaKey: 'BidviaCanonicalSemanticConceptIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getCanonicalSemanticConcept',
    capabilityKey: 'getCanonicalSemanticConcept',
  },
  {
    toolName: 'pricing-bases-read',
    description: 'Reads the current business pricing bases through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listPricingBases',
    capabilityKey: 'listPricingBases',
  },
  {
    toolName: 'pricing-basis-read',
    description: 'Reads the current business pricing basis through the shipped SDK helper.',
    inputSchemaKey: 'BidviaPricingBasisIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getPricingBasis',
    capabilityKey: 'getPricingBasis',
  },
  {
    toolName: 'document-artifacts-read',
    description: 'Reads the current business document artifacts through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listDocumentArtifacts',
    capabilityKey: 'listDocumentArtifacts',
  },
  {
    toolName: 'document-artifact-read',
    description: 'Reads the current business document artifact through the shipped SDK helper.',
    inputSchemaKey: 'BidviaDocumentArtifactIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getDocumentArtifact',
    capabilityKey: 'getDocumentArtifact',
  },
  {
    toolName: 'media-assets-read',
    description: 'Reads the current business media assets through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listMediaAssets',
    capabilityKey: 'listMediaAssets',
  },
  {
    toolName: 'media-asset-read',
    description: 'Reads the current business media asset through the shipped SDK helper.',
    inputSchemaKey: 'BidviaMediaAssetIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getMediaAsset',
    capabilityKey: 'getMediaAsset',
  },
  {
    toolName: 'evidence-assets-read',
    description: 'Reads the current business evidence assets through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listEvidenceAssets',
    capabilityKey: 'listEvidenceAssets',
  },
  {
    toolName: 'evidence-asset-read',
    description: 'Reads the current business evidence asset through the shipped SDK helper.',
    inputSchemaKey: 'BidviaEvidenceAssetIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getEvidenceAsset',
    capabilityKey: 'getEvidenceAsset',
  },
  {
    toolName: 'attachment-bindings-read',
    description: 'Reads the current business attachment bindings through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAttachmentBindings',
    capabilityKey: 'listAttachmentBindings',
  },
  {
    toolName: 'attachment-binding-read',
    description: 'Reads the current business attachment binding through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAttachmentBindingIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAttachmentBinding',
    capabilityKey: 'getAttachmentBinding',
  },
  {
    toolName: 'heartbeat-execution',
    description: 'Executes the real remote heartbeat over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaHeartbeatInput',
    outputMode: 'execution-result',
    helperKey: 'heartbeat-execution',
    capabilityKey: 'postHeartbeat',
  },
  {
    toolName: 'sync-upload-execution',
    description: 'Executes the real remote sync upload over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaSyncUploadInput',
    outputMode: 'execution-result',
    helperKey: 'sync-upload-execution',
    capabilityKey: 'uploadSync',
  },
  {
    toolName: 'evidence-execution',
    description: 'Executes the real remote evidence submission over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaEvidenceSubmissionInput',
    outputMode: 'execution-result',
    helperKey: 'evidence-execution',
    capabilityKey: 'submitEvidence',
  },
  {
    toolName: 'proposal-execution',
    description: 'Executes the real remote proposal submission over the local registration-bound client seam.',
    inputSchemaKey: 'BidviaProposalSubmissionInput',
    outputMode: 'execution-result',
    helperKey: 'proposal-execution',
    capabilityKey: 'submitProposal',
  },
];

function buildRouteCapabilityMap(): Map<string, BidviaRouteCapability> {
  return new Map(exportRouteCapabilityCatalog().map((capability) => [capability.helperKey, capability]));
}

function getDiscoveryKind(capability: BidviaRouteCapability): BidviaLocalDiscoveryKind {
  if (capability.scope === 'read') {
    return 'read';
  }

  if (capability.localCapabilityRiskTier === 'review-safe') {
    return 'review-safe';
  }

  return 'execute';
}

function buildRecommendedOutputMode(
  cliBindings: readonly BidviaLocalDiscoveryCliBinding[],
  mcpBindings: readonly BidviaLocalDiscoveryMcpBinding[],
  capability: BidviaRouteCapability,
): BidviaLocalDiscoveryRecommendedOutputMode {
  return cliBindings[0]?.recommendedOutputMode
    ?? mcpBindings[0]?.outputMode
    ?? (capability.scope === 'read' ? 'truth-fetch-result' : 'execution-result');
}

function createLocalMcpToolDescriptor(binding: BidviaLocalDiscoveryMcpBinding): BidviaMcpToolDescriptor {
  const capability = getRouteCapabilityFromLocalCatalog(binding.capabilityKey ?? binding.helperKey);
  if (!capability) {
    throw new Error(`missing MCP capability metadata for ${binding.toolName}`);
  }

  return {
    toolName: binding.toolName,
    description: binding.description,
    inputSchemaRef: {
      schemaKey: binding.inputSchemaKey,
    },
    outputMode: binding.outputMode,
    helperRef: {
      helperKey: binding.helperKey,
      capabilityKey: binding.capabilityKey,
    },
    localCapabilityTier: capability.localCapabilityTier,
    localCapabilityRiskTier: capability.localCapabilityRiskTier,
    accessContextFamily: capability.accessContextFamily,
    requiredContext: [...capability.requiredContext],
  };
}

export function buildLocalRouteCapabilityCatalog(): BidviaRouteCapability[] {
  return exportRouteCapabilityCatalog();
}

export function getRouteCapabilityFromLocalCatalog(helperKey: string): BidviaRouteCapability | undefined {
  return buildRouteCapabilityMap().get(helperKey);
}

export function buildLocalMcpToolCatalog(): BidviaMcpToolDescriptor[] {
  return localMcpBindings.map((binding) => createLocalMcpToolDescriptor(binding));
}

export function getLocalMcpToolDescriptor(toolName: string): BidviaMcpToolDescriptor | undefined {
  return buildLocalMcpToolCatalog().find((tool) => tool.toolName === toolName);
}

export function buildLocalDiscoveryCatalog(): BidviaLocalDiscoveryCatalogEntry[] {
  const routeCapabilities = buildLocalRouteCapabilityCatalog();

  return routeCapabilities.map((capability) => {
    const cliBindings = localCliBindings.filter((binding) => binding.helperKey === capability.helperKey);
    const mcpBindings = localMcpBindings.filter(
      (binding) => (binding.capabilityKey ?? binding.helperKey) === capability.helperKey,
    );

    return {
      helperKey: capability.helperKey,
      routePathTemplate: capability.routePathTemplate,
      httpMethod: capability.httpMethod,
      accessContextFamily: capability.accessContextFamily,
      requiredContext: [...capability.requiredContext],
      scope: capability.scope,
      level: capability.level,
      localCapabilityTier: capability.localCapabilityTier,
      localCapabilityRiskTier: capability.localCapabilityRiskTier,
      discoveryKind: getDiscoveryKind(capability),
      recommendedOutputMode: buildRecommendedOutputMode(cliBindings, mcpBindings, capability),
      sourceOfTruth: localDiscoverySourceOfTruth,
      localOnly: true,
      remoteDiscovery: false,
      cliCommands: cliBindings.map((binding) => binding.command),
      mcpTools: mcpBindings.map((binding) => ({
        toolName: binding.toolName,
        outputMode: binding.outputMode,
      })),
    };
  });
}

function buildMcpOperatorToolDiscovery(tool: BidviaMcpToolDescriptor): BidviaMcpOperatorToolDiscovery {
  const capability = getRouteCapabilityFromLocalCatalog(tool.helperRef.capabilityKey ?? tool.helperRef.helperKey);
  if (!capability) {
    throw new Error(`missing MCP capability metadata for ${tool.toolName}`);
  }

  return {
    ...structuredClone(tool),
    routePathTemplate: capability.routePathTemplate,
    httpMethod: capability.httpMethod,
    scope: capability.scope,
    level: capability.level,
  };
}

export function buildLocalMcpProductizationSnapshot(): BidviaLocalMcpProductizationSnapshot {
  return {
    serverBoundary: {
      transport: 'stdio',
      hosted: false,
      remoteDiscovery: false,
      sourceOfTruth: localDiscoverySourceOfTruth,
    },
    discoverability: {
      truthFetchReadOnly: true,
      reviewSafeLocalOnly: true,
      executionRequiresLocalExecutionClient: true,
    },
    tools: buildLocalMcpToolCatalog().map((tool) => buildMcpOperatorToolDiscovery(tool)),
  };
}
