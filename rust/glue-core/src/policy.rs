// glue-core/src/policy.rs — policy engine

use crate::types::*;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct PolicyDecision {
    pub allowed: bool,
    pub reason: String,
    pub policy_id: Option<String>,
}

type PolicyFn = Box<dyn Fn(&InvocationRequest, Option<&AgentRecord>, Option<&AgentRecord>) -> PolicyDecision + Send + Sync>;

pub struct PolicyEngine {
    rules: Vec<(String, String, PolicyFn)>,
}

impl PolicyEngine {
    pub fn new() -> Self {
        let mut engine = Self { rules: Vec::new() };
        engine.register_default_rules();
        engine
    }

    pub fn register(&mut self, id: &str, description: &str, f: PolicyFn) {
        self.rules.push((id.to_string(), description.to_string(), f));
    }

    pub fn evaluate(&self, request: &InvocationRequest, caller: Option<&AgentRecord>, target: Option<&AgentRecord>) -> PolicyDecision {
        for (id, _, rule) in &self.rules {
            let decision = rule(request, caller, target);
            if !decision.allowed {
                return PolicyDecision {
                    allowed: false,
                    reason: decision.reason,
                    policy_id: Some(id.clone()),
                };
            }
        }
        PolicyDecision {
            allowed: true,
            reason: "All policy checks passed".to_string(),
            policy_id: None,
        }
    }

    fn register_default_rules(&mut self) {
        // Rule: revoked callers cannot invoke
        self.register("no-revoked-caller", "Revoked agents cannot invoke", Box::new(|req, caller, _target| {
            if let Some(c) = caller {
                if c.current_lifecycle_state() == LifecycleState::Revoked {
                    return PolicyDecision {
                        allowed: false,
                        reason: "Caller has been revoked".to_string(),
                        policy_id: Some("no-revoked-caller".to_string()),
                    };
                }
            }
            PolicyDecision { allowed: true, reason: String::new(), policy_id: None }
        }));

        // Rule: revoked targets cannot be invoked
        self.register("no-revoked-target", "Revoked agents cannot be invoked", Box::new(|req, _caller, target| {
            if let Some(t) = target {
                if t.current_lifecycle_state() == LifecycleState::Revoked {
                    return PolicyDecision {
                        allowed: false,
                        reason: "Target has been revoked".to_string(),
                        policy_id: Some("no-revoked-target".to_string()),
                    };
                }
            }
            PolicyDecision { allowed: true, reason: String::new(), policy_id: None }
        }));

        // Rule: trust level requirement
        self.register("trust-level", "Minimum trust level enforcement", Box::new(|req, _caller, target| {
            if let Some(required_str) = &req.constraints.as_ref().and_then(|c| c.trust_level.clone()) {
                if let Some(t) = target {
                    let required_rank = match required_str.as_str() {
                        "untrusted" => 1,
                        "verified" => 3,
                        "trusted" => 4,
                        _ => 0,
                    };
                    let actual_rank = t.trust.state.hierarchy_rank();
                    if actual_rank < required_rank {
                        return PolicyDecision {
                            allowed: false,
                            reason: format!("Target trust ({:?}) below required ({})", t.trust.state, required_str),
                            policy_id: Some("trust-level".to_string()),
                        };
                    }
                }
            }
            PolicyDecision { allowed: true, reason: String::new(), policy_id: None }
        }));

        // Rule: target must declare the requested capability
        self.register("capability-must-exist", "Target must declare the requested capability", Box::new(|req, _caller, target| {
            if let Some(t) = target {
                if !t.manifest.spec.capabilities.contains(&req.capability) {
                    return PolicyDecision {
                        allowed: false,
                        reason: format!("Target does not declare capability: {}", req.capability),
                        policy_id: Some("capability-must-exist".to_string()),
                    };
                }
            }
            PolicyDecision { allowed: true, reason: String::new(), policy_id: None }
        }));
    }
}
