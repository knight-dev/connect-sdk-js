# Logicware Connect SDK — JavaScript/TypeScript

The `@logicware.app/connect-sdk` package lets an external courier website integrate with a Logicware-hosted warehouse. Your site becomes the system of record for shipper signup, pre-alerts, and customer-facing tracking; Logicware handles the physical intake, routing, and manifesting.

## Guides

- **[Getting started](./getting-started.md)** — install, configure, hit your first endpoint.
- **[Authentication](./authentication.md)** — API keys, rotation, scopes, rate limits.
- **[Webhooks](./webhooks.md)** — receive signed events, verify signatures, handle each event type.
- **[Error handling](./error-handling.md)** — error classes, retry semantics, request IDs.
- **[Shipper signup flow](./shipper-signup-flow.md)** — hooking your registration form into `client.shippers.sync()`.
- **[Manifest lifecycle](./manifest-lifecycle.md)** — create → open/close → finalize → shipped → completed.
- **[Intake handling](./intake-handling.md)** — unidentified search, unclaimed list, received-since polling.
- **[Missing package requests](./missing-packages.md)** — file, track, resolve on behalf of shippers.

## API reference

The complete API reference is generated from the source TSDoc by TypeDoc. Run `pnpm docs` in `packages/sdk-js/` to build it to `docs-build/`.
