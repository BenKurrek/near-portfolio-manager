//! src/utils.rs
use crate::*;
use near_sdk::{serde::Serialize, CurveType};

/// Converts a `Vec<u8>` to a 64-byte array if possible.
pub fn vec_to_64_byte_array(vec: Vec<u8>) -> Option<[u8; 64]> {
    if vec.len() != 64 {
        return None;
    }
    use std::convert::TryInto;
    Some(vec.try_into().expect("Vec with incorrect length"))
}

/// Convert a `Vec<T>` to `[T; N]` or panic.
pub fn vec_to_fixed<T, const N: usize>(v: Vec<T>) -> [T; N] {
    v.try_into().unwrap_or_else(|v: Vec<T>| {
        panic!("Expected a Vec of length {} but got {}", N, v.len());
    })
}

/// Build JSON for the MPC “sign” call from a `[u8; 32]` hash + path
pub fn create_sign_request_from_transaction(payload: Vec<u8>, path: &str) -> serde_json::Value {
    let sign_request = MPCSignPayload {
        payload: vec_to_fixed(payload),
        path: path.to_string(),
        key_version: 0,
    };
    serde_json::json!({ "request": sign_request })
}

/// Convert NEAR's `PublicKey` to a string representation
pub fn public_key_to_string(public_key: &PublicKey) -> String {
    let curve_type = public_key.curve_type();
    let encoded = bs58::encode(&public_key.as_bytes()[1..]).into_string();
    match curve_type {
        CurveType::ED25519 => format!("ed25519:{}", encoded),
        CurveType::SECP256K1 => format!("secp256k1:{}", encoded),
    }
}

/// Replicate ERC-191 hashing: JSON->prefix->keccak256
pub fn compute_erc191_hash<T>(value: &T) -> [u8; 32]
where
    T: Serialize,
{
    let json_str = serde_json::to_string(value).expect("Failed JSON-serialize");
    let prefix = format!("\x19Ethereum Signed Message:\n{}", json_str.len());
    let combined = [prefix.as_bytes(), json_str.as_bytes()].concat();
    near_sdk::env::keccak256_array(&combined)
}
