// Trust Service — multi-dimensional trust evaluation

import type { AgentRecord, TrustAssessment } from '@glue/contracts';
import { TrustState } from '@glue/contracts';
import type { StorageBackend } from '../storage/memory.js';

export interface TrustEvaluation {
  agentId: string;
  previousState: TrustState;
  newState: TrustState;
  reasons: string[];
  recommendation: 'advance' | 'hold' | 'retreat' | 'revoke';
}

export class TrustService {
  constructor(private storage: StorageBackend) {}

  evaluate(record: AgentRecord): TrustEvaluation {
    const trust = record.trust;
    const reasons: string[] = [];
    let recommendation: TrustEvaluation['recommendation'] = 'hold';

    // Determine recommendation based on multiple signals
    if (trust.identity_trust > 0.8 && trust.capability_confidence > 0.7 && trust.behavioral_reputation > 0.8) {
      recommendation = 'advance';
      reasons.push('High identity trust, capability confidence, and reputation');
    } else if (trust.behavioral_reputation < 0.3) {
      recommendation = 'revoke';
      reasons.push('Low behavioral reputation');
    } else if (trust.source_trust < 0.3) {
      recommendation = 'retreat';
      reasons.push('Untrusted source');
    }

    if (record.healthStatus === 'unreachable') {
      recommendation = 'retreat';
      reasons.push('Agent unreachable');
    }

    const newState = this.determineState(recommendation, trust.state);

    return {
      agentId: record.id,
      previousState: trust.state,
      newState,
      reasons,
      recommendation,
    };
  }

  private determineState(recommendation: TrustEvaluation['recommendation'], current: TrustState): TrustState {
    if (recommendation === 'revoke') return TrustState.COMPROMISED;
    if (recommendation === 'advance') {
      const progression: Record<TrustState, TrustState> = {
        [TrustState.UNKNOWN]: TrustState.PROVISIONAL,
        [TrustState.UNTRUSTED]: TrustState.PROVISIONAL,
        [TrustState.PROVISIONAL]: TrustState.VERIFIED,
        [TrustState.VERIFIED]: TrustState.TRUSTED,
        [TrustState.TRUSTED]: TrustState.TRUSTED,
        [TrustState.COMPROMISED]: TrustState.COMPROMISED,
      };
      return progression[current];
    }
    if (recommendation === 'retreat') {
      const retreat: Record<TrustState, TrustState> = {
        [TrustState.UNKNOWN]: TrustState.UNKNOWN,
        [TrustState.UNTRUSTED]: TrustState.UNTRUSTED,
        [TrustState.PROVISIONAL]: TrustState.UNTRUSTED,
        [TrustState.VERIFIED]: TrustState.PROVISIONAL,
        [TrustState.TRUSTED]: TrustState.VERIFIED,
        [TrustState.COMPROMISED]: TrustState.COMPROMISED,
      };
      return retreat[current];
    }
    return current;
  }

  async updateTrust(agentId: string, assessment: Partial<TrustAssessment>): Promise<AgentRecord | null> {
    const agent = await this.storage.getAgent(agentId) as AgentRecord | null;
    if (!agent) return null;

    agent.trust = { ...agent.trust, ...assessment, updatedAt: new Date().toISOString() };
    agent.updatedAt = agent.trust.updatedAt;
    await this.storage.saveAgent(agent);
    return agent;
  }
}
