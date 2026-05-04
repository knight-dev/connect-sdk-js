import { ResourceBase } from './base.js';
import type { PageOptions } from '../types/common.js';
import type {
  UnidentifiedIntakePackage,
  UnclaimedPackage,
  ReceivedPackage
} from '../types/intake.js';

export interface SearchUnidentifiedOptions {
  /** Must supply at least one of tracking or customerName. */
  tracking?: string;
  customerName?: string;
}

export class IntakeResource extends ResourceBase {
  /**
   * Search unidentified intake packages. The full unidentified pool is private
   * to warehouse operations — at least one of `tracking` or `customerName` is
   * required. Returns up to 20 matches.
   */
  async searchUnidentified(options: SearchUnidentifiedOptions): Promise<UnidentifiedIntakePackage[]> {
    if (!options.tracking && !options.customerName) {
      throw new Error('searchUnidentified: at least one of `tracking` or `customerName` is required');
    }
    const raw = await this.http.request<{ data: UnidentifiedIntakePackage[] }>({
      method: 'GET',
      path: '/api/v1/intake/unidentified/search',
      query: { tracking: options.tracking, customerName: options.customerName }
    });
    return raw.data;
  }

  /** Courier-scoped list of packages under placeholder shippers. */
  async listUnclaimed(options?: PageOptions): Promise<{
    data: UnclaimedPackage[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const raw = await this.http.request<{
      data: UnclaimedPackage[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>({
      method: 'GET',
      path: '/api/v1/intake/unclaimed',
      query: this.buildPageQuery(options)
    });
    return { data: raw.data, pagination: raw.pagination };
  }

  listAllUnclaimed(options?: Omit<PageOptions, 'page'>): AsyncGenerator<UnclaimedPackage, void, void> {
    return this.paginate<UnclaimedPackage>((page) =>
      this.listUnclaimed({ ...(options ?? {}), page }).then((r) => ({ data: r.data, pagination: r.pagination }))
    );
  }

  /** Packages received for this courier since a given timestamp (required). */
  async listReceived(since: Date | string, options?: PageOptions): Promise<{
    data: ReceivedPackage[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const sinceIso = typeof since === 'string' ? since : since.toISOString();
    const raw = await this.http.request<{
      data: ReceivedPackage[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>({
      method: 'GET',
      path: '/api/v1/intake/received',
      query: { since: sinceIso, ...this.buildPageQuery(options) }
    });
    return { data: raw.data, pagination: raw.pagination };
  }

  listAllReceived(
    since: Date | string,
    options?: Omit<PageOptions, 'page'>
  ): AsyncGenerator<ReceivedPackage, void, void> {
    return this.paginate<ReceivedPackage>((page) =>
      this.listReceived(since, { ...(options ?? {}), page }).then((r) => ({
        data: r.data,
        pagination: r.pagination
      }))
    );
  }
}
