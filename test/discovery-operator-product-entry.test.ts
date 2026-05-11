import test from 'node:test';
import assert from 'node:assert/strict';

import { buildLocalDiscoveryCatalog, buildLocalMcpToolCatalog } from '../src/discovery-catalog.ts';

test('local discovery catalog exposes operator product entry commands through role-stage helper bindings', () => {
  const catalog = buildLocalDiscoveryCatalog();
  const byHelperKey = new Map(catalog.map((entry) => [entry.helperKey, entry]));

  assert.deepEqual(byHelperKey.get('consumeOperatorHandoff')?.cliCommands, [
    'operator-handoff-consume',
  ]);
  assert.deepEqual(byHelperKey.get('runOperatorMatching')?.cliCommands, [
    'operator-progression-match',
  ]);
  assert.deepEqual(byHelperKey.get('runOperatorConnectionContinuation')?.cliCommands, [
    'operator-progression-connect',
  ]);
  assert.deepEqual(byHelperKey.get('runOperatorApprovalContinuation')?.cliCommands, [
    'operator-progression-approve',
  ]);
  assert.deepEqual(byHelperKey.get('runOperatorPackageExport')?.cliCommands, [
    'operator-progression-package-export',
  ]);
  assert.deepEqual(byHelperKey.get('runOperatorCommercialAction')?.cliCommands, [
    'operator-closure-commercial-action-run',
  ]);
  assert.deepEqual(byHelperKey.get('inspectOperatorCommercialAction')?.cliCommands, [
    'operator-closure-inspect',
  ]);
});

test('local MCP catalog exposes operator continuation tools for match, approval, package export, and closure inspect', () => {
  const toolNames = new Set(buildLocalMcpToolCatalog().map((tool) => tool.toolName));

  assert.ok(toolNames.has('operator-progression-match-execution'));
  assert.ok(toolNames.has('operator-progression-approve-execution'));
  assert.ok(toolNames.has('operator-progression-package-export-execution'));
  assert.ok(toolNames.has('operator-closure-commercial-action-run-execution'));
  assert.ok(toolNames.has('operator-closure-inspect-read'));
});
