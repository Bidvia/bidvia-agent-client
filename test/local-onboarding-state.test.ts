import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import * as publicSurface from '../src/index.ts';

function setEnvVar(name: string, value: string | undefined) {
  const previousValue = process.env[name];

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  return () => {
    if (previousValue === undefined) {
      delete process.env[name];
      return;
    }

    process.env[name] = previousValue;
  };
}

test('resolveLocalOnboardingStatePath defaults to ~/.bidvia/onboarding-state.json and lets BIDVIA_STATE_PATH win when provided', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.resolveLocalOnboardingStatePath, 'function');

  const resolveLocalOnboardingStatePath = exports.resolveLocalOnboardingStatePath as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => string;

  assert.equal(
    resolveLocalOnboardingStatePath({
      env: {},
      homeDirectory: '/Users/example-user',
    }),
    '/Users/example-user/.bidvia/onboarding-state.json',
  );
  assert.equal(
    resolveLocalOnboardingStatePath({
      env: {
        BIDVIA_STATE_PATH: '/tmp/bidvia/custom-onboarding-state.json',
      },
      homeDirectory: '/Users/example-user',
    }),
    '/tmp/bidvia/custom-onboarding-state.json',
  );
});

test('writeLocalOnboardingState persists only non-secret onboarding fields and readLocalOnboardingState reloads them from the BIDVIA_STATE_PATH override', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-onboarding-state-'));
  const statePath = path.join(tempDirectory, 'onboarding-state.json');

  assert.equal(typeof exports.writeLocalOnboardingState, 'function');
  assert.equal(typeof exports.readLocalOnboardingState, 'function');

  const writeLocalOnboardingState = exports.writeLocalOnboardingState as (
    state: Record<string, unknown>,
    options?: {
      env?: NodeJS.ProcessEnv;
      homeDirectory?: string;
    },
  ) => Promise<{ path: string; state: Record<string, unknown> }>;
  const readLocalOnboardingState = exports.readLocalOnboardingState as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<Record<string, unknown> | null>;
  const restoreStatePath = setEnvVar('BIDVIA_STATE_PATH', statePath);

  try {
    const result = await writeLocalOnboardingState({
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      registrationId: 'areg-1',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:05:00.000Z',
      sessionId: 'session-secret',
      adminSessionId: 'admin-secret',
      accessToken: 'token-secret',
      refreshToken: 'refresh-secret',
    });

    assert.equal(result.path, statePath);
    assert.deepEqual(result.state, {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      registrationId: 'areg-1',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:05:00.000Z',
    });

    assert.deepEqual(JSON.parse(readFileSync(statePath, 'utf8')), {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      registrationId: 'areg-1',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:05:00.000Z',
    });

    const reloaded = await readLocalOnboardingState();

    assert.deepEqual(reloaded, {
      tenantId: 'tenant-a',
      principalId: 'principal-a',
      companyId: 'company-a',
      registrationId: 'areg-1',
      lastCompletedStep: 'claim-provisional-agent',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:05:00.000Z',
    });
  } finally {
    restoreStatePath();
  }
});

test('readLocalOnboardingState returns null when no local onboarding state file exists at the resolved path', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-onboarding-state-missing-'));
  const statePath = path.join(tempDirectory, 'missing.json');

  assert.equal(typeof exports.readLocalOnboardingState, 'function');

  const readLocalOnboardingState = exports.readLocalOnboardingState as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<Record<string, unknown> | null>;

  const state = await readLocalOnboardingState({
    env: {
      BIDVIA_STATE_PATH: statePath,
    },
  });

  assert.equal(state, null);
});

test('readLocalOnboardingState returns null instead of throwing when the local onboarding state file contains malformed json', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-onboarding-state-malformed-'));
  const statePath = path.join(tempDirectory, 'malformed.json');

  assert.equal(typeof exports.readLocalOnboardingState, 'function');

  writeFileSync(statePath, '{not-valid-json', 'utf8');

  const readLocalOnboardingState = exports.readLocalOnboardingState as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<Record<string, unknown> | null>;

  const state = await readLocalOnboardingState({
    env: {
      BIDVIA_STATE_PATH: statePath,
    },
  });

  assert.equal(state, null);
});

test('readLocalOnboardingStateWithDiagnostics treats object-shaped state with invalid field types as malformed and returns a warning', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const tempDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-local-onboarding-state-bad-fields-'));
  const statePath = path.join(tempDirectory, 'bad-fields.json');

  assert.equal(typeof exports.readLocalOnboardingStateWithDiagnostics, 'function');

  writeFileSync(statePath, JSON.stringify({
    tenantId: 123,
    principalId: 'principal-a',
    registrationId: true,
  }), 'utf8');

  const readLocalOnboardingStateWithDiagnostics = exports.readLocalOnboardingStateWithDiagnostics as (options?: {
    env?: NodeJS.ProcessEnv;
    homeDirectory?: string;
  }) => Promise<{ state: Record<string, unknown> | null; warnings: unknown[] }>;

  const result = await readLocalOnboardingStateWithDiagnostics({
    env: {
      BIDVIA_STATE_PATH: statePath,
    },
  });

  assert.equal(result.state, null);
  assert.deepEqual(result.warnings, [{
    code: 'invalid-local-onboarding-state',
    path: statePath,
    message: 'Local onboarding state file is malformed JSON. Ignoring cached state for this command.',
  }]);
});
