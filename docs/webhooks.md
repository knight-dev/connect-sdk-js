---
title: Webhooks
---

# Webhooks

Logicware sends HMAC-signed HTTP POSTs to the external webhook URL you configure in the courier portal. The SDK exposes a single function — `verifyWebhook()` — that validates the signature, checks the timestamp tolerance, parses the envelope, and returns a fully-typed event.

## Configure the endpoint

1. In your courier portal, go to **Developer → API keys → Webhooks**.
2. Enter your endpoint URL (e.g. `https://your-courier-site.com/webhooks`).
3. Generate a webhook secret. Save it on your server — this is the key you'll pass to `verifyWebhook()`.

## Receive an event

Use the raw request body — **not** a parsed JSON object. The signature is computed over the exact bytes the server sent.

### Next.js (App Router)

```ts
// app/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook, WebhookVerificationError } from '@logicware.app/connect-sdk';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  try {
    const event = verifyWebhook({
      rawBody,
      signature: req.headers.get('x-logicware-signature'),
      timestamp: req.headers.get('x-logicware-timestamp'),
      secret: process.env.LW_WEBHOOK_SECRET!
    });

    switch (event.event) {
      case 'package.received':
        // event.data is narrowed to PackageReceivedPayload
        await handlePackageReceived(event.data);
        break;
      case 'package.status_changed':
        await handleStatusChanged(event.data);
        break;
      // ... handle other event types
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: err.code }, { status: 401 });
    }
    throw err;
  }
}
```

### Express

```ts
import express from 'express';
import { verifyWebhook, WebhookVerificationError } from '@logicware.app/connect-sdk';

const app = express();

// IMPORTANT: use express.raw() for this route, not express.json().
// verifyWebhook needs the exact bytes as they arrived on the wire.
app.post(
  '/webhooks',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const event = verifyWebhook({
        rawBody: req.body, // Buffer — verifyWebhook accepts string or Uint8Array
        signature: req.get('x-logicware-signature'),
        timestamp: req.get('x-logicware-timestamp'),
        secret: process.env.LW_WEBHOOK_SECRET!
      });
      // ... dispatch
      res.json({ received: true });
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return res.status(401).json({ error: err.code });
      }
      throw err;
    }
  }
);
```

## Signing contract

For the curious, or if you're writing a verifier in a language we don't SDK for:

1. **Canonical string**: `"{unixTimestamp}.{rawBody}"`
2. **Algorithm**: HMAC-SHA256
3. **Output**: lowercase hex, sent as `X-Logicware-Signature: sha256={hex}`
4. **Replay protection**: `X-Logicware-Timestamp` header (unix seconds). Reject signatures older than 300s.
5. **Envelope**: the request body is a JSON object with `{ event, timestamp, companyId, companySlug, data }`.

The SDK's `verifyWebhook()` implements all of this — you shouldn't need to re-implement it.

## Event types

Every event is a discriminated union member. Narrowing on `event.event` gives you a fully-typed `event.data`:

| Event | When |
|---|---|
| `package.received` | Warehouse received a package matching one of your shippers |
| `package.status_changed` | A package's status transitioned |
| `package.updated` | Warehouse edited a package's weight/dimensions/description |
| `package.deleted` | A package was removed (refund, duplicate intake) |
| `manifest.created` | A new manifest was opened by the warehouse or your SDK call |
| `manifest.closed` | A manifest was closed (no more auto-linked packages) |
| `manifest.reopened` | A manifest's `isOpen` flag flipped back on |
| `prealert.matched` | A pre-alert was linked to an arriving intake package |
| `prealert.expired` | A pre-alert passed its expiry without being matched |
| `intake.unidentified` | (pull-only — use `client.intake.searchUnidentified()`) |
| `intake.unclaimed` | Package arrived under a placeholder shipper (no matching address code) |
| `missing_package.created` | Shipper filed a "can't find my package" request |
| `missing_package.resolved` | Warehouse marked a missing-package request Found/NotFound |

## Test fixture

Every event has a seeded dummy payload used by the sandbox. You can import the payload shapes directly:

```ts
import type { PackageReceivedPayload } from '@logicware.app/connect-sdk';

function handlePackageReceived(data: PackageReceivedPayload) {
  // data.packageId, data.trackingNumber, etc. — all typed
}
```

## Testing the verifier

The sandbox page in your courier portal (`/developer/sandbox`) fires synthetic events at any URL — point it at `https://webhook.site/...` during dev to see what the server actually sends, then swap to your real endpoint.

See **[error handling](./error-handling.md)** for the full `WebhookVerificationError.code` list.
