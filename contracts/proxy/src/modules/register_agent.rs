use near_sdk::store::IterableSet;

use crate::*;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn register_agent(&mut self, agent_id: AccountId) {
        require!(
            env::predecessor_account_id() == env::current_account_id(),
            "Only contract owner can register agents"
        );
        self.agent_info.insert(
            agent_id.clone(),
            AgentInfo {
                portfolios: IterableSet::new(StorageKey::AgentInfoInner {
                    account_id_hash: hash_string(&agent_id.to_string()),
                }),
            },
        );
    }
}
