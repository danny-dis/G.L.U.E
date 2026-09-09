# Changelog

All notable changes to G.L.U.E. will be documented in this file.

## [0.0.1] - 2026-09-09

### Added
- TypeScript monorepo: `@glue/core`, `@glue/gateway`, `@glue/adapters`, `@glue/contracts`
- Rust workspace: `glue-core`, `glue-gateway`, `glue-bindings`
- HTTP API gateway (Express) with WebSocket one-voice interface
- Agent registry, discovery engine, capability graph, router
- Policy engine with trust-level enforcement
- Provenance service, session service, trust service
- Adapter SDK with HTTP and CLI adapters
- Docker Compose: postgres + redis + gateway
- CI workflow: TypeScript build/test, Rust build/test/clippy/fmt
- Merged remote docs: GLUE-SPEC, GLUE-ENGINEERING, GLUE-AGENT-FEDERATION-VISION

### Fixed
- Abstract property access in BaseAdapter constructor
- GlueUri type mismatches across discovery, registry, gateway
- TrustState enum usage in policy engine
- LifecycleState import type vs runtime value
- Possibly-undefined trustScore in router
- Private logger access in WebSocket handler
