import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
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
import {
  runGovernedRuntimeProjectionEntry,
  type RunGovernedRuntimeProjectionEntryReport,
} from './live-probes/run-governed-runtime-projection-entry.js';
import {
  runDispatchAuthorityClosure,
  type RunDispatchAuthorityClosureReport,
} from './live-probes/run-dispatch-authority-closure.js';

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
    | 'governed-runtime-projection-entry'
    | 'dispatch-authority-reviewed-closure'
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
  bootstrapClaimantLocalDocker?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
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
  runGovernedRuntimeProjectionEntry?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunGovernedRuntimeProjectionEntryReport>;
  runDispatchAuthorityClosure?: (args: {
    baseUrl: string;
    statePath: string;
    outputPath: string;
  }) => Promise<RunDispatchAuthorityClosureReport>;
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

function isBootstrapAdminSignInRateLimited(message: string): boolean {
  return message.includes('bootstrap admin sign-in failed: rate_limited:');
}

function buildProbeBlockedScenario(
  scenarioKey: BoundedMatrixScenarioEvidence['scenarioKey'],
  coveredFamilies: string[],
  proofClass: BoundedMatrixScenarioEvidence['proofClass'],
  note: string,
  message: string,
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'blocked',
    resultClass: 'blocked',
    coveredFamilies,
    proofClass,
    blockedBy: ['bootstrap-admin-sign-in-rate-limited'],
    notes: [`${note}: ${message}`],
    returnedIds: {},
    readbacks: {
      error: {
        code: 'probe_execution_blocked',
        blockerCode: 'rate_limited',
        message,
      },
    },
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
  if (isBootstrapAdminSignInRateLimited(message)) {
    return buildProbeBlockedScenario(
      scenarioKey,
      coveredFamilies,
      proofClass,
      note,
      message,
    );
  }

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

function buildBootstrapCacheKey(args: BootstrapClaimantLocalDockerArgs): string {
  return JSON.stringify({
    baseUrl: args.baseUrl,
    email: args.email ?? null,
    password: args.password ?? null,
    companyName: args.companyName ?? null,
    stopBeforeDispatchAuthorityRequest: args.stopBeforeDispatchAuthorityRequest ?? false,
    stopBeforeDispatchAuthorityApproval: args.stopBeforeDispatchAuthorityApproval ?? false,
  });
}

export function createBoundedMatrixBootstrapCache(
  bootstrapClaimant: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>,
): (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport> {
  const cache = new Map<string, BootstrapClaimantLocalDockerReport>();

  return async (args) => {
    const cacheKey = buildBootstrapCacheKey(args);
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        statePath: args.statePath,
      };
    }

    const report = await bootstrapClaimant(args);
    cache.set(cacheKey, report);
    return report;
  };
}

interface CommercialReadbackInputs {
  integrationAppId: string;
  integrationInstallationId: string;
  integrationAvailabilityState: string;
  platformManagedAgentId: string;
  installationId: string;
  connectionId: string;
  readinessState: string;
  invocationRoute: string | null;
  inboundErrorCode: string | null;
}

type CommercialReadbackExtractionResult =
  | {
      ok: true;
      value: CommercialReadbackInputs;
    }
  | {
      ok: false;
      blockedBy: ['missing-commercial-readback-field'];
      notes: [string];
    };

