// @glue/adapters — Adapter SDK and built-in adapters

export {
  BaseAdapter,
  AdapterRegistry,
  type Adapter,
  type AdapterOptions,
  type AdapterCapabilities,
  type AdapterHealth,
} from './sdk/adapter-sdk.js';

export { HttpAdapter } from './http/http-adapter.js';
export { CliAdapter, type CliAdapterOptions } from './cli/cli-adapter.js';
