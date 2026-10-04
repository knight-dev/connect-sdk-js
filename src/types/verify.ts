/** Logicware Verify and Jamaica customs types (`/api/v1/verify`, `/api/v1/customs`). */

export type VerifyVerdict = 'verified' | 'review' | 'high_risk' | 'unable_to_verify';

export type VerifySignalSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

/** One reason the risk score moved. `code` is stable — safe to switch on. */
export interface VerificationSignal {
  code: string;
  severity: VerifySignalSeverity;
  /** "forensics" | "arithmetic" | "market" | "declared" | "history" | "document" */
  source: string;
  description: string;
  /** Risk points this signal added (0 for informational / reassuring signals). */
  points: number;
}

export interface MarketplaceListing {
  title: string;
  priceUsd: number;
  /** The store's own crossed-out price, when shown (e.g. Amazon). */
  listPriceUsd?: number | null;
  marketplace: string;
  url?: string | null;
  dataSource: string;
}

export interface VerifiedItem {
  description: string;
  normalizedName?: string | null;
  category?: string | null;
  quantity: number;
  unitPricePaidUsd?: number | null;
  marketLowUsd?: number | null;
  marketMedianUsd?: number | null;
  marketHighUsd?: number | null;
  /** "marketplace" | "ai_estimate" | "none" */
  priceSource: string;
  matchedListings: MarketplaceListing[];
  listingsConsidered: number;
  /** 0–1: how plausible a genuine discount is. */
  discountLikelihood: number;
  discountReason?: string | null;
  /** "consistent" | "below_market" | "above_market" | "unknown" */
  assessment: string;
  priceRatio?: number | null;
  /** Jamaica tariff line (2026 tariff) the item was classified under. */
  tariffCode?: string | null;
  tariffName?: string | null;
  /** One or two Amazon links to check the product by hand: product pages, or a search. */
  amazonLinks?: Array<{ title: string; url: string; kind: 'product' | 'search' }>;
  /** The next likely classification, for one-click switching. */
  alternativeTariffCode?: string | null;
  alternativeTariffName?: string | null;
  /** What the item is, generically ("face serum") — what it was classified by. */
  productType?: string | null;
  importDutyRate?: number | null;
  gctRate?: number | null;
  /** AI estimate of one unit's packed shipping weight (lbs). */
  estimatedWeightLbs?: number | null;
  /** AI estimate of one unit's packed dimensions [length, width, height] in inches. */
  estimatedDimensionsIn?: number[] | null;
}

export interface ExtractedReceipt {
  isReceipt: boolean;
  documentType?: string | null;
  merchant?: string | null;
  orderNumber?: string | null;
  orderDate?: string | null;
  currency?: string | null;
  subtotal?: number | null;
  tax?: number | null;
  shipping?: number | null;
  discount?: number | null;
  total?: number | null;
  /** Order-level fees (e.g. Amazon's exchange-rate guarantee fee). */
  otherFees?: number | null;
  /**
   * Set when the receipt was charged in another currency (Amazon bills international cards in
   * JMD with USD item prices): every amount above is converted to USD; these keep what was charged.
   */
  originalCurrency?: string | null;
  originalTotal?: number | null;
  /** Units of `originalCurrency` per US$1 used to convert. */
  convertedAtRate?: number | null;
  /** "receipt" (rate printed on it) or "courier" (your configured rate). */
  conversionRateSource?: string | null;
  paymentMethod?: string | null;
  legibility?: string | null;
  lineItems: Array<{
    description: string;
    searchQuery?: string | null;
    quantity: number;
    unitPrice?: number | null;
    lineTotal?: number | null;
    listPrice?: number | null;
    discountNote?: string | null;
    productType?: string | null;
    /** Every receipt line is classified, not only the priced ones. */
    tariffCode?: string | null;
    tariffName?: string | null;
    alternativeTariffCode?: string | null;
    alternativeTariffName?: string | null;
  }>;
  forensics: Array<{ code: string; severity: string; description: string }>;
}

