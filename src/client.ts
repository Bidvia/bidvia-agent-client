import type {
  BidviaClientAuth,
  BidviaClientAuthInput,
  BidviaCommercialActionCreateInput,
  BidviaCommercialActionExecuteInput,
  BidviaCommercialActionPolicyCheckInput,
  BidviaCommercialActionRequestApprovalInput,
  BidviaCommercialActionStatusInput,
  BidviaClientContext,
  BidviaClientHeaders,
  BidviaClientHeadersInput,
  BidviaClientRequestPolicy,
  BidviaClientRequestDescriptor,
  BidviaClientTransportErrorKind,
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
  auth?: BidviaClientAuthInput;
  headers?: BidviaClientHeadersInput;
  fetchImpl?: typeof fetch;
  requestPolicy?: BidviaClientRequestPolicy;
}

export class BidviaClientTransportError extends Error {
  readonly name = 'BidviaClientTransportError';

  declare readonly cause: unknown;

  constructor(
    message: string,
    readonly kind: BidviaClientTransportErrorKind,
    readonly status?: number,
    options?: {
      cause?: unknown;
      responseBody?: unknown;
    },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.cause = options?.cause;
    this.responseBody = options?.responseBody;
  }

  readonly responseBody?: unknown;
}

interface BidviaRequestTransport {
  signal?: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
  didAbort: () => boolean;
}

