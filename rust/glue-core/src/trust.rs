// glue-core/src/trust.rs — multi-dimensional trust evaluation

use crate::types::*;
use crate::storage::MemoryStorage;

pub struct TrustEvaluation {
    pub agent_id: String,
    pub previous_state: TrustState,
    pub new_state: TrustState,
    pub reasons: Vec<String>,
    pub recommendation: TrustRecommendation,
}

#[derive(Debug, Clone)]
pub enum TrustRecommendation {
    Advance,
    Hold,
    Retreat,
    Revoke,
}

pub struct TrustService {
    storage: MemoryStorage,
}

impl TrustService {
    pub fn new(storage: MemoryStorage) -> Self {
        Self { storage }
    }

    pub fn evaluate(&self, agent: &AgentRecord) -> TrustEvaluation {
        let trust = &agent.trust;
        let mut reasons = Vec::new();
        let mut recommendation = TrustRecommendation::Hold;

        if trust.identity_trust > 0.8 && trust.capability_confidence > 0.7 && trust.behavioral_reputation > 0.8 {
            recommendation = TrustRecommendation::Advance;
            reasons.push("High identity trust, capability confidence, and reputation".to_string());
        } else if trust.behavioral_reputation < 0.3 {
            recommendation = TrustRecommendation::Revoke;
            reasons.push("Low behavioral reputation".to_string());
        } else if trust.source_trust < 0.3 {
            recommendation = TrustRecommendation::Retreat;
            reasons.push("Untrusted source".to_string());
        }

        if agent.health_status == "unreachable" {
            recommendation = TrustRecommendation::Retreat;
            reasons.push("Agent unreachable".to_string());
        }

        let new_state = self.determine_state(&recommendation, &trust.state);

        TrustEvaluation {
            agent_id: agent.id.clone(),
            previous_state: trust.state.clone(),
            new_state,
            reasons,
            recommendation,
        }
    }

    fn determine_state(&self, recommendation: &TrustRecommendation, current: &TrustState) -> TrustState {
        match recommendation {
            TrustRecommendation::Revoke => TrustState::Compromised,
            TrustRecommendation::Advance => {
                match current {
                    TrustState::Unknown => TrustState::Provisional,
                    TrustState::Untrusted => TrustState::Provisional,
                    TrustState::Provisional => TrustState::Verified,
                    TrustState::Verified => TrustState::Trusted,
                    TrustState::Trusted => TrustState::Trusted,
                    TrustState::Compromised => TrustState::Compromised,
                }
            }
            TrustRecommendation::Retreat => {
                match current {
                    TrustState::Unknown => TrustState::Unknown,
                    TrustState::Untrusted => TrustState::Untrusted,
                    TrustState::Provisional => TrustState::Untrusted,
                    TrustState::Verified => TrustState::Provisional,
                    TrustState::Trusted => TrustState::Verified,
                    TrustState::Compromised => TrustState::Compromised,
                }
            }
            TrustRecommendation::Hold => current.clone(),
        }
    }

    pub fn update_trust(&self, agent_id: &str, assessment: TrustAssessment) -> Result<AgentRecord, String> {
        let mut agent = self.storage.get_agent(agent_id).ok_or_else(|| format!("Agent not found: {}", agent_id))?;
        agent.trust = assessment;
        agent.updated_at = chrono::Utc::now();
        self.storage.save_agent(&agent);
        Ok(agent)
    }
}
