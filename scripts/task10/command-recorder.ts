import { spawn } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';

import type { Task10CommandRow } from './contracts.js';

const PRIVATE_LOG_MODE = 0o600;
const DEFAULT_GATE_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_GATE_KILL_GRACE_MS = 5_000;
const DEFAULT_GATE_FORCE_SETTLE_MS = 1_000;
const DEFAULT_GATE_MAX_COMBINED_OUTPUT_BYTES = 16 * 1024 * 1024;
const GATE_ENV_KEYS = [
  'PATH',
  'HOME',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'CI',
  'TZ',
  'SystemRoot',
  'ComSpec',
  'PATHEXT',
  'WINDIR',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
] as const;

const TASK10_GATE_COMMANDS = [
  {
    publicCommand: 'npm test',
    command: 'npm',
    args: ['test'],
  },
  {
    publicCommand: 'npm run typecheck',
    command: 'npm',
    args: ['run', 'typecheck'],
  },
  {
    publicCommand: 'npm run build',
    command: 'npm',
    args: ['run', 'build'],
  },
  {
    publicCommand: 'npm run validate',
    command: 'npm',
    args: ['run', 'validate'],
  },
  {
    publicCommand: 'npm run validate:release-readiness',
    command: 'npm',
    args: ['run', 'validate:release-readiness'],
  },
  {
    publicCommand: 'npm run validate:release-gate',
    command: 'npm',
    args: ['run', 'validate:release-gate'],
  },
] as const;

export interface RecordTask10GateCommandsOptions {
  frozenClientRoot: string;
  privateLogRoot: string;
  forbiddenOverlapRoots: readonly string[];
}

export interface Task10GateCommandInvocation {
  command: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdoutLogPath: string;
  stderrLogPath: string;
  logMode: number;
}

export interface RecordTask10GateCommandsDependencies {
  runCommand: (invocation: Task10GateCommandInvocation) => Promise<{ exitCode: number }>;
  now: () => string;
  tempFileToken: () => string;
  commandTimeoutMs: number;
  killGraceMs: number;
  forceSettleMs: number;
  maxCombinedOutputBytes: number;
  scheduleTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
  spawnProcess: (command: string, args: readonly string[], options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    shell: false;
  }) => Task10SpawnedProcess;
}

export interface Task10SpawnedProcess {
  stdout: NodeJS.ReadableStream | null;
  stderr: NodeJS.ReadableStream | null;
  kill?(signal?: NodeJS.Signals): boolean;
  once(event: 'error', listener: (error: Error) => void): this;
  once(event: 'close', listener: (code: number | null) => void): this;
}

type NamedRoot = {
  name: string;
  value: string;
};

type SecureLogTarget = {
  fieldName: 'stdoutLogPath' | 'stderrLogPath';
  finalPath: string;
  tempPath: string;
  stream: Writable;
};

class OutputOverflowError extends Error {
  constructor() {
    super('gate command output exceeded maximum bytes');
    this.name = 'OutputOverflowError';
  }
}

