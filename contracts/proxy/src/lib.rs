//! lib.rs
//!
//! This file defines the main entry point (the contract struct) for the Vault contract.

use near_sdk::store::{LookupMap, LookupSet};
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
    pub user_info: LookupMap<AccountId, UserInfo>,
    pub agent_info: LookupMap<AccountId, AgentInfo>,

    /// The MPC contract that each vault uses to sign transactions
    pub mpc_contract_id: AccountId,
}

#[near]
impl IntentsProxyMpcContract {
    /// Initialize the contract with a known MPC contract ID
    #[init]
    pub fn new(mpc_contract_id: AccountId) -> Self {
        Self {
            user_info: LookupMap::new(StorageKey::UserInfo),
            agent_info: LookupMap::new(StorageKey::AgentInfo),
            mpc_contract_id,
        }
    }
}
