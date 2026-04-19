import { ResourceBase } from './base.js';
import type { PageOptions } from '../types/common.js';
import type {
  Manifest,
  ManifestStatus,
  ManifestType,
  CreateManifestInput,
  UpdateManifestInput,
  FinalizeManifestInput,
  UpdateManifestStatusInput,
  AddPackagesResult
} from '../types/manifest.js';

export interface ListManifestsOptions extends PageOptions {
  status?: ManifestStatus;
  type?: ManifestType;
}

export class ManifestsResource extends ResourceBase {
  async list(options?: ListManifestsOptions): Promise<{ data: unknown }> {
    const raw = await this.http.request<{ data: unknown }>({
      method: 'GET',
      path: '/api/v1/manifests',
      query: { status: options?.status, type: options?.type, ...this.buildPageQuery(options) }
    });
    return { data: raw.data };
  }

  listAll(options?: Omit<ListManifestsOptions, 'page'>): AsyncGenerator<Manifest, void, void> {
    // The list endpoint's paginated envelope is inside `data` (not at the top level)
    // because the session-auth version embeds its own pagination. We surface an
    // async iterator over results irrespective of that nesting.
    const self = this;
    return (async function* () {
      let page = 1;
      while (true) {
        const raw = await self.http.request<{
          data:
            | { manifests: Manifest[]; pagination?: { page: number; totalPages: number } }
            | Manifest[];
        }>({
          method: 'GET',
          path: '/api/v1/manifests',
          query: { status: options?.status, type: options?.type, page, pageSize: options?.pageSize }
        });

        const data = raw.data;
        const items = Array.isArray(data) ? data : (data.manifests ?? []);
        for (const m of items) yield m;

        const pagination = Array.isArray(data) ? undefined : data.pagination;
        if (!pagination || pagination.page >= pagination.totalPages) return;
        page++;
      }
    })();
  }

  async get(id: string): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'GET',
      path: `/api/v1/manifests/${encodeURIComponent(id)}`
    });
    return raw.data;
  }

  async create(input: CreateManifestInput): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'POST',
      path: '/api/v1/manifests',
      body: input
    });
    return raw.data;
  }

  async update(id: string, input: UpdateManifestInput): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'PUT',
      path: `/api/v1/manifests/${encodeURIComponent(id)}`,
      body: input
    });
    return raw.data;
  }

  /**
   * Set IsOpen. `isOpen:true` auto-closes any other open manifest of the same
   * type. `isOpen:false` stops auto-linking — NOT the same as finalize().
   */
  async setOpen(id: string, isOpen: boolean, autoLinkPackages = false): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'POST',
      path: `/api/v1/manifests/${encodeURIComponent(id)}/open`,
      body: { isOpen, autoLinkPackages }
    });
    return raw.data;
  }

  /** Convenience wrappers for the two common cases. */
  close(id: string): Promise<Manifest> {
    return this.setOpen(id, false);
  }

  reopen(id: string, autoLinkPackages = false): Promise<Manifest> {
    return this.setOpen(id, true, autoLinkPackages);
  }

  /** Transition Draft → Finalized. Captures customs + financial data. */
  async finalize(id: string, input?: FinalizeManifestInput): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'POST',
      path: `/api/v1/manifests/${encodeURIComponent(id)}/finalize`,
      body: input ?? {}
    });
    return raw.data;
  }

  /**
   * Post-finalize status transition:
   * Finalized → Shipped → InTransit → AtCustoms → Cleared → Arrived → Completed
   * (or Cancelled from any non-Completed state).
   */
  async setStatus(id: string, input: UpdateManifestStatusInput): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'POST',
      path: `/api/v1/manifests/${encodeURIComponent(id)}/status`,
      body: input
    });
    return raw.data;
  }

  async addPackages(id: string, packageIds: string[]): Promise<AddPackagesResult> {
    const raw = await this.http.request<{ data: AddPackagesResult }>({
      method: 'POST',
      path: `/api/v1/manifests/${encodeURIComponent(id)}/packages`,
      body: { packageIds }
    });
    return raw.data;
  }

  async removePackage(id: string, packageId: string): Promise<Manifest> {
    const raw = await this.http.request<{ data: Manifest }>({
      method: 'DELETE',
      path: `/api/v1/manifests/${encodeURIComponent(id)}/packages/${encodeURIComponent(packageId)}`
    });
    return raw.data;
  }

  async delete(id: string): Promise<void> {
    await this.http.request({
      method: 'DELETE',
      path: `/api/v1/manifests/${encodeURIComponent(id)}`
    });
  }
}
