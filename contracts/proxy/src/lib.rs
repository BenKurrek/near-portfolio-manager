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
    /// Each user is identified by their "owner public key" => OnChainUser
    pub owner_map: LookupMap<PublicKey, UserInfo>,

    /// Agent keys are smaller co-owners/AI agents, each with a KeyInfo struct referencing the portfolio
    pub agent_keys: LookupMap<PublicKey, KeyInfo>,

    /// The actual portfolio storage
    pub portfolio_info: LookupMap<PortfolioId, PortfolioInfo>,

    /// Global incrementing ID for new portfolios
    pub global_portfolio_counter: u32,

    /// The MPC contract that each vault uses to sign transactions
    pub mpc_contract_id: AccountId,
}

#[near]
impl IntentsProxyMpcContract {
    /// Initialize the contract with a known MPC contract ID
    #[init]
    pub fn new(mpc_contract_id: AccountId) -> Self {
        Self {
            owner_map: LookupMap::new(StorageKey::OwnerMap),
            agent_keys: LookupMap::new(StorageKey::AgentKeys),
            portfolio_info: LookupMap::new(StorageKey::PortfolioInfo),
            global_portfolio_counter: 0,
            mpc_contract_id,
        }
    }
}
