# HarnessRouter Deep Research — GLUE Extraction Record

Status: Adopted design research
Date: 2026-09-21

## Executive decision

HarnessRouter should not be absorbed into GLUE, and GLUE should not become a harness runner. HarnessRouter solves the execution-interface problem for complete agent harnesses. GLUE solves the larger federation problem: discovery, identity, trust, capability normalization, routing, policy, provenance, sessions, artifacts and federation across heterogeneous agents and services.

GLUE should learn UHP's protocol discipline, add a UHP/HarnessRouter adapter, and keep UHP as one execution protocol rather than making it the definition of GLUE.

## 1. What HarnessRouter contributes

HarnessRouter exposes complete agent harnesses through a stable interface. Its architecture distinguishes client, protocol server/gateway, harness runtime, configured harness, model, response/task, session, workspace/container and files/artifacts.

Key lesson: the wire contract should not leak how a harness is actually executed. Containers, subprocesses, queues and remote workers are implementation details. This maps directly to GLUE's goal of preserving native agent implementations.

## 2. Configured execution targets

A base harness is not enough. A configured harness is a first-class target combining a base harness with model, instructions, tools, skills, MCP servers and limits.

GLUE should explicitly distinguish Agent, Instance, Interface, Execution Profile, Harness, Model and Runtime. Two instances of the same harness can have different permissions and capabilities.

Suggested conceptual chain:

Agent -> Instance -> Interface -> Execution Profile -> Model/Tools/Skills/Policies

Do not collapse these into one opaque agent record.

## 3. Protocol specification discipline

Adopt the strongest UHP practices:

- normative MUST, MUST NOT, SHOULD, SHOULD NOT and MAY language;
- machine-readable JSON Schema;
- OpenAPI for HTTP surfaces;
- generated types;
- versioned protocol contracts;
- explicit conformance classes;
- automated behavioral conformance tests;
- compatibility and migration rules.

GLUE should define cumulative profiles such as Core, Streaming, Extended, Federation and Advanced. A node must advertise exactly what it implements.

## 4. Conformance suite

One of the strongest HarnessRouter ideas is treating conformance as part of the protocol, not optional documentation. Its current tests cover harness discovery, model discovery, valid task responses, terminal states, actual-model reporting, session reporting, stored responses, typed IDs, streaming, event schemas, sequence ordering, terminal events, progressive streaming, session continuation, cancellation, session inspection, turn history, file input, artifact listing/download, artifact containment and harness lifecycle.

GLUE should create a first-class conformance package. Every protocol feature should ship with specification, schema, implementation, conformance test and changelog/migration note.

Never claim a GLUE protocol feature is supported without an automated behavioral test.

## 5. Resource/object model

UHP uses explicit typed resource objects. GLUE should adopt the same discipline.

Recommended resource families:

- Agent
- Instance
- Interface
- Capability
- Execution
- Invocation
- Response
- Session
- Event
- Artifact
- File
- Community
- Workspace
- Policy
- Trust record
- Credential reference

Every resource should carry an explicit object type, unambiguous identifier, owner/principal, timestamps, lifecycle state and provenance where relevant.

## 6. Invocation versus execution

GLUE currently centers on InvocationRequest. HarnessRouter suggests a richer distinction:

- Invocation = request/attempt to call a capability.
- Execution/Task = actual unit of work.
- Response = resulting state/output.
- Session = continuity across related executions.
- Event = progress/fact emitted during execution.

This gives GLUE a stronger model for long-running agents and asynchronous execution.

## 7. Sessions

HarnessRouter's session model is valuable: a session is continuity across tasks, and a one-shot task should not require an unnecessary session-creation round trip.

GLUE should support implicit sessions. A one-shot invocation remains simple. Continuation uses an execution/response anchor.

GLUE session metadata should include owner, participants, policy, capabilities, workspace reference, lifecycle, expiration, resumability and cross-adapter correlation.

Session state must remain distinct from NOESIS durable memory.

## 8. Streaming

UHP treats progress events as protocol facts rather than UI rendering instructions. GLUE should adopt this exactly as a design principle.

Canonical events should cover execution creation/start/completion/failure/cancellation, message deltas, tool calls, capability progress and artifact creation/update.

Each event should include event ID, execution ID, session ID, sequence number, timestamp, producer, event type and payload.

