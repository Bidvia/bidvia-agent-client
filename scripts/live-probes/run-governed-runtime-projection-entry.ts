import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunGovernedRuntimeProjectionEntryArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
}

export interface GovernedRuntimeProjectionEntryStepResult {
  stepKey: 'bootstrap-claimant' | 'account-agent' | 'account-agent-closure-status' | 'account-agent-dispatch-authority';
  status: 'passed' | 'blocked' | 'failed';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RunGovernedRuntimeProjectionEntryReport {
  command: 'run-governed-runtime-projection-entry';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  status: 'passed' | 'blocked' | 'failed';
  phases: Array<{
    phaseKey: 'bootstrap' | 'projection-entry';
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
    membershipRole: string | null;
  };
  accountOwnedReads: {
    accountAgent: { status: number; body: unknown };
    closureStatus: { status: number; body: unknown };
    dispatchAuthority: { status: number; body: unknown };
  };
  steps: GovernedRuntimeProjectionEntryStepResult[];
}

interface RunGovernedRuntimeProjectionEntryDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunGovernedRuntimeProjectionEntryReport) => Promise<{ outputPath: string }>;
}

export function parseRunGovernedRuntimeProjectionEntryArgs(argv: string[]): RunGovernedRuntimeProjectionEntryArgs {
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
  report: RunGovernedRuntimeProjectionEntryReport,
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

export async function runGovernedRuntimeProjectionEntry(
  args: RunGovernedRuntimeProjectionEntryArgs,
  dependencies: RunGovernedRuntimeProjectionEntryDependencies = {},
): Promise<RunGovernedRuntimeProjectionEntryReport> {
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
      ...(args.email ? { email: args.email } : {}),
      ...(args.password ? { password: args.password } : {}),
      ...(args.companyName ? { companyName: args.companyName } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bootstrap failed';
    const report: RunGovernedRuntimeProjectionEntryReport = {
      command: 'run-governed-runtime-projection-entry',
      generatedAt: timestamp,
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      outputPath: args.outputPath,
      status: 'failed',
      phases: [{ phaseKey: 'bootstrap', status: 'failed', classification: 'contradiction', detail: message }],
      failure: { phaseKey: 'bootstrap', classification: 'contradiction', message },
      accountOwnedReads: {
        accountAgent: { status: 0, body: { skipped: true } },
        closureStatus: { status: 0, body: { skipped: true } },
        dispatchAuthority: { status: 0, body: { skipped: true } },
      },
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
  const steps: GovernedRuntimeProjectionEntryStepResult[] = [{
    stepKey: 'bootstrap-claimant',
    status: 'passed',
    route: 'bootstrap-claimant-local-docker',
    requestBody: { email: bootstrap.claimant.email },
    responseBody: bootstrap,
  }];

  const accountAgent = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'account-agent',
    status: toStepStatus(accountAgent.status),
    route: '/runtime/account/agents/:agentId',
    requestBody: null,
    responseBody: accountAgent.body,
  });

  const closureStatus = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/closure-status?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'account-agent-closure-status',
    status: toStepStatus(closureStatus.status),
    route: '/runtime/account/agents/:agentId/closure-status',
    requestBody: null,
    responseBody: closureStatus.body,
  });

  const dispatchAuthority = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/dispatch-authority`, {
    method: 'GET',
    headers: sessionHeaders,
  });
  steps.push({
    stepKey: 'account-agent-dispatch-authority',
    status: toStepStatus(dispatchAuthority.status),
    route: '/runtime/account/agents/:agentId/dispatch-authority',
    requestBody: null,
    responseBody: dispatchAuthority.body,
  });

  const hasFailed = steps.some((step) => step.status === 'failed');
  const hasBlocked = steps.some((step) => step.status === 'blocked');
  const report: RunGovernedRuntimeProjectionEntryReport = {
    command: 'run-governed-runtime-projection-entry',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    status: hasFailed ? 'failed' : hasBlocked ? 'blocked' : 'passed',
    phases: [
      { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
      {
        phaseKey: 'projection-entry',
        status: hasFailed ? 'failed' : hasBlocked ? 'blocked' : 'passed',
        classification: hasFailed ? 'contradiction' : hasBlocked ? 'bounded-stop' : 'pass',
        detail: hasFailed
          ? 'governed runtime projection entry returned a failed read'
          : hasBlocked
            ? 'governed runtime projection entry reached a bounded stop'
            : 'governed runtime projection entry completed successfully',
      },
    ],
    claimant: {
      email: bootstrap.claimant.email,
      sessionId: bootstrap.claimant.sessionId,
      tenantId: bootstrap.claimant.tenantId,
      companyId: bootstrap.claimant.companyId,
      membershipRole: bootstrap.claimant.membershipRole,
    },
    accountOwnedReads: {
      accountAgent,
      closureStatus,
      dispatchAuthority,
    },
    steps,
  };

  await writeReport(args.outputPath, report);
  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunGovernedRuntimeProjectionEntryArgs(argv);
  const report = await runGovernedRuntimeProjectionEntry(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
