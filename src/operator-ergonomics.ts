import type {
  BidviaClientContext,
  BidviaMcpToolDescriptor,
  BidviaScenarioContextKey,
} from './contracts.js';
import { buildLocalDiscoveryCatalog, getLocalMcpToolDescriptor } from './discovery-catalog.js';

export interface BidviaExecutionOperatorPreflight {
  target: string;
  surface: 'cli' | 'mcp';
  scope: 'local-only';
  routePathTemplate: string;
  httpMethod: string;
  accessContextFamily: string;
  localCapabilityTier: string;
  localCapabilityRiskTier: string;
  requiredContext: BidviaScenarioContextKey[];
  missingContext: BidviaScenarioContextKey[];
  hints: string[];
}

interface BidviaExecutionCatalogEntry {
  routePathTemplate: string;
  httpMethod: string;
  accessContextFamily: string;
  localCapabilityTier: string;
  localCapabilityRiskTier: string;
  requiredContext: BidviaScenarioContextKey[];
}

function buildCliExecutionCatalogEntry(command: string): BidviaExecutionCatalogEntry | undefined {
  const entry = buildLocalDiscoveryCatalog().find((candidate) => candidate.cliCommands.includes(command));
  if (!entry || entry.discoveryKind !== 'execute') {
    return undefined;
  }

  return {
    routePathTemplate: entry.routePathTemplate,
    httpMethod: entry.httpMethod,
    accessContextFamily: entry.accessContextFamily,
    localCapabilityTier: entry.localCapabilityTier,
    localCapabilityRiskTier: entry.localCapabilityRiskTier,
    requiredContext: [...entry.requiredContext],
  };
}

function buildMcpExecutionCatalogEntry(toolName: string): BidviaExecutionCatalogEntry | undefined {
  const descriptor = getLocalMcpToolDescriptor(toolName);
  if (!descriptor || descriptor.outputMode !== 'execution-result') {
    return undefined;
  }

  const discoveryEntry = buildLocalDiscoveryCatalog().find((candidate) =>
    candidate.mcpTools.some((tool) => tool.toolName === toolName)
  );
  if (!discoveryEntry) {
    return undefined;
  }

  return {
    routePathTemplate: discoveryEntry.routePathTemplate,
    httpMethod: discoveryEntry.httpMethod,
    accessContextFamily: descriptor.accessContextFamily,
    localCapabilityTier: descriptor.localCapabilityTier,
    localCapabilityRiskTier: descriptor.localCapabilityRiskTier,
    requiredContext: [...descriptor.requiredContext],
  };
}

function collectMissingContext(
  requiredContext: readonly BidviaScenarioContextKey[],
  context: Partial<BidviaClientContext>,
): BidviaScenarioContextKey[] {
  return requiredContext.filter((contextKey) => !context[contextKey]);
}

function buildHints(params: {
  surface: 'cli' | 'mcp';
  localCapabilityRiskTier: string;
  missingContext: BidviaScenarioContextKey[];
  dryRun: boolean;
}): string[] {
  const hints: string[] = [];

  const toEnvKey = (contextKey: BidviaScenarioContextKey): string => {
    switch (contextKey) {
      case 'registrationId':
        return 'BIDVIA_REGISTRATION_ID';
      case 'principalId':
        return 'BIDVIA_PRINCIPAL_ID';
      case 'principalType':
        return 'BIDVIA_PRINCIPAL_TYPE';
      case 'authorizedRole':
        return 'BIDVIA_AUTHORIZED_ROLE';
      case 'tenantId':
        return 'BIDVIA_TENANT_ID';
      case 'sessionId':
        return 'BIDVIA_SESSION_ID';
      case 'adminSessionId':
        return 'BIDVIA_ADMIN_SESSION_ID';
      case 'companyId':
        return 'BIDVIA_COMPANY_ID';
    }
  };

  if (params.surface === 'cli' && params.dryRun) {
    hints.push('Dry-run stays local and does not execute the remote registration-bound route.');
  }

  if (params.surface === 'mcp') {
    hints.push('This MCP execution tool uses the existing local execution client seam.');
  }

  if (params.missingContext.length > 0) {
    const envKeys = params.missingContext.map(toEnvKey);
    hints.push(`Set ${envKeys.join(' and ')} before running the real execution command.`);
  }

  if (params.surface === 'cli' && !params.dryRun) {
    hints.push('Use --dry-run to inspect the local-only payload preview without remote execution.');
  }

  hints.push(
    `Risk tier ${params.localCapabilityRiskTier} means the ${params.surface === 'cli' ? 'non-dry-run command' : 'tool'} writes to the remote runtime route${params.surface === 'mcp' ? ' when context is present' : ''}.`,
  );

  return hints;
}

function buildPreflight(
  target: string,
  surface: 'cli' | 'mcp',
  catalogEntry: BidviaExecutionCatalogEntry,
  context: Partial<BidviaClientContext>,
  dryRun: boolean,
): BidviaExecutionOperatorPreflight {
  const missingContext = collectMissingContext(catalogEntry.requiredContext, context);

  return {
    target,
    surface,
    scope: 'local-only',
    routePathTemplate: catalogEntry.routePathTemplate,
    httpMethod: catalogEntry.httpMethod,
    accessContextFamily: catalogEntry.accessContextFamily,
    localCapabilityTier: catalogEntry.localCapabilityTier,
    localCapabilityRiskTier: catalogEntry.localCapabilityRiskTier,
    requiredContext: [...catalogEntry.requiredContext],
    missingContext,
    hints: buildHints({
      surface,
      localCapabilityRiskTier: catalogEntry.localCapabilityRiskTier,
      missingContext,
      dryRun,
    }),
  };
}

export function buildCliExecutionPreflight(
  command: string,
  context: Partial<BidviaClientContext>,
  dryRun: boolean,
): BidviaExecutionOperatorPreflight | undefined {
  const catalogEntry = buildCliExecutionCatalogEntry(command);
  if (!catalogEntry) {
    return undefined;
  }

  return buildPreflight(command, 'cli', catalogEntry, context, dryRun);
}

export function buildMcpExecutionPreflight(
  descriptor: BidviaMcpToolDescriptor,
  client: unknown,
): BidviaExecutionOperatorPreflight | undefined {
  const catalogEntry = buildMcpExecutionCatalogEntry(descriptor.toolName);
  if (!catalogEntry) {
    return undefined;
  }

  const clientContext = typeof client === 'object'
    && client !== null
    && 'options' in client
    && typeof client.options === 'object'
    && client.options !== null
    && 'context' in client.options
    && typeof client.options.context === 'object'
    && client.options.context !== null
    ? client.options.context as Partial<BidviaClientContext>
    : undefined;

  return buildPreflight(descriptor.toolName, 'mcp', catalogEntry, clientContext ?? {
    tenantId: 'available-via-local-client-seam',
    registrationId: 'available-via-local-client-seam',
    principalId: 'available-via-local-client-seam',
  }, false);
}

export function buildCliMissingContextMessage(
  command: string,
  missingContext: readonly BidviaScenarioContextKey[],
): string {
  return `The ${command} command requires local execution context before it can run remotely. Missing: ${missingContext.join(', ')}.`;
}

export function buildMcpMissingContextMessage(
  toolName: string,
  missingContext: readonly BidviaScenarioContextKey[],
): string {
  return `MCP tool ${toolName} is missing required local execution context: ${missingContext.join(', ')}.`;
}
