# G.L.U.E. Minimum Protocol + Runtime

**Status:** Proposed implementation contract  
**Version:** 0.1  
**Date:** 2026-09-14

## 1. Purpose

G.L.U.E. should not begin by implementing the entire federation architecture. The first release must prove one narrow claim:

> Two unrelated agents can discover, identify, negotiate capabilities, authorize, invoke, stream or complete work, cancel it, and produce verifiable provenance through G.L.U.E. without adopting each other's framework.

This document defines the smallest protocol and runtime capable of proving that claim.

The minimum implementation is intentionally smaller than the long-term G.L.U.E. architecture.

## 2. What the Minimum Runtime Must Do

The runtime has exactly six responsibilities:

1. **Identity** — assign and verify stable participant identities.
2. **Discovery** — publish/fetch a machine-readable agent manifest.
3. **Capability** — advertise and query capabilities.
4. **Invocation** — submit, stream, complete, fail, and cancel work.
5. **Policy** — deterministically decide whether an invocation is permitted.
6. **Provenance** — emit a correlated, tamper-evident operation trail.

Everything else is an extension.

The runtime is not an agent framework and does not execute model inference itself.

## 3. Protocol Boundary

G.L.U.E. should define a small canonical application protocol rather than invent a new transport stack.

### Canonical protocol

- JSON data model
- JSON-RPC 2.0 style request/response semantics
- HTTP/HTTPS as the first remote transport
- WebSocket or Server-Sent Events for streaming
- stdio as an optional local transport
- content types and schemas versioned independently from transport

This follows a useful pattern already demonstrated by MCP and A2A: keep the semantic contract separate from the transport. MCP uses JSON-RPC and supports stdio and Streamable HTTP; A2A uses agent metadata plus task-oriented communication. G.L.U.E. should learn from both rather than replace either.

## 4. Minimum Resource Model

G.L.U.E. needs only four primary resources:

```text
Participant
Capability
Invocation
Event
```

### Participant

```json
{
  "id": "glue:agent:example",
  "name": "Example Agent",
  "version": "1.0.0",
  "owner": "did:example:owner",
  "endpoints": [
    {
      "protocol": "glue/1",
      "url": "https://agent.example/glue"
    }
  ],
  "capabilities": ["research.web"],
  "public_keys": [],
  "trust": "unknown"
}
```

A participant record describes an entity. It does not grant it permissions.

### Capability

A capability is a stable semantic identifier with optional structured input/output descriptions.

```json
{
  "id": "research.web",
  "version": "1",
  "description": "Research public web sources",
  "input_schema": {},
  "output_schema": {},
  "streaming": true,
  "side_effects": false
}
```

Capabilities are declarations until verified by policy or observation.

### Invocation

```json
{
  "id": "inv_01J...",
  "caller": "glue:agent:caller",
  "target": "glue:agent:researcher",
  "capability": "research.web",
  "input": {},
  "constraints": {
    "deadline_ms": 30000,
    "max_cost": 0.10
  },
  "context_refs": [],
  "idempotency_key": "..."
}
```

### Event

Events are the durable audit/provenance vocabulary.

```json
{
  "id": "evt_01J...",
  "type": "invocation.completed",
  "timestamp": "2026-09-14T00:00:00Z",
  "request_id": "inv_01J...",
  "actor": "glue:agent:researcher",
  "subject": "glue:agent:researcher",
  "data": {},
  "previous": "hash:...",
  "signature": "..."
}
```

## 5. Minimum Methods

The first protocol should expose only these operations:

```text
participant.get
capability.list
invocation.create
invocation.get
invocation.cancel
health.get
```

Streaming is represented by protocol events rather than another large API surface.

### `participant.get`

Returns the public participant manifest.

### `capability.list`

Returns capabilities currently advertised by a participant.

### `invocation.create`

Creates an invocation after policy authorization.

The response must contain:

```text
request_id
state
accepted_at
provenance_id
```

States:

```text
accepted
running
completed
failed
cancelled
expired
rejected
```

### `invocation.get`

Returns current state and available result/artifact references.

### `invocation.cancel`

Requests cancellation. The target must explicitly report whether cancellation succeeded, was already complete, or is unsupported.

### `health.get`

Reports endpoint/runtime health. Health is not a trust assertion.

## 6. Discovery

Discovery should have two modes.

### Direct discovery

A caller already knows an endpoint and fetches its manifest.

### Registry discovery

A G.L.U.E. node searches its local registry for capabilities.

The registry is deliberately not part of the wire protocol. A deployment may implement it with SQLite, PostgreSQL, or another store without changing the agent-facing contract.

## 7. Identity

