import { createHmac, timingSafeEqual } from 'node:crypto';
import type { WebhookEvent, WebhookEventType } from '../types/webhook-event.js';

export class WebhookVerificationError extends Error {
  public readonly code:
    | 'MISSING_SIGNATURE'
    | 'MISSING_TIMESTAMP'
    | 'INVALID_SIGNATURE_FORMAT'
    | 'SIGNATURE_MISMATCH'
    | 'TIMESTAMP_OUT_OF_TOLERANCE'
    | 'INVALID_PAYLOAD';

  constructor(code: WebhookVerificationError['code'], message: string) {
    super(message);
    this.name = 'WebhookVerificationError';
    this.code = code;
  }
}

export interface VerifyWebhookInput {
  /**
   * The raw request body (string or Buffer). MUST be the exact bytes the
   * server sent — parsing + re-serialising breaks the signature.
   */
  rawBody: string | Uint8Array;

  /** The X-Logicware-Signature header value (e.g. "sha256=abc123..."). */
  signature: string | null | undefined;

  /** The X-Logicware-Timestamp header value (unix seconds as a string). */
  timestamp: string | null | undefined;

  /** Your courier's external webhook secret (CourierEndpoint.ExternalWebhookSecret). */
  secret: string;

  /** Max acceptable skew between `timestamp` and now. Default 300s. */
  toleranceSeconds?: number;
}

const DEFAULT_TOLERANCE_SECONDS = 300;

/**
 * Verify an external webhook and return the parsed, typed event.
 * Throws {@link WebhookVerificationError} on any problem — never returns invalid data.
 *
 * Canonical signing string is `"{timestamp}.{body}"` (Stripe-style).
 */
export function verifyWebhook(input: VerifyWebhookInput): WebhookEvent {
  if (!input.signature) {
    throw new WebhookVerificationError('MISSING_SIGNATURE', 'Missing X-Logicware-Signature header');
  }
  if (!input.timestamp) {
    throw new WebhookVerificationError('MISSING_TIMESTAMP', 'Missing X-Logicware-Timestamp header');
  }

  const tolerance = input.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) {
    throw new WebhookVerificationError('MISSING_TIMESTAMP', 'X-Logicware-Timestamp is not a number');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > tolerance) {
    throw new WebhookVerificationError(
      'TIMESTAMP_OUT_OF_TOLERANCE',
      `Timestamp ${ts} is outside the ${tolerance}s tolerance window (now=${nowSec})`
    );
  }

  const expected = extractHexSignature(input.signature);
  const bodyBuf = typeof input.rawBody === 'string'
    ? Buffer.from(input.rawBody, 'utf8')
    : Buffer.from(input.rawBody);
  const canonical = Buffer.concat([
    Buffer.from(`${input.timestamp}.`, 'utf8'),
    bodyBuf
  ]);

  const actualHex = createHmac('sha256', input.secret).update(canonical).digest('hex');
  const actualBuf = Buffer.from(actualHex, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');

  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    throw new WebhookVerificationError('SIGNATURE_MISMATCH', 'Signature does not match expected value');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyBuf.toString('utf8'));
  } catch (err) {
    throw new WebhookVerificationError('INVALID_PAYLOAD', `Body is not valid JSON: ${(err as Error).message}`);
  }

  if (!isWebhookEnvelope(parsed)) {
    throw new WebhookVerificationError('INVALID_PAYLOAD', 'Body is not a Logicware webhook envelope');
  }

  return parsed as unknown as WebhookEvent;
}

function extractHexSignature(raw: string): string {
  // Accept both "sha256=abc123" and bare "abc123" for forward compat
  const match = /^sha256=([0-9a-f]+)$/i.exec(raw.trim());
  if (match) return match[1]!.toLowerCase();
  if (/^[0-9a-f]+$/i.test(raw.trim())) return raw.trim().toLowerCase();
  throw new WebhookVerificationError('INVALID_SIGNATURE_FORMAT', `Bad signature format: ${raw}`);
}

function isWebhookEnvelope(value: unknown): value is { event: WebhookEventType; [key: string]: unknown } {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v['event'] === 'string' && typeof v['timestamp'] === 'string' && 'data' in v;
}
