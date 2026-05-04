import { HttpClient, type HttpClientOptions } from './http/client.js';
import { SDK_VERSION } from './version.js';
import { WarehousesResource } from './resources/warehouses.js';
import { ShippersResource } from './resources/shippers.js';
import { PackagesResource } from './resources/packages.js';
import { ManifestsResource } from './resources/manifests.js';
import { PreAlertsResource } from './resources/prealerts.js';
import { IntakeResource } from './resources/intake.js';
import { MissingPackagesResource } from './resources/missing-packages.js';
import { RatesResource } from './resources/rates.js';

export interface LogicwareConnectOptions extends Omit<HttpClientOptions, 'fetch'> {
  /** Optional custom fetch for tests or Node < 20. Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
}

/**
 * Root SDK client for Logicware Connect.
 *
 * ```ts
 * import { LogicwareConnect } from '@logicware.app/connect-sdk';
 *
 * const client = new LogicwareConnect({
 *   apiKey: process.env.LW_API_KEY!,
 *   baseUrl: 'https://fastship-api.logicware.app',
 * });
 *
 * const shipper = await client.shippers.getByEmail('customer@example.com');
 * ```
 */
export class LogicwareConnect {
  public static readonly VERSION = SDK_VERSION;

  /** @internal — resources use this; consumers should prefer the resource accessors. */
  public readonly http: HttpClient;

  public readonly warehouses: WarehousesResource;
  public readonly shippers: ShippersResource;
  public readonly packages: PackagesResource;
  public readonly manifests: ManifestsResource;
  public readonly prealerts: PreAlertsResource;
  public readonly intake: IntakeResource;
  public readonly missingPackages: MissingPackagesResource;
  public readonly rates: RatesResource;

  constructor(options: LogicwareConnectOptions) {
    this.http = new HttpClient(options);
    this.warehouses = new WarehousesResource(this.http);
    this.shippers = new ShippersResource(this.http);
    this.packages = new PackagesResource(this.http);
    this.manifests = new ManifestsResource(this.http);
    this.prealerts = new PreAlertsResource(this.http);
    this.intake = new IntakeResource(this.http);
    this.missingPackages = new MissingPackagesResource(this.http);
    this.rates = new RatesResource(this.http);
  }
}
