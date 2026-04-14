import type {
  BidviaAgentSelfServicePatchInput,
  BidviaAgentAuthorityLadderWriteInput,
  BidviaAgentAuthorityProfileWriteInput,
  BidviaAgentCapabilityProfileWriteInput,
  BidviaClaimAcceptInput,
  BidviaClaimRejectInput,
  BidviaClaimWriteInput,
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
  BidviaEnterpriseIntegrationPlaneView,
  BidviaClientRequestPolicy,
  BidviaClientRequestDescriptor,
  BidviaClientTransportErrorKind,
  BidviaCreateConnectionRequestInput,
  BidviaEnterpriseAccountSignUpInput,
  BidviaCreateListingInput,
  BidviaEvidenceSubmissionInput,
  BidviaExportOpportunityPackageInput,
  BidviaGenerateMatchCandidatesInput,
  BidviaHeartbeatInput,
  BidviaHaisiWmsInboundInput,
  BidviaHaisiWmsLoginInput,
  BidviaIntegrationOnboardingContractInput,
  BidviaLeaseWriteInput,
  BidviaNotificationAcknowledgementWriteInput,
  BidviaNotificationDeliveryWriteInput,
  BidviaNotificationExpirationWriteInput,
  BidviaNotificationIdentifierInput,
  BidviaNotificationRetryWriteInput,
  BidviaParticipationStateWriteInput,
  BidviaPersonalAccountSignUpInput,
  BidviaProposalSubmissionInput,
  BidviaProvisionalAgentClaimInput,
  BidviaProvisionalAgentCreateInput,
  BidviaQueryProvisionalAgentInput,
  BidviaSelectOrgInput,
  BidviaSignInInput,
  BidviaSyncUploadInput,
  BidviaActivateListingInput,
  BidviaApproveConnectionRequestInput,
  BidviaTaskDispatchAssignInput,
  BidviaTaskDispatchCompleteInput,
  BidviaTaskDispatchFailInput,
  BidviaTaskDispatchResumeInput,
  BidviaTaskDispatchSuspendInput,
  BidviaTaskDispatchWriteInput,
  BidviaVerificationBundle,
} from './contracts.js';
import { exportLegacyVerificationBundle } from './verification.js';
import {
  requireIdentitySessionClaimContext,
  requireIdentitySessionGovernedReadContext,
} from './identity-session-plane.js';
import {
  buildTaskPlaneClaimAcceptBody,
  buildTaskPlaneClaimBody,
  buildTaskPlaneClaimRejectBody,
  buildTaskPlaneLeaseBody,
  buildTaskPlaneParticipationStateBody,
  buildTaskPlaneTaskAssignBody,
  buildTaskPlaneTaskDispatchBody,
  buildTaskPlaneTaskOutcomeBody,
  buildTaskPlaneTaskStatusBody,
} from './task-plane.js';
import {
  buildNotificationAcknowledgementBody,
  buildNotificationDeliveryBody,
  buildNotificationExpirationBody,
  buildNotificationRetryBody,
} from './event-notification-plane.js';
import { buildEnterpriseIntegrationPlaneView } from './enterprise-integration-plane.js';

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

  getEnterpriseIntegrationPlaneView(): BidviaEnterpriseIntegrationPlaneView {
    return buildEnterpriseIntegrationPlaneView();
  }

  async submitIntegrationOnboardingContract(
    integrationCode: string,
    input: BidviaIntegrationOnboardingContractInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/integrations/${encodeURIComponent(integrationCode)}/onboarding-contract?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireGovernedReadHeaders(context),
        body: {
          agent_registration_id: input.agentRegistrationId,
          identity_mapping: {
            source: {
              principal_id: input.identityMapping.source.principalId,
              scope_id: input.identityMapping.source.scopeId,
              capability_codes: input.identityMapping.source.capabilityCodes,
            },
            target: {
              wms_subject_id: input.identityMapping.target.wmsSubjectId,
              capability_map: input.identityMapping.target.capabilityMap,
            },
            metadata: {
              mapping_version: input.identityMapping.metadata.mappingVersion,
              mapping_status: input.identityMapping.metadata.mappingStatus,
            },
          },
          now: input.now,
        },
        requestPolicy,
      },
    );
  }

  async logInHaisiWms(
    input: BidviaHaisiWmsLoginInput = {},
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/integrations/haisi-wms/login?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireGovernedReadHeaders(context),
        body: input,
        requestPolicy,
      },
    );
  }

  async listHaisiWmsWarehouses(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/integrations/haisi-wms/warehouses?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async createHaisiWmsInbound(
    input: BidviaHaisiWmsInboundInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/integrations/haisi-wms/inbound?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireGovernedReadHeaders(context),
        body: input,
        requestPolicy,
      },
    );
  }

  async signUpPersonalAccount(
    input: BidviaPersonalAccountSignUpInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/accounts/personal/sign-up', {
      context,
      method: 'POST',
      body: {
        email: input.email,
        password: input.password,
        invitation_token: input.invitationToken,
        display_name: input.displayName,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async signUpEnterpriseAccount(
    input: BidviaEnterpriseAccountSignUpInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/accounts/enterprise/sign-up', {
      context,
      method: 'POST',
      body: {
        email: input.email,
        password: input.password,
        invitation_token: input.invitationToken,
        company_name: input.companyName,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async signIn(input: BidviaSignInInput, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/sessions/sign-in', {
      context,
      method: 'POST',
      body: {
        email: input.email,
        password: input.password,
        now: input.now,
      },
      requestPolicy,
    });
  }

  async refreshSession(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/sessions/refresh', {
      context,
      method: 'POST',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async revokeSession(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/sessions/revoke', {
      context,
      method: 'POST',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async getAccountMe(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/account/me', {
      context,
      method: 'GET',
      headers: this.requireSessionHeaders(context),
      requestPolicy,
    });
  }

  async selectOrg(input: BidviaSelectOrgInput, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request('/runtime/account/select-org', {
      context,
      method: 'POST',
      headers: this.requireSessionHeaders(context),
      body: {
        org_id: input.orgId,
      },
      requestPolicy,
    });
  }


  async patchAgentSelfService(
    agentId: string,
    input: BidviaAgentSelfServicePatchInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(`/runtime/account/agents/${encodeURIComponent(agentId)}/self-service`, {
      context,
      method: 'PATCH',
      headers: this.requireSessionHeaders(context),
      body: {
        now: input.now,
        ...(input.selfDescription === undefined ? {} : { self_description: input.selfDescription }),
        ...(input.capabilityProfile === undefined ? {} : { capability_profile: input.capabilityProfile }),
        ...(input.taskDispatchAcceptance === undefined
          ? {}
          : {
              task_dispatch_acceptance: {
                ...(input.taskDispatchAcceptance.acceptsTaskDispatches === undefined
                  ? {}
                  : { accepts_task_dispatches: input.taskDispatchAcceptance.acceptsTaskDispatches }),
                ...(input.taskDispatchAcceptance.acceptedTaskDispatchScopes === undefined
                  ? {}
                  : { accepted_task_dispatch_scopes: input.taskDispatchAcceptance.acceptedTaskDispatchScopes }),
              },
            }),
        ...(input.participationState === undefined
          ? {}
          : {
              participation_state: {
                state: input.participationState.state,
                ...(input.participationState.reason === undefined ? {} : { reason: input.participationState.reason }),
              },
            }),
      },
      requestPolicy,
    });
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
  ): Promise<unknown>;
  async queryProvisionalAgent(
    input: BidviaQueryProvisionalAgentInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  async queryProvisionalAgent(
    input: string | BidviaQueryProvisionalAgentInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    const provisionalAgentRef = typeof input === 'string' ? input : input.provisionalAgentRef;
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
      headers: this.requireGovernedReadHeaders(context),
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
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
      },
    );
  }

  async getAgentReadiness(agentRegistrationId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/readiness?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getAgentSummary(agentRegistrationId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/summary?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listAgentRegistrations(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/registrations?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getAgentRegistration(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listAuthorityProfiles(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/authority-profiles?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getAgentAuthorityProfile(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/authority-profile?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getAgentAuthorityLadder(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/authority-ladder?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listCapabilityProfiles(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/capability-profiles?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getAgentCapabilityProfile(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  async getAgentCapabilityProfile(
    agentRegistrationId: string,
    legacyCapabilityProfileId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  async getAgentCapabilityProfile(
    agentRegistrationId: string,
    legacyCapabilityProfileIdOrRequestPolicy?: string | BidviaClientRequestPolicy,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const resolvedRequestPolicy =
      typeof legacyCapabilityProfileIdOrRequestPolicy === 'string'
        ? requestPolicy
        : legacyCapabilityProfileIdOrRequestPolicy;
    const context = this.resolveRequestContext(resolvedRequestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/capability-profile?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy: resolvedRequestPolicy,
      },
    );
  }

  async postAgentAuthorityProfile(
    agentRegistrationId: string,
    input: BidviaAgentAuthorityProfileWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/authority-profile?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: {
          principal_ref: input.principalRef,
          tenant_scope: input.tenantScope,
          company_scope: input.companyScope,
          authorized_action_scopes: input.authorizedActionScopes,
          commercial_authority_level: input.commercialAuthorityLevel,
          status: input.status,
        },
        requestPolicy,
      },
    );
  }

  async postAgentAuthorityLadder(
    agentRegistrationId: string,
    input: BidviaAgentAuthorityLadderWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/authority-ladder?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: {
          authority_rung: input.authorityRung,
          granted_action_scopes: input.grantedActionScopes,
          downgraded_from_rung: input.downgradedFromRung,
          granted_at: input.grantedAt,
          rationale: input.rationale,
        },
        requestPolicy,
      },
    );
  }

  async postAgentCapabilityProfile(
    agentRegistrationId: string,
    input: BidviaAgentCapabilityProfileWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      `/runtime/agents/${encodeURIComponent(agentRegistrationId)}/capability-profile?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: {
          domain_strengths: input.domainStrengths,
          template_domains: input.templateDomains,
          workflow_roles: input.workflowRoles,
          allowed_runtime_scopes: input.allowedRuntimeScopes,
          quality_signals: input.qualitySignals,
          adoption_rate: input.adoptionRate,
          evidence_score: input.evidenceScore,
          risk_reliability_band: input.riskReliabilityBand,
          routing_priority: input.routingPriority,
        },
        requestPolicy,
      },
    );
  }

  async listParticipationStates(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.agentRuntimePath(agentRegistrationId, '/participation-states', context), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async createParticipationState(
    agentRegistrationId: string,
    input: BidviaParticipationStateWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.agentRuntimePath(agentRegistrationId, '/participation-states', context), {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: buildTaskPlaneParticipationStateBody(input),
      requestPolicy,
    });
  }

  async getParticipationState(
    agentRegistrationId: string,
    participationStateId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.agentRuntimePath(
        agentRegistrationId,
        `/participation-states/${encodeURIComponent(participationStateId)}`,
        context,
      ),
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async createLease(
    agentRegistrationId: string,
    input: BidviaLeaseWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.accountTaskPlanePath(agentRegistrationId, '/leases', context), {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: buildTaskPlaneLeaseBody(input),
      requestPolicy,
    });
  }

  async listTaskDispatches(
    agentRegistrationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.accountTaskPlanePath(agentRegistrationId, '/task-dispatches', context), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async createTaskDispatch(
    agentRegistrationId: string,
    input: BidviaTaskDispatchWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.accountTaskPlanePath(agentRegistrationId, '/task-dispatches', context), {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: buildTaskPlaneTaskDispatchBody(input),
      requestPolicy,
    });
  }

  async getTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}`,
        context,
      ),
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async getNotification(notificationId: string, requestPolicy?: BidviaClientRequestPolicy): Promise<unknown>;
  async getNotification(
    input: BidviaNotificationIdentifierInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ): Promise<unknown>;
  async getNotification(
    input: string | BidviaNotificationIdentifierInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    const notificationId = typeof input === 'string' ? input : input.notificationId;
    const agentRegistrationId = this.requirePrincipalId(context);

    return this.request(
      `/runtime/account/agents/${encodeURIComponent(agentRegistrationId)}/notifications/${encodeURIComponent(notificationId)}?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async createNotificationDelivery(
    input: BidviaNotificationDeliveryWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);

    return this.request(
      `/runtime/notifications/deliveries?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildNotificationDeliveryBody(input),
        requestPolicy,
      },
    );
  }

  async acknowledgeNotification(
    notificationId: string,
    input: BidviaNotificationAcknowledgementWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    const agentRegistrationId = this.requirePrincipalId(context);

    return this.request(
      `/runtime/account/agents/${encodeURIComponent(agentRegistrationId)}/notifications/${encodeURIComponent(notificationId)}/acknowledgements?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildNotificationAcknowledgementBody(input),
        requestPolicy,
      },
    );
  }

  async retryNotification(
    notificationId: string,
    input: BidviaNotificationRetryWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);

    return this.request(
      `/runtime/notifications/${encodeURIComponent(notificationId)}/retry?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildNotificationRetryBody(input),
        requestPolicy,
      },
    );
  }

  async expireNotification(
    notificationId: string,
    input: BidviaNotificationExpirationWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);

    return this.request(
      `/runtime/notifications/${encodeURIComponent(notificationId)}/expire?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`,
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildNotificationExpirationBody(input),
        requestPolicy,
      },
    );
  }

  async assignTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchAssignInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}/assign`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneTaskAssignBody(input),
        requestPolicy,
      },
    );
  }

  async suspendTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchSuspendInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}/suspend`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneTaskStatusBody(input),
        requestPolicy,
      },
    );
  }

  async resumeTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchResumeInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}/resume`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneTaskStatusBody(input),
        requestPolicy,
      },
    );
  }

  async completeTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchCompleteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}/complete`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneTaskOutcomeBody(input),
        requestPolicy,
      },
    );
  }

  async failTaskDispatch(
    agentRegistrationId: string,
    taskDispatchId: string,
    input: BidviaTaskDispatchFailInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/task-dispatches/${encodeURIComponent(taskDispatchId)}/fail`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneTaskOutcomeBody(input),
        requestPolicy,
      },
    );
  }

  async createClaim(
    agentRegistrationId: string,
    input: BidviaClaimWriteInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(this.accountTaskPlanePath(agentRegistrationId, '/claims', context), {
      context,
      method: 'POST',
      headers: this.requireOperatorActionHeaders(context),
      body: buildTaskPlaneClaimBody(input),
      requestPolicy,
    });
  }

  async acceptClaim(
    agentRegistrationId: string,
    claimId: string,
    input: BidviaClaimAcceptInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/claims/${encodeURIComponent(claimId)}/accept`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneClaimAcceptBody(input),
        requestPolicy,
      },
    );
  }

  async rejectClaim(
    agentRegistrationId: string,
    claimId: string,
    input: BidviaClaimRejectInput,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    return this.request(
      this.accountTaskPlanePath(
        agentRegistrationId,
        `/claims/${encodeURIComponent(claimId)}/reject`,
        context,
      ),
      {
        context,
        method: 'POST',
        headers: this.requireOperatorActionHeaders(context),
        body: buildTaskPlaneClaimRejectBody(input),
        requestPolicy,
      },
    );
  }

  async listCanonicalSemanticConcepts(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/canonical-semantic-concepts'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
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
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listCanonicalSemanticLabels(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/canonical-semantic-labels'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getCanonicalSemanticLabel(
    canonicalSemanticLabelId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/canonical-semantic-labels/${encodeURIComponent(canonicalSemanticLabelId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listCanonicalSemanticMappings(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/canonical-semantic-mappings'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getCanonicalSemanticMapping(
    canonicalSemanticMappingId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/canonical-semantic-mappings/${encodeURIComponent(canonicalSemanticMappingId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listCanonicalSemanticTaxonomyEntries(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/canonical-semantic-taxonomy-entries'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getCanonicalSemanticTaxonomyEntry(
    canonicalSemanticTaxonomyEntryId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/canonical-semantic-taxonomy-entries/${encodeURIComponent(canonicalSemanticTaxonomyEntryId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listCanonicalSemanticLineageLinks(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/canonical-semantic-lineage-links'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getCanonicalSemanticLineageLink(
    canonicalSemanticLineageLinkId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/canonical-semantic-lineage-links/${encodeURIComponent(canonicalSemanticLineageLinkId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listPricingBases(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-bases'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingBasis(pricingBasisId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/pricing-bases/${encodeURIComponent(pricingBasisId)}`, {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listPricingRuleAtoms(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-rule-atoms'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingRuleAtom(pricingRuleAtomId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/pricing-rule-atoms/${encodeURIComponent(pricingRuleAtomId)}`, {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listPricingQuotationMethodModules(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-quotation-method-modules'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingQuotationMethodModule(
    pricingQuotationMethodModuleId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/pricing-quotation-method-modules/${encodeURIComponent(pricingQuotationMethodModuleId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listPricingQuoteTemplates(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-quote-templates'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingQuoteTemplate(
    pricingQuoteTemplateId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(
      `/runtime/pricing-quote-templates/${encodeURIComponent(pricingQuoteTemplateId)}`,
      {
        context,
        method: 'GET',
        headers: this.requireGovernedReadHeaders(context),
        requestPolicy,
      },
    );
  }

  async listPricingQuotations(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-quotations'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingQuotation(
    pricingQuotationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/pricing-quotations/${encodeURIComponent(pricingQuotationId)}`, {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listPricingExplanations(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/pricing-explanations'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getPricingExplanation(
    pricingExplanationId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/pricing-explanations/${encodeURIComponent(pricingExplanationId)}`, {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listDocumentArtifacts(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/document-artifacts'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getDocumentArtifact(documentArtifactId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, `/runtime/document-artifacts/${encodeURIComponent(documentArtifactId)}`), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listMediaAssets(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/media-assets'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getMediaAsset(mediaAssetId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, `/runtime/media-assets/${encodeURIComponent(mediaAssetId)}`), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listEvidenceAssets(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/evidence-assets'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getEvidenceAsset(evidenceAssetId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, `/runtime/evidence-assets/${encodeURIComponent(evidenceAssetId)}`), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listAttachmentBindings(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/attachment-bindings'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getAttachmentBinding(
    attachmentBindingId: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, `/runtime/attachment-bindings/${encodeURIComponent(attachmentBindingId)}`), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listFileResources(requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, '/runtime/file-resources'), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async getFileResource(fileResourceId: string, requestPolicy?: BidviaClientRequestPolicy) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(`/runtime/file-resources/${encodeURIComponent(fileResourceId)}`, {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
      requestPolicy,
    });
  }

  async listTargetAttachmentBindings(
    targetRef: string,
    requestPolicy?: BidviaClientRequestPolicy,
  ) {
    const context = this.resolveRequestContext(requestPolicy);
    this.requireTenantId(context);
    return this.request(this.tenantScopedReadPath(context, `/runtime/targets/${encodeURIComponent(targetRef)}/attachment-bindings`), {
      context,
      method: 'GET',
      headers: this.requireGovernedReadHeaders(context),
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

  private tenantScopedReadPath(context: BidviaClientContext, path: string) {
    return `${path}?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`;
  }

  private agentRuntimePath(
    agentRegistrationId: string,
    suffix: string,
    context: BidviaClientContext,
  ) {
    return `/runtime/agents/${encodeURIComponent(agentRegistrationId)}${suffix}?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`;
  }

  private accountTaskPlanePath(
    agentRegistrationId: string,
    suffix: string,
    context: BidviaClientContext,
  ) {
    return `/runtime/account/agents/${encodeURIComponent(agentRegistrationId)}${suffix}?tenant_id=${encodeURIComponent(this.requireTenantId(context))}`;
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
    return this.appendOptionalPrincipalContextHeaders(context, {
      'x-authorized-tenant-id': context.tenantId,
      'x-bidvia-principal-id': principalId,
    });
  }

  private requireSessionHeaders(context: BidviaClientContext) {
    const { sessionId } = requireIdentitySessionClaimContext(context);

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

  private requireGovernedReadHeaders(context: BidviaClientContext) {
    const { principalId } = requireIdentitySessionGovernedReadContext(context);

    const headers = this.appendOptionalPrincipalContextHeaders(context, {
      'x-authorized-tenant-id': context.tenantId,
      'x-bidvia-principal-id': principalId,
    });
    if (context.companyId) {
      headers['x-authorized-company-id'] = context.companyId;
    }
    if (context.adminSessionId) {
      headers['x-bidvia-admin-session-id'] = context.adminSessionId;
    }
    return headers;
  }

  private requireOperatorActionHeaders(context: BidviaClientContext) {
    const principalId = this.requirePrincipalId(context);
    const companyId = this.requireCompanyId(context);
    return this.appendOptionalPrincipalContextHeaders(context, {
      'x-authorized-tenant-id': context.tenantId,
      'x-bidvia-principal-id': principalId,
      'x-authorized-company-id': companyId,
    });
  }

  private appendOptionalPrincipalContextHeaders(
    context: BidviaClientContext,
    headers: Record<string, string>,
  ) {
    if (context.principalType) {
      headers['x-bidvia-principal-type'] = context.principalType;
    }

    if (context.authorizedRole) {
      headers['x-authorized-role'] = context.authorizedRole;
    }

    return headers;
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
    method: 'GET' | 'POST' | 'PATCH';
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
      method: 'GET' | 'POST' | 'PATCH';
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
    method: 'GET' | 'POST' | 'PATCH',
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
