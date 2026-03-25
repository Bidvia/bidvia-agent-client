import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLocalRuntimeCapabilitySnapshot,
} from '../src/runtime-capabilities.ts';
import type {
  BidviaLocalRuntimeCapabilitySnapshot,
} from '../src/contracts.ts';

test('buildLocalRuntimeCapabilitySnapshot derives a machine-readable local capability view from shipped facts only', () => {
  const snapshot = buildLocalRuntimeCapabilitySnapshot({
    profile: 'global',
  });

  assert.equal(snapshot.baseUrl, 'https://bidvia.ai');
  assert.equal(snapshot.environmentMode, 'production');
  assert.equal(snapshot.routeCapabilities.source, 'local-static');
  assert.equal(snapshot.routeCapabilities.items.length > 0, true);
  assert.equal(snapshot.mcpTools.source, 'local-static');
  assert.equal(snapshot.mcpTools.items.length, 9);
  assert.deepEqual(snapshot.localMcpServer, {
    source: 'local-static',
    available: true,
    transport: 'stdio',
    entrypoint: 'src/mcp-server.ts',
    supportedMethods: ['initialize', 'tools/list', 'tools/call'],
  });
});

test('buildLocalRuntimeCapabilitySnapshot keeps deferred server negotiation explicit and separate from local facts', () => {
  const snapshot: BidviaLocalRuntimeCapabilitySnapshot = buildLocalRuntimeCapabilitySnapshot({
    explicitBaseUrl: 'https://staging.bidvia.internal',
  });

  assert.equal(snapshot.environmentMode, 'sim');
  assert.deepEqual(snapshot.deferredServerNegotiation, {
    source: 'deferred-server-negotiation',
    status: 'deferred',
    serverProvidedCapabilitiesKnown: false,
  });
  assert.equal(snapshot.localMcpServer.available, true);
  assert.equal(snapshot.routeCapabilities.items.some((capability) => capability.helperKey === 'postHeartbeat'), true);
});
