use near_sdk::store::IterableSet;

use crate::*;

#[near(serializers = [borsh])]
pub struct AgentInfo {
    pub portfolios: IterableSet<AccountId>,
}
