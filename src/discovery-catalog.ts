import type {
  BidviaEnterpriseIntegrationPlaneHelperGroup,
  BidviaMcpToolDescriptor,
  BidviaMcpToolOutputMode,
  BidviaPlaneExecutionGate,
  BidviaRouteCapability,
} from './contracts.js';
import { buildCapabilityPlaneDiscoveryBoundary } from './capability-plane.js';
import { buildEnterpriseIntegrationPlaneView } from './enterprise-integration-plane.js';
import { exportRouteCapabilityCatalog } from './capabilities.js';
import { getPlaneExecutionGate } from './plane-execution-gate.js';

type BidviaLocalDiscoveryKind = 'read' | 'review-safe' | 'execute' | 'blocked';

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
  | 'contextSemantic'
  | 'requiredContext'
  | 'scope'
  | 'level'
  | 'localCapabilityTier'
  | 'localCapabilityRiskTier'
  | 'taskPlaneCapabilityMode'
  | 'eventNotificationPlaneCapabilityMode'
> {
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

const widenedShippedReadMcpBindings: readonly BidviaLocalDiscoveryMcpBinding[] = [
  {
    toolName: 'query-provisional-agent-read',
    description: 'Reads public provisional agent status through the shipped SDK helper.',
    inputSchemaKey: 'BidviaQueryProvisionalAgentInput',
    outputMode: 'truth-fetch-result',
    helperKey: 'queryProvisionalAgent',
    capabilityKey: 'queryProvisionalAgent',
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
    inputSchemaKey: 'BidviaAgentRegistrationIdentifierInput',
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
];

const widenedShippedExecutionMcpBindings: readonly BidviaLocalDiscoveryMcpBinding[] = [
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

  if (executionGate?.executionTruth === 'blocked-pending-packet') {
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
    runnable: executionGate.executionTruth !== 'blocked-pending-packet',
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

function createLocalMcpToolDescriptor(binding: BidviaLocalDiscoveryMcpBinding): BidviaMcpToolDescriptor {
  const capability = getRouteCapabilityFromLocalCatalog(binding.capabilityKey ?? binding.helperKey);
  if (!capability) {
    throw new Error(`missing MCP capability metadata for ${binding.toolName}`);
  }

  const contextSemantic = capability.contextSemantic !== capability.accessContextFamily
    ? capability.contextSemantic
    : undefined;

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
    ...(binding.outputMode !== 'execution-result'
      ? {}
      : buildExecutionDiscoverability(binding.capabilityKey ?? binding.helperKey)),
    ...(capability.taskPlaneCapabilityMode === undefined
      ? {}
      : { taskPlaneCapabilityMode: capability.taskPlaneCapabilityMode }),
    ...(capability.eventNotificationPlaneCapabilityMode === undefined
      ? {}
      : { eventNotificationPlaneCapabilityMode: capability.eventNotificationPlaneCapabilityMode }),
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
  const discoveryBoundary = buildCapabilityPlaneDiscoveryBoundary();

  return routeCapabilities.map((capability) => {
    const cliBindings = localCliBindings.filter((binding) => binding.helperKey === capability.helperKey);
    const mcpBindings = localMcpBindings.filter(
      (binding) => (binding.capabilityKey ?? binding.helperKey) === capability.helperKey,
    );
    const contextSemantic = capability.contextSemantic !== capability.accessContextFamily
      ? capability.contextSemantic
      : undefined;
    const executionDiscoverability = capability.scope === 'read' || capability.localCapabilityRiskTier === 'review-safe'
      ? undefined
      : buildExecutionDiscoverability(capability.helperKey);

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
