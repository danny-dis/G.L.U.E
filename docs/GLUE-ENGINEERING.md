# G.L.U.E. Engineering Architecture

**Status:** Draft  
**Version:** 0.2  
**Date:** 2026-09-14

## 1. Engineering Objective

Build G.L.U.E. as a production-grade federation substrate capable of connecting heterogeneous agents without forcing them into a single runtime or framework.

The engineering rule is:

> **Core protocol stability, adapter-level variability.**

New agent protocols, agent frameworks, communities, and runtimes should be implemented at the edge through adapters. The federation core should remain small, deterministic where possible, observable, and testable.

The first implementation must prove the smallest useful federation loop before implementing the full architecture. See [`GLUE-MINIMUM-PROTOCOL.md`](GLUE-MINIMUM-PROTOCOL.md).

## 2. Reference Implementation Language

The reference runtime will be implemented in **Rust**.

The protocol itself is language-neutral. Python, TypeScript, Go, Java, and other ecosystems can implement compatible participants and SDKs.

Rust is selected for the core because G.L.U.E. is an infrastructure/security boundary handling untrusted network input, identity, authorization, concurrent streams, cancellation, process execution, and adapter isolation. Tokio provides the asynchronous runtime; Axum provides the HTTP boundary and Tower middleware ecosystem; Ed25519 support is available through mature Rust cryptography libraries. The runtime can therefore remain a small native binary with explicit resource and concurrency control.

Recommended stack:

```text
Rust 2024
Tokio        async runtime
Axum         HTTP API / streaming
Tower        middleware and boundary controls
Serde        schema serialization
Ed25519      identity/event signatures
Tracing      structured observability
SQLx         optional persistence
Clap         CLI
```

Python remains a first-class SDK/prototyping language, but is not the reference federation runtime.

## 3. Minimum Runtime Boundary

The first runtime implements only:

```text
Identity
Discovery
Capabilities
Invocation lifecycle
Deterministic policy
Provenance
```

Initial transports:

```text
HTTP/HTTPS
stdio
```

Initial adapters:

```text
Native G.L.U.E. HTTP
Generic HTTP/REST
Local stdio/process
```

MCP and A2A are adapter targets, not dependencies of the G.L.U.E. core.

## 4. Proposed System Layers

```text
+-----------------------------------------------------------+
|                    G.L.U.E. Voice/API                    |
+-----------------------------------------------------------+
|            Community / Session / Conversation             |
+-----------------------------------------------------------+
|        Capability Graph + Discovery + Routing             |
+-----------------------------------------------------------+
|      Trust + Policy + Permission + Admission              |
+-----------------------------------------------------------+
| Identity | Provenance | Lifecycle | Reputation            |
+-----------------------------------------------------------+
|              Canonical Agent Protocol                      |
+-----------------------------------------------------------+
| Adapter SDK: MCP | A2A | ACP | HTTP | WS | gRPC | CLI   |
+-----------------------------------------------------------+
| Local | Container | Remote Service | Community Adapter    |
+-----------------------------------------------------------+
```

The full architecture remains the target, but the minimum runtime is the foundation beneath it.

## 5. Core Components

### 5.1 Registry

Stores canonical agent metadata, capabilities, endpoints, versions, health, ownership, provenance, and lifecycle state.

Requirements:

- stable IDs;
- versioned records;
- endpoint discovery;
- capability indexing;
- cryptographic identity references;
- health information;
- source provenance;
- revocation state.

The first registry can be local SQLite. PostgreSQL becomes the production multi-instance option after the contract is proven. A dedicated graph database is not required.

### 5.2 Discovery Engine

Sources should include:

- explicit registration;
- Git repositories;
- agent manifests;
- Markdown instructions;
- MCP discovery;
- A2A discovery mechanisms;
- community adapters;
- local process scanning;
- administrator-provided catalogs.

Discovery must produce candidates, not automatically trusted members.

### 5.3 Adapter Runtime

Every adapter should implement a common interface conceptually equivalent to:

```text
inspect()
identify()
describe()
capabilities()
health()
invoke()
stream()
cancel()
close()
```

Adapters must be isolated from core business logic.

### 5.4 Capability Graph

Use an indexed capability structure that maps:

```text
Capability -> Agent -> Interface -> Instance -> Health -> Policy
```

The first implementation may use relational tables and indexes. Semantic graph matching is a later capability.

### 5.5 Router

The router selects candidates using deterministic filters before invoking model reasoning.

Example ordering:

1. capability match;
2. permission compatibility;
3. trust requirement;
4. locality/data residency;
5. availability;
6. health;
7. latency;
8. cost;
9. reputation/performance;
10. policy constraints.

