import { ResourceBase } from './base.js';

export interface RateCalculationInput {
  warehouseId?: string;
  weightLbs: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  declaredValueUsd?: number;
  freightType?: 'Air' | 'Sea';
  destinationParish?: string;
}

export interface RateCalculationResult {
  totalUsd: number;
  breakdown: Array<{ label: string; amountUsd: number }>;
  chargeableWeightLbs: number;
  [extra: string]: unknown;
}

export class RatesResource extends ResourceBase {
  /**
   * Calculate shipping rates. Anonymous endpoint — does not require an API key,
   * but calling through the SDK still sends one.
   */
  async calculate(input: RateCalculationInput): Promise<RateCalculationResult> {
    const raw = await this.http.request<{ data: RateCalculationResult }>({
      method: 'GET',
      path: '/api/v1/rates/calculate',
      query: {
        warehouseId: input.warehouseId,
        weightLbs: input.weightLbs,
        lengthIn: input.lengthIn,
        widthIn: input.widthIn,
        heightIn: input.heightIn,
        declaredValueUsd: input.declaredValueUsd,
        freightType: input.freightType,
        destinationParish: input.destinationParish
      }
    });
    return raw.data;
  }
}
