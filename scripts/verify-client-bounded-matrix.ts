import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerReport,
} from './live-probes/bootstrap-claimant-local-docker.js';
import {
  runP1IntegrationLifecycle,
  type RunP1IntegrationLifecycleReport,
} from './live-probes/run-p1-integration-lifecycle.js';
import {
  runP1OperatorDeeperChain,
  type RunP1OperatorDeeperChainReport,
} from './live-probes/run-p1-operator-deeper-chain.js';
import {
  runPackBTaskProgression,
  type RunPackBTaskProgressionReport,
} from './live-probes/run-pack-b-task-progression.js';
import {
  runPlatformManagedIntegrationHandoff,
  type RunPlatformManagedIntegrationHandoffReport,
} from './live-probes/run-platform-managed-integration-handoff.js';

export interface VerifyClientBoundedMatrixArgs {
  baseUrl: string;
  outputPath: string;
}

export interface BoundedMatrixActorContext {
  availableFields: string[];
  missingFields: string[];
}

export interface BoundedMatrixScenarioEvidence {
  scenarioKey:
    | 'runtime-baseline'
    | 'platform-managed-onboarding'
    | 'dispatch-ready-progression'
    | 'role-collaboration-handoff'
    | 'continuous-task-governed-work-closure'
    | 'commercial-and-integration-readback';
  lane: 'default-local-docker';
  status: 'passed' | 'blocked' | 'failed';
  resultClass: 'pass' | 'bounded-stop' | 'contradiction' | 'blocked';
  coveredFamilies: string[];
  proofClass: 'baseline-interpretation' | 'direct-executable' | 'partial-executable' | 'bounded-stop-proof';
  blockedBy: string[];
  notes: string[];
  returnedIds: Record<string, string>;
  readbacks: Record<string, unknown>;
}

export interface ClientBoundedMatrixEvidence {
  schemaVersion: '2026-05-06';
  generatedAt: string;
  baseUrl: string;
  runtime: {
    healthz: {
      httpStatus: number;
      body: unknown;
    };
    readyz: {
      httpStatus: number;
      body: unknown;
    };
  };
  actorContext: {
    claimant: BoundedMatrixActorContext;
    admin: BoundedMatrixActorContext;
  };
  scenarios: BoundedMatrixScenarioEvidence[];
  summary: {
    passedCount: number;
    blockedCount: number;
    failedCount: number;
    boundedStopCount: number;
    contradictionCount: number;
    blockedScenarioKeys: string[];
    failedScenarioKeys: string[];
  };
}

interface RunClientBoundedMatrixOptions {
  baseUrl: string;
  artifactRootPath?: string;
}

interface RunClientBoundedMatrixDependencies {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: () => string;
  bootstrapClaimantLocalDocker?: (args: {
    baseUrl: string;
    statePath: string;
  }) => Promise<BootstrapClaimantLocalDockerReport>;
  runP1OperatorDeeperChain?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunP1OperatorDeeperChainReport>;
  runP1IntegrationLifecycle?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunP1IntegrationLifecycleReport>;
  runPackBTaskProgression?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunPackBTaskProgressionReport>;
  runPlatformManagedIntegrationHandoff?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunPlatformManagedIntegrationHandoffReport>;
}

const requiredClaimantEnvFields = [
  'BIDVIA_TENANT_ID',
  'BIDVIA_SESSION_ID',
  'BIDVIA_AGENT_ID',
] as const;

const requiredAdminEnvFields = [
  'BIDVIA_TENANT_ID',
  'BIDVIA_ADMIN_SESSION_ID',
] as const;

