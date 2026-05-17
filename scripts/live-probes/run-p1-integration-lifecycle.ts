import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunP1IntegrationLifecycleArgs {
  baseUrl: string;
  statePath: string;
  outputPath: string;
  email?: string;
  password?: string;
  companyName?: string;
}

export interface IntegrationLifecycleStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'public-integration-apps'
    | 'create-account-integration-app'
    | 'account-integration-apps'
    | 'create-account-integration-installation'
    | 'account-integration-installations'
    | 'connect-account-integration-installation'
    | 'account-integration-capabilities'
    | 'account-agent-integration-eligibility';
  status: 'passed' | 'failed' | 'blocked';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface IntegrationLifecyclePhaseResult {
  phaseKey: 'bootstrap' | 'continuation' | 'bounded-stop' | 'contradiction';
  status: 'passed' | 'blocked' | 'failed';
  classification: 'pass' | 'bounded-stop' | 'contradiction' | 'blocked';
  detail: string;
}

export interface RunP1IntegrationLifecycleReport {
  command: 'run-p1-integration-lifecycle';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  status?: 'passed' | 'blocked' | 'failed';
  failure?: {
    phaseKey: 'bootstrap' | 'continuation' | 'bounded-stop' | 'contradiction';
    classification: 'pass' | 'bounded-stop' | 'contradiction' | 'blocked';
    message: string;
  };
  phases?: IntegrationLifecyclePhaseResult[];
  claimant?: {
    email: string;
    sessionId: string;
    tenantId: string;
    companyId: string;
    agentOnboardingAllowed: boolean;
  };
  ids: {
    integrationAppId: string | null;
    integrationInstallationId: string | null;
  };
  retiredSeams?: {
    onboardingContract: {
      status: 'expected-fail-closed' | 'unexpected';
      code: string | null;
      route: '/runtime/integrations/:integrationCode/onboarding-contract';
    };
    login: {
      status: 'expected-fail-closed' | 'unexpected';
      code: string | null;
      route: '/runtime/integrations/:integrationCode/login';
    };
    inbound: {
      status: 'expected-fail-closed' | 'unexpected';
      code: string | null;
      route: '/runtime/integrations/:integrationCode/inbound';
    };
    wmsWarehouses: {
      status: 'expected-fail-closed' | 'unexpected';
      code: string | null;
      route: '/runtime/wms/warehouses';
    };
  };
  steps: IntegrationLifecycleStepResult[];
}

type RetiredSeamRoute =
  | '/runtime/integrations/:integrationCode/onboarding-contract'
  | '/runtime/integrations/:integrationCode/login'
  | '/runtime/integrations/:integrationCode/inbound'
  | '/runtime/wms/warehouses';

type RetiredSeamResult<Route extends RetiredSeamRoute> = {
  status: 'expected-fail-closed' | 'unexpected';
  code: string | null;
  route: Route;
};

interface RunP1IntegrationLifecycleDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  randomSuffix?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunP1IntegrationLifecycleReport) => Promise<{ outputPath: string }>;
}

