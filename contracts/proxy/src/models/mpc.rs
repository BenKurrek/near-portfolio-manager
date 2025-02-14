//! models/mpc.rs
//!
//! Types for interactions with the MPC contract (signing requests, partial signatures, etc.).

use crate::*;

/// A signature returned by the MPC.
#[near(serializers = [json])]
pub struct SignResult {
    pub big_r: AffinePoint,
    pub s: Scalar,
    pub recovery_id: u8,
}

#[near(serializers = [json])]
pub struct AffinePoint {
    pub affine_point: String,
}

#[near(serializers = [json])]
pub struct Scalar {
    pub scalar: String,
}

/// A sign request for the MPC, containing the 32-byte payload and a path string.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct MPCSignPayload {
    pub payload: [u8; 32],
    pub path: String,
    pub key_version: u32,
}
