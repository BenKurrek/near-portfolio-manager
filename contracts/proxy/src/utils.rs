use crate::*;
use sha2::Digest;

/// Converts a `Vec<u8>` to a 64-byte array if possible.
pub fn vec_to_64_byte_array(vec: Vec<u8>) -> Option<[u8; 64]> {
    // Check if the string is exactly 64 bytes
    if vec.len() != 64 {
        return None;
    }

    // Explicitly import TryInto trait
    use std::convert::TryInto;

    let array: [u8; 64] = vec
        .try_into() // Try to convert the Vec<u8> into a fixed-size array
        .expect("Vec with incorrect length"); // This expect will never panic due to the above length check

    Some(array)
}

/// Constructs the JSON payload used when requesting a signature from the MPC.
pub fn create_sign_request_from_transaction(payload: Vec<u8>, path: &str) -> serde_json::Value {
    // Create the sign request with the hashed payload
    let sign_request = MPCSignPayload {
        payload: vec_to_fixed(payload),
        path: path.to_string(),
        key_version: 0, // Modify this as needed
    };

    // Wrap the sign request into the expected structure
    serde_json::json!({ "request": sign_request })
}

/// Converts a Vec<T> into an array of length N, panicking if sizes do not match.
pub fn vec_to_fixed<T, const N: usize>(v: Vec<T>) -> [T; N] {
    v.try_into()
        .unwrap_or_else(|v: Vec<T>| panic!("Expected a Vec of length {} but it was {}", N, v.len()))
}
