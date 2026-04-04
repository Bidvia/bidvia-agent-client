import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

test('cli help shows stdio MCP as the primary OpenClaw path and bundle export as additive packaging', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', '--help'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /create-provisional-agent --provisional-agent-ref/);
  assert.match(result.stdout, /query-provisional-agent --provisional-agent-ref/);
  assert.match(result.stdout, /claim-provisional-agent --provisional-agent-ref .* --claim-token/);
  assert.match(result.stdout, /openclaw-mcp-config/);
  assert.match(result.stdout, /openclaw-bundle-export/);
  assert.match(result.stdout, /mcp-server/);
  assert.match(result.stdout, /OpenClaw primary path: export stdio MCP config first, then add the companion bundle when you want bundle\/bootstrap packaging\./);
  assert.match(result.stdout, /Stage 1 client runtime is complete locally: CLI and MCP execution share one runtime core and local accumulation layer\./);
  assert.doesNotMatch(result.stdout, /HTTP MCP/i);
  assert.doesNotMatch(result.stdout, /hosted runtime/i);
  assert.doesNotMatch(result.stdout, /native plugin-first/i);
});

test('industry-universe-plan prints review safe scenario json', () => {
  const tsxCliPath = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const result = spawnSync(process.execPath, [tsxCliPath, 'src/cli.ts', 'industry-universe-plan'], {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.scenarioPlan.envelope.scenarioFamily, 'industry-universe');
  assert.equal(output.verificationBundle.verificationMode, 'review-safe');
});
