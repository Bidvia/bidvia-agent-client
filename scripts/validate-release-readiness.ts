import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');

type ReleaseGate = {
  npmPublished?: boolean;
  pendingPublicMetadata?: string[];
};

type PackageJson = {
  name?: string;
  bin?: Record<string, string>;
  exports?: Record<string, unknown>;
  license?: string;
  keywords?: string[];
  engines?: Record<string, string>;
  files?: string[];
  scripts?: Record<string, string>;
  releaseGate?: ReleaseGate;
  repository?: unknown;
  homepage?: unknown;
  bugs?: unknown;
};

function readPackageJson(): PackageJson {
  return JSON.parse(
    readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'),
  ) as PackageJson;
}

function assertFileExists(relativePath: string): void {
  assert.equal(existsSync(path.join(workspaceRoot, relativePath)), true, `Missing required file: ${relativePath}`);
}

function main(): void {
  const packageJson = readPackageJson();

  assert.equal(packageJson.name, '@bidvia/client');
  assert.deepEqual(packageJson.bin, {
    bidvia: './dist/cli.js',
  });
  assert.deepEqual(packageJson.exports, {
    '.': {
      types: './dist/src/index.d.ts',
      import: './dist/src/index.js',
    },
    './cli': './dist/cli.js',
    './mcp-server': './dist/src/mcp-server.js',
    './package.json': './package.json',
  });
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(packageJson.keywords, ['bidvia', 'agent', 'sdk', 'cli', 'mcp']);
  assert.deepEqual(packageJson.engines, {
    node: '>=20',
  });
  assert.deepEqual(packageJson.releaseGate, {
    npmPublished: false,
  });
  assert.deepEqual(packageJson.repository, {
    type: 'git',
    url: 'https://github.com/Bidvia/bidvia-agent-client.git',
  });
  assert.equal(packageJson.homepage, 'https://github.com/Bidvia/bidvia-agent-client');
  assert.deepEqual(packageJson.bugs, {
    url: 'https://github.com/Bidvia/bidvia-agent-client/issues',
  });
  assert.equal(packageJson.scripts?.['validate:release-readiness'], 'tsx scripts/validate-release-readiness.ts');

  for (const relativePath of ['README.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md']) {
    assertFileExists(relativePath);
  }

  assert.deepEqual(packageJson.files, [
    'dist',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
  ]);

  const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
  });
  const packEntries = JSON.parse(packOutput) as Array<{
    files: Array<{ path: string }>;
  }>;

  assert.equal(packEntries.length, 1);
  const packedPaths = packEntries[0]!.files.map((entry) => entry.path).sort();
  for (const requiredPackedPath of [
    'package.json',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'CODE_OF_CONDUCT.md',
    'dist/cli.js',
    'dist/src/index.js',
    'dist/src/mcp-server.js',
  ]) {
    assert.equal(packedPaths.includes(requiredPackedPath), true, `Missing packed file: ${requiredPackedPath}`);
  }
}

main();
