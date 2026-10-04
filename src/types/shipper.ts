import type { IsoDateTime } from './common.js';
import type { FreightType } from './warehouse.js';

export interface ShipperAddressItem {
  id: string;
  addressCode: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: IsoDateTime;
}

export interface Shipper {
  id: string;
  shipperCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  addresses: ShipperAddressItem[];
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryParish: string | null;
  deliveryLandmark: string | null;
  deliveryPostalCode: string | null;
  deliveryInstructions: string | null;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  trn: string | null;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  totalPackages: number;
  pendingPackages: number;
  deliveredPackages: number;
  totalSpentJmd: number;
  currentBalanceJmd: number;
  createdAt: IsoDateTime;
  lastLoginAt: IsoDateTime | null;
}

export interface ShipperListItem {
  id: string;
  shipperCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  addressCode: string | null;
  isActive: boolean;
  isVerified: boolean;
  totalPackages: number;
  pendingPackages: number;
  createdAt: IsoDateTime;
  lastActivityAt: IsoDateTime | null;
}

export interface CreateShipperInput {
  email: string;
  name: string;
  trn: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  parish?: string;
  /**
   * Label address code (e.g. `"CNW-12345"`). Required unless
   * {@link generateAddressCode} is `true`. Must match one of the courier's
   * registered warehouse prefixes.
   */
  addressCode?: string;
  /** Optional. Resolved automatically from {@link addressCode}'s prefix when omitted. */
  warehouseId?: string;
  freightType?: FreightType | 'Both';
  /** Opt-in for couriers migrating without existing codes. Platform auto-generates. */
  generateAddressCode?: boolean;
}

export interface UpdateShipperInput {
  name?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  parish?: string;
}

/** Input for /bulk, /sync, and /imports — same shape across all three. */
export interface BulkShipperInput {
  email: string;
  name: string;
  trn?: string;
  phone?: string;
  shipperCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  parish?: string;
  deliveryInstructions?: string;
  idNumber?: string;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;

  /**
   * The shipper's existing label address code from the courier's own system
   * (e.g. `"CNW-12345"`). Required on first sync unless {@link generateAddressCode}
   * is `true`. Must match one of the courier's registered warehouse prefixes —
   * `ADDRESS_PREFIX_UNKNOWN` otherwise.
   */
  addressCode?: string;
  /** Optional. Auto-resolved from {@link addressCode}'s prefix when omitted. */
  warehouseId?: string;
  freightType?: FreightType | 'Both';
  /** Auto-generate the code using the courier's default warehouse. */
  generateAddressCode?: boolean;
  /**
   * Opt-in to replace an existing primary address code. Same-prefix only
   * (`CNW-1` → `CNW-2` OK, `FSJ-1` → `CNW-2` rejected with
   * `ADDRESS_CODE_PREFIX_MISMATCH`). Replacement mutates the row in place so
   * existing packages keep their owner.
   */
  forceAddressCode?: boolean;
}

export type BulkShipperStatus = 'created' | 'updated' | 'skipped' | 'error';

export type AddressOutcome = 'created' | 'updated' | 'unchanged';

export interface BulkShipperResult {
  index: number;
  email: string | null;
  status: BulkShipperStatus;
  shipperId: string | null;
  shipperCode: string | null;
  addressCode: string | null;
  addressOutcome: AddressOutcome | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface BulkUpsertResult {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  results: BulkShipperResult[];
}

export type ShipperImportStatus =
  | 'Queued'
  | 'Running'
  | 'Completed'
  | 'PartialSuccess'
  | 'Failed'
  | 'Cancelled';

export interface ShipperImportJob {
  jobId: string;
  statusUrl: string;
  totalRows: number;
}

export interface ShipperImportProgress {
  jobId: string;
  status: ShipperImportStatus;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  createdAt: IsoDateTime;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  jobErrorMessage: string | null;
}

export interface ShipperImportFailure {
  index: number;
  email: string | null;
  errorCode: string;
  errorMessage: string;
}

export interface ShipperImportFailuresPage {
  totalFailures: number;
  offset: number;
  limit: number;
  failures: ShipperImportFailure[];
}

export interface SyncShipperResult {
  status: 'created' | 'updated';
  shipperId: string;
  shipperCode: string | null;
  detail: Shipper;
}

export interface CreateShipperAddressInput {
  warehouseId: string;
  freightType?: FreightType | 'Both';
  label?: string;
  isPrimary?: boolean;
}

export interface UpdateShipperAddressInput {
  label?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  deactivationReason?: string;
}

export interface ShipperAddress {
  id: string;
  addressCode: string;
  prefix: string;
  label: string | null;
  isPrimary: boolean;
  isActive: boolean;
  warehouseLocationId: string | null;
  freightType: FreightType | 'Both' | null;
  createdAt: IsoDateTime;
  deactivatedAt: IsoDateTime | null;
}
