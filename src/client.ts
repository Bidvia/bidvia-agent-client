import type {
  BidviaCommercialActionCreateInput,
  BidviaCommercialActionExecuteInput,
  BidviaCommercialActionPolicyCheckInput,
  BidviaCommercialActionRequestApprovalInput,
  BidviaCommercialActionStatusInput,
  BidviaClientContext,
  BidviaCreateConnectionRequestInput,
  BidviaCreateListingInput,
  BidviaEvidenceSubmissionInput,
  BidviaExportOpportunityPackageInput,
  BidviaGenerateMatchCandidatesInput,
  BidviaHeartbeatInput,
  BidviaProposalSubmissionInput,
  BidviaProvisionalAgentClaimInput,
  BidviaProvisionalAgentCreateInput,
  BidviaSyncUploadInput,
  BidviaActivateListingInput,
  BidviaApproveConnectionRequestInput,
  BidviaVerificationBundle,
} from './contracts.js';
import { exportLegacyVerificationBundle } from './verification.js';

export interface BidviaClientOptions {
  baseUrl: string;
  context: BidviaClientContext;
  fetchImpl?: typeof fetch;
}

export class BidviaClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: BidviaClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createProvisionalAgent(input: BidviaProvisionalAgentCreateInput) {
    return this.request('/runtime/agents/provisional', {
      method: 'POST',
      body: {
        provisional_agent_ref: input.provisionalAgentRef,
        now: input.now,
      },
    });
  }

  async queryProvisionalAgent(provisionalAgentRef: string) {
    const search = new URLSearchParams({ provisional_agent_ref: provisionalAgentRef });
    return this.request(`/runtime/agents/provisional?${search.toString()}`, {
      method: 'GET',
    });
  }

  async claimProvisionalAgent(input: BidviaProvisionalAgentClaimInput) {
    return this.request('/runtime/agents/provisional/claim', {
      method: 'POST',
      headers: this.requireSessionHeaders(),
      body: {
        provisional_agent_ref: input.provisionalAgentRef,
        claim_token: input.claimToken,
        now: input.now,
      },
    });
  }

  async postHeartbeat(input: BidviaHeartbeatInput) {
    return this.request(this.registrationPath('/heartbeat'), {
      method: 'POST',
      headers: this.requireRegistrationHeaders(),
      body: {
        now: input.now,
        expires_at: input.expiresAt,
      },
    });
  }

  async uploadSync(input: BidviaSyncUploadInput) {
    return this.request(this.registrationPath('/sync/upload'), {
      method: 'POST',
      headers: this.requireRegistrationHeaders(),
      body: {
        cursor_ref: input.cursorRef,
        object_count: input.objectCount,
        now: input.now,
      },
    });
  }

  async downloadSync() {
    return this.request(this.registrationPath('/sync/download'), {
      method: 'GET',
      headers: this.requireRegistrationHeaders(),
    });
  }

  async submitEvidence(input: BidviaEvidenceSubmissionInput) {
    return this.request(this.registrationPath('/evidence-submissions'), {
      method: 'POST',
      headers: this.requireRegistrationHeaders(),
      body: {
        evidence_ref: input.evidenceRef,
        evidence_kind: input.evidenceKind,
        summary: input.summary,
        now: input.now,
      },
    });
  }

  async submitProposal(input: BidviaProposalSubmissionInput) {
    return this.request(this.registrationPath('/proposals'), {
      method: 'POST',
      headers: this.requireRegistrationHeaders(),
      body: {
        proposal_type: input.proposalType,
        proposal_ref: input.proposalRef,
        summary: input.summary,
        now: input.now,
      },
    });
  }

  async createCommercialAction(input: BidviaCommercialActionCreateInput) {
    return this.request(`/runtime/commercial-actions?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        governed_action: input.governedAction,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        trace_id: input.traceId,
        workflow_id: input.workflowId,
        now: input.now,
      },
    });
  }

  async getCommercialActionStatus(input: BidviaCommercialActionStatusInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/status?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'GET',
      headers: this.requireAdminSessionHeaders(),
    });
  }

  async policyCheckCommercialAction(input: BidviaCommercialActionPolicyCheckInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/policy-check?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        policy_version: input.policyVersion,
        outcome: input.outcome,
        now: input.now,
      },
    });
  }

  async requestCommercialActionApproval(input: BidviaCommercialActionRequestApprovalInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/request-approval?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        approval_request_id: input.approvalRequestId,
        now: input.now,
      },
    });
  }

  async executeCommercialAction(input: BidviaCommercialActionExecuteInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/execute?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        approval_request_id: input.approvalRequestId,
        receipt_id: input.receiptId,
        approval_result: input.approvalResult,
        result_status: input.resultStatus,
        audit_id: input.auditId,
        now: input.now,
      },
    });
  }

  async getCommercialActionReceipt(input: BidviaCommercialActionStatusInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/receipt?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'GET',
      headers: this.requireAdminSessionHeaders(),
    });
  }

  async getCommercialActionAudit(input: BidviaCommercialActionStatusInput) {
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/audit?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'GET',
      headers: this.requireAdminSessionHeaders(),
    });
  }

  async createListing(input: BidviaCreateListingInput) {
    return this.request(`/runtime/listings?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        listing_id: input.listingId,
        listing_type: input.listingType,
        company_id: this.requireCompanyId(),
        actor_id: this.requirePrincipalId(),
        category: input.category,
        sku: input.sku,
        quantity_value: input.quantityValue,
        quantity_unit: input.quantityUnit,
        region_summary: input.regionSummary,
        verification_status: input.verificationStatus,
        freshness_ts: input.freshnessTs,
        trace_id: input.traceId,
        idempotency_key: input.idempotencyKey,
        now: input.now,
      },
    });
  }

  async activateListing(input: BidviaActivateListingInput) {
    return this.request(`/runtime/listings/${encodeURIComponent(input.listingId)}/activate?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        company_id: this.requireCompanyId(),
        actor_id: this.requirePrincipalId(),
        now: input.now,
      },
    });
  }

  async generateMatchCandidates(input: BidviaGenerateMatchCandidatesInput) {
    return this.request(`/runtime/listings/${encodeURIComponent(input.listingId)}/match-candidates?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        upstream_decision: input.upstreamDecision,
        required_evidence_level: input.requiredEvidenceLevel,
        detected_evidence_level: input.detectedEvidenceLevel,
        missing_fields: [],
        workflow_run_id: input.workflowRunId,
        trigger_event_id: input.triggerEventId,
        top_n: input.topN,
        now: input.now,
      },
    });
  }

  async createConnectionRequest(input: BidviaCreateConnectionRequestInput) {
    return this.request(`/runtime/connection-requests?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        source_match_id: input.sourceMatchId,
        requester_actor_id: input.requesterActorId,
        requester_company_id: input.requesterCompanyId,
        risk_tier: input.riskTier,
        policy_version: input.policyVersion,
        approval_matrix_version: input.approvalMatrixVersion,
        action_type: input.actionType,
        now: input.now,
      },
    });
  }

  async approveConnectionRequest(input: BidviaApproveConnectionRequestInput) {
    return this.request(`/runtime/approvals/${encodeURIComponent(input.approvalRequestId)}/decision?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        actor_id: input.actorId,
        decision: input.decision,
        now: input.now,
      },
    });
  }

  async exportOpportunityPackage(input: BidviaExportOpportunityPackageInput) {
    return this.request(`/runtime/opportunities/${encodeURIComponent(input.opportunityId)}/package-export?tenant_id=${encodeURIComponent(this.options.context.tenantId)}`, {
      method: 'POST',
      headers: this.requireOperatorActionHeaders(),
      body: {
        render_template_id: input.renderTemplateId,
        content_ref: input.contentRef,
        redaction_profile: input.redactionProfile,
        target_system: input.targetSystem,
        operation_type: input.operationType,
        node_id: input.nodeId,
        runtime_id: input.runtimeId,
        agent_id: input.agentId,
        bound_account_id: input.boundAccountId,
        now: input.now,
      },
    });
  }

  private registrationPath(suffix: string) {
    const registrationId = this.options.context.registrationId;
    const tenantId = this.options.context.tenantId;
    if (!registrationId) {
      throw new Error('registrationId is required for registration-bound operations');
    }
    return `/runtime/agents/${encodeURIComponent(registrationId)}${suffix}?tenant_id=${encodeURIComponent(tenantId)}`;
  }

  private requireRegistrationHeaders() {
    const principalId = this.options.context.principalId;
    if (!principalId) {
      throw new Error('principalId is required for registration-bound operations');
    }
    return {
      'x-authorized-tenant-id': this.options.context.tenantId,
      'x-bidvia-principal-id': principalId,
    };
  }

  private requireSessionHeaders() {
    const sessionId = this.options.context.sessionId;
    if (!sessionId) {
      throw new Error('sessionId is required for claim operations');
    }
    return {
      'x-bidvia-session-id': sessionId,
    };
  }

  private requireAdminSessionHeaders() {
    const adminSessionId = this.options.context.adminSessionId;
    if (!adminSessionId) {
      throw new Error('adminSessionId is required for admin-session routes');
    }
    return {
      'x-bidvia-admin-session-id': adminSessionId,
    };
  }

  private requireOperatorActionHeaders() {
    const principalId = this.requirePrincipalId();
    const companyId = this.requireCompanyId();
    return {
      'x-authorized-tenant-id': this.options.context.tenantId,
      'x-bidvia-principal-id': principalId,
      'x-authorized-company-id': companyId,
    };
  }

  private requirePrincipalId() {
    const principalId = this.options.context.principalId;
    if (!principalId) {
      throw new Error('principalId is required for operator-context routes');
    }
    return principalId;
  }

  private requireCompanyId() {
    const companyId = this.options.context.companyId;
    if (!companyId) {
      throw new Error('companyId is required for operator-context routes');
    }
    return companyId;
  }

  private async request(path: string, params: {
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
  }) {
    const url = new URL(path, this.options.baseUrl).toString();
    const response = await this.fetchImpl(url, {
      method: params.method,
      headers: {
        ...(params.body ? { 'content-type': 'application/json' } : {}),
        ...(params.headers ?? {}),
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });
    return response.json();
  }
}

export function exportVerificationBundle(bundle: BidviaVerificationBundle): BidviaVerificationBundle {
  return exportLegacyVerificationBundle(bundle);
}
