import type { IsoDateTime } from './common.js';

export type ManifestType = 'Air' | 'Sea' | 'Ground' | 'Courier';

export type ManifestStatus =
  | 'Draft'
  | 'Finalized'
  | 'Shipped'
  | 'InTransit'
  | 'AtCustoms'
  | 'Cleared'
  | 'Arrived'
  | 'Completed'
  | 'Cancelled';

export interface Manifest {
  id: string;
  manifestNumber: string;
  type: ManifestType;
  status: ManifestStatus;
  isOpen: boolean;
  carrierName: string | null;
  mawbNumber: string | null;
  bolNumber: string | null;
  flightNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  originCode: string | null;
  originName: string | null;
  destinationCode: string | null;
  destinationName: string | null;
  estimatedDeparture: IsoDateTime | null;
  estimatedArrival: IsoDateTime | null;
  actualDeparture: IsoDateTime | null;
  actualArrival: IsoDateTime | null;
  totalPackages: number;
  totalWeightLbs: number | null;
  createdAt: IsoDateTime;
  finalizedAt: IsoDateTime | null;
  shippingCycleLabel: string | null;
}

export interface CreateManifestInput {
  type: ManifestType;
  carrierName?: string;
  originCode?: string;
  originName?: string;
  destinationCode?: string;
  destinationName?: string;
  estimatedDeparture?: Date | string;
  estimatedArrival?: Date | string;
  notes?: string;
  isOpen?: boolean;
  autoLinkPackages?: boolean;
  shippingCycleLabel?: string;
}

export interface UpdateManifestInput {
  type?: ManifestType;
  carrierName?: string;
  mawbNumber?: string;
  bolNumber?: string;
  flightNumber?: string;
  vesselName?: string;
  voyageNumber?: string;
  originCode?: string;
  originName?: string;
  destinationCode?: string;
  destinationName?: string;
  estimatedDeparture?: Date | string;
  estimatedArrival?: Date | string;
  notes?: string;
}

export interface FinalizeManifestInput {
  customsEntryNumber?: string;
  customsDeclarationNumber?: string;
  customsExchangeRate?: number;
  freightChargesUsd?: number;
  totalDutiesPaid?: number;
  dutiesCurrency?: string;
}

export interface UpdateManifestStatusInput {
  status: ManifestStatus;
  actualDeparture?: Date | string;
  actualArrival?: Date | string;
  customsEntryNumber?: string;
  customsDeclarationNumber?: string;
  customsExchangeRate?: number;
  freightChargesUsd?: number;
  totalDutiesPaid?: number;
  dutiesCurrency?: string;
  notes?: string;
}

export interface AddPackagesResult {
  addedCount: number;
  skippedCount: number;
  errors: string[];
}