export interface VerificationReport {
  success: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  mode: 'item' | 'receipt';
  verdict: VerifyVerdict;
  /** 0–100, higher is riskier. Sum of `signals[].points`, capped. */
  riskScore: number;
  /** 0–1: how much evidence the verdict rests on. */
  confidence: number;
  summary?: string | null;
  declaredValueUsd?: number | null;
  assessedValueUsd?: number | null;
  receipt?: ExtractedReceipt | null;
  items: VerifiedItem[];
  signals: VerificationSignal[];
  /** Estimated Jamaica customs on the goods, using your customs settings. */
  customs?: CustomsEstimate | null;
  /** AI estimate of the main items' packed shipping weight (lbs). */
  estimatedShippingWeightLbs?: number | null;
  durationMs: number;
}

export interface VerifyResult {
  success: boolean;
  errorMessage?: string | null;
  /** "quota_exceeded" | "invalid_file" | "file_too_large" | "unsupported_merchant" | "analysis_failed" */
  errorCode?: string | null;
  verificationId?: string | null;
  report?: VerificationReport | null;
  /** True when this is the earlier result for the same reference and input — not counted as a scan. */
  reused?: boolean;
  /** When the result was produced (the original time when `reused`). */
  checkedAtUtc?: string | null;
  /** Scans used / remaining this month, after this request. */
  usage?: VerifyUsage | null;
}

export interface VerifyProgress {
  /** "loading" | "reused" | "reading" | "checking" | "pricing" | "classifying" | "weighing" | "customs" | "saving" | "done" */
  stage: string;
  message: string;
  done: boolean;
  steps: Array<{ stage: string; message: string; atUtc: string }>;
}

export interface VerifyUsage {
  periodStartUtc: string;
  periodEndUtc: string;
  /** "free" | "bundle" | "payg" */
  plan: string;
  planName: string;
  scansUsed: number;
  scansIncluded: number;
  scansRemaining: number;
  extraScans: number;
  stopsAtAllowance: boolean;
  canScan: boolean;
  chargesSoFarUsd: number;
  prices: {
    freeScansPerMonth: number;
    bundleScansPerMonth: number;
    bundleMonthlyFeeUsd: number;
    bundleOveragePerScanUsd: number;
    paygPerScanUsd: number;
  };
}

// ── Customs ────────────────────────────────────────────────────────────

/** A Jamaica tariff line. Rates are fractions (0.2 = 20%); null = not applicable. */
export interface TariffMatch {
  tariffCode: string;
  /** Practical name ("Smartphone") when from the item list, else the tariff description. */
  name: string;
  /** "item" (practical list) | "tariff" (raw tariff line) */
  source: 'item' | 'tariff';
  group?: string | null;
  description: string;
  path: string;
  importDuty?: number | null;
  gct?: number | null;
  additionalStampDuty?: number | null;
  specialConsumptionTax?: number | null;
  excise?: number | null;
  standardComplianceFee?: number | null;
  environmentalLevy?: number | null;
  /** True for lines with per-unit charges (alcohol, tobacco, fuel) the estimate can't include. */
  needsManualAssessment: boolean;
  specificRateNote?: string | null;
  /** 0–1 match score for description searches. */
  score: number;
}

export interface CustomsChargeLine {
  /** "ID" | "ASD" | "SCT" | "EXC" | "SCF" | "ENVL" | "CAF" | "STAMP" | "GCT" */
  code: string;
  label: string;
  basis: string;
  rate: number;
  amountJmd: number;
}

export interface CustomsEstimate {
  success: boolean;
  errorMessage?: string | null;
  tariff?: TariffMatch | null;
  alternatives: TariffMatch[];
  valueUsd: number;
  cifUsd: number;
  cifJmd: number;
  exchangeRate: number;
  deMinimisApplied: boolean;
  deMinimisUsd: number;
  /** What is owed. Empty under de minimis. */
  charges: CustomsChargeLine[];
  /** De minimis only: what the goods would cost above the threshold. Not owed — a preview. */
  previewCharges: CustomsChargeLine[];
  previewTotalJmd: number;
  /** Per-goods classification for receipt / consignment estimates. */
  items: Array<{ description: string; valueUsd: number; tariff?: TariffMatch | null }>;
  totalJmd: number;
  totalUsd: number;
  /** Total ÷ CIF. */
  effectiveRate: number;
  notes: string[];
  tariffVersion: string;
}
