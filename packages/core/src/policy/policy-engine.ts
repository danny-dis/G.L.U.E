// Policy Engine — decides whether an invocations is allowed

import type { InvocationRequest, AgentRecord } from '@glue/contracts';
import { TrustState } from '@glue/contracts';

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  policyId?: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  evaluate: (request: InvocationRequest, caller: AgentRecord | null, target: AgentRecord | null) => PolicyDecision;
}

export class PolicyEngine {
  private rules: PolicyRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  register(rule: PolicyRule): void {
    this.rules.push(rule);
  }

  async evaluate(
    request: InvocationRequest,
    caller: AgentRecord | null,
    target: AgentRecord | null
  ): Promise<PolicyDecision> {
    for (const rule of this.rules) {
      const decision = rule.evaluate(request, caller, target);
      if (!decision.allowed) return decision;
    }
    return { allowed: true, reason: 'All policy checks passed' };
  }

  private registerDefaultRules(): void {
    // Rule: revoked/denied callers cannot invoke
    this.register({
      id: 'no-revoked-caller',
      description: 'Revoked agents cannot invoke',
      evaluate: (req, caller) => {
        if (!caller) return { allowed: false, reason: 'Unknown caller', policyId: 'no-revoked-caller' };
        const state = caller.lifecycle[caller.lifecycle.length - 1]?.state;
        if (state === 'REVOKED') return { allowed: false, reason: 'Caller has been revoked', policyId: 'no-revoked-caller' };
        return { allowed: true, reason: '' };
      },
    });

    // Rule: revoked targets cannot be invoked
    this.register({
      id: 'no-revoked-target',
      description: 'Revoked agents cannot be invoked',
      evaluate: (req, caller, target) => {
        if (!target) return { allowed: false, reason: 'Unknown target', policyId: 'no-revoked-target' };
        const state = target.lifecycle[target.lifecycle.length - 1]?.state;
        if (state === 'REVOKED') return { allowed: false, reason: 'Target has been revoked', policyId: 'no-revoked-target' };
        return { allowed: true, reason: '' };
      },
    });

    // Rule: denied callers list
    this.register({
      id: 'deny-list',
      description: 'Explicitly denied callers are blocked',
      evaluate: (req, caller, target) => {
        if (target?.spec.permissions?.granted?.includes(`deny:${req.caller}`)) {
          return { allowed: false, reason: 'Caller is on deny list', policyId: 'deny-list' };
        }
        if (req.policy?.deniedCallers?.includes(req.caller)) {
          return { allowed: false, reason: 'Caller denied by request policy', policyId: 'deny-list' };
        }
        return { allowed: true, reason: '' };
      },
    });

    // Rule: trust level requirement
    this.register({
      id: 'trust-level',
      description: 'Minimum trust level enforcement',
      evaluate: (req, caller, target) => {
        const required = req.constraints?.trustLevel;
        if (!required || !target) return { allowed: true, reason: '' };
        const trustState = target.trust.state;
        const hierarchy: TrustState[] = [TrustState.UNKNOWN, TrustState.UNTRUSTED, TrustState.PROVISIONAL, TrustState.VERIFIED, TrustState.TRUSTED];
        const requiredIdx = hierarchy.indexOf(required.toUpperCase() as TrustState);
        const actualIdx = hierarchy.indexOf(trustState);
        if (actualIdx < requiredIdx) {
          return { allowed: false, reason: `Target trust (${trustState}) below required (${required})`, policyId: 'trust-level' };
        }
        return { allowed: true, reason: '' };
      },
    });

    // Rule: target must declare the requested capability
    this.register({
      id: 'capability-must-exist',
      description: 'Target must declare the requested capability',
      evaluate: (req, caller, target) => {
        if (!target) return { allowed: false, reason: 'Unknown target', policyId: 'capability-must-exist' };
        if (!target.spec.capabilities.includes(req.capability)) {
          return { allowed: false, reason: `Target does not declare capability: ${req.capability}`, policyId: 'capability-must-exist' };
        }
        return { allowed: true, reason: '' };
      },
    });
  }
}
