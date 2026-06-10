import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  writeLocalOnboardingState,
} from '../../src/local-onboarding-state.js';

export interface BootstrapClaimantLocalDockerArgs {
  baseUrl: string;
  statePath: string;
  email?: string;
  password?: string;
  companyName?: string;
  stopBeforeDispatchAuthorityRequest?: boolean;
  stopBeforeDispatchAuthorityApproval?: boolean;
}

export interface BootstrapClaimantLocalDockerReport {
  command: 'bootstrap-claimant-local-docker';
  baseUrl: string;
  statePath: string;
  admin: {
    email: string;
    adminSessionId: string;
    adminAccountId: string;
  };
  invitation: {
    invitationId: string;
    invitationType: string;
    status: string;
  };
  claimant: {
    email: string;
    accountId: string;
    sessionId: string;
    tenantId: string;
    companyId: string;
    membershipRole: string | null;
    agentOnboardingAllowed: boolean;
    agentId: string;
    principalId: string;
    registrationId: string;
  };
  dispatchAuthority: {
    requestId: string | null;
    status: string;
    authorityProfileId: string | null;
  };
  externalBinding: {
    bindingId: string | null;
    status: string;
    systemName: string;
    externalAccountRef: string;
  };
}

interface BootstrapClaimantLocalDockerDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  randomSuffix?: () => string;
  writeState?: typeof writeLocalOnboardingState;
}

const seededAdminEmail = 'ops-admin@example.com';
const seededAdminPassword = 'pw-admin-ops';

function requireLoopbackBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim();
  const url = new URL(normalized);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('--base-url must target a loopback local-docker runtime.');
  }
  return normalized;
}

export function parseBootstrapClaimantLocalDockerArgs(argv: string[]): BootstrapClaimantLocalDockerArgs {
  let baseUrl: string | undefined;
  let statePath: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  let companyName: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--base-url') {
      baseUrl = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--state-path') {
      statePath = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--email') {
      email = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--password') {
      password = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--company-name') {
      companyName = argv[index + 1];
      index += 1;
    }
  }

  if (!baseUrl?.trim()) {
    throw new Error('--base-url is required');
  }

  if (!statePath?.trim()) {
    throw new Error('--state-path is required');
  }

  return {
    baseUrl: requireLoopbackBaseUrl(baseUrl),
    statePath: statePath.trim(),
    ...(email?.trim() ? { email: email.trim() } : {}),
    ...(password?.trim() ? { password: password.trim() } : {}),
    ...(companyName?.trim() ? { companyName: companyName.trim() } : {}),
  };
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetchImpl(url, init);
  return response.json();
}

function extractBootstrapErrorMessage(stepLabel: string, payload: unknown): string {
  const errorPayload = payload as {
    error?: {
      code?: string;
      message?: string;
    };
  };

  if (errorPayload.error?.code && errorPayload.error?.message) {
    return `bootstrap ${stepLabel} failed: ${errorPayload.error.code}: ${errorPayload.error.message}`;
  }

  return `bootstrap ${stepLabel} failed: unexpected response shape`;
}

function requireBootstrapString(
  value: string | undefined,
  stepLabel: string,
  payload: unknown,
): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  throw new Error(extractBootstrapErrorMessage(stepLabel, payload));
}

