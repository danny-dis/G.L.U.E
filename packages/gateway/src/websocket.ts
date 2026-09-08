// WebSocket one-voice interface

import type { WebSocketServer, WebSocket } from 'ws';
import type { Glue } from './Glue.js';
import { randomUUID } from 'node:crypto';
import type { InvocationRequest } from '@glue/contracts';

interface WsMessage {
  type: string;
  [key: string]: unknown;
}

export function setupWebSocket(glue: Glue, wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket) => {
    const sessionId = randomUUID();
    const session = glue.sessions.createSession();

    glue.logger.info({ sessionId, glueSessionId: session.id }, 'WebSocket connected');

    ws.send(JSON.stringify({
      type: 'connected',
      sessionId,
      glueSessionId: session.id,
      message: 'Connected to G.L.U.E. One Voice',
    }));

    ws.on('message', async (data: Buffer) => {
      let msg: WsMessage;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Invalid JSON' }));
        return;
      }

      try {
        switch (msg.type) {
          case 'ask': {
            const capability = msg.capability as string;
            const input = (msg.input as Record<string, unknown>) || {};

            // Find candidates
            const candidates = await glue.capabilities.findCandidates(capability);
            if (candidates.length === 0) {
              ws.send(JSON.stringify({
                type: 'error',
                error: `No agents found with capability: ${capability}`,
              }));
              return;
            }

            // Route
            const route = await glue.router.select(candidates);

            // Create invocation
            const request: InvocationRequest = {
              requestId: randomUUID(),
              caller: 'glue:agent:user',
              target: route.agentId,
              capability,
              input,
              createdAt: new Date().toISOString(),
            };

            // Get adapter
            const adapter = glue.adapters.get(route.protocol);
            if (!adapter) {
              ws.send(JSON.stringify({
                type: 'error',
                error: `No adapter for protocol: ${route.protocol}`,
              }));
              return;
            }

            // Invoke
            const response = await adapter.invoke(request, route.endpoint);

            ws.send(JSON.stringify({
              type: 'response',
              requestId: request.requestId,
              target: route.agentId,
              capability,
              status: response.status,
              result: response.result,
              durationMs: response.durationMs,
              provenance: response.provenance,
            }));

            break;
          }

          case 'list-agents': {
            const agents = await glue.registry.list();
            ws.send(JSON.stringify({
              type: 'agents-list',
              agents: agents.map(a => ({
                id: a.id,
                name: a.metadata.name,
                capabilities: a.spec.capabilities,
                lifecycle: a.lifecycle[a.lifecycle.length - 1]?.state,
              })),
            }));
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;
          }

          default: {
            ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${msg.type}` }));
          }
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', error: err.message }));
      }
    });

    ws.on('close', () => {
      glue.logger.info({ sessionId }, 'WebSocket disconnected');
    });
  });
}
