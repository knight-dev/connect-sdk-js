import { ResourceBase } from './base.js';
import type { PageOptions } from '../types/common.js';
import type { PreAlert, PreAlertStatus, CreatePreAlertInput } from '../types/prealert.js';

export interface ListPreAlertsOptions extends PageOptions {
  search?: string;
  status?: PreAlertStatus;
}

export class PreAlertsResource extends ResourceBase {
  async list(options?: ListPreAlertsOptions): Promise<{
    data: PreAlert[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    stats: { total: number; pending: number; matched: number; expired: number };
  }> {
    const raw = await this.http.request<{
      data: PreAlert[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
      stats: { total: number; pending: number; matched: number; expired: number };
    }>({
      method: 'GET',
      path: '/api/v1/prealerts',
      query: { search: options?.search, status: options?.status, ...this.buildPageQuery(options) }
    });
    return { data: raw.data, pagination: raw.pagination, stats: raw.stats };
  }

  listAll(options?: Omit<ListPreAlertsOptions, 'page'>): AsyncGenerator<PreAlert, void, void> {
    return this.paginate<PreAlert>((page) =>
      this.list({ ...(options ?? {}), page }).then((r) => ({ data: r.data, pagination: r.pagination }))
    );
  }

  async get(id: string): Promise<PreAlert> {
    const raw = await this.http.request<{ data: PreAlert }>({
      method: 'GET',
      path: `/api/v1/prealerts/${encodeURIComponent(id)}`
    });
    return raw.data;
  }

  /** Lookup by carrier tracking number. Returns `{ found: false }` if no match. */
  async lookupByTracking(trackingNumber: string): Promise<{ found: boolean; data: PreAlert | null }> {
    const raw = await this.http.request<{ found: boolean; data: PreAlert | null }>({
      method: 'GET',
      path: '/api/v1/prealerts/lookup',
      query: { tracking: trackingNumber }
    });
    return { found: raw.found, data: raw.data };
  }

  async create(input: CreatePreAlertInput): Promise<{ id: string; shipperAddressCode: string; status: string }> {
    const raw = await this.http.request<{
      data: { id: string; shipperAddressCode: string; status: string };
    }>({
      method: 'POST',
      path: '/api/v1/prealerts',
      body: input
    });
    return raw.data;
  }

  async cancel(id: string): Promise<void> {
    await this.http.request({
      method: 'POST',
      path: `/api/v1/prealerts/${encodeURIComponent(id)}/cancel`
    });
  }
}
