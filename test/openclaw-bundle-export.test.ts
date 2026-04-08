import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runCli } from '../src/cli.ts';
import * as publicSurface from '../src/index.ts';

type BundleFile = {
  relativePath: string;
  content: string;
};

type CompanionBundle = {
  format: string;
  supportedInstallTargets: string[];
  localOnly: boolean;
  files: BundleFile[];
};

function requireBundleFile(bundle: CompanionBundle, relativePath: string): BundleFile {
  const file = bundle.files.find((entry) => entry.relativePath === relativePath);

  assert.ok(file, `expected bundle file ${relativePath}`);

  return file;
}

test('buildOpenClawCompanionBundle exports a local Codex-style OpenClaw companion bundle with the official plugin marker around bidvia mcp-server', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOpenClawCompanionBundle, 'function');
  assert.equal(typeof exports.exportOpenClawCompanionBundle, 'function');

  const bundle = (exports.buildOpenClawCompanionBundle as () => CompanionBundle)();
  const exported = (exports.exportOpenClawCompanionBundle as (value: CompanionBundle) => CompanionBundle)(bundle);
  const pluginFile = requireBundleFile(exported, '.codex-plugin/plugin.json');
  const mcpConfigFile = requireBundleFile(exported, '.mcp.json');
  const bootstrapFile = requireBundleFile(exported, 'docs/bidvia-openclaw-local-operator.md');

  assert.equal(exported.format, 'codex');
  assert.deepEqual(exported.supportedInstallTargets, ['local-path']);
  assert.equal(exported.localOnly, true);

  assert.deepEqual(JSON.parse(pluginFile.content), {
    schemaVersion: '1.0',
    name: 'bidvia-openclaw-companion',
    description: 'Local-first Codex companion bundle for Bidvia OpenClaw MCP handoff.',
    mcpConfigPath: '.mcp.json',
    docs: [
      'docs/bidvia-openclaw-local-operator.md',
    ],
  });

  assert.deepEqual(JSON.parse(mcpConfigFile.content), {
    mcpServers: {
      bidvia: {
        command: 'bidvia',
        args: ['mcp-server'],
        env: {
          BIDVIA_BASE_URL: 'https://api.bidvia.cn',
          BIDVIA_TENANT_ID: '<required>',
          BIDVIA_SESSION_ID: '<optional>',
          BIDVIA_ADMIN_SESSION_ID: '<optional>',
          BIDVIA_REGISTRATION_ID: '<optional>',
          BIDVIA_PRINCIPAL_ID: '<optional>',
          BIDVIA_PRINCIPAL_TYPE: '<optional>',
          BIDVIA_AUTHORIZED_ROLE: '<optional>',
          BIDVIA_COMPANY_ID: '<optional>',
        },
      },
    },
    localExecutionExpectations: {
      transport: 'stdio',
      localOnly: true,
      hosted: false,
      remoteDiscovery: false,
      publishedPackageRequired: true,
      endpointOverride: 'advanced-operator-only',
      developmentFallback: 'node dist/mcp-server.js',
    },
    firstSuccessNextStep: {
      command: 'route-context-matrix',
      rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.',
    },
  });

  assert.match(bootstrapFile.content, /bidvia mcp-server/);
  assert.match(bootstrapFile.content, /local-only/i);
  assert.match(bootstrapFile.content, /stdio MCP/i);
  assert.match(bootstrapFile.content, /route-context-matrix/);
  assert.match(bootstrapFile.content, /tenantId/i);
  assert.match(bootstrapFile.content, /principalId/i);
  assert.doesNotMatch(bootstrapFile.content, /http mcp/i);
  assert.doesNotMatch(bootstrapFile.content, /hosted runtime/i);
});

