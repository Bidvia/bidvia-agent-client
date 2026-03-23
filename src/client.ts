import type {
  BidviaClientContext,
  BidviaEvidenceSubmissionInput,
  BidviaHeartbeatInput,
  BidviaProposalSubmissionInput,
  BidviaProvisionalAgentClaimInput,
  BidviaProvisionalAgentCreateInput,
  BidviaSyncUploadInput,
} from './contracts.js';

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