Required guarantees should include deterministic ordering, explicit terminal events, consistent streaming/non-streaming results, progressive delivery and replay/resume where supported.

Transport-specific details belong in adapters. SSE, WebSocket, gRPC and other transports map to the same GLUE event model.

## 9. Failure semantics

Failure must be a first-class result. Callers must never parse prose to determine whether an operation is retryable.

Canonical errors should contain code, category, message, retryable flag, retry-after where known, stage, adapter, target, execution ID, request ID, structured details and provenance.

Suggested categories include authentication, authorization, discovery, identity, capability, policy, routing, transport, timeout, rate-limit, execution, tool, artifact, session, protocol, validation, dependency, security, cancellation and unknown.

Retry semantics must be explicit.

## 10. Unknown values

Adopt UHP's rule that absent is not empty and empty is not zero. Never invent cost, latency, confidence, usage or model information.

This is especially important for trust, performance, model identity, cost, usage and provenance.

## 11. Actual execution attribution

UHP's conformance tests verify the model that actually ran. GLUE should record requested model, selected model, actual model, substitution reason, routing decision, harness/runtime and adapter.

This is a direct integration point with DMR-X.

GLUE must never report the requested model as though it were the actual execution model.

## 12. Capability discovery

GLUE should generalize HarnessRouter's harness/model discovery into capability discovery.

A capability record should include capability ID/version, input and output schema, streaming support, cancellation support, artifact support, session support, required permissions, resource requirements, trust requirements, protocols, availability, health, cost/latency metadata, constraints and verification status.

Declared capability and verified capability must remain separate.

## 13. Capability negotiation

Before execution, GLUE should optionally negotiate capability version, interface, protocol, execution profile, permissions and limits.

Example flow: caller requests a capability; candidates advertise versions and constraints; GLUE checks trust/policy/resources; a compatible execution profile is selected; the decision is recorded.

This is stronger than simply selecting an agent by name.

## 14. HarnessRouter/UHP adapter

Add a dedicated UHP/HarnessRouter adapter under the GLUE adapter system.

It should support:

- UHP server discovery;
- harness discovery;
- harness metadata;
- model discovery;
- configured-harness representation;
- task invocation;
- session continuation;
- streaming;
- cancellation;
- artifact listing/retrieval;
- UHP error normalization;
- provenance preservation;
- health/readiness;
- GLUE policy enforcement.

GLUE should work with any compatible UHP server, not only the HarnessRouter product.

## 15. UHP must not become GLUE's master protocol

GLUE should remain protocol-neutral:

MCP -> MCP agents
A2A -> A2A agents
UHP -> harness execution servers
HTTP/gRPC/WebSocket/CLI -> other agents/services

UHP describes harness execution. GLUE describes federation. UHP is therefore an important adapter/protocol integration, not the universal definition of an agent.

## 16. OpenAI Responses compatibility lesson

HarnessRouter intentionally shapes UHP around the OpenAI Responses API to reduce client adoption cost.

GLUE should learn the principle rather than copy the API internally: provide compatibility surfaces where they reduce integration work, while maintaining a protocol-neutral canonical internal model.

Potential compatibility surfaces include UHP, OpenAI Responses, A2A and MCP.

## 17. Files and artifacts

Treat artifacts as first-class resources rather than arbitrary URLs or filesystem paths.

Distinguish input files, working files, generated artifacts, external references, repositories, datasets and structured results.

Artifact metadata should include ID, execution/session association, media type, size, checksum, creator, creation time, retention policy, access policy and storage reference.

Artifact access must be scoped and must prevent path/ID traversal.

## 18. Workspace isolation

HarnessRouter's Community Edition uses separate session workspaces and OS users. The exact implementation should not be copied, but the security principle should be.

Every execution that can touch files or processes should have an explicit execution boundary and known isolation level.

GLUE should know whether a target is remote-only, local, sandboxed, containerized or a trusted host process.

## 19. Security boundary

HarnessRouter explicitly warns that agent CLIs can execute shell, git and filesystem operations. GLUE must therefore never equate discovery with trust.

Strengthen the existing GLUE admission ladder:

