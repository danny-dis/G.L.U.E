// Registry — canonical agent storage and retrieval

import type {
  AgentManifest,
  AgentRecord,
  GlueUri,
  LifecycleState,
  TrustAssessment,
  ProvenanceRecord,
  LifecycleEntry,
} from '@glue/contracts';
import { GLUE_AGENT_PREFIX, TrustState } from '@glue/contracts';
import type { StorageBackend } from '../storage/memory.js';
import { assertTransition } from '../lifecycle/state-machine.js';

export interface RegisterAgentInput {
  manifest: AgentManifest;
  owner?: AgentRecord['owner'];
  provenance?: Partial<ProvenanceRecord>;
}

export class Registry {
  constructor(private storage: StorageBackend) {}

  async register(input: RegisterAgentInput): Promise<AgentRecord> {
    const now = new Date().toISOString();
    const id: GlueUri = `${GLUE_AGENT_PREFIX}${input.manifest.metadata.id}`;

    const trust: TrustAssessment = {
      state: TrustState.UNKNOWN,
      evidence: [],
      identity_trust: 0,
      source_trust: 0,
      capability_confidence: 0,
      behavioral_reputation: 0,
      updatedAt: now,
    };

    const provenance: ProvenanceRecord = {
      source: input.provenance?.source ?? 'manual',
      sourceUri: input.provenance?.sourceUri,
      discoveredAt: input.provenance?.discoveredAt ?? now,
      registeredAt: now,
    };

    const lifecycle: LifecycleEntry[] = [
      { state: LifecycleState.DISCOVERED, timestamp: now, reason: 'Agent registered' },
    ];

    const record: AgentRecord = {
      ...input.manifest,
      id,
      owner: input.owner,
      identity: {},
      trust,
      provenance,
      lifecycle,
      createdAt: now,
      updatedAt: now,
      healthStatus: 'unknown',
    };

    await this.storage.saveAgent(record);

    // Index capabilities
    for (const cap of input.manifest.spec.capabilities) {
      await this.storage.indexCapability(cap, id);
    }

    return record;
  }

  async get(id: GlueUri): Promise<AgentRecord | null> {
    const agent = await this.storage.getAgent(id);
    return agent as AgentRecord | null;
  }

  async list(filter?: { lifecycleState?: LifecycleState; capability?: string }): Promise<AgentRecord[]> {
    const agents = await this.storage.listAgents() as AgentRecord[];
    if (!filter) return agents;
    
    return agents.filter(a => {
      if (filter.lifecycleState) {
        const current = a.lifecycle[a.lifecycle.length - 1]?.state;
        if (current !== filter.lifecycleState) return false;
      }
      if (filter.capability && !a.spec.capabilities.includes(filter.capability)) return false;
      return true;
    });
  }

  async updateLifecycle(id: GlueUri, newState: LifecycleState, reason?: string, actor?: string): Promise<AgentRecord> {
    const agent = await this.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);

    const current = agent.lifecycle[agent.lifecycle.length - 1]?.state ?? LifecycleState.DISCOVERED;
    assertTransition(current, newState);

    const entry: LifecycleEntry = {
      state: newState,
      reason,
      timestamp: new Date().toISOString(),
      actor,
    };

    agent.lifecycle.push(entry);
    agent.updatedAt = entry.timestamp;
    await this.storage.saveAgent(agent);
    return agent;
  }

  async updateTrust(id: GlueUri, trust: Partial<TrustAssessment>): Promise<AgentRecord> {
    const agent = await this.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);

    agent.trust = { ...agent.trust, ...trust, updatedAt: new Date().toISOString() };
    agent.updatedAt = agent.trust.updatedAt;
    await this.storage.saveAgent(agent);
    return agent;
  }

  async updateHealth(id: GlueUri, status: AgentRecord['healthStatus']): Promise<AgentRecord> {
    const agent = await this.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);

    agent.healthStatus = status;
    agent.lastSeenAt = new Date().toISOString();
    agent.updatedAt = agent.lastSeenAt;
    await this.storage.saveAgent(agent);
    return agent;
  }

  async revoke(id: GlueUri, reason: string): Promise<AgentRecord> {
    return this.updateLifecycle(id, LifecycleState.REVOKED, reason);
  }
}
