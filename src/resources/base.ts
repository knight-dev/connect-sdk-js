import type { HttpClient } from '../http/client.js';
import type { Page, PageOptions } from '../types/common.js';

/**
 * Base class for all SDK resources. Provides the HTTP client reference plus
 * small helpers for common patterns (paginate, async-iterate).
 */
export abstract class ResourceBase {
  constructor(protected readonly http: HttpClient) {}

  /**
   * Unwrap the `{ success: true, data: ... }` envelope. On error the HttpClient
   * has already thrown LogicwareApiError, so here we only handle the success path.
   */
  protected unwrap<T>(response: { success?: boolean; data?: T; [key: string]: unknown }): T {
    return (response.data as T) ?? (response as unknown as T);
  }

  /**
   * Iterate every page of a list endpoint. Yields each item one by one.
   * Stops when `pagination.page >= pagination.totalPages` (or pagination is absent).
   */
  protected async *paginate<T>(
    fetcher: (page: number) => Promise<Page<T>>,
    start: number = 1
  ): AsyncGenerator<T, void, void> {
    let page = start;
    while (true) {
      const result = await fetcher(page);
      for (const item of result.data) yield item;
      if (!result.pagination || result.pagination.page >= result.pagination.totalPages) return;
      page++;
    }
  }

  /**
   * Build a query object from PageOptions, clamping pageSize to 100 to match
   * every V1 list endpoint's server-side cap.
   */
  protected buildPageQuery(opts?: PageOptions): Record<string, number | undefined> {
    return {
      page: opts?.page,
      pageSize: opts?.pageSize !== undefined ? Math.min(opts.pageSize, 100) : undefined
    };
  }
}
