// glue-core/src/storage.rs — in-memory storage backend

use crate::types::*;
use dashmap::DashMap;
use std::sync::Arc;
use parking_lot::RwLock;

#[derive(Clone)]
pub struct MemoryStorage {
    agents: Arc<DashMap<String, AgentRecord>>,
    events: Arc<RwLock<Vec<GlueEvent>>>,
    capability_index: Arc<DashMap<String, Vec<String>>>,
}

impl MemoryStorage {
    pub fn new() -> Self {
        Self {
            agents: Arc::new(DashMap::new()),
            events: Arc::new(RwLock::new(Vec::new())),
            capability_index: Arc::new(DashMap::new()),
        }
    }

    pub fn save_agent(&self, agent: &AgentRecord) {
        self.agents.insert(agent.id.clone(), agent.clone());
    }

    pub fn get_agent(&self, id: &str) -> Option<AgentRecord> {
        self.agents.get(id).map(|r| r.clone())
    }

    pub fn list_agents(&self) -> Vec<AgentRecord> {
        self.agents.iter().map(|r| r.clone()).collect()
    }

    pub fn delete_agent(&self, id: &str) {
        self.agents.remove(id);
    }

    pub fn append_event(&self, event: GlueEvent) {
        self.events.write().push(event);
    }

    pub fn list_events(&self, subject: Option<&str>, limit: Option<usize>) -> Vec<GlueEvent> {
        let events = self.events.read();
        let mut result: Vec<GlueEvent> = events
            .iter()
            .filter(|e| subject.map_or(true, |s| e.subject == s))
            .cloned()
            .collect();
        
        if let Some(lim) = limit {
            let start = result.len().saturating_sub(lim);
            result = result[start..].to_vec();
        }
        result
    }

    pub fn index_capability(&self, capability: &str, agent_id: &str) {
        self.capability_index
            .entry(capability.to_string())
            .or_default()
            .push(agent_id.to_string());
    }

    pub fn find_by_capability(&self, capability: &str) -> Vec<String> {
        self.capability_index
            .get(capability)
            .map(|v| v.clone())
            .unwrap_or_default()
    }
}
