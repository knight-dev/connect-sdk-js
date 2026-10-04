import type { IsoDateTime } from './common.js';
import type { FreightType } from './warehouse.js';

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

/** Physical container type — maps to the warehouse intake `PackageType` enum. */
export type PackageType =
  | 'Box'
  | 'Bag'
  | 'Envelope'
  | 'Tube'
  | 'Crate'
  | 'Pallet'
  | 'Irregular'
  | 'Other';

/** Condition recorded at warehouse intake. `Damaged` is a server-side alias for `SevereDamage` and is not returned. */
export type PackageCondition =
  | 'Good'
  | 'MinorDamage'
  | 'ModerateDamage'
  | 'SevereDamage'
  | 'Tampered'
  | 'WetDamaged'
  | 'Fragile';

export interface Package {
  id: string;
  trackingNumber: string | null;
  internalBarcode: string | null;
  hawbNumber: string | null;
  status: PackageStatus;
  description: string | null;
  weightLbs: number | null;
  /** Length × Width × Height in inches. Set at warehouse intake or via update. */
  lengthIn?: number | null;
  widthIn?: number | null;
  heightIn?: number | null;
  /** L×W×H/139 — the chargeable weight when bigger than actual. */
  dimensionalWeightLbs?: number | null;
  /** max(weight, dimensional weight). What the courier bills against. */
  billableWeightLbs?: number | null;
  declaredValueUsd: number | null;
  shipperId: string | null;
  shipperAddressCode: string | null;
  manifestId: string | null;
  freightType: FreightType;
  /** Physical container type. Defaults to `Box` if never set. */
  packageType?: PackageType;
  /** Condition recorded at warehouse intake. */
  condition?: PackageCondition;
  conditionNotes?: string | null;
  /** Marketplace where the package originated (Amazon, Shein, etc.). */
  sourceMarketplace?: string | null;
  /** Merchant / store name as parsed from the label or pre-alert. */
  merchantName?: string | null;
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
  sourceMarketplace?: string;
  merchantName?: string;
  packageType?: PackageType;
  /** "Air" or "Sea". */
  freightType?: FreightType;
  condition?: PackageCondition;
  conditionNotes?: string;
}

export interface CreatePackageInput {
  shipperId?: string;
  /** Either `shipperId` or `shipperAddressCode` resolves the owning shipper. */
  shipperAddressCode?: string;
  trackingNumber?: string;
  description?: string;
  weightLbs?: number;
  declaredValueUsd?: number;
  sourceMarketplace?: string;
  merchantName?: string;
  packageType?: PackageType;
  /** "Air" or "Sea". Defaults to `Air` server-side. */
  freightType?: FreightType;
}
