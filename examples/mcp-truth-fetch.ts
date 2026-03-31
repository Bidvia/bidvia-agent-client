import { PassThrough } from 'node:stream';

import { runLocalMcpServer } from '../src/mcp-server.js';

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

async function callTool(
  input: PassThrough,
  output: PassThrough,
  id: number,
  name: string,
  argumentsPayload: Record<string, unknown>,
): Promise<unknown> {
  input.write(encodeFrame({
    jsonrpc: '2.0',
    id,
    method: 'tools/call',
    params: {
      name,
      arguments: argumentsPayload,
    },
  }));

  return await readFrame(output);
}

const input = new PassThrough();
const output = new PassThrough();

runLocalMcpServer(input, output, {
  createExecutionClient: () => ({
    async listAccountAgents() {
      return {
        items: [
          {
            registrationId: 'areg-example-1',
            displayName: 'Example Governance Agent',
          },
        ],
      };
    },
    async getAgentAuthority() {
      return {
        agentRegistrationId: 'areg-example-1',
        authorityState: 'active',
        authorityScope: ['review', 'escalate'],
      };
    },
    async listPricingBases() {
      return {
        items: [
          {
            pricingBasisId: 'basis-example-1',
            basisKind: 'spot',
            currencyCode: 'USD',
          },
        ],
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
  const initializeResponse = await readFrame(output) as {
    result: {
      protocolVersion: string;
      serverInfo: {
        name: string;
        version: string;
      };
    };
  };

  input.write(encodeFrame({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  }));
  const toolsListResponse = await readFrame(output) as {
    result: {
      tools: Array<{
        name: string;
        outputMode: string;
        routePathTemplate: string;
        accessContextFamily: string;
      }>;
    };
  };

  const governanceReadResponse = await callTool(input, output, 3, 'account-agents-read', {}) as {
    result: {
      content: Array<{ text: string }>;
    };
  };
  const governanceDetailResponse = await callTool(input, output, 4, 'agent-authority-read', {
    registrationId: 'areg-example-1',
  }) as {
    result: {
      content: Array<{ text: string }>;
    };
  };
  const businessReadResponse = await callTool(input, output, 5, 'pricing-bases-read', {}) as {
    result: {
      content: Array<{ text: string }>;
    };
  };

  console.log(JSON.stringify({
    initialize: initializeResponse.result,
    truthFetchToolsShown: toolsListResponse.result.tools
      .filter((tool) => (
        tool.name === 'account-agents-read'
        || tool.name === 'agent-authority-read'
        || tool.name === 'pricing-bases-read'
      ))
      .map((tool) => ({
        name: tool.name,
        outputMode: tool.outputMode,
        routePathTemplate: tool.routePathTemplate,
        accessContextFamily: tool.accessContextFamily,
      })),
    phaseOrder: [
      'SDK and CLI cover the wider shipped read surface',
      'MCP stays a thin local wrapper over the approved read-only subset',
    ],
    governanceFirstRead: JSON.parse(governanceReadResponse.result.content[0]!.text),
    governanceDetailRead: JSON.parse(governanceDetailResponse.result.content[0]!.text),
    businessTruthRead: JSON.parse(businessReadResponse.result.content[0]!.text),
    notes: [
      'This example stays repo-local and uses injected read-only dependencies.',
      'The MCP server here is local stdio only and wraps shipped SDK truth-fetch helpers.',
      'For the operator handoff, start with openclaw-mcp-config and then confirm route-context-matrix.',
      'tools/list exposes discovery metadata so operators can inspect route and access-context expectations locally.',
      'No live credentials, hosted MCP service, login, or remote discovery are required by default.',
    ],
  }, null, 2));
} finally {
  input.end();
  output.end();
}
