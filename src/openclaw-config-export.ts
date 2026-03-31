import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';

export interface BidviaOpenClawConfig {
  serverName: 'bidvia-agent-client';
  transport: 'stdio';
  command: 'node';
  args: ['dist/mcp-server.js'];
  env: {
    BIDVIA_BASE_URL: string;
    BIDVIA_TENANT_ID: '<required>';
    BIDVIA_SESSION_ID: '<optional>';
    BIDVIA_ADMIN_SESSION_ID: '<optional>';
    BIDVIA_REGISTRATION_ID: '<optional>';
    BIDVIA_PRINCIPAL_ID: '<optional>';
  };
  boundary: {
    localOnly: true;
    hosted: false;
    remoteDiscovery: false;
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

export function buildOpenClawConfig(): BidviaOpenClawConfig {
  const defaults = buildPublicDefaults();

  return {
    serverName: 'bidvia-agent-client',
    transport: 'stdio',
    command: 'node',
    args: ['dist/mcp-server.js'],
    env: {
      BIDVIA_BASE_URL: defaults.baseUrl,
      BIDVIA_TENANT_ID: '<required>',
      BIDVIA_SESSION_ID: '<optional>',
      BIDVIA_ADMIN_SESSION_ID: '<optional>',
      BIDVIA_REGISTRATION_ID: '<optional>',
      BIDVIA_PRINCIPAL_ID: '<optional>',
    },
    boundary: {
      localOnly: true,
      hosted: false,
      remoteDiscovery: false,
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
