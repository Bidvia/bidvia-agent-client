import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import packageJson from '../package.json' with { type: 'json' };

import { BidviaClient } from '../src/client.ts';
import { runLocalMcpServer } from '../src/mcp-server.ts';

const expectedMcpServerToolNames = [
  'industry-universe-plan-preview',
  'industry-universe-review-packet-preview',
  'industry-universe-review-packet-export',
  'connection-approval-plan-preview',
  'connection-approval-review-packet-preview',
  'connection-approval-review-packet-export',
  'opportunity-package-handoff-plan-preview',
  'opportunity-package-handoff-review-packet-preview',
  'opportunity-package-handoff-review-packet-export',
  'account-agents-read',
  'account-agent-bindings-read',
  'account-records-read',
  'agent-presence-read',
  'agent-authority-read',
  'canonical-semantic-concepts-read',
  'canonical-semantic-concept-read',
  'pricing-bases-read',
  'pricing-basis-read',
  'document-artifacts-read',
  'document-artifact-read',
  'media-assets-read',
  'media-asset-read',
  'evidence-assets-read',
  'evidence-asset-read',
  'attachment-bindings-read',
  'attachment-binding-read',
  'heartbeat-execution',
  'sync-upload-execution',
  'evidence-execution',
  'proposal-execution',
  'query-provisional-agent-read',
  'agent-readiness-read',
  'agent-summary-read',
  'agent-registrations-read',
  'agent-registration-read',
  'authority-profiles-read',
  'agent-authority-profile-read',
  'agent-authority-ladder-read',
  'capability-profiles-read',
  'agent-capability-profile-read',
  'participation-states-read',
  'participation-state-read',
  'task-dispatches-read',
  'task-dispatch-read',
  'notification-read',
  'acknowledge-notification-execution',
  'create-provisional-agent-execution',
  'claim-provisional-agent-execution',
  'download-sync-execution',
  'create-participation-state-execution',
  'create-lease-execution',
  'create-task-dispatch-execution',
  'assign-task-dispatch-execution',
  'suspend-task-dispatch-execution',
  'resume-task-dispatch-execution',
  'complete-task-dispatch-execution',
  'fail-task-dispatch-execution',
  'create-claim-execution',
  'accept-claim-execution',
  'reject-claim-execution',
  'agent-authority-profile-write-execution',
  'agent-authority-ladder-write-execution',
  'agent-capability-profile-write-execution',
  'create-commercial-action-execution',
  'request-commercial-action-approval-execution',
  'execute-commercial-action-execution',
] as const;

const runLocalMcpServerWithDependencies = runLocalMcpServer as unknown as (
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  dependencies: {
    createExecutionClient: () => unknown;
  },
) => void;

function encodeFrame(message: unknown): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

async function readFrame(stream: NodeJS.ReadableStream): Promise<unknown> {
  let buffer = '';

  return await new Promise((resolve, reject) => {
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const separatorIndex = buffer.indexOf('\r\n\r\n');
      if (separatorIndex === -1) {
        return;
      }

      const header = buffer.slice(0, separatorIndex);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        cleanup();
        reject(new Error('missing Content-Length header'));
        return;
      }

      const contentLength = Number(match[1]);
      const body = buffer.slice(separatorIndex + 4);
      if (Buffer.byteLength(body, 'utf8') < contentLength) {
        return;
      }

      cleanup();
      resolve(JSON.parse(body.slice(0, contentLength)));
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onEnd = () => {
      cleanup();
      reject(new Error('stream ended before a complete frame was received'));
    };

    const cleanup = () => {
      stream.off('data', onData);
      stream.off('error', onError);
      stream.off('end', onEnd);
      stream.off('close', onEnd);
    };

    stream.on('data', onData);
    stream.on('error', onError);
    stream.on('end', onEnd);
    stream.on('close', onEnd);
  });
}

