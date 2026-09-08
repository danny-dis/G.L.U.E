// glue-core/src/provenance.rs — append-only event log

use crate::types::*;
use crate::storage::MemoryStorage;
use chrono::Utc;
use uuid::Uuid;

pub struct ProvenanceService {
    storage: MemoryStorage,
}

impl ProvenanceService {
    pub fn new(storage: MemoryStorage) -> Self {
        Self { storage }
    }

    pub fn record(&self, event_type: EventType, actor: &str, subject: &str, operation: &str, capability: Option<&str>, adapter: Option<&str>, policy_decision: Option<&str>, request_id: Option<&str>) -> GlueEvent {
        let event = GlueEvent {
            id: Uuid::new_v4().to_string(),
            event_type,
            timestamp: Utc::now(),
            actor: actor.to_string(),
            subject: subject.to_string(),
            operation: operation.to_string(),
            capability: capability.map(|s| s.to_string()),
            adapter: adapter.map(|s| s.to_string()),
            policy_decision: policy_decision.map(|s| s.to_string()),
            request_id: request_id.map(|s| s.to_string()),
            parent_event: None,
            result_reference: None,
            integrity_reference: None,
            metadata: None,
        };
        self.storage.append_event(event.clone());
        event
    }

    pub fn get_trail(&self, subject: &str) -> Vec<GlueEvent> {
        self.storage.list_events(Some(subject), None)
    }

    pub fn get_recent(&self, limit: usize) -> Vec<GlueEvent> {
        self.storage.list_events(None, Some(limit))
    }
}
