// glue-bindings/src/lib.rs — napi-rs bindings (placeholder for Phase 1)

use napi_derive::napi;

#[napi]
pub fn version() -> String {
    "0.1.0".to_string()
}

#[napi]
pub fn status() -> String {
    "G.L.U.E. bindings — Phase 1 placeholder".to_string()
}
