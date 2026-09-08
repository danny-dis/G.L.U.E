// CLI Adapter — invokes agents via CLI/stdin-stdout

import type { Logger } from 'pino';
import type {
  AgentManifest,
  InvocationRequest,
  InvocationResponse,
  CapabilityId,
} from '@glue/contracts';
import { BaseAdapter, type AdapterOptions, type AdapterHealth } from '../sdk/adapter-sdk.js';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

export interface CliAdapterOptions extends AdapterOptions {
  env?: Record<string, string>;
  cwd?: string;
}

export class CliAdapter extends BaseAdapter {
  readonly name = 'cli';
  readonly capabilities = {
    protocol: 'cli',
    supportsStreaming: false,
    supportsCancellation: true,
  };

  constructor(private options2: CliAdapterOptions) {
    super(options2);
  }

  async inspect(command: string): Promise<{
    manifest: AgentManifest;
    health: AdapterHealth;
  }> {
    try {
      const { stdout } = await execFileAsync(command, ['inspect'], {
        env: this.options2.env,
        cwd: this.options2.cwd,
        timeout: this.defaultTimeoutMs,
      });

      const manifest: AgentManifest = JSON.parse(stdout);
      return {
        manifest,
        health: {
          status: 'healthy',
          lastChecked: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return {
        manifest: {
          apiVersion: 'glue/v1',
          kind: 'Agent',
          metadata: { id: 'cli-agent', name: 'CLI Agent', version: '1.0.0' },
          spec: {
            interfaces: [{ protocol: 'cli', endpoint: command }],
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

  async identify(command: string): Promise<{
    verified: boolean;
    identity?: { publicKeys?: string[] };
  }> {
    try {
      const { stdout } = await execFileAsync(command, ['identify'], {
        env: this.options2.env,
        cwd: this.options2.cwd,
        timeout: this.defaultTimeoutMs,
      });

      const data = JSON.parse(stdout);
      return {
        verified: data.verified || false,
        identity: data.identity,
      };
    } catch {
      return { verified: false };
    }
  }

  async describeCapabilities(command: string): Promise<CapabilityId[]> {
    try {
      const { stdout } = await execFileAsync(command, ['capabilities'], {
        env: this.options2.env,
        cwd: this.options2.cwd,
        timeout: this.defaultTimeoutMs,
      });

      const data = JSON.parse(stdout);
      return data.capabilities || [];
    } catch {
      return [];
    }
  }

  async invoke(request: InvocationRequest, command: string): Promise<InvocationResponse> {
    const start = Date.now();

    return new Promise((resolve) => {
      const child = spawn(command, ['invoke'], {
        env: { ...process.env, ...this.options2.env },
        cwd: this.options2.cwd,
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        child.kill();
        resolve(this.createErrorResponse(request, 'TIMEOUT', `CLI invocation timed out after ${this.defaultTimeoutMs}ms`, false));
      }, this.defaultTimeoutMs);

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        const latency = Date.now() - start;

        if (code !== 0 && !stdout) {
          resolve(this.createErrorResponse(request, 'CLI_ERROR', stderr.trim() || `Process exited with code ${code}`, true));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          resolve({
            requestId: request.requestId,
            caller: request.caller,
            target: request.target,
            capability: request.capability,
            status: 'success',
            result: {
              output: result.output || result,
              artifacts: result.artifacts,
              confidence: result.confidence,
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
          });
        } catch {
          resolve(this.createErrorResponse(request, 'CLI_OUTPUT_PARSE_ERROR', 'Failed to parse CLI output as JSON', false));
        }
      });

      child.on('error', (err: Error) => {
        clearTimeout(timeout);
        resolve(this.createErrorResponse(request, 'CLI_SPAWN_ERROR', err.message, true));
      });

      // Write request JSON to stdin
      child.stdin.write(JSON.stringify(request));
      child.stdin.end();
    });
  }

  async health(command: string): Promise<AdapterHealth> {
    try {
      await execFileAsync(command, ['health'], {
        env: this.options2.env,
        cwd: this.options2.cwd,
        timeout: 5000,
      });

      return {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
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
