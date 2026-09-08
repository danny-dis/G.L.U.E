// glue-core/src/lifecycle.rs — lifecycle state machine

use crate::types::LifecycleState;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LifecycleError {
    #[error("Invalid transition: {from} -> {to}")]
    InvalidTransition { from: String, to: String },
}

const TRANSITIONS: &[(&LifecycleState, &[LifecycleState])] = &[
    (&LifecycleState::Discovered, &[LifecycleState::Identified, LifecycleState::Revoked]),
    (&LifecycleState::Identified, &[LifecycleState::InterfaceVerified, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::InterfaceVerified, &[LifecycleState::CapabilitiesDescribed, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::CapabilitiesDescribed, &[LifecycleState::Sandboxed, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::Sandboxed, &[LifecycleState::Observed, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::Observed, &[LifecycleState::Trusted, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::Trusted, &[LifecycleState::CommunityMember, LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::CommunityMember, &[LifecycleState::Suspended, LifecycleState::Revoked]),
    (&LifecycleState::Suspended, &[LifecycleState::Observed, LifecycleState::Revoked]),
    (&LifecycleState::Revoked, &[]),
];

pub fn can_transition(from: &LifecycleState, to: &LifecycleState) -> bool {
    if from == to {
        return true;
    }
    TRANSITIONS
        .iter()
        .find(|(s, _)| *s == from)
        .map(|(_, allowed)| allowed.contains(to))
        .unwrap_or(false)
}

pub fn assert_transition(from: &LifecycleState, to: &LifecycleState) -> Result<(), LifecycleError> {
    if !can_transition(from, to) {
        return Err(LifecycleError::InvalidTransition {
            from: from.as_str().to_string(),
            to: to.as_str().to_string(),
        });
    }
    Ok(())
}

pub fn get_allowed_transitions(from: &LifecycleState) -> Vec<LifecycleState> {
    TRANSITIONS
        .iter()
        .find(|(s, _)| *s == from)
        .map(|(_, allowed)| allowed.to_vec())
        .unwrap_or_default()
}
