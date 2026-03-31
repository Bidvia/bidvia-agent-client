import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');

function readPackageJson() {
  return JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  ) as Record<string, unknown>;
}

function fileExists(relativePath: string) {
  return existsSync(path.join(workspaceRoot, relativePath));
}

test('package distribution metadata exposes stable installed SDK, CLI, and local MCP entrypoints from dist artifacts', () => {
  const packageJson = readPackageJson();

  assert.deepEqual(packageJson.bin, {
    'bidvia-agent-client': './dist/cli.js',
  });
  assert.deepEqual(packageJson.files, [
    'dist',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
  ]);
  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/src/index.d.ts',
      import: './dist/src/index.js',
    },
    './cli': './dist/cli.js',
    './mcp-server': './dist/src/mcp-server.js',
    './package.json': './package.json',
  });
  assert.deepEqual(packageJson.releaseGate, {
    npmPublished: false,
    pendingPublicMetadata: ['repository', 'homepage', 'bugs'],
  });
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(packageJson.engines, {
    node: '>=20',
  });
  assert.deepEqual(packageJson.keywords, [
    'bidvia',
    'agent',
    'sdk',
    'cli',
    'mcp',
  ]);
  assert.equal(packageJson.repository, undefined);
  assert.equal(packageJson.homepage, undefined);
  assert.equal(packageJson.bugs, undefined);
  assert.equal((packageJson.scripts as Record<string, unknown>)['validate:release-readiness'], 'tsx scripts/validate-release-readiness.ts');
  assert.equal((packageJson.scripts as Record<string, unknown>)['validate:release-gate'], 'tsx scripts/validate-release-gate.ts');
});

test('package metadata declares the installed MCP execution surface without losing the repo-local fallback', () => {
  const packageJson = readPackageJson();

  assert.deepEqual(packageJson.bin, {
    'bidvia-agent-client': './dist/cli.js',
  });
  assert.equal((packageJson.exports as Record<string, unknown>)['./mcp-server'], './dist/src/mcp-server.js');
});

test('public package support files and release-readiness validation entrypoints are present when publication metadata is gated', () => {
  const packageJson = readPackageJson();

  assert.equal(fileExists('CONTRIBUTING.md'), true);
  assert.equal(fileExists('CODE_OF_CONDUCT.md'), true);
  assert.equal(fileExists('scripts/validate-release-readiness.ts'), true);
  assert.equal(fileExists('scripts/validate-release-gate.ts'), true);
  assert.equal(fileExists('docs/INTERNAL_RELEASE_CHECKLIST.md'), true);
  assert.deepEqual(packageJson.files, [
    'dist',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
  ]);
});
