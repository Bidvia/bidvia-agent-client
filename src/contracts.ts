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

export interface BidviaScenarioRouteStep {
  routeKey: string;
  requiredContext: BidviaScenarioContextKey[];
}

export interface BidviaScenarioEnvelopeRecordIds {
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
