export interface RetryOptions {
  /** Max attempts including the first. Default 3. */
  maxAttempts?: number;
  /** Base backoff in ms. Default 500. Actual wait is baseDelayMs * 2^(attempt-1) plus jitter. */
  baseDelayMs?: number;
  /** Cap for a single wait. Default 8000. */
  maxDelayMs?: number;
}

export type RetryDecision =
  | { retry: false }
  | { retry: true; waitMs: number };

/**
 * Decide whether/how long to wait before the next retry. Honors `Retry-After`
 * on 429/503 (either integer seconds or HTTP-date). Otherwise exponential
 * backoff with ±25% jitter.
 */
export function decideRetry(
  status: number,
  headers: Headers,
  attempt: number,
  opts: Required<RetryOptions>
): RetryDecision {
  if (attempt >= opts.maxAttempts) return { retry: false };
  if (!isRetryableStatus(status)) return { retry: false };

  const retryAfter = parseRetryAfter(headers.get('retry-after'));
  if (retryAfter !== null) {
    return { retry: true, waitMs: Math.min(retryAfter, opts.maxDelayMs) };
  }

  const base = opts.baseDelayMs * Math.pow(2, attempt - 1);
  const jitterRange = base * 0.25;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  const wait = Math.min(Math.max(0, base + jitter), opts.maxDelayMs);
  return { retry: true, waitMs: wait };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const asInt = Number(value);
  if (!Number.isNaN(asInt)) return asInt * 1000;
  const asDate = Date.parse(value);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
