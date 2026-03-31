import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BidviaClient } from './client.js';
import { resolveBidviaBaseUrlFromEnv } from './config.js';
import { buildLocalMcpProductizationSnapshot } from './discovery-catalog.js';
import { dispatchMcpToolCall } from './mcp.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result: unknown;
}

interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
  };
}

export function shouldRunLocalMcpServerMain(argvEntry: string | undefined, moduleUrl: string): boolean {
  if (!argvEntry) {
    return false;
  }

  return path.resolve(argvEntry) === fileURLToPath(moduleUrl);
}

export type BidviaLocalMcpServerDependencies = {
  createExecutionClient: () => BidviaClient;
};

function encodeFrame(message: JsonRpcSuccessResponse | JsonRpcErrorResponse): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`;
}

function buildInitializeResponse(id: string | number | null): JsonRpcSuccessResponse {
  return {
    jsonrpc: '2.0',
    id,
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
  };
}

function buildToolsListResponse(id: string | number | null): JsonRpcSuccessResponse {
  const productizationSnapshot = buildLocalMcpProductizationSnapshot();

  return {
    jsonrpc: '2.0',
    id,
    result: {
      serverBoundary: productizationSnapshot.serverBoundary,
      discoverability: productizationSnapshot.discoverability,
      tools: productizationSnapshot.tools.map((tool) => ({
        name: tool.toolName,
        description: tool.description,
        inputSchema: tool.inputSchemaRef,
        outputMode: tool.outputMode,
        helperRef: tool.helperRef,
        routePathTemplate: tool.routePathTemplate,
        httpMethod: tool.httpMethod,
        scope: tool.scope,
        level: tool.level,
        localCapabilityTier: tool.localCapabilityTier,
        localCapabilityRiskTier: tool.localCapabilityRiskTier,
        accessContextFamily: tool.accessContextFamily,
        requiredContext: tool.requiredContext,
      })),
    },
  };
}

async function buildToolsCallResponse(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
  dependencies: BidviaLocalMcpServerDependencies,
): Promise<JsonRpcSuccessResponse> {
  const toolName = typeof params?.name === 'string' ? params.name : '';
  const result = await dispatchMcpToolCall(
    {
      toolName,
      arguments: params?.arguments,
    },
    {
      createExecutionClient: dependencies.createExecutionClient,
    },
  );

  return {
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    },
  };
}

function createDefaultExecutionClient(): BidviaClient {
  return new BidviaClient({
    baseUrl: resolveBidviaBaseUrlFromEnv(),
    context: {
      tenantId: process.env.BIDVIA_TENANT_ID ?? 'tenant-a',
      principalId: process.env.BIDVIA_PRINCIPAL_ID,
      registrationId: process.env.BIDVIA_REGISTRATION_ID,
      sessionId: process.env.BIDVIA_SESSION_ID,
      adminSessionId: process.env.BIDVIA_ADMIN_SESSION_ID,
      companyId: process.env.BIDVIA_COMPANY_ID,
    },
  });
}

function buildMethodNotFoundResponse(id: string | number | null, method: string): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `method not found: ${method}`,
    },
  };
}

function buildInternalErrorResponse(id: string | number | null, error: unknown): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32000,
      message: error instanceof Error ? error.message : 'internal error',
    },
  };
}

async function handleRequest(
  request: JsonRpcRequest,
  dependencies: BidviaLocalMcpServerDependencies,
): Promise<JsonRpcSuccessResponse | JsonRpcErrorResponse> {
  const id = request.id ?? null;

  try {
    if (request.method === 'initialize') {
      return buildInitializeResponse(id);
    }

    if (request.method === 'tools/list') {
      return buildToolsListResponse(id);
    }

    if (request.method === 'tools/call') {
      return await buildToolsCallResponse(id, request.params, dependencies);
    }

    return buildMethodNotFoundResponse(id, request.method);
  } catch (error) {
    return buildInternalErrorResponse(id, error);
  }
}

export function runLocalMcpServer(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
  dependencies: BidviaLocalMcpServerDependencies = {
    createExecutionClient: createDefaultExecutionClient,
  },
): void {
  let buffer = Buffer.alloc(0);
  const frameSeparator = Buffer.from('\r\n\r\n', 'utf8');

  input.on('data', (chunk: string | Buffer) => {
    const chunkBuffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
    buffer = Buffer.concat([buffer, chunkBuffer]);

    while (true) {
      const separatorIndex = buffer.indexOf(frameSeparator);
      if (separatorIndex === -1) {
        return;
      }

      const header = buffer.subarray(0, separatorIndex).toString('utf8');
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        buffer = Buffer.alloc(0);
        return;
      }

      const contentLength = Number(contentLengthMatch[1]);
      const bodyStart = separatorIndex + 4;
      const frameLength = bodyStart + contentLength;
      if (buffer.length < frameLength) {
        return;
      }

      const message = JSON.parse(
        buffer.subarray(bodyStart, frameLength).toString('utf8'),
      ) as JsonRpcRequest;
      buffer = buffer.subarray(frameLength);
      void handleRequest(message, dependencies).then((response) => {
        output.write(encodeFrame(response));
      });
    }
  });
}

export function runLocalMcpServerMain(): void {
  runLocalMcpServer();
}

if (shouldRunLocalMcpServerMain(process.argv[1], import.meta.url)) {
  runLocalMcpServerMain();
}
