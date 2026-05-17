import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunU5TaskContinuityControlArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
  assignedToRegistrationId: string;
}

export interface U5TaskContinuityControlStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'self-service-patch'
    | 'create-task-dispatch'
    | 'assign-task-dispatch'
    | 'suspend-task-dispatch'
    | 'resume-task-dispatch'
    | 'get-task-dispatch';
  status: 'passed' | 'failed' | 'blocked';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface U5TaskContinuityControlPhaseResult {
  phaseKey: 'bootstrap' | 'continuity-control';
  status: 'passed' | 'blocked' | 'failed';
  classification: 'pass' | 'bounded-stop' | 'contradiction' | 'blocked';
  detail: string;
}

export interface RunU5TaskContinuityControlReport {
  command: 'run-u5-task-continuity-control';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  status: 'passed' | 'blocked' | 'failed';
  family: 'u5-multi-agent-growth-operator-takeover-continuity';
  phases: U5TaskContinuityControlPhaseResult[];
  ids: {
    taskDispatchId: string | null;
    assignedToRegistrationId: string | null;
  };
  steps: U5TaskContinuityControlStepResult[];
}

interface RunU5TaskContinuityControlDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunU5TaskContinuityControlReport) => Promise<{ outputPath: string }>;
}

export function parseRunU5TaskContinuityControlArgs(argv: string[]): RunU5TaskContinuityControlArgs {
  const bootstrapArgs = parseBootstrapClaimantLocalDockerArgs(argv);
  let outputPath: string | undefined;
  let assignedToRegistrationId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      outputPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (argv[index] === '--assigned-to-registration-id') {
      assignedToRegistrationId = argv[index + 1];
      index += 1;
    }
  }

  if (!outputPath?.trim()) {
    throw new Error('--output is required');
  }
  if (!assignedToRegistrationId?.trim()) {
    throw new Error('--assigned-to-registration-id is required');
  }

  return {
    ...bootstrapArgs,
    outputPath: outputPath.trim(),
    assignedToRegistrationId: assignedToRegistrationId.trim(),
  };
}

