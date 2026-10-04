---
title: Missing package requests
---

# Missing package requests

A shipper says "my package should have arrived but I don't see it." The SDK lets your website file a missing-package request on their behalf, track it through resolution, and receive a webhook when the warehouse confirms whether it was found.

## File a request

Exposed via `client.missingPackages.create()`. Every request is scoped to a specific shipper and a specific warehouse:

```ts
const req = await client.missingPackages.create({
  shipperId: shipper.id,
  warehouseLocationId: warehouse.id,     // from client.warehouses.list()
  trackingNumber: '1Z999AA10123456784',
  carrier: 'UPS',
  merchantName: 'Amazon',
  orderNumber: '112-4829103-8847211',
  shippedDate: new Date('2026-04-15'),
  expectedArrivalDate: new Date('2026-04-22'),
  estimatedWeightLbs: 2.5,
  declaredValueUsd: 120,
  notes: 'Tracking shows delivered to warehouse on April 20',
  isUrgent: false
});

console.log(`Request ${req.id} filed — status: ${req.status}`);
```

The warehouse staff see the request in their queue, search for the package, and resolve it as `Found` (linked to an intake package) or `NotFound`.

## Listing and filtering

```ts
// All open requests for your shippers
const open = await client.missingPackages.list({
  status: 'Pending',
  page: 1,
  pageSize: 25
});

// Urgent requests only
const urgent = await client.missingPackages.list({ priority: 'Urgent' });

// Stream every page
for await (const r of client.missingPackages.listAll({ status: 'Pending' })) {
  // ...
}
```

Filter values:

| Field | Valid values |
|---|---|
| `status` | `Pending`, `Searching`, `Found`, `NotFound`, `Cancelled`, `Expired`, `Closed` |
| `priority` | `Normal`, `High`, `Urgent` |

## Getting a single request

```ts
const req = await client.missingPackages.get(requestId);
console.log(req.status, req.daysPending);
```

The server enforces that a request must belong to your courier — you'll get a 404 for another courier's requests. See the [tenant isolation guide](https://logicware.app/docs/backend/tenant-isolation) on the backend side.

## Cancel or close

The shipper changes their mind, or a different resolution path closes the loop:

```ts
// Shipper realized they entered the wrong tracking number
await client.missingPackages.cancel(req.id, 'Wrong tracking — re-filing with correct number');

// Warehouse found it, shipper confirmed receipt, time to close the ticket
await client.missingPackages.close(req.id, 'Package delivered to shipper on 2026-04-25');
```

## The resolution webhook

The warehouse marks the request `Found` or `NotFound` in their UI. You get notified:

```ts
// In your webhook handler
if (event.event === 'missing_package.resolved') {
  const { requestId, resolution, matchedIntakePackageId, resolutionNotes } = event.data;

  if (resolution === 'Found' && matchedIntakePackageId) {
    // Notify the shipper — their package was located!
    const pkg = await client.intake.listReceived(new Date(Date.now() - 86400_000 * 7));
    const found = pkg.data.find(p => p.id === matchedIntakePackageId);
    await sendEmailToShipper(found);
  } else if (resolution === 'NotFound') {
    // Warehouse searched, couldn't find it. Refund / escalate?
    await escalateToSupport(requestId, resolutionNotes);
  }
}
```

See **[webhooks](./webhooks.md)** for the full event handling pattern.

## Urgency and priority

`isUrgent: true` on creation maps to `priority: 'Urgent'` on the request. Warehouse queues are typically worked priority-first, so use this sparingly — for customers whose package is stuck and they're about to churn, not as a default.

If your staff need to bump priority after filing, that's done in the warehouse portal today; the SDK doesn't expose priority updates in v1 (tracked for v1.1).

## Cases the SDK rejects client-side

- **Missing shipperId or warehouseLocationId** — the server enforces both exist and belong to your courier. The SDK throws a `LogicwareApiError` with `status: 400` and a descriptive `code` before the request is persisted.
- **Shipper from a different courier** — same error. Your courier's API key can't file a request on another courier's shipper (physical tenant isolation).
- **Warehouse not linked** — a `warehouseLocationId` that isn't in your courier's `FreightCompanyWarehouse` table returns 400 `WAREHOUSE_NOT_LINKED`.

Always pull the valid warehouse list from `client.warehouses.list()` before showing the form, rather than hardcoding IDs.
