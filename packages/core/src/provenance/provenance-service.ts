// Provenance/Audit Service — append-only event log

import type { GlueEvent, EventType } from '@glue/contracts';
import { randomUUID } from 'node:crypto';
import type { StorageBackend } from '../storage/memory.js';

export class ProvenanceService {
  constructor(private storage: StorageBackend) {}

  async record(params: {
    type: EventType;
    actor: string;
    subject: string;
    operation: string;
    capability?: string;
    adapter?: string;
    policyDecision?: string;
    requestId?: string;
    parentEvent?: string;
    resultReference?: string;
    metadata?: Record<string, unknown>;
  }): Promise<GlueEvent> {
    return this.storage.appendEvent({
      type: params.type,
      timestamp: new Date().toISOString(),
      actor: params.actor,
      subject: params.subject,
      operation: params.operation,
      capability: params.capability,
      adapter: params.adapter,
      policyDecision: params.policyDecision,
      requestId: params.requestId,
      parentEvent: params.parentEvent,
      resultReference: params.resultReference,
      metadata: params.metadata,
    });
  }

  async getTrail(subject: string): Promise<GlueEvent[]> {
    return this.storage.listEvents({ subject });
  }

  async getRecent(limit = 50): Promise<GlueEvent[]> {
    return this.storage.listEvents({ limit });
  }
}
