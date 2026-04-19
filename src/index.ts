export { LogicwareConnect } from './client.js';
export type { LogicwareConnectOptions } from './client.js';

export {
  LogicwareError,
  LogicwareApiError,
  LogicwareNetworkError
} from './http/errors.js';

export type { RetryOptions } from './http/retry.js';
export type { HttpClientOptions, RequestOptions } from './http/client.js';

export { SDK_NAME, SDK_VERSION } from './version.js';

// Webhook verification — security-critical; top-level export.
export { verifyWebhook, WebhookVerificationError } from './webhooks/verify.js';
export type { VerifyWebhookInput } from './webhooks/verify.js';

// Resources
export { WarehousesResource } from './resources/warehouses.js';
export { ShippersResource, BULK_SHIPPERS_MAX_ROWS } from './resources/shippers.js';
export type { ListShippersOptions } from './resources/shippers.js';
export { ShipperAddressesResource } from './resources/shipper-addresses.js';
export { PackagesResource } from './resources/packages.js';
export type { ListPackagesOptions } from './resources/packages.js';
export { ManifestsResource } from './resources/manifests.js';
export type { ListManifestsOptions } from './resources/manifests.js';
export { PreAlertsResource } from './resources/prealerts.js';
export type { ListPreAlertsOptions } from './resources/prealerts.js';
export { IntakeResource } from './resources/intake.js';
export type { SearchUnidentifiedOptions } from './resources/intake.js';
export { MissingPackagesResource } from './resources/missing-packages.js';
export type { ListMissingPackagesOptions } from './resources/missing-packages.js';
export { RatesResource } from './resources/rates.js';
export type { RateCalculationInput, RateCalculationResult } from './resources/rates.js';

// Types — re-export everything public consumers reference by name.
export type { Page, PageOptions, SinceFilter, IsoDateTime } from './types/common.js';
export type { Warehouse, WarehouseAddress, FreightType } from './types/warehouse.js';
export type {
  Shipper,
  ShipperListItem,
  ShipperAddress,
  ShipperAddressItem,
  CreateShipperInput,
  UpdateShipperInput,
  BulkShipperInput,
  BulkShipperResult,
  BulkShipperStatus,
  BulkUpsertResult,
  ShipperImportJob,
  ShipperImportStatus,
  ShipperImportProgress,
  ShipperImportFailure,
  ShipperImportFailuresPage,
  SyncShipperResult,
  CreateShipperAddressInput,
  UpdateShipperAddressInput
} from './types/shipper.js';
export type {
  Package,
  PackageStatus,
  CreatePackageInput,
  UpdatePackageInput
} from './types/package.js';
export type {
  Manifest,
  ManifestStatus,
  ManifestType,
  CreateManifestInput,
  UpdateManifestInput,
  FinalizeManifestInput,
  UpdateManifestStatusInput,
  AddPackagesResult
} from './types/manifest.js';
export type { PreAlert, PreAlertStatus, CreatePreAlertInput } from './types/prealert.js';
export type {
  UnidentifiedIntakePackage,
  UnclaimedPackage,
  ReceivedPackage
} from './types/intake.js';
export type {
  MissingPackageRequest,
  MissingPackageStatus,
  MissingPackagePriority,
  CreateMissingPackageInput
} from './types/missing-package.js';
export type {
  WebhookEvent,
  WebhookEventType,
  WebhookEnvelope,
  PackageReceivedPayload,
  PackageStatusChangedPayload,
  PackageUpdatedPayload,
  PackageDeletedPayload,
  ManifestCreatedPayload,
  ManifestClosedPayload,
  ManifestReopenedPayload,
  PreAlertMatchedPayload,
  PreAlertExpiredPayload,
  IntakeUnidentifiedPayload,
  IntakeUnclaimedPayload,
  MissingPackageCreatedPayload,
  MissingPackageResolvedPayload
} from './types/webhook-event.js';
