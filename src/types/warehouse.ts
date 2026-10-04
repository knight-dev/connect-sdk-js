import type { IsoDateTime } from './common.js';

export type FreightType = 'Air' | 'Sea';

export interface WarehouseAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface Warehouse {
  id: string;
  warehouseCompanyId: string;
  name: string;
  code: string;
  addressPrefix: string;
  isDefault: boolean;
  freightTypes: FreightType[];
  address: WarehouseAddress;
  contactPhone: string | null;
  contactEmail: string | null;
  operatingHours: string | null;
  timeZoneId: string;
  isActive: boolean;
}

export type { IsoDateTime };
