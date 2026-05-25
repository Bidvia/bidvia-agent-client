import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunDispatchAuthorityClosureArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
}

export interface DispatchAuthorityClosureStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'dispatch-authority-read-before'
    | 'dispatch-authority-request'
    | 'operator-dispatch-authority-decision'
    | 'claimant-closure-status-reread'
    | 'dispatch-authority-read-after';
  status: 'passed' | 'blocked' | 'failed';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RunDispatchAuthorityClosureReport {
  command: 'run-dispatch-authority-closure';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  status: 'passed' | 'blocked' | 'failed';
  phases: Array<{
    phaseKey: 'bootstrap' | 'dispatch-authority-closure';
    status: 'passed' | 'blocked' | 'failed';
    classification: 'pass' | 'bounded-stop' | 'contradiction';
    detail: string;
  }>;
  failure?: {
    phaseKey: 'bootstrap';
    classification: 'contradiction';
    message: string;
  };
  claimant?: {
    email: string;
    sessionId: string;
    tenantId: string;
    companyId: string;
    agentId: string;
    registrationId: string;
  };
  requestId: string | null;
  approvalStatus: string | null;
  closureStatus: unknown;
  dispatchAuthorityAfter: unknown;
  steps: DispatchAuthorityClosureStepResult[];
}

interface RunDispatchAuthorityClosureDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunDispatchAuthorityClosureReport) => Promise<{ outputPath: string }>;
}

export function parseRunDispatchAuthorityClosureArgs(argv: string[]): RunDispatchAuthorityClosureArgs {
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
  report: RunDispatchAuthorityClosureReport,
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

function toStepStatus(status: number): 'passed' | 'blocked' | 'failed' {
  if (status === 200) {
    return 'passed';
  }
  if (status === 401 || status === 403 || status === 409) {
    return 'blocked';
  }
  return 'failed';
}

export async function runDispatchAuthorityClosure(
  args: RunDispatchAuthorityClosureArgs,
  dependencies: RunDispatchAuthorityClosureDependencies = {},
): Promise<RunDispatchAuthorityClosureReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const bootstrapClaimant = dependencies.bootstrapClaimant ?? ((bootstrapArgs) => runBootstrapClaimantLocalDocker(bootstrapArgs));
  const writeReport = dependencies.writeReport ?? defaultWriteReport;
  const timestamp = now();

  let bootstrap: BootstrapClaimantLocalDockerReport;
  try {
    bootstrap = await bootstrapClaimant({
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      stopBeforeDispatchAuthorityRequest: true,
      stopBeforeDispatchAuthorityApproval: true,
      ...(args.email ? { email: args.email } : {}),
      ...(args.password ? { password: args.password } : {}),
      ...(args.companyName ? { companyName: args.companyName } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bootstrap failed';
    const report: RunDispatchAuthorityClosureReport = {
      command: 'run-dispatch-authority-closure',
      generatedAt: timestamp,
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      outputPath: args.outputPath,
      status: 'failed',
      phases: [{ phaseKey: 'bootstrap', status: 'failed', classification: 'contradiction', detail: message }],
      failure: { phaseKey: 'bootstrap', classification: 'contradiction', message },
      requestId: null,
      approvalStatus: null,
      closureStatus: null,
      dispatchAuthorityAfter: null,
      steps: [{
        stepKey: 'bootstrap-claimant',
        status: 'failed',
        route: 'bootstrap-claimant-local-docker',
        requestBody: null,
        responseBody: { error: { code: 'bootstrap_failed', message } },
      }],
    };
    await writeReport(args.outputPath, report);
    return report;
  }

  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };
  const adminHeaders = {
    'content-type': 'application/json',
    'x-bidvia-admin-session-id': bootstrap.admin.adminSessionId,
  };

  const steps: DispatchAuthorityClosureStepResult[] = [{
    stepKey: 'bootstrap-claimant',
    status: 'passed',
    route: 'bootstrap-claimant-local-docker',
    requestBody: { email: bootstrap.claimant.email },
    responseBody: bootstrap,
  }];

  const authorityBefore = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/dispatch-authority`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'dispatch-authority-read-before',
    status: toStepStatus(authorityBefore.status),
    route: '/runtime/account/agents/:agentId/dispatch-authority',
    requestBody: null,
    responseBody: authorityBefore.body,
  });

  const requestBody = {
    requested_target: 'bounded_dispatch_authority_activation',
    now: timestamp,
  };
  const request = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/dispatch-authority-requests`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(requestBody),
  });
  steps.push({
    stepKey: 'dispatch-authority-request',
    status: toStepStatus(request.status),
    route: '/runtime/account/agents/:agentId/dispatch-authority-requests',
    requestBody,
    responseBody: request.body,
  });

  const requestId = (request.body as { request?: { dispatch_authority_activation_request_id?: string } }).request?.dispatch_authority_activation_request_id ?? null;

  const decisionBody = {
    decision: 'APPROVE',
    resolution_reason: 'dispatch-authority-closure-probe',
    now: timestamp,
  };
  const decision = requestId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/operator/dispatch-authority-requests/${encodeURIComponent(requestId)}/decision?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(decisionBody),
      });
  steps.push({
    stepKey: 'operator-dispatch-authority-decision',
    status: requestId === null ? 'blocked' : toStepStatus(decision.status),
    route: '/operator/dispatch-authority-requests/:requestId/decision',
    requestBody: requestId === null ? null : decisionBody,
    responseBody: decision.body,
  });

  const closureStatus = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/closure-status`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'claimant-closure-status-reread',
    status: toStepStatus(closureStatus.status),
    route: '/runtime/account/agents/:agentId/closure-status',
    requestBody: null,
    responseBody: closureStatus.body,
  });

  const authorityAfter = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/dispatch-authority`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'dispatch-authority-read-after',
    status: toStepStatus(authorityAfter.status),
    route: '/runtime/account/agents/:agentId/dispatch-authority',
    requestBody: null,
    responseBody: authorityAfter.body,
  });

  const hasFailed = steps.some((step) => step.status === 'failed');
  const hasBlocked = steps.some((step) => step.status === 'blocked');
  const report: RunDispatchAuthorityClosureReport = {
    command: 'run-dispatch-authority-closure',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    status: hasFailed ? 'failed' : hasBlocked ? 'blocked' : 'passed',
    phases: [
      { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
      {
        phaseKey: 'dispatch-authority-closure',
        status: hasFailed ? 'failed' : hasBlocked ? 'blocked' : 'passed',
        classification: hasFailed ? 'contradiction' : hasBlocked ? 'bounded-stop' : 'pass',
        detail: hasFailed
          ? 'dispatch-authority closure returned a failed step'
          : hasBlocked
            ? 'dispatch-authority closure reached a bounded stop'
            : 'dispatch-authority request, operator approval, and claimant reread completed successfully',
      },
    ],
    claimant: {
      email: bootstrap.claimant.email,
      sessionId: bootstrap.claimant.sessionId,
      tenantId: bootstrap.claimant.tenantId,
      companyId: bootstrap.claimant.companyId,
      agentId: bootstrap.claimant.agentId,
      registrationId: bootstrap.claimant.registrationId,
    },
    requestId,
    approvalStatus: (decision.body as { request?: { status?: string } }).request?.status ?? null,
    closureStatus: closureStatus.body,
    dispatchAuthorityAfter: authorityAfter.body,
    steps,
  };

  await writeReport(args.outputPath, report);
  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunDispatchAuthorityClosureArgs(argv);
  const report = await runDispatchAuthorityClosure(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
