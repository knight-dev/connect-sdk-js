import type { IsoDateTime } from './common.js';

export type PackageStatus =
  | 'PreAlert'
  | 'ReceivedAtWarehouse'
  | 'Processing'
  | 'ReadyToShip'
  | 'Shipped'
  | 'InTransit'
  | 'AtCustoms'
  | 'AtHeadOffice'
  | 'AtLocalOffice'
  | 'ReadyForPickup'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Returned'
  | 'Delayed'
  | 'Lost';

export interface Package {
  id: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  hawbNumber: string | null;
  status: PackageStatus;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  shipperId: string | null;
  shipperAddressCode: string | null;
  manifestId: string | null;
  receivedAt: IsoDateTime | null;
  createdAt?: IsoDateTime;
}

export interface UpdatePackageInput {
  trackingNumber?: string;
  description?: string;
  weightLbs?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  declaredValueUsd?: number;
  shippingCostUsd?: number;
  locationCode?: string;
  isFragile?: boolean;
  notes?: string;
  status?: PackageStatus;
}

export interface CreatePackageInput {
  shipperId: string;
  trackingNumber?: string;
  description?: string;
  weightLbs?: number;
  declaredValueUsd?: number;
}
