import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunPlatformManagedTaskConsumerArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
}

export interface PlatformManagedTaskConsumerStepResult {
  stepKey: 'bootstrap-claimant' | 'platform-managed-registration' | 'platform-managed-create-lease' | 'platform-managed-create-task-dispatch';
  status: 'passed' | 'blocked' | 'failed';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RunPlatformManagedTaskConsumerReport {
  command: 'run-platform-managed-task-consumer';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  status: 'passed' | 'blocked' | 'failed';
  phases: Array<{
    phaseKey: 'bootstrap' | 'platform-managed-consumer';
    status: 'passed' | 'blocked' | 'failed';
    classification: 'pass' | 'bounded-stop' | 'contradiction';
    detail: string;
  }>;
  claimant: BootstrapClaimantLocalDockerReport['claimant'];
  platformManagedAgentId: string | null;
  allowedActions: string[];
  leaseAttempt: { status: number; body: unknown };
  createDispatchAttempt: { status: number; body: unknown };
  steps: PlatformManagedTaskConsumerStepResult[];
}

interface RunPlatformManagedTaskConsumerDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  platformManagedRegistration?: (args: {
    fetchImpl: typeof fetch;
    baseUrl: string;
    sessionId: string;
    agentId: string;
    principalId: string;
    now: string;
  }) => Promise<unknown>;
  writeReport?: (outputPath: string, report: RunPlatformManagedTaskConsumerReport) => Promise<{ outputPath: string }>;
}

export function parseRunPlatformManagedTaskConsumerArgs(argv: string[]): RunPlatformManagedTaskConsumerArgs {
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
  report: RunPlatformManagedTaskConsumerReport,
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
  if (status === 401 || status === 403 || status === 404 || status === 409) {
    return 'blocked';
  }
  return 'failed';
}

async function defaultPlatformManagedRegistration(input: {
  fetchImpl: typeof fetch;
  baseUrl: string;
  sessionId: string;
  agentId: string;
  principalId: string;
  now: string;
}) {
  const response = await requestJson(input.fetchImpl, `${input.baseUrl}/runtime/account/agents/platform-managed-registrations?tenant_id=tenant-public`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bidvia-session-id': input.sessionId,
    },
    body: JSON.stringify({
      agent_id: input.agentId,
      principal_id: input.principalId,
      now: input.now,
    }),
  });
  return response.body;
}

