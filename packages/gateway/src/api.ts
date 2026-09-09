// HTTP API routes for G.L.U.E.

import { Router as ExpressRouter } from 'express';
import type { Glue } from './Glue.js';
import { randomUUID } from 'node:crypto';
import type { InvocationRequest, GlueUri } from '@glue/contracts';

export function createApiRouter(glue: Glue): ExpressRouter {
  const router = ExpressRouter();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy', version: '0.1.0' });
  });

  // List agents
  router.get('/agents', async (req, res) => {
    const capability = req.query.capability as string | undefined;
    const lifecycleState = req.query.lifecycleState as any;

    const agents = await glue.registry.list({ capability, lifecycleState });
    res.json({ agents, count: agents.length });
  });

  // Get agent by ID
  router.get('/agents/:id', async (req, res) => {
    const agent = await glue.registry.get(req.params.id as GlueUri);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.json({ agent });
  });

  // Register agent
  router.post('/agents', async (req, res) => {
    try {
      const id = await glue.discovery.registerManifest(req.body);
      const agent = await glue.registry.get(id as GlueUri);

      await glue.provenance.record({
        type: 'AGENT_REGISTERED' as any,
        actor: 'gateway',
        subject: id,
        operation: 'register',
      });

      res.status(201).json({ agent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Advance agent lifecycle
  router.post('/agents/:id/lifecycle', async (req, res) => {
    try {
      const { state, reason } = req.body;
      await glue.discovery.advanceLifecycle(req.params.id, state, reason);
      const agent = await glue.registry.get(req.params.id as GlueUri);
      res.json({ agent });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Discover agents by capability
  router.get('/discover', async (req, res) => {
    const capability = req.query.capability as string;
    if (!capability) {
      res.status(400).json({ error: 'capability query param required' });
      return;
    }

    const candidates = await glue.capabilities.findCandidates(capability);
    res.json({ capability, candidates });
  });

  // Invoke a capability
  router.post('/invoke', async (req, res) => {
    const capability = req.body.capability as string;
    const input = req.body.input || {};
    const caller = req.body.caller || 'glue:agent:user';

    if (!capability) {
      res.status(400).json({ error: 'capability required' });
      return;
    }

    // Find candidates
    const candidates = await glue.capabilities.findCandidates(capability);
    if (candidates.length === 0) {
      res.status(404).json({ error: 'No agents found with capability', capability });
      return;
    }

    // Route to best candidate
    const route = await glue.router.select(candidates);

    // Create invocation request
    const request: InvocationRequest = {
      requestId: randomUUID(),
      caller,
      target: route.agentId,
      capability,
      input,
      createdAt: new Date().toISOString(),
    };

    // Policy check
    const callerAgent = await glue.registry.get(caller as GlueUri);
    const targetAgent = await glue.registry.get(route.agentId as GlueUri);
    const decision = await glue.policy.evaluate(request, callerAgent, targetAgent);

    if (!decision.allowed) {
      await glue.provenance.record({
        type: 'INVOCATION_DENIED' as any,
        actor: caller,
        subject: route.agentId,
        operation: 'invoke-denied',
        capability,
        policyDecision: decision.reason,
      });

      res.status(403).json({ error: 'Invocation denied', reason: decision.reason });
      return;
    }

    // Get adapter and invoke
    const adapter = glue.adapters.get(route.protocol);
    if (!adapter) {
      res.status(500).json({ error: `No adapter for protocol: ${route.protocol}` });
      return;
    }

    const response = await adapter.invoke(request, route.endpoint);

    await glue.provenance.record({
      type: 'INVOCATION_COMPLETED' as any,
      actor: caller,
      subject: route.agentId,
      operation: 'invoke',
      capability,
      adapter: route.protocol,
      policyDecision: 'allowed',
      requestId: request.requestId,
    });

    res.json({ response });
  });

  // List sessions
  router.get('/sessions', (req, res) => {
    const sessions = glue.sessions.getActiveSessions();
    res.json({ sessions: sessions.map(s => ({ id: s.id, status: s.status, participants: s.participants.length })) });
  });

  // Create session
  router.post('/sessions', (req, res) => {
    const session = glue.sessions.createSession();
    res.status(201).json({ session });
  });

  // Get audit trail
  router.get('/audit/:subject', async (req, res) => {
    const events = await glue.provenance.getTrail(req.params.subject);
    res.json({ subject: req.params.subject, events });
  });

  // Get provenance
  router.get('/provenance/:subject', async (req, res) => {
    const events = await glue.provenance.getTrail(req.params.subject);
    res.json({ subject: req.params.subject, events });
  });

  return router;
}
