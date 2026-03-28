import test from 'node:test';
import assert from 'node:assert/strict';

import { BidviaClient } from '../src/client.ts';

function createClient(fetchImpl: typeof fetch, timeoutMs?: number) {
  return new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    fetchImpl,
    requestPolicy: timeoutMs === undefined ? undefined : { timeoutMs },
  });
}

function createJsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function assertTransportError(error: unknown, kind: string, status?: number) {
  assert.equal(error instanceof Error, true);
  assert.equal((error as { kind?: unknown }).kind, kind);
  if (status !== undefined) {
    assert.equal((error as { status?: unknown }).status, status);
  }
  return true;
}

test('BidviaClient applies the client default timeout when a request does not override it', async () => {
  const client = createClient(async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.signal instanceof AbortSignal, true);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 30);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(init.signal?.reason);
      }, { once: true });
    });

    return createJsonResponse(200, { ok: true });
  }, 5);

  await assert.rejects(async () => {
    await client.queryProvisionalAgent('prov-agent-1');
  }, (error) => assertTransportError(error, 'timeout'));
});

test('BidviaClient lets a request override the client default timeout', async () => {
  const client = createClient(async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.signal instanceof AbortSignal, true);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 30);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(init.signal?.reason);
      }, { once: true });
    });

    return createJsonResponse(200, { ok: true });
  }, 5);

  const response = await client.queryProvisionalAgent('prov-agent-1', {
    timeoutMs: 100,
  });

  assert.deepEqual(response, { ok: true });
});

test('BidviaClient respects a caller AbortSignal and normalizes the failure as aborted', async () => {
  const controller = new AbortController();
  let fetchCallCount = 0;
  const client = new BidviaClient({
    baseUrl: 'http://127.0.0.1:8787',
    context: {
      tenantId: 'tenant-a',
    },
    auth: async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
      return {
        bearerToken: 'token-1',
      };
    },
    fetchImpl: async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCallCount += 1;
      assert.equal(init?.signal instanceof AbortSignal, true);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 30);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(init.signal?.reason);
        }, { once: true });
      });

      return createJsonResponse(200, { ok: true });
    },
  });

  const request = client.queryProvisionalAgent('prov-agent-1', {
    signal: controller.signal,
  });

  controller.abort();

  await assert.rejects(async () => {
    await request;
  }, (error) => assertTransportError(error, 'aborted'));

  assert.equal(fetchCallCount, 0);
});

test('BidviaClient normalizes transport failures and malformed responses into stable local error kinds', async (t) => {
  await t.test('preserves the message from an already-meaningful Error cause', async () => {
    const client = createClient(async () => {
      throw new Error('createListing failed');
    });

    await assert.rejects(async () => {
      await client.queryProvisionalAgent('prov-agent-1');
    }, (error) => {
      assertTransportError(error, 'unknown');
      assert.equal((error as Error).message, 'createListing failed');
      return true;
    });
  });

  await t.test('maps connection failures', async () => {
    const client = createClient(async () => {
      throw new TypeError('fetch failed');
    });

    await assert.rejects(async () => {
      await client.queryProvisionalAgent('prov-agent-1');
    }, (error) => assertTransportError(error, 'connection'));
  });

  await t.test('maps HTTP status failures', async () => {
    const cases = [
      { status: 400, kind: 'invalid_request' },
      { status: 401, kind: 'auth' },
      { status: 403, kind: 'permission' },
      { status: 404, kind: 'not_found' },
      { status: 409, kind: 'conflict' },
      { status: 429, kind: 'rate_limit' },
      { status: 500, kind: 'server' },
    ] as const;

    for (const testCase of cases) {
      const client = createClient(async () => {
        return createJsonResponse(testCase.status, {
          error: `status-${testCase.status}`,
        });
      });

      await assert.rejects(async () => {
        await client.queryProvisionalAgent('prov-agent-1');
      }, (error) => assertTransportError(error, testCase.kind, testCase.status));
    }
  });

  await t.test('maps malformed JSON responses without surfacing raw parse errors', async () => {
    const client = createClient(async () => {
      return new Response('{', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    await assert.rejects(async () => {
      await client.queryProvisionalAgent('prov-agent-1');
    }, (error) => {
      assertTransportError(error, 'unknown');
      assert.equal(error instanceof SyntaxError, false);
      return true;
    });
  });

  await t.test('maps non-JSON success responses without surfacing raw parse errors', async () => {
    const client = createClient(async () => {
      return new Response('ok', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      });
    });

    await assert.rejects(async () => {
      await client.queryProvisionalAgent('prov-agent-1');
    }, (error) => {
      assertTransportError(error, 'unknown');
      assert.equal(error instanceof SyntaxError, false);
      return true;
    });
  });
});