The minimum identity model should use public-key identities.

Requirements:

- stable participant ID;
- public key(s);
- signed manifest support;
- key rotation metadata;
- revocation state;
- explicit owner/operator identity when available.

Ed25519 is the recommended initial signature algorithm because it is compact, fast, broadly implemented, and has mature Rust support. The implementation should hide the cryptographic primitive behind a small signing/verifying trait so the protocol is not permanently coupled to one algorithm.

Identity answers **who controls this endpoint/key**. It does not answer **whether the participant is trustworthy**.

## 8. Trust

Trust is intentionally outside the minimum identity primitive.

Initial trust states:

```text
unknown
identified
verified
trusted
suspended
revoked
```

A deployment may attach evidence to a trust assessment:

- signed manifest;
- verified operator;
- source provenance;
- successful conformance tests;
- sandbox observations;
- historical behavior;
- human approval.

Trust must never silently grant permissions.

## 9. Policy

Before `invocation.create`, the runtime evaluates deterministic policy.

Minimum policy inputs:

```text
caller
caller trust
capability
 target
 target trust
requested data/context
side effects
resource limits
time/deadline
human approval requirement
```

The result is one of:

```text
allow
allow_with_constraints
deny
require_approval
```

No LLM is required for this decision.

## 10. Provenance

Every invocation receives one correlation ID from creation through completion.

The runtime must be able to reconstruct:

```text
caller
  -> policy decision
  -> selected target
  -> adapter
  -> invocation
  -> events
  -> artifacts/results
```

For federation, events should be append-only and hash-linked. Signed events are preferred for cross-node exchange.

Provenance is metadata, not a copy of private agent context.

## 11. Invocation Semantics

G.L.U.E. should support three execution shapes without defining three different protocols:

### Synchronous

The server completes the invocation in the original response.

### Asynchronous

The server returns `accepted` and the caller observes state with `invocation.get`.

### Streaming

The server emits ordered events associated with the same request ID.

Example event sequence:

```text
invocation.accepted
invocation.started
invocation.progress
invocation.artifact
invocation.completed
```

Failure and cancellation events use the same event stream.

## 12. Error Model

Errors must be machine-readable and safe to expose across trust boundaries.

Minimum fields:

```json
{
  "code": "capability_not_found",
  "message": "No matching capability is available",
  "retryable": false,
  "details": {},
  "request_id": "..."
}
```

Never return secrets, credentials, stack traces, private prompts, or sensitive policy internals by default.

## 13. Adapters

The minimum runtime should ship with only three adapters:

1. **Native G.L.U.E. HTTP** — proves the canonical protocol.
2. **HTTP/REST** — wraps ordinary services.
3. **stdio/local process** — makes local agents usable without networking.

MCP and A2A adapters come immediately after the core conformance suite is stable.

This is important: G.L.U.E. should not make MCP or A2A dependencies of the core. They are interoperability adapters.

## 14. Runtime Architecture

```text
                 +-----------------------+
                 |  G.L.U.E. HTTP API    |
                 +-----------+-----------+
                             |
                    +--------v--------+
                    | Protocol Layer  |
                    | parse/validate  |
                    +--------+--------+
                             |
          +------------------+------------------+
          |                  |                  |
     Identity            Policy             Registry
          |                  |                  |
          +------------------+------------------+
                             |
                    +--------v--------+
                    | Invocation Core |
                    | lifecycle       |
                    | timeout         |
                    | cancellation    |
                    +--------+--------+
                             |
                    +--------v--------+
                    | Adapter Runtime |
                    +--------+--------+
                             |
                 +-----------+-----------+
                 |           |           |
               HTTP        stdio      Native GLUE
                             |
                    external agents

                 +-----------------------+
                 | Provenance/Event Log   |
                 +-----------------------+
```

The core must never depend on a specific agent framework or model SDK.

## 15. Recommended Language: Rust

The reference runtime should be implemented in **Rust**.

### Why Rust

1. **Safety at the federation boundary.** G.L.U.E. handles untrusted network input, identities, authorization, adapters, process boundaries, and potentially hostile agents. Rust's memory and thread safety eliminate a class of implementation failures that would be especially costly in a federation substrate.

2. **Excellent async networking.** Tokio provides the async runtime and networking building blocks needed for concurrent agent connections. citeturn1search1turn1search8

3. **Strong HTTP stack.** Axum provides ergonomic HTTP routing and integrates with Tokio and Tower middleware, which is useful for timeouts, tracing, authorization, and other boundary controls. citeturn1search2

4. **Cryptographic ecosystem.** `ed25519-dalek` provides mature Ed25519 signing and verification support in Rust. citeturn1search0turn1search5

