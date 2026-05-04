import type { IsoDateTime } from './common.js';

export interface UnidentifiedIntakePackage {
  id: string;
  carrierTrackingNumber: string | null;
  carrier: string | null;
  matchedAddressPrefix: string | null;
  shipperAddressCode: string | null;
  recipientName: string | null;
  merchantName: string | null;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  receivedAt: IsoDateTime;
}

export interface UnclaimedPackage {
  id: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  status: string;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  shipperAddressCode: string | null;
  shipperEmail: string;
  receivedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface ReceivedPackage {
  id: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  status: string;
  description: string | null;
  weightLbs: number | null;
  declaredValueUsd: number | null;
  shipperId: string | null;
  shipperAddressCode: string | null;
  receivedAt: IsoDateTime;
}
