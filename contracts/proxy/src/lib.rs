//! lib.rs
//!
//! This file defines the main entry point (the contract struct) for the Vault contract.

use near_sdk::store::LookupMap;
use near_sdk::{
    env, json_types::Base64VecU8, log, near, require, AccountId, Gas, NearToken, PanicOnDefault,
    Promise, PromiseResult, PublicKey,
};

/// Internal logic modules and helper functions
pub mod utils;

/// Submodules that define different logical “actions” or “flows”
pub mod modules;

/// Data models used by the Vault contract
pub mod models;

/// View functions that return the vault data
pub mod views;

use models::*;
use utils::*;

#[near(contract_state, serializers = [borsh])]
#[derive(PanicOnDefault)]
pub struct IntentsProxyMpcContract {
    // Maps a given agent public key to its key data (and access)
    pub agent_keys: LookupMap<PublicKey, KeyInfo>,
    pub portfolio_info: LookupMap<PortfolioId, PortfolioInfo>,

    /// The mpc contract that each vault uses to sign transactions
    pub mpc_contract_id: AccountId,
}

#[near]
impl IntentsProxyMpcContract {
    #[init]
    pub fn new(mpc_contract_id: AccountId) -> Self {
        Self {
            mpc_contract_id,
            portfolio_info: LookupMap::new(StorageKey::PortfolioInfo),
            agent_keys: LookupMap::new(StorageKey::AgentKeys),
        }
    }
}
