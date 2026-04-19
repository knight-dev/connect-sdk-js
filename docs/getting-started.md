---
title: Getting started
---

# Getting started

## Install

```bash
npm install @logicware.app/connect-sdk
# or
pnpm add @logicware.app/connect-sdk
# or
yarn add @logicware.app/connect-sdk
```

Requires Node 20+ (uses global `fetch`). Works in modern browsers.

## Configure

You need two things before you can make any call:

1. **An API key.** Generated in the courier portal at `/developer`. It's shown once at creation — save it to your server-side secret store. Keys look like `sk_live_...` or `sk_test_...`.
2. **Your courier's API base URL.** Every courier has its own host under the Logicware platform — e.g. `https://fastship-api.logicware.app`.

Keep both on the server — the API key must never reach the browser.

```ts
import { LogicwareConnect } from '@logicware.app/connect-sdk';

const client = new LogicwareConnect({
  apiKey: process.env.LW_API_KEY!,
  baseUrl: process.env.LW_BASE_URL!
});
```

## First call

List the warehouses your courier is linked to — handy for confirming connectivity and for seeing the address prefixes your shippers will use:

```ts
const warehouses = await client.warehouses.list();

for (const w of warehouses) {
  console.log(`${w.name} (${w.code}) prefix=${w.addressPrefix} types=${w.freightTypes.join('/')}`);
}
```

Expected output for a freshly-configured courier:

```
Miami Air Hub (MIA-AIR) prefix=FSJ types=Air
Miami Sea Terminal (MIA-SEA) prefix=FSJ-SEA types=Sea
```

## A complete signup flow

Here's the "bring your own website" flow end-to-end — a shipper fills out your
signup form and lands in Logicware's warehouse directory:

```ts
// 1. Sync the shipper (upsert by email — idempotent).
const result = await client.shippers.sync({
  email: 'customer@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  phone: '876-555-1234'
});
console.log(`Shipper ${result.status}:`, result.detail.shipperCode);

// 2. Give them a warehouse address code so they can start ordering.
const warehouses = await client.warehouses.list();
const defaultWarehouse = warehouses.find(w => w.isDefault) ?? warehouses[0];
await client.shippers.addresses.create(result.shipperId, {
  warehouseId: defaultWarehouse.id,
  freightType: 'Air',
  isPrimary: true
});

// 3. Show the full shipper profile + recent packages.
const shipper = await client.shippers.get(result.shipperId);
const packages = await client.packages.forShipper(result.shipperId, { pageSize: 20 });
```

## Next up

- Add **[webhooks](./webhooks.md)** so you get real-time updates instead of polling.
- Learn **[error handling](./error-handling.md)** — every error is typed, and retries are automatic for 429/5xx.
- Read the **[shipper signup flow guide](./shipper-signup-flow.md)** for the full "bring your own website" pattern.
