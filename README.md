# @logicware.app/connect-sdk

Official JavaScript/TypeScript SDK for [Logicware Connect](https://logicware.app).

Integrate your own courier website with a Logicware-hosted warehouse — sync shippers, handle pre-alerts, receive webhooks, and more, without running our courier portal.

## Install

```bash
npm install @logicware.app/connect-sdk
# or
pnpm add @logicware.app/connect-sdk
```

Requires Node 20+ (uses native `fetch`). Works in modern browsers.

## Quickstart

```ts
import { LogicwareConnect } from '@logicware.app/connect-sdk';

const client = new LogicwareConnect({
  apiKey: process.env.LW_API_KEY!,                 // sk_live_... or sk_test_...
  baseUrl: 'https://fastship-api.logicware.app',   // your courier's API host
});

// Resource methods are added in v0.2+ (see SDK_PLAN.md).
// For the v0.1 scaffold release only the transport + error classes are public.
```

## Errors

```ts
import { LogicwareApiError, LogicwareNetworkError } from '@logicware.app/connect-sdk';

try {
  // ...
} catch (err) {
  if (err instanceof LogicwareApiError) {
    console.log(err.status, err.code, err.message, err.requestId);
    if (err.retryable) {
      // 429 or 5xx — the SDK already retried, but surface for your own metrics
    }
  } else if (err instanceof LogicwareNetworkError) {
    // TLS / DNS / connection reset / timeout
  }
}
```

## Versioning

Semver. `0.x` releases are pre-1.0 and may include breaking changes — see `CHANGELOG.md`.

The runtime `SDK_VERSION` export is generated from `package.json` at build time (single source of truth — see `scripts/gen-version.mjs`).

## Development

```bash
pnpm install
pnpm test           # runs gen-version first, then vitest
pnpm build          # runs gen-version first, then tsup (ESM + CJS)
pnpm typecheck
```

## License

MIT
