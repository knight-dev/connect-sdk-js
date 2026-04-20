/**
 * Canonical event-type strings. Matches ExternalCourierEvents on the backend.
 */
export type WebhookEventType =
  | 'package.received'
  | 'package.status_changed'
  | 'package.updated'
  | 'package.deleted'
  | 'manifest.created'
  | 'manifest.closed'
  | 'manifest.reopened'
  | 'prealert.matched'
  | 'prealert.expired'
  | 'intake.unidentified'
  | 'intake.unclaimed'
  | 'missing_package.created'
  | 'missing_package.resolved';

/** Envelope wrapping every external webhook payload. */
export interface WebhookEnvelope<TData = unknown> {
  event: WebhookEventType;
  timestamp: string;
  companyId: string;
  companySlug: string;
  data: TData;
}

// ---- Per-event payload shapes (discriminated union on `event`) --------------

export interface PackageReceivedPayload {
  packageId: string;
  internalBarcode: string | null;
  trackingNumber: string | null;
  status: string;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  shipperId: string | null;
  shipperAddressCode: string | null;
  manifestId: string | null;
  isUnclaimed: boolean;
  receivedAt: string;
}

export interface PackageStatusChangedPayload {
  packageId: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  status: string;
  previousStatus?: string;
  shipperId: string | null;
  manifestId: string | null;
  /** Air / Sea — present on events from api-courier ≥ 2026-04-20. */
  freightType?: 'Air' | 'Sea';
  source?: string;
}

export interface PackageUpdatedPayload {
  packageId: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  weightLbs: number | null;
  lengthIn?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
  declaredValueUsd: number | null;
  description: string | null;
  merchantName?: string | null;
  recipientName?: string | null;
  locationCode?: string | null;
  /** Air / Sea — present on events from api-courier ≥ 2026-04-20. */
  freightType?: 'Air' | 'Sea';
  reason?: string | null;
  source?: string;
  changedFields?: string[];
}

export interface PackageDeletedPayload {
  packageId: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  shipperId: string | null;
  manifestId: string | null;
  reason?: string | null;
  force?: boolean;
  source?: string;
}

export interface ManifestCreatedPayload {
  manifestId: string;
  manifestNumber: string;
  type: string;
  status: string;
  isOpen: boolean;
  carrierName: string | null;
  originCode: string | null;
  destinationCode: string | null;
  estimatedDeparture: string | null;
  estimatedArrival: string | null;
  totalPackages: number;
  autoLinkedPackages: number;
  createdAt: string;
}

export interface ManifestClosedPayload {
  manifestId: string;
  manifestNumber: string;
  type: string;
  status: string;
  isOpen: false;
  totalPackages: number;
  autoLinkedPackages: number;
}

export interface ManifestReopenedPayload {
  manifestId: string;
  manifestNumber: string;
  type: string;
  status: string;
  isOpen: true;
  totalPackages: number;
  autoLinkedPackages: number;
}

export interface PreAlertMatchedPayload {
  preAlertId: string;
  packageId: string;
  trackingNumber: string | null;
  shipperAddressCode: string | null;
  receivedAt: string | null;
}

export interface PreAlertExpiredPayload {
  preAlertId: string;
  trackingNumber: string | null;
  shipperAddressCode: string | null;
  expiredAt: string;
}

export interface IntakeUnidentifiedPayload {
  intakePackageId: string;
  trackingNumber: string | null;
  recipientName: string | null;
  weightLbs: number | null;
  receivedAt: string;
}

export interface IntakeUnclaimedPayload {
  packageId: string;
  internalBarcode: string | null;
  trackingNumber: string | null;
  shipperAddressCode: string | null;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  receivedAt: string | null;
}

export interface MissingPackageCreatedPayload {
  requestId: string;
  shipperId: string;
  warehouseLocationId: string;
  trackingNumber: string;
  carrier: string | null;
  merchantName: string | null;
  isUrgent: boolean;
  status: string;
}

export interface MissingPackageResolvedPayload {
  requestId: string;
  resolution: 'Found' | 'NotFound';
  matchedIntakePackageId: string | null;
  resolutionNotes: string | null;
  resolvedByName: string | null;
  resolvedAt: string;
}

/** Discriminated union of every webhook event — narrows `data` by `event`. */
export type WebhookEvent =
  | (WebhookEnvelope<PackageReceivedPayload> & { event: 'package.received' })
  | (WebhookEnvelope<PackageStatusChangedPayload> & { event: 'package.status_changed' })
  | (WebhookEnvelope<PackageUpdatedPayload> & { event: 'package.updated' })
  | (WebhookEnvelope<PackageDeletedPayload> & { event: 'package.deleted' })
  | (WebhookEnvelope<ManifestCreatedPayload> & { event: 'manifest.created' })
  | (WebhookEnvelope<ManifestClosedPayload> & { event: 'manifest.closed' })
  | (WebhookEnvelope<ManifestReopenedPayload> & { event: 'manifest.reopened' })
  | (WebhookEnvelope<PreAlertMatchedPayload> & { event: 'prealert.matched' })
  | (WebhookEnvelope<PreAlertExpiredPayload> & { event: 'prealert.expired' })
  | (WebhookEnvelope<IntakeUnidentifiedPayload> & { event: 'intake.unidentified' })
  | (WebhookEnvelope<IntakeUnclaimedPayload> & { event: 'intake.unclaimed' })
  | (WebhookEnvelope<MissingPackageCreatedPayload> & { event: 'missing_package.created' })
  | (WebhookEnvelope<MissingPackageResolvedPayload> & { event: 'missing_package.resolved' });
