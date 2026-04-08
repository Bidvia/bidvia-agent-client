import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOpenClawConfig and exportOpenClawConfig produce an OpenClaw-consumption fragment for the local stdio MCP server without assuming a live package release', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOpenClawConfig, 'function');
  assert.equal(typeof exports.exportOpenClawConfig, 'function');
  assert.equal(typeof exports.buildOpenClawCompanionBundle, 'function');

  const config = (exports.buildOpenClawConfig as () => unknown)();
  const exported = (exports.exportOpenClawConfig as (value: unknown) => unknown)(config);

  assert.deepEqual(exported, {
    mcpServers: {
      'bidvia': {
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

  const bundle = (exports.buildOpenClawCompanionBundle as () => {
    files: Array<{ relativePath: string; content: string }>;
  })();
  const mcpConfigFile = bundle.files.find((file) => file.relativePath === '.mcp.json');

  assert.ok(mcpConfigFile);
  assert.deepEqual(JSON.parse(mcpConfigFile.content), exported);
});
