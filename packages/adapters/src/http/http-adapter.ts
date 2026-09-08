// HTTP Adapter — invokes agents over HTTP/REST endpoints

import type { Logger } from 'pino';
import type {
  AgentManifest,
  InvocationRequest,
  InvocationResponse,
  CapabilityId,
} from '@glue/contracts';
import { BaseAdapter, type AdapterOptions, type AdapterHealth } from '../sdk/adapter-sdk.js';

export class HttpAdapter extends BaseAdapter {
  readonly name = 'http';
  readonly capabilities = {
    protocol: 'http',
    supportsStreaming: false,
    supportsCancellation: false,
  };

  constructor(options: AdapterOptions) {
    super(options);
  }

  async inspect(endpoint: string): Promise<{
    manifest: AgentManifest;
    health: AdapterHealth;
  }> {
    const start = Date.now();
    try {
      const response = await fetch(`${endpoint}/.well-known/agent-manifest`, {
        signal: AbortSignal.timeout(this.defaultTimeoutMs),
      });
      const latency = Date.now() - start;

      if (!response.ok) {
        return {
          manifest: {
            apiVersion: 'glue/v1',
            kind: 'Agent',
            metadata: { id: 'unknown', name: 'HTTP Agent', version: '1.0.0' },
            spec: {
              interfaces: [{ protocol: 'http', endpoint }],
              capabilities: [],
            },
          },
          health: {
            status: 'degraded',
            lastChecked: new Date().toISOString(),
            latencyMs: latency,
            message: `HTTP ${response.status}`,
          },
        };
      }

      const manifest: AgentManifest = await response.json();
      return {
        manifest,
        health: {
          status: 'healthy',
          lastChecked: new Date().toISOString(),
          latencyMs: latency,
        },
      };
    } catch (err: any) {
      return {
        manifest: {
          apiVersion: 'glue/v1',
          kind: 'Agent',
          metadata: { id: 'unknown', name: 'HTTP Agent', version: '1.0.0' },
          spec: {
            interfaces: [{ protocol: 'http', endpoint }],
            capabilities: [],
          },
        },
        health: {
          status: 'unreachable',
          lastChecked: new Date().toISOString(),
          message: err.message,
        },
      };
    }
  }

  async identify(endpoint: string): Promise<{
    verified: boolean;
    identity?: { publicKeys?: string[] };
  }> {
    try {
      const response = await fetch(`${endpoint}/.well-known/agent-identity`, {
        signal: AbortSignal.timeout(this.defaultTimeoutMs),
      });
      if (!response.ok) return { verified: false };

      const data = await response.json();
      return {
        verified: true,
        identity: {
          publicKeys: data.publicKeys || [],
        },
      };
    } catch {
      return { verified: false };
    }
  }

  async describeCapabilities(endpoint: string): Promise<CapabilityId[]> {
    try {
      const response = await fetch(`${endpoint}/.well-known/capabilities`, {
        signal: AbortSignal.timeout(this.defaultTimeoutMs),
      });
      if (!response.ok) return [];

      const data = await response.json();
      return data.capabilities || [];
    } catch {
      return [];
    }
  }

  async invoke(request: InvocationRequest, endpoint: string): Promise<InvocationResponse> {
    const start = Date.now();

    try {
      const response = await fetch(`${endpoint}/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.defaultTimeoutMs),
      });

      const latency = Date.now() - start;

      if (!response.ok) {
        return this.createErrorResponse(
          request,
          'HTTP_ERROR',
          `HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500
        );
      }

      const result = await response.json();
      return {
        requestId: request.requestId,
        caller: request.caller,
        target: request.target,
        capability: request.capability,
        status: 'success',
        result: {
          output: result.output || result,
          artifacts: result.artifacts,
          confidence: result.confidence,
          citations: result.citations,
        },
        adapter: this.name,
        provenance: {
          requestId: request.requestId,
          caller: request.caller,
          target: request.target,
          adapter: this.name,
          policyDecision: 'allowed',
          capability: request.capability,
          artifacts: result.artifacts || [],
          durationMs: latency,
          timestamp: new Date().toISOString(),
        },
        durationMs: latency,
        createdAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return this.createErrorResponse(
        request,
        'NETWORK_ERROR',
        err.message,
        true
      );
    }
  }

  async health(endpoint: string): Promise<AdapterHealth> {
    const start = Date.now();
    try {
      const response = await fetch(`${endpoint}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;

      return {
        status: response.ok ? 'healthy' : 'degraded',
        lastChecked: new Date().toISOString(),
        latencyMs: latency,
      };
    } catch (err: any) {
      return {
        status: 'unreachable',
        lastChecked: new Date().toISOString(),
        message: err.message,
      };
    }
  }
}
