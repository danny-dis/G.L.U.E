// In-memory storage backend (Phase 1 — PostgreSQL later)

import { randomUUID } from 'node:crypto';
import type { GlueEvent, EventType } from '@glue/contracts';

export interface StorageBackend {
  // Agents
  saveAgent(agent: unknown): Promise<void>;
  getAgent(id: string): Promise<unknown | null>;
  listAgents(filter?: Record<string, unknown>): Promise<unknown[]>;
  deleteAgent(id: string): Promise<void>;

  // Events
  appendEvent(event: Omit<GlueEvent, 'id'>): Promise<GlueEvent>;
  listEvents(filter?: { subject?: string; type?: EventType; limit?: number }): Promise<GlueEvent[]>;

  // Capabilities
  indexCapability(capability: string, agentId: string): Promise<void>;
  findByCapability(capability: string): Promise<string[]>;
}

export class MemoryStorage implements StorageBackend {
  private agents = new Map<string, unknown>();
  private events: GlueEvent[] = [];
  private capabilityIndex = new Map<string, Set<string>>();

  async saveAgent(agent: unknown): Promise<void> {
    const a = agent as { id: string };
    this.agents.set(a.id, agent);
  }

  async getAgent(id: string): Promise<unknown | null> {
    return this.agents.get(id) ?? null;
  }

  async listAgents(filter?: Record<string, unknown>): Promise<unknown[]> {
    const all = Array.from(this.agents.values());
    if (!filter) return all;
    return all.filter(a => {
      for (const [k, v] of Object.entries(filter)) {
        if ((a as Record<string, unknown>)[k] !== v) return false;
      }
      return true;
    });
  }

  async deleteAgent(id: string): Promise<void> {
    this.agents.delete(id);
  }

  async appendEvent(event: Omit<GlueEvent, 'id'>): Promise<GlueEvent> {
    const full: GlueEvent = { ...event, id: randomUUID() };
    this.events.push(full);
    return full;
  }

  async listEvents(filter?: { subject?: string; type?: EventType; limit?: number }): Promise<GlueEvent[]> {
    let result = this.events;
    if (filter?.subject) result = result.filter(e => e.subject === filter.subject);
    if (filter?.type) result = result.filter(e => e.type === filter.type);
    if (filter?.limit) result = result.slice(-filter.limit);
    return result;
  }

  async indexCapability(capability: string, agentId: string): Promise<void> {
    if (!this.capabilityIndex.has(capability)) {
      this.capabilityIndex.set(capability, new Set());
    }
    this.capabilityIndex.get(capability)!.add(agentId);
  }

  async findByCapability(capability: string): Promise<string[]> {
    return Array.from(this.capabilityIndex.get(capability) ?? []);
  }
}
