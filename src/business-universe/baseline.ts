export const bidviaBusinessUniverseValidatedCanonicalCapabilities = Object.freeze([
  'claimant-prerequisite-repair',
  'mixed-missing-priority-ordering',
  'canonical-tenant-public-company-public-handoff-executable-bridge',
  'operator-only-deeper-continuation',
  'noncanonical-mixed-family-fail-close',
] as const);

export type BidviaBusinessUniverseValidatedCanonicalCapability =
  (typeof bidviaBusinessUniverseValidatedCanonicalCapabilities)[number];

export const bidviaBusinessUniverseExplicitNonGoals = Object.freeze([
  'mixed-family-universality',
  'universal-acct-to-company-public-scope-translation',
  'generalized-executable-handoff',
  'provider-proof-or-reconciliation-universality',
  'program-4-universality-claim',
] as const);

export type BidviaBusinessUniverseExplicitNonGoal =
  (typeof bidviaBusinessUniverseExplicitNonGoals)[number];

export const bidviaBusinessUniverseAcceptanceClasses = Object.freeze([
  'canonical-validated',
  'noncanonical-fail-closed',
  'bounded-stop',
  'later-wave',
  'future-wave-deferred',
] as const);

export type BidviaBusinessUniverseAcceptanceClass =
  (typeof bidviaBusinessUniverseAcceptanceClasses)[number];

export const bidviaAgentFirstMainlineWaves = Object.freeze([0, 1, 2, 3, 4] as const);
export const bidviaAgentFirstSupportWaves = Object.freeze([5, 6, 7, 8, 9] as const);

export const BIDVIA_AGENT_FIRST_STATUS_DIRECTORY =
  '.sisyphus/status/agent-first-business-universe';

export function buildAgentFirstWaveArtifactPath(wave: number | string) {
  return `${BIDVIA_AGENT_FIRST_STATUS_DIRECTORY}/wave-${String(wave)}.json`;
}
