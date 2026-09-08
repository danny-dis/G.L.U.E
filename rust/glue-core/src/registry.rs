// glue-core/src/registry.rs — canonical agent storage and retrieval

use crate::types::*;
use crate::storage::MemoryStorage;
use crate::lifecycle::{assert_transition, LifecycleError};
use chrono::Utc;
use uuid::Uuid;

pub struct Registry {
    storage: MemoryStorage,
}

impl Registry {
    pub fn new(storage: MemoryStorage) -> Self {
        Self { storage }
    }

    pub fn register(&self, manifest: AgentManifest, owner: Option<AgentOwner>, provenance_source: &str) -> Result<AgentRecord, String> {
        let now = Utc::now();
        let id = format!("glue:agent:{}", manifest.metadata.id);

        if self.storage.get_agent(&id).is_some() {
            return Err(format!("Agent already registered: {}", id));
        }

        let trust = TrustAssessment {
            state: TrustState::Unknown,
            evidence: Some(vec![]),
            identity_trust: 0.0,
            source_trust: 0.0,
            capability_confidence: 0.0,
            behavioral_reputation: 0.0,
            updated_at: now,
        };

        let provenance = ProvenanceRecord {
            source: provenance_source.to_string(),
            source_uri: None,
            discovered_at: now,
            registered_at: Some(now),
        };

        let lifecycle = vec![LifecycleEntry {
            state: LifecycleState::Discovered,
            reason: Some("Agent registered".to_string()),
            timestamp: now,
            actor: None,
        }];

        let record = AgentRecord {
            id,
            manifest,
            owner,
            identity: Some(AgentIdentity::default()),
            trust,
            provenance,
            lifecycle,
            created_at: now,
            updated_at: now,
            health_status: "unknown".to_string(),
            last_seen_at: None,
        };

        // Index capabilities
        for cap in &record.manifest.spec.capabilities {
            self.storage.index_capability(cap, &record.id);
        }

        self.storage.save_agent(&record);
        Ok(record)
    }

    pub fn get(&self, id: &str) -> Option<AgentRecord> {
        self.storage.get_agent(id)
    }

    pub fn list(&self, filter: Option<&str>) -> Vec<AgentRecord> {
        let agents = self.storage.list_agents();
        match filter {
            Some(cap) => agents.into_iter()
                .filter(|a| a.manifest.spec.capabilities.contains(&cap.to_string()))
                .collect(),
            None => agents,
        }
    }

    pub fn update_lifecycle(&self, id: &str, new_state: LifecycleState, reason: Option<&str>, actor: Option<&str>) -> Result<AgentRecord, String> {
        let mut agent = self.storage.get_agent(id).ok_or_else(|| format!("Agent not found: {}", id))?;
        
        let current = agent.current_lifecycle_state();
        assert_transition(&current, &new_state).map_err(|e| e.to_string())?;

        agent.lifecycle.push(LifecycleEntry {
            state: new_state,
            reason: reason.map(|s| s.to_string()),
            timestamp: Utc::now(),
            actor: actor.map(|s| s.to_string()),
        });
        agent.updated_at = Utc::now();
        self.storage.save_agent(&agent);
        Ok(agent)
    }

    pub fn update_trust(&self, id: &str, trust: TrustAssessment) -> Result<AgentRecord, String> {
        let mut agent = self.storage.get_agent(id).ok_or_else(|| format!("Agent not found: {}", id))?;
        agent.trust = trust;
        agent.updated_at = Utc::now();
        self.storage.save_agent(&agent);
        Ok(agent)
    }

    pub fn update_health(&self, id: &str, status: &str) -> Result<AgentRecord, String> {
        let mut agent = self.storage.get_agent(id).ok_or_else(|| format!("Agent not found: {}", id))?;
        agent.health_status = status.to_string();
        agent.last_seen_at = Some(Utc::now());
        agent.updated_at = Utc::now();
        self.storage.save_agent(&agent);
        Ok(agent)
    }

    pub fn revoke(&self, id: &str, reason: &str) -> Result<AgentRecord, String> {
        self.update_lifecycle(id, LifecycleState::Revoked, Some(reason), None)
    }
}
