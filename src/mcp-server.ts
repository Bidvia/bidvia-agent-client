import { bidviaMcpTools, dispatchMcpToolCall } from './mcp.js';

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
  return {
    jsonrpc: '2.0',
    id,
    result: {
      tools: bidviaMcpTools.map((tool) => ({
        name: tool.toolName,
        description: tool.description,
        inputSchema: tool.inputSchemaRef,
      })),
    },
  };
}

function buildToolsCallResponse(
  id: string | number | null,
  params: Record<string, unknown> | undefined,
): JsonRpcSuccessResponse {
  const toolName = typeof params?.name === 'string' ? params.name : '';
  const result = dispatchMcpToolCall({
    toolName,
    arguments: params?.arguments,
  });

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

function handleRequest(request: JsonRpcRequest): JsonRpcSuccessResponse | JsonRpcErrorResponse {
  const id = request.id ?? null;

  try {
    if (request.method === 'initialize') {
      return buildInitializeResponse(id);
    }

    if (request.method === 'tools/list') {
      return buildToolsListResponse(id);
    }

    if (request.method === 'tools/call') {
      return buildToolsCallResponse(id, request.params);
    }

    return buildMethodNotFoundResponse(id, request.method);
  } catch (error) {
    return buildInternalErrorResponse(id, error);
  }
}

export function runLocalMcpServer(
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): void {
  let buffer = '';

  input.setEncoding?.('utf8');
  input.on('data', (chunk: string | Buffer) => {
    buffer += chunk.toString();

    while (true) {
      const separatorIndex = buffer.indexOf('\r\n\r\n');
      if (separatorIndex === -1) {
        return;
      }

      const header = buffer.slice(0, separatorIndex);
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        buffer = '';
        return;
      }

      const contentLength = Number(contentLengthMatch[1]);
      const bodyStart = separatorIndex + 4;
      const body = buffer.slice(bodyStart);
      if (Buffer.byteLength(body, 'utf8') < contentLength) {
        return;
      }

      const message = JSON.parse(body.slice(0, contentLength)) as JsonRpcRequest;
      buffer = body.slice(contentLength);
      output.write(encodeFrame(handleRequest(message)));
    }
  });
}

runLocalMcpServer();
