// G.L.U.E. Event / Provenance types

export enum EventType {
  AGENT_REGISTERED = 'AGENT_REGISTERED',
  AGENT_LIFECYCLE_CHANGED = 'AGENT_LIFECYCLE_CHANGED',
  AGENT_TRUST_CHANGED = 'AGENT_TRUST_CHANGED',
  AGENT_HEALTH_CHANGED = 'AGENT_HEALTH_CHANGED',
  AGENT_REVOKED = 'AGENT_REVOKED',
  INVOCATION_STARTED = 'INVOCATION_STARTED',
  INVOCATION_COMPLETED = 'INVOCATION_COMPLETED',
  INVOCATION_FAILED = 'INVOCATION_FAILED',
  INVOCATION_DENIED = 'INVOCATION_DENIED',
  CAPABILITY_REGISTERED = 'CAPABILITY_REGISTERED',
  COMMUNITY_JOINED = 'COMMUNITY_JOINED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
}

export interface GlueEvent {
  id: string;
  type: EventType;
  timestamp: string;
  actor: string;
  subject: string;
  operation: string;
  capability?: string;
  adapter?: string;
  policyDecision?: string;
  requestId?: string;
  parentEvent?: string;
  resultReference?: string;
  integrityReference?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditEntry extends GlueEvent {
  immutable: true; // signaling field; actual immutability is storage-level
}
