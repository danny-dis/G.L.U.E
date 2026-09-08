// Capability Graph — maps capabilities to agents

import type { AgentRecord, CapabilityId } from '@glue/contracts';
import type { StorageBackend } from '../storage/memory.js';

export interface CapabilityMatch {
  capability: CapabilityId;
  agentId: string;
  agentName: string;
  protocol: string;
  endpoint: string;
  trustScore: number;
  health: string;
}

export class CapabilityGraph {
  constructor(private storage: StorageBackend) {}

  async registerAgent(record: AgentRecord): Promise<void> {
    for (const cap of record.spec.capabilities) {
      await this.storage.indexCapability(cap, record.id);
    }
  }

  async findByCapability(capability: CapabilityId): Promise<string[]> {
    return this.storage.findByCapability(capability);
  }

  async findCandidates(capability: CapabilityId): Promise<CapabilityMatch[]> {
    const agentIds = await this.findByCapability(capability);
    const matches: CapabilityMatch[] = [];

    for (const id of agentIds) {
      const agent = await this.storage.getAgent(id) as AgentRecord | null;
      if (!agent) continue;

      const lastLifecycle = agent.lifecycle[agent.lifecycle.length - 1];
      if (lastLifecycle?.state === 'REVOKED' || lastLifecycle?.state === 'SUSPENDED') continue;

      const primaryInterface = agent.spec.interfaces[0];
      matches.push({
        capability,
        agentId: agent.id,
        agentName: agent.metadata.name,
        protocol: primaryInterface.protocol,
        endpoint: primaryInterface.endpoint,
        trustScore: agent.trust.behavioral_reputation,
        health: agent.healthStatus ?? 'unknown',
      });
    }

    return matches;
  }
}
