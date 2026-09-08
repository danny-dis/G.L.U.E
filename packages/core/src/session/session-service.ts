// Session Service — one-voice conversation/session management

import type { InvocationResponse } from '@glue/contracts';
import { randomUUID } from 'node:crypto';

export interface SessionParticipant {
  agentId: string;
  role: 'primary' | 'delegate' | 'observer';
}

export interface SessionArtifact {
  id: string;
  type: 'result' | 'artifact' | 'log';
  source: string;
  data: unknown;
  timestamp: string;
}

export interface ConversationSession {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: SessionParticipant[];
  activeInvocations: Map<string, { target: string; capability: string; startedAt: string }>;
  artifacts: SessionArtifact[];
  conversationLog: ConversationEntry[];
  status: 'active' | 'synthesizing' | 'complete' | 'failed';
}

export interface ConversationEntry {
  role: 'user' | 'system' | 'agent';
  agentId?: string;
  content: string;
  timestamp: string;
  invocationId?: string;
  provenance?: Record<string, unknown>;
}

export class SessionService {
  private sessions = new Map<string, ConversationSession>();

  createSession(): ConversationSession {
    const now = new Date().toISOString();
    const session: ConversationSession = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      participants: [],
      activeInvocations: new Map(),
      artifacts: [],
      conversationLog: [],
      status: 'active',
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): ConversationSession | null {
    return this.sessions.get(id) ?? null;
  }

  addParticipant(sessionId: string, participant: SessionParticipant): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.participants.push(participant);
    session.updatedAt = new Date().toISOString();
  }

  startInvocation(sessionId: string, invocationId: string, target: string, capability: string): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    session.activeInvocations.set(invocationId, {
      target,
      capability,
      startedAt: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();
  }

  completeInvocation(sessionId: string, invocationId: string, response: InvocationResponse): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.activeInvocations.delete(invocationId);
    session.artifacts.push({
      id: randomUUID(),
      type: 'result',
      source: response.target,
      data: response.result,
      timestamp: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();
  }

  logMessage(sessionId: string, entry: Omit<ConversationEntry, 'timestamp'>): void {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.conversationLog.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();
  }

  getActiveSessions(): ConversationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }
}
