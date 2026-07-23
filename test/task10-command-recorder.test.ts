import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

import { recordTask10GateCommands } from '../scripts/task10/command-recorder.ts';
import type { Task10CommandRow } from '../scripts/task10/contracts.ts';

const SUCCESS_EXIT_CODES = [0, 0, 0, 0, 0, 0] as const;

type Invocation = {
  command: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  shell: false;
  stdoutLogPath: string;
  stderrLogPath: string;
  logMode: number;
};

function buildOptions(overrides: Partial<{
  frozenClientRoot: string;
  privateLogRoot: string;
  forbiddenOverlapRoots: readonly string[];
}> = {}) {
  return {
    frozenClientRoot: '/task10/frozen-client',
    privateLogRoot: '/task10/private-logs',
    forbiddenOverlapRoots: [
      '/task10/repositories/core-runtime',
      '/task10/repositories/site-validation',
      '/task10/repositories/core-evidence',
      '/task10/producer-input',
      '/task10/producer-output',
      '/task10/publication',
    ],
    ...overrides,
  };
}

function createNowStub(values: readonly string[]): () => string {
  let index = 0;
  return () => {
    const value = values[index];
    if (!value) {
      throw new Error(`missing now() value at index ${index}`);
    }
    index += 1;
    return value;
  };
}

function createRunCommandStub(exitCodes: readonly number[]) {
  const invocations: Invocation[] = [];
  let index = 0;

  return {
    invocations,
    async runCommand(invocation: Invocation): Promise<{ exitCode: number }> {
      invocations.push(invocation);
      const exitCode = exitCodes[index];
      if (exitCode === undefined) {
        throw new Error(`missing exit code at index ${index}`);
      }
      index += 1;
      return { exitCode };
    },
  };
}

function createFakeChild(): PassThrough & {
  stdout: PassThrough;
  stderr: PassThrough;
  killCalls: number;
  kill(): boolean;
} {
  const child = new PassThrough() as PassThrough & {
    stdout: PassThrough;
    stderr: PassThrough;
    killCalls: number;
    kill(): boolean;
  };

  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killCalls = 0;
  child.kill = () => {
    child.killCalls += 1;
    return true;
  };

  return child;
}

function buildIsolatedOptions(tempRoot: string, overrides: Partial<{
  frozenClientRoot: string;
  privateLogRoot: string;
  forbiddenOverlapRoots: readonly string[];
}> = {}) {
  return buildOptions({
    frozenClientRoot: path.join(tempRoot, 'frozen-client'),
    privateLogRoot: path.join(tempRoot, 'private-logs'),
    forbiddenOverlapRoots: [
      path.join(tempRoot, 'core-runtime'),
      path.join(tempRoot, 'site-validation'),
      path.join(tempRoot, 'core-evidence'),
      path.join(tempRoot, 'producer-input'),
      path.join(tempRoot, 'producer-output'),
      path.join(tempRoot, 'publication'),
    ],
    ...overrides,
  });
}

function createImmediateTimerControls() {
  const cancelled = new Set<object>();
  return {
    scheduleTimer(callback: () => void, _delayMs: number) {
      const handle = {};
      queueMicrotask(() => {
        if (!cancelled.has(handle)) {
          callback();
        }
      });
      return handle as ReturnType<typeof setTimeout>;
    },
    clearTimer(handle: ReturnType<typeof setTimeout>) {
      cancelled.add(handle as object);
    },
  };
}