export function parseVerifyClientBoundedMatrixArgs(argv: string[]): VerifyClientBoundedMatrixArgs {
  let baseUrl: string | undefined;
  let outputPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--base-url') {
      baseUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--output') {
      outputPath = argv[index + 1];
      index += 1;
    }
  }

  if (!baseUrl?.trim()) {
    throw new Error('--base-url is required');
  }

  if (!outputPath?.trim()) {
    throw new Error('--output is required');
  }

  const normalizedBaseUrl = baseUrl.trim();
  const parsedBaseUrl = new URL(normalizedBaseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsedBaseUrl.hostname)) {
    throw new Error('--base-url must target a loopback local-docker runtime.');
  }

  return {
    baseUrl: normalizedBaseUrl,
    outputPath: outputPath.trim(),
  };
}

function buildActorContext(
  env: Record<string, string | undefined>,
  requiredFields: readonly string[],
): BoundedMatrixActorContext {
  const availableFields: string[] = [];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (env[field]) {
      availableFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  return {
    availableFields,
    missingFields,
  };
}

function buildBlockedScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  blockedBy: string[],
  notes: string[],
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'blocked',
    resultClass: 'blocked',
    coveredFamilies,
    proofClass,
    blockedBy,
    notes,
    returnedIds: {},
    readbacks: {},
  };
}

function buildPassedScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  notes: string[],
  returnedIds: Record<string, string>,
  readbacks: Record<string, unknown>,
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'passed',
    resultClass: 'pass',
    coveredFamilies,
    proofClass,
    blockedBy: [],
    notes,
    returnedIds,
    readbacks,
  };
}

function buildBoundedStopScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  blockedBy: string[],
  notes: string[],
  returnedIds: Record<string, string>,
  readbacks: Record<string, unknown>,
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'blocked',
    resultClass: 'bounded-stop',
    coveredFamilies,
    proofClass,
    blockedBy,
    notes,
    returnedIds,
    readbacks,
  };
}

function buildContradictionScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  notes: string[],
  returnedIds: Record<string, string>,
  readbacks: Record<string, unknown>,
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'failed',
    resultClass: 'contradiction',
    coveredFamilies,
    proofClass,
    blockedBy: [],
    notes,
    returnedIds,
    readbacks,
  };
}

function buildProbeFailureScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  note: string,
  error: unknown,
): BoundedMatrixScenarioEvidence {
  const message = error instanceof Error ? error.message : 'unknown probe failure';
  return buildContradictionScenario(
    scenarioKey,
    coveredFamilies,
    proofClass,
    [`${note}: ${message}`],
    {},
    {
      error: {
        code: 'probe_execution_failed',
        message,
      },
    },
  );
}

function buildArtifactPath(rootPath: string, fileName: string): string {
  return path.join(rootPath, fileName);
}

function summarizeBootstrap(
  bootstrap: BootstrapClaimantLocalDockerReport,
): Pick<BoundedMatrixScenarioEvidence, 'returnedIds' | 'readbacks'> {
  return {
    returnedIds: {
      agentId: bootstrap.claimant.agentId,
      principalId: bootstrap.claimant.principalId,
      registrationId: bootstrap.claimant.registrationId,
      dispatchAuthorityRequestId: bootstrap.dispatchAuthority.requestId,
      externalBindingId: bootstrap.externalBinding.bindingId,
    },
    readbacks: {
      claimant: bootstrap.claimant,
      dispatchAuthority: bootstrap.dispatchAuthority,
      externalBinding: bootstrap.externalBinding,
    },
  };
}

