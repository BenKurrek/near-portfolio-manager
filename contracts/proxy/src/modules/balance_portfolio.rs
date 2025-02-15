use crate::*;

#[near]
impl IntentsProxyMpcContract {
    /// BALANCE_PORTFOLIO
    /// Only token diff sub-intents are allowed.
    /// Also, the caller must be in `agent_keys` with the correct portfolio ID.
    #[payable]
    pub fn balance_portfolio(
        &mut self,
        portfolio_id: PortfolioId,
        defuse_intents: DefuseIntents,
    ) -> Promise {
        // 1) Check the caller's public key
        let signer_pk = env::signer_account_pk();

        // 2) Check if that pubkey is in agent_keys
        let keyinfo = self
            .agent_keys
            .get(&signer_pk)
            .expect("Caller is not an agent key!");
        // 3) Check that the agent's portfolio_id matches
        assert_eq!(
            keyinfo.portfolio_id, portfolio_id,
            "Agent is not assigned to this portfolio!"
        );

        // 4) If any sub-intent is NOT a TokenDiff, we panic
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

        // 5) Now do the ERC-191 hash
        let final_hash = compute_erc191_hash(&defuse_intents);

        // 6) Build the sign payload
        let pinfo = self
            .portfolio_info
            .get(&portfolio_id)
            .expect("No such portfolio");
        let sign_payload = MPCSignPayload {
            payload: final_hash,
            path: public_key_to_string(&pinfo.owner_key),
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
