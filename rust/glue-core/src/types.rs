// glue-core/src/types.rs — canonical data types

use chrono::{DateTime, Utc};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::fmt;

pub type GlueUri = String;
pub type CapabilityId = String;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ProtocolName {
    Mcp,
    A2a,
    Acp,
    Http,
    WebSocket,
    Grpc,
    Cli,
    Buzz,
    Local,
}

impl fmt::Display for ProtocolName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProtocolName::Mcp => write!(f, "mcp"),
            ProtocolName::A2a => write!(f, "a2a"),
            ProtocolName::Acp => write!(f, "acp"),
            ProtocolName::Http => write!(f, "http"),
            ProtocolName::WebSocket => write!(f, "websocket"),
            ProtocolName::Grpc => write!(f, "grpc"),
            ProtocolName::Cli => write!(f, "cli"),
            ProtocolName::Buzz => write!(f, "buzz"),
            ProtocolName::Local => write!(f, "local"),
        }
    }
}

// Lifecycle states per GLUE-SPEC §6
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LifecycleState {
    Discovered,
    Identified,
    InterfaceVerified,
    CapabilitiesDescribed,
    Sandboxed,
    Observed,
    Trusted,
    CommunityMember,
    Suspended,
    Revoked,
}

impl LifecycleState {
    pub fn as_str(&self) -> &'static str {
        match self {
            LifecycleState::Discovered => "DISCOVERED",
            LifecycleState::Identified => "IDENTIFIED",
            LifecycleState::InterfaceVerified => "INTERFACE_VERIFIED",
            LifecycleState::CapabilitiesDescribed => "CAPABILITIES_DESCRIBED",
            LifecycleState::Sandboxed => "SANDBOXED",
            LifecycleState::Observed => "OBSERVED",
            LifecycleState::Trusted => "TRUSTED",
            LifecycleState::CommunityMember => "COMMUNITY_MEMBER",
            LifecycleState::Suspended => "SUSPENDED",
            LifecycleState::Revoked => "REVOKED",
        }
    }

    pub fn progression() -> &'static [LifecycleState] {
        &[
            LifecycleState::Discovered,
            LifecycleState::Identified,
            LifecycleState::InterfaceVerified,
            LifecycleState::CapabilitiesDescribed,
            LifecycleState::Sandboxed,
            LifecycleState::Observed,
            LifecycleState::Trusted,
            LifecycleState::CommunityMember,
        ]
    }
}

// Trust states
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TrustState {
    Unknown,
    Untrusted,
    Provisional,
    Verified,
    Trusted,
    Compromised,
}

impl TrustState {
    pub fn as_str(&self) -> &'static str {
        match self {
            TrustState::Unknown => "UNKNOWN",
            TrustState::Untrusted => "UNTRUSTED",
            TrustState::Provisional => "PROVISIONAL",
            TrustState::Verified => "VERIFIED",
            TrustState::Trusted => "TRUSTED",
            TrustState::Compromised => "COMPROMISED",
        }
    }

    pub fn hierarchy_rank(&self) -> u8 {
        match self {
            TrustState::Unknown => 0,
            TrustState::Untrusted => 1,
            TrustState::Provisional => 2,
            TrustState::Verified => 3,
            TrustState::Trusted => 4,
            TrustState::Compromised => 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentIdentity {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_keys: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub credentials: Option<Vec<String>>,
}

impl Default for AgentIdentity {
    fn default() -> Self {
        Self {
            public_keys: None,
            credentials: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentOwner {
    #[serde(rename = "type")]
    pub owner_type: String,
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentInterface {
    pub protocol: String,
    pub endpoint: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<IndexMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRequirement {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secrets: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentPermissions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requested: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub granted: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrustAssessment {
    pub state: TrustState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub evidence: Option<Vec<String>>,
    pub identity_trust: f64,
    pub source_trust: f64,
    pub capability_confidence: f64,
    pub behavioral_reputation: f64,
    pub updated_at: DateTime<Utc>,
}

impl Default for TrustAssessment {
    fn default() -> Self {
        Self {
            state: TrustState::Unknown,
            evidence: None,
            identity_trust: 0.0,
            source_trust: 0.0,
            capability_confidence: 0.0,
            behavioral_reputation: 0.0,
            updated_at: Utc::now(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceRecord {
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_uri: Option<String>,
    pub discovered_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registered_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LifecycleEntry {
    pub state: LifecycleState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    pub timestamp: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentManifest {
    pub api_version: String,
    pub kind: String,
    pub metadata: AgentMetadata,
    pub spec: AgentSpec,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentSpec {
    pub interfaces: Vec<AgentInterface>,
    pub capabilities: Vec<CapabilityId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inputs: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outputs: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requirements: Option<AgentRequirement>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<AgentPermissions>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRecord {
    pub id: GlueUri,
    #[serde(flatten)]
    pub manifest: AgentManifest,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub owner: Option<AgentOwner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity: Option<AgentIdentity>,
    pub trust: TrustAssessment,
    pub provenance: ProvenanceRecord,
    pub lifecycle: Vec<LifecycleEntry>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub health_status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_seen_at: Option<DateTime<Utc>>,
}

impl AgentRecord {
    pub fn current_lifecycle_state(&self) -> LifecycleState {
        self.lifecycle
            .last()
            .map(|e| e.state.clone())
            .unwrap_or(LifecycleState::Discovered)
    }
}

// Invocation types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationConstraints {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_limit: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trust_level: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeout_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retries: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationRequest {
    pub request_id: String,
    pub caller: String,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intent: Option<String>,
    pub capability: CapabilityId,
    pub input: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub constraints: Option<InvocationConstraints>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provenance: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deadline: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationResult {
    pub output: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub artifacts: Option<Vec<ArtifactReference>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confidence: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub citations: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<IndexMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<IndexMap<String, serde_json::Value>>,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationResponse {
    pub request_id: String,
    pub caller: String,
    pub target: String,
    pub capability: CapabilityId,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<InvocationResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<InvocationError>,
    pub adapter: String,
    pub provenance: ResponseProvenance,
    pub duration_ms: u64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactReference {
    pub id: String,
    #[serde(rename = "type")]
    pub artifact_type: String,
    pub uri: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<IndexMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponseProvenance {
    pub request_id: String,
    pub caller: String,
    pub target: String,
    pub adapter: String,
    pub policy_decision: String,
    pub capability: String,
    pub artifacts: Vec<ArtifactReference>,
    pub duration_ms: u64,
    pub timestamp: DateTime<Utc>,
}

// Event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventType {
    AgentRegistered,
    AgentLifecycleChanged,
    AgentTrustChanged,
    AgentHealthChanged,
    AgentRevoked,
    InvocationStarted,
    InvocationCompleted,
    InvocationFailed,
    InvocationDenied,
    CapabilityRegistered,
    CommunityJoined,
    PolicyViolation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlueEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: EventType,
    pub timestamp: DateTime<Utc>,
    pub actor: String,
    pub subject: String,
    pub operation: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capability: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub adapter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy_decision: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_event: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrity_reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<IndexMap<String, serde_json::Value>>,
}
