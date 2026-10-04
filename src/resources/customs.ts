import { ResourceBase } from './base.js';
import type { CustomsEstimate, TariffMatch } from '../types/verify.js';

export interface CustomsEstimateInput {
  /** Value of the goods in USD (all units). */
  valueUsd: number;
  freightUsd?: number;
  insuranceUsd?: number;
  /** 10-digit Jamaica tariff code. Or give `description` to match one. */
  tariffCode?: string;
  description?: string;
  /** JMD per USD. Defaults to your configured rate. */
  exchangeRate?: number;
}

/**
 * Jamaica customs from the 2026 Integrated Tariff (HS 2022). Deterministic and not metered.
 * Requires an API key with the `customs` or `verify` scope.
 */
export class CustomsResource extends ResourceBase {
  /** Search tariff lines by item description ("bluetooth speaker", "sneakers"). */
  async searchTariffs(query: string, limit = 15): Promise<TariffMatch[]> {
    const raw = await this.http.request<{ data: TariffMatch[] }>({
      method: 'GET',
      path: '/api/v1/customs/tariffs/search',
      query: { q: query, limit }
    });
    return raw.data;
  }

  /** One tariff line with its rates. */
  async getTariff(code: string): Promise<TariffMatch> {
    const raw = await this.http.request<{ data: TariffMatch }>({
      method: 'GET',
      path: `/api/v1/customs/tariffs/${encodeURIComponent(code)}`
    });
    return raw.data;
  }

  /** Estimate duties, fees and GCT in JMD, by tariff code or description. */
  async estimate(input: CustomsEstimateInput): Promise<CustomsEstimate> {
    const raw = await this.http.request<{ data: CustomsEstimate }>({
      method: 'POST',
      path: '/api/v1/customs/estimate',
      body: input
    });
    return raw.data;
  }
}