export async function recordTask10GateCommands(
  options: RecordTask10GateCommandsOptions,
  dependencies: Partial<RecordTask10GateCommandsDependencies> = {},
): Promise<Task10CommandRow[]> {
  const normalizedOptions = await normalizeOptions(options);
  const resolvedDependencies = resolveDependencies(dependencies);
  const rows: Task10CommandRow[] = [];
  let failedCommand: Task10CommandRow['command'] | null = null;

  for (const [index, gate] of TASK10_GATE_COMMANDS.entries()) {
    if (failedCommand !== null) {
      const startedAt = requireCanonicalIsoUtcTimestamp(resolvedDependencies.now(), 'startedAt');
      const endedAt = requireCanonicalIsoUtcTimestamp(resolvedDependencies.now(), 'endedAt');
      requireChronologicalTimestamps(startedAt, endedAt);
      rows.push({
        command: gate.publicCommand,
        cwd: 'frozen-client-root',
        startedAt,
        endedAt,
        status: 'skipped',
        exitCode: null,
        skippedDueTo: failedCommand,
      });
      continue;
    }

    const startedAt = requireCanonicalIsoUtcTimestamp(resolvedDependencies.now(), 'startedAt');
    const logStem = buildLogStem(index, gate.publicCommand);
    const { exitCode } = await resolvedDependencies.runCommand({
      command: gate.command,
      args: gate.args,
      cwd: normalizedOptions.frozenClientRoot,
      env: buildGateEnvironment(process.env),
      shell: false,
      stdoutLogPath: path.join(normalizedOptions.privateLogRoot, `${logStem}.stdout.log`),
      stderrLogPath: path.join(normalizedOptions.privateLogRoot, `${logStem}.stderr.log`),
      logMode: PRIVATE_LOG_MODE,
    });
    const endedAt = requireCanonicalIsoUtcTimestamp(resolvedDependencies.now(), 'endedAt');
    requireChronologicalTimestamps(startedAt, endedAt);
    const normalizedExitCode = requireNonnegativeExitCode(exitCode, gate.publicCommand);

    rows.push({
      command: gate.publicCommand,
      cwd: 'frozen-client-root',
      startedAt,
      endedAt,
      status: 'executed',
      exitCode: normalizedExitCode,
      skippedDueTo: null,
    });

    if (normalizedExitCode !== 0) {
      failedCommand = gate.publicCommand;
    }
  }

  return rows;
}

function buildGateEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const gateEnv: NodeJS.ProcessEnv = {};
  for (const key of GATE_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      gateEnv[key] = value;
    }
  }
  return gateEnv;
}

function resolveDependencies(
  dependencies: Partial<RecordTask10GateCommandsDependencies>,
): RecordTask10GateCommandsDependencies {
  const spawnProcess = dependencies.spawnProcess ?? ((command, args, options) => spawn(command, [...args], options));
  const tempFileToken = dependencies.tempFileToken ?? (() => randomUUID());
  const commandTimeoutMs = dependencies.commandTimeoutMs ?? DEFAULT_GATE_TIMEOUT_MS;
  const killGraceMs = dependencies.killGraceMs ?? DEFAULT_GATE_KILL_GRACE_MS;
  const forceSettleMs = dependencies.forceSettleMs ?? DEFAULT_GATE_FORCE_SETTLE_MS;
  const maxCombinedOutputBytes = dependencies.maxCombinedOutputBytes ?? DEFAULT_GATE_MAX_COMBINED_OUTPUT_BYTES;
  const scheduleTimer = dependencies.scheduleTimer ?? setTimeout;
  const clearTimer = dependencies.clearTimer ?? clearTimeout;

  return {
    runCommand: dependencies.runCommand ?? ((invocation) => runSpawnCommandWithDependencies(invocation, {
      spawnProcess,
      tempFileToken,
      commandTimeoutMs,
      killGraceMs,
      forceSettleMs,
      maxCombinedOutputBytes,
      scheduleTimer,
      clearTimer,
    })),
    now: dependencies.now ?? (() => new Date().toISOString()),
    tempFileToken,
    commandTimeoutMs,
    killGraceMs,
    forceSettleMs,
    maxCombinedOutputBytes,
    scheduleTimer,
    clearTimer,
    spawnProcess,
  };
}

