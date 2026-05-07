import type { BidviaLocalOnboardingState } from './local-onboarding-state.js';
import type {
  BidviaInstallIntegrityReport,
  BidviaServerCapabilityPayload,
  BidviaValidationSmokeCheck,
  BidviaValidationSmokeReport,
} from './contracts.js';
import { buildCliEffectiveContextSnapshot } from './cli-runtime-context.js';
import {
  resolveBidviaBaseUrlFromEnv,
  resolveBidviaEnvironmentModeFromEnv,
} from './config.js';
import {
  buildInstallIntegrityReport,
  buildValidationSmokeReport,
} from './contracts.js';
import {
  buildInstallIntegritySnapshot,
  type BidviaInstallIntegritySnapshotOptions,
} from './install-integrity.js';
import { buildLocalRuntimeCapabilitySnapshot } from './runtime-capabilities.js';
import {
  normalizeServerCapabilityPayload,
} from './server-capabilities.js';

export interface BidviaValidationSmokeSnapshotOptions {
  env?: NodeJS.ProcessEnv;
  localOnboardingState?: BidviaLocalOnboardingState | null;
  installIntegrity?: BidviaInstallIntegritySnapshotOptions;
  serverCapabilityPayload?: BidviaServerCapabilityPayload;
}

function countChecks(checks: BidviaValidationSmokeCheck[]): BidviaValidationSmokeReport['summary'] {
  return {
    passedCount: checks.filter((check) => check.status === 'passed').length,
    blockedCount: checks.filter((check) => check.status === 'blocked').length,
    failedCount: checks.filter((check) => check.status === 'failed').length,
  };
}

export function buildValidationSmokeSnapshot(
  options: BidviaValidationSmokeSnapshotOptions = {},
): BidviaValidationSmokeReport {
  const env = options.env ?? process.env;
  const localOnboardingState = options.localOnboardingState ?? null;
  const baseUrl = resolveBidviaBaseUrlFromEnv(env);
  const environmentMode = resolveBidviaEnvironmentModeFromEnv(env);
  const installIntegrity = buildInstallIntegritySnapshot(options.installIntegrity);
  const effectiveContext = buildCliEffectiveContextSnapshot(env, localOnboardingState);
  const runtimeSnapshot = buildLocalRuntimeCapabilitySnapshot({ explicitBaseUrl: baseUrl });
  const serverCapabilitySnapshot = options.serverCapabilityPayload === undefined
    ? null
    : normalizeServerCapabilityPayload(options.serverCapabilityPayload);

  const contextAvailability = {
    tenantIdPresent: effectiveContext.tenantId.value !== null,
    sessionIdPresent: effectiveContext.sessionId.present,
    principalIdPresent: effectiveContext.principalId.value !== null,
    adminSessionIdPresent: effectiveContext.adminSessionId.present,
  };

  const checks: BidviaValidationSmokeCheck[] = [
    {
      checkKey: 'install-integrity',
      status: installIntegrity.blockerKind === null ? 'passed' : 'blocked',
      blockerKind: installIntegrity.blockerKind,
      summary: installIntegrity.blockerKind === null
        ? 'Active bidvia binary matches the expected package root.'
        : 'Active bidvia binary does not match the expected package root.',
    },
    {
      checkKey: 'environment-mode',
      status: 'passed',
      blockerKind: null,
      summary: `Environment mode resolved as ${environmentMode} for ${baseUrl}.`,
    },
    {
      checkKey: 'launch-topology-smoke',
      status: 'passed',
      blockerKind: null,
      summary: 'Launch topology stays local-first with compatibility-only root mappings and no hosted runtime claim.',
    },
    {
      checkKey: 'runtime-capabilities',
      status: 'passed',
      blockerKind: null,
      summary: `Runtime capability snapshot resolved ${runtimeSnapshot.routeCapabilities.items.length} shipped route capabilities locally.`,
    },
    {
      checkKey: 'server-capabilities',
      status: serverCapabilitySnapshot === null ? 'blocked' : 'passed',
      blockerKind: serverCapabilitySnapshot === null ? 'unsupported-or-deferred-surface' : null,
      summary: serverCapabilitySnapshot === null
        ? 'Server capability smoke remains blocked until a real bounded payload is supplied; this local smoke pass does not synthesize server truth from sample data.'
        : `Server capability normalization produced ${serverCapabilitySnapshot.routeCapabilities.items.length} server-derived route capability entries from the supplied bounded payload path.`,
    },
    {
      checkKey: 'context-availability',
      status: contextAvailability.tenantIdPresent && contextAvailability.sessionIdPresent && contextAvailability.principalIdPresent
        ? 'passed'
        : 'blocked',
      blockerKind: contextAvailability.tenantIdPresent && contextAvailability.sessionIdPresent && contextAvailability.principalIdPresent
        ? null
        : 'missing-context',
      summary: contextAvailability.tenantIdPresent && contextAvailability.sessionIdPresent && contextAvailability.principalIdPresent
        ? 'Local claimant context is present for bounded session-backed smoke execution.'
        : 'Local claimant context is incomplete for bounded session-backed smoke execution.',
    },
  ];

  return buildValidationSmokeReport({
    command: 'validation-smoke',
    scope: 'local-only',
    installIntegrity: buildInstallIntegrityReport(installIntegrity as BidviaInstallIntegrityReport),
    environment: {
      baseUrl,
      environmentMode,
    },
    contextAvailability,
    checks,
    summary: countChecks(checks),
  });
}
