// G.L.U.E. Canonical Agent Types — Phase 0 Contracts

export type GlueUri = `glue:agent:${string}`;
export type CapabilityId = string; // e.g. "research.web", "verification.citation"
export type ProtocolName = 'mcp' | 'a2a' | 'acp' | 'http' | 'websocket' | 'grpc' | 'cli' | 'buzz' | 'local';

// Lifecycle states per GLUE-SPEC §6
export enum LifecycleState {
  DISCOVERED = 'DISCOVERED',
  IDENTIFIED = 'IDENTIFIED',
  INTERFACE_VERIFIED = 'INTERFACE_VERIFIED',
  CAPABILITIES_DESCRIBED = 'CAPABILITIES_DESCRIBED',
  SANDBOXED = 'SANDBOXED',
  OBSERVED = 'OBSERVED',
  TRUSTED = 'TRUSTED',
  COMMUNITY_MEMBER = 'COMMUNITY_MEMBER',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

// Trust states
export enum TrustState {
  UNKNOWN = 'UNKNOWN',
  UNTRUSTED = 'UNTRUSTED',
  PROVISIONAL = 'PROVISIONAL',
  VERIFIED = 'VERIFIED',
  TRUSTED = 'TRUSTED',
  COMPROMISED = 'COMPROMISED',
}

export interface AgentIdentity {
  publicKeys?: string[];
  credentials?: string[];
  signatures?: string[];
}

export interface AgentOwner {
  type: 'user' | 'organization' | 'external' | 'system';
  id: string;
  displayName?: string;
}

export interface AgentInterface {
  protocol: ProtocolName;
  endpoint: string;
  auth?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentRequirement {
  network?: boolean;
  gpu?: boolean;
  secrets?: string[];
  memory?: string;
  storage?: string;
}

export interface AgentPermissions {
  requested: string[];
  granted: string[];
}

export interface TrustAssessment {
  state: TrustState;
  evidence: string[];
  identity_trust: number;   // 0-1
  source_trust: number;     // 0-1
  capability_confidence: number; // 0-1
  behavioral_reputation: number; // 0-1
  updatedAt: string;
}

export interface ProvenanceRecord {
  source: 'github' | 'manual' | 'discovery' | 'federation' | 'import';
  sourceUri?: string;
  discoveredAt: string;
  registeredAt?: string;
}

export interface LifecycleEntry {
  state: LifecycleState;
  reason?: string;
  timestamp: string;
  actor?: string;
}

export interface AgentManifest {
  apiVersion: 'glue/v1';
  kind: 'Agent';
  metadata: {
    id: string;
    name: string;
    version: string;
    description?: string;
    displayName?: string;
    tags?: string[];
  };
  spec: {
    interfaces: AgentInterface[];
    capabilities: CapabilityId[];
    inputs?: JsonSchema | string;
    outputs?: JsonSchema | string;
    requirements?: AgentRequirement;
    permissions?: AgentPermissions;
  };
}

export interface AgentRecord extends AgentManifest {
  id: GlueUri;
  owner?: AgentOwner;
  identity?: AgentIdentity;
  trust: TrustAssessment;
  provenance: ProvenanceRecord;
  lifecycle: LifecycleEntry[];
  createdAt: string;
  updatedAt: string;
  healthStatus?: 'healthy' | 'degraded' | 'unreachable' | 'unknown';
  lastSeenAt?: string;
}

// Minimal JSON Schema subset
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  [key: string]: unknown;
}
