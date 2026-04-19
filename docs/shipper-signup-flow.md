---
title: Shipper signup flow
---

# Shipper signup flow

"Bring your own website" in five minutes. Your registration form lives on your domain; one SDK call keeps Logicware in sync.

## The happy path

```ts
import { LogicwareConnect } from '@logicware.app/connect-sdk';

const client = new LogicwareConnect({
  apiKey: process.env.LW_API_KEY!,
  baseUrl: process.env.LW_BASE_URL!
});

export async function onShipperSignup(formData: FormData) {
  // Step 1: Upsert by email. Idempotent — safe to retry.
  const result = await client.shippers.sync({
    email: String(formData.get('email')),
    name: String(formData.get('name')),
    trn: String(formData.get('trn')),
    phone: String(formData.get('phone') || '') || undefined
  });

  // Step 2: Give them a warehouse address code.
  // Your signup form can let the user pick which warehouse (air vs sea) if
  // your courier has multiple.
  const warehouses = await client.warehouses.list();
  const primary = warehouses.find(w => w.isDefault) ?? warehouses[0];
  if (!primary) throw new Error('This courier has no warehouses linked.');

  await client.shippers.addresses.create(result.shipperId, {
    warehouseId: primary.id,
    freightType: 'Air',
    isPrimary: true
  });

  // Step 3: Return the shipper's public code + the generated warehouse
  // address they'll use at US retailers.
  const detail = result.detail;
  return {
    shipperId: result.shipperId,
    shipperCode: result.shipperCode,          // e.g. "FSJ-A3F9K2" — show on their dashboard
    addressCode: detail.addresses[0]?.addressCode  // e.g. "FSJ-12345" — they ship to this
  };
}
```

## Why `.sync()` instead of `.create()`

`sync()` is an **upsert** — if the email is already registered, you get the existing record updated with your latest form data. `create()` would 4xx on a duplicate email.

Use `create()` only when you've checked `getByEmail()` first and confirmed the shipper is genuinely new. Most of the time, `sync()` is what you want.

## Re-creating a lost account

A shipper comes back six months later with a new form submission — same email, maybe different phone. `sync()` handles it:

```ts
// First time:  status = "created", shipper ID X, name "Jane Doe", phone null
// Returns     → { shipperId: X, status: 'created', ... }

// Six months later: status = "updated", same shipper ID X, phone now set
await client.shippers.sync({ email: 'jane@example.com', name: 'Jane Doe', phone: '876-555-1234' });
// Returns     → { shipperId: X, status: 'updated', ... }
```

`status` on the response tells you which branch ran. Use it for analytics ("new signups this week" vs "profile updates").

## Bulk import for existing customers

Migrating from another system with thousands of existing customers? Don't loop `sync()` — use `bulkCreate` (auto-chunked at 500 rows) or `importMany` (async, up to 100k):

```ts
const shippers = await loadLegacyCustomers();  // Array<BulkShipperInput>

if (shippers.length < 500) {
  // Synchronous, per-row results in one response
  const result = await client.shippers.bulkCreate(shippers);
  console.log(`${result.createdCount} created, ${result.updatedCount} updated, ${result.errorCount} failed`);
} else {
  // Fire-and-forget — get a job back and poll
  const job = await client.shippers.importMany(shippers);

  for await (const progress of client.shippers.importProgress(job.jobId)) {
    console.log(`${progress.processedRows}/${progress.totalRows} processed`);
  }

  // When done, fetch any failures
  const failures = await client.shippers.getImportFailures(job.jobId, { offset: 0, limit: 100 });
  failures.failures.forEach(f => console.log(`Row ${f.index} (${f.email}): ${f.errorCode}`));
}
```

See the `BULK_SHIPPERS_MAX_ROWS` constant — that's the synchronous-endpoint cap. Anything larger auto-chunks under the hood.

## Error cases to handle

| Code | What it means | What to do |
|---|---|---|
| `INVALID_TRN` | TRN doesn't match the format (Jamaica: 9 digits after normalization) | Show field-level validation error |
| `SHIPPER_CODE_CONFLICT` | The `shipperCode` you supplied already belongs to a different email. Only happens if you're explicitly supplying codes rather than letting Logicware generate them. | Surface "that code is taken" or let Logicware auto-generate |
| `EMAIL_REQUIRED` | You sent an empty email | Client-side validation should catch this |
| `NAME_REQUIRED` | Empty name | Client-side validation should catch this |

All other errors surface with `status`, `message`, and `requestId`. See **[error handling](./error-handling.md)**.

## Real-time sync after signup

Packages for a new shipper start arriving at the warehouse almost immediately if they've given their address code to a US retailer. Hook up **[webhooks](./webhooks.md)** so your site shows the first package appearing without the shipper having to refresh.
