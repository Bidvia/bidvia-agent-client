import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeMaterializationStatus } from '../../src/business-universe/normalize.js';
import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunP1OperatorDeeperChainArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
}

export interface OperatorDeeperChainStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'operator-source-listing-create'
    | 'operator-source-listing-activate'
    | 'operator-candidate-listing-create'
    | 'operator-candidate-listing-activate'
    | 'operator-match-candidates'
    | 'operator-list-matches'
    | 'operator-create-connection'
    | 'operator-approve-connection'
    | 'operator-package-export'
    | 'operator-commercial-action-create'
    | 'operator-commercial-action-policy-check'
    | 'operator-commercial-action-request-approval'
    | 'operator-commercial-action-execute'
    | 'operator-commercial-action-status'
    | 'operator-commercial-action-receipt'
    | 'operator-commercial-action-audit'
    | 'claimant-opportunity-status'
    | 'claimant-opportunity-end-state';
  status: 'passed' | 'failed' | 'blocked';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RunP1OperatorDeeperChainReport {
  command: 'run-p1-operator-deeper-chain';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  bootstrap: BootstrapClaimantLocalDockerReport;
  ids: {
    sourceListingId: string;
    candidateListingId: string;
    matchId: string | null;
    connectionRequestId: string | null;
    connectionApprovalRequestId: string | null;
    opportunityId: string | null;
    packageId: string | null;
    commercialActionRequestId: string | null;
    commercialActionApprovalRequestId: string | null;
    receiptId: string | null;
    auditId: string | null;
  };
  materializationReadback: {
    materialization: unknown;
    stageSnapshot: ReturnType<typeof normalizeMaterializationStatus>;
  };
  claimantReadbacks: {
    status: unknown;
    endState: unknown;
  };
  steps: OperatorDeeperChainStepResult[];
}

interface RunP1OperatorDeeperChainDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  randomSuffix?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunP1OperatorDeeperChainReport) => Promise<{ outputPath: string }>;
}

export function parseRunP1OperatorDeeperChainArgs(argv: string[]): RunP1OperatorDeeperChainArgs {
  const bootstrapArgs = parseBootstrapClaimantLocalDockerArgs(argv);
  let outputPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      outputPath = argv[index + 1];
      break;
    }
  }

  if (!outputPath?.trim()) {
    throw new Error('--output is required');
  }

  return {
    ...bootstrapArgs,
    outputPath: outputPath.trim(),
  };
}

async function defaultWriteReport(
  outputPath: string,
  report: RunP1OperatorDeeperChainReport,
): Promise<{ outputPath: string }> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  return { outputPath };
}

