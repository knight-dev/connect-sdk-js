# Changelog

All notable changes to `@logicware.app/connect-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `CreateShipperInput` and `BulkShipperInput` gain address-provisioning fields:
  `addressCode` (the courier's existing label code — required on create unless
  `generateAddressCode: true`), `warehouseId`, `freightType`,
  `generateAddressCode` (opt-in auto-generate using the default warehouse), and
  `forceAddressCode` (opt-in replace; same-prefix only).
- `BulkShipperResult` now includes `addressCode` and `addressOutcome`
  (`'created' | 'updated' | 'unchanged'`).
- New error codes surfaced via `LogicwareApiError.code`:
  `ADDRESS_CODE_REQUIRED`, `ADDRESS_CODE_FORMAT_INVALID`,
  `ADDRESS_PREFIX_UNKNOWN`, `WAREHOUSE_PREFIX_MISMATCH`,
  `ADDRESS_CODE_CONFLICT`, `ADDRESS_CODE_IMMUTABLE`,
  `ADDRESS_CODE_PREFIX_MISMATCH`.

### Changed
- First-time `shippers.sync()`/`shippers.create()`/`shippers.bulkCreate()`
  calls now provision the shipper's primary address in the same round-trip —
  no separate `shippers.addresses.create()` step needed. The manual CRUD
  endpoint stays available for secondary addresses.

## [0.1.0] — 2026-04-18

### Added
- Initial scaffold release.
- `LogicwareConnect` root client with `apiKey` + `baseUrl` constructor options.
- `HttpClient` transport with:
  - `X-Api-Key` auth header
  - JSON encoding/decoding
  - Automatic retries on 429 and 5xx with exponential backoff + `Retry-After` support
  - Per-request timeout (default 30s)
  - `Idempotency-Key` header pass-through
  - Client-generated `X-Request-Id` pass-through
- `LogicwareError`, `LogicwareApiError`, `LogicwareNetworkError`.
- Version generated from `package.json` at prebuild (`SDK_VERSION`, `SDK_NAME` exports).

### Not yet

Resources (shippers, packages, manifests, pre-alerts, intake, missing packages, warehouses, webhook verify) ship in `0.2.0`.

[Unreleased]: https://github.com/knight-dev/connect-sdk-js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/knight-dev/connect-sdk-js/releases/tag/v0.1.0
