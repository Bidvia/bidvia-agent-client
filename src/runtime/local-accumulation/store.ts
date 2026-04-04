import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import type { BidviaTaskHandleStatus } from '../execution-session.js';

export interface BidviaLocalOnboardingMemoryFact {
  key: string;
  value: string;
  recordedAt: string;
}

export interface BidviaLocalOnboardingMemory {
  scope: 'local-onboarding-memory';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  sessionRef: string;
  facts: BidviaLocalOnboardingMemoryFact[];
  updatedAt: string;
}

export interface BidviaLocalTaskExecutionAttempt {
  attempt: number;
  status: BidviaTaskHandleStatus;
  recordedAt: string;
}

export interface BidviaLocalTaskExecutionProgressMarker {
  marker: string;
  recordedAt: string;
  detail?: string;
}

export interface BidviaLocalTaskExecutionMemory {
  scope: 'local-task-execution-memory';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  sessionRef: string;
  localTaskRef: string;
  taskDispatchId: string;
  attempts: BidviaLocalTaskExecutionAttempt[];
  progressMarkers: BidviaLocalTaskExecutionProgressMarker[];
  updatedAt: string;
}

export interface BidviaLocalCapabilityUsageRecord {
  helperKey: string;
  recordedAt: string;
  outcome: 'succeeded';
  detail?: string;
}

export interface BidviaLocalCapabilityBlockedAttempt {
  helperKey: string;
  recordedAt: string;
  executionKind: string;
  missingContext: string[];
  detail?: string;
}

export interface BidviaLocalCapabilityEntry {
  capabilityKey: string;
  usage: BidviaLocalCapabilityUsageRecord[];
  blockedAttempts: BidviaLocalCapabilityBlockedAttempt[];
}

export interface BidviaLocalCapabilityUsageMemory {
  scope: 'local-capability-usage-memory';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  sessionRef: string;
  localTaskRef: string;
  capabilities: BidviaLocalCapabilityEntry[];
  updatedAt: string;
}

export interface BidviaLocalResultRecord {
  resultRef: string;
  kind: string;
  terminalState: 'complete' | 'fail';
  commitState: 'staged' | 'committed';
  outcomeRef?: string;
  recordedAt: string;
  detail?: string;
}

export interface BidviaLocalResultMemory {
  scope: 'local-result-memory';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  sessionRef: string;
  localTaskRef: string;
  taskDispatchId: string;
  results: BidviaLocalResultRecord[];
  updatedAt: string;
}

export interface BidviaLocalAccumulation {
  scope: 'local-accumulation';
  locality: 'local-only';
  authority: 'non-authoritative-cache';
  onboardingMemory: BidviaLocalOnboardingMemory;
  taskExecutionMemory: BidviaLocalTaskExecutionMemory;
  capabilityUsageMemory: BidviaLocalCapabilityUsageMemory;
  resultMemory: BidviaLocalResultMemory;
}

export interface ResolveLocalAccumulationPathOptions {
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

export interface LocalAccumulationIoOptions extends ResolveLocalAccumulationPathOptions {
  path?: string;
}

export interface WriteLocalAccumulationResult {
  path: string;
  accumulation: BidviaLocalAccumulation;
}

export interface ClearLocalAccumulationResult {
  path: string;
  cleared: true;
  removedPaths: string[];
}

const onboardingMemoryFileName = 'onboarding-memory.json';
const taskExecutionMemoryFileName = 'task-execution-memory.json';
const capabilityUsageMemoryFileName = 'capability-usage-memory.json';
const resultMemoryFileName = 'result-memory.json';

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isOnboardingFact(value: unknown): value is BidviaLocalOnboardingMemoryFact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.key)
    && isString(candidate.value)
    && isString(candidate.recordedAt);
}

function isTaskExecutionAttempt(value: unknown): value is BidviaLocalTaskExecutionAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return typeof candidate.attempt === 'number'
    && isString(candidate.status)
    && isString(candidate.recordedAt);
}

