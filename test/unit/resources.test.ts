import { describe, it, expect, vi } from 'vitest';
import { LogicwareConnect, BULK_SHIPPERS_MAX_ROWS } from '../../src/index.js';

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) }
  });
}

function makeClient(fetchImpl: typeof fetch) {
  return new LogicwareConnect({
    apiKey: 'sk_test',
    baseUrl: 'https://api.test',
    fetch: fetchImpl
  });
}

describe('Warehouses resource', () => {
  it('list hits /api/v1/warehouses', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: [{ id: 'w1', name: 'Miami' }] })
    );
    const client = makeClient(fetchImpl);
    const result = await client.warehouses.list();
    expect(result).toEqual([{ id: 'w1', name: 'Miami' }]);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/warehouses');
  });

  it('get encodes id into the path', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'w 1' } })
    );
    const client = makeClient(fetchImpl);
    await client.warehouses.get('w 1');
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/warehouses/w%201');
  });
});

describe('Shippers resource', () => {
  it('list passes search + page params', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, pageSize: 25, totalCount: 0, totalPages: 0 }
      })
    );
    const client = makeClient(fetchImpl);
    await client.shippers.list({ search: 'acme', page: 2, pageSize: 50 });
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'https://api.test/api/v1/shippers?search=acme&page=2&pageSize=50'
    );
  });

  it('clamps pageSize to 100', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, pageSize: 100, totalCount: 0, totalPages: 0 }
      })
    );
    const client = makeClient(fetchImpl);
    await client.shippers.list({ pageSize: 9999 });
    const url = fetchImpl.mock.calls[0]![0] as string;
    expect(url).toContain('pageSize=100');
    expect(url).not.toContain('9999');
  });

  it('getByEmail and getByCode encode the input', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () =>
      jsonResponse({ success: true, data: { id: 's1' } })
    );
    const client = makeClient(fetchImpl);
    await client.shippers.getByEmail('a@b.com');
    await client.shippers.getByCode('FSJ-A1B2C3');
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/shippers/by-email/a%40b.com');
    expect(fetchImpl.mock.calls[1]![0]).toBe('https://api.test/api/v1/shippers/by-code/FSJ-A1B2C3');
  });

  it('bulkCreate auto-chunks beyond the max rows limit and re-indexes results', async () => {
    const bulkResult = (size: number, offsetInChunk: number) => ({
      success: true,
      data: {
        totalRows: size,
        createdCount: size,
        updatedCount: 0,
        errorCount: 0,
        results: Array.from({ length: size }, (_, i) => ({
          index: i,
          email: `u${i + offsetInChunk}@x.com`,
          status: 'created',
          shipperId: `s${i + offsetInChunk}`,
          shipperCode: null,
          errorCode: null,
          errorMessage: null
        }))
      }
    });

    const fetchImpl = vi.fn<typeof fetch>()
      .mockImplementationOnce(async () => jsonResponse(bulkResult(BULK_SHIPPERS_MAX_ROWS, 0)))
      .mockImplementationOnce(async () => jsonResponse(bulkResult(50, BULK_SHIPPERS_MAX_ROWS)));

    const client = makeClient(fetchImpl);
    const inputs = Array.from({ length: BULK_SHIPPERS_MAX_ROWS + 50 }, (_, i) => ({
      email: `u${i}@x.com`,
      name: `User ${i}`
    }));

    const result = await client.shippers.bulkCreate(inputs);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.totalRows).toBe(BULK_SHIPPERS_MAX_ROWS + 50);
    expect(result.createdCount).toBe(BULK_SHIPPERS_MAX_ROWS + 50);
    // Second chunk's first row should have original-array index 500, not 0.
    expect(result.results[BULK_SHIPPERS_MAX_ROWS]!.index).toBe(BULK_SHIPPERS_MAX_ROWS);
  });

  it('nested addresses resource calls correct path', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: [] })
    );
    const client = makeClient(fetchImpl);
    await client.shippers.addresses.list('shipper-123');
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/shippers/shipper-123/addresses');
  });
});

describe('Manifests resource', () => {
  it('close / reopen are convenience wrappers around /open', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'm1', isOpen: false } })
    );
    const client = makeClient(fetchImpl);
    await client.manifests.close('m1');

    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ isOpen: false, autoLinkPackages: false }));
  });

  it('addPackages sends packageIds array', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: { addedCount: 2, skippedCount: 0, errors: [] } })
    );
    const client = makeClient(fetchImpl);
    await client.manifests.addPackages('m1', ['p1', 'p2']);
    const init = fetchImpl.mock.calls[0]![1]!;
    expect(init.body).toBe(JSON.stringify({ packageIds: ['p1', 'p2'] }));
  });
});

describe('PreAlerts resource', () => {
  it('lookupByTracking uses query param, not path', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, found: true, data: { id: 'p1' } })
    );
    const client = makeClient(fetchImpl);
    const result = await client.prealerts.lookupByTracking('1Z999');
    expect(result.found).toBe(true);
    expect(fetchImpl.mock.calls[0]![0]).toBe('https://api.test/api/v1/prealerts/lookup?tracking=1Z999');
  });
});

describe('Intake resource', () => {
  it('searchUnidentified throws when no query params are given', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const client = makeClient(fetchImpl);
    await expect(client.intake.searchUnidentified({})).rejects.toThrow(/tracking.*customerName/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('listReceived requires a since timestamp and passes it as ISO', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        success: true,
        data: [],
        pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0 }
      })
    );
    const client = makeClient(fetchImpl);
    const since = new Date('2026-01-01T00:00:00.000Z');
    await client.intake.listReceived(since);
    const url = fetchImpl.mock.calls[0]![0] as string;
    expect(url).toContain('since=2026-01-01T00%3A00%3A00.000Z');
  });
});

describe('MissingPackages resource', () => {
  it('create sends shipperId + warehouseLocationId + tracking', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({ success: true, data: { id: 'req1', status: 'Pending' } })
    );
    const client = makeClient(fetchImpl);
    const result = await client.missingPackages.create({
      shipperId: 's1',
      warehouseLocationId: 'w1',
      trackingNumber: '1Z999',
      isUrgent: true
    });
    expect(result).toEqual({ id: 'req1', status: 'Pending' });
    const init = fetchImpl.mock.calls[0]![1]!;
    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(parsed['shipperId']).toBe('s1');
    expect(parsed['isUrgent']).toBe(true);
  });
});