export class BidviaClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: BidviaClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createProvisionalAgent(
    input: BidviaProvisionalAgentCreateInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/agents/provisional', {
      context,
      method: 'POST',
      body: {
        provisional_agent_ref: input.provisionalAgentRef,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async queryProvisionalAgent(
    provisionalAgentRef: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    const search = new URLSearchParams({ provisional_agent_ref: provisionalAgentRef });
    return this.request(`/runtime/agents/provisional?${search.toString()}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async claimProvisionalAgent(
    input: BidviaProvisionalAgentClaimInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/agents/provisional/claim', {
      context,
      method: 'POST',
      headers: this.requireSessionHeaders(context),
      body: {
        provisional_agent_ref: input.provisionalAgentRef,
        claim_token: input.claimToken,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async postHeartbeat(input: BidviaHeartbeatInput, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.registrationPath(context, '/heartbeat'), {
      context,
      method: 'POST',
      headers: this.requireRegistrationHeaders(context),
      body: {
        now: input.now,
        expires_at: input.expiresAt,
      },
      requestPolicy,
    });
  }

  async uploadSync(input: BidviaSyncUploadInput, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.registrationPath(context, '/sync/upload'), {
      context,
      method: 'POST',
      headers: this.requireRegistrationHeaders(context),
      body: {
        cursor_ref: input.cursorRef,
        object_count: input.objectCount,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async downloadSync(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.registrationPath(context, '/sync/download'), {
      context,
      method: 'GET',
      headers: this.requireRegistrationHeaders(context),
      requestPolicy,
    });
  }

  async listAccountAgents(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/account/agents', {
      context,
      method: 'GET',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async getAccountAgent(agentRegistrationId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/account/agents/${encodeURIComponent(agentRegistrationId)}`, {
      context,
      method: 'GET',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async listAccountAgentBindings(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/account/agent-bindings', {
      context,
      method: 'GET',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async listAccountRecords(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/account/records', {
      context,
      method: 'GET',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async getAgentPresence(agentRegistrationId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/presence?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
      context,
      method: 'GET',
      headers: this.requireAdminSessionHeaders(context),
      requestPolicy,
      },
    );
  }

  async getAgentAuthority(agentRegistrationId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/authority?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
      context,
      method: 'GET',
      headers: this.requireAdminSessionHeaders(context),
      requestPolicy,
      },
    );
  }

  async listCanonicalSemanticConcepts(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/canonical-semantic-concepts', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getCanonicalSemanticConcept(
    canonicalSemanticConceptId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/canonical-semantic-concepts/${encodeURIComponent(canonicalSemanticConceptId)}`,
      {
        context,
        method: 'GET',
        requestPolicy,
      },
    );
  }

  async listPricingBases(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/pricing-bases', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getPricingBasis(pricingBasisId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/pricing-bases/${encodeURIComponent(pricingBasisId)}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async listDocumentArtifacts(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/document-artifacts', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getDocumentArtifact(documentArtifactId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/document-artifacts/${encodeURIComponent(documentArtifactId)}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async listMediaAssets(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/media-assets', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getMediaAsset(mediaAssetId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/media-assets/${encodeURIComponent(mediaAssetId)}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async listEvidenceAssets(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/evidence-assets', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getEvidenceAsset(evidenceAssetId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/evidence-assets/${encodeURIComponent(evidenceAssetId)}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async listAttachmentBindings(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request('/runtime/attachment-bindings', {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async getAttachmentBinding(
    attachmentBindingId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/attachment-bindings/${encodeURIComponent(attachmentBindingId)}`, {
      context,
      method: 'GET',
      requestPolicy,
    });
  }

  async submitEvidence(
    input: BidviaEvidenceSubmissionInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.registrationPath(context, '/evidence-submissions'), {
      context,
      method: 'POST',
      headers: this.requireRegistrationHeaders(context),
      body: {
        evidence_ref: input.evidenceRef,
        evidence_kind: input.evidenceKind,
        summary: input.summary,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async submitProposal(
    input: BidviaProposalSubmissionInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.registrationPath(context, '/proposals'), {
      context,
      method: 'POST',
      headers: this.requireRegistrationHeaders(context),
      body: {
        proposal_type: input.proposalType,
        proposal_ref: input.proposalRef,
        summary: input.summary,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async createCommercialAction(
    input: BidviaCommercialActionCreateInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        governed_action: input.governedAction,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        trace_id: input.traceId,
        workflow_id: input.workflowId,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async getCommercialActionStatus(
    input: BidviaCommercialActionStatusInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/status?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'GET',
      headers: this.requireAdminSessionHeaders(context),
      requestPolicy,
    });
  }

  async policyCheckCommercialAction(
    input: BidviaCommercialActionPolicyCheckInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/policy-check?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        policy_version: input.policyVersion,
        outcome: input.outcome,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async requestCommercialActionApproval(
    input: BidviaCommercialActionRequestApprovalInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/request-approval?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        approval_request_id: input.approvalRequestId,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async executeCommercialAction(
    input: BidviaCommercialActionExecuteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/execute?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        approval_request_id: input.approvalRequestId,
        receipt_id: input.receiptId,
        approval_result: input.approvalResult,
        result_status: input.resultStatus,
        audit_id: input.auditId,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async getCommercialActionReceipt(
    input: BidviaCommercialActionStatusInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/receipt?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'GET',
      headers: this.requireAdminSessionHeaders(context),
      requestPolicy,
    });
  }

  async getCommercialActionAudit(
    input: BidviaCommercialActionStatusInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/commercial-actions/${encodeURIComponent(input.commercialActionRequestId)}/audit?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'GET',
      headers: this.requireAdminSessionHeaders(context),
      requestPolicy,
    });
  }

  async createListing(
    input: BidviaCreateListingInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/listings?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        listing_id: input.listingId,
        listing_type: input.listingType,
        company_id: this.requireCompanyId(context),
        actor_id: this.requirePrincipalId(context),
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
      requestPolicy,
    });
  }

  async activateListing(
    input: BidviaActivateListingInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/listings/${encodeURIComponent(input.listingId)}/activate?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        company_id: this.requireCompanyId(context),
        actor_id: this.requirePrincipalId(context),
        now: input.now,
      },
      requestPolicy,
    });
  }

  async generateMatchCandidates(
    input: BidviaGenerateMatchCandidatesInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/listings/${encodeURIComponent(input.listingId)}/match-candidates?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
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
      requestPolicy,
    });
  }

  async createConnectionRequest(
    input: BidviaCreateConnectionRequestInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/connection-requests?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
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
      requestPolicy,
    });
  }

  async approveConnectionRequest(
    input: BidviaApproveConnectionRequestInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/approvals/${encodeURIComponent(input.approvalRequestId)}/decision?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: {
        actor_id: input.actorId,
        decision: input.decision,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async exportOpportunityPackage(
    input: BidviaExportOpportunityPackageInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/opportunities/${encodeURIComponent(input.opportunityId)}/package-export?tenant_id=${encodeURIComponent(context.tenantId)}`, {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
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
      requestPolicy,
    });
  }

  private resolveRequestContext(requestPolicy?: BidviaClientRequestPolicy): BidviaClientContext {
    return {
      ...this.options.context,
      ...(requestPolicy?.context ?? {}),
    };
  }

  private registrationPath(context: BidviaClientContext, suffix: string) {
    const registrationId = context.registrationId;
    const tenantId = context.tenantId;
    if (!registrationId) {
      throw new Error('registrationId is required for registration-bound operations');
    }
    return `/runtime/agents/${encodeURIComponent(registrationId)}${suffix}?tenant_id=${encodeURIComponent(tenantId)}`;
  }

  private requireTenantId(context: BidviaClientContext) {
    const tenantId = context.tenantId;
    if (!tenantId) {
      throw new Error('tenantId is required for tenant-scoped read routes');
    }
    return tenantId;
  }

  private requireRegistrationHeaders(context: BidviaClientContext) {
    const principalId = context.principalId;
    if (!principalId) {
      throw new Error('principalId is required for registration-bound operations');
    }
    return {
      'x-authorized-tenant-id': context.tenantId,
      'x-bidvia-principal-id': principalId,
    };
  }

  private requireSessionHeaders(context: BidviaClientContext) {
    const sessionId = context.sessionId;
    if (!sessionId) {
      throw new Error('sessionId is required for session routes');
    }
    return {
      'x-bidvia-session-id': sessionId,
    };
  }

  private requireAdminSessionHeaders(context: BidviaClientContext) {
    const adminSessionId = context.adminSessionId;
    if (!adminSessionId) {
      throw new Error('adminSessionId is required for admin-session routes');
    }
    return {
      'x-bidvia-admin-session-id': adminSessionId,
    };
  }

  private requireOperatorActionHeaders(context: BidviaClientContext) {
    const principalId = this.requirePrincipalId(context);
    const companyId = this.requireCompanyId(context);
    return {
      'x-authorized-tenant-id': context.tenantId,
      'x-bidvia-principal-id': principalId,
      'x-authorized-company-id': companyId,
    };
  }

  private requirePrincipalId(context: BidviaClientContext) {
    const principalId = context.principalId;
    if (!principalId) {
      throw new Error('principalId is required for operator-context routes');
    }
    return principalId;
  }

  private requireCompanyId(context: BidviaClientContext) {
    const companyId = context.companyId;
    if (!companyId) {
      throw new Error('companyId is required for operator-context routes');
    }
    return companyId;
  }

  private async request(path: string, params: {
    context: BidviaClientContext;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
    requestPolicy?: BidviaClientRequestPolicy;
  }) {
    const url = new URL(path, this.options.baseUrl).toString();
    const transport = this.createRequestTransport(params.requestPolicy);

    try {
      this.throwIfRequestAborted(transport);

      const headers = await this.resolveRequestHeaders({
        context: params.context,
        path,
        method: params.method,
        headers: params.headers,
        body: params.body,
      });

      this.throwIfRequestAborted(transport);

      const response = await this.fetchImpl(url, {
        method: params.method,
        headers,
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: transport.signal,
      });

      return await this.parseResponse(response);
    } catch (error) {
      throw this.normalizeTransportError(error, transport);
    } finally {
      transport.cleanup();
    }
  }

  private createRequestTransport(requestPolicy?: BidviaClientRequestPolicy): BidviaRequestTransport {
    const timeoutMs = requestPolicy?.timeoutMs ?? this.options.requestPolicy?.timeoutMs;
    const callerSignal = requestPolicy?.signal;

    if (timeoutMs === undefined && callerSignal === undefined) {
      return {
        signal: undefined,
        cleanup: () => {},
        didTimeout: () => false,
        didAbort: () => false,
      };
    }

    const controller = new AbortController();
    const cleanupCallbacks: Array<() => void> = [];
    let timedOut = false;
    let aborted = false;

    const abortRequest = (reason?: unknown) => {
      if (!controller.signal.aborted) {
        controller.abort(reason);
      }
    };

    if (callerSignal) {
      const onAbort = () => {
        aborted = true;
        abortRequest(callerSignal.reason);
      };

      if (callerSignal.aborted) {
        onAbort();
      } else {
        callerSignal.addEventListener('abort', onAbort, { once: true });
        cleanupCallbacks.push(() => {
          callerSignal.removeEventListener('abort', onAbort);
        });
      }
    }

    if (timeoutMs !== undefined) {
      const timer = setTimeout(() => {
        timedOut = true;
        abortRequest(new DOMException(`Bidvia request timed out after ${timeoutMs}ms`, 'TimeoutError'));
      }, timeoutMs);

      cleanupCallbacks.push(() => {
        clearTimeout(timer);
      });
    }

    return {
      signal: controller.signal,
      cleanup: () => {
        for (const cleanupCallback of cleanupCallbacks) {
          cleanupCallback();
        }
      },
      didTimeout: () => timedOut,
      didAbort: () => aborted,
    };
  }

  private throwIfRequestAborted(transport: BidviaRequestTransport) {
    if (transport.didAbort()) {
      throw new BidviaClientTransportError('Bidvia request was aborted', 'aborted');
    }
  }

  private async resolveRequestHeaders(params: {
    context: BidviaClientContext;
    path: string;
    method: 'GET' | 'POST';
    headers?: BidviaClientHeaders;
    body?: unknown;
  }): Promise<BidviaClientHeaders> {
    const request = this.createRequestDescriptor(params.context, params.method, params.path);
    const auth = await this.resolveAuthInput(request);
    const providerHeaders = await this.resolveHeadersInput(request);

    return {
      ...(params.body ? { 'content-type': 'application/json' } : {}),
      ...this.buildAuthHeaders(auth),
      ...(providerHeaders ?? {}),
      ...(params.headers ?? {}),
    };
  }

  private createRequestDescriptor(
    context: BidviaClientContext,
    method: 'GET' | 'POST',
    path: string,
  ): BidviaClientRequestDescriptor {
    return {
      method,
      path,
      context,
    };
  }

  private async resolveAuthInput(
    request: BidviaClientRequestDescriptor,
  ): Promise<BidviaClientAuth | undefined> {
    const auth = this.options.auth;
    if (typeof auth === 'function') {
      return auth(request);
    }
    return auth;
  }

  private async resolveHeadersInput(
    request: BidviaClientRequestDescriptor,
  ): Promise<BidviaClientHeaders | undefined> {
    const headers = this.options.headers;
    if (typeof headers === 'function') {
      return headers(request);
    }
    return headers;
  }

  private buildAuthHeaders(auth?: BidviaClientAuth): BidviaClientHeaders {
    const authorization = auth?.authorization ?? (auth?.bearerToken ? `Bearer ${auth.bearerToken}` : undefined);

    if (!authorization) {
      return {};
    }

    return {
      authorization,
    };
  }

  private async parseResponse(response: Response) {
    const body = await this.readResponseBody(response);

    if (!response.ok) {
      throw this.createStatusError(response.status, body);
    }

    if (!body.validJson) {
      throw new BidviaClientTransportError(
        'Bidvia response body was not valid JSON',
        'unknown',
        response.status,
        {
          cause: body.parseError,
          responseBody: body.rawBody,
        },
      );
    }

    return body.value;
  }

  private async readResponseBody(response: Response): Promise<{
    validJson: boolean;
    value?: unknown;
    rawBody: string;
    parseError?: unknown;
  }> {
    const rawBody = await response.text();
    if (rawBody === '') {
      return {
        validJson: true,
        value: null,
        rawBody,
      };
    }

    try {
      return {
        validJson: true,
        value: JSON.parse(rawBody),
        rawBody,
      };
    } catch (parseError) {
      return {
        validJson: false,
        rawBody,
        parseError,
      };
    }
  }

  private createStatusError(
    status: number,
    body: {
      validJson: boolean;
      value?: unknown;
      rawBody: string;
      parseError?: unknown;
    },
  ) {
    const kind = this.mapStatusToErrorKind(status);
    const message = this.extractErrorMessage(body.value) ?? `Bidvia request failed with status ${status}`;

    return new BidviaClientTransportError(message, kind, status, {
      cause: body.validJson ? undefined : body.parseError,
      responseBody: body.validJson ? body.value : body.rawBody,
    });
  }

  private mapStatusToErrorKind(status: number): BidviaClientTransportErrorKind {
    switch (status) {
      case 400:
        return 'invalid_request';
      case 401:
        return 'auth';
      case 403:
        return 'permission';
      case 404:
        return 'not_found';
      case 409:
        return 'conflict';
      case 429:
        return 'rate_limit';
      default:
        return status >= 500 ? 'server' : 'unknown';
    }
  }

  private extractErrorMessage(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const message = value as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof message.message === 'string') {
      return message.message;
    }

    if (typeof message.error === 'string') {
      return message.error;
    }

    return undefined;
  }

  private normalizeTransportError(error: unknown, transport: BidviaRequestTransport) {
    if (error instanceof BidviaClientTransportError) {
      return error;
    }

    if (transport.didTimeout()) {
      return new BidviaClientTransportError('Bidvia request timed out', 'timeout', undefined, {
        cause: error,
      });
    }

    if (transport.didAbort()) {
      return new BidviaClientTransportError('Bidvia request was aborted', 'aborted', undefined, {
        cause: error,
      });
    }

    if (error instanceof TypeError) {
      return new BidviaClientTransportError('Bidvia connection failed', 'connection', undefined, {
        cause: error,
      });
    }

    return new BidviaClientTransportError(
      error instanceof Error ? error.message : 'Bidvia request failed',
      'unknown',
      undefined,
      {
        cause: error,
      },
    );
  }
}

export function exportVerificationBundle(bundle: BidviaVerificationBundle): BidviaVerificationBundle {
  return exportLegacyVerificationBundle(bundle);
}
