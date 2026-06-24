import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseBootstrapClaimantLocalDockerArgs,
  runBootstrapClaimantLocalDocker,
  type BootstrapClaimantLocalDockerArgs,
  type BootstrapClaimantLocalDockerReport,
} from './bootstrap-claimant-local-docker.js';

export interface RunPlatformManagedIntegrationHandoffArgs extends BootstrapClaimantLocalDockerArgs {
  outputPath: string;
  integrationCode?: string;
  connectorEndpointBaseUrl?: string;
}

export interface PlatformManagedIntegrationHandoffStepResult {
  stepKey:
    | 'bootstrap-claimant'
    | 'public-integration-apps'
    | 'create-account-integration-installation'
    | 'connect-account-integration-installation'
    | 'ordinary-external-eligibility'
    | 'platform-managed-registration'
    | 'platform-managed-eligibility'
    | 'platform-managed-inbound';
  status: 'passed' | 'failed' | 'blocked';
  route: string;
  requestBody: unknown;
  responseBody: unknown;
}

export interface RunPlatformManagedIntegrationHandoffReport {
  command: 'run-platform-managed-integration-handoff';
  generatedAt: string;
  baseUrl: string;
  statePath: string;
  outputPath: string;
  integrationCode: string;
  bootstrap: BootstrapClaimantLocalDockerReport;
  ordinaryAgentId: string;
  platformManagedAgentId: string | null;
  selectedApp: unknown;
  installationId: string | null;
  connectionId: string | null;
  ordinaryExternalEligibility: unknown;
  platformManagedEligibility: unknown;
  inboundAttempt: unknown;
  steps: PlatformManagedIntegrationHandoffStepResult[];
}

interface RunPlatformManagedIntegrationHandoffDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
  bootstrapClaimant?: (args: BootstrapClaimantLocalDockerArgs) => Promise<BootstrapClaimantLocalDockerReport>;
  writeReport?: (outputPath: string, report: RunPlatformManagedIntegrationHandoffReport) => Promise<{ outputPath: string }>;
}

export function parseRunPlatformManagedIntegrationHandoffArgs(argv: string[]): RunPlatformManagedIntegrationHandoffArgs {
  const bootstrapArgs = parseBootstrapClaimantLocalDockerArgs(argv);
  let outputPath: string | undefined;
  let integrationCode: string | undefined;
  let connectorEndpointBaseUrl: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      outputPath = argv[index + 1];
      continue;
    }
    if (argv[index] === '--integration-code') {
      integrationCode = argv[index + 1];
      continue;
    }
    if (argv[index] === '--connector-endpoint-base-url') {
      connectorEndpointBaseUrl = argv[index + 1];
    }
  }

  if (!outputPath?.trim()) {
    throw new Error('--output is required');
  }

  return {
    ...bootstrapArgs,
    outputPath: outputPath.trim(),
    ...(integrationCode?.trim() ? { integrationCode: integrationCode.trim() } : {}),
    ...(connectorEndpointBaseUrl?.trim() ? { connectorEndpointBaseUrl: connectorEndpointBaseUrl.trim() } : {}),
  };
}

function resolveConnectorEndpointBaseUrl(args: RunPlatformManagedIntegrationHandoffArgs, integrationCode: string): string {
  if (args.connectorEndpointBaseUrl?.trim()) {
    return args.connectorEndpointBaseUrl.trim();
  }
  if (integrationCode === 'haisi-wms') {
    return 'http://haisi-wms-fixture-connector:8791';
  }
  return 'https://third-party.example.test';
}

async function defaultWriteReport(
  outputPath: string,
  report: RunPlatformManagedIntegrationHandoffReport,
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
  steps: PlatformManagedIntegrationHandoffStepResult[],
  stepKey: PlatformManagedIntegrationHandoffStepResult['stepKey'],
  route: string,
  requestBody: unknown,
  response: { status: number; body: unknown },
) {
  steps.push({
    stepKey,
    status: response.status === 200 ? 'passed' : response.status === 403 || response.status === 404 || response.status === 409 || response.status === 501 ? 'blocked' : 'failed',
    route,
    requestBody,
    responseBody: response.body,
  });
}