export function parseRunP1IntegrationLifecycleArgs(argv: string[]): RunP1IntegrationLifecycleArgs {
  let baseUrl: string | undefined;
  let statePath: string | undefined;
  let outputPath: string | undefined;
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
    if (token === '--output') {
      outputPath = argv[index + 1];
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
  if (!outputPath?.trim()) {
    throw new Error('--output is required');
  }

  return {
    baseUrl: baseUrl.trim(),
    statePath: statePath.trim(),
    outputPath: outputPath.trim(),
    ...(email?.trim() ? { email: email.trim() } : {}),
    ...(password?.trim() ? { password: password.trim() } : {}),
    ...(companyName?.trim() ? { companyName: companyName.trim() } : {}),
  };
}

async function defaultWriteReport(
  outputPath: string,
  report: RunP1IntegrationLifecycleReport,
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

function buildRetiredSeamResult<Route extends RetiredSeamRoute>(
  route: Route,
  payload: unknown,
  expectedCode: 'integration_legacy_surface_removed' | 'wms_legacy_surface_removed',
): RetiredSeamResult<Route> {
  const errorCode = (payload as { error?: { code?: string } }).error?.code ?? null;
  return {
    status: errorCode === expectedCode ? 'expected-fail-closed' : 'unexpected',
    code: errorCode,
    route,
  };
}

export async function runP1IntegrationLifecycle(
  args: RunP1IntegrationLifecycleArgs,
  dependencies: RunP1IntegrationLifecycleDependencies = {},
): Promise<RunP1IntegrationLifecycleReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const randomSuffix = dependencies.randomSuffix ?? (() => `${Date.now()}`);
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
    const report: RunP1IntegrationLifecycleReport = {
      command: 'run-p1-integration-lifecycle',
      generatedAt: timestamp,
      baseUrl: args.baseUrl,
      statePath: args.statePath,
      outputPath: args.outputPath,
      status: 'failed',
      failure: {
        phaseKey: 'bootstrap',
        classification: 'contradiction',
        message,
      },
      phases: [
        {
          phaseKey: 'bootstrap',
          status: 'failed',
          classification: 'contradiction',
          detail: message,
        },
      ],
      ids: {
        integrationAppId: null,
        integrationInstallationId: null,
      },
      steps: [
        {
          stepKey: 'bootstrap-claimant',
          status: 'failed',
          route: 'bootstrap-claimant-local-docker',
          requestBody: null,
          responseBody: {
            error: {
              code: 'bootstrap_failed',
              message,
            },
          },
        },
      ],
    };

    await writeReport(args.outputPath, report);
    return report;
  }

  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };

  const integrationCode = `p1-integration-${randomSuffix()}`;
  const steps: IntegrationLifecycleStepResult[] = [];

  const publicApps = await requestJson(fetchImpl, `${args.baseUrl}/runtime/public/integration-apps?tenant_id=tenant-public`, {
    method: 'GET',
  });
  steps.push({
    stepKey: 'public-integration-apps',
    status: publicApps.status === 200 ? 'passed' : 'failed',
    route: '/runtime/public/integration-apps',
    requestBody: null,
    responseBody: publicApps.body,
  });

  const createApp = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-apps`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      integration_code: integrationCode,
      display_name: 'P1 Integration App',
      short_description: 'Created by the P1 integration lifecycle probe.',
      system_class: 'WMS',
      public_display_opt_in: true,
      now: timestamp,
    }),
  });
  steps.push({
    stepKey: 'create-account-integration-app',
    status: createApp.status === 200 ? 'passed' : createApp.status === 409 ? 'blocked' : 'failed',
    route: '/runtime/account/integration-apps',
    requestBody: {
      integration_code: integrationCode,
      display_name: 'P1 Integration App',
      short_description: 'Created by the P1 integration lifecycle probe.',
      system_class: 'WMS',
      public_display_opt_in: true,
      now: timestamp,
    },
    responseBody: createApp.body,
  });

  const integrationAppId = (createApp.body as { integration_app?: { integration_app_id?: string } }).integration_app?.integration_app_id ?? null;

  const accountApps = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-apps`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  steps.push({
    stepKey: 'account-integration-apps',
    status: accountApps.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/integration-apps',
    requestBody: null,
    responseBody: accountApps.body,
  });

  const createInstallation = integrationAppId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-installations`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          integration_app_id: integrationAppId,
          now: timestamp,
        }),
      });
  steps.push({
    stepKey: 'create-account-integration-installation',
    status: integrationAppId === null
      ? 'blocked'
      : createInstallation.status === 200
        ? 'passed'
        : createInstallation.status === 409
          ? 'blocked'
          : 'failed',
    route: '/runtime/account/integration-installations',
    requestBody: integrationAppId === null ? null : { integration_app_id: integrationAppId, now: timestamp },
    responseBody: createInstallation.body,
  });

  const integrationInstallationId = (createInstallation.body as { integration_installation?: { integration_installation_id?: string } }).integration_installation?.integration_installation_id ?? null;

  const accountInstallations = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-installations`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  steps.push({
    stepKey: 'account-integration-installations',
    status: accountInstallations.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/integration-installations',
    requestBody: null,
    responseBody: accountInstallations.body,
  });

  const connectInstallation = integrationInstallationId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-installations/${integrationInstallationId}/connection`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          endpoint_base_url: 'https://third-party.example.test',
          auth_mode: 'jwt',
          client_identifier: 'client-a',
          credential_secret_ref: 'secret://tenant-public/integration/p1',
          now: timestamp,
        }),
      });
  steps.push({
    stepKey: 'connect-account-integration-installation',
    status: integrationInstallationId === null
      ? 'blocked'
      : connectInstallation.status === 200
        ? 'passed'
        : connectInstallation.status === 409
          ? 'blocked'
          : 'failed',
    route: '/runtime/account/integration-installations/:integrationInstallationId/connection',
    requestBody: integrationInstallationId === null
      ? null
      : {
          endpoint_base_url: 'https://third-party.example.test',
          auth_mode: 'jwt',
          client_identifier: 'client-a',
          credential_secret_ref: 'secret://tenant-public/integration/p1',
          now: timestamp,
        },
    responseBody: connectInstallation.body,
  });

  const accountCapabilities = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-capabilities`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  steps.push({
    stepKey: 'account-integration-capabilities',
    status: accountCapabilities.status === 200 ? 'passed' : 'failed',
    route: '/runtime/account/integration-capabilities',
    requestBody: null,
    responseBody: accountCapabilities.body,
  });

  const eligibility = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(bootstrap.claimant.agentId)}/integrations/${integrationCode}/eligibility`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  steps.push({
    stepKey: 'account-agent-integration-eligibility',
    status: eligibility.status === 200 ? 'passed' : eligibility.status === 403 || eligibility.status === 404 || eligibility.status === 409 ? 'blocked' : 'failed',
    route: '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility',
    requestBody: null,
    responseBody: eligibility.body,
  });

  const retiredOnboardingContract = await requestJson(fetchImpl, `${args.baseUrl}/runtime/integrations/haisi-wms/onboarding-contract?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      agent_registration_id: bootstrap.claimant.registrationId,
      identity_mapping: {
        source: {
          principal_id: bootstrap.claimant.principalId,
          scope_id: bootstrap.claimant.tenantId,
          capability_codes: ['inventory.read'],
        },
        target: {
          wms_subject_id: 'admin',
          capability_map: {
            'inventory.read': 'warehouse.read',
          },
        },
        metadata: {
          mapping_version: 'v1',
          mapping_status: 'active',
        },
      },
      now: timestamp,
    }),
  });
  const retiredLogin = await requestJson(fetchImpl, `${args.baseUrl}/runtime/integrations/haisi-wms/login?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({}),
  });
  const retiredInbound = await requestJson(fetchImpl, `${args.baseUrl}/runtime/integrations/haisi-wms/inbound?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      warehouseId: 40,
      date: '2026-03-16',
      details: [],
    }),
  });
  const retiredWmsWarehouses = await requestJson(fetchImpl, `${args.baseUrl}/runtime/wms/warehouses?tenant_id=${encodeURIComponent(bootstrap.claimant.tenantId)}`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });

  const report: RunP1IntegrationLifecycleReport = {
    command: 'run-p1-integration-lifecycle',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    status: 'passed',
    phases: [
      {
        phaseKey: 'bootstrap',
        status: 'passed',
        classification: 'pass',
        detail: 'bootstrap claimant completed successfully',
      },
      {
        phaseKey: steps.some((step) => step.status === 'blocked') ? 'bounded-stop' : 'continuation',
        status: steps.some((step) => step.status === 'failed') ? 'failed' : steps.some((step) => step.status === 'blocked') ? 'blocked' : 'passed',
        classification: steps.some((step) => step.status === 'failed') ? 'contradiction' : steps.some((step) => step.status === 'blocked') ? 'bounded-stop' : 'pass',
        detail: steps.some((step) => step.status === 'failed')
          ? 'integration lifecycle returned at least one failed continuation step'
          : steps.some((step) => step.status === 'blocked')
            ? 'integration lifecycle reached at least one bounded stop'
            : 'integration lifecycle continuation completed without blocked steps',
      },
    ],
    claimant: {
      email: bootstrap.claimant.email,
      sessionId: bootstrap.claimant.sessionId,
      tenantId: bootstrap.claimant.tenantId,
      companyId: bootstrap.claimant.companyId,
      agentOnboardingAllowed: bootstrap.claimant.agentOnboardingAllowed,
    },
    ids: {
      integrationAppId,
      integrationInstallationId,
    },
    retiredSeams: {
      onboardingContract: buildRetiredSeamResult('/runtime/integrations/:integrationCode/onboarding-contract', retiredOnboardingContract.body, 'integration_legacy_surface_removed'),
      login: buildRetiredSeamResult('/runtime/integrations/:integrationCode/login', retiredLogin.body, 'integration_legacy_surface_removed'),
      inbound: buildRetiredSeamResult('/runtime/integrations/:integrationCode/inbound', retiredInbound.body, 'integration_legacy_surface_removed'),
      wmsWarehouses: buildRetiredSeamResult('/runtime/wms/warehouses', retiredWmsWarehouses.body, 'wms_legacy_surface_removed'),
    },
    steps: [
      {
        stepKey: 'bootstrap-claimant',
        status: 'passed',
        route: 'bootstrap-claimant-local-docker',
        requestBody: {
          email: bootstrap.claimant.email,
        },
        responseBody: bootstrap,
      },
      ...steps,
    ],
  };

  await writeReport(args.outputPath, report);

  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
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
  const report = await runP1IntegrationLifecycle({
    ...bootstrapArgs,
    outputPath: outputPath.trim(),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
