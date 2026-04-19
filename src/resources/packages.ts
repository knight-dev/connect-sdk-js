import { ResourceBase } from './base.js';
import type { PageOptions } from '../types/common.js';
import type { Package, UpdatePackageInput, CreatePackageInput, PackageStatus } from '../types/package.js';

export interface ListPackagesOptions extends PageOptions {
  shipperId?: string;
  status?: PackageStatus;
  search?: string;
}

export class PackagesResource extends ResourceBase {
  async list(options?: ListPackagesOptions): Promise<{
    data: Package[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const raw = await this.http.request<{
      data: Package[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>({
      method: 'GET',
      path: '/api/v1/packages',
      query: {
        shipperId: options?.shipperId,
        status: options?.status,
        search: options?.search,
        ...this.buildPageQuery(options)
      }
    });
    return { data: raw.data, pagination: raw.pagination };
  }

  listAll(options?: Omit<ListPackagesOptions, 'page'>): AsyncGenerator<Package, void, void> {
    return this.paginate<Package>((page) =>
      this.list({ ...(options ?? {}), page }).then((r) => ({ data: r.data, pagination: r.pagination }))
    );
  }

  async get(id: string): Promise<Package> {
    const raw = await this.http.request<{ data: Package }>({
      method: 'GET',
      path: `/api/v1/packages/${encodeURIComponent(id)}`
    });
    return raw.data;
  }

  /** Public tracking — works without an API key. */
  async getByTracking(trackingNumber: string): Promise<Package> {
    const raw = await this.http.request<{ data: Package }>({
      method: 'GET',
      path: `/api/v1/packages/track/${encodeURIComponent(trackingNumber)}`
    });
    return raw.data;
  }

  async create(input: CreatePackageInput): Promise<Package> {
    const raw = await this.http.request<{ data: Package }>({
      method: 'POST',
      path: '/api/v1/packages',
      body: input
    });
    return raw.data;
  }

  async update(id: string, input: UpdatePackageInput): Promise<Package> {
    const raw = await this.http.request<{ data: Package }>({
      method: 'PUT',
      path: `/api/v1/packages/${encodeURIComponent(id)}`,
      body: input
    });
    return raw.data;
  }

  async forShipper(shipperId: string, options?: Omit<ListPackagesOptions, 'shipperId'>): Promise<{
    data: Package[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    return this.list({ ...(options ?? {}), shipperId });
  }

  /** Packages attached to a given manifest. */
  async forManifest(manifestId: string, options?: PageOptions): Promise<{
    data: Package[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const raw = await this.http.request<{
      data: Package[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>({
      method: 'GET',
      path: `/api/v1/manifests/${encodeURIComponent(manifestId)}/packages`,
      query: this.buildPageQuery(options)
    });
    return { data: raw.data, pagination: raw.pagination };
  }
}