interface CommercialKnownBoundedStop {
  blockedBy: string[];
  notes: string[];
  returnedIds: Record<string, string>;
  readbacks: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRequiredString(
  value: unknown,
  fieldPath: string,
): { ok: true; value: string } | { ok: false; note: string } {
  return typeof value === 'string' && value.length > 0
    ? { ok: true, value }
    : { ok: false, note: `Missing required commercial readback field: ${fieldPath}` };
}

function readRequiredNullableStringField(
  parent: unknown,
  fieldName: string,
  fieldPath: string,
): { ok: true; value: string | null } | { ok: false; note: string } {
  if (!isRecord(parent) || !(fieldName in parent)) {
    return {
      ok: false,
      note: `Missing required commercial readback field: ${fieldPath}`,
    };
  }

  const value = parent[fieldName];
  if (typeof value === 'string' || value === null) {
    return { ok: true, value };
  }

  return {
    ok: false,
    note: `Missing required commercial readback field: ${fieldPath}`,
  };
}

function readResponseError(payload: unknown): { code: string; message: string | null } | null {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : null;
  const code = error?.code;
  if (typeof code !== 'string' || code.length === 0) {
    return null;
  }

  const messageValue = error === null ? null : error.message;
  const message = typeof messageValue === 'string' && messageValue.length > 0
    ? messageValue
    : null;
  return { code, message };
}

function isSuccessfulPlatformManagedInboundAttempt(inboundAttempt: unknown): boolean {
  if (!isRecord(inboundAttempt)) {
    return false;
  }

  return isRecord(inboundAttempt.result)
    && (!('exception' in inboundAttempt) || inboundAttempt.exception === null)
    && !isRecord(inboundAttempt.error);
}

function readIntegrationAvailabilityStateWhenPresent(
  integrationReport: RunP1IntegrationLifecycleReport,
): { ok: true; value: string } | { ok: false; note: string } {
  const integrationEligibilityStep = integrationReport.steps.find(
    (step) => step.stepKey === 'account-agent-integration-eligibility',
  );
  if (!integrationEligibilityStep) {
    return { ok: true, value: 'configured' };
  }

  const integrationEligibility = isRecord(integrationEligibilityStep.responseBody)
    ? integrationEligibilityStep.responseBody
    : null;
  if (!isRecord(integrationEligibility) || !('availability_state' in integrationEligibility)) {
    return { ok: true, value: 'configured' };
  }

  return readRequiredString(
    integrationEligibility.availability_state,
    'account-agent-integration-eligibility.responseBody.availability_state',
  );
}

function buildCommercialPartialReturnedIds(
  integrationReport: RunP1IntegrationLifecycleReport,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): Record<string, string> {
  return {
    integrationAppId: typeof integrationReport.ids.integrationAppId === 'string' ? integrationReport.ids.integrationAppId : '',
    integrationInstallationId: typeof integrationReport.ids.integrationInstallationId === 'string' ? integrationReport.ids.integrationInstallationId : '',
    platformManagedAgentId: typeof platformManagedReport.platformManagedAgentId === 'string' ? platformManagedReport.platformManagedAgentId : '',
    installationId: typeof platformManagedReport.installationId === 'string' ? platformManagedReport.installationId : '',
    connectionId: typeof platformManagedReport.connectionId === 'string' ? platformManagedReport.connectionId : '',
  };
}

function buildCommercialProbeReadbacks(
  integrationReport: RunP1IntegrationLifecycleReport,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): Record<string, unknown> {
  return {
    integrationLifecycle: integrationReport,
    platformManagedHandoff: platformManagedReport,
  };
}

function extractKnownCommercialBoundedStop(
  integrationReport: RunP1IntegrationLifecycleReport,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): CommercialKnownBoundedStop | null {
  const installationStop = integrationReport.steps
    .map((step) => readResponseError(step.responseBody))
    .find((error) => error?.code === 'integration_app_not_installable');
  if (installationStop) {
    return {
      blockedBy: [installationStop.code],
      notes: [installationStop.message
        ? `Core reported ${installationStop.code}: ${installationStop.message}.`
        : 'Core reported integration_app_not_installable before installation and connection readback could be created.'],
      returnedIds: buildCommercialPartialReturnedIds(integrationReport, platformManagedReport),
      readbacks: buildCommercialProbeReadbacks(integrationReport, platformManagedReport),
    };
  }

  const inboundStop = readResponseError(platformManagedReport.inboundAttempt);
  if (inboundStop?.code === 'integration_installation_not_ready') {
    return {
      blockedBy: [inboundStop.code],
      notes: [inboundStop.message
        ? `Core reported ${inboundStop.code}: ${inboundStop.message}.`
        : 'Core reported integration_installation_not_ready before platform-managed inbound invocation could run.'],
      returnedIds: buildCommercialPartialReturnedIds(integrationReport, platformManagedReport),
      readbacks: buildCommercialProbeReadbacks(integrationReport, platformManagedReport),
    };
  }

  return null;
}

function extractCommercialReadbackInputs(
  integrationReport: RunP1IntegrationLifecycleReport,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): CommercialReadbackExtractionResult {
  const integrationAppId = readRequiredString(
    integrationReport.ids.integrationAppId,
    'ids.integrationAppId',
  );
  if (!integrationAppId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [integrationAppId.note],
    };
  }

