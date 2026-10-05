# G.L.U.E. — Mining Open Research, OR-Agent and HEC Open Research

G.L.U.E. should use the three systems to make federation empirically testable.

## Adopt

Every interoperability conclusion should point to protocol/version, agent identity, capability declaration, test scenario, observed result, evaluator and environment.

Benchmark alternative federation strategies:
~~~text
MCP direct
A2A direct
protocol bridge
multi-hop federation
fallback chain
capability routing
community-local relay
~~~

Maintain separate strategy pools where protocol or topology diversity matters.

Conformance loop:
~~~text
discover
→ identify
→ interface verify
→ capability test
→ sandbox
→ workload benchmark
→ failure analysis
→ remediation
→ re-test
→ trust update
~~~

Protocol failures and successful traces must be replayable so adapter regressions can be diagnosed.

## Trust boundary

Discovery does not grant trust. A better experiment score cannot override identity, policy, privilege, admission or sandbox requirements.

## Implementation targets

Add a federation benchmark suite covering task success, protocol compatibility, capability discovery, latency, reliability, recovery, provenance and trust/admission outcomes.

Store conformance evidence independently from the agent being evaluated.