import type {
  BidviaLocalDiagnosticCommandDescriptor,
  BidviaEnterpriseIntegrationPlaneHelperGroup,
  BidviaMcpToolDescriptor,
  BidviaMcpToolOutputMode,
  BidviaPlaneExecutionGate,
  BidviaRoleStageSemanticMetadata,
  BidviaRouteCapability,
} from './contracts.js';
import { buildCapabilityPlaneDiscoveryBoundary } from './capability-plane.js';
import { buildEnterpriseIntegrationPlaneView } from './enterprise-integration-plane.js';
import { exportRouteCapabilityCatalog } from './capabilities.js';
import { getPlaneExecutionGate } from './plane-execution-gate.js';

type BidviaLocalDiscoveryKind = 'read' | 'review-safe' | 'execute' | 'blocked';

type BidviaLocalDiscoveryRecommendedOutputMode = BidviaMcpToolOutputMode;

const localDiagnosticCommandCatalog: readonly BidviaLocalDiagnosticCommandDescriptor[] = [
  {
    command: 'install-integrity',
    scope: 'local-only',
    summary: 'Reports the active bidvia binary, local package roots, package version, and likely install-path drift.',
  },
  {
    command: 'validation-smoke',
    scope: 'local-only',
    summary: 'Runs a bounded local-first smoke pass over install, environment, runtime capability, server capability, and context diagnostics.',
  },
  {
    command: 'diagnostic-bundle-export',
    scope: 'local-only',
    summary: 'Exports the bounded smoke report as machine-readable JSON plus a shareable markdown summary.',
  },
] as const;

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
  | 'contextSemantic'
  | 'requiredContext'
  | 'scope'
  | 'level'
  | 'localCapabilityTier'
  | 'localCapabilityRiskTier'
  | 'capabilityPlaneCapabilityMode'
  | 'dispatchEligibilityDerivedFromCapabilityReadTruth'
  | 'governedRunAuthorizationDerivedFromCapabilityReadTruth'
  | 'taskPlaneCapabilityMode'
  | 'eventNotificationPlaneCapabilityMode'
