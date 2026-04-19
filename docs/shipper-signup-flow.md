---
title: Shipper signup flow
---

# Shipper signup flow

"Bring your own website" in five minutes. Your registration form lives on your domain; one SDK call keeps Logicware in sync — address and all.

## The happy path

```ts
import { LogicwareConnect } from '@logicware.app/connect-sdk';

const client = new LogicwareConnect({
  apiKey: process.env.LW_API_KEY!,
  baseUrl: process.env.LW_BASE_URL!
});

export async function onShipperSignup(formData: FormData) {
  // One call upserts the shipper AND provisions their primary warehouse
  // address. Idempotent — safe to retry.
  const result = await client.shippers.sync({
    email: String(formData.get('email')),
    name: String(formData.get('name')),
    trn: String(formData.get('trn')),
    phone: String(formData.get('phone') || '') || undefined,

    // The label code your courier already prints on packages. The warehouse
    // matches incoming labels against this code to route packages to the
    // right shipper, so it has to come from YOUR system at signup time.
    addressCode: String(formData.get('addressCode')),
  });

  return {
    shipperId: result.shipperId,
    shipperCode: result.shipperCode,          // Logicware-generated public ID
    addressCode: result.detail.addresses[0]?.addressCode
  };
}
```

## Why you need `addressCode` upfront

When packages arrive at the warehouse, they read the label — e.g. `"CNW-12345"` — and route to whichever courier owns the `CNW` prefix. Until we know which shipper that code belongs to, the package sits in the unidentified pool until someone resolves it manually.

The cleanest way to avoid that: pass the code your existing system already uses for this customer at sync time. No manual triage, no gap.

### If you don't have existing codes yet

First-time courier onboarding to Logicware, maybe you've never issued address codes because the warehouse used to generate them? Opt in to auto-generation:

```ts
await client.shippers.sync({
  email: 'jane@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  generateAddressCode: true   // platform mints a code using the default warehouse's prefix
});
```

The generated code comes back in `result.detail.addresses[0].addressCode` — store it in your system and use it on labels going forward.

## Multiple warehouses

Your courier has both air and sea warehouses, each with its own prefix? Use whichever prefix matches the code:

```ts
// Air warehouse prefix is "CNW", sea warehouse prefix is "FSJ"
await client.shippers.sync({
  email: 'jane@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  addressCode: 'CNW-12345'    // platform resolves the prefix → air warehouse
});
```

You can optionally pin `warehouseId` explicitly, but only if its prefix matches the code — otherwise you'll get `WAREHOUSE_PREFIX_MISMATCH`.

## Replacing an existing shipper's address code

Sometimes an existing customer's code needs to change — maybe they were assigned one before a system cleanup and you want to standardise. `forceAddressCode` lets you replace it, but **only within the same prefix**:

```ts
// OK — same prefix, numeric change
await client.shippers.sync({
  email: 'jane@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  addressCode: 'CNW-100',
  forceAddressCode: true
});
// Previous "CNW-10001" → now "CNW-100". Existing packages keep their link
// (internal FK, not the string, so no packages lose their owner).

// Blocked — crossing prefixes would silently move this shipper to a
// different warehouse. Add a secondary address via
// client.shippers.addresses.create() instead.
await client.shippers.sync({
  email: 'jane@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  addressCode: 'FSJ-100',
  forceAddressCode: true
});
// → ADDRESS_CODE_PREFIX_MISMATCH
```

Without `forceAddressCode: true`, submitting a different code for an existing shipper returns `ADDRESS_CODE_IMMUTABLE`. That's the safety latch — so a stray typo during a resync can't quietly rewrite an address the warehouse is already printing.

## Re-creating a lost account

A shipper comes back six months later with a new form submission — same email, maybe different phone. `sync()` handles it:

```ts
// First time:  status = "created", addressOutcome = "created"
// Six months later, update: status = "updated", addressOutcome = "unchanged"
await client.shippers.sync({
  email: 'jane@example.com',
  name: 'Jane Doe',
  trn: '123456789',
  phone: '876-555-1234',
  addressCode: 'CNW-12345'   // same code as before → no-op on the address
});
```

`status` tells you which shipper branch ran; `addressOutcome` tells you whether the primary address was touched. Use them for analytics ("new signups this week" vs "profile updates" vs "code swaps").

## Bulk import for existing customers

Migrating from another system with thousands of existing customers? Don't loop `sync()` — use `bulkCreate` (auto-chunked at 500 rows) or `importMany` (async, up to 100k). Every row needs an `addressCode` or `generateAddressCode: true`:

```ts
const shippers = await loadLegacyCustomers();  // Array<BulkShipperInput>

// Typical migration shape
const withCodes = shippers.map(s => ({
  email: s.email,
  name: s.name,
  trn: s.trn,
  phone: s.phone,
  addressCode: s.legacyAddressCode     // what the warehouse sees on labels today
}));

if (withCodes.length < 500) {
  const result = await client.shippers.bulkCreate(withCodes);
  console.log(`${result.createdCount} created, ${result.updatedCount} updated, ${result.errorCount} failed`);
} else {
  const job = await client.shippers.importMany(withCodes);
  for await (const progress of client.shippers.importProgress(job.jobId)) {
    console.log(`${progress.processedRows}/${progress.totalRows} processed`);
  }
  const failures = await client.shippers.getImportFailures(job.jobId, { offset: 0, limit: 100 });
  failures.failures.forEach(f => console.log(`Row ${f.index} (${f.email}): ${f.errorCode}`));
}
```

Per-row results include `addressCode` and `addressOutcome` so you can tell which rows created an address vs updated one vs left it alone.

## Error cases to handle

| Code | What it means | What to do |
|---|---|---|
| `ADDRESS_CODE_REQUIRED` | First-time sync without `addressCode` or `generateAddressCode` | Collect the code at the form, or opt in to auto-generation |
| `ADDRESS_CODE_FORMAT_INVALID` | Code doesn't match `PREFIX-NNNNN` | Client-side validation on the signup form |
| `ADDRESS_PREFIX_UNKNOWN` | Prefix isn't one of your courier's registered warehouse prefixes | Check `client.warehouses.list()` to see which prefixes are valid |
| `WAREHOUSE_PREFIX_MISMATCH` | You passed a `warehouseId` whose prefix doesn't match the code | Omit `warehouseId` and let the platform resolve from the prefix |
| `ADDRESS_CODE_CONFLICT` | Code already belongs to a different shipper in your database | Use a different code, or look up the existing shipper via `getByAddressCode` |
| `ADDRESS_CODE_IMMUTABLE` | Shipper already has a different code; need `forceAddressCode: true` | Confirm with the operator, then resync with the flag |
| `ADDRESS_CODE_PREFIX_MISMATCH` | Force-replace tried to cross prefixes | Use `shippers.addresses.create()` to add a secondary address instead |
| `INVALID_TRN` | TRN doesn't match the Jamaica 9-digit format | Show field-level validation error |
| `SHIPPER_CODE_CONFLICT` | Explicit `shipperCode` collides with a different email | Use a different code, or let Logicware auto-generate |
| `EMAIL_REQUIRED` / `NAME_REQUIRED` | Empty required field | Client-side validation |

All errors surface with `status`, `message`, and `requestId`. See **[error handling](./error-handling.md)**.

## Real-time sync after signup

Packages for a new shipper start arriving at the warehouse almost immediately if they've given their address code to a US retailer. Hook up **[webhooks](./webhooks.md)** so your site shows the first package appearing without the shipper having to refresh.
