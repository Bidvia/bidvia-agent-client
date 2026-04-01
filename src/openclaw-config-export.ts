import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';

export interface BidviaOpenClawMcpServerConfig {
  command: 'bidvia';
  args: ['mcp-server'];
  env: {
    BIDVIA_BASE_URL: string;
    BIDVIA_TENANT_ID: '<required>';
    BIDVIA_SESSION_ID: '<optional>';
    BIDVIA_ADMIN_SESSION_ID: '<optional>';
    BIDVIA_REGISTRATION_ID: '<optional>';
    BIDVIA_PRINCIPAL_ID: '<optional>';
    BIDVIA_PRINCIPAL_TYPE: '<optional>';
    BIDVIA_AUTHORIZED_ROLE: '<optional>';
    BIDVIA_COMPANY_ID: '<optional>';
  };
}

export interface BidviaOpenClawConfig {
  mcpServers: {
    bidvia: BidviaOpenClawMcpServerConfig;
  };
  localExecutionExpectations: {
    transport: 'stdio';
    localOnly: true;
    hosted: false;
    remoteDiscovery: false;
    publishedPackageRequired: true;
    endpointOverride: 'advanced-operator-only';
    developmentFallback: 'node dist/mcp-server.js';
  };
  firstSuccessNextStep: {
    command: 'route-context-matrix';
    rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.';
  };
}

function buildPublicDefaults() {
  const runtimeSnapshot = buildLocalRuntimeCapabilitySnapshot();

  return {
    baseUrl: runtimeSnapshot.baseUrl,
  };
}

export function buildOpenClawMcpServerConfig(): BidviaOpenClawMcpServerConfig {
  const defaults = buildPublicDefaults();

  return {
    command: 'bidvia',
    args: ['mcp-server'],
    env: {
      BIDVIA_BASE_URL: defaults.baseUrl,
      BIDVIA_TENANT_ID: '<required>',
      BIDVIA_SESSION_ID: '<optional>',
      BIDVIA_ADMIN_SESSION_ID: '<optional>',
      BIDVIA_REGISTRATION_ID: '<optional>',
      BIDVIA_PRINCIPAL_ID: '<optional>',
      BIDVIA_PRINCIPAL_TYPE: '<optional>',
      BIDVIA_AUTHORIZED_ROLE: '<optional>',
      BIDVIA_COMPANY_ID: '<optional>',
    },
  };
}

export function buildOpenClawConfig(): BidviaOpenClawConfig {
  return {
    mcpServers: {
      bidvia: buildOpenClawMcpServerConfig(),
    },
    localExecutionExpectations: {
      transport: 'stdio',
      localOnly: true,
      hosted: false,
      remoteDiscovery: false,
      publishedPackageRequired: true,
      endpointOverride: 'advanced-operator-only',
      developmentFallback: 'node dist/mcp-server.js',
    },
    firstSuccessNextStep: {
      command: 'route-context-matrix',
      rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.',
    },
  };
}

export function exportOpenClawConfig(config: BidviaOpenClawConfig): BidviaOpenClawConfig {
  return structuredClone(config);
}
