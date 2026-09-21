# GLUE UHP / Harness Execution Integration Specification

**Status:** Proposed architecture specification  
**Version:** 0.1  
**Date:** 2026-09-21  
**Target:** G.L.U.E. federation architecture

## 1. Decision

G.L.U.E. will make **Unified Harness Protocol (UHP) support a first-class execution adapter in its architecture**.

G.L.U.E. will **not** absorb HarnessRouter, fork its runtime, or make UHP the master protocol of the federation.

The boundary is:

- **G.L.U.E.** = federation, identity, discovery, capability normalization, trust, policy, routing, provenance, lifecycle, sessions, artifacts, and interoperability.
- **UHP** = standardized execution contract for complete agent harnesses.
- **HarnessRouter** = one implementation/provider of UHP.
- **Native harnesses** = Codex, Claude Code, Hermes, PI, DSH, and future harnesses exposed through a UHP server.
- **dmr-X** = model/runtime routing; it remains separate from agent/harness selection.
- **ATHENA** = sovereign orchestration/governance; it consumes GLUE's available capabilities and executions.
- **NOESIS** = durable memory; GLUE sessions are execution continuity, not a replacement for NOESIS.

This specification turns the HarnessRouter research into an implementation contract for GLUE.

## 2. Why UHP belongs in GLUE

A federation fabric needs to connect not only conversational agents and tools, but complete agent runtimes that can:

- execute multi-step work;
- use their own tools;
- maintain working sessions;
- edit files;
- produce artifacts;
- stream progress;
- cancel running work;
- report structured failures.

UHP defines that execution boundary without requiring a client to know how the harness is implemented. Its current architecture explicitly separates Client, UHP Server, and Harness, and treats configured harnesses as addressable execution targets. urlUHP architecturehttps://github.com/HarnessRouter/harnessrouter/blob/main/protocol/versions/2026-08-11/architecture.md

GLUE should therefore treat UHP as an **execution protocol adapter**, alongside MCP, A2A, HTTP, WebSocket, gRPC, CLI, and community adapters.

## 3. Architectural position

The resulting architecture is:

```text
                    ATHENA / ARGUS / ZOEY / DANNY
                              |
                    sovereign/application layer
                              |
                         G.L.U.E.
                              |
        +---------------------+----------------------+
        |                     |                      |
       MCP                   A2A              UHP / Harness
        |                     |                      |
   MCP agents           A2A agents       UHP servers / HarnessRouter
                                                   |
                                      +------------+------------+
                                      |            |            |
                                    Codex       Claude       Hermes
                                    harness      Code         harness
                                      |            |            |
                                      +------ native runtime --+
                                                   |
                                      tools / files / workspace
```

The key rule is:

> **GLUE standardizes the federation boundary; UHP standardizes one execution boundary.**

UHP is therefore below GLUE's canonical federation model and above the native harness implementation.

## 4. Terminology

GLUE MUST distinguish the following objects:

### Agent
A logical autonomous participant with an identity, owner, capabilities, and one or more interfaces.

### Instance
A deployed occurrence of an agent or execution service.

### Interface
A protocol endpoint through which an instance can be reached.

### Harness
A complete agent runtime capable of planning, tool use, environment interaction, and session state.

### Configured Harness
A harness plus configuration such as model, system instructions, tools, skills, MCP servers, limits, and policy.

### Execution Profile
A GLUE representation of the configuration required to run a capability through a particular interface/harness.

### Invocation
A caller's request/attempt to start or continue work.

### Execution
The actual unit of work produced by an invocation.

### Response
The current result/state of an execution.

### Session
Continuity across related executions.

### Event
A protocol fact describing execution progress or state change.

### Artifact
A generated or referenced output associated with an execution/session.

These objects MUST NOT be collapsed into one opaque Agent record.

## 5. UHP adapter contract

GLUE SHALL provide an adapter with the conceptual shape:

```text
UHPAdapter
  discover()
  inspectServer()
  discoverHarnesses()
  discoverModels()
  describeExecutionProfiles()
  identify()
  describeCapabilities()
  invoke()
  continueSession()
  stream()
  cancel()
  inspectExecution()
  listArtifacts()
  retrieveArtifact()
  health()
  readiness()
  normalizeError()
  close()
```

The adapter MUST work against a generic UHP-compatible server. HarnessRouter is the primary integration target, but GLUE MUST NOT hard-code HarnessRouter-specific assumptions into the canonical model.

## 6. UHP-to-GLUE mapping