export async function runBootstrapClaimantLocalDocker(
  args: BootstrapClaimantLocalDockerArgs,
  dependencies: BootstrapClaimantLocalDockerDependencies = {},
): Promise<BootstrapClaimantLocalDockerReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const randomSuffix = dependencies.randomSuffix ?? randomUUID;
  const writeState = dependencies.writeState ?? writeLocalOnboardingState;

  const timestamp = now();
  const runSuffix = randomSuffix();
  const claimantEmail = args.email ?? `bidvia-live-${runSuffix}@example.com`;
  const claimantPassword = args.password ?? 'secret-live-1';
  const claimantCompanyName = args.companyName ?? 'Bidvia Live Co';
  const expiresAt = new Date(Date.parse(timestamp) + 24 * 60 * 60 * 1000).toISOString();
  const provisionalAgentRef = `prov-${runSuffix}`;
  const externalSystemName = `bootstrap-live-${runSuffix}`;
  const externalAccountRef = `ext-${runSuffix}`;

  const adminSignIn = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/admin/sessions/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: seededAdminEmail,
      password: seededAdminPassword,
      now: timestamp,
    }),
  }) as {
    admin_session?: { admin_session_id?: string; admin_account_id?: string };
  };
  const adminSessionId = requireBootstrapString(
    adminSignIn.admin_session?.admin_session_id,
    'admin sign-in',
    adminSignIn,
  );
  const adminAccountId = requireBootstrapString(
    adminSignIn.admin_session?.admin_account_id,
    'admin sign-in',
    adminSignIn,
  );

  const invitation = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/admin/invitations/issue`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bidvia-admin-session-id': adminSessionId,
    },
    body: JSON.stringify({
      invitation_type: 'ENTERPRISE_ACCOUNT',
      target_tenant_id: 'tenant-a',
      target_org_id: null,
      target_role: null,
      expires_at: expiresAt,
      now: timestamp,
    }),
  }) as {
    invitation: { invitation_id: string; invitation_token: string; invitation_type: string; status: string };
  };

  const signUp = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/accounts/enterprise/sign-up`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: claimantEmail,
      password: claimantPassword,
      invitation_token: invitation.invitation.invitation_token,
      company_name: claimantCompanyName,
      now: timestamp,
    }),
  }) as {
    account: { account_id: string };
  };

  const signIn = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/sessions/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: claimantEmail,
      password: claimantPassword,
      now: timestamp,
    }),
  }) as {
    session: {
      session_id: string;
      tenant_id: string;
      active_org_context: { org_id: string };
    };
  };

  const accountMe = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/account/me`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': signIn.session.session_id,
    },
  }) as {
    account: { account_id: string; tenant_id: string };
    session: {
      session_id: string;
      tenant_id: string;
      active_org_context: { org_id: string };
    };
    memberships?: Array<{ role?: string; status?: string }>;
    agent_onboarding_allowed?: boolean;
  };

  const provisionalCreate = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/agents/provisional`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provisional_agent_ref: provisionalAgentRef,
      now: timestamp,
    }),
  }) as {
    provisional_agent_ref?: string;
    claim_token?: string;
  };

  const returnedProvisionalAgentRef = provisionalCreate.provisional_agent_ref ?? provisionalAgentRef;

  const provisionalQuery = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/agents/provisional?provisional_agent_ref=${encodeURIComponent(returnedProvisionalAgentRef)}`, {
    method: 'GET',
  }) as {
    provisional_agent?: {
      provisional_agent_ref?: string;
      claim_token?: string;
    };
  };

  const claimToken = provisionalCreate.claim_token
    ?? provisionalQuery.provisional_agent?.claim_token;
  if (!claimToken) {
    throw new Error('claim token missing from provisional bootstrap flow');
  }

  const claim = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/agents/provisional/claim`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bidvia-session-id': signIn.session.session_id,
    },
    body: JSON.stringify({
      provisional_agent_ref: returnedProvisionalAgentRef,
      claim_token: claimToken,
      now: timestamp,
    }),
  }) as {
    registration: {
      agent_registration_id: string;
      agent_id: string;
      principal_id: string;
      status: string;
    };
  };

  const claimedAgentId = requireBootstrapString(claim.registration?.agent_id, 'claim', claim);
  const claimedPrincipalId = requireBootstrapString(claim.registration?.principal_id, 'claim', claim);
  const claimedRegistrationId = requireBootstrapString(claim.registration?.agent_registration_id, 'claim', claim);

  let approvedDispatchAuthorityRequestId: string | null = null;
  let dispatchAuthorityStatus = 'NOT_REQUESTED';
  let authorityProfileId: string | null = null;
  let externalBindingId: string | null = null;
  let externalBindingStatus = 'missing';

  if (!args.stopBeforeDispatchAuthorityRequest) {
    const dispatchAuthorityRequest = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(claimedAgentId)}/dispatch-authority-requests`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bidvia-session-id': signIn.session.session_id,
      },
      body: JSON.stringify({
        requested_target: 'bounded_dispatch_authority_activation',
        now: timestamp,
      }),
    }) as {
      request: {
        dispatch_authority_activation_request_id: string;
        status: string;
      };
    };
    const dispatchAuthorityRequestId = requireBootstrapString(
      dispatchAuthorityRequest.request?.dispatch_authority_activation_request_id,
      'dispatch-authority request',
      dispatchAuthorityRequest,
    );
    approvedDispatchAuthorityRequestId = dispatchAuthorityRequestId;
    dispatchAuthorityStatus = dispatchAuthorityRequest.request?.status ?? 'OPEN';

    if (args.stopBeforeDispatchAuthorityApproval) {
      dispatchAuthorityStatus = 'OPEN';
    } else {
    const dispatchAuthorityDecision = await fetchJson(fetchImpl, `${args.baseUrl}/operator/dispatch-authority-requests/${encodeURIComponent(dispatchAuthorityRequestId)}/decision?tenant_id=${encodeURIComponent(accountMe.account.tenant_id)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bidvia-admin-session-id': adminSessionId,
        'x-authorized-tenant-id': accountMe.account.tenant_id,
      },
      body: JSON.stringify({
        decision: 'APPROVE',
        resolution_reason: 'bootstrap-claimant-local-docker',
        now: timestamp,
      }),
    }) as {
      request: {
        dispatch_authority_activation_request_id: string;
        status: string;
      };
      authority_profile?: {
        authority_profile_id?: string;
        status?: string;
      };
    };
    approvedDispatchAuthorityRequestId = requireBootstrapString(
      dispatchAuthorityDecision.request?.dispatch_authority_activation_request_id,
      'dispatch-authority decision',
      dispatchAuthorityDecision,
    );
    dispatchAuthorityStatus = dispatchAuthorityDecision.request.status;
    authorityProfileId = dispatchAuthorityDecision.authority_profile?.authority_profile_id ?? null;

    const externalBinding = await fetchJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(claimedAgentId)}/external-account-bindings?tenant_id=${encodeURIComponent(accountMe.account.tenant_id)}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bidvia-session-id': signIn.session.session_id,
      },
      body: JSON.stringify({
        system_type: 'wms',
        system_name: externalSystemName,
        external_account_ref: externalAccountRef,
        now: timestamp,
      }),
    }) as {
      external_account_binding: {
        external_account_binding_id: string;
        status: string;
      };
    };
    externalBindingId = requireBootstrapString(
      externalBinding.external_account_binding?.external_account_binding_id,
      'external-account binding',
      externalBinding,
    );
    externalBindingStatus = requireBootstrapString(
      externalBinding.external_account_binding?.status,
      'external-account binding',
      externalBinding,
    );
    }
  }

  await writeState({
    tenantId: accountMe.account.tenant_id,
    agentId: claimedAgentId,
    principalId: claimedPrincipalId,
    companyId: accountMe.session.active_org_context.org_id,
    registrationId: claimedRegistrationId,
    sessionId: accountMe.session.session_id,
    lastCompletedStep: 'account-agent-external-binding',
    createdAt: timestamp,
    updatedAt: timestamp,
  }, {
    path: args.statePath,
  });

  return {
    command: 'bootstrap-claimant-local-docker',
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    admin: {
      email: seededAdminEmail,
      adminSessionId,
      adminAccountId,
    },
    invitation: {
      invitationId: invitation.invitation.invitation_id,
      invitationType: invitation.invitation.invitation_type,
      status: invitation.invitation.status,
    },
    claimant: {
      email: claimantEmail,
      accountId: signUp.account.account_id,
      sessionId: accountMe.session.session_id,
      tenantId: accountMe.account.tenant_id,
      companyId: accountMe.session.active_org_context.org_id,
      membershipRole: accountMe.memberships?.[0]?.role ?? null,
      agentOnboardingAllowed: accountMe.agent_onboarding_allowed === true,
      agentId: claimedAgentId,
      principalId: claimedPrincipalId,
      registrationId: claimedRegistrationId,
    },
    dispatchAuthority: {
      requestId: approvedDispatchAuthorityRequestId,
      status: dispatchAuthorityStatus,
      authorityProfileId,
    },
    externalBinding: {
      bindingId: externalBindingId,
      status: externalBindingStatus,
      systemName: externalSystemName,
      externalAccountRef,
    },
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseBootstrapClaimantLocalDockerArgs(argv);
  const result = await runBootstrapClaimantLocalDocker(args);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
