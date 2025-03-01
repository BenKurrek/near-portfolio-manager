use crate::*;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn create_portfolio(
        &mut self,
        portolio_data: PortfolioSpread,
        agent_id: AccountId,
        intents_key: PublicKey,
    ) {
        let owner_id = env::predecessor_account_id();
        let user = UserInfo {
            required_spread: portolio_data,
            near_intents_key: intents_key,
        };
        self.user_info.insert(owner_id.clone(), user);

        let agent_info = self.agent_info.get_mut(&agent_id).expect("Agent not found");
        agent_info.portfolios.insert(owner_id);
    }
}