async function normalizeOptions(options: RecordTask10GateCommandsOptions): Promise<RecordTask10GateCommandsOptions> {
  const frozenClientRoot = await requireSafeRootPath(options.frozenClientRoot, 'frozenClientRoot');
  const privateLogRoot = await requireSafeRootPath(options.privateLogRoot, 'privateLogRoot');

  if (!Array.isArray(options.forbiddenOverlapRoots)) {
    throw new Error('forbiddenOverlapRoots must be an array');
  }

  const forbiddenOverlapRoots = await Promise.all(options.forbiddenOverlapRoots.map((rootPath, index) => (
    requireSafeRootPath(rootPath, `forbiddenOverlapRoots[${index}]`)
  )));

  const allRoots: NamedRoot[] = [
    { name: 'frozenClientRoot', value: frozenClientRoot },
    { name: 'privateLogRoot', value: privateLogRoot },
    ...forbiddenOverlapRoots.map((rootPath, index) => ({
      name: `forbiddenOverlapRoots[${index}]`,
      value: rootPath,
    })),
  ];

  validateDistinctRoots(allRoots);
  validateNonOverlappingRoots(allRoots);

  return {
    frozenClientRoot,
    privateLogRoot,
    forbiddenOverlapRoots,
  };
}

function requireAbsolutePath(value: string, fieldName: string): string {
  const normalizedValue = value.trim();
  if (!normalizedValue || !path.isAbsolute(normalizedValue)) {
    throw new Error(`${fieldName} must be a non-empty absolute path`);
  }
  return path.resolve(normalizedValue);
}

function validateDistinctRoots(roots: readonly NamedRoot[]): void {
  const seen = new Set<string>();
  for (const root of roots) {
    if (seen.has(root.value)) {
      throw new Error('all roots must be distinct');
    }
    seen.add(root.value);
  }
}

function validateNonOverlappingRoots(roots: readonly NamedRoot[]): void {
  for (let index = 0; index < roots.length; index += 1) {
    const left = roots[index]!;
    for (let otherIndex = index + 1; otherIndex < roots.length; otherIndex += 1) {
      const right = roots[otherIndex]!;
      if (rootsOverlap(left.value, right.value)) {
        throw new Error(buildOverlapMessage(left.name, right.name));
      }
    }
  }
}

function rootsOverlap(left: string, right: string): boolean {
  return isNestedOrSamePath(left, right) || isNestedOrSamePath(right, left);
}

function buildOverlapMessage(leftName: string, rightName: string): string {
  if (leftName === 'privateLogRoot') {
    return `privateLogRoot must not overlap ${rightName}`;
  }
  if (rightName === 'privateLogRoot') {
    return `privateLogRoot must not overlap ${leftName}`;
  }
  return `${leftName} must not overlap ${rightName}`;
}

function buildLogStem(index: number, publicCommand: Task10CommandRow['command']): string {
  return `${String(index + 1).padStart(2, '0')}-${publicCommand.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function requireNonnegativeExitCode(value: number, command: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${command} exitCode must be a nonnegative integer`);
  }
  return value;
}

