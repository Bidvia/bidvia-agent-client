import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');

type PackEntry = {
  filename: string;
};

type PackageJson = {
  name?: string;
  version?: string;
  bin?: Record<string, string>;
  exports?: Record<string, unknown>;
};

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  });
}

function buildJsonRpcFrame(body: string): string {
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

function main(): void {
  const readme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const onboardingDoc = readFileSync(path.join(workspaceRoot, 'docs', 'OPENCLAW_GATEWAY_ONBOARDING.md'), 'utf8');
  const smokeDoc = readFileSync(path.join(workspaceRoot, 'docs', 'OPENCLAW_GATEWAY_SMOKE.md'), 'utf8');
  const openClawExample = readFileSync(path.join(workspaceRoot, 'examples', 'openclaw-gateway-bidvia-setup.md'), 'utf8');

  for (const document of [readme, onboardingDoc, openClawExample]) {
    assert.match(document, /npm install @bidvia\/client/);
    assert.match(document, /bidvia mcp-server/);
    assert.doesNotMatch(document, /npm install bidvia-agent-client/);
    assert.doesNotMatch(document, /bidvia-agent-client mcp-server/);
  }

  assert.match(readme, /bidvia openclaw-mcp-config/);
  assert.match(readme, /bidvia onboard/);
  assert.match(readme, /validator commands should stay green together/i);
  assert.match(onboardingDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia mcp-server/);
  assert.doesNotMatch(readme, /bidvia-agent-client openclaw-mcp-config/);
  assert.doesNotMatch(smokeDoc, /bidvia-agent-client openclaw-mcp-config/);

  run('npm', ['run', 'validate:release-readiness'], workspaceRoot);

  const packOutput = run('npm', ['pack', '--json'], workspaceRoot);
  const packEntries = JSON.parse(packOutput) as PackEntry[];
  assert.equal(packEntries.length, 1, 'Expected exactly one tarball from npm pack');

  const tarballName = packEntries[0]!.filename;
  const tarballPath = path.join(workspaceRoot, tarballName);
  assert.equal(existsSync(tarballPath), true, `Missing packed tarball: ${tarballName}`);

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'bidvia-release-gate-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'package.json'),
        JSON.stringify({
        name: 'bidvia-release-gate-smoke',
        private: true,
        type: 'module',
      }, null, 2),
    );

    run('npm', ['install', tarballPath], tempRoot);

    const installedPackageJson = JSON.parse(
      readFileSync(path.join(tempRoot, 'node_modules', '@bidvia', 'client', 'package.json'), 'utf8'),
    ) as PackageJson;
    assert.equal(installedPackageJson.name, '@bidvia/client');
    assert.deepEqual(installedPackageJson.bin, {
      bidvia: './dist/cli.js',
    });
    assert.deepEqual(installedPackageJson.exports, {
      '.': {
        types: './dist/src/index.d.ts',
        import: './dist/src/index.js',
      },
      './cli': './dist/cli.js',
      './mcp-server': './dist/src/mcp-server.js',
      './package.json': './package.json',
    });
    assert.equal(typeof installedPackageJson.version, 'string');

    const helpOutput = run('node_modules/.bin/bidvia', ['--help'], tempRoot);
    assert.match(helpOutput, /bidvia/);
    assert.match(helpOutput, /mcp-server/);
    assert.match(helpOutput, /openclaw-mcp-config/);

    const openClawConfigOutput = run('node_modules/.bin/bidvia', ['openclaw-mcp-config'], tempRoot);
    assert.match(openClawConfigOutput, /"openclaw-mcp-config"/);
    assert.match(openClawConfigOutput, /"mcpServers"/);
    assert.match(openClawConfigOutput, /"command": "bidvia"/);
    assert.match(openClawConfigOutput, /"mcp-server"/);

    const initializeOutput = execFileSync(
      'node_modules/.bin/bidvia',
      ['mcp-server'],
      {
        cwd: tempRoot,
        encoding: 'utf8',
        timeout: 5000,
        input: buildJsonRpcFrame(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {},
        })),
      },
    );
    assert.match(initializeOutput, /Content-Length:/);
    assert.match(initializeOutput, /"protocolVersion":"2024-11-05"/);
    const versionPattern = new RegExp(`"serverInfo":\\{\"name\":\"@bidvia/client\",\"version\":\"${installedPackageJson.version?.replace(/\./g, '\\.')}\"\\}`);
    assert.match(initializeOutput, versionPattern);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
    unlinkSync(tarballPath);
  }
}

main();
