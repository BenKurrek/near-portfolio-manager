use crate::*;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn create_portfolio(
        &mut self,
        portfolio_data: PortfolioSpread,
        agent_id: AccountId,
        near_intents_address: String,
    ) {
        let owner_id = env::predecessor_account_id();
        let user = UserInfo {
            required_spread: portfolio_data,
            near_intents_address,
            activities: Vec::new(),
        };
        self.user_info.insert(owner_id.clone(), user);

        let agent_info = self.agent_info.get_mut(&agent_id).expect("Agent not found");
        agent_info.portfolios.insert(owner_id);
    }
}
