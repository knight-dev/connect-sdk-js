import { LogicwareApiError, LogicwareNetworkError } from './errors.js';
import { decideRetry, delay, type RetryOptions } from './retry.js';
import { SDK_NAME, SDK_VERSION } from '../version.js';

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  /** Custom fetch (tests, Node < 20 polyfill, instrumentation). Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Per-request timeout in ms. Default 30_000. */
  timeoutMs?: number;
  /** Retry policy. Applied to 429/5xx automatically. */
  retry?: RetryOptions;
  /** Extra User-Agent suffix (e.g. consumer's app name). */
  userAgentSuffix?: string;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Per-request header overrides. */
  headers?: Record<string, string>;
  /** Idempotency-Key — propagated for safe retries on non-GET. */
  idempotencyKey?: string;
  /** Passes through a client-generated X-Request-Id so logs can correlate. */
  requestId?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRY = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8_000 };

/**
 * Thin fetch wrapper. Handles auth, JSON encoding/decoding, 429/5xx retry
 * with exponential backoff, and uniform error shaping. Never throws raw Fetch
 * errors — callers catch LogicwareApiError or LogicwareNetworkError only.
 */
export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retry: Required<RetryOptions>;
  private readonly userAgent: string;

  constructor(opts: HttpClientOptions) {
    if (!opts.apiKey) throw new Error('HttpClient: apiKey is required');
    if (!opts.baseUrl) throw new Error('HttpClient: baseUrl is required');

    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retry = { ...DEFAULT_RETRY, ...(opts.retry ?? {}) };
    this.userAgent = opts.userAgentSuffix
      ? `${SDK_NAME}/${SDK_VERSION} ${opts.userAgentSuffix}`
      : `${SDK_NAME}/${SDK_VERSION}`;

    if (!this.fetchImpl) {
      throw new Error(
        'HttpClient: no fetch implementation found. Pass opts.fetch on Node < 20.'
      );
    }
  }

  public async request<T>(opts: RequestOptions): Promise<T> {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;
      const { response, error } = await this.attempt(opts);

      if (error) {
        if (attempt < this.retry.maxAttempts && isNetworkRetryable(error)) {
          const wait = this.retry.baseDelayMs * Math.pow(2, attempt - 1);
          await delay(Math.min(wait, this.retry.maxDelayMs));
          continue;
        }
        throw error;
      }

      if (response.ok) {
        return (await parseJson<T>(response))!;
      }

      const apiErr = await buildApiError(response);

      const decision = decideRetry(response.status, response.headers, attempt, this.retry);
      if (decision.retry) {
        await delay(decision.waitMs);
        continue;
      }

      throw apiErr;
    }
  }

  private async attempt(opts: RequestOptions): Promise<{ response: Response; error?: undefined } | { response?: undefined; error: LogicwareNetworkError }> {
    const url = this.buildUrl(opts.path, opts.query);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': this.userAgent,
      'X-Api-Key': this.apiKey,
      ...(opts.headers ?? {})
    };
    if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
    if (opts.requestId) headers['X-Request-Id'] = opts.requestId;

    let bodyInit: BodyInit | undefined;
    if (opts.body !== undefined) {
      bodyInit = JSON.stringify(opts.body);
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await this.fetchImpl(url, {
        method: opts.method,
        headers,
        body: bodyInit,
        signal: controller.signal
      });
      return { response };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { error: new LogicwareNetworkError(`Request timed out after ${this.timeoutMs}ms`, err) };
      }
      return { error: new LogicwareNetworkError(`Network error: ${(err as Error)?.message ?? String(err)}`, err) };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
    if (!query) return base;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      params.append(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
}

async function parseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    // Non-JSON response with 2xx — rare but possible (e.g. 204). Return null.
    return null;
  }
}

async function buildApiError(response: Response): Promise<LogicwareApiError> {
  const requestId = response.headers.get('x-request-id') ?? undefined;
  let bodyText = '';
  try {
    bodyText = await response.text();
  } catch {
    // swallow — body already consumed or stream error
  }

  let details: unknown = bodyText;
  let code: string | undefined;
  let message = `HTTP ${response.status}`;

  if (bodyText) {
    try {
      const parsed = JSON.parse(bodyText) as Record<string, unknown>;
      details = parsed;
      if (typeof parsed['message'] === 'string') message = parsed['message'] as string;
      if (typeof parsed['code'] === 'string') code = parsed['code'] as string;
      // Accept the common { success: false, message, code } shape from api-courier
      if (typeof parsed['error'] === 'string') message = parsed['error'] as string;
    } catch {
      message = `HTTP ${response.status}: ${bodyText.slice(0, 200)}`;
    }
  }

  return new LogicwareApiError({
    status: response.status,
    message,
    code,
    requestId,
    details,
    response
  });
}

function isNetworkRetryable(err: LogicwareNetworkError): boolean {
  const msg = err.message.toLowerCase();
  return msg.includes('timed out') || msg.includes('econnreset') || msg.includes('socket');
}
