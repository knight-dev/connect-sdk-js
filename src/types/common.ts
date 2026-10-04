/**
 * Standard paginated list response shape.
 * Matches the `{ success, data, pagination }` envelope returned by api-courier V1.
 */
export interface Page<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/** Common pagination options accepted by every list endpoint. */
export interface PageOptions {
  page?: number;
  pageSize?: number;
}

/** A filter for "since a timestamp" polling — passes through as ISO-8601. */
export interface SinceFilter {
  since?: Date | string;
}

/** ISO-8601 datetime from the server. Prefer `Date` in new code; string is for strict transport. */
export type IsoDateTime = string;