5. **Single small native binary.** A federation node, local CLI, sidecar, or adapter can ship as a compact native executable instead of requiring a heavyweight language runtime.

6. **Concurrency and backpressure.** Agent federation naturally involves many slow, streaming, disconnected, or partially failing peers. Rust's async ecosystem is well suited to bounded concurrency and explicit cancellation.

7. **Good fit for an infrastructure product.** G.L.U.E. is closer to a network substrate than an AI application. The runtime should prioritize predictable resource use, correctness, and long-lived protocol stability over rapid model-framework experimentation.

### Recommended Rust stack

```text
Rust 2024
Tokio          async runtime
Axum           HTTP/HTTP streaming API
Tower          middleware/policy boundary
Serde          JSON serialization/deserialization
Ed25519        participant/event signatures
Tracing        structured observability
SQLx           optional PostgreSQL/SQLite persistence
Clap           CLI
```

The protocol schemas remain language-neutral. Rust is the reference implementation, not a requirement for participating agents.

## 16. Why Not Make Python the Core?

Python remains useful for SDKs, adapter prototypes, test agents, and AI-heavy integrations. It should not be the reference federation runtime.

Python would make early experimentation easier, but the core has to live at a security-sensitive, highly concurrent, protocol-facing boundary. The ecosystem can still provide a first-class Python SDK without making the runtime itself Python.

## 17. Why Not Go?

Go would also be a credible choice: simple deployment, strong networking, mature concurrency, and excellent operational tooling.

Rust wins for G.L.U.E. because the project explicitly makes untrusted interoperability, permission boundaries, adapters, process execution, and cryptographic identity core concerns. The additional type-system complexity is justified in the substrate; SDK users should not have to inherit it.

## 18. What the MVP Deliberately Does Not Build

Do not implement these in the first runtime:

- semantic/LLM capability matching;
- reputation scoring;
- distributed graph database;
- global marketplace;
- payments;
- embedded memory;
- model routing;
- sovereign orchestration;
- workflow engine;
- Kubernetes control plane;
- automatic trust promotion;
- giant adapter catalogue;
- mandatory community protocol.

These can be layered on later without changing the minimum invocation contract.

## 19. MVP Repository Shape

```text
crates/
  glue-core/       canonical types + state machines
  glue-protocol/   wire schemas + JSON-RPC methods
  glue-identity/   keys, signatures, identity verification
  glue-policy/     deterministic authorization
  glue-runtime/    invocation lifecycle + cancellation
  glue-registry/   participant/capability registry
  glue-events/     provenance/event chain
  glue-adapters/   adapter traits
  glue-http/       native HTTP transport
  glue-stdio/      local process transport
  glue-cli/        operator/developer CLI

adapters/
  http/
  stdio/

schemas/
  glue-v1/

tests/
  conformance/
  interoperability/
  security/
```

Keep crates independently testable. Do not split every tiny type into a crate before real boundaries emerge.

## 20. First End-to-End Demonstration

The first milestone is a two-agent interoperability test:

```text
Agent A
  |
  | participant.get
  v
G.L.U.E.
  |
  | capability.list
  v
Agent B
  |
  | research.web
  v
invocation.create
  |
  +--> identity check
  +--> policy decision
  +--> adapter
  +--> Agent B
  |
  +--> signed provenance events
  |
  v
completed result
```

Success means Agent A and Agent B remain unchanged except for the adapter boundary.

## 21. Conformance Test

A minimum conformant participant must demonstrate:

1. manifest retrieval;
2. stable identity;
3. capability declaration;
4. authenticated invocation;
5. policy enforcement;
6. correlated result;
7. explicit error handling;
8. cancellation or explicit unsupported status;
9. provenance event emission;
10. health reporting.

A participant should be able to pass the suite without using Rust.

## 22. Evolution Rule

The protocol should evolve by adding optional capabilities before changing mandatory semantics.

Versioning rules:

- `glue/v1` remains wire-compatible across additive changes;
- breaking semantic changes require `glue/v2`;
- adapters may translate between protocol versions;
- canonical IDs and provenance correlation must remain stable;
- transport changes must not require capability schema changes.

## 23. Design Decision

**Decision:** Build the first G.L.U.E. runtime in Rust, with a language-neutral JSON/JSON-RPC protocol, HTTP as the first network transport, stdio as the first local transport, public-key identity, deterministic policy, capability-first discovery, and signed/hash-linked provenance.

Do not create a new agent framework.

Do not make MCP or A2A the G.L.U.E. core.

G.L.U.E.'s job is to provide the stable interoperability boundary that lets those protocols—and future protocols—participate without becoming dependencies of the federation core.