function createIndustryUniverseArguments() {
  return {
    scenarioId: 'scenario-industry-universe-1',
    scenarioLabel: 'industry-universe-soda-ash-light',
    sourceRefs: ['source://market/soda-ash-light'],
    evidenceRefs: ['evidence://supply/soda-ash-light'],
    traceIds: ['trace-1'],
    workflowIds: ['wf-1'],
    createListing: {
      listingId: 'listing-1',
      listingType: 'supply',
      category: 'basic inorganic industrial chemical',
      sku: 'sodium-carbonate-soda-ash-light',
      quantityValue: '15',
      quantityUnit: 'tons',
      regionSummary: 'China -> Vietnam',
      verificationStatus: 'verified',
      freshnessTs: '2026-03-27T10:00:00Z',
      traceId: 'trace-1',
      idempotencyKey: 'listing-1',
      now: '2026-03-27T10:00:00Z',
    },
    activateListing: {
      now: '2026-03-27T10:01:00Z',
    },
    generateMatchCandidates: {
      upstreamDecision: 'READY_FOR_ROUTING',
      requiredEvidenceLevel: 1,
      detectedEvidenceLevel: 1,
      workflowRunId: 'wf-1',
      triggerEventId: 'evt-1',
      topN: 10,
      now: '2026-03-27T10:02:00Z',
    },
  };
}

test('local MCP stdio server exposes bounded tool metadata and handles review-safe and execution calls', async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  runLocalMcpServerWithDependencies(input, output, {
    createExecutionClient: () => ({
      async postHeartbeat(receivedInput: { expiresAt: string }) {
        return {
          ok: true,
          route: 'heartbeat',
          expiresAt: receivedInput.expiresAt,
        };
      },
    }) as never,
  });

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    }));
    const initializeResponse = await readFrame(output);
    assert.deepEqual(initializeResponse, {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: '@bidvia/client',
          version: packageJson.version,
        },
        capabilities: {
          tools: {},
        },
      },
    });

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    }));
    const listResponse = await readFrame(output) as {
      result: {
        serverBoundary: {
          transport: string;
          hosted: boolean;
          remoteDiscovery: boolean;
          sourceOfTruth: string;
        };
        discoverability: {
          truthFetchReadOnly: boolean;
          reviewSafeLocalOnly: boolean;
          executionRequiresLocalExecutionClient: boolean;
        };
        tools: Array<{
          name: string;
          outputMode: string;
          routePathTemplate: string;
          httpMethod: string;
          scope: string;
          level: string;
          localCapabilityTier: string;
          localCapabilityRiskTier: string;
          accessContextFamily: string;
          requiredContext: string[];
          runnable: boolean;
          blockedBy: string | null;
        }>;
      };
    };
    assert.deepEqual(listResponse.result.serverBoundary, {
      transport: 'stdio',
      hosted: false,
      remoteDiscovery: false,
      sourceOfTruth: 'local-sdk-helpers',
    });
    assert.deepEqual(listResponse.result.discoverability, {
      truthFetchReadOnly: true,
      reviewSafeLocalOnly: true,
      executionRequiresLocalExecutionClient: true,
    });
    assert.deepEqual(listResponse.result.tools.map((tool) => tool.name), expectedMcpServerToolNames);
    assert.deepEqual(
      listResponse.result.tools.find((tool) => tool.name === 'heartbeat-execution'),
      {
        name: 'heartbeat-execution',
        description: 'Executes the real remote heartbeat over the local registration-bound client seam.',
        inputSchema: {
          schemaKey: 'BidviaHeartbeatInput',
        },
        outputMode: 'execution-result',
        helperRef: {
          helperKey: 'heartbeat-execution',
          capabilityKey: 'postHeartbeat',
        },
        routePathTemplate: '/runtime/agents/:registrationId/heartbeat',
        httpMethod: 'POST',
        scope: 'write',
        level: 'atomic-route',
        localCapabilityTier: 'L2-registration-runtime',
        localCapabilityRiskTier: 'runtime-execution',
        accessContextFamily: 'registration',
        requiredContext: ['tenantId', 'registrationId', 'principalId'],
        runnable: true,
        blockedBy: null,
      },
    );

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'industry-universe-review-packet-export',
        arguments: createIndustryUniverseArguments(),
      },
    }));
    const callResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const callPayload = JSON.parse(callResponse.result.content[0]!.text);
    assert.equal(callPayload.toolName, 'industry-universe-review-packet-export');
    assert.equal(callPayload.outputMode, 'review-packet-export');
    assert.equal(callPayload.result.exportedReviewPacket.scenarioFamily, 'industry-universe');

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'heartbeat-execution',
        arguments: {
          now: '2026-03-29T10:00:00Z',
          expiresAt: '2026-03-29T10:05:00Z',
        },
      },
    }));
    const executionResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const executionPayload = JSON.parse(executionResponse.result.content[0]!.text);
    assert.equal(executionPayload.toolName, 'heartbeat-execution');
    assert.equal(executionPayload.outputMode, 'execution-result');
    assert.deepEqual(executionPayload.result.executionResult, {
      ok: true,
      route: 'heartbeat',
      expiresAt: '2026-03-29T10:05:00Z',
    });

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'missing-tool',
        arguments: {},
      },
    }));
    const errorResponse = await readFrame(output);
    assert.deepEqual(errorResponse, {
      jsonrpc: '2.0',
      id: 5,
      error: {
        code: -32000,
        message: 'unknown MCP tool: missing-tool',
      },
    });
  } finally {
    input.end();
    output.end();
  }
});

