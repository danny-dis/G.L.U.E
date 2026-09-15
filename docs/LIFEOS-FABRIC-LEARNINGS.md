# LifeOS + Fabric Learnings for GLUE

## One capability ecosystem, many front doors

Different agents, UIs, terminals, voice clients and services should be able to reach shared capabilities without duplicating identity or capability definitions.

## Capability discovery

GLUE should discover an agent's protocol, capabilities, inputs, outputs, permissions and health, then expose a normalized adapter. Fabric-style reusable procedures can be represented as capabilities, but GLUE should remain protocol/vendor neutral.

## Health and lifecycle

Registered agents/capabilities should expose `LIVE`, `BROKEN`, `DECLINED` and `STALE` states plus last verification and evidence.

## Safe registration

Registration should be inspect → describe → permission → register → verify. The system must not assume an agent's claimed capabilities are real until a verification path succeeds.

## Boundary

GLUE is the connector/runtime layer, not the memory authority, personal self-model or governance kernel. NOESIS, DANNY and ATHENA retain those responsibilities respectively.
