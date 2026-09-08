// Lifecycle state machine

import { LifecycleState } from '@glue/contracts';

const TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.DISCOVERED]: [LifecycleState.IDENTIFIED, LifecycleState.REVOKED],
  [LifecycleState.IDENTIFIED]: [LifecycleState.INTERFACE_VERIFIED, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.INTERFACE_VERIFIED]: [LifecycleState.CAPABILITIES_DESCRIBED, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.CAPABILITIES_DESCRIBED]: [LifecycleState.SANDBOXED, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.SANDBOXED]: [LifecycleState.OBSERVED, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.OBSERVED]: [LifecycleState.TRUSTED, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.TRUSTED]: [LifecycleState.COMMUNITY_MEMBER, LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.COMMUNITY_MEMBER]: [LifecycleState.SUSPENDED, LifecycleState.REVOKED],
  [LifecycleState.SUSPENDED]: [LifecycleState.OBSERVED, LifecycleState.REVOKED],
  [LifecycleState.REVOKED]: [],
};

export class LifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LifecycleError';
  }
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: LifecycleState, to: LifecycleState): void {
  if (!canTransition(from, to)) {
    throw new LifecycleError(`Invalid transition: ${from} -> ${to}`);
  }
}

export function getAllowedTransitions(from: LifecycleState): LifecycleState[] {
  return TRANSITIONS[from] ?? [];
}