async function requestJson(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<{ status: number; body: unknown }> {
  const response = await fetchImpl(url, init);
  return {
    status: response.status,
    body: await response.json(),
  };
}

function pushStep(
  steps: OperatorDeeperChainStepResult[],
  stepKey: OperatorDeeperChainStepResult['stepKey'],
  route: string,
  requestBody: unknown,
  response: { status: number; body: unknown },
) {
  steps.push({
    stepKey,
    status: response.status === 200 ? 'passed' : 'failed',
    route,
    requestBody,
    responseBody: response.body,
  });
}

function pushBlockedStep(
  steps: OperatorDeeperChainStepResult[],
  stepKey: OperatorDeeperChainStepResult['stepKey'],
  route: string,
  blockedBy: string,
) {
  steps.push({
    stepKey,
    status: 'blocked',
    route,
    requestBody: null,
    responseBody: {
      skipped: true,
      blockedBy,
    },
  });
}

export async function runP1OperatorDeeperChain(
  args: RunP1OperatorDeeperChainArgs,
  dependencies: RunP1OperatorDeeperChainDependencies = {},
): Promise<RunP1OperatorDeeperChainReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const randomSuffix = dependencies.randomSuffix ?? (() => `${Date.now()}`);
  const bootstrapClaimant = dependencies.bootstrapClaimant ?? ((bootstrapArgs) => runBootstrapClaimantLocalDocker(bootstrapArgs));
  const writeReport = dependencies.writeReport ?? defaultWriteReport;

  const timestamp = now();
  const suffix = randomSuffix();
  const sourceListingId = `source-listing-${suffix}`;
  const candidateListingId = `candidate-listing-${suffix}`;

  const bootstrap = await bootstrapClaimant({
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    ...(args.email ? { email: args.email } : {}),
    ...(args.password ? { password: args.password } : {}),
    ...(args.companyName ? { companyName: args.companyName } : {}),
  });

  const adminHeaders = {
    'content-type': 'application/json',
    'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
  };
  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };
  const steps: OperatorDeeperChainStepResult[] = [
    {
      stepKey: 'bootstrap-claimant',
      status: 'passed',
      route: 'bootstrap-claimant-local-docker',
      requestBody: {
        email: bootstrap.claimant.email,
      },
      responseBody: bootstrap,
    },
  ];

  const strictSku = `sku-strict-${suffix}`;

  const sourceListingCreateBody = {
    listing_id: sourceListingId,
    listing_type: 'supply',
    company_id: 'company-public',
    actor_id: 'operator-system',
    category: 'basic inorganic industrial chemical',
    sku: strictSku,
    quantity_value: '15',
    quantity_unit: 'tons',
    region_summary: 'China -> Vietnam',
    verification_status: 'verified',
    freshness_ts: timestamp,
    trace_id: `trace-source-${suffix}`,
    idempotency_key: sourceListingId,
    now: timestamp,
  };
  const sourceListingCreate = await requestJson(fetchImpl, `${args.baseUrl}/operator/execution/listings?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(sourceListingCreateBody),
  });
  pushStep(steps, 'operator-source-listing-create', '/operator/execution/listings', sourceListingCreateBody, sourceListingCreate);

  const sourceListingActivateBody = {
    company_id: 'company-public',
    actor_id: 'operator-system',
    verification_status: 'verified',
    now: timestamp,
  };
  const sourceListingActivate = await requestJson(fetchImpl, `${args.baseUrl}/operator/execution/listings/${encodeURIComponent(sourceListingId)}/activate?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(sourceListingActivateBody),
  });
  pushStep(steps, 'operator-source-listing-activate', '/operator/execution/listings/:listingId/activate', sourceListingActivateBody, sourceListingActivate);
  const sourceListingTriggerEventId = (sourceListingActivate.body as { listing?: { last_event_id?: string } }).listing?.last_event_id
    ?? `evt-${suffix}`;
  const materializationStatus = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/execution/listings/${encodeURIComponent(sourceListingId)}/materialization-status?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });

  const candidateListingCreateBody = {
    listing_id: candidateListingId,
    listing_type: 'demand',
    company_id: 'company-public',
    actor_id: 'operator-system',
    category: 'basic inorganic industrial chemical',
    sku: strictSku,
    quantity_value: '15',
    quantity_unit: 'tons',
    region_summary: 'China -> Vietnam',
    verification_status: 'verified',
    freshness_ts: timestamp,
    trace_id: `trace-candidate-${suffix}`,
    idempotency_key: candidateListingId,
    now: timestamp,
  };
  const candidateListingCreate = await requestJson(fetchImpl, `${args.baseUrl}/operator/execution/listings?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(candidateListingCreateBody),
  });
  pushStep(steps, 'operator-candidate-listing-create', '/operator/execution/listings', candidateListingCreateBody, candidateListingCreate);

  const candidateListingActivateBody = {
    company_id: 'company-public',
    actor_id: 'operator-system',
    verification_status: 'verified',
    now: timestamp,
  };
  const candidateListingActivate = await requestJson(fetchImpl, `${args.baseUrl}/operator/execution/listings/${encodeURIComponent(candidateListingId)}/activate?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(candidateListingActivateBody),
  });
  pushStep(steps, 'operator-candidate-listing-activate', '/operator/execution/listings/:listingId/activate', candidateListingActivateBody, candidateListingActivate);

  const matchCandidatesBody = {
    workflow_run_id: `wf-${suffix}`,
    trigger_event_id: sourceListingTriggerEventId,
    upstream_decision: 'READY_FOR_ROUTING',
    detected_evidence_level: 2,
    required_evidence_level: 2,
    missing_fields: [],
    freshness_ts: timestamp,
    trace_id: `trace-source-${suffix}`,
    idempotency_key: `idem-match-${suffix}`,
    now: timestamp,
  };
  const matchCandidates = await requestJson(fetchImpl, `${args.baseUrl}/operator/execution/listings/${encodeURIComponent(sourceListingId)}/match-candidates?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(matchCandidatesBody),
  });
  pushStep(steps, 'operator-match-candidates', '/operator/execution/listings/:listingId/match-candidates', matchCandidatesBody, matchCandidates);

  const listMatches = await requestJson(fetchImpl, `${args.baseUrl}/operator/matches?tenant_id=tenant-public&source_listing_id=${encodeURIComponent(sourceListingId)}`, {
    method: 'GET',
    headers: {
      'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
    },
  });
  pushStep(steps, 'operator-list-matches', '/operator/matches', null, listMatches);

  const matchId = (listMatches.body as { items?: Array<{ match_id?: string }> }).items?.[0]?.match_id ?? null;
  const createConnectionBody = {
    company_id: 'company-public',
    source_match_id: matchId,
    requester_actor_id: 'operator-system',
    requester_company_id: 'company-public',
    risk_tier: 'HIGH',
    policy_version: 'policy-v1',
    approval_matrix_version: 'matrix-v1',
    action_type: 'CONTACT_SHARE',
    now: timestamp,
  };
  const createConnection = await requestJson(fetchImpl, `${args.baseUrl}/operator/connections?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(createConnectionBody),
  });
  pushStep(steps, 'operator-create-connection', '/operator/connections', createConnectionBody, createConnection);

  const connectionRequestId = (createConnection.body as { connectionRequest?: { connection_request_id?: string } }).connectionRequest?.connection_request_id ?? null;
  const connectionApprovalRequestId = (createConnection.body as { connectionRequest?: { approval_request_id?: string } }).connectionRequest?.approval_request_id ?? null;

  const approveConnectionBody = {
    actor_id: 'operator-system',
    decision: 'APPROVE',
    now: timestamp,
  };
  const approveConnection = await requestJson(fetchImpl, `${args.baseUrl}/operator/approvals/${encodeURIComponent(connectionApprovalRequestId ?? '')}/decision?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(approveConnectionBody),
  });
  pushStep(steps, 'operator-approve-connection', '/operator/approvals/:approvalRequestId/decision', approveConnectionBody, approveConnection);

  const opportunityId = (approveConnection.body as { resolution?: { artifacts?: { opportunity?: { opportunity_id?: string } } } }).resolution?.artifacts?.opportunity?.opportunity_id ?? null;
  if (opportunityId === null) {
    pushBlockedStep(steps, 'operator-package-export', '/operator/opportunities/:opportunityId/package-export', 'missing_opportunity_id');
    pushBlockedStep(steps, 'operator-commercial-action-create', '/runtime/commercial-actions', 'missing_package_id');
    pushBlockedStep(steps, 'operator-commercial-action-status', '/runtime/commercial-actions/:commercialActionRequestId/status', 'missing_commercial_action_request_id');
    pushBlockedStep(steps, 'claimant-opportunity-status', '/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/status', 'missing_opportunity_id');
    pushBlockedStep(steps, 'claimant-opportunity-end-state', '/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/end-state', 'missing_opportunity_id');

    const report: RunP1OperatorDeeperChainReport = {
      command: 'run-p1-operator-deeper-chain',
      generatedAt: timestamp,
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      outputPath: args.outputPath,
      bootstrap,
      ids: {
        sourceListingId,
        candidateListingId,
        matchId,
        connectionRequestId,
        connectionApprovalRequestId,
        opportunityId: null,
        packageId: null,
        commercialActionRequestId: null,
        commercialActionApprovalRequestId: null,
        receiptId: null,
        auditId: null,
      },
      materializationReadback: {
        materialization: materializationStatus.body,
        stageSnapshot: normalizeMaterializationStatus(materializationStatus.body as {
          materialization_stage?: string;
          recommended_next_step?: string;
          next_step_kind?: string;
          operator_handoff?: {
            owner?: string;
            route?: string;
          };
        }, {
          sourceCompanyId: bootstrap.claimant.companyId,
          canonicalCompanyId: 'company-public',
          tenantId: bootstrap.claimant.tenantId,
          activeOrgId: bootstrap.claimant.companyId,
          principalId: bootstrap.claimant.principalId,
        }),
      },
      claimantReadbacks: {
        status: {
          skipped: true,
          blockedBy: 'missing_opportunity_id',
        },
        endState: {
          skipped: true,
          blockedBy: 'missing_opportunity_id',
        },
      },
      steps,
    };

    await writeReport(args.outputPath, report);
    return report;
  }

  const packageExportBody = {
    render_template_id: 'template-1',
    content_ref: `content://packages/${opportunityId}`,
    redaction_profile: 'review-safe',
    target_system: 'downstream-dataroom',
    operation_type: 'export',
    node_id: 'node-1',
    runtime_id: 'runtime-1',
    agent_id: 'operator-system',
    bound_account_id: 'company-public',
    now: timestamp,
  };
  const packageExport = await requestJson(fetchImpl, `${args.baseUrl}/operator/opportunities/${encodeURIComponent(opportunityId ?? '')}/package-export?tenant_id=tenant-public`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(packageExportBody),
  });
  pushStep(steps, 'operator-package-export', '/operator/opportunities/:opportunityId/package-export', packageExportBody, packageExport);

  const packageId = (packageExport.body as { package?: { package_id?: string } }).package?.package_id ?? null;
  const commercialActionCreateBody = {
    governed_action: 'EXTERNAL_WRITE',
    subject_type: 'OPPORTUNITY_PACKAGE',
    subject_id: packageId,
    trace_id: `trace-commercial-${suffix}`,
    workflow_id: 'WF-6',
    now: timestamp,
  };
  const commercialActionCreate = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions?tenant_id=tenant-public`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'x-authorized-company-id': 'company-public',
      'x-bidvia-principal-id': 'operator-system',
    },
    body: JSON.stringify(commercialActionCreateBody),
  });
  pushStep(steps, 'operator-commercial-action-create', '/runtime/commercial-actions', commercialActionCreateBody, commercialActionCreate);

  const commercialActionRequestId = (commercialActionCreate.body as { request?: { commercial_action_request_id?: string } }).request?.commercial_action_request_id ?? null;
  const policyCheckBody = {
    policy_version: 'policy-v1',
    outcome: 'APPROVAL_REQUIRED',
    now: timestamp,
  };
  const policyCheck = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/policy-check?tenant_id=tenant-public`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'x-authorized-company-id': 'company-public',
      'x-bidvia-principal-id': 'operator-system',
    },
    body: JSON.stringify(policyCheckBody),
  });
  pushStep(steps, 'operator-commercial-action-policy-check', '/runtime/commercial-actions/:commercialActionRequestId/policy-check', policyCheckBody, policyCheck);

  const requestApprovalBody = {
    approval_request_id: `apr-request-${suffix}`,
    now: timestamp,
  };
  const requestApproval = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/request-approval?tenant_id=tenant-public`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'x-authorized-company-id': 'company-public',
      'x-bidvia-principal-id': 'operator-system',
    },
    body: JSON.stringify(requestApprovalBody),
  });
  pushStep(steps, 'operator-commercial-action-request-approval', '/runtime/commercial-actions/:commercialActionRequestId/request-approval', requestApprovalBody, requestApproval);

  const commercialActionApprovalRequestId = (requestApproval.body as { approval_binding?: { approval_request_id?: string } }).approval_binding?.approval_request_id
    ?? requestApprovalBody.approval_request_id;
  const executeBody = {
    approval_request_id: commercialActionApprovalRequestId,
    receipt_id: `receipt-${suffix}`,
    approval_result: 'APPROVED',
    result_status: 'SUCCEEDED',
    audit_id: `audit-${suffix}`,
    now: timestamp,
  };
  const execute = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/execute?tenant_id=tenant-public`, {
    method: 'POST',
    headers: {
      ...adminHeaders,
      'x-authorized-company-id': 'company-public',
      'x-bidvia-principal-id': 'operator-system',
    },
    body: JSON.stringify(executeBody),
  });
  pushStep(steps, 'operator-commercial-action-execute', '/runtime/commercial-actions/:commercialActionRequestId/execute', executeBody, execute);

  const status = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/status?tenant_id=tenant-public`, {
    method: 'GET',
    headers: {
      'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
    },
  });
  pushStep(steps, 'operator-commercial-action-status', '/runtime/commercial-actions/:commercialActionRequestId/status', null, status);

  const receipt = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/receipt?tenant_id=tenant-public`, {
    method: 'GET',
    headers: {
      'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
    },
  });
  pushStep(steps, 'operator-commercial-action-receipt', '/runtime/commercial-actions/:commercialActionRequestId/receipt', null, receipt);

  const audit = await requestJson(fetchImpl, `${args.baseUrl}/runtime/commercial-actions/${encodeURIComponent(commercialActionRequestId ?? '')}/audit?tenant_id=tenant-public`, {
    method: 'GET',
    headers: {
      'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
    },
  });
  pushStep(steps, 'operator-commercial-action-audit', '/runtime/commercial-actions/:commercialActionRequestId/audit', null, audit);

  const claimantOpportunityStatus = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/execution/opportunities/${encodeURIComponent(opportunityId ?? '')}/status?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  pushStep(steps, 'claimant-opportunity-status', '/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/status', null, claimantOpportunityStatus);

  const claimantOpportunityEndState = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/execution/opportunities/${encodeURIComponent(opportunityId ?? '')}/end-state?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  pushStep(steps, 'claimant-opportunity-end-state', '/runtime/account/agents/:agentId/execution/opportunities/:opportunityId/end-state', null, claimantOpportunityEndState);

  const report: RunP1OperatorDeeperChainReport = {
    command: 'run-p1-operator-deeper-chain',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    bootstrap,
    ids: {
      sourceListingId,
      candidateListingId,
      matchId,
      connectionRequestId,
      connectionApprovalRequestId,
      opportunityId,
      packageId,
      commercialActionRequestId,
      commercialActionApprovalRequestId,
      receiptId: (execute.body as { receipt?: { receipt_id?: string } }).receipt?.receipt_id
        ?? (receipt.body as { receipt?: { receipt_id?: string } }).receipt?.receipt_id
        ?? null,
      auditId: (execute.body as { audit_link?: { audit_id?: string } }).audit_link?.audit_id
        ?? (audit.body as { audit_link?: { audit_id?: string } }).audit_link?.audit_id
        ?? null,
    },
    materializationReadback: {
      materialization: materializationStatus.body,
      stageSnapshot: normalizeMaterializationStatus(materializationStatus.body as {
        materialization_stage?: string;
        recommended_next_step?: string;
        next_step_kind?: string;
        operator_handoff?: {
          owner?: string;
          route?: string;
        };
      }, {
        sourceCompanyId: bootstrap.claimant.companyId,
        canonicalCompanyId: 'company-public',
        tenantId: bootstrap.claimant.tenantId,
        activeOrgId: bootstrap.claimant.companyId,
        principalId: bootstrap.claimant.principalId,
      }),
    },
    claimantReadbacks: {
      status: claimantOpportunityStatus.body,
      endState: claimantOpportunityEndState.body,
    },
    steps,
  };

  await writeReport(args.outputPath, report);

  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunP1OperatorDeeperChainArgs(argv);
  const report = await runP1OperatorDeeperChain(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