test('writeOpenClawCompanionBundle materializes the official Codex bundle layout to disk', async () => {
  const exports = publicSurface as Record<string, unknown>;
  const outputDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-openclaw-bundle-'));

  assert.equal(typeof exports.writeOpenClawCompanionBundle, 'function');

  const result = await (exports.writeOpenClawCompanionBundle as (
    outputPath: string,
  ) => Promise<{ outputPath: string; writtenFiles: string[] }>)(outputDirectory);

  assert.equal(result.outputPath, outputDirectory);
  assert.deepEqual(result.writtenFiles, [
    '.codex-plugin/plugin.json',
    '.mcp.json',
    'docs/bidvia-openclaw-local-operator.md',
  ]);
  assert.deepEqual(JSON.parse(readFileSync(path.join(outputDirectory, '.codex-plugin/plugin.json'), 'utf8')), {
    schemaVersion: '1.0',
    name: 'bidvia-openclaw-companion',
    description: 'Local-first Codex companion bundle for Bidvia OpenClaw MCP handoff.',
    mcpConfigPath: '.mcp.json',
    docs: [
      'docs/bidvia-openclaw-local-operator.md',
    ],
  });
  assert.deepEqual(JSON.parse(readFileSync(path.join(outputDirectory, '.mcp.json'), 'utf8')), {
    mcpServers: {
      bidvia: {
        command: 'bidvia',
        args: ['mcp-server'],
        env: {
          BIDVIA_BASE_URL: 'https://api.bidvia.cn',
          BIDVIA_TENANT_ID: '<required>',
          BIDVIA_SESSION_ID: '<optional>',
          BIDVIA_ADMIN_SESSION_ID: '<optional>',
          BIDVIA_REGISTRATION_ID: '<optional>',
          BIDVIA_PRINCIPAL_ID: '<optional>',
          BIDVIA_PRINCIPAL_TYPE: '<optional>',
          BIDVIA_AUTHORIZED_ROLE: '<optional>',
          BIDVIA_COMPANY_ID: '<optional>',
        },
      },
    },
    localExecutionExpectations: {
      transport: 'stdio',
      localOnly: true,
      hosted: false,
      remoteDiscovery: false,
      publishedPackageRequired: true,
      endpointOverride: 'advanced-operator-only',
      developmentFallback: 'node dist/mcp-server.js',
    },
    firstSuccessNextStep: {
      command: 'route-context-matrix',
      rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.',
    },
  });
  assert.match(
    readFileSync(path.join(outputDirectory, 'docs/bidvia-openclaw-local-operator.md'), 'utf8'),
    /bidvia mcp-server/,
  );
});

test('runCli writes the OpenClaw companion bundle to an explicit output directory', async () => {
  const printed: unknown[] = [];
  const outputDirectory = mkdtempSync(path.join(tmpdir(), 'bidvia-openclaw-cli-'));
  const bundleDirectory = path.join(outputDirectory, 'bundle');

  const exitCode = await runCli(['openclaw-bundle-export', '--output', bundleDirectory], {
    printJson: (value) => {
      printed.push(value);
    },
    printLine: () => {
      throw new Error('help output should not be used for openclaw-bundle-export');
    },
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(printed, [{
    command: 'openclaw-bundle-export',
    scope: 'local-only',
    outputPath: bundleDirectory,
    writtenFiles: [
      '.codex-plugin/plugin.json',
      '.mcp.json',
      'docs/bidvia-openclaw-local-operator.md',
    ],
    operatorNotes: {
      primaryPath: 'Primary OpenClaw path: export stdio MCP config first, then add the companion bundle when you want bundle/bootstrap packaging around the same local server.',
      executionBoundary: 'Bundle/bootstrap only: Bidvia execution still runs through the local stdio MCP server at `bidvia mcp-server`.',
      developmentNote: 'Repo-local fallbacks such as `node dist/mcp-server.js` stay development-only and are not the primary bundle handoff.',
      deferredNativePlugin: 'Native-plugin-first and HTTP MCP paths stay out of scope for this version.',
    },
  }]);
  assert.deepEqual(JSON.parse(readFileSync(path.join(bundleDirectory, '.codex-plugin/plugin.json'), 'utf8')), {
    schemaVersion: '1.0',
    name: 'bidvia-openclaw-companion',
    description: 'Local-first Codex companion bundle for Bidvia OpenClaw MCP handoff.',
    mcpConfigPath: '.mcp.json',
    docs: [
      'docs/bidvia-openclaw-local-operator.md',
    ],
  });
});
