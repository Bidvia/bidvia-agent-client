import type {
  BidviaOpportunityPackageHandoffPlan,
  BidviaOpportunityPackageHandoffPlanInput,
} from './handoffs.js';
import type { BidviaEnvironmentMode } from './config.js';
import type {
  BidviaIndustryUniverseScenarioPlan,
  BidviaIndustryUniverseScenarioPlanInput,
} from './universe.js';
import type {
  BidviaTaskAckShell,
  BidviaTaskLeaseShell,
  BidviaTaskOfferShell,
} from './task-participation.js';

export interface BidviaClientContext {
  tenantId: string;
  principalId?: string;
  registrationId?: string;
  sessionId?: string;
  adminSessionId?: string;
  companyId?: string;
}

export interface BidviaClientAuth {
  authorization?: string;
  bearerToken?: string;
}

export interface BidviaClientRequestDescriptor {
  method: BidviaRouteCapabilityHttpMethod;
  path: string;
  context: BidviaClientContext;
}

export type BidviaClientHeaders = Record<string, string>;

export type BidviaClientHeadersProvider = (
  request: BidviaClientRequestDescriptor,
) => BidviaMaybePromise<BidviaClientHeaders | undefined>;

export type BidviaClientAuthProvider = (
  request: BidviaClientRequestDescriptor,
) => BidviaMaybePromise<BidviaClientAuth | undefined>;

export type BidviaClientAuthInput = BidviaClientAuth | BidviaClientAuthProvider;

export type BidviaClientHeadersInput = BidviaClientHeaders | BidviaClientHeadersProvider;

export type BidviaMaybePromise<Value> = Value | Promise<Value>;

export const bidviaClientTransportErrorKinds = [
  'aborted',
  'timeout',
  'connection',
  'invalid_request',
  'auth',
  'permission',
  'not_found',
  'conflict',
  'rate_limit',
  'server',
  'unknown',
] as const;

export type BidviaClientTransportErrorKind =
  (typeof bidviaClientTransportErrorKinds)[number];

export interface BidviaClientRequestPolicy {
  timeoutMs?: number;
  signal?: AbortSignal;
  context?: Partial<BidviaClientContext>;
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

export const bidviaLocalCapabilityTiers = [
  'L0-observe-only',
  'L1-review-safe',
  'L2-registration-runtime',
  'L3-governed-commercial',
] as const;

export type BidviaLocalCapabilityTier = (typeof bidviaLocalCapabilityTiers)[number];

export const bidviaLocalCapabilityRiskTiers = [
  'observe-only',
  'review-safe',
  'runtime-execution',
  'governed-commercial',
] as const;

export type BidviaLocalCapabilityRiskTier = (typeof bidviaLocalCapabilityRiskTiers)[number];

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
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
  scenarioRouteSteps?: BidviaScenarioRouteStep[];
}

