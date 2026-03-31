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
  });
}

function main(): void {
  const checklistPath = path.join(workspaceRoot, 'docs', 'INTERNAL_RELEASE_CHECKLIST.md');
  assert.equal(existsSync(checklistPath), true, 'Missing internal release checklist');

  const checklist = readFileSync(checklistPath, 'utf8');
  assert.match(checklist, /manual publish gate/i);
  assert.match(checklist, /npm publish/);
  assert.match(checklist, /validate:release-gate/);

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

    const openClawConfigOutput = run('node_modules/.bin/bidvia-agent-client', ['openclaw-mcp-config'], tempRoot);
    assert.match(openClawConfigOutput, /"openclaw-mcp-config"/);
    assert.match(openClawConfigOutput, /"mcpServers"/);
    assert.match(openClawConfigOutput, /"command": "bidvia-agent-client"/);
    assert.match(openClawConfigOutput, /"mcp-server"/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
    unlinkSync(tarballPath);
  }
}

main();
