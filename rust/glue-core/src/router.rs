// glue-core/src/router.rs — capability-based agent selection

use crate::capabilities::CapabilityMatch;

pub struct RouteResult {
    pub agent_id: String,
    pub protocol: String,
    pub endpoint: String,
    pub reason: String,
}

pub struct Router {
    min_health: Option<String>,
    min_trust_score: Option<f64>,
}

impl Router {
    pub fn new() -> Self {
        Self {
            min_health: None,
            min_trust_score: None,
        }
    }

    pub fn with_min_health(mut self, health: &str) -> Self {
        self.min_health = Some(health.to_string());
        self
    }

    pub fn with_min_trust(mut self, score: f64) -> Self {
        self.min_trust_score = Some(score);
        self
    }

    pub fn select(&self, candidates: &[CapabilityMatch]) -> Result<RouteResult, String> {
        if candidates.is_empty() {
            return Err("No candidates available for routing".to_string());
        }

        // Filter by health
        let mut filtered: Vec<&CapabilityMatch> = candidates.iter().filter(|c| {
            match self.min_health.as_deref() {
                Some("healthy") => c.health == "healthy",
                Some("degraded") => c.health == "healthy" || c.health == "degraded",
                _ => c.health != "unreachable",
            }
        }).collect();

        if filtered.is_empty() {
            filtered = candidates.iter().collect();
        }

        // Filter by trust score
        if let Some(min_trust) = self.min_trust_score {
            let trust_filtered: Vec<&CapabilityMatch> = filtered.iter()
                .filter(|c| c.trust_score >= min_trust)
                .cloned()
                .collect();
            if !trust_filtered.is_empty() {
                filtered = trust_filtered;
            }
        }

        // Score: prefer higher trust, then healthier agents
        let mut scored: Vec<(f64, &CapabilityMatch)> = filtered.iter().map(|c| {
            let health_score = if c.health == "healthy" { 0.4 } else { 0.0 };
            let score = c.trust_score * 0.6 + health_score;
            (score, *c)
        }).collect();

        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

        let selected = scored[0].1;
        Ok(RouteResult {
            agent_id: selected.agent_id.clone(),
            protocol: selected.protocol.clone(),
            endpoint: selected.endpoint.clone(),
            reason: format!(
                "Selected by capability match (trust: {:.2}, health: {})",
                selected.trust_score, selected.health
            ),
        })
    }
}
