// G.L.U.E. Adapter SDK — common interface for protocol adapters

import type {
  AgentManifest,
  AgentRecord,
  InvocationRequest,
  InvocationResponse,
  CapabilityId,
} from '@glue/contracts';
import type { Logger } from 'pino';

export interface AdapterCapabilities {
  protocol: string;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'unreachable';
  lastChecked: string;
  latencyMs?: number;
  message?: string;
}

export interface AdapterOptions {
  logger: Logger;
  timeoutMs?: number;
}

/**
 * Base interface every G.L.U.E. adapter must implement.
 * Translates between native protocols and the canonical invocation envelope.
 */
export interface Adapter {
  readonly name: string;
  readonly capabilities: AdapterCapabilities;

  /**
   * Inspect a native endpoint and return agent metadata
   */
  inspect(endpoint: string): Promise<{
    manifest: AgentManifest;
    health: AdapterHealth;
  }>;

  /**
   * Verify the identity/interface of an agent
   */
  identify(endpoint: string): Promise<{
    verified: boolean;
    identity?: AgentRecord['identity'];
  }>;

  /**
   * Describe agent capabilities
   */
  describeCapabilities(endpoint: string): Promise<CapabilityId[]>;

  /**
   * Invoke a capability on the target agent
   */
  invoke(request: InvocationRequest, endpoint: string): Promise<InvocationResponse>;

  /**
   * Stream results (if supported)
   */
  stream?(
    request: InvocationRequest,
    endpoint: string,
    onEvent: (event: { type: string; data: unknown }) => void
  ): Promise<void>;

  /**
   * Cancel an in-flight invocation
   */
  cancel?(invocationId: string, endpoint: string): Promise<boolean>;

  /**
   * Check adapter/agent health
   */
  health(endpoint: string): Promise<AdapterHealth>;

  /**
   * Graceful shutdown
   */
  close(): Promise<void>;
}

/**
 * Base class with common adapter utilities
 */
export abstract class BaseAdapter implements Adapter {
  abstract readonly name: string;
  abstract readonly capabilities: AdapterCapabilities;

  protected logger: Logger;
  protected defaultTimeoutMs: number;

  constructor(options: AdapterOptions) {
    this.logger = options.logger.child({ adapter: (this as any).name ?? 'unknown' });
    this.defaultTimeoutMs = options.timeoutMs ?? 30000;
  }

  abstract inspect(endpoint: string): Promise<{
    manifest: AgentManifest;
    health: AdapterHealth;
  }>;

  abstract identify(endpoint: string): Promise<{
    verified: boolean;
    identity?: AgentRecord['identity'];
  }>;

  abstract describeCapabilities(endpoint: string): Promise<CapabilityId[]>;

  abstract invoke(request: InvocationRequest, endpoint: string): Promise<InvocationResponse>;

  abstract health(endpoint: string): Promise<AdapterHealth>;

  async close(): Promise<void> {
    this.logger.info('Adapter closed');
  }

  protected createErrorResponse(
    request: InvocationRequest,
    code: string,
    message: string,
    retryable: boolean = false
  ): InvocationResponse {
    return {
      requestId: request.requestId,
      caller: request.caller,
      target: request.target,
      capability: request.capability,
      status: 'error',
      error: { code, message, retryable },
      adapter: this.name,
      provenance: {
        requestId: request.requestId,
        caller: request.caller,
        target: request.target,
        adapter: this.name,
        policyDecision: 'adapter-error',
        capability: request.capability,
        artifacts: [],
        durationMs: 0,
        timestamp: new Date().toISOString(),
      },
      durationMs: 0,
      createdAt: new Date().toISOString(),
    };
  }
}

// Adapter registry
export class AdapterRegistry {
  private adapters = new Map<string, Adapter>();

  register(adapter: Adapter): void {
    this.adapters.set(adapter.capabilities.protocol, adapter);
  }

  get(protocol: string): Adapter | undefined {
    return this.adapters.get(protocol);
  }

  list(): Adapter[] {
    return Array.from(this.adapters.values());
  }

  getProtocols(): string[] {
    return Array.from(this.adapters.keys());
  }
}
