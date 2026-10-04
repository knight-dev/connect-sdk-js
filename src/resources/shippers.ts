import type { HttpClient } from '../http/client.js';
import { ResourceBase } from './base.js';
import { ShipperAddressesResource } from './shipper-addresses.js';
import type { PageOptions } from '../types/common.js';
import type {
  Shipper,
  ShipperListItem,
  CreateShipperInput,
  UpdateShipperInput,
  BulkShipperInput,
  BulkUpsertResult,
  ShipperImportJob,
  ShipperImportProgress,
  ShipperImportFailuresPage,
  SyncShipperResult
} from '../types/shipper.js';

export interface ListShippersOptions extends PageOptions {
  search?: string;
}

/**
 * Synchronous /bulk limit matches the server's cap. When you have more than
 * this, call `client.shippers.importMany(...)` for async processing.
 */
export const BULK_SHIPPERS_MAX_ROWS = 500;

export class ShippersResource extends ResourceBase {
  public readonly addresses: ShipperAddressesResource;

  constructor(http: HttpClient) {
    super(http);
    this.addresses = new ShipperAddressesResource(http);
  }

  async list(options?: ListShippersOptions): Promise<{
    data: ShipperListItem[];
    pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const raw = await this.http.request<{
      data: ShipperListItem[];
      pagination: { page: number; pageSize: number; totalCount: number; totalPages: number };
    }>({
      method: 'GET',
      path: '/api/v1/shippers',
      query: { search: options?.search, ...this.buildPageQuery(options) }
    });
    return { data: raw.data, pagination: raw.pagination };
  }

  /** Async iterator — fetches pages lazily, yielding shippers one at a time. */
  listAll(options?: Omit<ListShippersOptions, 'page'>): AsyncGenerator<ShipperListItem, void, void> {
    return this.paginate<ShipperListItem>((page) =>
      this.list({ ...(options ?? {}), page }).then((r) => ({ data: r.data, pagination: r.pagination }))
    );
  }

  async get(id: string): Promise<Shipper> {
    const raw = await this.http.request<{ data: Shipper }>({
      method: 'GET',
      path: `/api/v1/shippers/${encodeURIComponent(id)}`
    });
    return raw.data;
  }

  async getByEmail(email: string): Promise<Shipper> {
    const raw = await this.http.request<{ data: Shipper }>({
      method: 'GET',
      path: `/api/v1/shippers/by-email/${encodeURIComponent(email)}`
    });
    return raw.data;
  }

  async getByCode(code: string): Promise<Shipper> {
    const raw = await this.http.request<{ data: Shipper }>({
      method: 'GET',
      path: `/api/v1/shippers/by-code/${encodeURIComponent(code)}`
    });
    return raw.data;
  }

  async create(input: CreateShipperInput): Promise<Shipper> {
    const raw = await this.http.request<{ data: Shipper }>({
      method: 'POST',
      path: '/api/v1/shippers',
      body: input
    });
    return raw.data;
  }

  async update(id: string, input: UpdateShipperInput): Promise<{ id: string; name: string }> {
    const raw = await this.http.request<{ data: { id: string; name: string } }>({
      method: 'PUT',
      path: `/api/v1/shippers/${encodeURIComponent(id)}`,
      body: input
    });
    return raw.data;
  }

  /**
   * Synchronous bulk upsert (matched by email). Auto-chunks inputs beyond
   * {@link BULK_SHIPPERS_MAX_ROWS} — returns one merged result across chunks.
   */
  async bulkCreate(inputs: BulkShipperInput[]): Promise<BulkUpsertResult> {
    if (inputs.length <= BULK_SHIPPERS_MAX_ROWS) {
      return this.bulkChunk(inputs);
    }

    const merged: BulkUpsertResult = {
      totalRows: 0,
      createdCount: 0,
      updatedCount: 0,
      errorCount: 0,
      results: []
    };
    for (let i = 0; i < inputs.length; i += BULK_SHIPPERS_MAX_ROWS) {
      const chunk = inputs.slice(i, i + BULK_SHIPPERS_MAX_ROWS);
      const result = await this.bulkChunk(chunk);
      merged.totalRows += result.totalRows;
      merged.createdCount += result.createdCount;
      merged.updatedCount += result.updatedCount;
      merged.errorCount += result.errorCount;
      // Re-index rows across chunks so the caller has a stable index into the original array
      for (const row of result.results) {
        merged.results.push({ ...row, index: row.index + i });
      }
    }
    return merged;
  }

  private async bulkChunk(chunk: BulkShipperInput[]): Promise<BulkUpsertResult> {
    const raw = await this.http.request<{ data: BulkUpsertResult }>({
      method: 'POST',
      path: '/api/v1/shippers/bulk',
      body: { shippers: chunk }
    });
    return raw.data;
  }

  /** Kick off an async import (up to 100k rows). Returns the job id to poll. */
  async importMany(inputs: BulkShipperInput[]): Promise<ShipperImportJob> {
    const raw = await this.http.request<{ data: ShipperImportJob }>({
      method: 'POST',
      path: '/api/v1/shippers/imports',
      body: { shippers: inputs }
    });
    return raw.data;
  }

  async getImport(jobId: string): Promise<ShipperImportProgress> {
    const raw = await this.http.request<{ data: ShipperImportProgress }>({
      method: 'GET',
      path: `/api/v1/shippers/imports/${encodeURIComponent(jobId)}`
    });
    return raw.data;
  }

  async getImportFailures(
    jobId: string,
    options?: { offset?: number; limit?: number }
  ): Promise<ShipperImportFailuresPage> {
    const raw = await this.http.request<{ data: ShipperImportFailuresPage }>({
      method: 'GET',
      path: `/api/v1/shippers/imports/${encodeURIComponent(jobId)}/failures`,
      query: { offset: options?.offset, limit: options?.limit }
    });
    return raw.data;
  }

  /**
   * Poll an async import until it reaches a terminal state. Yields progress
   * snapshots at the given interval so callers can surface status to users.
   */
  async *importProgress(
    jobId: string,
    options?: { intervalMs?: number; timeoutMs?: number }
  ): AsyncGenerator<ShipperImportProgress, ShipperImportProgress, void> {
    const intervalMs = options?.intervalMs ?? 2000;
    const deadline = options?.timeoutMs ? Date.now() + options.timeoutMs : Infinity;

    while (true) {
      const snap = await this.getImport(jobId);
      yield snap;
      if (isTerminal(snap.status)) return snap;
      if (Date.now() >= deadline) return snap;
      await sleep(intervalMs);
    }
  }

  /** Upsert a single shipper by email. Returns `status: "created" | "updated"`. */
  async sync(input: BulkShipperInput): Promise<SyncShipperResult> {
    const raw = await this.http.request<{ data: SyncShipperResult }>({
      method: 'POST',
      path: '/api/v1/shippers/sync',
      body: input
    });
    return raw.data;
  }
}

function isTerminal(status: string): boolean {
  return status === 'Completed' || status === 'PartialSuccess' || status === 'Failed' || status === 'Cancelled';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