Only ambiguous or semantic decisions should require an LLM, and the minimum runtime does not require one.

### 5.6 Policy Engine

The policy engine decides whether an invocation is allowed.

Policy dimensions:

- caller identity;
- target identity;
- capability;
- data classification;
- required trust level;
- resource limits;
- geographic/locality constraints;
- human approval requirements;
- execution environment;
- time limits;
- rate limits.

The first policy engine must be deterministic.

### 5.7 Provenance/Audit Service

Record a tamper-evident event chain or equivalent append-only record for significant operations.

Minimum event fields:

```text
id
timestamp
actor
subject
operation
capability
adapter
policy_decision
request_id
parent_event
result_reference
integrity_reference
signature
```

The exact storage implementation is replaceable.

### 5.8 Session/Conversation Service

Maintains the user-facing “one voice” abstraction.

It should track:

- participants;
- delegation tree;
- context references;
- partial results;
- approvals;
- artifacts;
- final synthesis;
- provenance.

This is not part of the minimum protocol core.

## 6. Canonical Data Contracts

The first implementation should define versioned schemas for:

- `AgentManifest`
- `AgentIdentity`
- `Capability`
- `Endpoint`
- `InvocationRequest`
- `InvocationResponse`
- `StreamEvent`
- `PolicyDecision`
- `TrustAssessment`
- `ProvenanceRecord`
- `LifecycleEvent`
- `ArtifactReference`

Use schema versioning from the beginning. Breaking changes should require a new major contract version.

## 7. Manifest Format

A minimal manifest should be easy for a human to write.

```yaml
apiVersion: glue/v1
kind: Agent
metadata:
  id: example.researcher
  name: Example Researcher
  version: 1.0.0
spec:
  interfaces:
    - protocol: glue/1
      endpoint: https://example.invalid/glue
  capabilities:
    - research.web
    - verification.citation
  input:
    type: object
  output:
    type: object
  requirements:
    network: true
  permissions:
    requested: []
```

The manifest describes the agent; it does not grant permissions.

## 8. Adapter SDK

Adapters should be small packages with:

```text
adapter/
  manifest
  discovery
  authentication
  transport
  invocation
  streaming
  errors
  health
  provenance
  tests
```

Each adapter should ship conformance tests.

## 9. Suggested Repository Layout

```text
/
├── README.md
├── LICENSE
├── docs/
│   ├── GLUE-SPEC.md
│   ├── GLUE-ENGINEERING.md
│   └── GLUE-MINIMUM-PROTOCOL.md
├── schemas/
│   └── glue-v1/
├── crates/
│   ├── glue-core/
│   ├── glue-protocol/
│   ├── glue-identity/
│   ├── glue-policy/
│   ├── glue-runtime/
│   ├── glue-registry/
│   ├── glue-events/
│   ├── glue-adapters/
│   ├── glue-http/
│   ├── glue-stdio/
│   └── glue-cli/
├── adapters/
│   ├── http/
│   └── stdio/
└── tests/
    ├── conformance/
    ├── integration/
    ├── security/
    └── interoperability/
```

This is a target architecture. Do not create every crate before the boundaries are exercised by tests.

## 10. Security Architecture

Security boundaries should exist at multiple levels.

### Layer 1 — Identity

Verify who owns or operates an agent.

### Layer 2 — Interface

Verify that the advertised endpoint and protocol actually correspond to the claimed interface.

### Layer 3 — Capability

Distinguish declared capabilities from observed/verified capabilities.

### Layer 4 — Permission

Authorize specific actions and data access.

### Layer 5 — Execution

Use containers, microVMs, OS capabilities, network policies, or remote isolation where required.

### Layer 6 — Observation

Continuously record behavior, failures, resource consumption, and policy violations.

### Layer 7 — Revocation

Immediately remove or restrict access when an identity, endpoint, capability, or trust assessment becomes invalid.

## 11. Trust Model

Trust should be multi-dimensional rather than a single boolean.

```text
identity_trust
source_trust
operator_trust
capability_confidence
behavioral_reputation
security_posture
policy_compatibility
```

A highly trusted identity does not automatically make every claimed capability trustworthy.

## 12. Agent Reputation

G.L.U.E. may maintain performance metadata such as:

- successful invocation rate;
- latency distribution;
- timeout rate;
- cost;
- policy violations;
- artifact verification rate;
- user feedback;
- downstream validation results.

Reputation must never silently become permission. Policy remains authoritative.

## 13. Memory and Context

Context should be referenced rather than copied unnecessarily.

The context layer should support:

- ephemeral session context;
- artifact references;
- external memory references;
- permission-scoped retrieval;
- provenance of supplied context.

