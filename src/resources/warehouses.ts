import { ResourceBase } from './base.js';
import type { Warehouse } from '../types/warehouse.js';

export class WarehousesResource extends ResourceBase {
  /** List every warehouse this courier is linked to, with addressPrefix + freightTypes. */
  async list(): Promise<Warehouse[]> {
    const raw = await this.http.request<{ data: Warehouse[] }>({
      method: 'GET',
      path: '/api/v1/warehouses'
    });
    return raw.data;
  }

  /** Get a single warehouse by id. Returns null if not linked to this courier. */
  async get(id: string): Promise<Warehouse> {
    const raw = await this.http.request<{ data: Warehouse }>({
      method: 'GET',
      path: `/api/v1/warehouses/${encodeURIComponent(id)}`
    });
    return raw.data;
  }
}
