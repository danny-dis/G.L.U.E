// G.L.U.E. Canonical Invocation Envelope

import { CapabilityId } from './agent.js';

export interface InvocationConstraints {
  latencyMs?: number;
  costLimit?: number;
  trustLevel?: 'untrusted' | 'verified' | 'trusted';
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
}

export interface InvocationPolicy {
  callerMustBeOwner?: boolean;
  requireHumanApproval?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'secret';
  allowedCallers?: string[];
  deniedCallers?: string[];
}

export interface InvocationRequest {
  requestId: string;
  caller: string;          // glue:agent:<id>
  target: string;          // glue:agent:<id>
  intent?: string;         // human-readable
  capability: CapabilityId;
  input: Record<string, unknown>;
  context?: Record<string, unknown>;
  constraints?: InvocationConstraints;
  policy?: InvocationPolicy;
  provenance?: Record<string, unknown>;
  deadline?: string;       // ISO timestamp
  createdAt: string;
}

export interface InvocationResult {
  output: Record<string, unknown>;
  artifacts?: ArtifactReference[];
  confidence?: number;     // 0-1
  citations?: string[];
  metadata?: Record<string, unknown>;
}

export interface InvocationResponse {
  requestId: string;
  caller: string;
  target: string;
  capability: CapabilityId;
  status: 'success' | 'error' | 'timeout' | 'cancelled' | 'denied';
  result?: InvocationResult;
  error?: InvocationError;
  adapter: string;         // which adapter served this
  provenance: ResponseProvenance;
  durationMs: number;
  createdAt: string;
}

export interface InvocationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

export interface ArtifactReference {
  id: string;
  type: 'file' | 'url' | 'blob' | 'log' | 'result';
  uri: string;
  mimeType?: string;
  size?: number;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface ResponseProvenance {
  requestId: string;
  caller: string;
  target: string;
  adapter: string;
  policyDecision: string;
  capability: string;
  artifacts: ArtifactReference[];
  durationMs: number;
  timestamp: string;
}

// Streaming events
export interface StreamEvent {
  requestId: string;
  sequence: number;
  type: 'delta' | 'progress' | 'artifact' | 'error' | 'complete';
  data: unknown;
  timestamp: string;
}
