// JSON Schemas for canonical data contracts

export const AgentManifestSchema = {
  $id: 'glue/schemas/agent-manifest',
  type: 'object',
  required: ['apiVersion', 'kind', 'metadata', 'spec'],
  properties: {
    apiVersion: { const: 'glue/v1' },
    kind: { const: 'Agent' },
    metadata: {
      type: 'object',
      required: ['id', 'name', 'version'],
      properties: {
        id: { type: 'string', pattern: '^[a-zA-Z][a-zA-Z0-9._-]*$' },
        name: { type: 'string', minLength: 1 },
        version: { type: 'string' },
        description: { type: 'string' },
        displayName: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
    spec: {
      type: 'object',
      required: ['interfaces', 'capabilities'],
      properties: {
        interfaces: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['protocol', 'endpoint'],
            properties: {
              protocol: { type: 'string' },
              endpoint: { type: 'string', format: 'uri' },
              auth: { type: 'object' },
              metadata: { type: 'object' },
            },
          },
        },
        capabilities: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
        },
        inputs: { type: 'object' },
        outputs: { type: 'object' },
        requirements: { type: 'object' },
        permissions: {
          type: 'object',
          properties: {
            requested: { type: 'array', items: { type: 'string' } },
            granted: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const;

export const InvocationRequestSchema = {
  $id: 'glue/schemas/invocation-request',
  type: 'object',
  required: ['requestId', 'caller', 'target', 'capability', 'input', 'createdAt'],
  properties: {
    requestId: { type: 'string' },
    caller: { type: 'string' },
    target: { type: 'string' },
    intent: { type: 'string' },
    capability: { type: 'string' },
    input: { type: 'object' },
    context: { type: 'object' },
    constraints: {
      type: 'object',
      properties: {
        latencyMs: { type: 'number' },
        costLimit: { type: 'number' },
        trustLevel: { type: 'string', enum: ['untrusted', 'verified', 'trusted'] },
        timeoutMs: { type: 'number' },
        retries: { type: 'number' },
        idempotencyKey: { type: 'string' },
      },
    },
    policy: { type: 'object' },
    provenance: { type: 'object' },
    deadline: { type: 'string', format: 'date-time' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const InvocationResponseSchema = {
  $id: 'glue/schemas/invocation-response',
  type: 'object',
  required: ['requestId', 'caller', 'target', 'capability', 'status', 'adapter', 'provenance', 'durationMs', 'createdAt'],
  properties: {
    requestId: { type: 'string' },
    caller: { type: 'string' },
    target: { type: 'string' },
    capability: { type: 'string' },
    status: { type: 'string', enum: ['success', 'error', 'timeout', 'cancelled', 'denied'] },
    result: { type: 'object' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object' },
        retryable: { type: 'boolean' },
      },
    },
    adapter: { type: 'string' },
    provenance: { type: 'object' },
    durationMs: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const EventSchema = {
  $id: 'glue/schemas/event',
  type: 'object',
  required: ['id', 'type', 'timestamp', 'actor', 'subject', 'operation'],
  properties: {
    id: { type: 'string' },
    type: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
    actor: { type: 'string' },
    subject: { type: 'string' },
    operation: { type: 'string' },
    capability: { type: 'string' },
    adapter: { type: 'string' },
    policyDecision: { type: 'string' },
    requestId: { type: 'string' },
    parentEvent: { type: 'string' },
    resultReference: { type: 'string' },
    integrityReference: { type: 'string' },
    metadata: { type: 'object' },
  },
} as const;