async function runSpawnCommandWithDependencies(
  invocation: Task10GateCommandInvocation,
  dependencies: Pick<
    RecordTask10GateCommandsDependencies,
    | 'spawnProcess'
    | 'tempFileToken'
    | 'commandTimeoutMs'
    | 'killGraceMs'
    | 'forceSettleMs'
    | 'maxCombinedOutputBytes'
    | 'scheduleTimer'
    | 'clearTimer'
  >,
): Promise<{ exitCode: number }> {
  await mkdir(path.dirname(invocation.stdoutLogPath), { recursive: true });
  await mkdir(path.dirname(invocation.stderrLogPath), { recursive: true });
  await rejectSymlinkedPathSegments(path.dirname(invocation.stdoutLogPath), 'privateLogRoot');
  await rejectSymlinkedPathSegments(path.dirname(invocation.stderrLogPath), 'privateLogRoot');

  const stdoutLog = await createSecureLogTarget(
    invocation.stdoutLogPath,
    invocation.logMode,
    dependencies.tempFileToken(),
    'stdoutLogPath',
  );

  let stderrLog: SecureLogTarget | null = null;
  try {
    stderrLog = await createSecureLogTarget(
      invocation.stderrLogPath,
      invocation.logMode,
      dependencies.tempFileToken(),
      'stderrLogPath',
    );
  } catch (error) {
    await cleanupSecureLogTargets([stdoutLog]);
    throw error;
  }

  let child: Task10SpawnedProcess;
  try {
    child = dependencies.spawnProcess(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: invocation.env,
      shell: invocation.shell,
    });
  } catch (error) {
    await cleanupSecureLogTargets([stdoutLog, stderrLog]);
    throw normalizeError(error);
  }

  return await new Promise<{ exitCode: number }>((resolve, reject) => {
    const logTargets = [stdoutLog, stderrLog];
    const sharedOutput = { writtenBytes: 0 };
    const stdoutLimiter = createOutputLimiter(sharedOutput, dependencies.maxCombinedOutputBytes);
    const stderrLimiter = createOutputLimiter(sharedOutput, dependencies.maxCombinedOutputBytes);
    const stdoutPump = child.stdout === null
      ? Promise.resolve()
      : pipeline(child.stdout, stdoutLimiter, stdoutLog.stream);
    const stderrPump = child.stderr === null
      ? Promise.resolve()
      : pipeline(child.stderr, stderrLimiter, stderrLog.stream);
    let closeCode: number | null = null;
    let firstError: Error | null = null;
    let finalizing: Promise<void> | null = null;
    let settled = false;
    let forcedExitCode: number | null = null;
    let closeSeen = false;
    const timeoutTimer = dependencies.scheduleTimer(() => {
      beginForcedExit(124, new Error('gate command timed out'));
    }, dependencies.commandTimeoutMs);
    let killTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const rememberError = (error: unknown) => {
      if (firstError === null) {
        firstError = normalizeError(error);
      }
    };

    const clearTimers = () => {
      dependencies.clearTimer(timeoutTimer);
      if (killTimer !== null) {
        dependencies.clearTimer(killTimer);
      }
      if (settleTimer !== null) {
        dependencies.clearTimer(settleTimer);
      }
    };

    const beginForcedExit = (exitCode: number, error: Error) => {
      if (forcedExitCode !== null) {
        return;
      }
      forcedExitCode = exitCode;
      rememberError(error);
      child.kill?.('SIGTERM');
      killTimer = dependencies.scheduleTimer(() => {
        child.kill?.('SIGKILL');
      }, dependencies.killGraceMs);
      settleTimer = dependencies.scheduleTimer(() => {
        settleOnce(finalizeForcedExit);
      }, dependencies.killGraceMs + dependencies.forceSettleMs);
    };

    const settleOnce = (handler: () => Promise<void>) => {
      if (finalizing !== null) {
        return;
      }
      finalizing = handler()
        .then(() => {
          if (!settled) {
            settled = true;
            resolve({ exitCode: forcedExitCode ?? (closeCode === null ? 1 : closeCode) });
          }
        })
        .catch((error) => {
          if (!settled) {
            settled = true;
            reject(error);
          }
        });
    };

    const finalizeFailure = async () => {
      const failure = firstError ?? new Error('command recorder failed');
      clearTimers();
      unpipeReadableStream(child.stdout, stdoutLimiter);
      unpipeReadableStream(child.stderr, stderrLimiter);
      unpipeReadableStream(stdoutLimiter, stdoutLog.stream);
      unpipeReadableStream(stderrLimiter, stderrLog.stream);
      child.kill?.('SIGKILL');
      destroyReadableStream(child.stdout, failure);
      destroyReadableStream(child.stderr, failure);
      stdoutLimiter.destroy(failure);
      stderrLimiter.destroy(failure);
      stdoutLog.stream.destroy(failure);
      stderrLog.stream.destroy(failure);
      await Promise.allSettled([stdoutPump, stderrPump]);
      await cleanupSecureLogTargets(logTargets);
      throw failure;
    };

    const finalizeForcedExit = async () => {
      clearTimers();
      const failure = firstError ?? new Error('command recorder forced exit');
      unpipeReadableStream(child.stdout, stdoutLimiter);
      unpipeReadableStream(child.stderr, stderrLimiter);
      unpipeReadableStream(stdoutLimiter, stdoutLog.stream);
      unpipeReadableStream(stderrLimiter, stderrLog.stream);
      destroyReadableStream(child.stdout, failure);
      destroyReadableStream(child.stderr, failure);
      stdoutLimiter.destroy(failure);
      stderrLimiter.destroy(failure);
      await Promise.allSettled([stdoutPump, stderrPump]);
      stdoutLog.stream.end();
      stderrLog.stream.end();
      await Promise.allSettled([
        waitForWritableClose(stdoutLog.stream),
        waitForWritableClose(stderrLog.stream),
      ]);
      await assertSafeLogDestinations(logTargets);
      for (const target of logTargets) {
        await rename(target.tempPath, target.finalPath);
      }
    };

    const finalizeSuccess = async () => {
      clearTimers();
      try {
        await Promise.all([stdoutPump, stderrPump]);
        await assertSafeLogDestinations(logTargets);
        for (const target of logTargets) {
          await rename(target.tempPath, target.finalPath);
        }
      } catch (error) {
        rememberError(error);
        await finalizeFailure();
      }
    };

    child.once('error', (error) => {
      rememberError(error);
      settleOnce(finalizeFailure);
    });

    child.once('close', (code) => {
      closeSeen = true;
      closeCode = code;
      settleOnce(forcedExitCode === null ? finalizeSuccess : finalizeForcedExit);
    });

    stdoutPump.catch((error) => {
      if (isOutputOverflowError(error)) {
        beginForcedExit(125, normalizeError(error));
        if (closeSeen) {
          settleOnce(finalizeForcedExit);
        }
        return;
      }
      rememberError(error);
      settleOnce(finalizeFailure);
    });
    stderrPump.catch((error) => {
      if (isOutputOverflowError(error)) {
        beginForcedExit(125, normalizeError(error));
        if (closeSeen) {
          settleOnce(finalizeForcedExit);
        }
        return;
      }
      rememberError(error);
      settleOnce(finalizeFailure);
    });
  });
}

