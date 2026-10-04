---
title: Intake handling
---

# Intake handling

When a package arrives at the US warehouse, the intake system categorizes it as one of:

- **Identified** → routes to a known courier via address-code prefix → becomes a `Package` on that courier's system (triggers `package.received` webhook)
- **Unidentified** → no prefix match — stays in the warehouse's unidentified pool until manually resolved
- **Unclaimed** → prefix matched a courier but no shipper's address code matched; the package is parked under a placeholder shipper until the real customer signs up

The SDK exposes deliberately different-shaped reads for each, because the privacy model is different.

## Unidentified: search, not list

The unidentified pool is **shared warehouse inventory** — if it contained another courier's packages, listing it would leak data. Instead, you can only search by an identifier you already know:

```ts
// Both tracking and customerName are valid; at least one is required.
const matches = await client.intake.searchUnidentified({
  tracking: '1Z999AA10123456784'
});

const byName = await client.intake.searchUnidentified({
  customerName: 'Jane Doe'
});
```

The server returns at most 20 results, filtered to packages that either:

- already belong to this courier, **or**
- match one of this courier's registered address prefixes (so "it could have been ours")

If your shipper messages you saying "my package was delivered to the warehouse but I don't see it on my account", this is the call to make.

## Unclaimed: list for this courier

Unclaimed packages are already scoped to your courier — they arrived at your prefix but couldn't route to a specific shipper (invalid address code, perhaps). List them:

```ts
const unclaimed = await client.intake.listUnclaimed({ page: 1, pageSize: 50 });

for (const p of unclaimed.data) {
  console.log(`${p.trackingNumber} → ${p.shipperAddressCode ?? 'no code'}`);
}

// Stream every page
for await (const p of client.intake.listAllUnclaimed()) {
  // ...
}
```

Typically these resolve one of two ways:

1. **The shipper signs up after the package arrives.** `RegisterShipperHandler` auto-links pending packages to the new shipper — nothing for you to do.
2. **Warehouse staff manually assign** the package to a shipper via the courier portal.

## Received: polling for real-time sync

If you're not using webhooks (or as a safety net alongside them), poll the received list:

```ts
const since = new Date(Date.now() - 5 * 60_000);  // last 5 minutes
const recent = await client.intake.listReceived(since, { pageSize: 100 });

for (const p of recent.data) {
  // Mirror the package into your own database
}

for await (const p of client.intake.listAllReceived(since)) {
  // ...
}
```

This hits the courier's per-courier database — only your packages are returned.

## The webhook alternative

Webhooks give you real-time notification at the moment a package is received, instead of polling:

- `package.received` — fired for every package on intake
- `intake.unclaimed` — fired specifically when a package routes to your unclaimed bucket
- `prealert.matched` — fired when an arriving package matches a pre-alert you created

See **[webhooks](./webhooks.md)** for the listener pattern.

## Why no `intake.unidentified` webhook?

By definition, if a package is unidentified, the server doesn't know which courier should be notified. The privacy model makes it pull-only: use `searchUnidentified()` when a shipper tells you a package is missing and you want to check if it's stuck in the pool.
