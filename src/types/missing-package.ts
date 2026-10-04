import type { IsoDateTime } from './common.js';

export type MissingPackageStatus =
  | 'Pending'
  | 'Searching'
  | 'Found'
  | 'NotFound'
  | 'Cancelled'
  | 'Expired'
  | 'Closed';

export type MissingPackagePriority = 'Normal' | 'High' | 'Urgent';

export interface MissingPackageRequest {
  id: string;
  shipperId: string;
  shipperName: string;
  trackingNumber: string;
  customerName: string | null;
  carrier: string | null;
  merchantName: string | null;
  orderNumber: string | null;
  warehouseLocationId: string | null;
  warehouseLocationName: string | null;
  status: MissingPackageStatus;
  priority: MissingPackagePriority;
  requestedAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  daysPending: number | null;
}

export interface CreateMissingPackageInput {
  shipperId: string;
  warehouseLocationId: string;
  trackingNumber: string;
  customerName?: string;
  carrier?: string;
  description?: string;
  merchantName?: string;
  orderNumber?: string;
  shippedDate?: Date | string;
  expectedArrivalDate?: Date | string;
  estimatedWeightLbs?: number;
  declaredValueUsd?: number;
  notes?: string;
  isUrgent?: boolean;
}