NOESIS can be integrated as a memory/context provider. G.L.U.E. should not embed NOESIS-specific assumptions into the federation core.

## 14. ATHENA Integration

ATHENA should consume G.L.U.E. through a clean interface.

Possible contract:

```text
G.L.U.E.
  discover(capability, constraints)
  inspect(agent)
  invoke(agent, request)
  observe(invocation)
  suspend(agent)
  revoke(agent)

ATHENA
  decide()
  govern()
  coordinate()
  resolve()
```

G.L.U.E. supplies the world of available agents. ATHENA decides how sovereign workflows should use that world.

## 15. dmr-X Integration

G.L.U.E. should not duplicate model routing.

dmr-X can be represented as a capability/runtime provider for:

- model inference;
- model selection;
- worker provisioning;
- specialized modalities;
- neural/BCI workloads;
- local and remote model execution.

An agent can request model capability through the ecosystem without knowing which model/provider ultimately executes it.

## 16. ARGUS Integration

ARGUS should be connected as a specialized agent/system through the same federation boundary unless a privileged trust relationship is explicitly required.

This prevents special-case coupling from spreading through the G.L.U.E. core.

## 17. Operational Model

The first production deployment should support:

- local single-node mode;
- Docker/Compose deployment;
- remote agent endpoints;
- SQLite for local metadata;
- PostgreSQL for production metadata;
- OpenTelemetry-compatible tracing;
- structured logs;
- metrics;
- health endpoints.

Kubernetes should not be a prerequisite for the first release.

## 18. Reliability

Every invocation should have:

- request ID;
- deadline;
- cancellation semantics;
- retry policy;
- idempotency where possible;
- circuit breaker behavior;
- bounded queues;
- backpressure;
- explicit failure state.

Never retry an operation blindly when it may have side effects.

## 19. Testing Strategy

### Unit tests

Test core models, policies, routing filters, identity validation, and state transitions.

### Adapter conformance tests

Every adapter must pass the same behavioral contract suite.

### Interoperability tests

Run real agents across multiple protocols and verify canonical behavior.

### Security tests

Test authentication failures, authorization bypasses, malicious manifests, SSRF, prompt injection through agent metadata, path traversal, command injection, credential leakage, and confused-deputy scenarios.

### Chaos tests

Test:

- disappearing agents;
- stale registry entries;
- network partitions;
- duplicate events;
- slow agents;
- malicious agents;
- adapter crashes;
- partial responses.

## 20. Performance Targets

Targets should be measured rather than assumed, but the architecture should aim for:

- local registry lookup in single-digit milliseconds under normal load;
- adapter overhead small relative to remote agent latency;
- streaming without unnecessary buffering;
- bounded memory use per active session;
- predictable CPU/memory usage under many concurrent connections.

The first benchmark suite should establish real baselines.

## 21. Implementation Phases

### Phase 0 — Minimum protocol contract

Define `glue/v1`, canonical participant/capability/invocation/event schemas, identity model, lifecycle state machine, policy interface, provenance model, and conformance suite.

### Phase 1 — Local federation proof

Implement the Rust runtime, registry, manifest ingestion, native HTTP adapter, stdio adapter, canonical invocation, deterministic policy, provenance, health, cancellation, and CLI.

**Exit criterion:** two unrelated agents communicate successfully through G.L.U.E. without sharing a framework.

### Phase 2 — Protocol expansion

Add MCP, A2A, HTTP/REST compatibility improvements, WebSocket streaming, gRPC, and container adapters.

### Phase 3 — Community federation

Add Buzz/Nostr and other workspace/community adapters.

### Phase 4 — Capability intelligence

Add capability graph optimization, semantic matching, reputation, and advanced routing.

### Phase 5 — Sovereign integration

Integrate ATHENA, NOESIS, ARGUS, and dmr-X through explicit interfaces.

### Phase 6 — Internet-scale federation

Add federation between G.L.U.E. nodes, signed catalogs, trust exchange, revocation propagation, and resilient distributed discovery.

## 22. Engineering Principles

1. **Adapters at the edge.**
2. **Stable canonical contracts.**
3. **Identity before trust.**
4. **Trust before privilege.**
5. **Capability before agent-name routing.**
6. **Provenance by default.**
7. **Least privilege.**
8. **No hidden federation.**
9. **No mandatory model provider.**
10. **No mandatory agent framework.**
11. **Deterministic policy before probabilistic reasoning.**
12. **Fail closed for sensitive operations.**
13. **Observable by default.**
14. **Federate rather than absorb.**
15. **Keep the core smaller than the ecosystem it connects.**
