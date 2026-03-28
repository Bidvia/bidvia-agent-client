import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';

import { runLocalMcpServer } from '../src/mcp-server.ts';

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
          name: 'bidvia-agent-client',
          version: '0.1.0',
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
        tools: Array<{
          name: string;
          outputMode: string;
          localCapabilityTier: string;
          localCapabilityRiskTier: string;
          accessContextFamily: string;
          requiredContext: string[];
        }>;
      };
    };
    assert.deepEqual(listResponse.result.tools.map((tool) => tool.name), [
      'industry-universe-plan-preview',
      'industry-universe-review-packet-preview',
      'industry-universe-review-packet-export',
      'connection-approval-plan-preview',
      'connection-approval-review-packet-preview',
      'connection-approval-review-packet-export',
      'opportunity-package-handoff-plan-preview',
      'opportunity-package-handoff-review-packet-preview',
      'opportunity-package-handoff-review-packet-export',
      'heartbeat-execution',
      'sync-upload-execution',
      'evidence-execution',
      'proposal-execution',
    ]);
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
        localCapabilityTier: 'L2-registration-runtime',
        localCapabilityRiskTier: 'runtime-execution',
        accessContextFamily: 'registration',
        requiredContext: ['tenantId', 'registrationId', 'principalId'],
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
