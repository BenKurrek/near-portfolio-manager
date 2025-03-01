//! lib/views.rs
//!
//! This file defines the view functions for the contract.

use crate::*;

#[near]
impl IntentsProxyMpcContract {
    pub fn get_agent_info(&self, agent_id: AccountId) -> Vec<AccountId> {
        self.agent_info
            .get(&agent_id)
            .expect("No agent found")
            .portfolios
            .iter()
            .cloned()
            .collect()
    }

    pub fn get_user_info(&self, user_id: AccountId) -> Option<UserInfo> {
        self.user_info.get(&user_id).cloned()
    }
}
