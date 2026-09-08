// glue-gateway/src/main.rs — HTTP + WebSocket gateway

use axum::{
    extract::{Path, Query, State},
    response::Json,
    routing::{get, post},
    Router,
};
use glue_core::*;
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    registry: Arc<Mutex<Registry>>,
    capabilities: Arc<Mutex<CapabilityGraph>>,
    policy: Arc<Mutex<PolicyEngine>>,
    provenance: Arc<Mutex<ProvenanceService>>,
    router: Arc<Mutex<Router>>,
    storage: Arc<Mutex<MemoryStorage>>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    let storage = MemoryStorage::new();
    let registry = Registry::new(storage.clone());
    let capabilities = CapabilityGraph::new(storage.clone());
    let policy = PolicyEngine::new();
    let provenance = ProvenanceService::new(storage.clone());
    let router = Router::new();

    let state = AppState {
        registry: Arc::new(Mutex::new(registry)),
        capabilities: Arc::new(Mutex::new(capabilities)),
        policy: Arc::new(Mutex::new(policy)),
        provenance: Arc::new(Mutex::new(provenance)),
        router: Arc::new(Mutex::new(router)),
        storage: Arc::new(Mutex::new(storage)),
    };

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health))
        .route("/agents", get(list_agents).post(register_agent))
        .route("/agents/:id", get(get_agent))
        .route("/agents/:id/lifecycle", post(update_lifecycle))
        .route("/discover", get(discover))
        .route("/invoke", post(invoke))
        .route("/audit/:subject", get(audit_trail))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tracing::info!("G.L.U.E. gateway listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn root() -> Json<serde_json::Value> {
    Json(json!({
        "name": "G.L.U.E.",
        "description": "Generalized Layer for Unified Ecosystems",
        "version": "0.1.0",
        "status": "running"
    }))
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({ "status": "healthy" }))
}