function isTaskExecutionProgressMarker(value: unknown): value is BidviaLocalTaskExecutionProgressMarker {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.marker)
    && isString(candidate.recordedAt)
    && isOptionalString(candidate.detail);
}

function isCapabilityUsageRecord(value: unknown): value is BidviaLocalCapabilityUsageRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.helperKey)
    && isString(candidate.recordedAt)
    && candidate.outcome === 'succeeded'
    && isOptionalString(candidate.detail);
}

function isCapabilityBlockedAttempt(value: unknown): value is BidviaLocalCapabilityBlockedAttempt {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.helperKey)
    && isString(candidate.recordedAt)
    && isString(candidate.executionKind)
    && isStringArray(candidate.missingContext)
    && isOptionalString(candidate.detail);
}

function isCapabilityEntry(value: unknown): value is BidviaLocalCapabilityEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.capabilityKey)
    && Array.isArray(candidate.usage)
    && candidate.usage.every(isCapabilityUsageRecord)
    && Array.isArray(candidate.blockedAttempts)
    && candidate.blockedAttempts.every(isCapabilityBlockedAttempt);
}

function isResultRecord(value: unknown): value is BidviaLocalResultRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return isString(candidate.resultRef)
    && isString(candidate.kind)
    && (candidate.terminalState === 'complete' || candidate.terminalState === 'fail')
    && (candidate.commitState === 'staged' || candidate.commitState === 'committed')
    && isOptionalString(candidate.outcomeRef)
    && isString(candidate.recordedAt)
    && isOptionalString(candidate.detail);
}

function isOnboardingMemory(value: unknown): value is BidviaLocalOnboardingMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.scope === 'local-onboarding-memory'
    && candidate.locality === 'local-only'
    && candidate.authority === 'non-authoritative-cache'
    && isString(candidate.sessionRef)
    && Array.isArray(candidate.facts)
    && candidate.facts.every(isOnboardingFact)
    && isString(candidate.updatedAt);
}

function isTaskExecutionMemory(value: unknown): value is BidviaLocalTaskExecutionMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.scope === 'local-task-execution-memory'
    && candidate.locality === 'local-only'
    && candidate.authority === 'non-authoritative-cache'
    && isString(candidate.sessionRef)
    && isString(candidate.localTaskRef)
    && isString(candidate.taskDispatchId)
    && Array.isArray(candidate.attempts)
    && candidate.attempts.every(isTaskExecutionAttempt)
    && Array.isArray(candidate.progressMarkers)
    && candidate.progressMarkers.every(isTaskExecutionProgressMarker)
    && isString(candidate.updatedAt);
}

function isCapabilityUsageMemory(value: unknown): value is BidviaLocalCapabilityUsageMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.scope === 'local-capability-usage-memory'
    && candidate.locality === 'local-only'
    && candidate.authority === 'non-authoritative-cache'
    && isString(candidate.sessionRef)
    && isString(candidate.localTaskRef)
    && Array.isArray(candidate.capabilities)
    && candidate.capabilities.every(isCapabilityEntry)
    && isString(candidate.updatedAt);
}

function isResultMemory(value: unknown): value is BidviaLocalResultMemory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.scope === 'local-result-memory'
    && candidate.locality === 'local-only'
    && candidate.authority === 'non-authoritative-cache'
    && isString(candidate.sessionRef)
    && isString(candidate.localTaskRef)
    && isString(candidate.taskDispatchId)
    && Array.isArray(candidate.results)
    && candidate.results.every(isResultRecord)
    && isString(candidate.updatedAt);
}

function buildPersistedOnboardingMemory(memory: BidviaLocalOnboardingMemory): BidviaLocalOnboardingMemory {
  return {
    scope: 'local-onboarding-memory',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: memory.sessionRef,
    facts: memory.facts.map((fact) => ({
      key: fact.key,
      value: fact.value,
      recordedAt: fact.recordedAt,
    })),
    updatedAt: memory.updatedAt,
  };
}

