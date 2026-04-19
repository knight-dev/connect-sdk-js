import { describe, it, expect, vi } from 'vitest';
import {
  LogicwareConnect,
  LogicwareApiError,
  LogicwareNetworkError,
  SDK_VERSION
} from '../../src/index.js';

describe('LogicwareConnect scaffold', () => {
  it('exposes a SDK_VERSION string matching package.json', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    expect(LogicwareConnect.VERSION).toBe(SDK_VERSION);
  });

  it('constructs with apiKey + baseUrl', () => {
    const client = new LogicwareConnect({
      apiKey: 'sk_test_xyz',
      baseUrl: 'https://dev-api.logicware.app'
    });
    expect(client).toBeInstanceOf(LogicwareConnect);
  });

  it('rejects missing apiKey', () => {
    expect(() => new LogicwareConnect({ apiKey: '', baseUrl: 'https://x' }))
      .toThrowError(/apiKey/);
  });

  it('rejects missing baseUrl', () => {
    expect(() => new LogicwareConnect({ apiKey: 'k', baseUrl: '' }))
      .toThrowError(/baseUrl/);
  });
});

describe('HttpClient request path', () => {
  it('sends X-Api-Key, User-Agent, and JSON Accept header on every call', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { ok: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const client = new LogicwareConnect({
      apiKey: 'sk_test_xyz',
      baseUrl: 'https://dev-api.logicware.app',
      fetch: fetchSpy
    });

    await client.http.request({ method: 'GET', path: '/api/v1/warehouses' });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://dev-api.logicware.app/api/v1/warehouses');
    const headers = (init!.headers as Record<string, string>);
    expect(headers['X-Api-Key']).toBe('sk_test_xyz');
    expect(headers['Accept']).toBe('application/json');
    expect(headers['User-Agent']).toMatch(/@logicware\/connect-sdk\/\d+\.\d+\.\d+/);
  });

  it('serialises JSON body and sets Content-Type for mutating methods', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 201 })
    );
    const client = new LogicwareConnect({
      apiKey: 'k',
      baseUrl: 'https://x',
      fetch: fetchSpy
    });

    await client.http.request({
      method: 'POST',
      path: '/api/v1/shippers',
      body: { email: 'a@b.com' }
    });

    const init = fetchSpy.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ email: 'a@b.com' }));
  });

  it('encodes query parameters, skipping undefined/null', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response('{}', { status: 200 })
    );
    const client = new LogicwareConnect({
      apiKey: 'k',
      baseUrl: 'https://x',
      fetch: fetchSpy
    });

    await client.http.request({
      method: 'GET',
      path: '/api/v1/shippers',
      query: { search: 'acme', page: 2, archived: null, cursor: undefined }
    });

    const url = fetchSpy.mock.calls[0]![0] as string;
    expect(url).toBe('https://x/api/v1/shippers?search=acme&page=2');
  });

  it('throws LogicwareApiError with status/code/message/requestId on 4xx', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, code: 'SHIPPER_CODE_CONFLICT', message: 'already taken' }),
        { status: 422, headers: { 'x-request-id': 'req_abc123' } }
      )
    );
    const client = new LogicwareConnect({
      apiKey: 'k',
      baseUrl: 'https://x',
      fetch: fetchSpy
    });

    await expect(client.http.request({ method: 'POST', path: '/api/v1/shippers/bulk', body: [] }))
      .rejects.toMatchObject({
        name: 'LogicwareApiError',
        status: 422,
        code: 'SHIPPER_CODE_CONFLICT',
        message: 'already taken',
        requestId: 'req_abc123'
      });
  });

  it('retries 429 up to maxAttempts and succeeds on the retry', async () => {
    let calls = 0;
    const fetchSpy = vi.fn<typeof fetch>().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        return new Response('{"message":"slow down"}', {
          status: 429,
          headers: { 'retry-after': '0' }
        });
      }
      return new Response('{"ok":true}', { status: 200 });
    });

    const client = new LogicwareConnect({
      apiKey: 'k',
      baseUrl: 'https://x',
      fetch: fetchSpy,
      retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10 }
    });

    const result = await client.http.request<{ ok: boolean }>({ method: 'GET', path: '/x' });
    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('wraps network failures in LogicwareNetworkError', async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = new LogicwareConnect({
      apiKey: 'k',
      baseUrl: 'https://x',
      fetch: fetchSpy,
      retry: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1 }
    });

    await expect(client.http.request({ method: 'GET', path: '/x' }))
      .rejects.toBeInstanceOf(LogicwareNetworkError);
  });

  it('retryable flag is true for 429 and 5xx, false otherwise', () => {
    const err429 = new LogicwareApiError({ status: 429, message: 'x' });
    const err500 = new LogicwareApiError({ status: 500, message: 'x' });
    const err404 = new LogicwareApiError({ status: 404, message: 'x' });
    expect(err429.retryable).toBe(true);
    expect(err500.retryable).toBe(true);
    expect(err404.retryable).toBe(false);
  });
});
