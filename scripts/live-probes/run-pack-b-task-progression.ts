import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunPackBTaskProgressionArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
}

export interface PackBTaskProgressionStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'create-task-dispatch'
    | 'assign-task-dispatch'
    | 'complete-task-dispatch'
    | 'fail-task-dispatch'
    | 'create-task-dispatch-outcome'
    | 'create-task-dispatch-evidence-bundle'
    | 'create-task-dispatch-confirmation-cycle'
    | 'governed-work-closure';
  status: 'passed' | 'failed';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

interface PackBTaskProgressionBranchReport {
  dispatchId: string | null;
  outcomeRef: string | null;
  confirmationCycleRef: string | null;
  closureRefs: {
    dispatchRef: string | null;
    outcomeRef: string | null;
    evidenceBundleRef: string | null;
    confirmationCycleRef: string | null;
  };
  steps: PackBTaskProgressionStepResult[];
}

export interface RunPackBTaskProgressionReport {
  command: 'run-pack-b-task-progression';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  bootstrap: BootstrapClaimantLocalDockerReport;
  selfServicePatch: unknown;
  successBranch: PackBTaskProgressionBranchReport;
  failureBranch: PackBTaskProgressionBranchReport;
}

interface RunPackBTaskProgressionDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunPackBTaskProgressionReport) => Promise<{ outputPath: string }>;
}

export function parseRunPackBTaskProgressionArgs(argv: string[]): RunPackBTaskProgressionArgs {
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
  report: RunPackBTaskProgressionReport,
): Promise<{ outputPath: string }> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
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
  steps: PackBTaskProgressionStepResult[],
  stepKey: PackBTaskProgressionStepResult['stepKey'],
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