function buildPersistedTaskExecutionMemory(memory: BidviaLocalTaskExecutionMemory): BidviaLocalTaskExecutionMemory {
  return {
    scope: 'local-task-execution-memory',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: memory.sessionRef,
    localTaskRef: memory.localTaskRef,
    taskDispatchId: memory.taskDispatchId,
    attempts: memory.attempts.map((attempt) => ({
      attempt: attempt.attempt,
      status: attempt.status,
      recordedAt: attempt.recordedAt,
    })),
    progressMarkers: memory.progressMarkers.map((marker) => ({
      marker: marker.marker,
      recordedAt: marker.recordedAt,
      ...(marker.detail === undefined ? {} : { detail: marker.detail }),
    })),
    updatedAt: memory.updatedAt,
  };
}

function buildPersistedCapabilityUsageMemory(memory: BidviaLocalCapabilityUsageMemory): BidviaLocalCapabilityUsageMemory {
  return {
    scope: 'local-capability-usage-memory',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: memory.sessionRef,
    localTaskRef: memory.localTaskRef,
    capabilities: memory.capabilities.map((capability) => ({
      capabilityKey: capability.capabilityKey,
      usage: capability.usage.map((record) => ({
        helperKey: record.helperKey,
        recordedAt: record.recordedAt,
        outcome: 'succeeded',
        ...(record.detail === undefined ? {} : { detail: record.detail }),
      })),
      blockedAttempts: capability.blockedAttempts.map((attempt) => ({
        helperKey: attempt.helperKey,
        recordedAt: attempt.recordedAt,
        executionKind: attempt.executionKind,
        missingContext: [...attempt.missingContext],
        ...(attempt.detail === undefined ? {} : { detail: attempt.detail }),
      })),
    })),
    updatedAt: memory.updatedAt,
  };
}

function buildPersistedResultMemory(memory: BidviaLocalResultMemory): BidviaLocalResultMemory {
  return {
    scope: 'local-result-memory',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    sessionRef: memory.sessionRef,
    localTaskRef: memory.localTaskRef,
    taskDispatchId: memory.taskDispatchId,
    results: memory.results.map((result) => ({
      resultRef: result.resultRef,
      kind: result.kind,
      terminalState: result.terminalState,
      commitState: result.commitState,
      ...(result.outcomeRef === undefined ? {} : { outcomeRef: result.outcomeRef }),
      recordedAt: result.recordedAt,
      ...(result.detail === undefined ? {} : { detail: result.detail }),
    })),
    updatedAt: memory.updatedAt,
  };
}

function buildPersistedLocalAccumulation(accumulation: Omit<BidviaLocalAccumulation, 'scope' | 'locality' | 'authority'>): BidviaLocalAccumulation {
  return {
    scope: 'local-accumulation',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    onboardingMemory: buildPersistedOnboardingMemory(accumulation.onboardingMemory),
    taskExecutionMemory: buildPersistedTaskExecutionMemory(accumulation.taskExecutionMemory),
    capabilityUsageMemory: buildPersistedCapabilityUsageMemory(accumulation.capabilityUsageMemory),
    resultMemory: buildPersistedResultMemory(accumulation.resultMemory),
  };
}

function resolveLocalAccumulationIoPath(options: LocalAccumulationIoOptions = {}): string {
  return options.path ?? resolveLocalAccumulationPath(options);
}

function buildAccumulationFilePaths(accumulationPath: string) {
  return {
    onboardingMemoryPath: path.join(accumulationPath, onboardingMemoryFileName),
    taskExecutionMemoryPath: path.join(accumulationPath, taskExecutionMemoryFileName),
    capabilityUsageMemoryPath: path.join(accumulationPath, capabilityUsageMemoryFileName),
    resultMemoryPath: path.join(accumulationPath, resultMemoryFileName),
  };
}

async function readJsonFile(filePath: string): Promise<unknown | null> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    if (error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
}