async function requireSafeRootPath(value: string, fieldName: string): Promise<string> {
  const normalizedPath = requireAbsolutePath(value, fieldName);
  await rejectSymlinkedPathSegments(normalizedPath, fieldName);
  return normalizedPath;
}

async function rejectSymlinkedPathSegments(candidatePath: string, fieldName: string): Promise<void> {
  const parsedPath = path.parse(candidatePath);
  let currentPath = parsedPath.root;
  const segments = candidatePath.slice(parsedPath.root.length).split(path.sep).filter(Boolean);

  for (const segment of segments) {
    currentPath = path.join(currentPath, segment);
    try {
      const entry = await lstat(currentPath);
      if (entry.isSymbolicLink()) {
        throw new Error(`${fieldName} must not include symlinked path segments`);
      }
    } catch (error) {
      if (isMissingPathError(error)) {
        return;
      }
      throw error;
    }
  }
}

function isNestedOrSamePath(parentPath: string, childPath: string): boolean {
  const relativePath = path.relative(parentPath, childPath);
  return relativePath === ''
    || ((relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`)) && !path.isAbsolute(relativePath));
}

async function createSecureLogTarget(
  finalPath: string,
  logMode: number,
  token: string,
  fieldName: 'stdoutLogPath' | 'stderrLogPath',
): Promise<SecureLogTarget> {
  requireSafeTempFileToken(token);
  const tempPath = path.join(
    path.dirname(finalPath),
    `.${path.basename(finalPath)}-${token}.tmp`,
  );
  const handle = await open(
    tempPath,
    fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_NOFOLLOW,
    logMode,
  );
  const stream = createDescriptorWritable(handle);

  return {
    fieldName,
    finalPath,
    tempPath,
    stream,
  };
}

async function assertSafeLogDestinations(targets: readonly SecureLogTarget[]): Promise<void> {
  for (const target of targets) {
    await rejectSymlinkedPathSegments(path.dirname(target.finalPath), target.fieldName);
    try {
      const entry = await lstat(target.finalPath);
      if (entry.isSymbolicLink() || !entry.isFile()) {
        throw new Error(`${target.fieldName} must not target an unsafe existing node`);
      }
    } catch (error) {
      if (isMissingPathError(error)) {
        continue;
      }
      throw error;
    }
  }
}

async function cleanupSecureLogTargets(targets: readonly SecureLogTarget[]): Promise<void> {
  await Promise.all(targets.map(async (target) => {
    target.stream.destroy();
    await rm(target.tempPath, { force: true });
  }));
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function isMissingPathError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'ENOENT';
}

function requireCanonicalIsoUtcTimestamp(value: string, fieldName: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error(`${fieldName} must be a canonical ISO UTC timestamp`);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== value) {
    throw new Error(`${fieldName} must be a canonical ISO UTC timestamp`);
  }

  return value;
}

function requireChronologicalTimestamps(startedAt: string, endedAt: string): void {
  if (Date.parse(endedAt) < Date.parse(startedAt)) {
    throw new Error('endedAt must be greater than or equal to startedAt');
  }
}

function unpipeReadableStream(
  source: NodeJS.ReadableStream | Transform | null,
  destination: NodeJS.WritableStream | Transform,
): void {
  const readable = source as (NodeJS.ReadableStream & {
    unpipe?: (target?: NodeJS.WritableStream) => void;
  }) | null;
  readable?.unpipe?.(destination as NodeJS.WritableStream);
}

function destroyReadableStream(source: NodeJS.ReadableStream | null, error: Error): void {
  const readable = source as (NodeJS.ReadableStream & {
    destroy?: (error?: Error) => void;
  }) | null;
  readable?.destroy?.(error);
}

function requireSafeTempFileToken(value: string): string {
  if (!value || value === '.' || value === '..' || value.includes('/') || value.includes('\\')) {
    throw new Error('tempFileToken must be a non-empty filename-safe token');
  }

  return value;
}

function createDescriptorWritable(handle: Awaited<ReturnType<typeof open>>): Writable {
  let closed = false;
  const closeHandle = async (): Promise<void> => {
    if (closed) {
      return;
    }
    closed = true;
    await handle.close();
  };

  return new Writable({
    write(chunk, _encoding, callback) {
      void handle.write(chunk as Uint8Array)
        .then(() => callback())
        .catch((error) => callback(normalizeError(error)));
    },
    final(callback) {
      void handle.sync()
        .then(closeHandle)
        .then(() => callback())
        .catch((error) => callback(normalizeError(error)));
    },
    destroy(error, callback) {
      void closeHandle()
        .then(() => callback(error))
        .catch((closeError) => callback(normalizeError(closeError)));
    },
  });
}

function createOutputLimiter(
  sharedState: { writtenBytes: number },
  maxCombinedOutputBytes: number,
): Transform {
  return new Transform({
    transform(chunk, _encoding, callback) {
      const bytes = chunk as Buffer;
      const remaining = maxCombinedOutputBytes - sharedState.writtenBytes;
      if (remaining <= 0) {
        callback(new OutputOverflowError());
        return;
      }
      if (bytes.byteLength > remaining) {
        sharedState.writtenBytes += remaining;
        this.push(bytes.subarray(0, remaining));
        callback(new OutputOverflowError());
        return;
      }
      sharedState.writtenBytes += bytes.byteLength;
      this.push(bytes);
      callback();
    },
  });
}

function waitForWritableClose(stream: Writable): Promise<void> {
  if (stream.destroyed || (stream.writableFinished && stream.closed)) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve, reject) => {
    stream.once('close', () => resolve());
    stream.once('error', reject);
    if (!stream.writableEnded) {
      stream.end();
    }
  });
}

function isOutputOverflowError(error: unknown): boolean {
  return error instanceof OutputOverflowError;
}
