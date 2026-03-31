import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';

export interface BidviaOpenClawConfig {
  mcpServers: {
    'bidvia-agent-client': {
      command: 'bidvia-agent-client';
      args: ['mcp-server'];
      env: {
        BIDVIA_BASE_URL: string;
        BIDVIA_TENANT_ID: '<required>';
        BIDVIA_SESSION_ID: '<optional>';
        BIDVIA_ADMIN_SESSION_ID: '<optional>';
        BIDVIA_REGISTRATION_ID: '<optional>';
        BIDVIA_PRINCIPAL_ID: '<optional>';
      };
    };
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

export function buildOpenClawConfig(): BidviaOpenClawConfig {
  const defaults = buildPublicDefaults();

  return {
    mcpServers: {
      'bidvia-agent-client': {
        command: 'bidvia-agent-client',
        args: ['mcp-server'],
        env: {
          BIDVIA_BASE_URL: defaults.baseUrl,
          BIDVIA_TENANT_ID: '<required>',
          BIDVIA_SESSION_ID: '<optional>',
          BIDVIA_ADMIN_SESSION_ID: '<optional>',
          BIDVIA_REGISTRATION_ID: '<optional>',
          BIDVIA_PRINCIPAL_ID: '<optional>',
        },
      },
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
