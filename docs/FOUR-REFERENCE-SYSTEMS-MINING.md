# Four Reference Systems — G.L.U.E. Integration Mining

Status: architecture input for G.L.U.E.
Date: 2026-10-05

## Boundary
G.L.U.E. is the agent federation fabric. It discovers, normalizes, verifies, connects and routes independent agents. It does not become the agent's runtime, long-term memory owner or sovereign governor.

## ATLAS·OS → federation lifecycle
Use deterministic state-driven onboarding for every discovered agent/community.

State dimensions should include identity status, protocol availability, capability completeness, trust stage, policy eligibility, health, observed behavior, version and community membership.

Admission becomes:
discovered -> identified -> interface verified -> capabilities described -> sandboxed -> observed -> trusted -> community member

Route capability requests using this state, not agent-name preference.

Borrow declarative workflow descriptions for multi-agent handoffs, but keep the workflow owner outside the adapter and avoid hard-coding orchestration inside agents.

## Pacifio Atlas → shared federation provenance
Every routed interaction should carry correlation ID, agent identity, capability, request/response references, authorization, timing and verification outcome.

Represent federation checkpoints for long-lived multi-agent sessions and community workflows.

G.L.U.E. should support a shared-memory adapter contract into NOESIS or another permitted memory service, but must not become the memory service itself.

A handoff packet should contain task intent, current state, completed work, failures, evidence, permissions and next eligible capabilities.

## Inferstep ATLAS → capability-aware candidate routing
Do not import Inferstep's model server. Import the idea that several qualified agents/capabilities can produce candidate outcomes and that results can be verified before selection.

For high-value capability requests, G.L.U.E. may form a candidate set across trusted agents, execute them under scoped permissions and compare externally verifiable results.

DMR-X remains responsible for model/inference strategy inside an agent or when explicitly delegated to it.

Never let reputation alone select truth. Candidate selection needs capability fit, trust, evidence and verification.

## iamvikshan Atlas → federation discipline
Before dispatching, apply an intent/capability gate: what is requested, which agent capability is needed, allowed side effects, privacy scope and verification requirements.

Use specialist handoffs where a capability chain exists: scout -> worker -> verifier, but keep these as federation-level contracts rather than fixed agent personalities.

Adapters should expose lifecycle hooks for admission, pre-dispatch, post-dispatch, failure, revocation and removal.

## New data model
AgentManifest should include identity, owner, capabilities, interfaces, protocols, runtime requirements, permissions, trust, provenance, health, performance and lifecycle.

CapabilityRecord should include semantic capability, input/output contract, trust requirement, verifier options, latency/cost profile and supported protocols.

InteractionRecord should link caller, callee, capability, authorization, artifacts, verification and outcome.

## Security
Identity precedes trust; trust precedes privilege. Unknown agents receive no private memory, credentials or unrestricted execution.

Capabilities are the routing surface. Agent names are descriptive identifiers, not authority grants.

## Tests
Admission state-machine tests, capability discovery compatibility, malicious-adapter isolation, provenance completeness, handoff correctness, candidate verification and revocation behavior.

## Non-goals
Do not copy ATLAS·OS UI, Pacifio database, Inferstep local server or iamvikshan editor hierarchy.

## Result
G.L.U.E. becomes a stronger federated operating layer where agents can join continuously, prove what they can do, exchange work with provenance and participate in verified capability routes.