test('local MCP stdio server parses byte-accurate UTF-8 frames when requests arrive back-to-back', async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  runLocalMcpServerWithDependencies(input, output, {
    createExecutionClient: () => ({}) as never,
  });

  try {
    const initializeRequest = encodeFrame({
      jsonrpc: '2.0',
      id: 101,
      method: 'initialize',
      params: {
        clientInfo: {
          name: '本地🧪client',
        },
      },
    });
    const toolsListRequest = encodeFrame({
      jsonrpc: '2.0',
      id: 102,
      method: 'tools/list',
      params: {},
    });

    input.write(initializeRequest + toolsListRequest);

    const initializeResponse = await readFrame(output) as {
      jsonrpc: string;
      id: number;
      result: {
        protocolVersion: string;
      };
    };
    assert.equal(initializeResponse.jsonrpc, '2.0');
    assert.equal(initializeResponse.id, 101);
    assert.equal(initializeResponse.result.protocolVersion, '2024-11-05');

    const listResponse = await readFrame(output) as {
      jsonrpc: string;
      id: number;
      result: {
        tools: Array<{ name: string }>;
      };
    };
    assert.equal(listResponse.jsonrpc, '2.0');
    assert.equal(listResponse.id, 102);
    assert.ok(listResponse.result.tools.some((tool) => tool.name === 'heartbeat-execution'));
  } finally {
    input.end();
    output.end();
  }
});

test('local MCP stdio server uses an explicit execution client dependency ahead of env-backed defaults', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const originalEnv = {
    BIDVIA_BASE_URL: process.env.BIDVIA_BASE_URL,
    BIDVIA_TENANT_ID: process.env.BIDVIA_TENANT_ID,
  };

  process.env.BIDVIA_BASE_URL = 'https://bidvia.ai';
  process.env.BIDVIA_TENANT_ID = 'tenant-from-env';

  let createExecutionClientCalls = 0;

  runLocalMcpServerWithDependencies(input, output, {
    createExecutionClient: () => {
      createExecutionClientCalls += 1;

      return {
        async listMediaAssets() {
          return {
            items: [{ mediaAssetId: 'media-from-override' }],
          };
        },
      };
    },
  });

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 150,
      method: 'tools/call',
      params: {
        name: 'media-assets-read',
        arguments: {},
      },
    }));
    const response = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const payload = JSON.parse(response.result.content[0]!.text);

    assert.equal(createExecutionClientCalls, 1);
    assert.deepEqual(payload.result, {
      truthFetchResult: {
        items: [{ mediaAssetId: 'media-from-override' }],
      },
    });
  } finally {
    input.end();
    output.end();

    if (originalEnv.BIDVIA_BASE_URL === undefined) {
      delete process.env.BIDVIA_BASE_URL;
    } else {
      process.env.BIDVIA_BASE_URL = originalEnv.BIDVIA_BASE_URL;
    }

    if (originalEnv.BIDVIA_TENANT_ID === undefined) {
      delete process.env.BIDVIA_TENANT_ID;
    } else {
      process.env.BIDVIA_TENANT_ID = originalEnv.BIDVIA_TENANT_ID;
    }
  }
});