  const integrationInstallationId = readRequiredString(
    integrationReport.ids.integrationInstallationId,
    'ids.integrationInstallationId',
  );
  if (!integrationInstallationId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [integrationInstallationId.note],
    };
  }

  const integrationEligibilityStep = integrationReport.steps.find(
    (step) => step.stepKey === 'account-agent-integration-eligibility',
  );
  const integrationEligibility = isRecord(integrationEligibilityStep?.responseBody)
    ? integrationEligibilityStep.responseBody
    : null;
  const integrationAvailabilityState = readRequiredString(
    integrationEligibility?.availability_state,
    'account-agent-integration-eligibility.responseBody.availability_state',
  );
  if (!integrationAvailabilityState.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [integrationAvailabilityState.note],
    };
  }

  const platformManagedAgentId = readRequiredString(
    platformManagedReport.platformManagedAgentId,
    'platformManagedAgentId',
  );
  if (!platformManagedAgentId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [platformManagedAgentId.note],
    };
  }

  const installationId = readRequiredString(
    platformManagedReport.installationId,
    'installationId',
  );
  if (!installationId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [installationId.note],
    };
  }

  const connectionId = readRequiredString(
    platformManagedReport.connectionId,
    'connectionId',
  );
  if (!connectionId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [connectionId.note],
    };
  }

  const platformManagedEligibility = isRecord(platformManagedReport.platformManagedEligibility)
    ? platformManagedReport.platformManagedEligibility
    : null;
  const eligibility = isRecord(platformManagedEligibility?.eligibility)
    ? platformManagedEligibility.eligibility
    : null;
  const readinessState = readRequiredString(
    eligibility?.readiness_state,
    'platformManagedEligibility.eligibility.readiness_state',
  );
  if (!readinessState.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [readinessState.note],
    };
  }

  const invocationRoute = readRequiredNullableStringField(
    eligibility,
    'invocation_route',
    'platformManagedEligibility.eligibility.invocation_route',
  );
  if (!invocationRoute.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [invocationRoute.note],
    };
  }

  const inboundAttempt = isRecord(platformManagedReport.inboundAttempt)
    ? platformManagedReport.inboundAttempt
    : null;
  const inboundError = isRecord(inboundAttempt?.error)
    ? inboundAttempt.error
    : null;
  const inboundErrorCode = inboundError !== null
    ? readRequiredNullableStringField(
        inboundError,
        'code',
        'inboundAttempt.error.code',
      )
    : { ok: true as const, value: null };
  if (!inboundErrorCode.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [inboundErrorCode.note],
    };
  }

  return {
    ok: true,
    value: {
      integrationAppId: integrationAppId.value,
      integrationInstallationId: integrationInstallationId.value,
      integrationAvailabilityState: integrationAvailabilityState.value,
      platformManagedAgentId: platformManagedAgentId.value,
      installationId: installationId.value,
      connectionId: connectionId.value,
      readinessState: readinessState.value,
      invocationRoute: invocationRoute.value,
      inboundErrorCode: inboundErrorCode.value,
    },
  };
}

