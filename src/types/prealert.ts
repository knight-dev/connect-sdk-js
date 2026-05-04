import type { IsoDateTime } from './common.js';

export type PreAlertStatus = 'Pending' | 'Matched' | 'Expired' | 'Cancelled' | 'ReceivedWithIssues';

export interface PreAlert {
  id: string;
  shipperAddressCode: string;
  shipperEmail: string | null;
  shipperName: string | null;
  carrierTrackingNumber: string | null;
  carrier: string | null;
  description: string | null;
  expectedWeightLbs: number | null;
  declaredValueUsd: number | null;
  expectedPackageCount: number | null;
  status: PreAlertStatus;
  matchedIntakePackageId: string | null;
  matchedAt: IsoDateTime | null;
  expiresAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  invoiceUrl: string | null;
  merchantName: string | null;
  orderNumber: string | null;
  itemCategory: string | null;
  requiresSpecialHandling: boolean;
  specialHandlingInstructions: string | null;
}

export interface CreatePreAlertInput {
  shipperAddressCode: string;
  carrierTrackingNumber?: string;
  carrier?: string;
  description?: string;
  expectedWeightLbs?: number;
  declaredValueUsd?: number;
  expectedPackageCount?: number;
  notes?: string;
  merchantName?: string;
  orderNumber?: string;
  itemCategory?: string;
  requiresSpecialHandling?: boolean;
  specialHandlingInstructions?: string;
  expiresAt?: Date | string;
}
