import { ResourceBase } from './base.js';
import type { VerifyResult, VerifyUsage } from '../types/verify.js';

export interface VerifyItemInput {
  /** What the item is, e.g. "Apple AirPods Pro 2". */
  itemDescription: string;
  merchantName?: string;
  /** What the shipper declared. Compared with the market value. */
  declaredValueUsd?: number;
  quantity?: number;
}

export type ReceiptMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export interface VerifyReceiptInput {
  /** The receipt file: raw bytes, a Blob, or a base64 string. ≤ 10 MB. */
  file: Uint8Array | ArrayBuffer | Blob | string;
  mimeType: ReceiptMimeType;
  /** What the shipper declared. Compared with the receipt total. */
  declaredValueUsd?: number;
}

/**
 * Logicware Verify (beta) — declared-value verification with Jamaica customs estimates.
 * Each successful check is one scan on your Verify plan. Receipt checks currently support
 * Amazon invoices only; other stores return `unsupported_merchant` (422) and aren't counted.
 * Requires an API key with the `verify` scope.
 */
export class VerifyResource extends ResourceBase {
  /** Check an item's value against live market prices; includes a customs estimate. */
  async item(input: VerifyItemInput): Promise<VerifyResult> {
    const raw = await this.http.request<{ data: VerifyResult }>({
      method: 'POST',
      path: '/api/v1/verify/item',
      body: input
    });
    return raw.data;
  }

  /**
   * Analyse a receipt: extraction, tamper and arithmetic checks, market pricing of the main
   * items, tariff classification, weight estimate and customs estimate.
   */
  async receipt(input: VerifyReceiptInput): Promise<VerifyResult> {
    const fileBase64 = await toBase64(input.file);
    const raw = await this.http.request<{ data: VerifyResult }>({
      method: 'POST',
      path: '/api/v1/verify/receipt',
      body: { fileBase64, mimeType: input.mimeType, declaredValueUsd: input.declaredValueUsd }
    });
    return raw.data;
  }

  /** Fetch a previous verification by id. */
  async get(verificationId: string): Promise<VerifyResult> {
    const raw = await this.http.request<{ data: VerifyResult }>({
      method: 'GET',
      path: `/api/v1/verify/${encodeURIComponent(verificationId)}`
    });
    return raw.data;
  }

  /** Scans used this calendar month, the allowance, and charges so far. */
  async usage(): Promise<VerifyUsage> {
    const raw = await this.http.request<{ data: VerifyUsage }>({
      method: 'GET',
      path: '/api/v1/verify/usage'
    });
    return raw.data;
  }
}

async function toBase64(file: Uint8Array | ArrayBuffer | Blob | string): Promise<string> {
  if (typeof file === 'string') {
    const comma = file.indexOf(',');
    return file.startsWith('data:') && comma > 0 ? file.slice(comma + 1) : file;
  }
  let bytes: Uint8Array;
  if (file instanceof Uint8Array) bytes = file;
  else if (file instanceof ArrayBuffer) bytes = new Uint8Array(file);
  else bytes = new Uint8Array(await file.arrayBuffer());

  const g = globalThis as { Buffer?: { from(b: Uint8Array): { toString(enc: string): string } } };
  if (g.Buffer) return g.Buffer.from(bytes).toString('base64');

  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
