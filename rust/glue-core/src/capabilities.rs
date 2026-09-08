// glue-core/src/capabilities.rs — capability graph

use crate::types::*;
use crate::storage::MemoryStorage;

pub struct CapabilityGraph {
    storage: MemoryStorage,
}

#[derive(Debug, Clone)]
pub struct CapabilityMatch {
    pub capability: String,
    pub agent_id: String,
    pub agent_name: String,
    pub protocol: String,
    pub endpoint: String,
    pub trust_score: f64,
    pub health: String,
}

impl CapabilityGraph {
    pub fn new(storage: MemoryStorage) -> Self {
        Self { storage }
    }

    pub fn find_candidates(&self, capability: &str) -> Vec<CapabilityMatch> {
        let agent_ids = self.storage.find_by_capability(capability);
        let mut matches = Vec::new();

        for id in agent_ids {
            if let Some(agent) = self.storage.get_agent(&id) {
                let last_lifecycle = agent.current_lifecycle_state();
                if last_lifecycle == LifecycleState::Revoked || last_lifecycle == LifecycleState::Suspended {
                    continue;
                }

                let primary_interface = agent.manifest.spec.interfaces.first();
                if let Some(iface) = primary_interface {
                    matches.push(CapabilityMatch {
                        capability: capability.to_string(),
                        agent_id: agent.id.clone(),
                        agent_name: agent.manifest.metadata.name.clone(),
                        protocol: iface.protocol.clone(),
                        endpoint: iface.endpoint.clone(),
                        trust_score: agent.trust.behavioral_reputation,
                        health: agent.health_status.clone(),
                    });
                }
            }
        }

        matches
    }
}