| UHP concept | GLUE concept |
|---|---|
| UHP Server | Interface / Execution Provider |
| Harness | Harness + Agent/Instance representation |
| Configured Harness | Execution Profile |
| Model | Model reference / runtime dependency |
| Response | Response |
| Session | Session |
| File | File |
| Container | Workspace / execution boundary |
| Event | Canonical GLUE Event |
| Artifact | Artifact |
| UHP error | Canonical GLUE Error |
| Harness lifecycle | Instance/Profile lifecycle |

The mapping layer MUST preserve native UHP information that has no direct GLUE equivalent as protocol-specific metadata rather than discarding it.

## 7. Discovery

UHP discovery SHALL occur in stages:

1. Discover endpoint.
2. Establish transport security.
3. Authenticate.
4. Inspect protocol/version support.
5. Discover available harnesses.
6. Discover available models where exposed.
7. Discover execution profiles/configured harnesses.
8. Map capabilities.
9. Record health/readiness.
10. Evaluate GLUE trust and policy.
11. Register eligible resources.

Discovery MUST NOT grant execution permission.

A discovered UHP server is initially:

```text
DISCOVERED
  -> IDENTIFIED
  -> INTERFACE VERIFIED
  -> CAPABILITIES DECLARED
  -> CAPABILITIES VERIFIED
  -> SANDBOXED/QUARANTINED
  -> OBSERVED
  -> PROVISIONAL
  -> VERIFIED
  -> TRUSTED
```

## 8. Capability model

The adapter MUST expose capability information including, where available:

- capability ID and version;
- input schema;
- output schema;
- streaming support;
- cancellation support;
- session support;
- artifact support;
- file input;
- execution profile;
- required permissions;
- resource requirements;
- trust requirements;
- supported protocols;
- availability;
- health;
- declared model;
- actual model reporting support;
- constraints;
- verification state.

**Declared** and **verified** capabilities MUST remain separate.

GLUE MUST NOT advertise a capability as supported solely because a server claims it.

## 9. Capability negotiation

Before execution, GLUE SHOULD negotiate:

- capability version;
- interface;
- protocol;
- execution profile;
- permissions;
- limits;
- streaming mode;
- cancellation support;
- artifact support;
- session behavior.

The decision MUST be recorded.

Example:

```text
Requested capability
      |
Candidate UHP profiles
      |
Protocol/version compatibility
      |
Trust + policy
      |
Resource constraints
      |
Execution profile
      |
Invocation
```

## 10. Invocation and execution lifecycle

The canonical lifecycle is:

```text
Invocation requested
       |
Policy evaluation
       |
Candidate/profile selection
       |
Execution created
       |
Execution started
       |
Events / messages / tool activity
       |
 +-----+-----------+-------------+
 |                 |             |
completed        failed       cancelled
 |                 |             |
Response         Error        Cancellation state
 |
Artifacts / provenance
```

An invocation MUST have a stable request/correlation ID.

An execution MUST have its own stable ID.

Retries MUST NOT overwrite the original execution.

A retry SHOULD create a new execution linked to the parent execution and include the retry cause.

## 11. Sessions

GLUE SHALL support implicit sessions.

A one-shot invocation MUST NOT require a separate session-creation request.

For continuing work, the caller supplies a continuation anchor such as a response/execution ID and GLUE maps that to the native UHP continuation mechanism.

Session metadata SHOULD include:

- owner/principal;
- participants;
- policy;
- capabilities;
- execution profile;
- workspace reference;
- lifecycle;
- expiration;
- resumability;
- correlation identifiers.

GLUE session state is **not** durable memory.

Selected events MAY be published to NOESIS through an explicit policy-controlled integration.

## 12. Streaming

GLUE SHALL normalize UHP streaming into canonical events.

Events MUST be protocol facts, not UI rendering instructions.

Minimum event fields:

```json
{
  "id": "evt_...",
  "type": "execution.started",
  "execution_id": "exec_...",
  "session_id": "sess_...",
  "sequence": 0,
  "timestamp": "...",
  "producer": "glue:adapter:uhp",
  "payload": {}
}
```

The event model MUST support:

- deterministic sequence ordering;
- explicit terminal events;
- request/execution/session correlation;
- progressive delivery;
- stream/non-stream result consistency;
- replay/resume where the native protocol supports it.

Transport details such as SSE MUST remain inside the adapter. Other transports MUST map into the same canonical event model.

## 13. Cancellation

Cancellation is a first-class operation.

GLUE SHOULD represent:

```text
REQUESTED
  -> ACCEPTED
  -> PROPAGATING
  -> CANCELLED
```

If cancellation fails:

```text
CANCELLATION_FAILED
```

If the backend cannot cancel an operation, the adapter MUST report that fact. GLUE MUST NOT pretend cancellation succeeded.

Cancellation requests MUST be correlated with the target execution and caller principal.