function extractPlatformManagedCommercialReadbackInputs(
  integrationReport: RunP1IntegrationLifecycleReport,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): CommercialReadbackExtractionResult {
  const selectedApp = isRecord(platformManagedReport.selectedApp)
    ? platformManagedReport.selectedApp
    : null;
  const integrationAppId = readRequiredString(
    selectedApp?.integration_app_id,
    'platformManagedHandoff.selectedApp.integration_app_id',
  );
  if (!integrationAppId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [integrationAppId.note],
    };
  }

  const platformManagedAgentId = readRequiredString(
    platformManagedReport.platformManagedAgentId,
    'platformManagedAgentId',
  );
  if (!platformManagedAgentId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [platformManagedAgentId.note],
    };
  }

  const installationId = readRequiredString(
    platformManagedReport.installationId,
    'installationId',
  );
  if (!installationId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [installationId.note],
    };
  }

  const connectionId = readRequiredString(
    platformManagedReport.connectionId,
    'connectionId',
  );
  if (!connectionId.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [connectionId.note],
    };
  }

  const platformManagedEligibility = isRecord(platformManagedReport.platformManagedEligibility)
    ? platformManagedReport.platformManagedEligibility
    : null;
  const eligibility = isRecord(platformManagedEligibility?.eligibility)
    ? platformManagedEligibility.eligibility
    : null;
  const readinessState = readRequiredString(
    eligibility?.readiness_state,
    'platformManagedEligibility.eligibility.readiness_state',
  );
  if (!readinessState.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [readinessState.note],
    };
  }

  const invocationRoute = readRequiredNullableStringField(
    eligibility,
    'invocation_route',
    'platformManagedEligibility.eligibility.invocation_route',
  );
  if (!invocationRoute.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [invocationRoute.note],
    };
  }

  const inboundAttempt = isRecord(platformManagedReport.inboundAttempt)
    ? platformManagedReport.inboundAttempt
    : null;
  if (!isSuccessfulPlatformManagedInboundAttempt(inboundAttempt)) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: ['Missing required commercial readback field: platformManagedHandoff.inboundAttempt.result'],
    };
  }

  const inboundError = isRecord(inboundAttempt?.error)
    ? inboundAttempt.error
    : null;
  const inboundErrorCode = inboundError !== null
    ? readRequiredNullableStringField(
        inboundError,
        'code',
        'inboundAttempt.error.code',
      )
    : { ok: true as const, value: null };
  if (!inboundErrorCode.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [inboundErrorCode.note],
    };
  }

  const integrationAvailabilityState = readIntegrationAvailabilityStateWhenPresent(integrationReport);
  if (!integrationAvailabilityState.ok) {
    return {
      ok: false,
      blockedBy: ['missing-commercial-readback-field'],
      notes: [integrationAvailabilityState.note],
    };
  }

  return {
    ok: true,
    value: {
      integrationAppId: integrationAppId.value,
      integrationInstallationId: installationId.value,
      integrationAvailabilityState: integrationAvailabilityState.value,
      platformManagedAgentId: platformManagedAgentId.value,
      installationId: installationId.value,
      connectionId: connectionId.value,
      readinessState: readinessState.value,
      invocationRoute: invocationRoute.value,
      inboundErrorCode: inboundErrorCode.value,
    },
  };
}

function shouldFallbackToLegacyCommercialReadbackInputs(
  platformManagedCommercialInputs: CommercialReadbackExtractionResult,
  platformManagedReport: RunPlatformManagedIntegrationHandoffReport,
): boolean {
  if (platformManagedCommercialInputs.ok) {
    return false;
  }

  const [note] = platformManagedCommercialInputs.notes;
  if (!note.includes('platformManagedHandoff.inboundAttempt.result')) {
    return false;
  }

  const inboundAttempt = isRecord(platformManagedReport.inboundAttempt)
    ? platformManagedReport.inboundAttempt
    : null;
  return inboundAttempt?.status === 'not-attempted' || isRecord(inboundAttempt?.error);
}

