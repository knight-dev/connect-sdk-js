---
title: Error handling
---

# Error handling

The SDK throws typed errors for every failure mode. No raw `fetch` errors, no unhandled 4xx responses — you catch one of three classes and branch.

## The three error classes

```ts
import {
  LogicwareError,        // base — catch-all for both subclasses
  LogicwareApiError,     // HTTP non-2xx
  LogicwareNetworkError  // DNS / TLS / timeout / connection reset
} from '@logicware.app/connect-sdk';
```

### `LogicwareApiError`

Any non-2xx response. Exposes:

| Field | Description |
|---|---|
| `status` | HTTP status code |
| `code` | Server-emitted error code string (e.g. `SHIPPER_CODE_CONFLICT`) or `undefined` |
| `message` | Human-readable message from the server body |
| `requestId` | Value of the `X-Request-Id` response header. Include in support tickets. |
| `details` | Parsed error body (full JSON object) |
| `retryable` | `true` for 429 and 5xx — the SDK already retried; surface if you want to tell the user "try again in a minute" |

### `LogicwareNetworkError`

The request never reached the server (DNS failure, TCP reset, TLS error, client timeout). No HTTP status is available. Wraps the underlying `Error` in `.cause`.

### `LogicwareError`

The base class. Catch this to trap both kinds at once:

```ts
try {
  await client.shippers.sync(input);
} catch (err) {
  if (err instanceof LogicwareError) {
    // It's from the SDK — handle uniformly.
  } else {
    throw err; // something else entirely
  }
}
```

## The common pattern

```ts
import { LogicwareApiError, LogicwareNetworkError } from '@logicware.app/connect-sdk';

async function signupShipper(input) {
  try {
    return await client.shippers.sync(input);
  } catch (err) {
    if (err instanceof LogicwareApiError) {
      // Log requestId for your own tracing + support
      console.warn(`Logicware API ${err.status} [${err.requestId}]: ${err.message}`);

      if (err.status === 422 && err.code === 'SHIPPER_CODE_CONFLICT') {
        // Specific business rule — surface to the user
        return { ok: false, reason: 'This email is already registered.' };
      }
      if (err.retryable) {
        // Already retried 3× inside the SDK. Give up and surface.
        return { ok: false, reason: 'Service busy. Please try again in a minute.' };
      }
      return { ok: false, reason: err.message };
    }
    if (err instanceof LogicwareNetworkError) {
      return { ok: false, reason: 'Cannot reach Logicware right now.' };
    }
    throw err; // unknown — let it bubble
  }
}
```

## Automatic retries

The SDK retries without you asking, on:

- **`429 Too Many Requests`** — honors the `Retry-After` header
- **`502 Bad Gateway`**
- **`503 Service Unavailable`** — honors `Retry-After`
- **`504 Gateway Timeout`**
- Network timeouts and resets (up to `maxAttempts`)

Default policy: 3 attempts, 500ms base delay, exponential backoff with 25% jitter, capped at 8s.

Override per client:

```ts
const client = new LogicwareConnect({
  apiKey: '...',
  baseUrl: '...',
  retry: {
    maxAttempts: 5,
    baseDelayMs: 1000,
    maxDelayMs: 15_000
  }
});
```

## `WebhookVerificationError`

A separate class — not a `LogicwareError` subclass, because it's thrown synchronously from `verifyWebhook()` (not from an HTTP call).

Exposes a `.code` field that's one of:

- `MISSING_SIGNATURE` — `X-Logicware-Signature` header is absent
- `MISSING_TIMESTAMP` — `X-Logicware-Timestamp` header is absent or not numeric
- `INVALID_SIGNATURE_FORMAT` — signature isn't `sha256={hex}` and isn't a bare hex string
- `SIGNATURE_MISMATCH` — verification failed (wrong secret, tampered body, or replayed across timestamps)
- `TIMESTAMP_OUT_OF_TOLERANCE` — timestamp is >300s old
- `INVALID_PAYLOAD` — body isn't valid JSON or isn't a Logicware envelope

Log `MISSING_SIGNATURE` or `INVALID_SIGNATURE_FORMAT` at warn level — they usually mean something other than the real Logicware is hitting your endpoint.
`SIGNATURE_MISMATCH` or `TIMESTAMP_OUT_OF_TOLERANCE` should **page** on repeat — they mean your webhook secret is out of sync or your clock is skewed.