## 14. Files, workspaces, and artifacts

Files and artifacts SHALL be first-class resources.

GLUE MUST distinguish:

- input files;
- working files;
- generated artifacts;
- external references;
- repositories;
- datasets;
- structured results.

Artifact metadata SHOULD include:

- artifact ID;
- execution/session ID;
- media type;
- size;
- checksum;
- creator;
- creation time;
- retention;
- access policy;
- storage reference.

The UHP adapter MUST prevent path traversal and must not expose arbitrary host filesystem paths as artifacts.

Execution isolation MUST be explicit:

```text
remote-only
trusted-host
local-process
container
sandbox
microVM
```

The exact isolation implementation is outside UHP and outside GLUE's canonical protocol.

## 15. Error model

All UHP failures MUST be normalized into the GLUE error contract.

Minimum fields:

```text
code
category
message
retryable
retry_after
stage
adapter
target
execution_id
request_id
details
provenance
```

Suggested categories:

- authentication;
- authorization;
- discovery;
- identity;
- capability;
- policy;
- routing;
- transport;
- timeout;
- rate-limit;
- execution;
- tool;
- artifact;
- session;
- protocol;
- validation;
- dependency;
- security;
- cancellation;
- unknown.

Callers MUST be able to determine retryability without parsing human prose.

Absent values MUST remain absent. GLUE MUST NOT invent zero cost, estimated latency, fake usage, confidence, or model identity.

## 16. Actual model and runtime attribution

GLUE MUST distinguish:

- requested model;
- selected model;
- actual model;
- substitution reason;
- model router decision;
- harness;
- runtime;
- adapter;
- execution profile.

This is the integration boundary with dmr-X.

Example:

```text
ATHENA/GLUE request
      |
GLUE selects UHP execution profile
      |
UHP server runs configured harness
      |
dmr-X/provider selects runtime/model
      |
actual model reported
      |
GLUE records provenance
```

GLUE MUST NOT report the requested model as the actual model unless execution evidence establishes that they are the same.

## 17. Principal and resource isolation

Every execution resource MUST be scoped to a principal, community, or tenant.

This includes:

- executions;
- responses;
- sessions;
- files;
- artifacts;
- credentials;
- execution profiles;
- policy records.

A caller MUST NOT be able to inspect, continue, cancel, delete, or retrieve another principal's resources.

For resources that are not in scope, the implementation SHOULD avoid existence leaks and use a uniform not-found response where the protocol permits.

## 18. Security requirements

The UHP adapter MUST implement:

- TLS for remote endpoints;
- scoped authentication;
- credential isolation;
- secret redaction;
- endpoint allow/deny policy;
- SSRF protection;
- DNS-rebinding protection;
- private-network policy;
- artifact traversal protection;
- request/response size limits;
- execution deadlines;
- cancellation propagation;
- quotas;
- adapter isolation;
- audit logging;
- revocation;
- replay protection where applicable;
- idempotency for supported side-effecting operations.

The UHP server's ability to execute shell, git, filesystem, or other tools MUST be treated as a privileged execution capability.

## 19. Routing boundary

GLUE routes **agents, capabilities, interfaces, instances, and execution profiles**.

dmr-X routes **models, runtimes, workers, modalities, and inference backends**.

Therefore:

```text
GLUE
  "Which execution target can perform this capability safely?"
                     |
                     v
UHP / HarnessRouter
  "Run this configured harness."
                     |
                     v
dmr-X
  "Which model/runtime should this harness use?"
```

Neither GLUE nor UHP should absorb the other's responsibilities.

## 20. Conformance

UHP support becomes a GLUE conformance profile.

Proposed profiles:

- **UHP-Core** — discovery, capability discovery, invocation, streaming, continuation, cancellation, structured errors.
- **UHP-Extended** — files, artifacts, session inspection/listing.
- **UHP-Full** — lifecycle and session-sharing capabilities where supported.
- **GLUE-UHP-Federated** — UHP plus GLUE identity, trust, policy, provenance, capability negotiation, and federation requirements.

The adapter MUST expose its supported profile.

GLUE MUST NOT claim an implementation is conformant without passing the corresponding automated tests.

HarnessRouter's UHP design makes conformance a first-class contract: the protocol specification, machine-readable schemas, implementation, and conformance tests evolve together. urlHarnessRouter UHP implementation and conformance docshttps://github.com/HarnessRouter/harnessrouter/blob/main/protocol/README.md

## 21. GLUE conformance test plan

The UHP adapter test suite MUST cover:

### Discovery
- server discovery;
- protocol/version detection;
- harness discovery;
- model discovery;
- execution-profile discovery.

### Invocation
- valid execution;
- invalid input;
- correlation IDs;
- execution state transitions;
- response retrieval.

