import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook, WebhookVerificationError } from '../../src/index.js';

const SECRET = 'test_webhook_secret';

function sign(timestamp: string, body: string, secret = SECRET): string {
  const canonical = `${timestamp}.${body}`;
  return 'sha256=' + createHmac('sha256', secret).update(canonical).digest('hex');
}

function freshEvent(data: Record<string, unknown> = { packageId: 'p1' }) {
  const nowSec = Math.floor(Date.now() / 1000).toString();
  const envelope = {
    event: 'package.received',
    timestamp: new Date().toISOString(),
    companyId: 'c1',
    companySlug: 'test',
    data
  };
  const body = JSON.stringify(envelope);
  return { timestamp: nowSec, body, signature: sign(nowSec, body) };
}

describe('verifyWebhook', () => {
  it('returns the typed event on a valid signed payload', () => {
    const { timestamp, body, signature } = freshEvent({ packageId: 'pkg-abc' });
    const event = verifyWebhook({ rawBody: body, signature, timestamp, secret: SECRET });
    expect(event.event).toBe('package.received');
    if (event.event === 'package.received') {
      expect(event.data.packageId).toBe('pkg-abc');
    }
  });

  it('accepts a Buffer rawBody', () => {
    const { timestamp, body, signature } = freshEvent();
    const event = verifyWebhook({
      rawBody: Buffer.from(body, 'utf8'),
      signature,
      timestamp,
      secret: SECRET
    });
    expect(event).toBeTruthy();
  });

  it('accepts a bare hex signature (no "sha256=" prefix)', () => {
    const { timestamp, body, signature } = freshEvent();
    const bare = signature.replace(/^sha256=/, '');
    const event = verifyWebhook({ rawBody: body, signature: bare, timestamp, secret: SECRET });
    expect(event).toBeTruthy();
  });

  it('rejects a tampered body', () => {
    const { timestamp, body, signature } = freshEvent();
    expect(() =>
      verifyWebhook({ rawBody: body + ' ', signature, timestamp, secret: SECRET })
    ).toThrowError(WebhookVerificationError);
  });

  it('rejects an old timestamp (>300s skew)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000 - 1000).toString();
    const body = JSON.stringify({
      event: 'package.received',
      timestamp: new Date().toISOString(),
      companyId: 'c1',
      companySlug: 'test',
      data: {}
    });
    const signature = sign(oldTimestamp, body);

    expectCode(
      () => verifyWebhook({ rawBody: body, signature, timestamp: oldTimestamp, secret: SECRET }),
      'TIMESTAMP_OUT_OF_TOLERANCE'
    );
  });

  it('rejects a missing signature', () => {
    const { timestamp, body } = freshEvent();
    expectCode(
      () => verifyWebhook({ rawBody: body, signature: undefined, timestamp, secret: SECRET }),
      'MISSING_SIGNATURE'
    );
  });

  it('rejects a missing timestamp', () => {
    const { body, signature } = freshEvent();
    expectCode(
      () => verifyWebhook({ rawBody: body, signature, timestamp: null, secret: SECRET }),
      'MISSING_TIMESTAMP'
    );
  });

  it('rejects a signature computed with the wrong secret', () => {
    const { timestamp, body } = freshEvent();
    const badSig = sign(timestamp, body, 'wrong_secret');
    expectCode(
      () => verifyWebhook({ rawBody: body, signature: badSig, timestamp, secret: SECRET }),
      'SIGNATURE_MISMATCH'
    );
  });

  it('rejects a signature from a different timestamp (replay across timestamps)', () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const earlier = (Number(now) - 5).toString();
    const body = JSON.stringify({
      event: 'package.received',
      timestamp: new Date().toISOString(),
      companyId: 'c1',
      companySlug: 't',
      data: {}
    });
    const signatureForEarlier = sign(earlier, body);
    expectCode(
      () => verifyWebhook({ rawBody: body, signature: signatureForEarlier, timestamp: now, secret: SECRET }),
      'SIGNATURE_MISMATCH'
    );
  });

  it('respects a custom toleranceSeconds', () => {
    const past = Math.floor(Date.now() / 1000 - 60).toString();  // 60s ago
    const body = JSON.stringify({
      event: 'package.received',
      timestamp: new Date().toISOString(),
      companyId: 'c1',
      companySlug: 't',
      data: {}
    });
    const signature = sign(past, body);

    // Default 300s tolerance — 60s ago is fine.
    expect(() =>
      verifyWebhook({ rawBody: body, signature, timestamp: past, secret: SECRET })
    ).not.toThrow();

    // 30s tolerance — 60s ago is too old.
    expectCode(
      () => verifyWebhook({ rawBody: body, signature, timestamp: past, secret: SECRET, toleranceSeconds: 30 }),
      'TIMESTAMP_OUT_OF_TOLERANCE'
    );
  });

  it('rejects a body that is not a Logicware envelope', () => {
    const now = Math.floor(Date.now() / 1000).toString();
    const body = JSON.stringify({ notAnEnvelope: true });
    const signature = sign(now, body);
    expectCode(
      () => verifyWebhook({ rawBody: body, signature, timestamp: now, secret: SECRET }),
      'INVALID_PAYLOAD'
    );
  });

  it('rejects a malformed signature header', () => {
    const { timestamp, body } = freshEvent();
    expectCode(
      () => verifyWebhook({ rawBody: body, signature: 'not-a-signature', timestamp, secret: SECRET }),
      'INVALID_SIGNATURE_FORMAT'
    );
  });
});

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(WebhookVerificationError);
    expect((err as WebhookVerificationError).code).toBe(code);
    return;
  }
  throw new Error(`Expected fn to throw WebhookVerificationError with code=${code}, but it did not throw`);
}
