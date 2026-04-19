/**
 * All errors thrown by the SDK extend this base class so consumers can do
 * `catch (err) { if (err instanceof LogicwareError) { ... } }` once.
 */
export class LogicwareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LogicwareError';
  }
}

/**
 * Thrown for any non-2xx response from the Logicware API.
 * Exposes HTTP-level detail so consumers can inspect status, the server-
 * emitted X-Request-Id, and any structured error body.
 */
export class LogicwareApiError extends LogicwareError {
  public readonly status: number;
  public readonly code: string | undefined;
  public readonly requestId: string | undefined;
  public readonly details: unknown;
  public readonly response: Response | undefined;

  constructor(opts: {
    status: number;
    message: string;
    code?: string;
    requestId?: string;
    details?: unknown;
    response?: Response;
  }) {
    super(opts.message);
    this.name = 'LogicwareApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.details = opts.details;
    this.response = opts.response;
  }

  /**
   * True for 5xx and 429 — safe to retry with backoff. Other 4xx errors
   * (401, 403, 404, 422, etc.) are not retryable without changing the request.
   */
  public get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/**
 * Thrown when the request never reached the server (DNS, TLS, connection
 * reset, client-side timeout, etc.). No HTTP status is available.
 */
export class LogicwareNetworkError extends LogicwareError {
  public override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'LogicwareNetworkError';
    this.cause = cause;
  }
}