export interface BidviaScenarioEnvelopeRecordIds {
  registrations?: string[];
  proposals?: string[];
  reviews?: string[];
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

export const bidviaReviewPacketSectionKeys = [
  'scenario',
  'evidence',
  'traceability',
  'routes',
  'verification',
  'records',
] as const;

export type BidviaReviewPacketSectionKey = (typeof bidviaReviewPacketSectionKeys)[number];

export interface BidviaReviewPacketSummary {
  sourceRefCount: number;
  evidenceRefCount: number;
  traceIdCount: number;
  workflowIdCount: number;
  expectedRouteCount: number;
  completedRouteCount: number;
  pendingRouteCount: number;
  recordGroupCount: number;
  totalRecordCount: number;
}

export interface BidviaReviewPacketBoundaryDetail {
  derivedFromScenarioFacts: true;
  derivedFromVerificationFacts: true;
  serverTruthClaimed: false;
  adjudicationOutcomeIncluded: false;
}

export interface BidviaReviewPacketVerificationDetail {
  expectedRouteKeys: string[];
  completedRouteKeys: string[];
  pendingRouteKeys: string[];
  totalRecordCount: number;
}

export type BidviaReviewPacketRecordGroupKey = keyof BidviaScenarioEnvelopeRecordIds;

export interface BidviaReviewPacketRouteDetail {
  sequence: number;
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
  boundary: BidviaReviewPacketBoundaryDetail;
  verification: BidviaReviewPacketVerificationDetail;
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
  'execution-result',
] as const;

export type BidviaMcpToolOutputMode = (typeof bidviaMcpToolOutputModes)[number];

export const bidviaMcpServerSupportedMethods = [
  'initialize',
  'tools/list',
  'tools/call',
] as const;

export type BidviaMcpServerSupportedMethod = (typeof bidviaMcpServerSupportedMethods)[number];

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
  localCapabilityTier: BidviaLocalCapabilityTier;
  localCapabilityRiskTier: BidviaLocalCapabilityRiskTier;
  accessContextFamily: BidviaRouteCapabilityAccessContextFamily;
  requiredContext: BidviaScenarioContextKey[];
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

export const bidviaNormalizationLayers = [
  'canonical-input',
  'normalized-working-view',
  'cached-working-view',
  'local-snapshot-metadata',
  'cache-metadata',
  'freshness-metadata',
] as const;

export type BidviaNormalizationLayer = (typeof bidviaNormalizationLayers)[number];

export const bidviaNormalizationSnapshotSources = [
  'local-static',
  'server-derived',
  'deferred-server-negotiation',
] as const;

export type BidviaNormalizationSnapshotSource =
  (typeof bidviaNormalizationSnapshotSources)[number];

export interface BidviaCanonicalInput<Value> {
  layer: 'canonical-input';
  value: Value;
}

export interface BidviaNormalizedWorkingView<CanonicalValue, NormalizedValue> {
  layer: 'normalized-working-view';
  canonical: BidviaCanonicalInput<CanonicalValue>;
  value: NormalizedValue;
}

export interface BidviaLocalSnapshotMetadata {
  layer: 'local-snapshot-metadata';
  source: BidviaNormalizationSnapshotSource;
  schemaVersion: string;
  capturedAt: string;
}

export interface BidviaCacheMetadata {
  layer: 'cache-metadata';
  cacheKey: string;
  cachedAt: string;
}

export interface BidviaFreshnessMetadata {
  layer: 'freshness-metadata';
  observedAt: string;
  stale: boolean;
  expiresAt?: string;
}

export interface BidviaCachedWorkingView<CanonicalValue, NormalizedValue> {
  layer: 'cached-working-view';
  canonical: BidviaCanonicalInput<CanonicalValue>;
  normalized: BidviaNormalizedWorkingView<CanonicalValue, NormalizedValue>;
  snapshot: BidviaLocalSnapshotMetadata;
  cache: BidviaCacheMetadata;
  freshness: BidviaFreshnessMetadata;
}

export const bidviaGovernedAgentStateKinds = [
  'registration',
  'identity',
  'binding',
  'participation-state',
  'presence',
  'readiness',
  'authority',
] as const;

export type BidviaGovernedAgentStateKind = (typeof bidviaGovernedAgentStateKinds)[number];

export const bidviaAgentRegistrationStatuses = [
  'unregistered',
  'provisional',
  'claimed',
  'registered',
  'revoked',
] as const;

export type BidviaAgentRegistrationStatus = (typeof bidviaAgentRegistrationStatuses)[number];

export const bidviaAgentBindingStatuses = [
  'unbound',
  'tenant-bound',
  'registration-bound',
] as const;

export type BidviaAgentBindingStatus = (typeof bidviaAgentBindingStatuses)[number];

export const bidviaParticipationStatuses = [
  'not-participating',
  'eligible',
  'invited',
  'accepted',
  'leased',
  'timed-out',
  'completed',
] as const;

export type BidviaParticipationStatus = (typeof bidviaParticipationStatuses)[number];

export const bidviaPresenceStatuses = ['unknown', 'online', 'offline'] as const;

export type BidviaPresenceStatus = (typeof bidviaPresenceStatuses)[number];

export const bidviaReadinessStatuses = ['unknown', 'ready', 'not-ready'] as const;

export type BidviaReadinessStatus = (typeof bidviaReadinessStatuses)[number];

export const bidviaAuthorityStatuses = [
  'unknown',
  'none',
  'self-asserted',
  'delegated',
  'governed',
] as const;

export type BidviaAuthorityStatus = (typeof bidviaAuthorityStatuses)[number];

export interface BidviaAgentRegistrationState {
  kind: 'registration';
  status: BidviaAgentRegistrationStatus;
  registrationId?: string;
}

export interface BidviaAgentIdentityRecord {
  agentId: string;
  principalId?: string;
  tenantId?: string;
  registrationId?: string;
}

export interface BidviaAgentIdentityState<
  CanonicalIdentity = BidviaAgentIdentityRecord,
  NormalizedIdentity = CanonicalIdentity,
> {
  kind: 'identity';
  identity: BidviaCachedWorkingView<CanonicalIdentity, NormalizedIdentity>;
}

export interface BidviaAgentBindingState {
  kind: 'binding';
  status: BidviaAgentBindingStatus;
  tenantId?: string;
  registrationId?: string;
}

export interface BidviaAgentParticipationState {
  kind: 'participation-state';
  status: BidviaParticipationStatus;
  taskId?: string;
}

export interface BidviaAgentPresenceState {
  kind: 'presence';
  status: BidviaPresenceStatus;
  observedAt: string;
}

export interface BidviaAgentReadinessState {
  kind: 'readiness';
  status: BidviaReadinessStatus;
  observedAt: string;
  rationale?: string;
}

export interface BidviaAgentAuthorityState {
  kind: 'authority';
  status: BidviaAuthorityStatus;
  observedAt: string;
  grantedBy?: string;
}

export interface BidviaAgentRegistrationIdentifierInput {
  agentRegistrationId: string;
}

export interface BidviaAccountAgentRecord {
  agentRegistrationId: string;
  agentId?: string;
  principalId?: string;
  tenantId?: string;
  registrationStatus?: BidviaAgentRegistrationStatus;
  bindingStatus?: BidviaAgentBindingStatus;
  participationStatus?: BidviaParticipationStatus;
  observedAt?: string;
}

export interface BidviaListAccountAgentsResponse {
  accountAgents: BidviaAccountAgentRecord[];
}

export interface BidviaGetAccountAgentResponse {
  accountAgent: BidviaAccountAgentRecord;
}

export interface BidviaAccountAgentBindingRecord {
  agentRegistrationId: string;
  tenantId: string;
  principalId?: string;
  bindingStatus: BidviaAgentBindingStatus;
  observedAt?: string;
}

export interface BidviaListAccountAgentBindingsResponse {
  accountAgentBindings: BidviaAccountAgentBindingRecord[];
}

export interface BidviaAccountRecord {
  accountRecordId: string;
  recordType: string;
  subjectRef: string;
  observedAt?: string;
  summary?: string;
}

export interface BidviaListAccountRecordsResponse {
  accountRecords: BidviaAccountRecord[];
}

export interface BidviaAgentPresenceRecord {
  agentRegistrationId: string;
  presenceStatus: BidviaPresenceStatus;
  readinessStatus?: BidviaReadinessStatus;
  observedAt: string;
  rationale?: string;
}

export interface BidviaGetAgentPresenceResponse {
  agentPresence: BidviaAgentPresenceRecord;
}

export interface BidviaAgentAuthorityRecord {
  agentRegistrationId: string;
  authorityStatus: BidviaAuthorityStatus;
  observedAt: string;
  grantedBy?: string;
  scopeRefs?: string[];
}

export interface BidviaGetAgentAuthorityResponse {
  agentAuthority: BidviaAgentAuthorityRecord;
}

export const bidviaRuntimeCapabilityKnowledgeSources = [
  'local-static',
  'deferred-server-negotiation',
] as const;

export type BidviaRuntimeCapabilityKnowledgeSource =
  (typeof bidviaRuntimeCapabilityKnowledgeSources)[number];

export interface BidviaCapabilitySnapshotFreshnessMetadata {
  schemaVersion: string;
  version: string;
  lastUpdatedAt: string;
  ttl: null;
  expiresAt: null;
  stale: boolean;
  fallbackPolicy: string;
}

export interface BidviaLocalCapabilitySnapshotMetadata
  extends BidviaCapabilitySnapshotFreshnessMetadata {
  revision: string;
}

export interface BidviaServerCapabilitySnapshotMetadata
  extends BidviaCapabilitySnapshotFreshnessMetadata {
  etag: string | null;
}

export interface BidviaLocalRouteCapabilityKnowledge extends BidviaLocalCapabilitySnapshotMetadata {
  source: 'local-static';
  items: BidviaRouteCapability[];
}

export interface BidviaLocalMcpToolKnowledge extends BidviaLocalCapabilitySnapshotMetadata {
  source: 'local-static';
  items: BidviaMcpToolDescriptor[];
}

export interface BidviaLocalMcpServerAvailability extends BidviaLocalCapabilitySnapshotMetadata {
  source: 'local-static';
  available: true;
  transport: 'stdio';
  entrypoint: 'src/mcp-server.ts';
  supportedMethods: BidviaMcpServerSupportedMethod[];
}

export interface BidviaDeferredServerCapabilityNegotiation
  extends BidviaLocalCapabilitySnapshotMetadata {
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

export interface BidviaServerCapabilityPayloadRouteCapability {
  helper_key: string;
  route_path_template: string;
  http_method: BidviaRouteCapabilityHttpMethod;
  access_context_family: BidviaRouteCapabilityAccessContextFamily;
  required_context: BidviaScenarioContextKey[];
  scope: BidviaRouteCapabilityScope;
  level: BidviaRouteCapabilityLevel;
}

export interface BidviaServerCapabilityPayloadMcpTool {
  tool_name: string;
  description: string;
  input_schema_ref: {
    schema_key: string;
  };
  output_mode: BidviaMcpToolOutputMode;
  helper_ref: {
    helper_key: string;
    capability_key?: string;
  };
}

export interface BidviaServerCapabilityPayloadMcpServer {
  available: boolean;
  transport: 'stdio';
  supported_methods: BidviaMcpServerSupportedMethod[];
}

export interface BidviaServerCapabilityPayload {
  environment_mode?: BidviaEnvironmentMode;
  route_capabilities: BidviaServerCapabilityPayloadRouteCapability[];
  mcp_tools: BidviaServerCapabilityPayloadMcpTool[];
  mcp_server: BidviaServerCapabilityPayloadMcpServer;
}

export interface BidviaServerDerivedRouteCapabilityKnowledge
  extends BidviaServerCapabilitySnapshotMetadata {
  source: 'server-derived';
  items: BidviaRouteCapability[];
}

export interface BidviaServerDerivedMcpToolKnowledge
  extends BidviaServerCapabilitySnapshotMetadata {
  source: 'server-derived';
  items: BidviaMcpToolDescriptor[];
}

export interface BidviaServerDerivedMcpServerAvailability
  extends BidviaServerCapabilitySnapshotMetadata {
  source: 'server-derived';
  available: boolean;
  transport: 'stdio';
  supportedMethods: BidviaMcpServerSupportedMethod[];
}

export interface BidviaServerProvidedCapabilityNegotiation
  extends BidviaServerCapabilitySnapshotMetadata {
  source: 'server-derived';
  status: 'provided';
  serverProvidedCapabilitiesKnown: true;
}

export interface BidviaNormalizedServerCapabilitySnapshot {
  environmentMode: BidviaEnvironmentMode;
  routeCapabilities: BidviaServerDerivedRouteCapabilityKnowledge;
  mcpTools: BidviaServerDerivedMcpToolKnowledge;
  localMcpServer: BidviaServerDerivedMcpServerAvailability;
  serverNegotiation: BidviaServerProvidedCapabilityNegotiation;
}

export const bidviaCapabilityTruthEffectiveSources = [
  'server-derived',
  'dependency-gated',
] as const;

export type BidviaCapabilityTruthEffectiveSource =
  (typeof bidviaCapabilityTruthEffectiveSources)[number];

export interface BidviaProvidedCoreCapabilityTruthRefresh {
  source: 'server-derived';
  status: 'provided';
  serverProvidedCapabilitiesKnown: true;
}

export interface BidviaBlockedCoreCapabilityTruthRefresh {
  source: 'dependency-gated';
  status: 'blocked';
  blockedBy: 'bidvia-core-capability-truth';
  reason: 'Frozen core capability truth is unavailable.';
  serverProvidedCapabilitiesKnown: false;
}

export type BidviaCoreCapabilityTruthRefresh =
  | BidviaProvidedCoreCapabilityTruthRefresh
  | BidviaBlockedCoreCapabilityTruthRefresh;

export interface BidviaRemoteCapabilityRefreshInput {
  localSnapshot: BidviaLocalRuntimeCapabilitySnapshot;
  coreCapabilityPayload?: BidviaServerCapabilityPayload;
}

export interface BidviaRemoteRouteCapabilityRefreshState {
  localSnapshot: BidviaLocalRouteCapabilityKnowledge;
  coreSnapshot: BidviaServerDerivedRouteCapabilityKnowledge | null;
  effectiveSource: BidviaCapabilityTruthEffectiveSource;
  effectiveItems: BidviaRouteCapability[];
}

export interface BidviaRemoteMcpToolRefreshState {
  localSnapshot: BidviaLocalMcpToolKnowledge;
  coreSnapshot: BidviaServerDerivedMcpToolKnowledge | null;
  effectiveSource: BidviaCapabilityTruthEffectiveSource;
  effectiveItems: BidviaMcpToolDescriptor[];
}

export interface BidviaRemoteMcpServerEffectiveValue {
  available: boolean;
  transport: 'stdio';
  supportedMethods: BidviaMcpServerSupportedMethod[];
}

export interface BidviaRemoteMcpServerRefreshState {
  localSnapshot: BidviaLocalMcpServerAvailability;
  coreSnapshot: BidviaServerDerivedMcpServerAvailability | null;
  effectiveSource: BidviaCapabilityTruthEffectiveSource;
  effectiveValue: BidviaRemoteMcpServerEffectiveValue;
}

export interface BidviaRemoteCapabilityRefreshSnapshot {
  baseUrl: string;
  environmentMode: BidviaEnvironmentMode;
  routeCapabilities: BidviaRemoteRouteCapabilityRefreshState;
  mcpTools: BidviaRemoteMcpToolRefreshState;
  localMcpServer: BidviaRemoteMcpServerRefreshState;
  coreTruthRefresh: BidviaCoreCapabilityTruthRefresh;
}

export interface BidviaPricingBasisObject {
  pricingBasisId: string;
  basisType: string;
  label: string;
  observedAt: string;
  termsSummary?: string;
}

export interface BidviaCanonicalSemanticConceptIdentifierInput {
  canonicalSemanticConceptId: string;
}

export interface BidviaCanonicalSemanticConceptRecord {
  canonicalSemanticConceptId: string;
  conceptKey: string;
  label: string;
  observedAt?: string;
  description?: string;
  status?: string;
}

export interface BidviaListCanonicalSemanticConceptsResponse {
  canonicalSemanticConcepts: BidviaCanonicalSemanticConceptRecord[];
}

export interface BidviaGetCanonicalSemanticConceptResponse {
  canonicalSemanticConcept: BidviaCanonicalSemanticConceptRecord;
}

export interface BidviaPricingBasisIdentifierInput {
  pricingBasisId: string;
}

export interface BidviaListPricingBasesResponse {
  pricingBases: BidviaPricingBasisObject[];
}

export interface BidviaGetPricingBasisResponse {
  pricingBasis: BidviaPricingBasisObject;
}

export interface BidviaPricingRuleAtom {
  pricingRuleAtomId: string;
  ruleType: string;
  label: string;
  operator: string;
  operandDescription: string;
}

export interface BidviaPricingQuotationMethodModule {
  quotationMethodModuleId: string;
  methodType: string;
  label: string;
  pricingBasisIds: string[];
  pricingRuleAtomIds: string[];
}

export interface BidviaPricingQuoteTemplate {
  quoteTemplateId: string;
  templateType: string;
  label: string;
  quotationMethodModuleId: string;
  requiredFieldLabels: string[];
}

export interface BidviaPricingQuotationObject {
  quotationObjectId: string;
  quoteTemplateId: string;
  quotationMethodModuleId: string;
  pricingBasisId: string;
  pricingRuleAtomIds: string[];
  presentedAt: string;
  status: string;
  displaySummary?: string;
}

export interface BidviaPricingConsumption {
  pricingBasis: BidviaPricingBasisObject;
  ruleAtoms: BidviaPricingRuleAtom[];
  quotationMethodModule: BidviaPricingQuotationMethodModule;
  quoteTemplate: BidviaPricingQuoteTemplate;
  quotationObject: BidviaPricingQuotationObject;
}

export interface BidviaPricingExplanationDependencySummary {
  pricingBasisLabel: string;
  quotationMethodModuleLabel: string;
  quoteTemplateLabel: string;
  quotationObjectStatus: string;
  pricingRuleAtomLabels: string[];
}

export interface BidviaPricingExplanation {
  pricingBasisId: string;
  quotationMethodModuleId: string;
  quoteTemplateId: string;
  quotationObjectId: string;
  pricingRuleAtomIds: string[];
  dependencySummary: BidviaPricingExplanationDependencySummary;
  explanationLines: string[];
}

export interface BidviaFileResource {
  fileResourceId: string;
  storageRef: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  observedAt: string;
}

export interface BidviaDocumentArtifact {
  documentArtifactId: string;
  fileResourceId: string;
  artifactType: string;
  title: string;
  observedAt: string;
}

export interface BidviaDocumentArtifactIdentifierInput {
  documentArtifactId: string;
}

export interface BidviaListDocumentArtifactsResponse {
  documentArtifacts: BidviaDocumentArtifact[];
}

export interface BidviaGetDocumentArtifactResponse {
  documentArtifact: BidviaDocumentArtifact;
}

export interface BidviaEvidenceAsset {
  evidenceAssetId: string;
  assetKind: string;
  fileResourceId: string;
  documentArtifactId?: string;
  summary: string;
  observedAt: string;
  ownerRef?: string;
  lineageRefs: string[];
}

export interface BidviaEvidenceAssetIdentifierInput {
  evidenceAssetId: string;
}

export interface BidviaListEvidenceAssetsResponse {
  evidenceAssets: BidviaEvidenceAsset[];
}

export interface BidviaGetEvidenceAssetResponse {
  evidenceAsset: BidviaEvidenceAsset;
}

export interface BidviaMediaAsset {
  mediaAssetId: string;
  mediaType: string;
  fileResourceId: string;
  previewRef?: string;
  observedAt: string;
}

export interface BidviaMediaAssetIdentifierInput {
  mediaAssetId: string;
}

export interface BidviaListMediaAssetsResponse {
  mediaAssets: BidviaMediaAsset[];
}

export interface BidviaGetMediaAssetResponse {
  mediaAsset: BidviaMediaAsset;
}

export interface BidviaAttachmentBinding {
  attachmentBindingId: string;
  targetRef: string;
  assetRef: string;
  role: string;
  visibility: string;
  ownerRef?: string;
  lineageRefs: string[];
  intendedGovernanceEffect?: string;
  observedAt: string;
}

export interface BidviaAttachmentBindingIdentifierInput {
  attachmentBindingId: string;
}

export interface BidviaListAttachmentBindingsResponse {
  attachmentBindings: BidviaAttachmentBinding[];
}

export interface BidviaGetAttachmentBindingResponse {
  attachmentBinding: BidviaAttachmentBinding;
}

export interface BidviaAssetConsumption {
  fileResource: BidviaFileResource;
  documentArtifact: BidviaDocumentArtifact;
  evidenceAsset: BidviaEvidenceAsset;
  mediaAsset: BidviaMediaAsset;
  attachmentBinding: BidviaAttachmentBinding;
}

export interface BidviaAssetExplanationBindingContext {
  targetRef: string;
  role: string;
  visibility: string;
  ownerRef?: string;
  lineageRefs: string[];
  intendedGovernanceEffect?: string;
}

export interface BidviaAssetExplanation {
  fileResourceId: string;
  documentArtifactId: string;
  evidenceAssetId: string;
  mediaAssetId: string;
  attachmentBindingId: string;
  bindingContext: BidviaAssetExplanationBindingContext;
  explanationLines: string[];
}

export const bidviaGovernedProposalSurfaceKinds = [
  'proposal-recommendation',
  'review-assessment',
  'authorized-use',
] as const;

export type BidviaGovernedProposalSurfaceKind =
  (typeof bidviaGovernedProposalSurfaceKinds)[number];

export const bidviaGovernedParticipationAuthorities = [
  'recommendation',
  'assessment',
  'authorized-use',
] as const;

export type BidviaGovernedParticipationAuthority =
  (typeof bidviaGovernedParticipationAuthorities)[number];

export interface BidviaProposalRecommendationInput {
  authorityScope: BidviaGovernedParticipationAuthority;
  proposalType: string;
  proposalRef: string;
  recommendationRef: string;
  summary: string;
  now: string;
  taskOffer: BidviaTaskOfferShell;
}

export interface BidviaProposalReviewAssessmentInput {
  authorityScope: BidviaGovernedParticipationAuthority;
  proposalRef: string;
  reviewRef: string;
  assessment: string;
  summary: string;
  now: string;
  taskAck: BidviaTaskAckShell;
}

export interface BidviaAuthorizedUseInput {
  authorityScope: BidviaGovernedParticipationAuthority;
  proposalRef: string;
  authorizationRef: string;
  receiptId: string;
  usageSummary: string;
  now: string;
  taskLease: BidviaTaskLeaseShell;
}

export interface BidviaGovernedProposalRecommendation {
  kind: 'proposal-recommendation';
  authorityScope: 'recommendation';
  proposalType: string;
  proposalRef: string;
  recommendationRef: string;
  summary: string;
  now: string;
  taskOffer: BidviaTaskOfferShell;
}

export interface BidviaGovernedProposalReviewAssessment {
  kind: 'review-assessment';
  authorityScope: 'assessment';
  proposalRef: string;
  reviewRef: string;
  assessment: string;
  summary: string;
  now: string;
  taskAck: BidviaTaskAckShell;
}

export interface BidviaGovernedAuthorizedUseReceipt {
  kind: 'authorized-use';
  authorityScope: 'authorized-use';
  proposalRef: string;
  authorizationRef: string;
  receiptId: string;
  usageSummary: string;
  now: string;
  taskLease: BidviaTaskLeaseShell;
}

export interface BidviaGovernedProposalReviewUsePlanInput {
  scenarioId: string;
  scenarioLabel: string;
  sourceRefs: string[];
  evidenceRefs: string[];
  traceIds: string[];
  workflowIds: string[];
  proposalRecommendation: BidviaProposalRecommendationInput;
  reviewAssessment: BidviaProposalReviewAssessmentInput;
  authorizedUse: BidviaAuthorizedUseInput;
}

export interface BidviaGovernedProposalReviewUsePlan {
  envelope: BidviaScenarioEnvelope;
  proposalRecommendation: BidviaGovernedProposalRecommendation;
  reviewAssessment: BidviaGovernedProposalReviewAssessment;
  authorizedUse: BidviaGovernedAuthorizedUseReceipt;
}
