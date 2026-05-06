import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    | 'role-collaboration-handoff'
    | 'continuous-task-governed-work-closure'
    | 'commercial-and-integration-readback';
  lane: 'default-local-docker';
  status: 'passed' | 'blocked' | 'failed';
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
    blockedScenarioKeys: string[];
    failedScenarioKeys: string[];
  };
}

interface RunClientBoundedMatrixOptions {
  baseUrl: string;
}

interface RunClientBoundedMatrixDependencies {
  fetchImpl?: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: () => string;
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

  return {
    baseUrl: baseUrl.trim(),
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
  blockedBy: string[],
  notes: string[],
): BoundedMatrixScenarioEvidence {
  return {
    scenarioKey,
    lane: 'default-local-docker',
    status: 'blocked',
    blockedBy,
    notes,
    returnedIds: {},
    readbacks: {},
  };
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
    buildBlockedScenario(
      'platform-managed-onboarding',
      [...claimantContext.missingFields, 'valid_invitation_or_bootstrap_input'],
      [
        'This scenario requires self-bootstrap or provided claimant credentials plus invitation/bootstrap inputs that are not available from the current shell alone.',
      ],
    ),
    buildBlockedScenario(
      'dispatch-ready-progression',
      claimantContext.missingFields,
      [
        'This scenario requires claimant account-plane context and runtime-generated claimed-agent identifiers to verify task-write-ready and dispatch-eligibility truth.',
      ],
    ),
    buildBlockedScenario(
      'role-collaboration-handoff',
      [...new Set([...claimantContext.missingFields, ...adminContext.missingFields])],
      [
        'This scenario requires claimant plus operator/admin context and runtime-generated handoff identifiers for the approval-to-opportunity seam.',
      ],
    ),
    buildBlockedScenario(
      'continuous-task-governed-work-closure',
      claimantContext.missingFields,
      [
        'This scenario requires claimant context plus fresh runtime-generated task-dispatch identifiers to verify bounded governed-work closure.',
      ],
    ),
    buildBlockedScenario(
      'commercial-and-integration-readback',
      [...new Set([...claimantContext.missingFields, ...adminContext.missingFields])],
      [
        'This scenario requires governed claimant/operator identifiers for commercial-action status or integration ownership readback, which are not derivable from the current shell alone.',
      ],
    ),
  ];

  const blockedScenarioKeys = scenarios
    .filter((scenario) => scenario.status === 'blocked')
    .map((scenario) => scenario.scenarioKey);
  const failedScenarioKeys = scenarios
    .filter((scenario) => scenario.status === 'failed')
    .map((scenario) => scenario.scenarioKey);

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
  await writeFile(normalizedOutputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  return {
    outputPath: normalizedOutputPath,
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseVerifyClientBoundedMatrixArgs(argv);
  const evidence = await runClientBoundedMatrix({
    baseUrl: args.baseUrl,
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
