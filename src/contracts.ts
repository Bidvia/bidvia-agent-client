export interface BidviaClientContext {
  tenantId: string;
  principalId?: string;
  registrationId?: string;
  sessionId?: string;
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