async function runBranch(
  fetchImpl: typeof fetch,
  baseUrl: string,
  tenantId: string,
  agentId: string,
  sessionId: string,
  nowValue: string,
  taskRef: string,
  terminalStep: 'complete-task-dispatch' | 'fail-task-dispatch',
  terminalReason: string,
): Promise<PackBTaskProgressionBranchReport> {
  const steps: PackBTaskProgressionStepResult[] = [];
  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': sessionId,
  };

  const createDispatchBody = {
    task_kind: 'COMMERCIAL_ACTION_REVIEW',
    task_ref: taskRef,
    reason: terminalReason,
    now: nowValue,
  };
  const createDispatch = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(createDispatchBody),
  });
  pushStep(steps, 'create-task-dispatch', '/runtime/account/agents/:agentId/task-dispatches', createDispatchBody, createDispatch);

  const dispatchId = (createDispatch.body as { dispatch?: { agent_task_dispatch_id?: string; task_dispatch_id?: string } }).dispatch?.agent_task_dispatch_id
    ?? (createDispatch.body as { dispatch?: { task_dispatch_id?: string } }).dispatch?.task_dispatch_id
    ?? null;

  if (dispatchId === null) {
    return {
      dispatchId: null,
      outcomeRef: null,
      confirmationCycleRef: null,
      closureRefs: {
        dispatchRef: null,
        outcomeRef: null,
        evidenceBundleRef: null,
        confirmationCycleRef: null,
      },
      steps,
    };
  }

  const assignBody = {
    assigned_to_registration_id: (createDispatch.body as { dispatch?: { target_agent_registration_id?: string } }).dispatch?.target_agent_registration_id ?? 'areg-unknown',
    reason: `assign ${terminalStep}`,
    now: nowValue,
  };
  const assign = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/assign?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(assignBody),
  });
  pushStep(steps, 'assign-task-dispatch', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/assign', assignBody, assign);

  const terminalBody = {
    outcome_ref: `outcome://${terminalStep}/${dispatchId}`,
    reason: terminalReason,
    now: nowValue,
  };
  const terminalRoute = terminalStep === 'complete-task-dispatch'
    ? `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/complete?tenant_id=${encodeURIComponent(tenantId)}`
    : `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/fail?tenant_id=${encodeURIComponent(tenantId)}`;
  const terminalResponse = await requestJson(fetchImpl, terminalRoute, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(terminalBody),
  });
  pushStep(steps, terminalStep, `/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/${terminalStep === 'complete-task-dispatch' ? 'complete' : 'fail'}`, terminalBody, terminalResponse);

  const outcomeRef = (terminalResponse.body as { dispatch?: { outcome_ref?: string } }).dispatch?.outcome_ref
    ?? (terminalResponse.body as { outcome?: { outcome_ref?: string } }).outcome?.outcome_ref
    ?? terminalBody.outcome_ref;

  const outcomeBody = {
    outcome_ref: outcomeRef,
    reason: `persist ${terminalStep} outcome`,
    now: nowValue,
  };
  const outcomeResponse = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/outcomes?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(outcomeBody),
  });
  pushStep(steps, 'create-task-dispatch-outcome', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/outcomes', outcomeBody, outcomeResponse);

  const evidenceBody = {
    now: nowValue,
    evidence_refs: [`evidence://${terminalStep}/${dispatchId}`],
    rationale_summary: `evidence for ${terminalStep}`,
    confidence: 'HIGH',
  };
  const evidenceResponse = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/evidence-bundles?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(evidenceBody),
  });
  pushStep(steps, 'create-task-dispatch-evidence-bundle', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/evidence-bundles', evidenceBody, evidenceResponse);

  const confirmationBody = {
    required_evidence_profile: 'commercial_action_review',
    started_at: nowValue,
    sla_window_ref: `sla://${terminalStep}/${dispatchId}`,
  };
  const confirmationResponse = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/confirmation-cycles?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify(confirmationBody),
  });
  pushStep(steps, 'create-task-dispatch-confirmation-cycle', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/confirmation-cycles', confirmationBody, confirmationResponse);

  const closureResponse = await requestJson(fetchImpl, `${baseUrl}/runtime/account/agents/${encodeURIComponent(agentId)}/task-dispatches/${encodeURIComponent(dispatchId)}/governed-work-closure?tenant_id=${encodeURIComponent(tenantId)}`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': sessionId,
    },
  });
  pushStep(steps, 'governed-work-closure', '/runtime/account/agents/:agentId/task-dispatches/:taskDispatchId/governed-work-closure', null, closureResponse);

  const closureRefs = (closureResponse.body as { governed_work_closure?: { canonicalRefs?: { dispatchRef?: string; outcomeRef?: string; evidenceBundleRef?: string; confirmationCycleRef?: string } } }).governed_work_closure?.canonicalRefs;
  const confirmationCycleRef = (confirmationResponse.body as { dispatch?: { confirmation_cycle_ref?: string } }).dispatch?.confirmation_cycle_ref
    ?? (confirmationResponse.body as { confirmation_cycle?: { confirmation_cycle_id?: string } }).confirmation_cycle?.confirmation_cycle_id
    ?? null;

  return {
    dispatchId,
    outcomeRef,
    confirmationCycleRef,
    closureRefs: {
      dispatchRef: closureRefs?.dispatchRef ?? null,
      outcomeRef: closureRefs?.outcomeRef ?? null,
      evidenceBundleRef: closureRefs?.evidenceBundleRef ?? null,
      confirmationCycleRef: closureRefs?.confirmationCycleRef ?? null,
    },
    steps,
  };
}

export async function runPackBTaskProgression(
  args: RunPackBTaskProgressionArgs,
  dependencies: RunPackBTaskProgressionDependencies = {},
): Promise<RunPackBTaskProgressionReport> {
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

  const selfServicePatch = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/self-service`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
    body: JSON.stringify({
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
    }),
  });

  const successBranch = await runBranch(
    fetchImpl,
    args.baseUrl,
    bootstrap.claimant.tenantId,
    bootstrap.claimant.agentId,
    bootstrap.claimant.sessionId,
    timestamp,
    'task://pack-b/success',
    'complete-task-dispatch',
    'pack-b success branch',
  );
  const failureBranch = await runBranch(
    fetchImpl,
    args.baseUrl,
    bootstrap.claimant.tenantId,
    bootstrap.claimant.agentId,
    bootstrap.claimant.sessionId,
    timestamp,
    'task://pack-b/failure',
    'fail-task-dispatch',
    'pack-b failure branch',
  );

  const report: RunPackBTaskProgressionReport = {
    command: 'run-pack-b-task-progression',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    bootstrap,
    selfServicePatch: selfServicePatch.body,
    successBranch,
    failureBranch,
  };

  await writeReport(args.outputPath, report);

  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunPackBTaskProgressionArgs(argv);
  const report = await runPackBTaskProgression(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