async function buildExecutableScenarioCluster(
  options: RunClientBoundedMatrixOptions,
  dependencies: RunClientBoundedMatrixDependencies,
): Promise<BoundedMatrixScenarioEvidence[]> {
  if (!options.artifactRootPath?.trim()) {
    return [
      buildBlockedScenario(
        'platform-managed-onboarding',
        ['identity-entry'],
        'direct-executable',
        ['fresh-bootstrap-state-required'],
        ['This scenario becomes executable only when the bounded matrix has a writable artifact root for fresh bootstrap state.'],
      ),
      buildBlockedScenario(
        'dispatch-ready-progression',
        ['account-plane-readiness-and-repair', 'operator-review-boundary'],
        'direct-executable',
        ['fresh-bootstrap-state-required'],
        ['This scenario becomes executable only when the bounded matrix can create a fresh bootstrap state file.'],
      ),
      buildBlockedScenario(
        'role-collaboration-handoff',
        ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'],
        'partial-executable',
        ['probe-artifacts-not-configured'],
        ['This scenario requires the checked-in operator deeper-chain probe and fresh artifact paths.'],
      ),
      buildBlockedScenario(
        'continuous-task-governed-work-closure',
        ['bounded-task-plane-progression'],
        'direct-executable',
        ['probe-artifacts-not-configured'],
        ['This scenario becomes executable only when the bounded matrix has a writable artifact root for the checked-in Pack B progression probe.'],
      ),
      buildBlockedScenario(
        'commercial-and-integration-readback',
        ['integration-center-lifecycle-and-retired-seam-validation'],
        'bounded-stop-proof',
        ['probe-artifacts-not-configured'],
        ['This scenario requires the checked-in integration lifecycle and platform-managed handoff probes plus fresh artifact paths.'],
      ),
    ];
  }

  const bootstrapClaimant = dependencies.bootstrapClaimantLocalDocker
    ?? (async (args: { baseUrl: string; statePath: string }) => runBootstrapClaimantLocalDocker(args));
  const operatorProbe = dependencies.runP1OperatorDeeperChain
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runP1OperatorDeeperChain(args));
  const integrationProbe = dependencies.runP1IntegrationLifecycle
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runP1IntegrationLifecycle(args));
  const packBProbe = dependencies.runPackBTaskProgression
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runPackBTaskProgression(args));
  const platformManagedProbe = dependencies.runPlatformManagedIntegrationHandoff
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runPlatformManagedIntegrationHandoff(args));

  const bootstrapStatePath = buildArtifactPath(options.artifactRootPath, 'bounded-matrix-bootstrap-state.json');
  let onboardingScenario: BoundedMatrixScenarioEvidence;
  let dispatchReadyScenario: BoundedMatrixScenarioEvidence;

  try {
    const bootstrap = await bootstrapClaimant({
      baseUrl: options.baseUrl,
      statePath: bootstrapStatePath,
    });
    const bootstrapSummary = summarizeBootstrap(bootstrap);
    onboardingScenario = buildPassedScenario(
      'platform-managed-onboarding',
      ['identity-entry'],
      'direct-executable',
      ['Fresh bootstrap claimant state was created successfully for the bounded matrix executor.'],
      bootstrapSummary.returnedIds,
      bootstrapSummary.readbacks,
    );
    dispatchReadyScenario = bootstrap.dispatchAuthority.status === 'APPROVED' && bootstrap.externalBinding.status === 'active'
      ? buildPassedScenario(
          'dispatch-ready-progression',
          ['account-plane-readiness-and-repair', 'operator-review-boundary'],
          'direct-executable',
          ['Fresh bootstrap evidence confirms approved dispatch authority and an active external binding.'],
          bootstrapSummary.returnedIds,
          bootstrapSummary.readbacks,
        )
      : buildBoundedStopScenario(
          'dispatch-ready-progression',
          ['account-plane-readiness-and-repair', 'operator-review-boundary'],
          'direct-executable',
          ['dispatch-ready-truth-not-confirmed'],
          ['Fresh bootstrap completed, but returned truth did not confirm both approved dispatch authority and active external binding.'],
          bootstrapSummary.returnedIds,
          bootstrapSummary.readbacks,
        );
  } catch (error) {
    onboardingScenario = buildProbeFailureScenario(
      'platform-managed-onboarding',
      ['identity-entry'],
      'direct-executable',
      'Bootstrap claimant probe failed before onboarding evidence could be recorded',
      error,
    );
    dispatchReadyScenario = buildProbeFailureScenario(
      'dispatch-ready-progression',
      ['account-plane-readiness-and-repair', 'operator-review-boundary'],
      'direct-executable',
      'Bootstrap claimant probe failed before dispatch-ready truth could be evaluated',
      error,
    );
  }

  let roleCollaborationScenario: BoundedMatrixScenarioEvidence;
  try {
    const operatorReport = await operatorProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-operator-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-operator-report.json'),
    });
    roleCollaborationScenario = (operatorReport.claimantReadbacks.endState as { closure_class?: string }).closure_class === 'product_closed'
      ? buildPassedScenario(
          'role-collaboration-handoff',
          ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'],
          'partial-executable',
          ['The checked-in operator deeper-chain probe reached claimant opportunity readback and product-closed end-state evidence.'],
          {
            matchId: operatorReport.ids.matchId ?? '',
            connectionRequestId: operatorReport.ids.connectionRequestId ?? '',
            opportunityId: operatorReport.ids.opportunityId ?? '',
            packageId: operatorReport.ids.packageId ?? '',
          },
          {
            claimantReadbacks: operatorReport.claimantReadbacks,
            steps: operatorReport.steps,
          },
        )
      : buildBoundedStopScenario(
          'role-collaboration-handoff',
          ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'],
          'partial-executable',
          ['operator-deeper-chain-not-closed'],
          ['The checked-in operator deeper-chain probe did not reach the expected claimant end-state closure evidence.'],
          {
            matchId: operatorReport.ids.matchId ?? '',
            connectionRequestId: operatorReport.ids.connectionRequestId ?? '',
            opportunityId: operatorReport.ids.opportunityId ?? '',
            packageId: operatorReport.ids.packageId ?? '',
          },
          {
            claimantReadbacks: operatorReport.claimantReadbacks,
            steps: operatorReport.steps,
          },
        );
  } catch (error) {
    roleCollaborationScenario = buildProbeFailureScenario(
      'role-collaboration-handoff',
      ['selected-claimant-execution-and-materialization-readback', 'opportunity-continuation-and-end-state'],
      'partial-executable',
      'Operator deeper-chain probe failed before claimant handoff evidence could be classified',
      error,
    );
  }

  let packBScenario: BoundedMatrixScenarioEvidence;
  try {
    const packBReport = await packBProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-pack-b-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-pack-b-report.json'),
    });
    packBScenario = packBReport.successBranch.dispatchId !== null
      && packBReport.successBranch.outcomeRef !== null
      && packBReport.successBranch.confirmationCycleRef !== null
      && packBReport.successBranch.closureRefs.dispatchRef !== null
      && packBReport.successBranch.closureRefs.outcomeRef !== null
      && packBReport.successBranch.closureRefs.evidenceBundleRef !== null
      && packBReport.successBranch.closureRefs.confirmationCycleRef !== null
      ? buildPassedScenario(
          'continuous-task-governed-work-closure',
          ['bounded-task-plane-progression'],
          'direct-executable',
          ['The checked-in Pack B progression probe reached bounded governed-work closure with canonical refs.'],
          {
            dispatchRef: packBReport.successBranch.closureRefs.dispatchRef,
            outcomeRef: packBReport.successBranch.closureRefs.outcomeRef,
            evidenceBundleRef: packBReport.successBranch.closureRefs.evidenceBundleRef,
            confirmationCycleRef: packBReport.successBranch.closureRefs.confirmationCycleRef,
          },
          {
            successBranch: packBReport.successBranch,
            failureBranch: packBReport.failureBranch,
          },
        )
      : buildBoundedStopScenario(
          'continuous-task-governed-work-closure',
          ['bounded-task-plane-progression'],
          'direct-executable',
          ['pack-b-governed-work-closure-not-confirmed'],
          ['The checked-in Pack B progression probe did not confirm the full bounded governed-work closure chain.'],
          {
            dispatchRef: packBReport.successBranch.closureRefs.dispatchRef ?? '',
            outcomeRef: packBReport.successBranch.closureRefs.outcomeRef ?? '',
            evidenceBundleRef: packBReport.successBranch.closureRefs.evidenceBundleRef ?? '',
            confirmationCycleRef: packBReport.successBranch.closureRefs.confirmationCycleRef ?? '',
          },
          {
            successBranch: packBReport.successBranch,
            failureBranch: packBReport.failureBranch,
          },
        );
  } catch (error) {
    packBScenario = buildProbeFailureScenario(
      'continuous-task-governed-work-closure',
      ['bounded-task-plane-progression'],
      'direct-executable',
      'Pack B progression probe failed before governed-work closure evidence could be classified',
      error,
    );
  }

  let commercialScenario: BoundedMatrixScenarioEvidence;
  try {
    const integrationReport = await integrationProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-integration-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-integration-report.json'),
    });
    const platformManagedReport = await platformManagedProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-platform-managed-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-platform-managed-report.json'),
    });

    const platformManagedEligibility = platformManagedReport.platformManagedEligibility as {
      eligibility?: {
        readiness_state?: string;
        invocation_route?: string | null;
      };
    };
    const inboundAttempt = platformManagedReport.inboundAttempt as {
      error?: {
        code?: string;
      };
    };
    const integrationEligibilityStep = integrationReport.steps.find((step) => step.stepKey === 'account-agent-integration-eligibility');
    const integrationEligibility = integrationEligibilityStep?.responseBody as {
      availability_state?: string;
    } | undefined;
    const commercialReturnedIds = {
      integrationAppId: integrationReport.ids.integrationAppId ?? '',
      integrationInstallationId: integrationReport.ids.integrationInstallationId ?? '',
      platformManagedAgentId: platformManagedReport.platformManagedAgentId ?? '',
      installationId: platformManagedReport.installationId ?? '',
      connectionId: platformManagedReport.connectionId ?? '',
    };
    const commercialReadbacks = {
      integrationLifecycle: integrationReport,
      platformManagedHandoff: platformManagedReport,
    };

    commercialScenario = platformManagedEligibility.eligibility?.readiness_state === 'configured_invokable'
      && platformManagedEligibility.eligibility.invocation_route === null
      && inboundAttempt.error?.code !== 'connector_dispatcher_not_configured'
      && inboundAttempt.error?.code !== 'connector_inbound_not_supported'
      ? buildContradictionScenario(
          'commercial-and-integration-readback',
          ['integration-center-lifecycle-and-retired-seam-validation'],
          'bounded-stop-proof',
          ['Platform-managed eligibility reported configured_invokable while the invocation route was null without the known bounded dispatcher stop.'],
          commercialReturnedIds,
          commercialReadbacks,
        )
      : inboundAttempt.error?.code === 'connector_dispatcher_not_configured'
        || inboundAttempt.error?.code === 'connector_inbound_not_supported'
        || (platformManagedEligibility.eligibility?.readiness_state === 'configured_not_invokable'
          && platformManagedEligibility.eligibility.invocation_route === null)
        || integrationEligibility?.availability_state === 'configured_actor_ineligible'
        ? buildBoundedStopScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            [inboundAttempt.error?.code === 'connector_inbound_not_supported' ? 'connector_inbound_not_supported' : 'connector_dispatcher_not_configured'],
            ['The checked-in integration probes reached the maintained bounded stop at the configured-but-not-invokable connector boundary instead of contradicting readiness truth.'],
            commercialReturnedIds,
            commercialReadbacks,
          )
        : buildPassedScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            ['The checked-in integration lifecycle and platform-managed handoff probes completed without the known bounded dispatcher stop.'],
            commercialReturnedIds,
            commercialReadbacks,
          );
  } catch (error) {
    commercialScenario = buildProbeFailureScenario(
      'commercial-and-integration-readback',
      ['integration-center-lifecycle-and-retired-seam-validation'],
      'bounded-stop-proof',
      'Integration lifecycle or platform-managed handoff probe failed before connector-boundary evidence could be classified',
      error,
    );
  }

  return [
    onboardingScenario,
    dispatchReadyScenario,
    roleCollaborationScenario,
    packBScenario,
    commercialScenario,
  ];
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
): Promise<{ httpStatus: number; body: unknown }> {
  const response = await fetchImpl(url);
  return {
    httpStatus: response.status,
    body: await response.json(),
  };
}

