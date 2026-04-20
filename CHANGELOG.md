# Changelog

All notable changes to `@logicware.app/connect-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] — 2026-04-20

### Added
- `Package.freightType` (`'Air' | 'Sea'`) — surfaces the manifest-driven freight mode on every package returned by list/detail endpoints.
- `PackageStatusChangedPayload.freightType` and `PackageUpdatedPayload.freightType` (optional) — webhook consumers can filter events by freight mode without looking up the package.

### Changed
- `client.manifests.list()` now returns `{ data: Manifest[], pagination }` directly (same shape as shippers / packages / pre-alerts). Previously returned `{ data: unknown }` to paper over a backend shape inconsistency that has now been normalized.
- `client.manifests.listAll()` dropped its legacy-shape compat branch; cleaner iteration with no behavior change for callers.

### Fixed
- Server-side: pre-alert list stats were aggregated across every courier on the platform. Fixed in api-courier — now scoped to the calling courier. Consumers see no shape change but the numbers are now correct.
- Server-side: `/api/v1/packages` and `/api/v1/manifests` list responses were `{ data: { packages/manifests, totalCount, ... } }` instead of the common `{ data: [], pagination }`. Normalized on the backend so existing SDK list methods work without client-side reshaping.

## [0.1.0] — 2026-04-19

First public release. Covers the full v1 "bring your own website" surface.

### Added

**Core client**
- `LogicwareConnect` root client with `apiKey` + `baseUrl` constructor options.
- `HttpClient` transport with:
  - `X-Api-Key` auth header
  - JSON encoding/decoding
  - Automatic retries on 429 and 5xx with exponential backoff + `Retry-After` support
  - Per-request timeout (default 30s)
  - `Idempotency-Key` header pass-through
  - Client-generated `X-Request-Id` pass-through
- Version generated from `package.json` at prebuild (`SDK_VERSION`, `SDK_NAME` exports).

**Resources**
- `client.warehouses` — `list()`, `get(id)` for this courier's linked warehouses.
- `client.shippers` — `list`, `get`, `getByEmail`, `getByCode`, `create`, `update`, `delete`, `sync` (upsert-by-email), `bulkCreate` (auto-chunked at 500), `importMany` (async up to 100k), `getImport`, `getImportFailures`, `importProgress` (async iterator).
- `client.shippers.addresses` — full CRUD for secondary addresses.
- `client.packages` — `list`, `get`, `getByTracking`, `update`, `updateStatus`, `forShipper`, `forManifest`.
- `client.manifests` — `list`, `get`, `create`, `update`, `open`, `finalize`, `reopen`, `close`, `setStatus`, `addPackages`, `removePackage`.
- `client.prealerts` — `list`, `get`, `create`, `cancel`, `lookupByTracking`.
- `client.intake` — `searchUnidentified`, `listUnclaimed`, `listReceived` (all scoped to this courier).
- `client.missingPackages` — `list`, `get`, `create`, `cancel`, `close`.
- `client.rates` — `calculate` (public endpoint).

**Shipper address provisioning** (first-class in every shipper create/sync path)
- `addressCode` — the courier's existing label code (e.g. `"CNW-12345"`). Required on create unless `generateAddressCode: true`. Must match one of the courier's registered warehouse prefixes.
- `warehouseId` — optional; auto-resolved from the code's prefix.
- `freightType` — optional.
- `generateAddressCode` — opt-in auto-generate using the default warehouse.
- `forceAddressCode` — opt-in replacement of an existing primary address. Same-prefix only; cross-prefix blocked to prevent silent warehouse reassignment.
- `BulkShipperResult` includes `addressCode` and `addressOutcome` (`'created' | 'updated' | 'unchanged'`).

**Webhooks**
- `client.webhooks.verify({ rawBody, headers, secret, tolerance? })` — timing-safe HMAC-SHA256 verification of `X-Logicware-Signature` with 300s replay tolerance on `X-Logicware-Timestamp`.
- Typed `WebhookEvent` discriminated union across the full external event catalog: `package.received`, `package.status_changed`, `package.updated`, `package.deleted`, `manifest.created`, `manifest.closed`, `manifest.reopened`, `prealert.matched`, `prealert.expired`, `intake.unidentified`, `intake.unclaimed`, `missing_package.created`, `missing_package.resolved`.

**Errors**
- `LogicwareError` (base), `LogicwareApiError` (HTTP non-2xx), `LogicwareNetworkError` (transport).
- `WebhookVerificationError` for the verifier path.
- All API errors expose `status`, `code`, `message`, `requestId`, `details`, `retryable`.

### Address-provisioning error codes

Surface via `LogicwareApiError.code`:
- `ADDRESS_CODE_REQUIRED`
- `ADDRESS_CODE_FORMAT_INVALID`
- `ADDRESS_PREFIX_UNKNOWN`
- `WAREHOUSE_PREFIX_MISMATCH`
- `ADDRESS_CODE_CONFLICT`
- `ADDRESS_CODE_IMMUTABLE`
- `ADDRESS_CODE_PREFIX_MISMATCH`

[Unreleased]: https://github.com/knight-dev/connect-sdk-js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/knight-dev/connect-sdk-js/releases/tag/v0.1.0
