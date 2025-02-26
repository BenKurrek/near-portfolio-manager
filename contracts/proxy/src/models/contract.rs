//! models/contract.rs
//!
//! Constants and storage keys used by the contract.

use near_sdk::BorshStorageKey;

use crate::*;

#[near]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    OwnerMap,
    AgentKeys,
    PortfolioInfo,
}

// Gas for MPC signing
pub const FETCH_MPC_SIGNATURE_GAS: Gas = Gas::from_tgas(50);
pub const RESOLVE_MPC_SIGNATURE_GAS: Gas = Gas::from_tgas(20);

/// Gas used to fetch Beacon data.
pub const FETCH_BEACON_GAS: Gas = Gas::from_tgas(25);
pub const RESOLVE_BEACON_FETCH_GAS: Gas = Gas::from_tgas(200);

// Gas used to upgrade the Vault contract
pub const FETCH_WASM_GAS: Gas = Gas::from_tgas(85);
pub const RESOLVE_WASM_FETCH_GAS: Gas = Gas::from_tgas(175);
pub const MIGRATE_GAS: Gas = Gas::from_tgas(50);

/// No args payload
pub const NO_ARGS: Vec<u8> = vec![];