test('recordTask10GateCommands executes the six required gates in order and records exact timestamps and exits', async () => {
  const { invocations, runCommand } = createRunCommandStub(SUCCESS_EXIT_CODES);
  const rows = await recordTask10GateCommands(buildOptions(), {
    runCommand,
    now: createNowStub([
      '2026-07-19T08:00:00.000Z',
      '2026-07-19T08:00:01.000Z',
      '2026-07-19T08:00:02.000Z',
      '2026-07-19T08:00:03.000Z',
      '2026-07-19T08:00:04.000Z',
      '2026-07-19T08:00:05.000Z',
      '2026-07-19T08:00:06.000Z',
      '2026-07-19T08:00:07.000Z',
      '2026-07-19T08:00:08.000Z',
      '2026-07-19T08:00:09.000Z',
      '2026-07-19T08:00:10.000Z',
      '2026-07-19T08:00:11.000Z',
    ]),
  });

  assert.deepEqual(rows, [
    {
      command: 'npm test',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:00.000Z',
      endedAt: '2026-07-19T08:00:01.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
    {
      command: 'npm run typecheck',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:02.000Z',
      endedAt: '2026-07-19T08:00:03.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
    {
      command: 'npm run build',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:04.000Z',
      endedAt: '2026-07-19T08:00:05.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
    {
      command: 'npm run validate',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:06.000Z',
      endedAt: '2026-07-19T08:00:07.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
    {
      command: 'npm run validate:release-readiness',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:08.000Z',
      endedAt: '2026-07-19T08:00:09.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
    {
      command: 'npm run validate:release-gate',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T08:00:10.000Z',
      endedAt: '2026-07-19T08:00:11.000Z',
      status: 'executed',
      exitCode: 0,
      skippedDueTo: null,
    },
  ] satisfies Task10CommandRow[]);

  assert.deepEqual(invocations.map((invocation) => [invocation.command, [...invocation.args]]), [
    ['npm', ['test']],
    ['npm', ['run', 'typecheck']],
    ['npm', ['run', 'build']],
    ['npm', ['run', 'validate']],
    ['npm', ['run', 'validate:release-readiness']],
    ['npm', ['run', 'validate:release-gate']],
  ]);
});

test('recordTask10GateCommands stops spawning after the first nonzero exit and marks later gates skipped', async () => {
  const { invocations, runCommand } = createRunCommandStub([0, 0, 2]);
  const rows = await recordTask10GateCommands(buildOptions(), {
    runCommand,
    now: createNowStub([
      '2026-07-19T09:00:00.000Z',
      '2026-07-19T09:00:01.000Z',
      '2026-07-19T09:00:02.000Z',
      '2026-07-19T09:00:03.000Z',
      '2026-07-19T09:00:04.000Z',
      '2026-07-19T09:00:05.000Z',
      '2026-07-19T09:00:06.000Z',
      '2026-07-19T09:00:06.000Z',
      '2026-07-19T09:00:07.000Z',
      '2026-07-19T09:00:07.000Z',
      '2026-07-19T09:00:08.000Z',
      '2026-07-19T09:00:08.000Z',
    ]),
  });

  assert.equal(invocations.length, 3);
  assert.equal(rows[2]?.exitCode, 2);
  assert.deepEqual(rows.slice(3), [
    {
      command: 'npm run validate',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T09:00:06.000Z',
      endedAt: '2026-07-19T09:00:06.000Z',
      status: 'skipped',
      exitCode: null,
      skippedDueTo: 'npm run build',
    },
    {
      command: 'npm run validate:release-readiness',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T09:00:07.000Z',
      endedAt: '2026-07-19T09:00:07.000Z',
      status: 'skipped',
      exitCode: null,
      skippedDueTo: 'npm run build',
    },
    {
      command: 'npm run validate:release-gate',
      cwd: 'frozen-client-root',
      startedAt: '2026-07-19T09:00:08.000Z',
      endedAt: '2026-07-19T09:00:08.000Z',
      status: 'skipped',
      exitCode: null,
      skippedDueTo: 'npm run build',
    },
  ] satisfies Task10CommandRow[]);
});

test('recordTask10GateCommands passes frozen cwd shell false private logs and a secret-free tool environment', async () => {
  const options = buildOptions();
  const { invocations, runCommand } = createRunCommandStub(SUCCESS_EXIT_CODES);
  const originalSecret = process.env.TASK10_TEST_BOUNDARY_SECRET;
  const originalToken = process.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN;
  process.env.TASK10_TEST_BOUNDARY_SECRET = 'boundary-secret';
  process.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN = 'rehearsal-token';

  try {
    await recordTask10GateCommands(options, {
      runCommand,
      now: createNowStub([
        '2026-07-19T10:00:00.000Z',
        '2026-07-19T10:00:01.000Z',
        '2026-07-19T10:00:02.000Z',
        '2026-07-19T10:00:03.000Z',
        '2026-07-19T10:00:04.000Z',
        '2026-07-19T10:00:05.000Z',
        '2026-07-19T10:00:06.000Z',
        '2026-07-19T10:00:07.000Z',
        '2026-07-19T10:00:08.000Z',
        '2026-07-19T10:00:09.000Z',
        '2026-07-19T10:00:10.000Z',
        '2026-07-19T10:00:11.000Z',
      ]),
    });

    for (const invocation of invocations) {
      assert.equal(invocation.cwd, options.frozenClientRoot);
      assert.equal(invocation.shell, false);
      assert.equal(invocation.logMode, 0o600);
      assert.notEqual(invocation.env, process.env);
      assert.equal(invocation.env.PATH, process.env.PATH);
      assert.equal(invocation.env.HOME, process.env.HOME);
      assert.equal(invocation.env.TASK10_TEST_BOUNDARY_SECRET, undefined);
      assert.equal(invocation.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN, undefined);
      assert.equal(path.dirname(invocation.stdoutLogPath), options.privateLogRoot);
      assert.equal(path.dirname(invocation.stderrLogPath), options.privateLogRoot);
      assert.match(path.basename(invocation.stdoutLogPath), /^\d{2}-.*\.stdout\.log$/);
      assert.match(path.basename(invocation.stderrLogPath), /^\d{2}-.*\.stderr\.log$/);
    }
  } finally {
    if (originalSecret === undefined) {
      delete process.env.TASK10_TEST_BOUNDARY_SECRET;
    } else {
      process.env.TASK10_TEST_BOUNDARY_SECRET = originalSecret;
    }
    if (originalToken === undefined) {
      delete process.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN;
    } else {
      process.env.BIDVIA_MERGED_MAIN_REHEARSAL_TOKEN = originalToken;
    }
  }
});

test('recordTask10GateCommands default runner atomically replaces existing permissive logs with fresh 0600 files after successful drain', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const privateLogRoot = path.join(tempRoot, 'private-logs');
  const stdoutLogPath = path.join(privateLogRoot, '01-npm-test.stdout.log');
  const stderrLogPath = path.join(privateLogRoot, '01-npm-test.stderr.log');

  await mkdir(privateLogRoot, { recursive: true });
  await writeFile(stdoutLogPath, 'existing stdout\n', { mode: 0o644 });
  await writeFile(stderrLogPath, 'existing stderr\n', { mode: 0o644 });

  try {
    await recordTask10GateCommands(buildIsolatedOptions(tempRoot, {
      privateLogRoot,
    }), {
      now: createNowStub([
        '2026-07-19T12:30:00.000Z',
        '2026-07-19T12:30:01.000Z',
        '2026-07-19T12:30:02.000Z',
        '2026-07-19T12:30:02.000Z',
        '2026-07-19T12:30:03.000Z',
        '2026-07-19T12:30:03.000Z',
        '2026-07-19T12:30:04.000Z',
        '2026-07-19T12:30:04.000Z',
        '2026-07-19T12:30:05.000Z',
        '2026-07-19T12:30:05.000Z',
        '2026-07-19T12:30:06.000Z',
        '2026-07-19T12:30:06.000Z',
      ]),
      spawnProcess() {
        const child = createFakeChild();
        queueMicrotask(() => {
          child.stdout.end('simulated stdout\n');
          child.stderr.end('simulated stderr\n');
          child.emit('close', 1);
        });
        return child;
      },
    });

    assert.equal(await readFile(stdoutLogPath, 'utf8'), 'simulated stdout\n');
    assert.equal(await readFile(stderrLogPath, 'utf8'), 'simulated stderr\n');
    assert.equal(statSync(stdoutLogPath).mode & 0o777, 0o600);
    assert.equal(statSync(stderrLogPath).mode & 0o777, 0o600);
    assert.deepEqual((await readdir(privateLogRoot)).sort(), [
      '01-npm-test.stderr.log',
      '01-npm-test.stdout.log',
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects filesystem-root overlap and symlinked privateLogRoot aliases', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const realPrivateLogRoot = path.join(tempRoot, 'real-private-logs');
  const aliasedPrivateLogRoot = path.join(tempRoot, 'aliased-private-logs');

  await mkdir(realPrivateLogRoot, { recursive: true });
  await symlink(realPrivateLogRoot, aliasedPrivateLogRoot);

  try {
    await assert.rejects(
      recordTask10GateCommands(buildOptions({ forbiddenOverlapRoots: ['/'] }), {
        runCommand: async () => ({ exitCode: 0 }),
        now: () => '2026-07-19T12:45:00.000Z',
      }),
      /(frozenClientRoot|privateLogRoot) must not overlap forbiddenOverlapRoots\[0\]/,
    );

    await assert.rejects(
      recordTask10GateCommands(buildIsolatedOptions(tempRoot, {
        privateLogRoot: aliasedPrivateLogRoot,
      }), {
        runCommand: async () => ({ exitCode: 0 }),
        now: () => '2026-07-19T12:45:00.000Z',
      }),
      /privateLogRoot must not include symlinked path segments/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands treats child paths with ..-prefixed segment names as overlapping descendants', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));

  try {
    await assert.rejects(
      recordTask10GateCommands(buildIsolatedOptions(tempRoot, {
        privateLogRoot: path.join(tempRoot, 'shared-root', '..logs'),
        forbiddenOverlapRoots: [
          path.join(tempRoot, 'shared-root'),
          path.join(tempRoot, 'site-validation'),
          path.join(tempRoot, 'core-evidence'),
          path.join(tempRoot, 'producer-input'),
          path.join(tempRoot, 'producer-output'),
          path.join(tempRoot, 'publication'),
        ],
      }), {
        runCommand: async () => ({ exitCode: 0 }),
        now: () => '2026-07-19T12:46:00.000Z',
      }),
      /privateLogRoot must not overlap forbiddenOverlapRoots\[0\]/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects symlinked frozenClientRoot and forbiddenOverlapRoots aliases', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const realFrozenRoot = path.join(tempRoot, 'real-frozen-client');
  const aliasedFrozenRoot = path.join(tempRoot, 'aliased-frozen-client');
  const realForbiddenRoot = path.join(tempRoot, 'real-producer-output');
  const aliasedForbiddenRoot = path.join(tempRoot, 'aliased-producer-output');

  await mkdir(realFrozenRoot, { recursive: true });
  await mkdir(realForbiddenRoot, { recursive: true });
  await symlink(realFrozenRoot, aliasedFrozenRoot);
  await symlink(realForbiddenRoot, aliasedForbiddenRoot);

  try {
    await assert.rejects(
      recordTask10GateCommands(buildIsolatedOptions(tempRoot, {
        frozenClientRoot: aliasedFrozenRoot,
      }), {
        runCommand: async () => ({ exitCode: 0 }),
        now: () => '2026-07-19T12:47:00.000Z',
      }),
      /frozenClientRoot must not include symlinked path segments/,
    );

    await assert.rejects(
      recordTask10GateCommands(buildIsolatedOptions(tempRoot, {
        forbiddenOverlapRoots: [
          path.join(tempRoot, 'core-runtime'),
          path.join(tempRoot, 'site-validation'),
          path.join(tempRoot, 'core-evidence'),
          path.join(tempRoot, 'producer-input'),
          aliasedForbiddenRoot,
          path.join(tempRoot, 'publication'),
        ],
      }), {
        runCommand: async () => ({ exitCode: 0 }),
        now: () => '2026-07-19T12:47:00.000Z',
      }),
      /forbiddenOverlapRoots\[4\] must not include symlinked path segments/,
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects unsafe existing symlink log aliases without touching their targets', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);
  const stdoutTargetPath = path.join(tempRoot, 'stdout-target.log');
  const stdoutLogPath = path.join(options.privateLogRoot, '01-npm-test.stdout.log');
  const stderrLogPath = path.join(options.privateLogRoot, '01-npm-test.stderr.log');

  await mkdir(options.privateLogRoot, { recursive: true });
  await writeFile(stdoutTargetPath, 'do not replace\n', { mode: 0o600 });
  await symlink(stdoutTargetPath, stdoutLogPath);
  await writeFile(stderrLogPath, 'safe regular file\n', { mode: 0o600 });

  try {
    await assert.rejects(
      recordTask10GateCommands(options, {
        now: createNowStub([
          '2026-07-19T12:50:00.000Z',
          '2026-07-19T12:50:01.000Z',
          '2026-07-19T12:50:02.000Z',
          '2026-07-19T12:50:02.000Z',
          '2026-07-19T12:50:03.000Z',
          '2026-07-19T12:50:03.000Z',
          '2026-07-19T12:50:04.000Z',
          '2026-07-19T12:50:04.000Z',
          '2026-07-19T12:50:05.000Z',
          '2026-07-19T12:50:05.000Z',
          '2026-07-19T12:50:06.000Z',
          '2026-07-19T12:50:06.000Z',
        ]),
        spawnProcess() {
          const child = createFakeChild();
          queueMicrotask(() => {
            child.stdout.end('ignored\n');
            child.stderr.end('ignored\n');
            child.emit('close', 0);
          });
          return child;
        },
      }),
      /stdoutLogPath must not target an unsafe existing node/,
    );

    assert.equal(await readFile(stdoutTargetPath, 'utf8'), 'do not replace\n');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects unsafe existing socket log targets without touching them', async () => {
  if (process.platform === 'win32') {
    return;
  }
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const shortLogRoot = await realpath(await mkdtemp('/tmp/task10-gate-log-'));
  const options = buildIsolatedOptions(tempRoot, {
    privateLogRoot: shortLogRoot,
  });
  const stdoutLogPath = path.join(shortLogRoot, '01-npm-test.stdout.log');
  const server = net.createServer();
  let listening = false;

  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(stdoutLogPath, () => {
        listening = true;
        resolve();
      });
    });

    await assert.rejects(
      recordTask10GateCommands(options, {
        now: createNowStub([
          '2026-07-19T12:51:00.000Z',
          '2026-07-19T12:51:01.000Z',
          '2026-07-19T12:51:02.000Z',
          '2026-07-19T12:51:02.000Z',
          '2026-07-19T12:51:03.000Z',
          '2026-07-19T12:51:03.000Z',
          '2026-07-19T12:51:04.000Z',
          '2026-07-19T12:51:04.000Z',
          '2026-07-19T12:51:05.000Z',
          '2026-07-19T12:51:05.000Z',
          '2026-07-19T12:51:06.000Z',
          '2026-07-19T12:51:06.000Z',
        ]),
        spawnProcess() {
          const child = createFakeChild();
          queueMicrotask(() => {
            child.stdout.end('ignored\n');
            child.stderr.end('ignored\n');
            child.emit('close', 0);
          });
          return child;
        },
      }),
      /unsafe existing node|socket/i,
    );
  } finally {
    if (listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    await rm(shortLogRoot, { recursive: true, force: true });
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands default runner cleans up idempotently on child error without close', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);
  let child!: ReturnType<typeof createFakeChild>;

  try {
    await assert.rejects(
      recordTask10GateCommands(options, {
        now: createNowStub([
          '2026-07-19T13:00:00.000Z',
          '2026-07-19T13:00:01.000Z',
          '2026-07-19T13:00:02.000Z',
          '2026-07-19T13:00:02.000Z',
          '2026-07-19T13:00:03.000Z',
          '2026-07-19T13:00:03.000Z',
          '2026-07-19T13:00:04.000Z',
          '2026-07-19T13:00:04.000Z',
          '2026-07-19T13:00:05.000Z',
          '2026-07-19T13:00:05.000Z',
          '2026-07-19T13:00:06.000Z',
          '2026-07-19T13:00:06.000Z',
        ]),
        spawnProcess() {
          child = createFakeChild();
          queueMicrotask(() => {
            child.emit('error', new Error('child exploded'));
          });
          return child;
        },
      }),
      /child exploded/,
    );

    assert.equal(child.killCalls, 1);
    assert.deepEqual(await readdir(options.privateLogRoot), []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands cleans up temp files when spawnProcess throws synchronously', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);

  try {
    await assert.rejects(
      recordTask10GateCommands(options, {
        now: createNowStub([
          '2026-07-19T13:02:00.000Z',
          '2026-07-19T13:02:01.000Z',
          '2026-07-19T13:02:02.000Z',
          '2026-07-19T13:02:02.000Z',
          '2026-07-19T13:02:03.000Z',
          '2026-07-19T13:02:03.000Z',
          '2026-07-19T13:02:04.000Z',
          '2026-07-19T13:02:04.000Z',
          '2026-07-19T13:02:05.000Z',
          '2026-07-19T13:02:05.000Z',
          '2026-07-19T13:02:06.000Z',
          '2026-07-19T13:02:06.000Z',
        ]),
        spawnProcess() {
          throw new Error('spawn exploded');
        },
      }),
      /spawn exploded/,
    );

    assert.deepEqual(await readdir(options.privateLogRoot), []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects secure temp log open collisions before spawning', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);
  const collidingTempPath = path.join(options.privateLogRoot, '.01-npm-test.stdout.log-fixed-token.tmp');
  let spawnCount = 0;

  await mkdir(options.privateLogRoot, { recursive: true });
  await writeFile(collidingTempPath, 'collision\n', { mode: 0o600 });

  try {
    await assert.rejects(
      recordTask10GateCommands(options, {
        now: createNowStub([
          '2026-07-19T13:05:00.000Z',
          '2026-07-19T13:05:01.000Z',
          '2026-07-19T13:05:02.000Z',
          '2026-07-19T13:05:02.000Z',
          '2026-07-19T13:05:03.000Z',
          '2026-07-19T13:05:03.000Z',
          '2026-07-19T13:05:04.000Z',
          '2026-07-19T13:05:04.000Z',
          '2026-07-19T13:05:05.000Z',
          '2026-07-19T13:05:05.000Z',
          '2026-07-19T13:05:06.000Z',
          '2026-07-19T13:05:06.000Z',
        ]),
        tempFileToken: () => 'fixed-token',
        spawnProcess() {
          spawnCount += 1;
          return createFakeChild();
        },
      }),
      /EEXIST/,
    );

    assert.equal(spawnCount, 0);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands rejects unsafe temp file tokens before opening any logs', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);

  try {
    for (const token of ['', '.', '..', 'bad/token', 'bad\\token']) {
      await assert.rejects(
        recordTask10GateCommands(options, {
          now: createNowStub([
            '2026-07-19T13:06:00.000Z',
            '2026-07-19T13:06:01.000Z',
            '2026-07-19T13:06:02.000Z',
            '2026-07-19T13:06:02.000Z',
            '2026-07-19T13:06:03.000Z',
            '2026-07-19T13:06:03.000Z',
            '2026-07-19T13:06:04.000Z',
            '2026-07-19T13:06:04.000Z',
            '2026-07-19T13:06:05.000Z',
            '2026-07-19T13:06:05.000Z',
            '2026-07-19T13:06:06.000Z',
            '2026-07-19T13:06:06.000Z',
          ]),
          tempFileToken: () => token,
          spawnProcess() {
            throw new Error('spawn should not run for unsafe token');
          },
        }),
        /tempFileToken must be a non-empty filename-safe token/,
      );
    }

    assert.deepEqual(await readdir(options.privateLogRoot).catch(() => []), []);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands validates canonical timestamps ordering and numeric exit codes', async () => {
  const malformedExit = createRunCommandStub([0]);
  await assert.rejects(
    recordTask10GateCommands(buildOptions(), {
      runCommand: malformedExit.runCommand,
      now: createNowStub([
        '2026-07-19T13:10:00Z',
        '2026-07-19T13:10:01.000Z',
      ]),
    }),
    /startedAt must be a canonical ISO UTC timestamp/,
  );

  const reversedExit = createRunCommandStub([0]);
  await assert.rejects(
    recordTask10GateCommands(buildOptions(), {
      runCommand: reversedExit.runCommand,
      now: createNowStub([
        '2026-07-19T13:10:02.000Z',
        '2026-07-19T13:10:01.000Z',
      ]),
    }),
    /endedAt must be greater than or equal to startedAt/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions(), {
      runCommand: async () => ({ exitCode: -1 }),
      now: createNowStub([
        '2026-07-19T13:10:00.000Z',
        '2026-07-19T13:10:01.000Z',
      ]),
    }),
    /npm test exitCode must be a nonnegative integer/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions(), {
      runCommand: async () => ({ exitCode: 0.5 }),
      now: createNowStub([
        '2026-07-19T13:10:00.000Z',
        '2026-07-19T13:10:01.000Z',
      ]),
    }),
    /npm test exitCode must be a nonnegative integer/,
  );
});

test('recordTask10GateCommands default runner maps close(null) to exit code 1', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));

  try {
    const rows = await recordTask10GateCommands(buildIsolatedOptions(tempRoot), {
      now: createNowStub([
        '2026-07-19T13:15:00.000Z',
        '2026-07-19T13:15:01.000Z',
        '2026-07-19T13:15:02.000Z',
        '2026-07-19T13:15:02.000Z',
        '2026-07-19T13:15:03.000Z',
        '2026-07-19T13:15:03.000Z',
        '2026-07-19T13:15:04.000Z',
        '2026-07-19T13:15:04.000Z',
        '2026-07-19T13:15:05.000Z',
        '2026-07-19T13:15:05.000Z',
        '2026-07-19T13:15:06.000Z',
        '2026-07-19T13:15:06.000Z',
      ]),
      spawnProcess() {
        const child = createFakeChild();
        queueMicrotask(() => {
          child.stdout.end('null close stdout\n');
          child.stderr.end('null close stderr\n');
          child.emit('close', null);
        });
        return child;
      },
    });

    assert.equal(rows[0]?.exitCode, 1);
    assert.equal(rows[0]?.command, 'npm test');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands default runner times out a hung child with TERM then KILL and records deterministic nonzero rows', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);
  const killSignals: string[] = [];
  const timers = createImmediateTimerControls();

  try {
    const rows = await recordTask10GateCommands(options, {
      now: createNowStub([
        '2026-07-19T13:20:00.000Z',
        '2026-07-19T13:20:01.000Z',
        '2026-07-19T13:20:02.000Z',
        '2026-07-19T13:20:02.000Z',
        '2026-07-19T13:20:03.000Z',
        '2026-07-19T13:20:03.000Z',
        '2026-07-19T13:20:04.000Z',
        '2026-07-19T13:20:04.000Z',
        '2026-07-19T13:20:05.000Z',
        '2026-07-19T13:20:05.000Z',
        '2026-07-19T13:20:06.000Z',
        '2026-07-19T13:20:06.000Z',
      ]),
      commandTimeoutMs: 1,
      killGraceMs: 1,
      forceSettleMs: 1,
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      spawnProcess() {
        const child = createFakeChild();
        child.kill = (signal?: NodeJS.Signals) => {
          killSignals.push(signal ?? 'SIGTERM');
          return true;
        };
        return child;
      },
    });

    assert.equal(rows[0]?.command, 'npm test');
    assert.equal(rows[0]?.status, 'executed');
    assert.equal(rows[0]?.exitCode, 124);
    assert.deepEqual(killSignals, ['SIGTERM', 'SIGKILL']);
    assert.deepEqual(rows.slice(1).map((row) => row.status), ['skipped', 'skipped', 'skipped', 'skipped', 'skipped']);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands default runner caps combined output, terminates the child, and records deterministic overflow rows', async () => {
  const tempRoot = await realpath(await mkdtemp(path.join(tmpdir(), 'task10-command-recorder-')));
  const options = buildIsolatedOptions(tempRoot);
  const killSignals: string[] = [];

  try {
    const rows = await recordTask10GateCommands(options, {
      now: createNowStub([
        '2026-07-19T13:25:00.000Z',
        '2026-07-19T13:25:01.000Z',
        '2026-07-19T13:25:02.000Z',
        '2026-07-19T13:25:02.000Z',
        '2026-07-19T13:25:03.000Z',
        '2026-07-19T13:25:03.000Z',
        '2026-07-19T13:25:04.000Z',
        '2026-07-19T13:25:04.000Z',
        '2026-07-19T13:25:05.000Z',
        '2026-07-19T13:25:05.000Z',
        '2026-07-19T13:25:06.000Z',
        '2026-07-19T13:25:06.000Z',
      ]),
      maxCombinedOutputBytes: 8,
      spawnProcess() {
        const child = createFakeChild();
        child.kill = (signal?: NodeJS.Signals) => {
          killSignals.push(signal ?? 'SIGTERM');
          queueMicrotask(() => {
            child.emit('close', 125);
          });
          return true;
        };
        queueMicrotask(() => {
          child.stdout.write('1234567890');
          child.stderr.write('abcdef');
        });
        return child;
      },
    });

    assert.equal(rows[0]?.exitCode, 125);
    assert.deepEqual(killSignals, ['SIGTERM']);
    const stdoutLog = await readFile(path.join(options.privateLogRoot, '01-npm-test.stdout.log'), 'utf8');
    const stderrLog = await readFile(path.join(options.privateLogRoot, '01-npm-test.stderr.log'), 'utf8');
    assert.equal(Buffer.byteLength(stdoutLog) + Buffer.byteLength(stderrLog) <= 8, true);
    assert.deepEqual(rows.slice(1).map((row) => row.status), ['skipped', 'skipped', 'skipped', 'skipped', 'skipped']);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('recordTask10GateCommands never exposes env values or private log paths in public rows', async () => {
  const originalSecret = process.env.TASK10_TEST_SECRET;
  process.env.TASK10_TEST_SECRET = 'task10-super-secret';

  try {
    const options = buildOptions();
    const { runCommand } = createRunCommandStub(SUCCESS_EXIT_CODES);
    const rows = await recordTask10GateCommands(options, {
      runCommand,
      now: createNowStub([
        '2026-07-19T11:00:00.000Z',
        '2026-07-19T11:00:01.000Z',
        '2026-07-19T11:00:02.000Z',
        '2026-07-19T11:00:03.000Z',
        '2026-07-19T11:00:04.000Z',
        '2026-07-19T11:00:05.000Z',
        '2026-07-19T11:00:06.000Z',
        '2026-07-19T11:00:07.000Z',
        '2026-07-19T11:00:08.000Z',
        '2026-07-19T11:00:09.000Z',
        '2026-07-19T11:00:10.000Z',
        '2026-07-19T11:00:11.000Z',
      ]),
    });

    const serializedRows = JSON.stringify(rows);
    assert.doesNotMatch(serializedRows, /task10-super-secret/);
    assert.doesNotMatch(serializedRows, /TASK10_TEST_SECRET/);
    assert.doesNotMatch(serializedRows, /private-logs/);
    assert.doesNotMatch(serializedRows, /\/task10\//);
  } finally {
    if (originalSecret === undefined) {
      delete process.env.TASK10_TEST_SECRET;
    } else {
      process.env.TASK10_TEST_SECRET = originalSecret;
    }
  }
});

test('recordTask10GateCommands rejects blank non-absolute duplicate and overlapping roots', async () => {
  const dependencies = {
    runCommand: async () => {
      throw new Error('runCommand should not execute during root validation failures');
    },
    now: () => '2026-07-19T12:00:00.000Z',
  };

  await assert.rejects(
    recordTask10GateCommands(buildOptions({ frozenClientRoot: '   ' }), dependencies),
    /frozenClientRoot must be a non-empty absolute path/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions({ privateLogRoot: 'relative/private-logs' }), dependencies),
    /privateLogRoot must be a non-empty absolute path/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions({
      forbiddenOverlapRoots: ['/task10/producer-input', '/task10/producer-input'],
    }), dependencies),
    /all roots must be distinct/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions({ privateLogRoot: '/task10/frozen-client/logs' }), dependencies),
    /privateLogRoot must not overlap frozenClientRoot/,
  );

  await assert.rejects(
    recordTask10GateCommands(buildOptions({
      privateLogRoot: '/task10/repositories/core-runtime/private-logs',
    }), dependencies),
    /privateLogRoot must not overlap forbiddenOverlapRoots\[0\]/,
  );
});