async function removeFileIfPresent(filePath: string): Promise<boolean> {
  try {
    await rm(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

export function resolveLocalAccumulationPath(
  options: ResolveLocalAccumulationPathOptions = {},
): string {
  const env = options.env ?? process.env;

  if (env.BIDVIA_LOCAL_ACCUMULATION_PATH) {
    return env.BIDVIA_LOCAL_ACCUMULATION_PATH;
  }

  return path.join(options.homeDirectory ?? homedir(), '.bidvia', 'runtime', 'local-accumulation');
}

export async function readLocalAccumulation(
  options: LocalAccumulationIoOptions = {},
): Promise<BidviaLocalAccumulation | null> {
  const accumulationPath = resolveLocalAccumulationIoPath(options);
  const filePaths = buildAccumulationFilePaths(accumulationPath);
  const [onboardingMemory, taskExecutionMemory, capabilityUsageMemory, resultMemory] = await Promise.all([
    readJsonFile(filePaths.onboardingMemoryPath),
    readJsonFile(filePaths.taskExecutionMemoryPath),
    readJsonFile(filePaths.capabilityUsageMemoryPath),
    readJsonFile(filePaths.resultMemoryPath),
  ]);

  if (
    onboardingMemory === null
    && taskExecutionMemory === null
    && capabilityUsageMemory === null
    && resultMemory === null
  ) {
    return null;
  }

  if (
    !isOnboardingMemory(onboardingMemory)
    || !isTaskExecutionMemory(taskExecutionMemory)
    || !isCapabilityUsageMemory(capabilityUsageMemory)
    || !isResultMemory(resultMemory)
  ) {
    return null;
  }

  return {
    scope: 'local-accumulation',
    locality: 'local-only',
    authority: 'non-authoritative-cache',
    onboardingMemory,
    taskExecutionMemory,
    capabilityUsageMemory,
    resultMemory,
  };
}

export async function writeLocalAccumulation(
  accumulation: Omit<BidviaLocalAccumulation, 'scope' | 'locality' | 'authority'>,
  options: LocalAccumulationIoOptions = {},
): Promise<WriteLocalAccumulationResult> {
  const accumulationPath = resolveLocalAccumulationIoPath(options);
  const filePaths = buildAccumulationFilePaths(accumulationPath);
  const persistedAccumulation = buildPersistedLocalAccumulation(accumulation);

  await mkdir(accumulationPath, { recursive: true });
  await Promise.all([
    writeFile(filePaths.onboardingMemoryPath, JSON.stringify(persistedAccumulation.onboardingMemory, null, 2), 'utf8'),
    writeFile(filePaths.taskExecutionMemoryPath, JSON.stringify(persistedAccumulation.taskExecutionMemory, null, 2), 'utf8'),
    writeFile(filePaths.capabilityUsageMemoryPath, JSON.stringify(persistedAccumulation.capabilityUsageMemory, null, 2), 'utf8'),
    writeFile(filePaths.resultMemoryPath, JSON.stringify(persistedAccumulation.resultMemory, null, 2), 'utf8'),
  ]);

  return {
    path: accumulationPath,
    accumulation: persistedAccumulation,
  };
}

export async function clearLocalAccumulation(
  options: LocalAccumulationIoOptions = {},
): Promise<ClearLocalAccumulationResult> {
  const accumulationPath = resolveLocalAccumulationIoPath(options);
  const filePaths = buildAccumulationFilePaths(accumulationPath);
  const removedPaths: string[] = [];

  if (await removeFileIfPresent(filePaths.onboardingMemoryPath)) {
    removedPaths.push(filePaths.onboardingMemoryPath);
  }

  if (await removeFileIfPresent(filePaths.taskExecutionMemoryPath)) {
    removedPaths.push(filePaths.taskExecutionMemoryPath);
  }

  if (await removeFileIfPresent(filePaths.capabilityUsageMemoryPath)) {
    removedPaths.push(filePaths.capabilityUsageMemoryPath);
  }

  if (await removeFileIfPresent(filePaths.resultMemoryPath)) {
    removedPaths.push(filePaths.resultMemoryPath);
  }

  return {
    path: accumulationPath,
    cleared: true,
    removedPaths,
  };
}
