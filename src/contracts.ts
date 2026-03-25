import type {
  BidviaOpportunityPackageHandoffPlan,
  BidviaOpportunityPackageHandoffPlanInput,
} from './handoffs.js';
import type { BidviaEnvironmentMode } from './config.js';
import type {
  BidviaIndustryUniverseScenarioPlan,
  BidviaIndustryUniverseScenarioPlanInput,
} from './universe.js';

export interface BidviaClientContext {
  tenantId: string;
  principalId?: string;
  registrationId?: string;
  sessionId?: string;
  adminSessionId?: string;
  companyId?: string;
}

export interface BidviaProvisionalAgentCreateInput {
  provisionalAgentRef: string;
  now: string;
}

export interface BidviaProvisionalAgentClaimInput {
  provisionalAgentRef: string;
  claimToken: string;
  now: string;
}

export interface BidviaHeartbeatInput {
  now: string;
  expiresAt: string;
}

export interface BidviaSyncUploadInput {
  cursorRef: string;
  objectCount: number;
  now: string;
}

export interface BidviaEvidenceSubmissionInput {
  evidenceRef: string;
  evidenceKind: string;
  summary: string;
  now: string;
}

export interface BidviaProposalSubmissionInput {
  proposalType: string;
  proposalRef: string;
  summary: string;
  now: string;
}

export interface BidviaQueryProvisionalAgentInput {
  provisionalAgentRef: string;
}

export interface BidviaRegistrationLifecycleScenarioPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  createProvisionalAgent: BidviaProvisionalAgentCreateInput;
  queryProvisionalAgent: BidviaQueryProvisionalAgentInput;
  claimProvisionalAgent: BidviaProvisionalAgentClaimInput;
  postHeartbeat: BidviaHeartbeatInput;
  uploadSync: BidviaSyncUploadInput;
  submitEvidence: BidviaEvidenceSubmissionInput;
  submitProposal: BidviaProposalSubmissionInput;
  registrationId: string;
}

export interface BidviaRegistrationLifecycleScenarioPlan {
  envelope: BidviaScenarioEnvelope;
  createProvisionalAgentInput: BidviaProvisionalAgentCreateInput;
  queryProvisionalAgentRef: string;
  claimProvisionalAgentInput: BidviaProvisionalAgentClaimInput;
  postHeartbeatInput: BidviaHeartbeatInput;
  uploadSyncInput: BidviaSyncUploadInput;
  submitEvidenceInput: BidviaEvidenceSubmissionInput;
  submitProposalInput: BidviaProposalSubmissionInput;
  registrationId: string;
}

export interface BidviaRegisteredAgentOperationsScenarioPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  postHeartbeat: BidviaHeartbeatInput;
  uploadSync: BidviaSyncUploadInput;
  submitEvidence: BidviaEvidenceSubmissionInput;
  submitProposal: BidviaProposalSubmissionInput;
  registrationId: string;
}

export interface BidviaRegisteredAgentOperationsScenarioPlan {
  envelope: BidviaScenarioEnvelope;
  postHeartbeatInput: BidviaHeartbeatInput;
  uploadSyncInput: BidviaSyncUploadInput;
  submitEvidenceInput: BidviaEvidenceSubmissionInput;
  submitProposalInput: BidviaProposalSubmissionInput;
  registrationId: string;
}

export interface BidviaCommercialActionCreateInput {
  governedAction: string;
  subjectType: string;
  subjectId: string;
  traceId: string;
  workflowId: string;
  now: string;
}

export interface BidviaCommercialActionStatusInput {
  commercialActionRequestId: string;
}

export interface BidviaCommercialActionPolicyCheckInput {
  commercialActionRequestId: string;
  policyVersion: string;
  outcome: string;
  now: string;
}

export interface BidviaCommercialActionRequestApprovalInput {
  commercialActionRequestId: string;
  approvalRequestId: string;
  now: string;
}

export interface BidviaCommercialActionExecuteInput {
  commercialActionRequestId: string;
  approvalRequestId: string;
  receiptId: string;
  approvalResult: string;
  resultStatus: string;
  auditId: string;
  now: string;
}

export interface BidviaCommercialActionScenarioPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  createCommercialAction: BidviaCommercialActionCreateInput;
  policyCheckCommercialAction: BidviaCommercialActionPolicyCheckInput;
  requestCommercialActionApproval: BidviaCommercialActionRequestApprovalInput;
  executeCommercialAction: BidviaCommercialActionExecuteInput;
}

export interface BidviaCommercialActionScenarioPlan {
  envelope: BidviaScenarioEnvelope;
  createCommercialActionInput: BidviaCommercialActionCreateInput;
  policyCheckCommercialActionInput: BidviaCommercialActionPolicyCheckInput;
  requestCommercialActionApprovalInput: BidviaCommercialActionRequestApprovalInput;
  executeCommercialActionInput: BidviaCommercialActionExecuteInput;
}

export interface BidviaCreateListingInput {
  listingId: string;
  listingType: string;
  category: string;
  sku: string;
  quantityValue: string;
  quantityUnit: string;
  regionSummary: string;
  verificationStatus: string;
  freshnessTs: string;
  traceId: string;
  idempotencyKey: string;
  now: string;
}

