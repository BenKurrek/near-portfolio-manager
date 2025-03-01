use crate::*;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn balance_portfolio(
        &mut self,
        user_portfolio: AccountId,
        defuse_intents: DefuseIntents,
    ) -> Promise {
        let agent_id = env::predecessor_account_id();
        let agent = self
            .agent_info
            .get(&agent_id)
            .expect("Caller is not an agent ");

        require!(
            agent.portfolios.contains(&user_portfolio),
            "Agent is not assigned to this portfolio!"
        );

        // If any sub-intent is NOT a TokenDiff, we panic
        for intent in &defuse_intents.intents {
            match intent {
                Intent::TokenDiff(_) => {
                    // good
                }
                _ => {
                    panic!("Only TokenDiff is allowed in balance_portfolio!");
                }
            }
        }

        let final_hash = compute_erc191_hash(&defuse_intents);
        let sign_payload = MPCSignPayload {
            payload: final_hash,
            path: user_portfolio.to_string(),
            key_version: 0,
        };
        let sign_request_json = serde_json::json!({ "request": sign_payload });

        // 7) Call MPC
        Promise::new(self.mpc_contract_id.clone()).function_call(
            "sign".to_string(),
            serde_json::to_vec(&sign_request_json).unwrap(),
            near_sdk::NearToken::from_near(1),
            FETCH_MPC_SIGNATURE_GAS,
        )
    }
}