test('local MCP stdio server default execution client supports governance truth-fetch session and principal-governed reads from env context', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const originalEnv = {
    BIDVIA_BASE_URL: process.env.BIDVIA_BASE_URL,
    BIDVIA_TENANT_ID: process.env.BIDVIA_TENANT_ID,
    BIDVIA_PRINCIPAL_ID: process.env.BIDVIA_PRINCIPAL_ID,
    BIDVIA_SESSION_ID: process.env.BIDVIA_SESSION_ID,
    BIDVIA_ADMIN_SESSION_ID: process.env.BIDVIA_ADMIN_SESSION_ID,
  };
  const originalListAccountAgents = BidviaClient.prototype.listAccountAgents;
  const originalGetAgentPresence = BidviaClient.prototype.getAgentPresence;

  process.env.BIDVIA_BASE_URL = 'https://api.bidvia.test';
  process.env.BIDVIA_TENANT_ID = 'tenant-governance';
  process.env.BIDVIA_PRINCIPAL_ID = 'principal-governance';
  process.env.BIDVIA_SESSION_ID = 'session-governance';
  process.env.BIDVIA_ADMIN_SESSION_ID = 'admin-session-governance';

  const seenContexts: Array<{
      helper: string;
      tenantId?: string;
      principalId?: string;
      sessionId?: string;
      adminSessionId?: string;
      registrationId?: string;
  }> = [];

  BidviaClient.prototype.listAccountAgents = async function listAccountAgentsStub() {
    const clientContext = (this as unknown as { options: { context: typeof process.env } }).options.context;
      seenContexts.push({
        helper: 'listAccountAgents',
        tenantId: clientContext.tenantId,
        principalId: clientContext.principalId,
        sessionId: clientContext.sessionId,
        adminSessionId: clientContext.adminSessionId,
      });
    return {
      items: [{ registrationId: 'areg-1' }],
    };
  };

  BidviaClient.prototype.getAgentPresence = async function getAgentPresenceStub(registrationId: string) {
    const clientContext = (this as unknown as { options: { context: typeof process.env } }).options.context;
      seenContexts.push({
        helper: 'getAgentPresence',
        tenantId: clientContext.tenantId,
        principalId: clientContext.principalId,
        sessionId: clientContext.sessionId,
        adminSessionId: clientContext.adminSessionId,
        registrationId,
    });
    return {
      registrationId,
      status: 'online',
    };
  };

  runLocalMcpServer(input, output);

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 201,
      method: 'tools/call',
      params: {
        name: 'account-agents-read',
        arguments: {},
      },
    }));
    const accountAgentsResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const accountAgentsPayload = JSON.parse(accountAgentsResponse.result.content[0]!.text);
    assert.deepEqual(accountAgentsPayload.result, {
      truthFetchResult: {
        items: [{ registrationId: 'areg-1' }],
      },
    });

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 202,
      method: 'tools/call',
      params: {
        name: 'agent-presence-read',
        arguments: {
          registrationId: 'areg-99',
        },
      },
    }));
    const presenceResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const presencePayload = JSON.parse(presenceResponse.result.content[0]!.text);
    assert.deepEqual(presencePayload.result, {
      truthFetchResult: {
        registrationId: 'areg-99',
        status: 'online',
      },
    });

    assert.deepEqual(seenContexts, [
      {
        helper: 'listAccountAgents',
        tenantId: 'tenant-governance',
        principalId: 'principal-governance',
        sessionId: 'session-governance',
        adminSessionId: 'admin-session-governance',
      },
      {
        helper: 'getAgentPresence',
        tenantId: 'tenant-governance',
        principalId: 'principal-governance',
        sessionId: 'session-governance',
        adminSessionId: 'admin-session-governance',
        registrationId: 'areg-99',
      },
    ]);
  } finally {
    BidviaClient.prototype.listAccountAgents = originalListAccountAgents;
    BidviaClient.prototype.getAgentPresence = originalGetAgentPresence;
    input.end();
    output.end();

    if (originalEnv.BIDVIA_BASE_URL === undefined) {
      delete process.env.BIDVIA_BASE_URL;
    } else {
      process.env.BIDVIA_BASE_URL = originalEnv.BIDVIA_BASE_URL;
    }

    if (originalEnv.BIDVIA_TENANT_ID === undefined) {
      delete process.env.BIDVIA_TENANT_ID;
    } else {
      process.env.BIDVIA_TENANT_ID = originalEnv.BIDVIA_TENANT_ID;
    }

    if (originalEnv.BIDVIA_PRINCIPAL_ID === undefined) {
      delete process.env.BIDVIA_PRINCIPAL_ID;
    } else {
      process.env.BIDVIA_PRINCIPAL_ID = originalEnv.BIDVIA_PRINCIPAL_ID;
    }

    if (originalEnv.BIDVIA_SESSION_ID === undefined) {
      delete process.env.BIDVIA_SESSION_ID;
    } else {
      process.env.BIDVIA_SESSION_ID = originalEnv.BIDVIA_SESSION_ID;
    }

    if (originalEnv.BIDVIA_ADMIN_SESSION_ID === undefined) {
      delete process.env.BIDVIA_ADMIN_SESSION_ID;
    } else {
      process.env.BIDVIA_ADMIN_SESSION_ID = originalEnv.BIDVIA_ADMIN_SESSION_ID;
    }
  }
});