export interface BidviaActivateListingInput {
  listingId: string;
  now: string;
}

export interface BidviaGenerateMatchCandidatesInput {
  listingId: string;
  upstreamDecision: string;
  requiredEvidenceLevel: number;
  detectedEvidenceLevel: number;
  workflowRunId: string;
  triggerEventId: string;
  topN: number;
  now: string;
}

export interface BidviaCreateConnectionRequestInput {
  sourceMatchId: string;
  requesterActorId: string;
  requesterCompanyId: string;
  riskTier: string;
  policyVersion: string;
  approvalMatrixVersion: string;
  actionType: string;
  now: string;
}

export interface BidviaApproveConnectionRequestInput {
  approvalRequestId: string;
  actorId: string;
  decision: string;
  now: string;
}

export interface BidviaConnectionApprovalScenarioPlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  createConnectionRequest: BidviaCreateConnectionRequestInput;
  approveConnectionRequest: BidviaApproveConnectionRequestInput;
}

export interface BidviaConnectionApprovalScenarioPlan {
  envelope: BidviaScenarioEnvelope;
  createConnectionRequestInput: BidviaCreateConnectionRequestInput;
  approveConnectionRequestInput: BidviaApproveConnectionRequestInput;
}

export interface BidviaExportOpportunityPackageInput {
  opportunityId: string;
  renderTemplateId: string;
  contentRef: string;
  redactionProfile: string;
  targetSystem: string;
  operationType: string;
  nodeId: string;
  runtimeId: string;
  agentId: string;
  boundAccountId: string;
  now: string;
}

export type BidviaScenarioContextKey = keyof BidviaClientContext;

export const bidviaRouteCapabilityHttpMethods = ['GET', 'POST'] as const;

export type BidviaRouteCapabilityHttpMethod = (typeof bidviaRouteCapabilityHttpMethods)[number];

export const bidviaRouteCapabilityAccessContextFamilies = [
  'tenant',
  'registration',
  'session',
  'admin-session',
  'operator-company',
  'scenario',
] as const;

export type BidviaRouteCapabilityAccessContextFamily =
  (typeof bidviaRouteCapabilityAccessContextFamilies)[number];

export const bidviaRouteCapabilityScopes = ['read', 'write'] as const;

export type BidviaRouteCapabilityScope = (typeof bidviaRouteCapabilityScopes)[number];

export const bidviaRouteCapabilityLevels = ['atomic-route', 'chain-step', 'scenario-helper'] as const;

export type BidviaRouteCapabilityLevel = (typeof bidviaRouteCapabilityLevels)[number];

export interface BidviaScenarioRouteStep {
  routeKey: string;
  requiredContext: BidviaScenarioContextKey[];
}

export interface BidviaRouteCapability {
  helperKey: string;
  routePathTemplate: string;
  httpMethod: BidviaRouteCapabilityHttpMethod;
  accessContextFamily: BidviaRouteCapabilityAccessContextFamily;
  requiredContext: BidviaScenarioContextKey[];
  scope: BidviaRouteCapabilityScope;
  level: BidviaRouteCapabilityLevel;
  scenarioRouteSteps?: BidviaScenarioRouteStep[];
}

export interface BidviaScenarioEnvelopeRecordIds {
  registrations?: string[];
  listings?: string[];
  matches?: string[];
  connections?: string[];
  approvals?: string[];
  receipts?: string[];
  opportunities?: string[];
  packages?: string[];
  commercialActions?: string[];
}

export interface BidviaScenarioEnvelope {
  scenarioId: string;
  scenarioLabel: string;
  scenarioFamily: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  expectedRouteChain: BidviaScenarioRouteStep[];
  recordIds?: BidviaScenarioEnvelopeRecordIds;
}

export type BidviaVerificationMode = 'review-safe' | 'sandbox' | 'production';

export interface BidviaVerificationBundleRecordIds extends BidviaScenarioEnvelopeRecordIds {}

export interface BidviaVerificationBundle {
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  recordIds: BidviaVerificationBundleRecordIds;
}

export interface BidviaScenarioVerificationBundle extends BidviaVerificationBundle {
  scenarioId: string;
  scenarioFamily: string;
  verificationMode: BidviaVerificationMode;
  expectedRouteChain: BidviaScenarioRouteStep[];
  completedRouteChain: BidviaScenarioRouteStep[];
}

export const bidviaReviewPacketStatuses = ['complete', 'partial', 'pending-review'] as const;

export type BidviaReviewPacketStatus = (typeof bidviaReviewPacketStatuses)[number];

export const bidviaReviewPacketSectionKeys = ['scenario', 'routes', 'records'] as const;

export type BidviaReviewPacketSectionKey = (typeof bidviaReviewPacketSectionKeys)[number];

export interface BidviaReviewPacketSummary {
  sourceRefCount: number;
  evidenceRefCount: number;
  workflowIdCount: number;
  expectedRouteCount: number;
  completedRouteCount: number;
}

