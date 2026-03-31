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

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: 5000,
  });
}

function buildJsonRpcFrame(body: string): string {
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

function main(): void {
  const checklistPath = path.join(workspaceRoot, 'docs', 'INTERNAL_RELEASE_CHECKLIST.md');
  assert.equal(existsSync(checklistPath), true, 'Missing internal release checklist');

  const checklist = readFileSync(checklistPath, 'utf8');
  assert.match(checklist, /manual publish gate/i);
  assert.match(checklist, /npm publish/);
  assert.match(checklist, /validate:release-gate/);

  const readme = readFileSync(path.join(workspaceRoot, 'README.md'), 'utf8');
  const onboardingDoc = readFileSync(path.join(workspaceRoot, 'docs', 'OPENCLAW_GATEWAY_ONBOARDING.md'), 'utf8');
  const smokeDoc = readFileSync(path.join(workspaceRoot, 'docs', 'OPENCLAW_GATEWAY_SMOKE.md'), 'utf8');
  const openClawExample = readFileSync(path.join(workspaceRoot, 'examples', 'openclaw-gateway-bidvia-setup.md'), 'utf8');

  for (const document of [readme, onboardingDoc, openClawExample]) {
    assert.match(document, /npm install bidvia-agent-client/);
    assert.match(document, /bidvia-agent-client mcp-server/);
  }

  assert.match(readme, /bidvia-agent-client openclaw-mcp-config/);
  assert.match(readme, /bidvia-agent-client onboarding-readiness/);
  assert.match(onboardingDoc, /bidvia-agent-client openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia-agent-client openclaw-mcp-config/);
  assert.match(smokeDoc, /bidvia-agent-client mcp-server/);

  run('npm', ['run', 'validate:release-readiness'], workspaceRoot);

  const packOutput = run('npm', ['pack', '--json'], workspaceRoot);
  const packEntries = JSON.parse(packOutput) as PackEntry[];
  assert.equal(packEntries.length, 1, 'Expected exactly one tarball from npm pack');

  const tarballName = packEntries[0]!.filename;
  const tarballPath = path.join(workspaceRoot, tarballName);
  assert.equal(existsSync(tarballPath), true, `Missing packed tarball: ${tarballName}`);

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'bidvia-agent-client-release-gate-'));

  try {
    writeFileSync(
      path.join(tempRoot, 'package.json'),
      JSON.stringify({
        name: 'bidvia-agent-client-release-gate-smoke',
        private: true,
        type: 'module',
      }, null, 2),
    );

    run('npm', ['install', tarballPath], tempRoot);

    const helpOutput = run('node_modules/.bin/bidvia-agent-client', ['--help'], tempRoot);
    assert.match(helpOutput, /bidvia-agent-client/);
    assert.match(helpOutput, /mcp-server/);
    assert.match(helpOutput, /openclaw-mcp-config/);

    const openClawConfigOutput = run('node_modules/.bin/bidvia-agent-client', ['openclaw-mcp-config'], tempRoot);
    assert.match(openClawConfigOutput, /"openclaw-mcp-config"/);
    assert.match(openClawConfigOutput, /"mcpServers"/);
    assert.match(openClawConfigOutput, /"command": "bidvia-agent-client"/);
    assert.match(openClawConfigOutput, /"mcp-server"/);

    const initializeOutput = execFileSync(
      'node_modules/.bin/bidvia-agent-client',
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
    assert.match(initializeOutput, /"name":"bidvia-agent-client"/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
    unlinkSync(tarballPath);
  }
}

main();
