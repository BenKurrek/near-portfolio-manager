//! lib/views.rs
//!
//! This file defines the view functions for the contract.

use crate::*;

#[near]
impl IntentsProxyMpcContract {
    pub fn get_portfolio(&self, portfolio_id: PortfolioId) -> Option<PortfolioInfo> {
        self.portfolio_info.get(&portfolio_id).cloned()
    }

    pub fn get_user(&self, user_pk: near_sdk::PublicKey) -> Option<UserInfo> {
        self.owner_map.get(&user_pk).cloned()
    }
}