export async function runPlatformManagedIntegrationHandoff(
  args: RunPlatformManagedIntegrationHandoffArgs,
  dependencies: RunPlatformManagedIntegrationHandoffDependencies = {},
): Promise<RunPlatformManagedIntegrationHandoffReport> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date().toISOString());
  const bootstrapClaimant = dependencies.bootstrapClaimant ?? ((bootstrapArgs) => runBootstrapClaimantLocalDocker(bootstrapArgs));
  const writeReport = dependencies.writeReport ?? defaultWriteReport;
  const integrationCode = args.integrationCode ?? 'haisi-wms';
  const connectorEndpointBaseUrl = resolveConnectorEndpointBaseUrl(args, integrationCode);

  const timestamp = now();
  const bootstrap = await bootstrapClaimant({
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    ...(args.email ? { email: args.email } : {}),
    ...(args.password ? { password: args.password } : {}),
    ...(args.companyName ? { companyName: args.companyName } : {}),
  });

  const ordinaryAgentId = bootstrap.claimant.agentId;
  const ordinaryPrincipalId = bootstrap.claimant.principalId;
  const sessionHeaders = {
    'content-type': 'application/json',
    'x-bidvia-session-id': bootstrap.claimant.sessionId,
  };
  const steps: PlatformManagedIntegrationHandoffStepResult[] = [
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

  const publicApps = await requestJson(fetchImpl, `${args.baseUrl}/runtime/public/integration-apps?tenant_id=tenant-public`, {
    method: 'GET',
  });
  pushStep(steps, 'public-integration-apps', '/runtime/public/integration-apps', null, publicApps);

  const apps = (publicApps.body as { items?: Array<{ integration_app_id?: string; integration_code?: string }> }).items ?? [];
  const selectedApp = apps.find((item) => item.integration_code === integrationCode) ?? null;
  const selectedAppId = selectedApp?.integration_app_id ?? null;

  const createInstallation = selectedAppId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-installations`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          integration_app_id: selectedAppId,
          now: timestamp,
        }),
      });
  pushStep(steps, 'create-account-integration-installation', '/runtime/account/integration-installations', selectedAppId === null ? null : { integration_app_id: selectedAppId, now: timestamp }, createInstallation);

  const installationId = (createInstallation.body as { integration_installation?: { integration_installation_id?: string } }).integration_installation?.integration_installation_id ?? null;
  const connectInstallation = installationId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/integration-installations/${encodeURIComponent(installationId)}/connection`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          endpoint_base_url: connectorEndpointBaseUrl,
          auth_mode: 'jwt',
          client_identifier: 'client-a',
          credential_secret_ref: 'secret://tenant-public/integration/platform-managed',
          now: timestamp,
        }),
      });
  pushStep(steps, 'connect-account-integration-installation', '/runtime/account/integration-installations/:integrationInstallationId/connection', installationId === null ? null : { endpoint_base_url: connectorEndpointBaseUrl, auth_mode: 'jwt', client_identifier: 'client-a', credential_secret_ref: 'secret://tenant-public/integration/platform-managed', now: timestamp }, connectInstallation);

  const ordinaryEligibility = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(ordinaryAgentId)}/integrations/${encodeURIComponent(integrationCode)}/eligibility`, {
    method: 'GET',
    headers: {
      'x-bidvia-session-id': bootstrap.claimant.sessionId,
    },
  });
  pushStep(steps, 'ordinary-external-eligibility', '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility', null, ordinaryEligibility);

  const platformManagedRegistration = await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/platform-managed-registrations?tenant_id=tenant-public`, {
    method: 'POST',
    headers: sessionHeaders,
    body: JSON.stringify({
      agent_id: ordinaryAgentId,
      principal_id: ordinaryPrincipalId,
      now: timestamp,
    }),
  });
  pushStep(steps, 'platform-managed-registration', '/runtime/account/agents/platform-managed-registrations', { agent_id: ordinaryAgentId, principal_id: ordinaryPrincipalId, now: timestamp }, platformManagedRegistration);

  const platformManagedAgentId = (platformManagedRegistration.body as { registration?: { agent_id?: string } }).registration?.agent_id
    ?? (platformManagedRegistration.body as { agent?: { agent_id?: string } }).agent?.agent_id
    ?? null;
  const platformManagedEligibility = platformManagedAgentId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(platformManagedAgentId)}/integrations/${encodeURIComponent(integrationCode)}/eligibility`, {
        method: 'GET',
        headers: {
          'x-bidvia-session-id': bootstrap.claimant.sessionId,
        },
      });
  pushStep(steps, 'platform-managed-eligibility', '/runtime/account/agents/:agentId/integrations/:integrationCode/eligibility', null, platformManagedEligibility);

  const platformManagedInbound = platformManagedAgentId === null
    ? { status: 0, body: { skipped: true } }
    : await requestJson(fetchImpl, `${args.baseUrl}/runtime/account/agents/${encodeURIComponent(platformManagedAgentId)}/integrations/${encodeURIComponent(integrationCode)}/inbound`, {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          warehouseId: 40,
          date: '2026-03-16',
          details: [],
          now: timestamp,
        }),
      });
  pushStep(steps, 'platform-managed-inbound', '/runtime/account/agents/:agentId/integrations/:integrationCode/inbound', platformManagedAgentId === null ? null : { warehouseId: 40, date: '2026-03-16', details: [], now: timestamp }, platformManagedInbound);

  const report: RunPlatformManagedIntegrationHandoffReport = {
    command: 'run-platform-managed-integration-handoff',
    generatedAt: timestamp,
    baseUrl: args.baseUrl,
    statePath: args.statePath,
    outputPath: args.outputPath,
    integrationCode,
    bootstrap,
    ordinaryAgentId,
    platformManagedAgentId,
    selectedApp,
    installationId,
    connectionId: (connectInstallation.body as { connection?: { integration_installation_connection_id?: string } }).connection?.integration_installation_connection_id ?? null,
    ordinaryExternalEligibility: ordinaryEligibility.body,
    platformManagedEligibility: platformManagedEligibility.body,
    inboundAttempt: platformManagedInbound.body,
    steps,
  };

  await writeReport(args.outputPath, report);

  return report;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseRunPlatformManagedIntegrationHandoffArgs(argv);
  const report = await runPlatformManagedIntegrationHandoff(args);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const entrypointPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (entrypointPath === modulePath) {
  await main();
}
