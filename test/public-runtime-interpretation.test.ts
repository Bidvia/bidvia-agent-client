import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';
import {
  buildPublicRuntimeInterpretationReport,
} from '../src/public-runtime-interpretation.ts';

test('buildPublicRuntimeInterpretationReport reads healthz and readyz and returns machine-readable runtime interpretation proof', async () => {
  const responses = [
    {
      status: 'ok',
      service: 'runtime',
      release_closure_state: 'terminal-envelope-bounded',
      terminal_release_convergence_state: 'bounded-terminal-in-progress',
    },
    {
      status: 'ready',
      service: 'runtime',
      readiness_mode: 'local-db-minimum',
    },
  ];
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(input));
    return new Response(JSON.stringify(responses[calls.length - 1] ?? { ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const report = await buildPublicRuntimeInterpretationReport({
    baseUrl: 'http://127.0.0.1:8787',
  }, {
    fetchImpl,
    now: () => '2026-05-17T08:00:00.000Z',
  });

  assert.deepEqual(calls, [
    'http://127.0.0.1:8787/healthz',
    'http://127.0.0.1:8787/readyz',
  ]);
  assert.deepEqual(report, {
    command: 'public-runtime-interpretation-probe',
    scope: 'local-only',
    generatedAt: '2026-05-17T08:00:00.000Z',
    baseUrl: 'http://127.0.0.1:8787',
    family: 'public-runtime-interpretation',
    proofClass: 'baseline-interpretation',
    status: 'passed',
    summary: {
      healthzStatus: 'ok',
      readyzStatus: 'ready',
      releaseClosureState: 'terminal-envelope-bounded',
      terminalReleaseConvergenceState: 'bounded-terminal-in-progress',
    },
    readbacks: {
      healthz: {
        status: 'ok',
        service: 'runtime',
        release_closure_state: 'terminal-envelope-bounded',
        terminal_release_convergence_state: 'bounded-terminal-in-progress',
      },
      readyz: {
        status: 'ready',
        service: 'runtime',
        readiness_mode: 'local-db-minimum',
      },
    },
  });
});

test('runCli public-runtime-interpretation-probe prints the bounded runtime interpretation report', async () => {
  const printed: unknown[] = [];
  const responses = [
    {
      status: 'ok',
      service: 'runtime',
      release_closure_state: 'terminal-envelope-bounded',
      terminal_release_convergence_state: 'bounded-terminal-in-progress',
    },
    {
      status: 'ready',
      service: 'runtime',
      readiness_mode: 'local-db-minimum',
    },
  ];
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(input));
    return new Response(JSON.stringify(responses[calls.length - 1] ?? { ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const exitCode = await runCli(['public-runtime-interpretation-probe'], {
      printJson: (value: unknown) => {
        printed.push(value);
      },
      printLine: () => {
        throw new Error('public-runtime-interpretation-probe should not print help lines');
      },
      resolveBaseUrl: () => 'http://127.0.0.1:8787',
      createClient: () => {
        throw new Error('public-runtime-interpretation-probe should stay local/report-only');
      },
    });

    assert.equal(exitCode, 0);
    assert.deepEqual(calls, [
      'http://127.0.0.1:8787/healthz',
      'http://127.0.0.1:8787/readyz',
    ]);
    assert.equal(printed.length, 1);
    const report = printed[0] as {
      command: string;
      scope: string;
      summary: {
        healthzStatus: string;
        readyzStatus: string;
      };
    };
    assert.equal(report.command, 'public-runtime-interpretation-probe');
    assert.equal(report.scope, 'local-only');
    assert.equal(report.summary.healthzStatus, 'ok');
    assert.equal(report.summary.readyzStatus, 'ready');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('buildPublicRuntimeInterpretationReport returns a failed bounded report when runtime fetch fails', async () => {
  const report = await buildPublicRuntimeInterpretationReport({
    baseUrl: 'http://127.0.0.1:65534',
  }, {
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
    now: () => '2026-05-17T08:10:00.000Z',
  });

  assert.deepEqual(report, {
    command: 'public-runtime-interpretation-probe',
    scope: 'local-only',
    generatedAt: '2026-05-17T08:10:00.000Z',
    baseUrl: 'http://127.0.0.1:65534',
    family: 'public-runtime-interpretation',
    proofClass: 'baseline-interpretation',
    status: 'failed',
    summary: {
      healthzStatus: null,
      readyzStatus: null,
      releaseClosureState: null,
      terminalReleaseConvergenceState: null,
    },
    readbacks: {
      healthz: {},
      readyz: {},
    },
    failure: {
      code: 'runtime_probe_failed',
      message: 'fetch failed',
    },
  });
});