export async function runClientBoundedMatrix(
  options: RunClientBoundedMatrixOptions,
  dependencies: RunClientBoundedMatrixDependencies = {},
): Promise<ClientBoundedMatrixEvidence> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const env = dependencies.env ?? process.env;
  const now = dependencies.now ?? (() => new Date().toISOString());

  const healthz = await fetchJson(fetchImpl, `${options.baseUrl}/healthz`);
  const readyz = await fetchJson(fetchImpl, `${options.baseUrl}/readyz`);

  const claimantContext = buildActorContext(env, requiredClaimantEnvFields);
  const adminContext = buildActorContext(env, requiredAdminEnvFields);

  const scenarios: BoundedMatrixScenarioEvidence[] = [
    {
      scenarioKey: 'runtime-baseline',
      lane: 'default-local-docker',
      status: healthz.httpStatus === 200 && readyz.httpStatus === 200 ? 'passed' : 'failed',
      resultClass: healthz.httpStatus === 200 && readyz.httpStatus === 200 ? 'pass' : 'contradiction',
      coveredFamilies: ['public-runtime-interpretation'],
      proofClass: 'baseline-interpretation',
      blockedBy: [],
      notes: [
        'Verifies only the local docker runtime baseline through /healthz and /readyz.',
      ],
      returnedIds: {},
      readbacks: {
        healthz: healthz.body,
        readyz: readyz.body,
      },
    },
    ...(await buildExecutableScenarioCluster(options, dependencies)),
  ];

  const blockedScenarioKeys = scenarios
    .filter((scenario) => scenario.status === 'blocked')
    .map((scenario) => scenario.scenarioKey);
  const failedScenarioKeys = scenarios
    .filter((scenario) => scenario.status === 'failed')
    .map((scenario) => scenario.scenarioKey);
  const boundedStopCount = scenarios.filter((scenario) => scenario.resultClass === 'bounded-stop').length;
  const contradictionCount = scenarios.filter((scenario) => scenario.resultClass === 'contradiction').length;

  return {
    schemaVersion: '2026-05-06',
    generatedAt: now(),
    baseUrl: options.baseUrl,
    runtime: {
      healthz,
      readyz,
    },
    actorContext: {
      claimant: claimantContext,
      admin: adminContext,
    },
    scenarios,
    summary: {
      passedCount: scenarios.filter((scenario) => scenario.status === 'passed').length,
      blockedCount: blockedScenarioKeys.length,
      failedCount: failedScenarioKeys.length,
      boundedStopCount,
      contradictionCount,
      blockedScenarioKeys,
      failedScenarioKeys,
    },
  };
}

export async function writeClientBoundedMatrixEvidence(
  outputPath: string,
  evidence: ClientBoundedMatrixEvidence,
): Promise<{ outputPath: string }> {
  const normalizedOutputPath = outputPath.trim();
  if (!normalizedOutputPath) {
    throw new Error('outputPath is required');
  }

  await mkdir(path.dirname(normalizedOutputPath), { recursive: true });
  await writeFile(normalizedOutputPath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  return {
    outputPath: normalizedOutputPath,
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseVerifyClientBoundedMatrixArgs(argv);
  const evidence = await runClientBoundedMatrix({
    baseUrl: args.baseUrl,
    artifactRootPath: path.join(path.dirname(args.outputPath), 'bounded-matrix-artifacts'),
  });
  const result = await writeClientBoundedMatrixEvidence(args.outputPath, evidence);
  process.stdout.write(`${JSON.stringify({
    command: 'verify-client-bounded-matrix',
    scope: 'local-only',
    outputPath: result.outputPath,
    summary: evidence.summary,
  }, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
