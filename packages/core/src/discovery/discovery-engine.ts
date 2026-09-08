// Discovery Engine — register agents from manifests and catalogs

import type { AgentManifest } from '@glue/contracts';
import { Registry } from '../registry/registry.js';
import { CapabilityGraph } from '../capabilities/capability-graph.js';
import { LifecycleState } from '@glue/contracts';
import type { Logger } from 'pino';

export class DiscoveryEngine {
  constructor(
    private registry: Registry,
    private capabilityGraph: CapabilityGraph,
    private logger: Logger,
  ) {}

  async registerManifest(manifest: AgentManifest, source: string = 'manual'): Promise<string> {
    this.logger.info({ agentId: manifest.metadata.id, source }, 'Registering agent manifest');

    const record = await this.registry.register({
      manifest,
      provenance: { source: source as any },
    });

    await this.capabilityGraph.registerAgent(record);

    this.logger.info({ agentId: record.id }, 'Agent registered successfully');
    return record.id;
  }

  async registerFromUrl(url: string): Promise<string> {
    this.logger.info({ url }, 'Fetching manifest from URL');

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest from ${url}: ${response.status}`);
    }

    const manifest: AgentManifest = await response.json();
    return this.registerManifest(manifest, 'discovery');
  }

  async bulkRegister(manifests: AgentManifest[]): Promise<string[]> {
    const ids: string[] = [];
    for (const manifest of manifests) {
      try {
        const id = await this.registerManifest(manifest);
        ids.push(id);
      } catch (err) {
        this.logger.warn({ manifest: manifest.metadata.id, err }, 'Failed to register agent');
      }
    }
    return ids;
  }

  async advanceLifecycle(agentId: string, newState: LifecycleState, reason?: string): Promise<void> {
    await this.registry.updateLifecycle(agentId, newState, reason);
    this.logger.info({ agentId, newState, reason }, 'Lifecycle advanced');
  }
}