DISCOVERED -> IDENTIFIED -> INTERFACE VERIFIED -> CAPABILITY DECLARED -> CAPABILITY VERIFIED -> SANDBOXED/QUARANTINED -> OBSERVED -> PROVISIONAL -> VERIFIED -> TRUSTED

Agents may be suspended, quarantined or revoked at any point.

## 20. Principal-scoped resources

UHP prevents callers from reading, continuing, cancelling or deleting another principal's objects and avoids existence leaks.

GLUE should apply this to agents, executions, sessions, files, artifacts, credentials, policies and federation resources.

Every resource must be scoped to a principal, community or tenant. Out-of-scope objects should not reveal their existence.

## 21. Federation security

Because GLUE itself federates, introduce explicit node/community trust and delegation:

- node identity;
- community identity;
- peer trust relationship;
- federation policy;
- delegated capability grant;
- scoped credentials;
- expiry;
- revocation;
- audit trail;
- replay protection.

A remote GLUE node must not automatically gain access to private agents, sessions, memory, artifacts or credentials.

## 22. Governance

HarnessRouter's protocol governance is a strong model. Protocol changes start with a problem/proposal and compatibility analysis, then update specification, schemas, implementation, conformance tests and changelog together.

GLUE should introduce GLUE Enhancement Proposals (GEPs) with:

Problem, Motivation, Scope, Proposal, canonical model changes, protocol changes, security impact, compatibility, migration, alternatives, implementation plan, conformance tests, observability impact and federation impact.

## 23. Versioning

Explicitly version canonical APIs, schemas, events, adapter contracts and federation protocols.

Breaking changes require a new version and migration guidance. Additive changes should remain compatible where possible. Never silently redefine an existing field.

## 24. Adapter SDK improvements

GLUE already has an adapter interface for inspect, identify, describeCapabilities, invoke, streaming, cancellation and health. HarnessRouter validates this direction and suggests expanding it.

Add support, directly or through declared feature capabilities, for protocol discovery, capability negotiation, sessions, execution inspection, artifact operations, event replay/resume, authentication, delegated authorization, lifecycle, model/runtime discovery and configured execution profiles.

Adapters must explicitly advertise unsupported features rather than pretending they exist.

## 25. Adapter conformance

Each adapter should have tests for discovery, identity, capabilities, invocation, streaming, cancellation, sessions, artifacts, health, errors, authentication, policy and provenance.

Unsupported is a valid state. False support is not.

## 26. Routing

HarnessRouter demonstrates why execution selection can depend on both harness and model configuration.

GLUE routing should consider capability, agent, interface, adapter, execution profile, model/runtime, location, trust, permissions, availability, latency, cost, resources and policy.

Routing decisions should be explainable: selected candidate, constraints, rejected candidates/reasons, trust/policy checks, and actual execution backend.

This remains deterministic-first and does not turn GLUE into DMR-X.

## 27. Retry and idempotency

GLUE should distinguish safe retries from unsafe retries.

Execution requests should support idempotency keys, deadlines, cancellation, retry policy, attempt number, parent execution ID and retry cause.

Side-effecting capabilities should declare idempotency behavior.

## 28. Cancellation

Cancellation must be a protocol operation, not merely dropping a network connection.

Represent requested, accepted, propagating, cancelled, cancellation-failed and completed states where relevant.

If an underlying protocol cannot cancel, GLUE must report that explicitly.

## 29. Health, readiness, trust and authorization

Do not collapse these concepts.

Health asks whether a target is reachable/working. Readiness asks whether it can accept this work. Trust asks whether GLUE should permit it. Capability confidence asks whether its claimed ability is credible. Authorization asks whether this caller may use it.

These dimensions can disagree and must remain separate.

## 30. Observability

Every execution should emit structured telemetry including request ID, execution ID, session ID, caller, target, adapter, protocol, capability, execution profile, requested model, actual model, timestamps, duration, queue time, retries, cancellation, errors, artifacts and policy decision.

These events should feed provenance/audit as well as operational telemetry.

## 31. One-voice architecture

Native events should flow through adapters into canonical GLUE events, then into the one-voice gateway, UI, API clients or ATHENA.

The user-facing layer must not be coupled to MCP, A2A, UHP, HTTP or a specific harness.

## 32. NOESIS boundary

Do not turn GLUE session storage into NOESIS.

GLUE session = execution continuity.
NOESIS = durable contextual memory.