async fn list_agents(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Json<serde_json::Value> {
    let registry = state.registry.lock().await;
    let capability = params.get("capability").map(|s| s.as_str());
    let agents = registry.list(capability);
    Json(json!({ "agents": agents, "count": agents.len() }))
}

async fn get_agent(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let registry = state.registry.lock().await;
    match registry.get(&id) {
        Some(agent) => Ok(Json(json!({ "agent": agent }))),
        None => Err(axum::http::StatusCode::NOT_FOUND),
    }
}

async fn register_agent(
    State(state): State<AppState>,
    Json(manifest): Json<AgentManifest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let mut registry = state.registry.lock().await;
    let mut provenance = state.provenance.lock().await;

    match registry.register(manifest, None, "manual") {
        Ok(record) => {
            provenance.record(
                EventType::AgentRegistered,
                "gateway",
                &record.id,
                "register",
                None,
                None,
                None,
                None,
            );
            Ok(Json(json!({ "agent": record })))
        }
        Err(e) => Err((axum::http::StatusCode::BAD_REQUEST, e)),
    }
}

async fn update_lifecycle(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let mut registry = state.registry.lock().await;
    let state_str = body["state"].as_str().unwrap_or("");
    let reason = body["reason"].as_str();

    let new_state = match state_str {
        "IDENTIFIED" => LifecycleState::Identified,
        "INTERFACE_VERIFIED" => LifecycleState::InterfaceVerified,
        "CAPABILITIES_DESCRIBED" => LifecycleState::CapabilitiesDescribed,
        "SANDBOXED" => LifecycleState::Sandboxed,
        "OBSERVED" => LifecycleState::Observed,
        "TRUSTED" => LifecycleState::Trusted,
        "COMMUNITY_MEMBER" => LifecycleState::CommunityMember,
        "SUSPENDED" => LifecycleState::Suspended,
        "REVOKED" => LifecycleState::Revoked,
        _ => return Err((axum::http::StatusCode::BAD_REQUEST, format!("Unknown state: {}", state_str))),
    };

    match registry.update_lifecycle(&id, new_state, reason, Some("gateway")) {
        Ok(record) => Ok(Json(json!({ "agent": record }))),
        Err(e) => Err((axum::http::StatusCode::BAD_REQUEST, e)),
    }
}

async fn discover(
    State(state): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let capability = params
        .get("capability")
        .ok_or((axum::http::StatusCode::BAD_REQUEST, "capability required".to_string()))?;

    let capabilities = state.capabilities.lock().await;
    let candidates = capabilities.find_candidates(capability);
    Ok(Json(json!({ "capability": capability, "candidates": candidates })))
}

async fn invoke(
    State(state): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, String)> {
    let capability = body["capability"]
        .as_str()
        .ok_or((axum::http::StatusCode::BAD_REQUEST, "capability required".to_string()))?
        .to_string();
    let input = body["input"].clone();
    let caller = body["caller"]
        .as_str()
        .unwrap_or("glue:agent:user")
        .to_string();

    // Find candidates
    let capabilities = state.capabilities.lock().await;
    let candidates = capabilities.find_candidates(&capability);
    drop(capabilities);

    if candidates.is_empty() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            format!("No agents found with capability: {}", capability),
        ));
    }

    // Route
    let router = state.router.lock().await;
    let route = router.select(&candidates)
        .map_err(|e| (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e))?;
    drop(router);

    // Create invocation request
    let request = InvocationRequest {
        request_id: Uuid::new_v4().to_string(),
        caller: caller.clone(),
        target: route.agent_id.clone(),
        intent: None,
        capability: capability.clone(),
        input,
        context: None,
        constraints: None,
        policy: None,
        provenance: None,
        deadline: None,
        created_at: chrono::Utc::now(),
    };

    // Policy check
    let policy = state.policy.lock().await;
    let registry = state.registry.lock().await;
    let caller_agent = registry.get(&caller);
    let target_agent = registry.get(&route.agent_id);
    let decision = policy.evaluate(&request, caller_agent.as_ref(), target_agent.as_ref());
    drop(policy);
    drop(registry);

    if !decision.allowed {
        let mut provenance = state.provenance.lock().await;
        provenance.record(
            EventType::InvocationDenied,
            &caller,
            &route.agent_id,
            "invoke-denied",
            Some(&capability),
            None,
            Some(&decision.reason),
            Some(&request.request_id),
        );
        return Err((axum::http::StatusCode::FORBIDDEN, decision.reason));
    }

    // For Phase 1, return a placeholder response
    // In Phase 2, this would use the adapter to actually invoke the target
    let response = InvocationResponse {
        request_id: request.request_id.clone(),
        caller: request.caller,
        target: request.target,
        capability: request.capability,
        status: "success".to_string(),
        result: Some(InvocationResult {
            output: json!({ "message": "Phase 1 placeholder — adapter invocation not yet implemented" }),
            artifacts: None,
            confidence: None,
            citations: None,
            metadata: None,
        }),
        error: None,
        adapter: route.protocol.clone(),
        provenance: ResponseProvenance {
            request_id: request.request_id.clone(),
            caller: request.caller,
            target: request.target,
            adapter: route.protocol,
            policyDecision: decision.reason,
            capability: request.capability,
            artifacts: vec![],
            durationMs: 0,
            timestamp: chrono::Utc::now(),
        },
        durationMs: 0,
        created_at: chrono::Utc::now(),
    };

    let mut provenance = state.provenance.lock().await;
    provenance.record(
        EventType::InvocationCompleted,
        &caller,
        &route.agent_id,
        "invoke",
        Some(&capability),
        Some(&route.protocol),
        Some("allowed"),
        Some(&request.request_id),
    );

    Ok(Json(json!({ "response": response, "route": { "agent_id": route.agent_id, "protocol": route.protocol, "endpoint": route.endpoint, "reason": route.reason } })))
}

async fn audit_trail(
    State(state): State<AppState>,
    Path(subject): Path<String>,
) -> Json<serde_json::Value> {
    let provenance = state.provenance.lock().await;
    let events = provenance.get_trail(&subject);
    Json(json!({ "subject": subject, "events": events }))
}
