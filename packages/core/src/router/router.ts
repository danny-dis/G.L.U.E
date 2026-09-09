// Router — capability-based agent selection

import type { CapabilityId } from '@glue/contracts';
import type { AgentRecord } from '@glue/contracts';
import type { CapabilityMatch } from '../capabilities/capability-graph.js';

export interface RouteResult {
  agentId: string;
  protocol: string;
  endpoint: string;
  reason: string;
}

export interface RouterOptions {
  /** Require a minimum health status */
  minHealth?: 'degraded' | 'healthy';
  /** Require a minimum trust score (0-1) */
  minTrustScore?: number;
}

export class Router {
  constructor(private options: RouterOptions = {}) {}

  async select(candidates: CapabilityMatch[]): Promise<RouteResult> {
    if (candidates.length === 0) {
      throw new Error('No candidates available for routing');
    }

    // Filter by health
    let filtered = candidates.filter(c => {
      if (this.options.minHealth === 'healthy') return c.health === 'healthy';
      if (this.options.minHealth === 'degraded') return c.health === 'healthy' || c.health === 'degraded';
      return c.health !== 'unreachable';
    });

    if (filtered.length === 0) {
      // Fallback to any candidate if all filtered out
      filtered = candidates;
    }

    // Filter by trust score
    if (this.options.minTrustScore !== undefined) {
      filtered = filtered.filter(c => (c.trustScore ?? 0) >= this.options.minTrustScore!);
      if (filtered.length === 0) filtered = candidates;
    }

    // Score: prefer higher trust, then healthier agents
    const scored = filtered.map(c => ({
      ...c,
      _score: c.trustScore * 0.6 + (c.health === 'healthy' ? 0.4 : 0),
    }));

    scored.sort((a, b) => b._score - a._score);

    const selected = scored[0];
    return {
      agentId: selected.agentId,
      protocol: selected.protocol,
      endpoint: selected.endpoint,
      reason: `Selected by capability match (trust: ${selected.trustScore.toFixed(2)}, health: ${selected.health})`,
    };
  }
}
