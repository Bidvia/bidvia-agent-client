import { getRouteCapability } from '../capabilities.js';
import { getPlaneExecutionGate } from '../plane-execution-gate.js';
import type {
  BidviaLocalCapabilityRiskTier,
  BidviaRouteCapabilityAccessContextFamily,
  BidviaScenarioContextKey,
} from '../contracts.js';
import type { BidviaExecutionIdentityContext } from './execution-session.js';

export type BidviaCapabilityExecutionKind =
  | 'public-provisional'
  | 'session-bound'
  | 'governed-read'
  | 'governed-write'
  | 'runtime-write'
  | 'commercial-action';

export type BidviaCapabilityExecutionConcurrency = 'serial' | 'concurrent';

export type BidviaCapabilityExecutionGuard = 'allow-when-context-complete' | 'block-when-context-missing';

export type BidviaCapabilityJournalDiscipline = 'shared-read-only' | 'single-writer-task-runtime';

export interface BidviaCapabilityExecutionPolicy {
  helperKey: string;
  executionKind: BidviaCapabilityExecutionKind;
  riskTier: BidviaLocalCapabilityRiskTier;
  accessContextFamily: BidviaRouteCapabilityAccessContextFamily;
  requiredContext: BidviaScenarioContextKey[];
  concurrency: BidviaCapabilityExecutionConcurrency;
  guard: BidviaCapabilityExecutionGuard;
  journalDiscipline: BidviaCapabilityJournalDiscipline;
}

export interface BidviaBlockedCapabilityExecutionResult {
  blocked: true;
  helperKey: string;
  executionKind: BidviaCapabilityExecutionKind;
  missingContext: BidviaScenarioContextKey[];
  blockedByPlaneGate: string | null;
}

export class BidviaBlockedCapabilityExecutionError extends Error {
  constructor(
    readonly policy: BidviaCapabilityExecutionPolicy,
    readonly missingContext: BidviaScenarioContextKey[],
    readonly blockedByPlaneGate: string | null,
  ) {
    super(
      missingContext.length > 0
        ? `${policy.helperKey} requires local execution context before it can run remotely. Missing: ${missingContext.join(', ')}.`
        : `${policy.helperKey} is blocked by plane execution gate ${blockedByPlaneGate} until the shared packet-grounded execution truth is frozen.`,
    );
    this.name = 'BidviaBlockedCapabilityExecutionError';
  }
}

function inferExecutionKind(helperKey: string): BidviaCapabilityExecutionKind {
  const capability = getRouteCapability(helperKey);

  if (!capability) {
    throw new Error(`Unknown capability helper key: ${helperKey}`);
  }

  if (capability.contextSemantic === 'public-provisional') {
    return 'public-provisional';
  }

  if (capability.routePathTemplate.startsWith('/runtime/commercial-actions') && capability.scope === 'write') {
    return 'commercial-action';
  }

  if (capability.accessContextFamily === 'principal-governed-read') {
    return 'governed-read';
  }

  if (capability.accessContextFamily === 'session' && capability.scope === 'write') {
    return 'session-bound';
  }

  if (capability.accessContextFamily === 'registration' && capability.scope === 'write') {
    return 'runtime-write';
  }

  if (capability.accessContextFamily === 'operator-company' && capability.scope === 'write') {
    return 'governed-write';
  }

  throw new Error(`Capability ${helperKey} does not map to a Stage 1 orchestration execution kind`);
}

export function getCapabilityExecutionPolicy(helperKey: string): BidviaCapabilityExecutionPolicy {
  const capability = getRouteCapability(helperKey);

  if (!capability) {
    throw new Error(`Unknown capability helper key: ${helperKey}`);
  }

  const executionKind = inferExecutionKind(helperKey);

  switch (executionKind) {
    case 'public-provisional':
      return {
        helperKey,
        executionKind,
        riskTier: capability.localCapabilityRiskTier,
        accessContextFamily: capability.accessContextFamily,
        requiredContext: [...capability.requiredContext],
        concurrency: 'concurrent',
        guard: 'allow-when-context-complete',
        journalDiscipline: 'shared-read-only',
      };
    case 'governed-read':
      return {
        helperKey,
        executionKind,
        riskTier: capability.localCapabilityRiskTier,
        accessContextFamily: capability.accessContextFamily,
        requiredContext: [...capability.requiredContext],
        concurrency: 'concurrent',
        guard: 'allow-when-context-complete',
        journalDiscipline: 'shared-read-only',
      };
    case 'session-bound':
    case 'governed-write':
    case 'runtime-write':
    case 'commercial-action':
      return {
        helperKey,
        executionKind,
        riskTier: capability.localCapabilityRiskTier,
        accessContextFamily: capability.accessContextFamily,
        requiredContext: [...capability.requiredContext],
        concurrency: 'serial',
        guard: 'block-when-context-missing',
        journalDiscipline: 'single-writer-task-runtime',
      };
  }
}

function collectMissingContext(
  requiredContext: readonly BidviaScenarioContextKey[],
  identity: Partial<BidviaExecutionIdentityContext>,
): BidviaScenarioContextKey[] {
  return requiredContext.filter((contextKey) => !identity[contextKey]);
}

export function buildBlockedCapabilityExecutionResult(
  error: BidviaBlockedCapabilityExecutionError,
): BidviaBlockedCapabilityExecutionResult {
  return {
    blocked: true,
    helperKey: error.policy.helperKey,
    executionKind: error.policy.executionKind,
    missingContext: [...error.missingContext],
    blockedByPlaneGate: error.blockedByPlaneGate,
  };
}

export function isBlockedCapabilityExecutionError(error: unknown): error is BidviaBlockedCapabilityExecutionError {
  return error instanceof BidviaBlockedCapabilityExecutionError;
}

export class BidviaCapabilityOrchestrator {
  private serialExecution: Promise<void> = Promise.resolve();

  constructor(private readonly identity: Partial<BidviaExecutionIdentityContext>) {}

  async call<T>(input: {
    helperKey?: string;
    call: () => Promise<T>;
  }): Promise<T> {
    if (!input.helperKey) {
      return input.call();
    }

    const policy = getCapabilityExecutionPolicy(input.helperKey);
    const missingContext = collectMissingContext(policy.requiredContext, this.identity);

    if (policy.guard === 'block-when-context-missing' && missingContext.length > 0) {
      throw new BidviaBlockedCapabilityExecutionError(policy, missingContext, null);
    }

    const executionGate = getPlaneExecutionGate(input.helperKey);

    if (executionGate?.executionTruth === 'blocked-pending-packet') {
      throw new BidviaBlockedCapabilityExecutionError(policy, [], executionGate.blockedBy);
    }

    if (policy.concurrency === 'concurrent') {
      return input.call();
    }

    return this.runSerial(input.call);
  }

  private async runSerial<T>(call: () => Promise<T>): Promise<T> {
    const previousExecution = this.serialExecution;
    let release!: () => void;

    this.serialExecution = new Promise<void>((resolve) => {
      release = resolve;
    });

    await previousExecution;

    try {
      return await call();
    } finally {
      release();
    }
  }
}

export function createCapabilityOrchestrator(
  identity: Partial<BidviaExecutionIdentityContext>,
): BidviaCapabilityOrchestrator {
  return new BidviaCapabilityOrchestrator(identity);
}