function summarizeBootstrap(
  bootstrap: BootstrapClaimantLocalDockerReport,
): Pick<BoundedMatrixScenarioEvidence, 'returnedIds' | 'readbacks'> {
  return {
    returnedIds: {
      agentId: bootstrap.claimant.agentId,
      principalId: bootstrap.claimant.principalId,
      registrationId: bootstrap.claimant.registrationId,
      dispatchAuthorityRequestId: bootstrap.dispatchAuthority.requestId ?? '',
      externalBindingId: bootstrap.externalBinding.bindingId ?? '',
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
        'governed-runtime-projection-entry',
        ['identity-entry', 'governed-runtime-projection'],
        'direct-executable',
        ['fresh-bootstrap-state-required'],
        ['This scenario becomes executable only when the bounded matrix can create a fresh bootstrap state file for governed runtime projection.'],
      ),
      buildBlockedScenario(
        'dispatch-authority-reviewed-closure',
        ['account-plane-readiness-and-repair', 'operator-review-boundary'],
        'direct-executable',
        ['fresh-bootstrap-state-required'],
        ['This scenario becomes executable only when the bounded matrix can create a fresh bootstrap state file for dispatch-authority closure.'],
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

  const bootstrapClaimant = createBoundedMatrixBootstrapCache(
    dependencies.bootstrapClaimantLocalDocker
      ?? (async (args: BootstrapClaimantLocalDockerArgs) => runBootstrapClaimantLocalDocker(args)),
  );
  const operatorProbe = dependencies.runP1OperatorDeeperChain
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runP1OperatorDeeperChain(args, { bootstrapClaimant }));
  const integrationProbe = dependencies.runP1IntegrationLifecycle
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runP1IntegrationLifecycle(args, { bootstrapClaimant }));
  const projectionProbe = dependencies.runGovernedRuntimeProjectionEntry
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runGovernedRuntimeProjectionEntry(args, { bootstrapClaimant }));
  const dispatchAuthorityProbe = dependencies.runDispatchAuthorityClosure
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runDispatchAuthorityClosure(args, { bootstrapClaimant }));
  const packBProbe = dependencies.runPackBTaskProgression
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runPackBTaskProgression(args, { bootstrapClaimant }));
  const platformManagedProbe = dependencies.runPlatformManagedIntegrationHandoff
    ?? (async (args: { baseUrl: string; statePath: string; outputPath: string }) => runPlatformManagedIntegrationHandoff(args, { bootstrapClaimant }));

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

  let projectionScenario: BoundedMatrixScenarioEvidence;
  try {
    const projectionReport = await projectionProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-projection-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-projection-report.json'),
    });
    projectionScenario = projectionReport.status === 'passed'
      ? buildPassedScenario(
          'governed-runtime-projection-entry',
          ['identity-entry', 'governed-runtime-projection'],
          'direct-executable',
          ['The checked-in governed-runtime projection probe reached governed reads through a session-projected enterprise account.'],
          {
            tenantId: projectionReport.claimant?.tenantId ?? '',
            companyId: projectionReport.claimant?.companyId ?? '',
          },
          { projection: projectionReport },
        )
      : projectionReport.status === 'blocked'
        ? buildBoundedStopScenario(
            'governed-runtime-projection-entry',
            ['identity-entry', 'governed-runtime-projection'],
            'direct-executable',
            ['governed-runtime-projection-blocked'],
            ['The checked-in governed-runtime projection probe reached a bounded stop instead of opening governed reads.'],
            {
              tenantId: projectionReport.claimant?.tenantId ?? '',
              companyId: projectionReport.claimant?.companyId ?? '',
            },
            { projection: projectionReport },
          )
        : buildContradictionScenario(
            'governed-runtime-projection-entry',
            ['identity-entry', 'governed-runtime-projection'],
            'direct-executable',
            ['The checked-in governed-runtime projection probe returned a failed result.'],
            {
              tenantId: projectionReport.claimant?.tenantId ?? '',
              companyId: projectionReport.claimant?.companyId ?? '',
            },
            { projection: projectionReport },
          );
  } catch (error) {
    projectionScenario = buildProbeFailureScenario(
      'governed-runtime-projection-entry',
      ['identity-entry', 'governed-runtime-projection'],
      'direct-executable',
      'Governed runtime projection probe failed before projected access could be classified',
      error,
    );
  }

  let dispatchAuthorityScenario: BoundedMatrixScenarioEvidence;
  try {
    const dispatchAuthorityReport = await dispatchAuthorityProbe({
      baseUrl: options.baseUrl,
      statePath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-dispatch-authority-state.json'),
      outputPath: buildArtifactPath(options.artifactRootPath, 'bounded-matrix-dispatch-authority-report.json'),
    });
    dispatchAuthorityScenario = dispatchAuthorityReport.status === 'passed'
      ? buildPassedScenario(
          'dispatch-authority-reviewed-closure',
          ['account-plane-readiness-and-repair', 'operator-review-boundary'],
          'direct-executable',
          ['The checked-in dispatch-authority closure probe completed claimant request, operator approval, and claimant reread truth.'],
          {
            requestId: dispatchAuthorityReport.requestId ?? '',
            agentId: dispatchAuthorityReport.claimant?.agentId ?? '',
          },
          { dispatchAuthorityClosure: dispatchAuthorityReport },
        )
      : dispatchAuthorityReport.status === 'blocked'
        ? buildBoundedStopScenario(
            'dispatch-authority-reviewed-closure',
            ['account-plane-readiness-and-repair', 'operator-review-boundary'],
            'direct-executable',
            ['dispatch-authority-closure-blocked'],
            ['The checked-in dispatch-authority closure probe reached a bounded stop before approval closure was confirmed.'],
            {
              requestId: dispatchAuthorityReport.requestId ?? '',
              agentId: dispatchAuthorityReport.claimant?.agentId ?? '',
            },
            { dispatchAuthorityClosure: dispatchAuthorityReport },
          )
        : buildContradictionScenario(
            'dispatch-authority-reviewed-closure',
            ['account-plane-readiness-and-repair', 'operator-review-boundary'],
            'direct-executable',
            ['The checked-in dispatch-authority closure probe returned a failed result.'],
            {
              requestId: dispatchAuthorityReport.requestId ?? '',
              agentId: dispatchAuthorityReport.claimant?.agentId ?? '',
            },
            { dispatchAuthorityClosure: dispatchAuthorityReport },
          );
  } catch (error) {
    dispatchAuthorityScenario = buildProbeFailureScenario(
      'dispatch-authority-reviewed-closure',
      ['account-plane-readiness-and-repair', 'operator-review-boundary'],
      'direct-executable',
      'Dispatch-authority closure probe failed before claimant/operator closure could be classified',
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
            commercialActionDiagnostic: operatorReport.commercialActionDiagnostic,
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
            commercialActionDiagnostic: operatorReport.commercialActionDiagnostic,
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

    const platformManagedCommercialInputs = extractPlatformManagedCommercialReadbackInputs(
      integrationReport,
      platformManagedReport,
    );
    const shouldUseLegacyCommercialInputs = shouldFallbackToLegacyCommercialReadbackInputs(
      platformManagedCommercialInputs,
      platformManagedReport,
    );
    const commercialInputs = platformManagedCommercialInputs.ok
      ? platformManagedCommercialInputs
      : shouldUseLegacyCommercialInputs
        ? extractCommercialReadbackInputs(
            integrationReport,
            platformManagedReport,
          )
        : platformManagedCommercialInputs;
    const knownCommercialBoundedStop = commercialInputs.ok
      ? null
      : extractKnownCommercialBoundedStop(integrationReport, platformManagedReport);
    const commercialReturnedIds = {
      integrationAppId: commercialInputs.ok ? commercialInputs.value.integrationAppId : '',
      integrationInstallationId: commercialInputs.ok ? commercialInputs.value.integrationInstallationId : '',
      platformManagedAgentId: commercialInputs.ok ? commercialInputs.value.platformManagedAgentId : '',
      installationId: commercialInputs.ok ? commercialInputs.value.installationId : '',
      connectionId: commercialInputs.ok ? commercialInputs.value.connectionId : '',
    };
    const commercialReadbacks = buildCommercialProbeReadbacks(integrationReport, platformManagedReport);
    const connectorBoundedStopCode = commercialInputs.ok
      && (commercialInputs.value.inboundErrorCode === 'connector_dispatcher_not_configured'
        || commercialInputs.value.inboundErrorCode === 'connector_inbound_not_supported')
      ? commercialInputs.value.inboundErrorCode
      : null;
    const unexpectedConnectorErrorCode = commercialInputs.ok
      && commercialInputs.value.inboundErrorCode !== null
      && connectorBoundedStopCode === null
      ? commercialInputs.value.inboundErrorCode
      : null;
    const configuredNotInvokableBoundedStop = commercialInputs.ok
      && commercialInputs.value.readinessState === 'configured_not_invokable'
      && commercialInputs.value.invocationRoute === null;
    const integrationAvailabilityBoundedStop = commercialInputs.ok
      && commercialInputs.value.integrationAvailabilityState === 'configured_actor_ineligible';

    commercialScenario = !commercialInputs.ok
      ? knownCommercialBoundedStop !== null
        ? buildBoundedStopScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            knownCommercialBoundedStop.blockedBy,
            knownCommercialBoundedStop.notes,
            knownCommercialBoundedStop.returnedIds,
            knownCommercialBoundedStop.readbacks,
          )
        : buildBlockedScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            commercialInputs.blockedBy,
            commercialInputs.notes,
          )
      : commercialInputs.value.readinessState === 'configured_invokable'
      && commercialInputs.value.invocationRoute === null
      && commercialInputs.value.inboundErrorCode !== 'connector_dispatcher_not_configured'
      && commercialInputs.value.inboundErrorCode !== 'connector_inbound_not_supported'
      ? buildContradictionScenario(
          'commercial-and-integration-readback',
          ['integration-center-lifecycle-and-retired-seam-validation'],
          'bounded-stop-proof',
          ['Platform-managed eligibility reported configured_invokable while the invocation route was null without the known bounded dispatcher stop.'],
          commercialReturnedIds,
          commercialReadbacks,
        )
      : unexpectedConnectorErrorCode !== null
        ? buildContradictionScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            [`Platform-managed inbound returned unexpected connector error ${unexpectedConnectorErrorCode}.`],
            commercialReturnedIds,
            commercialReadbacks,
          )
      : connectorBoundedStopCode !== null
        || configuredNotInvokableBoundedStop
        || integrationAvailabilityBoundedStop
        ? buildBoundedStopScenario(
            'commercial-and-integration-readback',
            ['integration-center-lifecycle-and-retired-seam-validation'],
            'bounded-stop-proof',
            connectorBoundedStopCode !== null
              ? [connectorBoundedStopCode]
              : configuredNotInvokableBoundedStop
                ? ['configured_not_invokable']
                : ['configured_actor_ineligible'],
            connectorBoundedStopCode !== null
              ? ['The checked-in integration probes reached the maintained bounded stop at the connector boundary instead of contradicting readiness truth.']
              : configuredNotInvokableBoundedStop
                ? ['Platform-managed eligibility reported configured_not_invokable with a null invocation route, so the commercial readback remains at the maintained bounded stop.']
                : ['Integration eligibility reported configured_actor_ineligible, so the commercial readback remains at the maintained bounded stop.'],
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
    projectionScenario,
    dispatchAuthorityScenario,
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