test('local MCP stdio server default execution client supports business truth-fetch collection reads from tenant env context', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const originalEnv = {
    BIDVIA_BASE_URL: process.env.BIDVIA_BASE_URL,
    BIDVIA_TENANT_ID: process.env.BIDVIA_TENANT_ID,
  };
  const originalListMediaAssets = BidviaClient.prototype.listMediaAssets;

  process.env.BIDVIA_BASE_URL = 'https://api.bidvia.test';
  process.env.BIDVIA_TENANT_ID = 'tenant-business';

  const seenContexts: Array<{
    helper: string;
    tenantId?: string;
    sessionId?: string;
    adminSessionId?: string;
  }> = [];

  BidviaClient.prototype.listMediaAssets = async function listMediaAssetsStub() {
    const clientContext = (this as unknown as { options: { context: typeof process.env } }).options.context;
    seenContexts.push({
      helper: 'listMediaAssets',
      tenantId: clientContext.tenantId,
      sessionId: clientContext.sessionId,
      adminSessionId: clientContext.adminSessionId,
    });
    return {
      items: [{ mediaAssetId: 'media-tenant-1' }],
    };
  };

  runLocalMcpServer(input, output);

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 301,
      method: 'tools/call',
      params: {
        name: 'media-assets-read',
        arguments: {},
      },
    }));
    const mediaAssetsResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const mediaAssetsPayload = JSON.parse(mediaAssetsResponse.result.content[0]!.text);
    assert.deepEqual(mediaAssetsPayload.result, {
      truthFetchResult: {
        items: [{ mediaAssetId: 'media-tenant-1' }],
      },
    });
    assert.deepEqual(seenContexts, [
      {
        helper: 'listMediaAssets',
        tenantId: 'tenant-business',
        sessionId: undefined,
        adminSessionId: undefined,
      },
    ]);
  } finally {
    BidviaClient.prototype.listMediaAssets = originalListMediaAssets;
    input.end();
    output.end();

    if (originalEnv.BIDVIA_BASE_URL === undefined) {
      delete process.env.BIDVIA_BASE_URL;
    } else {
      process.env.BIDVIA_BASE_URL = originalEnv.BIDVIA_BASE_URL;
    }

    if (originalEnv.BIDVIA_TENANT_ID === undefined) {
      delete process.env.BIDVIA_TENANT_ID;
    } else {
      process.env.BIDVIA_TENANT_ID = originalEnv.BIDVIA_TENANT_ID;
    }
  }
});

