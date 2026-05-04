import { ResourceBase } from './base.js';
import type { PageOptions } from '../types/common.js';
import type {
  MissingPackageRequest,
  MissingPackageStatus,
  MissingPackagePriority,
  CreateMissingPackageInput
} from '../types/missing-package.js';

export interface ListMissingPackagesOptions extends PageOptions {
  search?: string;
  status?: MissingPackageStatus;
  priority?: MissingPackagePriority;
}

export class MissingPackagesResource extends ResourceBase {
  async list(options?: ListMissingPackagesOptions): Promise<{ data: unknown }> {
    const raw = await this.http.request<{ data: unknown }>({
      method: 'GET',
      path: '/api/v1/missing-packages',
      query: {
        search: options?.search,
        status: options?.status,
        priority: options?.priority,
        ...this.buildPageQuery(options)
      }
    });
    return { data: raw.data };
  }

  listAll(options?: Omit<ListMissingPackagesOptions, 'page'>): AsyncGenerator<MissingPackageRequest, void, void> {
    const self = this;
    return (async function* () {
      let page = 1;
      while (true) {
        const raw = await self.http.request<{
          data:
            | { requests: MissingPackageRequest[]; pagination?: { page: number; totalPages: number } }
            | MissingPackageRequest[];
        }>({
          method: 'GET',
          path: '/api/v1/missing-packages',
          query: {
            search: options?.search,
            status: options?.status,
            priority: options?.priority,
            page,
            pageSize: options?.pageSize
          }
        });

        const data = raw.data;
        const items = Array.isArray(data) ? data : (data.requests ?? []);
        for (const r of items) yield r;

        const pagination = Array.isArray(data) ? undefined : data.pagination;
        if (!pagination || pagination.page >= pagination.totalPages) return;
        page++;
      }
    })();
  }

  async get(id: string): Promise<MissingPackageRequest> {
    const raw = await this.http.request<{ data: MissingPackageRequest }>({
      method: 'GET',
      path: `/api/v1/missing-packages/${encodeURIComponent(id)}`
    });
    return raw.data;
  }

  /** File a new missing-package request on behalf of a shipper. */
  async create(input: CreateMissingPackageInput): Promise<{ id: string; status: string }> {
    const raw = await this.http.request<{ data: { id: string; status: string } }>({
      method: 'POST',
      path: '/api/v1/missing-packages',
      body: input
    });
    return raw.data;
  }

  async cancel(id: string, reason?: string): Promise<void> {
    await this.http.request({
      method: 'POST',
      path: `/api/v1/missing-packages/${encodeURIComponent(id)}/cancel`,
      body: { reason }
    });
  }

  async close(id: string, resolutionNotes?: string): Promise<void> {
    await this.http.request({
      method: 'POST',
      path: `/api/v1/missing-packages/${encodeURIComponent(id)}/close`,
      body: { resolutionNotes }
    });
  }
}