export async function runPlatformManagedTaskConsumer(
  args: RunPlatformManagedTaskConsumerArgs,
  dependencies: RunPlatformManagedTaskConsumerDependencies = {},
): Promise<RunPlatformManagedTaskConsumerReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const bootstrapClaimant = dependencies.bootstrapClaimant ?? ((bootstrapArgs) => runBootstrapClaimantLocalDocker(bootstrapArgs));
  const platformManagedRegistration = dependencies.platformManagedRegistration ?? defaultPlatformManagedRegistration;
  const writeReport = dependencies.writeReport ?? defaultWriteReport;
  const timestamp = now();

  const bootstrap = await bootstrapClaimant({
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    ...(args.email ? { email: args.email } : {}),
    ...(args.password ? { password: args.password } : {}),
    ...(args.companyName ? { companyName: args.companyName } : {}),
  });

  const steps: PlatformManagedTaskConsumerStepResult[] = [{
    stepKey: 'bootstrap-claimant',
    status: 'passed',
    route: 'bootstrap-claimant-local-docker',
    requestBody: { email: bootstrap.claimant.email },
    responseBody: bootstrap,
  }];

  const registrationBody = await platformManagedRegistration({
    fetchImpl,
    baseUrl: args.baseUrl,
    sessionId: bootstrap.claimant.sessionId,
    agentId: bootstrap.claimant.agentId,
    principalId: bootstrap.claimant.principalId,
    now: timestamp,
  });
  const platformManagedAgentId = (registrationBody as { registration?: { agent_id?: string }; agent_id?: string }).registration?.agent_id
    ?? (registrationBody as { agent_id?: string }).agent_id
    ?? null;
  const allowedActions = (registrationBody as { allowed_actions?: string[] }).allowed_actions ?? [];
  steps.push({
    stepKey: 'platform-managed-registration',
    status: platformManagedAgentId === null ? 'failed' : 'passed',
    route: '/runtime/account/agents/platform-managed-registrations',
    requestBody: {
      agent_id: bootstrap.claimant.agentId,
      principal_id: bootstrap.claimant.principalId,
      now: timestamp,
    },
    responseBody: registrationBody,
  });

  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };
  const leaseAttempt = platformManagedAgentId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(platformManagedAgentId)}/leases?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          lease_scope: 'dispatch-authority-review',
          now: timestamp,
          expires_at: new Date(Date.parse(timestamp) + 5 * 60 * 1000).toISOString(),
        }),
      });
  steps.push({
    stepKey: 'platform-managed-create-lease',
    status: platformManagedAgentId === null ? 'failed' : toStepStatus(leaseAttempt.status),
    route: '/runtime/account/agents/:agentId/leases',
    requestBody: platformManagedAgentId === null
      ? null
      : {
          lease_scope: 'dispatch-authority-review',
          now: timestamp,
        },
    responseBody: leaseAttempt.body,
  });

  const createDispatchAttempt = platformManagedAgentId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(platformManagedAgentId)}/task-dispatches?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          task_kind: 'COMMERCIAL_ACTION_REVIEW',
          task_ref: 'task://platform-managed/forbidden-create-dispatch',
          reason: 'probe platform-managed bounded consumer actions',
          now: timestamp,
        }),
      });
  steps.push({
    stepKey: 'platform-managed-create-task-dispatch',
    status: platformManagedAgentId === null ? 'failed' : toStepStatus(createDispatchAttempt.status),
    route: '/runtime/account/agents/:agentId/task-dispatches',
    requestBody: platformManagedAgentId === null
      ? null
      : {
          task_kind: 'COMMERCIAL_ACTION_REVIEW',
          task_ref: 'task://platform-managed/forbidden-create-dispatch',
          reason: 'probe platform-managed bounded consumer actions',
          now: timestamp,
        },
    responseBody: createDispatchAttempt.body,
  });

  const hasFailed = steps.some((step) => step.status === 'failed');
  const hasUnexpectedBlocked = steps.some((step) => step.status === 'blocked' && step.stepKey !== 'platform-managed-create-task-dispatch');
  const boundedConsumerTruthConfirmed = platformManagedAgentId !== null
    && leaseAttempt.status === 200
    && createDispatchAttempt.status !== 200;
  const report: RunPlatformManagedTaskConsumerReport = {
    command: 'run-platform-managed-task-consumer',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    status: hasFailed ? 'failed' : hasUnexpectedBlocked ? 'blocked' : 'passed',
    phases: [
      { phaseKey: 'bootstrap', status: 'passed', classification: 'pass', detail: 'bootstrap claimant completed successfully' },
      {
        phaseKey: 'platform-managed-consumer',
        status: hasFailed ? 'failed' : hasUnexpectedBlocked ? 'blocked' : 'passed',
        classification: hasFailed ? 'contradiction' : hasUnexpectedBlocked ? 'bounded-stop' : 'pass',
        detail: hasFailed
          ? 'platform-managed consumer probe returned a failed step'
          : hasUnexpectedBlocked
            ? 'platform-managed consumer probe reached an unexpected bounded stop'
            : boundedConsumerTruthConfirmed
              ? 'platform-managed consumer probe confirmed allowed lease and forbidden create-dispatch boundaries'
              : 'platform-managed consumer probe completed successfully',
      },
    ],
    claimant: bootstrap.claimant,
    platformManagedAgentId,
    allowedActions,
    leaseAttempt,
    createDispatchAttempt,
    steps,
  };

  await writeReport(args.outputPath, report);
  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunPlatformManagedTaskConsumerArgs(argv);
  const report = await runPlatformManagedTaskConsumer(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
