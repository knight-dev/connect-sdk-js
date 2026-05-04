---
title: Authentication
---

# Authentication

The SDK sends your API key in the `X-Api-Key` header on every request. No OAuth, no session cookies, no request signing — just the key.

## Getting a key

1. Sign in to your courier portal.
2. Go to **Developer → API keys**.
3. Click **Create key**, give it a name (e.g. `Production`, `Staging checkout`), and copy the value **immediately** — it's shown once.

Keys follow the pattern `sk_{env}_{random}` where `{env}` is `live` or `test`.

## Storing the key

The API key is equivalent to your courier's password for the SDK surface. Never:

- Commit it to source control.
- Expose it to the browser (every `@logicware.app/connect-sdk` call should be server-side).
- Reuse one key across environments — mint a separate key per environment.

Do:

- Keep it in a secret manager (AWS Secrets Manager, Doppler, Vercel env, etc.).
- Rotate on a schedule (every 90 days is a reasonable cadence for low-risk keys).

## Rotating

The backend supports multiple active keys per courier, so rotation is zero-downtime:

1. Create a new key in the portal.
2. Deploy the new key to your server.
3. Revoke the old key in the portal.

You can verify the active key by calling any authenticated endpoint — the portal's **Developer → API keys** view shows `Last used at` per key.

## Scopes

Every key carries an optional comma-separated scope list (e.g. `shippers:read,shippers:write`). Scopes are recorded on the key but **not enforced** in v1 — they're informational.
Enforcement lands in a future release, so set scopes narrowly today and you won't need to rotate when enforcement turns on.

## Rate limits

Each API key has its own rate-limit bucket:

| Bucket | Limit |
|---|---|
| Regular V1 endpoints | 60 req/min |
| `/api/v1/shippers/bulk` and `/api/v1/shippers/imports` | 10 req/min |

Exceeding the limit returns `429 Too Many Requests` with a `Retry-After` header. The SDK automatically retries up to 3 times with exponential backoff, honoring `Retry-After`.

See the **[error handling guide](./error-handling.md)** for the retry behavior in detail.

## Per-request overrides

You can pass an `idempotencyKey` or `requestId` with any mutating call — the SDK forwards them as headers. The server echoes `X-Request-Id` on every response, and the SDK surfaces it on `LogicwareApiError.requestId` for support debugging.

```ts
await client.shippers.bulkCreate(shippers); // no idempotency key — each call is a fresh attempt

// For a retried job you want deduped server-side:
const response = await client.http.request({
  method: 'POST',
  path: '/api/v1/shippers/bulk',
  body: { shippers },
  idempotencyKey: 'shipper-import-batch-42',
  requestId: 'my-app-req-abc123'
});
```

## Test vs live

Test keys (`sk_test_...`) and live keys (`sk_live_...`) are functionally identical at the SDK layer — the server tracks which environment a key belongs to and scopes it accordingly. Use test keys against your staging api-courier; live keys against production.
