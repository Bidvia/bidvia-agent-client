import test from 'node:test';
import assert from 'node:assert/strict';

import { runCli } from '../src/cli.ts';
import { buildLocalDiscoveryCatalog } from '../src/discovery-catalog.ts';
import { dispatchMcpToolCall, getMcpToolDescriptor } from '../src/mcp.ts';
import {
  createBidviaPlatformManagedFacade,
  inspectPlatformManagedEntry,
  inspectPlatformManagedReadiness,
  runPlatformManagedProgression,
} from '../src/business-universe/platform-managed.ts';

test('platform-managed bounded module functions expose formal entry, readiness, and progression snapshots', async () => {
  const entry = await inspectPlatformManagedEntry();
  const readiness = await inspectPlatformManagedReadiness();
  const progression = await runPlatformManagedProgression();
  const facade = createBidviaPlatformManagedFacade({} as never);

  assert.equal(entry.stageSnapshot.stage, 'entry');
  assert.equal(readiness.stageSnapshot.stage, 'readiness');
  assert.equal(progression.stageSnapshot.stage, 'progression');
  assert.equal(entry.stageSnapshot.executability, 'later-wave-stop');
  assert.equal((await facade.entry.inspect()).stageSnapshot.executability, 'later-wave-stop');
});

test('runCli platform-managed entry, readiness, and progression commands print machine-readable bounded snapshots', async () => {
  const printed: unknown[] = [];

  const entryExitCode = await runCli(['platform-managed', 'entry', 'inspect'], {
    createClient: () => ({}) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });
  const readinessExitCode = await runCli(['platform-managed', 'readiness', 'inspect'], {
    createClient: () => ({}) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });
  const progressionExitCode = await runCli(['platform-managed', 'progression', 'run'], {
    createClient: () => ({}) as never,
    readLocalOnboardingState: async () => null,
    printJson: (value) => { printed.push(value); },
    printLine: () => {},
  });

  assert.equal(entryExitCode, 0);
  assert.equal(readinessExitCode, 0);
  assert.equal(progressionExitCode, 0);
  assert.equal((printed[0] as { stageSnapshot: { stage: string } }).stageSnapshot.stage, 'entry');
  assert.equal((printed[1] as { stageSnapshot: { stage: string } }).stageSnapshot.stage, 'readiness');
  assert.equal((printed[2] as { stageSnapshot: { stage: string } }).stageSnapshot.stage, 'progression');
});

test('discovery catalog exposes platform-managed formal entry commands and semantics', () => {
  const byHelperKey = new Map(buildLocalDiscoveryCatalog().map((entry) => [entry.helperKey, entry]));

  assert.deepEqual(byHelperKey.get('inspectPlatformManagedEntry')?.cliCommands, [
    'platform-managed entry inspect',
  ]);
  assert.deepEqual(byHelperKey.get('inspectPlatformManagedReadiness')?.cliCommands, [
    'platform-managed readiness inspect',
  ]);
  assert.deepEqual(byHelperKey.get('runPlatformManagedProgression')?.cliCommands, [
    'platform-managed progression run',
  ]);
  assert.equal(byHelperKey.get('inspectPlatformManagedEntry')?.role, 'platform-managed');
  assert.equal(byHelperKey.get('runPlatformManagedProgression')?.stage, 'progression');
});

test('platform-managed MCP descriptors are discoverable and dispatch to bounded snapshots', async () => {
  assert.ok(getMcpToolDescriptor('platform-managed-entry-inspect-read'));
  assert.ok(getMcpToolDescriptor('platform-managed-readiness-inspect-read'));
  assert.ok(getMcpToolDescriptor('platform-managed-progression-run-execution'));

  const entry = await dispatchMcpToolCall({
    toolName: 'platform-managed-entry-inspect-read',
    arguments: {},
  }, {
    createExecutionClient: () => ({}) as never,
  });
  const progression = await dispatchMcpToolCall({
    toolName: 'platform-managed-progression-run-execution',
    arguments: {},
  }, {
    createExecutionClient: () => ({}) as never,
  });

  assert.equal((entry.result?.truthFetchResult as { stageSnapshot: { stage: string } }).stageSnapshot.stage, 'entry');
  assert.equal((progression.result?.executionResult as { stageSnapshot: { executability: string } }).stageSnapshot.executability, 'later-wave-stop');
});