A session can publish selected memory-worthy events to NOESIS under policy, but session state, provenance and durable memory remain separate concepts.

## 33. DMR-X boundary

GLUE is not a model router.

GLUE selects which capability/agent/harness should participate. DMR-X selects the model/runtime/backend that should execute it. HarnessRouter/UHP can drive the selected harness. The native agent performs the domain work.

## 34. ATHENA boundary

ATHENA remains the sovereign orchestration/governance layer. GLUE supplies external capabilities, identity, trust, availability, interfaces, results and provenance. ATHENA decides whether and how those capabilities participate in sovereign workflows.

GLUE must not silently become a second ATHENA.

## 35. Ghost Factory integration

Ghost Factory can consume normalized GLUE execution interfaces instead of building one-off integrations for every coding harness.

Conceptual path:

ATHENA -> GLUE -> Ghost Factory -> capability selection -> UHP/HarnessRouter -> coding harness -> isolated workspace -> artifacts/tests -> GLUE provenance -> ATHENA

## 36. Recommended repository additions

Contracts should eventually include execution, session, event, artifact, execution-profile, negotiation and error types.

Core should add explicit execution, negotiation, artifact, authorization, idempotency and observability responsibilities.

Adapters should add a UHP/HarnessRouter implementation with protocol client, mapping, events and error normalization.

Conformance should have separate suites for core, streaming, sessions, artifacts, federation and adapters.

Protocol documentation should be separated from general architecture documentation.

## 37. Well-known discovery

GLUE already uses well-known HTTP discovery endpoints for agent manifests, identity and capabilities. Preserve this approach and consider adding GLUE protocol and supported-protocol discovery documents.

Discovery must advertise interfaces and capabilities, not silently grant trust.

## 38. Security hardening highlighted by this research

Make the following explicit implementation requirements:

- gateway authentication;
- principal-scoped resources;
- signed/verified manifests where possible;
- SSRF protection;
- URL allow/deny policy;
- DNS rebinding protection;
- private-network access policy;
- credential isolation;
- secret redaction;
- artifact path traversal prevention;
- quotas;
- deadlines;
- request/stream size limits;
- cancellation propagation;
- append-only audit where required;
- adapter sandboxing;
- federation credential scoping;
- revocation;
- replay protection;
- idempotency.

## 39. What not to extract

Do not copy HarnessRouter's UI, exact gateway/runner topology, storage implementation or harness-specific assumptions into GLUE.

Do not make OpenAI Responses or UHP GLUE's internal canonical model.

Do not move model routing into GLUE.

Do not move native agent runtime logic into GLUE.

## 40. Target architecture

External MCP/A2A/UHP/HTTP/gRPC/CLI agents connect through adapters into GLUE.

GLUE provides identity, discovery, registry, capability graph, negotiation, trust, policy, routing, sessions, execution, events, artifacts, provenance, federation and an adapter SDK.

ATHENA consumes GLUE as an external capability fabric. DMR-X handles model/runtime routing. NOESIS handles durable memory. Ghost Factory handles software-production workflows.

## 41. Priority order

P0: canonical execution/task model, typed resources, structured errors, event model, schemas, capability discovery, conformance and versioning.

P1: UHP/HarnessRouter adapter, configured-harness representation, sessions, streaming, cancellation, artifacts and actual-model/runtime attribution.

P1 security: principal scoping, authentication, authorization, artifact containment, endpoint security, credential isolation, idempotency, cancellation and audit.

P2: federation identity, signed manifests, trust exchange, delegated capabilities, revocation and community/workspace federation.

P2 routing: capability negotiation, execution-profile selection, DMR-X integration and explainable deterministic routing.

P3 ecosystem: more adapters, registry synchronization, conformance reporting, SDKs and discovery tooling.

## Final architectural rule

GLUE should standardize the boundary, not standardize the agent.

Agents, harnesses, models, runtimes, communities and workspaces remain independent. GLUE standardizes how the ecosystem finds, identifies, describes, verifies, negotiates with, authorizes, invokes, streams, cancels, receives artifacts from, records provenance for, handles failures from and federates those independent systems.

HarnessRouter/UHP should become one important execution ecosystem that GLUE can connect to, while GLUE remains the broader agent federation fabric.