test('local MCP stdio server default execution client supports business truth-fetch detail reads from tenant env context', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const originalEnv = {
    BIDVIA_BASE_URL: process.env.BIDVIA_BASE_URL,
    BIDVIA_TENANT_ID: process.env.BIDVIA_TENANT_ID,
  };
  const originalGetMediaAsset = BidviaClient.prototype.getMediaAsset;

  process.env.BIDVIA_BASE_URL = 'https://api.bidvia.test';
  process.env.BIDVIA_TENANT_ID = 'tenant-business-detail';

  const seenContexts: Array<{
    helper: string;
    tenantId?: string;
    sessionId?: string;
    adminSessionId?: string;
    mediaAssetId?: string;
  }> = [];

  BidviaClient.prototype.getMediaAsset = async function getMediaAssetStub(mediaAssetId: string) {
    const clientContext = (this as unknown as { options: { context: typeof process.env } }).options.context;
    seenContexts.push({
      helper: 'getMediaAsset',
      tenantId: clientContext.tenantId,
      sessionId: clientContext.sessionId,
      adminSessionId: clientContext.adminSessionId,
      mediaAssetId,
    });
    return {
      mediaAssetId,
    };
  };

  runLocalMcpServer(input, output);

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 401,
      method: 'tools/call',
      params: {
        name: 'media-asset-read',
        arguments: {
          mediaAssetId: 'media-detail-1',
        },
      },
    }));
    const mediaAssetResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const mediaAssetPayload = JSON.parse(mediaAssetResponse.result.content[0]!.text);
    assert.deepEqual(mediaAssetPayload.result, {
      truthFetchResult: {
        mediaAssetId: 'media-detail-1',
      },
    });
    assert.deepEqual(seenContexts, [
      {
        helper: 'getMediaAsset',
        tenantId: 'tenant-business-detail',
        sessionId: undefined,
        adminSessionId: undefined,
        mediaAssetId: 'media-detail-1',
      },
    ]);
  } finally {
    BidviaClient.prototype.getMediaAsset = originalGetMediaAsset;
    input.end();
    output.end();

    if (originalEnv.BIDVIA_BASE_URL === undefined) {
      delete process.env.BIDVIA_BASE_URL;
    } else {
      process.env.BIDVIA_BASE_URL = originalEnv.BIDVIA_BASE_URL;
    }

    if (originalEnv.BIDVIA_TENANT_ID === undefined) {
      delete process.env.BIDVIA_TENANT_ID;
    } else {
      process.env.BIDVIA_TENANT_ID = originalEnv.BIDVIA_TENANT_ID;
    }
  }
});

test('local MCP stdio server dispatches widened Task 2 execution helpers and returns actionable missing-context remediation', async () => {
  const input = new PassThrough();
  const output = new PassThrough();

  runLocalMcpServerWithDependencies(input, output, {
    createExecutionClient: () => ({
      options: {
        context: {
          tenantId: 'tenant-a',
        },
      },
      async createProvisionalAgent(receivedInput: { displayName: string }) {
        return {
          ok: true,
          route: 'create-provisional-agent',
          displayName: receivedInput.displayName,
        };
      },
    }) as never,
  });

  try {
    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 501,
      method: 'tools/call',
      params: {
        name: 'create-provisional-agent-execution',
        arguments: {
          displayName: 'Operator Seed Agent',
        },
      },
    }));
    const successResponse = await readFrame(output) as { result: { content: Array<{ text: string }> } };
    const successPayload = JSON.parse(successResponse.result.content[0]!.text);
    assert.deepEqual(successPayload.result, {
      executionResult: {
        ok: true,
        route: 'create-provisional-agent',
        displayName: 'Operator Seed Agent',
      },
    });

    input.write(encodeFrame({
      jsonrpc: '2.0',
      id: 502,
      method: 'tools/call',
      params: {
        name: 'create-commercial-action-execution',
        arguments: {
          commercialActionId: 'commercial-action-1',
        },
      },
    }));
    const remediationResponse = await readFrame(output);
    assert.deepEqual(remediationResponse, {
      jsonrpc: '2.0',
      id: 502,
      error: {
        code: -32000,
        message: 'MCP tool create-commercial-action-execution is missing required local execution context: principalId, companyId. Use bidvia route-context-matrix to confirm the next Bidvia context family, then set BIDVIA_PRINCIPAL_ID and BIDVIA_COMPANY_ID before retrying this local stdio MCP tool.',
      },
    });
  } finally {
    input.end();
    output.end();
  }
});