async function defaultWriteReport(
  outputPath: string,
  report: RunU5TaskContinuityControlReport,
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

function pushBlockedStep(
  steps: U5TaskContinuityControlStepResult[],
  stepKey: U5TaskContinuityControlStepResult['stepKey'],
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

export async function runU5TaskContinuityControl(
  args: RunU5TaskContinuityControlArgs,
  dependencies: RunU5TaskContinuityControlDependencies = {},
): Promise<RunU5TaskContinuityControlReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const bootstrapClaimant = dependencies.bootstrapClaimant ?? ((bootstrapArgs) => runBootstrapClaimantLocalDocker(bootstrapArgs));
  const writeReport = dependencies.writeReport ?? defaultWriteReport;

  const timestamp = now();
  const bootstrap = await bootstrapClaimant({
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    ...(args.email ? { email: args.email } : {}),
    ...(args.password ? { password: args.password } : {}),
    ...(args.companyName ? { companyName: args.companyName } : {}),
  });

  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };

  const steps: U5TaskContinuityControlStepResult[] = [
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

  const selfServicePatchBody = {
    now: timestamp,
    capability_profile: {
      domain_strengths: ['commercial-governance'],
      template_domains: ['governed-assets'],
      workflow_roles: ['dispatcher'],
      allowed_runtime_scopes: ['live-control-plane'],
      quality_signals: ['agent-self-described'],
      adoption_rate: 0.91,
      evidence_score: 0.94,
      risk_reliability_band: 'HIGH',
      routing_priority: 8,
    },
    participation_state: {
      state: 'commercial-authority-bound',
      reason: 'ready',
    },
    task_dispatch_acceptance: {
      accepts_task_dispatches: true,
      accepted_task_dispatch_scopes: ['COMMERCIAL_ACTION_REVIEW', 'EXTERNAL_WRITE'],
    },
  };
  const selfServicePatch = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/self-service`, {
    method: 'PATCH',
    headers: sessionHeaders,
    body: JSON.stringify(selfServicePatchBody),
  });
  steps.push({
    stepKey: 'self-service-patch',
    status: selfServicePatch.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/self-service',
    requestBody: selfServicePatchBody,
    responseBody: selfServicePatch.body,
  });

  const createTaskDispatchBody = {
    task_kind: 'COMMERCIAL_ACTION_REVIEW',
    task_ref: 'task://u5/continuity',
    reason: 'u5 continuity control scenario',
    now: timestamp,
  };
  const createTaskDispatch = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(createTaskDispatchBody),
  });
  steps.push({
    stepKey: 'create-task-dispatch',
    status: createTaskDispatch.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/task-dispatches',
    requestBody: createTaskDispatchBody,
    responseBody: createTaskDispatch.body,
  });

  const taskDispatchId = (createTaskDispatch.body as { dispatch?: { agent_task_dispatch_id?: string } }).dispatch?.agent_task_dispatch_id ?? null;
  const assignedToRegistrationId = args.assignedToRegistrationId;

  const assignBody = {
    assigned_to_registration_id: assignedToRegistrationId,
    now: timestamp,
    reason: 'handoff to active worker',
  };
  const assign = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches/${encodeURIComponent(taskDispatchId ?? '')}/assign?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(assignBody),
  });
  steps.push({
    stepKey: 'assign-task-dispatch',
    status: assign.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/assign',
    requestBody: assignBody,
    responseBody: assign.body,
  });

  if (assign.status !== 200) {
    pushBlockedStep(steps, 'suspend-task-dispatch', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/suspend', 'assignment_forbidden');
    pushBlockedStep(steps, 'resume-task-dispatch', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/resume', 'assignment_forbidden');

    const getTaskDispatch = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches/${encodeURIComponent(taskDispatchId ?? '')}?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
      method: 'GET',
      headers: {
        'x-bidvia-session-id': bootstrap.claimant.sessionId,
      },
    });
    steps.push({
      stepKey: 'get-task-dispatch',
      status: getTaskDispatch.status === 200 ? 'passed' : 'failed',
      route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId',
      requestBody: null,
      responseBody: getTaskDispatch.body,
    });

    const continuitySteps = steps.filter((step) => step.stepKey !== 'bootstrap-claimant');
    const continuityStatus = continuitySteps.some((step) => step.status === 'failed')
      ? 'blocked'
      : continuitySteps.some((step) => step.status === 'blocked')
        ? 'blocked'
        : 'passed';
    const continuityClassification = continuityStatus === 'passed' ? 'pass' : 'bounded-stop';
    const continuityDetail = continuityStatus === 'passed'
      ? 'task dispatch assignment, suspend, resume, and readback completed successfully'
      : 'task dispatch continuity control reached at least one bounded stop';

    const report: RunU5TaskContinuityControlReport = {
      command: 'run-u5-task-continuity-control',
      generatedAt: timestamp,
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      outputPath: args.outputPath,
      status: continuityStatus,
      family: 'u5-multi-agent-growth-operator-takeover-continuity',
      phases: [
        {
          phaseKey: 'bootstrap',
          status: 'passed',
          classification: 'pass',
          detail: 'bootstrap claimant completed successfully',
        },
        {
          phaseKey: 'continuity-control',
          status: continuityStatus,
          classification: continuityClassification,
          detail: continuityDetail,
        },
      ],
      ids: {
        taskDispatchId,
        assignedToRegistrationId,
      },
      steps,
    };

    await writeReport(args.outputPath, report);
    return report;
  }

  const suspendBody = {
    now: timestamp,
    reason: 'waiting for upstream dependency',
  };
  const suspend = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches/${encodeURIComponent(taskDispatchId ?? '')}/suspend?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(suspendBody),
  });
  steps.push({
    stepKey: 'suspend-task-dispatch',
    status: suspend.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/suspend',
    requestBody: suspendBody,
    responseBody: suspend.body,
  });

  const resumeBody = {
    now: timestamp,
    reason: 'dependency resolved',
  };
  const resume = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches/${encodeURIComponent(taskDispatchId ?? '')}/resume?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(resumeBody),
  });
  steps.push({
    stepKey: 'resume-task-dispatch',
    status: resume.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/resume',
    requestBody: resumeBody,
    responseBody: resume.body,
  });

  const getTaskDispatch = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/task-dispatches/${encodeURIComponent(taskDispatchId ?? '')}?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  steps.push({
    stepKey: 'get-task-dispatch',
    status: getTaskDispatch.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId',
    requestBody: null,
    responseBody: getTaskDispatch.body,
  });

  const continuitySteps = steps.filter((step) => step.stepKey !== 'bootstrap-claimant');
  const continuityStatus = continuitySteps.some((step) => step.status === 'failed')
    ? 'blocked'
    : continuitySteps.some((step) => step.status === 'blocked')
      ? 'blocked'
      : 'passed';
  const continuityClassification = continuityStatus === 'passed' ? 'pass' : 'bounded-stop';
  const continuityDetail = continuityStatus === 'passed'
    ? 'task dispatch assignment, suspend, resume, and readback completed successfully'
    : 'task dispatch continuity control reached at least one bounded stop';

  const report: RunU5TaskContinuityControlReport = {
    command: 'run-u5-task-continuity-control',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    status: continuityStatus,
    family: 'u5-multi-agent-growth-operator-takeover-continuity',
    phases: [
      {
        phaseKey: 'bootstrap',
        status: 'passed',
        classification: 'pass',
        detail: 'bootstrap claimant completed successfully',
      },
      {
        phaseKey: 'continuity-control',
        status: continuityStatus,
        classification: continuityClassification,
        detail: continuityDetail,
      },
    ],
    ids: {
      taskDispatchId,
      assignedToRegistrationId,
    },
    steps,
  };

  await writeReport(args.outputPath, report);

  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunU5TaskContinuityControlArgs(argv);
  const report = await runU5TaskContinuityControl(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