> {
  role?: BidviaRoleStageSemanticMetadata['role'];
  stage?: BidviaRoleStageSemanticMetadata['stage'];
  executability?: BidviaRoleStageSemanticMetadata['executability'];
  ownershipClass?: BidviaRoleStageSemanticMetadata['ownershipClass'];
  handoffClass?: BidviaRoleStageSemanticMetadata['handoffClass'];
  canonicality?: BidviaRoleStageSemanticMetadata['canonicality'];
  mayContinueHere?: boolean;
  mayReadHere?: boolean;
  mayNotDecideHere?: boolean;
  discoveryKind: BidviaLocalDiscoveryKind;
  recommendedOutputMode: BidviaLocalDiscoveryRecommendedOutputMode;
  sourceOfTruth: 'local-sdk-helpers';
  localOnly: true;
  remoteDiscovery: false;
  runnable?: boolean;
  blockedBy?: string | null;
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


const roleStageSemanticsByHelperKey: Readonly<Record<string, BidviaRoleStageSemanticMetadata>> = {
  inspectClaimantPrecondition: {
    role: 'claimant',
    stage: 'entry',
    executability: 'bounded-stop',
    ownershipClass: 'claimant-entry',
    handoffClass: 'none',
    canonicality: 'bounded',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  establishClaimantCanonicalCompanyPublicPrecondition: {
    role: 'claimant',
    stage: 'entry',
    executability: 'canonical',
    ownershipClass: 'claimant-entry',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  inspectClaimantReadiness: {
    role: 'claimant',
    stage: 'readiness',
    executability: 'canonical',
    ownershipClass: 'claimant-self-repair',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  repairClaimantReadiness: {
    role: 'claimant',
    stage: 'readiness',
    executability: 'canonical',
    ownershipClass: 'claimant-self-repair',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  runClaimantTaskEntry: {
    role: 'claimant',
    stage: 'task-entry',
    executability: 'canonical',
    ownershipClass: 'claimant-task-entry',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  inspectClaimantHandoff: {
    role: 'claimant',
    stage: 'handoff',
    executability: 'executable-handoff',
    ownershipClass: 'claimant-to-operator',
    handoffClass: 'canonical-bridge',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  consumeOperatorHandoff: {
    role: 'operator',
    stage: 'handoff',
    executability: 'executable-handoff',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'canonical-bridge',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  runOperatorMatching: {
    role: 'operator',
    stage: 'progression',
    executability: 'canonical',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  runOperatorConnectionContinuation: {
    role: 'operator',
    stage: 'progression',
    executability: 'canonical',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  runOperatorApprovalContinuation: {
    role: 'operator',
    stage: 'progression',
    executability: 'canonical',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  runOperatorPackageExport: {
    role: 'operator',
    stage: 'progression',
    executability: 'canonical',
    ownershipClass: 'operator-owned-progression',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  runOperatorCommercialAction: {
    role: 'operator',
    stage: 'closure',
    executability: 'canonical',
    ownershipClass: 'operator-owned-closure',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: true,
    mayReadHere: false,
    mayNotDecideHere: false,
  },
  inspectOperatorCommercialAction: {
    role: 'operator',
    stage: 'closure',
    executability: 'canonical',
    ownershipClass: 'operator-owned-closure',
    handoffClass: 'none',
    canonicality: 'canonical',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  inspectPlatformManagedEntry: {
    role: 'platform-managed',
    stage: 'entry',
    executability: 'later-wave-stop',
    ownershipClass: 'platform-managed-bounded-entry',
    handoffClass: 'none',
    canonicality: 'later-wave',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  inspectPlatformManagedReadiness: {
    role: 'platform-managed',
    stage: 'readiness',
    executability: 'later-wave-stop',
    ownershipClass: 'platform-managed-bounded-readiness',
    handoffClass: 'none',
    canonicality: 'later-wave',
    mayContinueHere: false,
    mayReadHere: true,
    mayNotDecideHere: true,
  },
  runPlatformManagedProgression: {
    role: 'platform-managed',
    stage: 'progression',
    executability: 'later-wave-stop',
    ownershipClass: 'platform-managed-bounded-progression',
    handoffClass: 'none',
    canonicality: 'later-wave',
    mayContinueHere: false,
    mayReadHere: false,
    mayNotDecideHere: true,
  },
};

function getRoleStageSemantics(helperKey: string): BidviaRoleStageSemanticMetadata | undefined {
  return roleStageSemanticsByHelperKey[helperKey];
}

const localCliBindings: readonly BidviaLocalDiscoveryCliBinding[] = [
  { command: 'account-agents', helperKey: 'listAccountAgents', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent', helperKey: 'getAccountAgent', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-dispatch-authority', helperKey: 'getAccountAgentDispatchAuthority', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-closure-status', helperKey: 'getAccountAgentClosureStatus', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-execution-status', helperKey: 'getAccountAgentExecutionStatus', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-execution-listing-status', helperKey: 'getAccountAgentExecutionListingStatus', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-execution-materialization-status', helperKey: 'getAccountAgentExecutionListingMaterializationStatus', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-integration-capabilities', helperKey: 'listAccountIntegrationCapabilities', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'account-agent-integration-eligibility', helperKey: 'getAccountAgentIntegrationEligibility', recommendedOutputMode: 'truth-fetch-result' },
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
  { command: 'industry-universe-plan', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'industry-universe-review-packet-preview', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'industry-universe-review-packet-export', helperKey: 'buildIndustryUniverseScenarioPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'industry-universe-execution', helperKey: 'executeIndustryUniverseScenario', recommendedOutputMode: 'execution-result' },
  { command: 'account-agent-authorization-refresh', helperKey: 'refreshAccountAgentAuthorization', recommendedOutputMode: 'execution-result' },
  { command: 'account-agent-external-binding', helperKey: 'createAccountAgentExternalBinding', recommendedOutputMode: 'execution-result' },
  { command: 'operator-dispatch-authority-decision', helperKey: 'decideDispatchAuthorityRequest', recommendedOutputMode: 'execution-result' },
  { command: 'create-lease', helperKey: 'createLease', recommendedOutputMode: 'execution-result' },
  { command: 'create-task-dispatch', helperKey: 'createTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'assign-task-dispatch', helperKey: 'assignTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'suspend-task-dispatch', helperKey: 'suspendTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'resume-task-dispatch', helperKey: 'resumeTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'complete-task-dispatch', helperKey: 'completeTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'fail-task-dispatch', helperKey: 'failTaskDispatch', recommendedOutputMode: 'execution-result' },
  { command: 'create-claim', helperKey: 'createClaim', recommendedOutputMode: 'execution-result' },
  { command: 'accept-claim', helperKey: 'acceptClaim', recommendedOutputMode: 'execution-result' },
  { command: 'reject-claim', helperKey: 'rejectClaim', recommendedOutputMode: 'execution-result' },
  { command: 'governed-work-closure', helperKey: 'getAccountAgentGovernedWorkClosure', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'connection-approval-plan', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'connection-approval-review-packet-preview', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'connection-approval-review-packet-export', helperKey: 'buildConnectionApprovalScenarioPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'opportunity-package-handoff-plan', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'plan-preview' },
  { command: 'opportunity-package-handoff-review-packet-preview', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'review-packet-preview' },
  { command: 'opportunity-package-handoff-review-packet-export', helperKey: 'buildOpportunityPackageHandoffPlan', recommendedOutputMode: 'review-packet-export' },
  { command: 'claimant-precondition-inspect', helperKey: 'inspectClaimantPrecondition', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'claimant-precondition-establish-canonical-company-public', helperKey: 'establishClaimantCanonicalCompanyPublicPrecondition', recommendedOutputMode: 'execution-result' },
  { command: 'claimant-readiness-inspect', helperKey: 'inspectClaimantReadiness', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'claimant-readiness-repair', helperKey: 'repairClaimantReadiness', recommendedOutputMode: 'execution-result' },
  { command: 'claimant-task-entry-inspect', helperKey: 'inspectClaimantReadiness', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'claimant-task-entry-run', helperKey: 'runClaimantTaskEntry', recommendedOutputMode: 'execution-result' },
  { command: 'claimant-handoff-inspect', helperKey: 'inspectClaimantHandoff', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'operator-handoff-consume', helperKey: 'consumeOperatorHandoff', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'operator-progression-match', helperKey: 'runOperatorMatching', recommendedOutputMode: 'execution-result' },
  { command: 'operator-progression-connect', helperKey: 'runOperatorConnectionContinuation', recommendedOutputMode: 'execution-result' },
  { command: 'operator-progression-approve', helperKey: 'runOperatorApprovalContinuation', recommendedOutputMode: 'execution-result' },
  { command: 'operator-progression-package-export', helperKey: 'runOperatorPackageExport', recommendedOutputMode: 'execution-result' },
  { command: 'operator-closure-commercial-action-run', helperKey: 'runOperatorCommercialAction', recommendedOutputMode: 'execution-result' },
  { command: 'operator-closure-inspect', helperKey: 'inspectOperatorCommercialAction', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'platform-managed entry inspect', helperKey: 'inspectPlatformManagedEntry', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'platform-managed readiness inspect', helperKey: 'inspectPlatformManagedReadiness', recommendedOutputMode: 'truth-fetch-result' },
  { command: 'platform-managed progression run', helperKey: 'runPlatformManagedProgression', recommendedOutputMode: 'execution-result' },
  { command: 'heartbeat', helperKey: 'postHeartbeat', recommendedOutputMode: 'execution-result' },
  { command: 'sync-upload', helperKey: 'uploadSync', recommendedOutputMode: 'execution-result' },
  { command: 'evidence', helperKey: 'submitEvidence', recommendedOutputMode: 'execution-result' },
  { command: 'proposal', helperKey: 'submitProposal', recommendedOutputMode: 'execution-result' },
];

const widenedShippedReadMcpBindings: readonly BidviaLocalDiscoveryMcpBinding[] = [
  {
    toolName: 'account-integration-capabilities-read',
    description: 'Reads the canonical account integration capability directory through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAccountIntegrationCapabilities',
    capabilityKey: 'listAccountIntegrationCapabilities',
  },
  {
    toolName: 'account-agent-integration-eligibility-read',
    description: 'Reads the canonical account-agent integration eligibility through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentIntegrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentIntegrationEligibility',
    capabilityKey: 'getAccountAgentIntegrationEligibility',
  },
  {
    toolName: 'query-provisional-agent-read',
    description: 'Reads public provisional agent status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaQueryProvisionalAgentInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'queryProvisionalAgent',
    capabilityKey: 'queryProvisionalAgent',
  },
  {
    toolName: 'account-agent-closure-status-read',
    description: 'Reads the canonical account-plane closure-status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentClosureStatus',
    capabilityKey: 'getAccountAgentClosureStatus',
  },
  {
    toolName: 'account-agent-execution-status-read',
    description: 'Reads the claimant execution package status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentExecutionStatus',
    capabilityKey: 'getAccountAgentExecutionStatus',
  },
  {
    toolName: 'account-agent-execution-listing-status-read',
    description: 'Reads the claimant execution listing status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionListingIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentExecutionListingStatus',
    capabilityKey: 'getAccountAgentExecutionListingStatus',
  },
  {
    toolName: 'account-agent-execution-materialization-status-read',
    description: 'Reads the claimant execution materialization status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionListingIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentExecutionListingMaterializationStatus',
    capabilityKey: 'getAccountAgentExecutionListingMaterializationStatus',
  },
  {
    toolName: 'agent-readiness-read',
    description: 'Reads the current governed agent readiness through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentReadiness',
    capabilityKey: 'getAgentReadiness',
  },
  {
    toolName: 'claimant-precondition-inspect-read',
    description: 'Inspects the claimant canonical precondition through the productized claimant facade.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectClaimantPrecondition',
    capabilityKey: 'inspectClaimantPrecondition',
  },
  {
    toolName: 'claimant-readiness-inspect-read',
    description: 'Inspects claimant readiness through the productized claimant facade.',
    inputSchemaKey: 'BidviaAccountAgentIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectClaimantReadiness',
    capabilityKey: 'inspectClaimantReadiness',
  },
  {
    toolName: 'operator-handoff-consume-read',
    description: 'Consumes the canonical operator handoff through the operator product facade.',
    inputSchemaKey: 'BidviaOperatorMatchesListInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'consumeOperatorHandoff',
    capabilityKey: 'consumeOperatorHandoff',
  },
  {
    toolName: 'operator-closure-inspect-read',
    description: 'Reads operator commercial-action closure status, receipt, and audit through the operator product facade.',
    inputSchemaKey: 'BidviaOperatorCommercialActionInspectInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectOperatorCommercialAction',
    capabilityKey: 'inspectOperatorCommercialAction',
  },
  {
    toolName: 'platform-managed-entry-inspect-read',
    description: 'Inspects the bounded platform-managed entry surface through the productized platform-managed facade.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectPlatformManagedEntry',
    capabilityKey: 'inspectPlatformManagedEntry',
  },
  {
    toolName: 'platform-managed-readiness-inspect-read',
    description: 'Inspects the bounded platform-managed readiness surface through the productized platform-managed facade.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectPlatformManagedReadiness',
    capabilityKey: 'inspectPlatformManagedReadiness',
  },
  {
    toolName: 'claimant-handoff-inspect-read',
    description: 'Inspects claimant handoff truth through the productized claimant facade.',
    inputSchemaKey: 'BidviaAccountAgentExecutionListingIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'inspectClaimantHandoff',
    capabilityKey: 'inspectClaimantHandoff',
  },
  {
    toolName: 'agent-summary-read',
    description: 'Reads the current governed agent summary through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentSummary',
    capabilityKey: 'getAgentSummary',
  },
  {
    toolName: 'agent-registrations-read',
    description: 'Reads the current governed agent registrations through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAgentRegistrations',
    capabilityKey: 'listAgentRegistrations',
  },
  {
    toolName: 'agent-registration-read',
    description: 'Reads the current governed agent registration detail through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentRegistration',
    capabilityKey: 'getAgentRegistration',
  },
  {
    toolName: 'authority-profiles-read',
    description: 'Reads the current governed authority profiles through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listAuthorityProfiles',
    capabilityKey: 'listAuthorityProfiles',
  },
  {
    toolName: 'agent-authority-profile-read',
    description: 'Reads the current governed agent authority profile through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentAuthorityProfile',
    capabilityKey: 'getAgentAuthorityProfile',
  },
  {
    toolName: 'agent-authority-ladder-read',
    description: 'Reads the current governed agent authority ladder through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentAuthorityLadder',
    capabilityKey: 'getAgentAuthorityLadder',
  },
  {
    toolName: 'capability-profiles-read',
    description: 'Reads the current governed capability profiles through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listCapabilityProfiles',
    capabilityKey: 'listCapabilityProfiles',
  },
  {
    toolName: 'agent-capability-profile-read',
    description: 'Reads the current governed agent capability profile through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAgentCapabilityProfile',
    capabilityKey: 'getAgentCapabilityProfile',
  },
  {
    toolName: 'participation-states-read',
    description: 'Reads the current governed participation states through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listParticipationStates',
    capabilityKey: 'listParticipationStates',
  },
  {
    toolName: 'participation-state-read',
    description: 'Reads the current governed participation state detail through the shipped SDK helper.',
    inputSchemaKey: 'BidviaParticipationStateIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getParticipationState',
    capabilityKey: 'getParticipationState',
  },
  {
    toolName: 'task-dispatches-read',
    description: 'Reads the current governed task dispatches through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'listTaskDispatches',
    capabilityKey: 'listTaskDispatches',
  },
  {
    toolName: 'task-dispatch-read',
    description: 'Reads the current governed task dispatch detail through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getTaskDispatch',
    capabilityKey: 'getTaskDispatch',
  },
  {
    toolName: 'notification-read',
    description: 'Reads the current governed notification detail through the shipped SDK helper.',
    inputSchemaKey: 'BidviaNotificationIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getNotification',
    capabilityKey: 'getNotification',
  },
  {
    toolName: 'governed-work-closure-read',
    description: 'Reads the canonical governed-work-closure through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchIdentifierInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'getAccountAgentGovernedWorkClosure',
    capabilityKey: 'getAccountAgentGovernedWorkClosure',
  },
];

const widenedShippedExecutionMcpBindings: readonly BidviaLocalDiscoveryMcpBinding[] = [
  {
    toolName: 'acknowledge-notification-execution',
    description: 'Executes the governed notification acknowledgement through the shipped SDK helper.',
    inputSchemaKey: 'BidviaNotificationAcknowledgementExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'acknowledge-notification-execution',
    capabilityKey: 'acknowledgeNotification',
  },
  {
    toolName: 'create-provisional-agent-execution',
    description: 'Executes public provisional agent creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaProvisionalAgentCreateInput',
    outputMode: 'execution-result',
    helperKey: 'createProvisionalAgent',
    capabilityKey: 'createProvisionalAgent',
  },
  {
    toolName: 'claim-provisional-agent-execution',
    description: 'Executes the session-bound provisional agent claim through the shipped SDK helper.',
    inputSchemaKey: 'BidviaProvisionalAgentClaimInput',
    outputMode: 'execution-result',
    helperKey: 'claimProvisionalAgent',
    capabilityKey: 'claimProvisionalAgent',
  },
  {
    toolName: 'account-agent-execution-presence-execution',
    description: 'Executes claimant execution presence through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionPresenceExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-presence-execution',
    capabilityKey: 'postAccountAgentExecutionPresence',
  },
  {
    toolName: 'account-agent-execution-sync-upload-execution',
    description: 'Executes claimant execution sync upload through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionSyncUploadExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-sync-upload-execution',
    capabilityKey: 'uploadAccountAgentExecutionSync',
  },
  {
    toolName: 'account-agent-execution-sync-download-execution',
    description: 'Executes claimant execution sync download through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentIdentifierInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-sync-download-execution',
    capabilityKey: 'downloadAccountAgentExecutionSync',
  },
  {
    toolName: 'account-agent-execution-evidence-execution',
    description: 'Executes claimant execution evidence submission through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionEvidenceExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-evidence-execution',
    capabilityKey: 'submitAccountAgentExecutionEvidence',
  },
  {
    toolName: 'account-agent-execution-proposal-execution',
    description: 'Executes claimant execution proposal submission through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionProposalExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-proposal-execution',
    capabilityKey: 'submitAccountAgentExecutionProposal',
  },
  {
    toolName: 'account-agent-execution-listing-create-execution',
    description: 'Executes claimant execution listing creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionListingCreateExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-listing-create-execution',
    capabilityKey: 'createAccountAgentExecutionListing',
  },
  {
    toolName: 'account-agent-execution-listing-activate-execution',
    description: 'Executes claimant execution listing activation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExecutionListingActivateExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-execution-listing-activate-execution',
    capabilityKey: 'activateAccountAgentExecutionListing',
  },
  {
    toolName: 'claimant-precondition-establish-canonical-company-public-execution',
    description: 'Establishes the claimant canonical company-public precondition through the productized claimant facade.',
    inputSchemaKey: 'BidviaClaimantCanonicalPreconditionInput',
    outputMode: 'execution-result',
    helperKey: 'establishClaimantCanonicalCompanyPublicPrecondition',
    capabilityKey: 'establishClaimantCanonicalCompanyPublicPrecondition',
  },
  {
    toolName: 'claimant-readiness-repair-execution',
    description: 'Repairs claimant readiness through the productized claimant facade.',
    inputSchemaKey: 'BidviaClaimantReadinessRepairExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'repairClaimantReadiness',
    capabilityKey: 'repairClaimantReadiness',
  },
  {
    toolName: 'operator-progression-match-execution',
    description: 'Runs operator matching progression through the operator product facade.',
    inputSchemaKey: 'BidviaOperatorExecutionMatchCandidatesInput',
    outputMode: 'execution-result',
    helperKey: 'runOperatorMatching',
    capabilityKey: 'runOperatorMatching',
  },
  {
    toolName: 'operator-progression-connect-execution',
    description: 'Runs operator connection progression through the operator product facade.',
    inputSchemaKey: 'BidviaOperatorConnectionExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'runOperatorConnectionContinuation',
    capabilityKey: 'runOperatorConnectionContinuation',
  },
  {
    toolName: 'operator-progression-approve-execution',
    description: 'Runs operator approval continuation through the operator product facade.',
    inputSchemaKey: 'BidviaApproveConnectionRequestInput',
    outputMode: 'execution-result',
    helperKey: 'runOperatorApprovalContinuation',
    capabilityKey: 'runOperatorApprovalContinuation',
  },
  {
    toolName: 'operator-progression-package-export-execution',
    description: 'Runs operator package export through the operator product facade.',
    inputSchemaKey: 'BidviaExportOpportunityPackageInput',
    outputMode: 'execution-result',
    helperKey: 'runOperatorPackageExport',
    capabilityKey: 'runOperatorPackageExport',
  },
  {
    toolName: 'operator-closure-commercial-action-run-execution',
    description: 'Runs operator commercial-action closure through the operator product facade.',
    inputSchemaKey: 'BidviaCommercialActionScenarioPlanInput',
    outputMode: 'execution-result',
    helperKey: 'runOperatorCommercialAction',
    capabilityKey: 'runOperatorCommercialAction',
  },
  {
    toolName: 'platform-managed-progression-run-execution',
    description: 'Runs the bounded platform-managed progression surface through the productized platform-managed facade.',
    inputSchemaKey: 'BidviaTruthFetchEmptyInput',
    outputMode: 'execution-result',
    helperKey: 'runPlatformManagedProgression',
    capabilityKey: 'runPlatformManagedProgression',
  },
  {
    toolName: 'claimant-task-entry-run-execution',
    description: 'Runs claimant task entry through the productized claimant facade.',
    inputSchemaKey: 'BidviaTaskDispatchExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'runClaimantTaskEntry',
    capabilityKey: 'runClaimantTaskEntry',
  },
  {
    toolName: 'account-agent-authorization-refresh-execution',
    description: 'Executes the claimant account-plane authorization refresh through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentAuthorizationRefreshExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-authorization-refresh-execution',
    capabilityKey: 'refreshAccountAgentAuthorization',
  },
  {
    toolName: 'account-agent-external-binding-execution',
    description: 'Executes the claimant account-plane external binding write through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAccountAgentExternalBindingExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'account-agent-external-binding-execution',
    capabilityKey: 'createAccountAgentExternalBinding',
  },
  {
    toolName: 'operator-dispatch-authority-decision-execution',
    description: 'Executes the operator/admin dispatch-authority decision through the shipped SDK helper.',
    inputSchemaKey: 'BidviaDispatchAuthorityRequestDecisionExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'operator-dispatch-authority-decision-execution',
    capabilityKey: 'decideDispatchAuthorityRequest',
  },
  {
    toolName: 'download-sync-execution',
    description: 'Executes the registration-bound sync download through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
    outputMode: 'execution-result',
    helperKey: 'download-sync-execution',
    capabilityKey: 'downloadSync',
  },
  {
    toolName: 'create-participation-state-execution',
    description: 'Executes the governed participation state creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaParticipationStateExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'create-participation-state-execution',
    capabilityKey: 'createParticipationState',
  },
  {
    toolName: 'create-lease-execution',
    description: 'Executes the governed lease creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaLeaseExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'create-lease-execution',
    capabilityKey: 'createLease',
  },
  {
    toolName: 'create-task-dispatch-execution',
    description: 'Executes the governed task dispatch creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'create-task-dispatch-execution',
    capabilityKey: 'createTaskDispatch',
  },
  {
    toolName: 'assign-task-dispatch-execution',
    description: 'Executes the governed task dispatch assignment through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchAssignExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'assign-task-dispatch-execution',
    capabilityKey: 'assignTaskDispatch',
  },
  {
    toolName: 'suspend-task-dispatch-execution',
    description: 'Executes the governed task dispatch suspension through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchSuspendExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'suspend-task-dispatch-execution',
    capabilityKey: 'suspendTaskDispatch',
  },
  {
    toolName: 'resume-task-dispatch-execution',
    description: 'Executes the governed task dispatch resume through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchResumeExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'resume-task-dispatch-execution',
    capabilityKey: 'resumeTaskDispatch',
  },
  {
    toolName: 'complete-task-dispatch-execution',
    description: 'Executes the governed task dispatch completion through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchCompleteExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'complete-task-dispatch-execution',
    capabilityKey: 'completeTaskDispatch',
  },
  {
    toolName: 'fail-task-dispatch-execution',
    description: 'Executes the governed task dispatch failure through the shipped SDK helper.',
    inputSchemaKey: 'BidviaTaskDispatchFailExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'fail-task-dispatch-execution',
    capabilityKey: 'failTaskDispatch',
  },
  {
    toolName: 'create-claim-execution',
    description: 'Executes the governed claim creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaClaimExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'create-claim-execution',
    capabilityKey: 'createClaim',
  },
  {
    toolName: 'accept-claim-execution',
    description: 'Executes the governed claim acceptance through the shipped SDK helper.',
    inputSchemaKey: 'BidviaClaimAcceptExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'accept-claim-execution',
    capabilityKey: 'acceptClaim',
  },
  {
    toolName: 'reject-claim-execution',
    description: 'Executes the governed claim rejection through the shipped SDK helper.',
    inputSchemaKey: 'BidviaClaimRejectExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'reject-claim-execution',
    capabilityKey: 'rejectClaim',
  },
  {
    toolName: 'agent-authority-profile-write-execution',
    description: 'Executes the governed agent authority profile write through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentAuthorityProfileExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'agent-authority-profile-write-execution',
    capabilityKey: 'postAgentAuthorityProfile',
  },
  {
    toolName: 'agent-authority-ladder-write-execution',
    description: 'Executes the governed agent authority ladder write through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentAuthorityLadderExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'agent-authority-ladder-write-execution',
    capabilityKey: 'postAgentAuthorityLadder',
  },
  {
    toolName: 'agent-capability-profile-write-execution',
    description: 'Executes the governed agent capability profile write through the shipped SDK helper.',
    inputSchemaKey: 'BidviaAgentCapabilityProfileExecutionInput',
    outputMode: 'execution-result',
    helperKey: 'agent-capability-profile-write-execution',
    capabilityKey: 'postAgentCapabilityProfile',
  },
  {
    toolName: 'create-commercial-action-execution',
    description: 'Executes the governed commercial action creation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaCommercialActionCreateInput',
    outputMode: 'execution-result',
    helperKey: 'create-commercial-action-execution',
    capabilityKey: 'createCommercialAction',
  },
  {
    toolName: 'request-commercial-action-approval-execution',
    description: 'Executes the governed commercial action approval request through the shipped SDK helper.',
    inputSchemaKey: 'BidviaCommercialActionRequestApprovalInput',
    outputMode: 'execution-result',
    helperKey: 'request-commercial-action-approval-execution',
    capabilityKey: 'requestCommercialActionApproval',
  },
  {
    toolName: 'execute-commercial-action-execution',
    description: 'Executes the governed commercial action continuation through the shipped SDK helper.',
    inputSchemaKey: 'BidviaCommercialActionExecuteInput',
    outputMode: 'execution-result',
    helperKey: 'execute-commercial-action-execution',
    capabilityKey: 'executeCommercialAction',
  },
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
    toolName: 'industry-universe-execution',
    description: 'Executes the bounded industry universe scenario over the local scenario executor layer.',
    inputSchemaKey: 'BidviaIndustryUniverseScenarioPlanInput',
    outputMode: 'execution-result',
    helperKey: 'executeIndustryUniverseScenario',
    capabilityKey: 'executeIndustryUniverseScenario',
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
  ...widenedShippedReadMcpBindings,
  ...widenedShippedExecutionMcpBindings,
];

function buildRouteCapabilityMap(): Map<string, BidviaRouteCapability> {
  return new Map(exportRouteCapabilityCatalog().map((capability) => [capability.helperKey, capability]));
}

function getExecutionGate(helperKey: string): BidviaPlaneExecutionGate | undefined {
  return getPlaneExecutionGate(helperKey);
}

function getDiscoveryKind(capability: BidviaRouteCapability): BidviaLocalDiscoveryKind {
  const executionGate = getExecutionGate(capability.helperKey);

  if (capability.scope === 'read') {
    return 'read';
  }

  if (capability.localCapabilityRiskTier === 'review-safe') {
    return 'review-safe';
  }

  if (executionGate && executionGate.executionTruth !== 'packet-grounded-execution') {
    return 'blocked';
  }

  return 'execute';
}

function buildExecutionDiscoverability(helperKey: string): {
  runnable: boolean;
  blockedBy: string | null;
} {
  const executionGate = getExecutionGate(helperKey);
  if (!executionGate) {
    return {
      runnable: true,
      blockedBy: null,
    };
  }

  return {
    runnable: executionGate.executionTruth === 'packet-grounded-execution',
    blockedBy: executionGate.blockedBy,
  };
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

function shouldExposeMcpBinding(binding: BidviaLocalDiscoveryMcpBinding): boolean {
  if (binding.outputMode !== 'execution-result') {
    return true;
  }

  const helperKey = binding.capabilityKey ?? binding.helperKey;
  return buildExecutionDiscoverability(helperKey).runnable;
}

function createLocalMcpToolDescriptor(binding: BidviaLocalDiscoveryMcpBinding): BidviaMcpToolDescriptor {
  const capability = getRouteCapabilityFromLocalCatalog(binding.capabilityKey ?? binding.helperKey);
  if (!capability) {
    throw new Error(`missing MCP capability metadata for ${binding.toolName}`);
  }

  const contextSemantic = capability.contextSemantic !== capability.accessContextFamily
    ? capability.contextSemantic
    : undefined;
  const roleStageSemantics = getRoleStageSemantics(binding.helperKey);

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
    ...(contextSemantic ? { contextSemantic } : {}),
    requiredContext: [...capability.requiredContext],
    ...(capability.capabilityPlaneCapabilityMode === undefined
      ? {}
      : { capabilityPlaneCapabilityMode: capability.capabilityPlaneCapabilityMode }),
    ...(capability.dispatchEligibilityDerivedFromCapabilityReadTruth === undefined
      ? {}
      : {
          dispatchEligibilityDerivedFromCapabilityReadTruth:
            capability.dispatchEligibilityDerivedFromCapabilityReadTruth,
        }),
    ...(capability.governedRunAuthorizationDerivedFromCapabilityReadTruth === undefined
      ? {}
      : {
          governedRunAuthorizationDerivedFromCapabilityReadTruth:
            capability.governedRunAuthorizationDerivedFromCapabilityReadTruth,
        }),
    ...(binding.outputMode !== 'execution-result'
      ? {}
      : buildExecutionDiscoverability(binding.capabilityKey ?? binding.helperKey)),
    ...(capability.taskPlaneCapabilityMode === undefined
      ? {}
      : { taskPlaneCapabilityMode: capability.taskPlaneCapabilityMode }),
    ...(capability.eventNotificationPlaneCapabilityMode === undefined
      ? {}
      : { eventNotificationPlaneCapabilityMode: capability.eventNotificationPlaneCapabilityMode }),
    ...(roleStageSemantics ?? {}),
  };
}

export function buildLocalRouteCapabilityCatalog(): BidviaRouteCapability[] {
  return exportRouteCapabilityCatalog();
}

export function buildLocalDiagnosticCommandCatalog(): BidviaLocalDiagnosticCommandDescriptor[] {
  return localDiagnosticCommandCatalog.map((entry) => ({
    ...entry,
  }));
}

export function getRouteCapabilityFromLocalCatalog(helperKey: string): BidviaRouteCapability | undefined {
  return buildRouteCapabilityMap().get(helperKey);
}

export function buildLocalMcpToolCatalog(): BidviaMcpToolDescriptor[] {
  return localMcpBindings
    .filter((binding) => shouldExposeMcpBinding(binding))
    .map((binding) => createLocalMcpToolDescriptor(binding));
}

export function getLocalMcpToolDescriptor(toolName: string): BidviaMcpToolDescriptor | undefined {
  return buildLocalMcpToolCatalog().find((tool) => tool.toolName === toolName);
}

export function buildLocalDiscoveryCatalog(): BidviaLocalDiscoveryCatalogEntry[] {
  const routeCapabilities = buildLocalRouteCapabilityCatalog();
  const discoveryBoundary = buildCapabilityPlaneDiscoveryBoundary();

  return routeCapabilities.map((capability) => {
    const cliBindings = localCliBindings.filter((binding) => binding.helperKey === capability.helperKey);
    const mcpBindings = localMcpBindings.filter(
      (binding) => shouldExposeMcpBinding(binding)
        && (binding.capabilityKey ?? binding.helperKey) === capability.helperKey,
    );
    const contextSemantic = capability.contextSemantic !== capability.accessContextFamily
      ? capability.contextSemantic
      : undefined;
    const executionDiscoverability = capability.scope === 'read' || capability.localCapabilityRiskTier === 'review-safe'
      ? undefined
      : buildExecutionDiscoverability(capability.helperKey);
    const roleStageSemantics = getRoleStageSemantics(capability.helperKey);

    return {
      helperKey: capability.helperKey,
      routePathTemplate: capability.routePathTemplate,
      httpMethod: capability.httpMethod,
      accessContextFamily: capability.accessContextFamily,
      ...(contextSemantic ? { contextSemantic } : {}),
      requiredContext: [...capability.requiredContext],
      scope: capability.scope,
      level: capability.level,
      localCapabilityTier: capability.localCapabilityTier,
      localCapabilityRiskTier: capability.localCapabilityRiskTier,
      ...(capability.capabilityPlaneCapabilityMode === undefined
        ? {}
        : { capabilityPlaneCapabilityMode: capability.capabilityPlaneCapabilityMode }),
      ...(capability.dispatchEligibilityDerivedFromCapabilityReadTruth === undefined
        ? {}
        : {
            dispatchEligibilityDerivedFromCapabilityReadTruth:
              capability.dispatchEligibilityDerivedFromCapabilityReadTruth,
          }),
      ...(capability.governedRunAuthorizationDerivedFromCapabilityReadTruth === undefined
        ? {}
        : {
            governedRunAuthorizationDerivedFromCapabilityReadTruth:
              capability.governedRunAuthorizationDerivedFromCapabilityReadTruth,
          }),
      discoveryKind: getDiscoveryKind(capability),
      recommendedOutputMode: buildRecommendedOutputMode(cliBindings, mcpBindings, capability),
      sourceOfTruth: discoveryBoundary.sourceOfTruth,
      localOnly: discoveryBoundary.localOnly,
      remoteDiscovery: discoveryBoundary.remoteDiscovery,
      ...(executionDiscoverability ?? {}),
      ...(capability.taskPlaneCapabilityMode === undefined
        ? {}
        : { taskPlaneCapabilityMode: capability.taskPlaneCapabilityMode }),
      ...(capability.eventNotificationPlaneCapabilityMode === undefined
        ? {}
        : { eventNotificationPlaneCapabilityMode: capability.eventNotificationPlaneCapabilityMode }),
      ...(roleStageSemantics ?? {}),
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
  const discoveryBoundary = buildCapabilityPlaneDiscoveryBoundary();

  return {
    serverBoundary: {
      transport: 'stdio',
      hosted: discoveryBoundary.hosted,
      remoteDiscovery: discoveryBoundary.remoteDiscovery,
      sourceOfTruth: discoveryBoundary.sourceOfTruth,
    },
    discoverability: {
      truthFetchReadOnly: true,
      reviewSafeLocalOnly: true,
      executionRequiresLocalExecutionClient: true,
    },
    tools: buildLocalMcpToolCatalog().map((tool) => buildMcpOperatorToolDiscovery(tool)),
  };
}

export function buildEnterpriseIntegrationDiscoverySnapshot(): {
  plane: 'enterprise-integration';
  helperGroups: Array<BidviaEnterpriseIntegrationPlaneHelperGroup & { presentDiscoveryEntries: string[] }>;
} {
  const plane = buildEnterpriseIntegrationPlaneView();
  const discoveryCatalog = buildLocalDiscoveryCatalog();

  return {
    plane: 'enterprise-integration',
    helperGroups: plane.helperGroups.map((helperGroup) => ({
      ...helperGroup,
      presentDiscoveryEntries: discoveryCatalog
        .filter((entry) => helperGroup.discoveryHelperKeys.includes(entry.helperKey))
        .map((entry) => entry.helperKey),
    })),
  };
}