export type BidviaReviewPacketRecordGroupKey = keyof BidviaScenarioEnvelopeRecordIds;

export interface BidviaReviewPacketRouteDetail {
  routeKey: string;
  requiredContext: BidviaScenarioContextKey[];
  completed: boolean;
}

export interface BidviaReviewPacketRecordDetail {
  recordGroupKey: BidviaReviewPacketRecordGroupKey;
  count: number;
  ids: string[];
}

export interface BidviaReviewPacketDetail {
  routeDetails: BidviaReviewPacketRouteDetail[];
  recordDetails: BidviaReviewPacketRecordDetail[];
}

export interface BidviaReviewPacketSection {
  sectionKey: BidviaReviewPacketSectionKey;
  title: string;
  entries: string[];
}

export interface BidviaReviewPacket {
  scenarioId: string;
  scenarioLabel: string;
  scenarioFamily: string;
  verificationMode: BidviaVerificationMode;
  status: BidviaReviewPacketStatus;
  summary: BidviaReviewPacketSummary;
  details: BidviaReviewPacketDetail;
  sections: BidviaReviewPacketSection[];
}

export const bidviaMcpToolOutputModes = [
  'plan-preview',
  'review-packet-preview',
  'review-packet-export',
] as const;

export type BidviaMcpToolOutputMode = (typeof bidviaMcpToolOutputModes)[number];

export interface BidviaMcpToolInputSchemaRef {
  schemaKey: string;
}

export interface BidviaMcpToolHelperRef {
  helperKey: string;
  capabilityKey?: string;
}

export interface BidviaMcpToolDescriptor {
  toolName: string;
  description: string;
  inputSchemaRef: BidviaMcpToolInputSchemaRef;
  outputMode: BidviaMcpToolOutputMode;
  helperRef: BidviaMcpToolHelperRef;
}

export interface BidviaMcpToolCallRequest {
  toolName: string;
  arguments: unknown;
}

export interface BidviaMcpToolCallResponse<Result = unknown> {
  toolName: string;
  outputMode: BidviaMcpToolOutputMode;
  result: Result;
}

export const bidviaCoordinatorExternalHandoffStatuses = ['requires-caller-known-ids'] as const;

export type BidviaCoordinatorExternalHandoffStatus =
  (typeof bidviaCoordinatorExternalHandoffStatuses)[number];

export interface BidviaApprovalOpportunityExternalHandoffBoundary {
  boundaryKey: 'approval-to-opportunity';
  status: BidviaCoordinatorExternalHandoffStatus;
  approvalRequestId: string;
  requiredKnownIds: ['opportunityId'];
  suppliedKnownIds: {
    opportunityId: string;
  };
}

export interface BidviaMultiBusinessChainCoordinatorPlanInput {
  coordinatorId: string;
  coordinatorLabel: string;
  industryUniverse: BidviaIndustryUniverseScenarioPlanInput;
  connectionApproval: BidviaConnectionApprovalScenarioPlanInput;
  opportunityPackageHandoff: BidviaOpportunityPackageHandoffPlanInput;
  commercialActionContinuation?: BidviaCommercialActionScenarioPlanInput;
}

export interface BidviaMultiBusinessChainCoordinatorPlan {
  coordinatorId: string;
  coordinatorLabel: string;
  industryUniverse: BidviaIndustryUniverseScenarioPlan;
  connectionApproval: BidviaConnectionApprovalScenarioPlan;
  externalHandoffBoundary: BidviaApprovalOpportunityExternalHandoffBoundary;
  opportunityPackageHandoff: BidviaOpportunityPackageHandoffPlan;
  commercialActionContinuation?: BidviaCommercialActionScenarioPlan;
}

export const bidviaRuntimeCapabilityKnowledgeSources = [
  'local-static',
  'deferred-server-negotiation',
] as const;

export type BidviaRuntimeCapabilityKnowledgeSource =
  (typeof bidviaRuntimeCapabilityKnowledgeSources)[number];

export interface BidviaLocalRouteCapabilityKnowledge {
  source: 'local-static';
  items: BidviaRouteCapability[];
}

export interface BidviaLocalMcpToolKnowledge {
  source: 'local-static';
  items: BidviaMcpToolDescriptor[];
}

export interface BidviaLocalMcpServerAvailability {
  source: 'local-static';
  available: true;
  transport: 'stdio';
  entrypoint: 'src/mcp-server.ts';
  supportedMethods: ['initialize', 'tools/list', 'tools/call'];
}

export interface BidviaDeferredServerCapabilityNegotiation {
  source: 'deferred-server-negotiation';
  status: 'deferred';
  serverProvidedCapabilitiesKnown: false;
}

export interface BidviaLocalRuntimeCapabilitySnapshot {
  baseUrl: string;
  environmentMode: BidviaEnvironmentMode;
  routeCapabilities: BidviaLocalRouteCapabilityKnowledge;
  mcpTools: BidviaLocalMcpToolKnowledge;
  localMcpServer: BidviaLocalMcpServerAvailability;
  deferredServerNegotiation: BidviaDeferredServerCapabilityNegotiation;
}
