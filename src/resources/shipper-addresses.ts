import { ResourceBase } from './base.js';
import type {
  ShipperAddress,
  CreateShipperAddressInput,
  UpdateShipperAddressInput
} from '../types/shipper.js';

/**
 * Nested resource: /api/v1/shippers/{shipperId}/addresses.
 * Retrieved from `client.shippers.addresses` — not constructed directly.
 */
export class ShipperAddressesResource extends ResourceBase {
  async list(shipperId: string): Promise<ShipperAddress[]> {
    const raw = await this.http.request<{ data: ShipperAddress[] }>({
      method: 'GET',
      path: `/api/v1/shippers/${encodeURIComponent(shipperId)}/addresses`
    });
    return raw.data;
  }

  async create(shipperId: string, input: CreateShipperAddressInput): Promise<ShipperAddress> {
    const raw = await this.http.request<{ data: ShipperAddress }>({
      method: 'POST',
      path: `/api/v1/shippers/${encodeURIComponent(shipperId)}/addresses`,
      body: input
    });
    return raw.data;
  }

  async update(
    shipperId: string,
    addressId: string,
    input: UpdateShipperAddressInput
  ): Promise<ShipperAddress> {
    const raw = await this.http.request<{ data: ShipperAddress }>({
      method: 'PATCH',
      path: `/api/v1/shippers/${encodeURIComponent(shipperId)}/addresses/${encodeURIComponent(addressId)}`,
      body: input
    });
    return raw.data;
  }

  /** Soft-delete (address is preserved with isActive=false so historical packages stay linked). */
  async delete(shipperId: string, addressId: string, reason?: string): Promise<{ id: string; isActive: false }> {
    const raw = await this.http.request<{ data: { id: string; isActive: false } }>({
      method: 'DELETE',
      path: `/api/v1/shippers/${encodeURIComponent(shipperId)}/addresses/${encodeURIComponent(addressId)}`,
      query: { reason }
    });
    return raw.data;
  }
}
