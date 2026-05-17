import type { BidviaPublicRuntimeInterpretationReport } from './contracts.js';

export interface BidviaPublicRuntimeInterpretationProbeInput {
  baseUrl: string;
}

export interface BidviaPublicRuntimeInterpretationProbeDependencies {
  fetchImpl?: typeof fetch;
  now?: () => string;
}

function resolveFetchImplementation(fetchImpl?: typeof fetch): typeof fetch {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch !== 'function') {
    throw new Error('public-runtime-interpretation-probe requires a fetch implementation.');
  }

  return globalThis.fetch;
}

function buildProbeUrl(baseUrl: string, pathname: '/healthz' | '/readyz'): string {
  return new URL(pathname, baseUrl).toString();
}

async function readJson(
  fetchImpl: typeof fetch,
  url: string,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`public-runtime-interpretation-probe failed for ${url} with status ${response.status}.`);
  }

  const payload = await response.json() as unknown;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`public-runtime-interpretation-probe expected a JSON object from ${url}.`);
  }

  return payload as Record<string, unknown>;
}

function readStringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

export async function buildPublicRuntimeInterpretationReport(
  input: BidviaPublicRuntimeInterpretationProbeInput,
  dependencies: BidviaPublicRuntimeInterpretationProbeDependencies = {},
): Promise<BidviaPublicRuntimeInterpretationReport> {
  const fetchImpl = resolveFetchImplementation(dependencies.fetchImpl);
  const healthz = await readJson(fetchImpl, buildProbeUrl(input.baseUrl, '/healthz'));
  const readyz = await readJson(fetchImpl, buildProbeUrl(input.baseUrl, '/readyz'));

  return {
    command: 'public-runtime-interpretation-probe',
    scope: 'local-only',
    generatedAt: dependencies.now?.() ?? new Date().toISOString(),
    baseUrl: input.baseUrl,
    family: 'public-runtime-interpretation',
    proofClass: 'baseline-interpretation',
    status: 'passed',
    summary: {
      healthzStatus: readStringField(healthz, 'status'),
      readyzStatus: readStringField(readyz, 'status'),
      releaseClosureState: readStringField(healthz, 'release_closure_state'),
      terminalReleaseConvergenceState: readStringField(healthz, 'terminal_release_convergence_state'),
    },
    readbacks: {
      healthz: {
        ...healthz,
      },
      readyz: {
        ...readyz,
      },
    },
  };
}
