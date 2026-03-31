import test from 'node:test';
import assert from 'node:assert/strict';

import * as publicSurface from '../src/index.ts';

test('buildOpenClawConfig and exportOpenClawConfig define the local stdio MCP operator contract without hosted behavior', () => {
  const exports = publicSurface as Record<string, unknown>;

  assert.equal(typeof exports.buildOpenClawConfig, 'function');
  assert.equal(typeof exports.exportOpenClawConfig, 'function');

  const config = (exports.buildOpenClawConfig as () => unknown)();
  const exported = (exports.exportOpenClawConfig as (value: unknown) => unknown)(config);

  assert.deepEqual(exported, {
    serverName: 'bidvia-agent-client',
    transport: 'stdio',
    command: 'node',
    args: ['dist/mcp-server.js'],
    env: {
      BIDVIA_BASE_URL: 'https://api.bidvia.ai',
      BIDVIA_TENANT_ID: '<required>',
      BIDVIA_SESSION_ID: '<optional>',
      BIDVIA_ADMIN_SESSION_ID: '<optional>',
      BIDVIA_REGISTRATION_ID: '<optional>',
      BIDVIA_PRINCIPAL_ID: '<optional>',
    },
    boundary: {
      localOnly: true,
      hosted: false,
      remoteDiscovery: false,
    },
    firstSuccessNextStep: {
      command: 'route-context-matrix',
      rationale: 'Confirm the required context family for each guided route before enabling local OpenClaw operator execution.',
    },
  });
});
