// G.L.U.E. Federation Gateway — main wiring

import { MemoryStorage } from '@glue/core';
import { Registry } from '@glue/core';
import { CapabilityGraph } from '@glue/core';
import { DiscoveryEngine } from '@glue/core';
import { PolicyEngine } from '@glue/core';
import { ProvenanceService } from '@glue/core';
import { SessionService } from '@glue/core';
import { Router } from '@glue/core';
import { TrustService } from '@glue/core';
import { AdapterRegistry, HttpAdapter, CliAdapter } from '@glue/adapters';
import pino from 'pino';

export interface GlueConfig {
  logLevel?: string;
}

export class Glue {
  readonly storage: MemoryStorage;
  readonly registry: Registry;
  readonly capabilities: CapabilityGraph;
  readonly discovery: DiscoveryEngine;
  readonly policy: PolicyEngine;
  readonly provenance: ProvenanceService;
  readonly sessions: SessionService;
  readonly router: Router;
  readonly trust: TrustService;
  readonly adapters: AdapterRegistry;
  private logger: pino.Logger;

  constructor(config: GlueConfig = {}) {
    this.logger = pino({
      level: config.logLevel || 'info',
      transport: { target: 'pino-pretty' },
    });

    this.storage = new MemoryStorage();
    this.registry = new Registry(this.storage);
    this.capabilities = new CapabilityGraph(this.storage);
    this.discovery = new DiscoveryEngine(this.registry, this.capabilities, this.logger);
    this.policy = new PolicyEngine();
    this.provenance = new ProvenanceService(this.storage);
    this.sessions = new SessionService();
    this.router = new Router();
    this.trust = new TrustService(this.storage);
    this.adapters = new AdapterRegistry();

    // Register built-in adapters
    this.adapters.register(new HttpAdapter({ logger: this.logger }));
    this.adapters.register(new CliAdapter({ logger: this.logger }));

    this.logger.info('G.L.U.E. federation gateway initialized');
  }
}