### Streaming
- event schema;
- sequence ordering;
- progressive delivery;
- terminal event;
- stream/non-stream consistency.

### Sessions
- implicit creation;
- continuation;
- inspection;
- isolation;
- expiration;
- resume where supported.

### Cancellation
- accepted cancellation;
- propagation;
- terminal cancellation;
- cancellation failure reporting.

### Files/artifacts
- upload/input;
- artifact listing;
- artifact retrieval;
- checksum/metadata;
- path traversal rejection.

### Errors
- typed errors;
- retryable/non-retryable behavior;
- authentication;
- authorization;
- timeout;
- protocol mismatch;
- target failure.

### Security
- principal isolation;
- credential handling;
- SSRF;
- DNS rebinding;
- artifact traversal;
- secret redaction;
- endpoint policy;
- replay/idempotency.

### GLUE integration
- identity mapping;
- trust admission;
- policy enforcement;
- provenance;
- capability verification;
- routing decision;
- actual-model attribution.

## 22. Repository implementation plan

The implementation SHOULD be delivered in the following order.

### Phase P0 — Canonical contracts

Add versioned schemas/types for:

- Agent;
- Instance;
- Interface;
- Harness;
- ExecutionProfile;
- Capability;
- Invocation;
- Execution;
- Response;
- Session;
- Event;
- Artifact;
- File;
- Error;
- PolicyDecision;
- TrustAssessment.

Add IDs, lifecycle states, provenance, principal ownership, and timestamps.

### Phase P1 — Execution core

Add:

- execution service;
- session service;
- event normalization;
- cancellation state machine;
- structured errors;
- artifact registry;
- idempotency;
- execution inspection;
- observability.

### Phase P1 — UHP adapter

Add:

```text
adapters/uhp/
  uhp-adapter
  uhp-client
  uhp-discovery
  uhp-mapper
  uhp-events
  uhp-errors
  uhp-auth
  uhp-artifacts
  uhp-sessions
  uhp-conformance
```

The adapter MUST remain independent from the HarnessRouter product name.

### Phase P1 — Security

Add endpoint security, principal scoping, SSRF protection, artifact containment, secret handling, execution boundaries, quotas, deadlines, and audit coverage.

### Phase P2 — Federation

Expose UHP execution targets through GLUE's registry and capability graph.

Support capability negotiation, trust exchange, delegated grants, revocation, and federation policy.

### Phase P3 — Ecosystem integration

Integrate:

- HarnessRouter;
- Ghost Factory;
- coding harnesses;
- ATHENA;
- dmr-X;
- NOESIS through explicit memory publication/retrieval interfaces.

## 23. Ghost Factory integration

Ghost Factory can consume GLUE UHP targets rather than implementing every harness integration itself.

Target flow:

```text
ATHENA
   |
G.L.U.E.
   |
capability + trust + policy selection
   |
UHP / HarnessRouter
   |
coding harness
   |
isolated workspace
   |
tests / artifacts / review
   |
GLUE provenance
   |
ATHENA
```

This makes UHP the execution boundary for coding harnesses while Ghost Factory remains the autonomous software-engineering factory.

## 24. What must NOT be implemented

Do not:

- fork HarnessRouter into GLUE;
- copy HarnessRouter's gateway/runner architecture into GLUE;
- make UHP the canonical GLUE agent protocol;
- expose HarnessRouter-specific implementation details in canonical GLUE contracts;
- make GLUE responsible for native harness loops;
- make GLUE responsible for model selection;
- store durable memory in GLUE sessions;
- trust discovered UHP servers automatically;
- equate declared capabilities with verified capabilities;
- silently fabricate execution metadata.

## 25. Definition of done

UHP is considered part of the GLUE architecture when:

1. UHP is listed as a first-class adapter/protocol in architecture documentation.
2. Canonical execution/session/event/artifact/error contracts exist.
3. A generic UHP adapter can discover a server and its execution targets.
4. A UHP target can be invoked through GLUE's canonical invocation model.
5. Streaming and cancellation map into canonical GLUE events/state.
6. Sessions and artifacts are first-class and principal-scoped.
7. Structured UHP failures map to canonical GLUE errors.
8. Trust and policy are evaluated before execution.
9. Requested versus actual model/runtime provenance is retained.
10. Automated conformance tests cover the supported UHP profile.
11. HarnessRouter works as an external UHP provider without special-case coupling.
12. GLUE remains protocol-neutral and federation-first.

## 26. Architectural law

> **GLUE should standardize the boundary, not standardize the agent.**

UHP is therefore a first-class execution protocol inside the GLUE architecture, not a replacement for the architecture itself.
