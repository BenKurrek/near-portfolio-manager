use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct WithdrawalData {
    /// The user’s public key (the portfolio owner)
    pub owner_pubkey: near_sdk::PublicKey,
    /// The user’s nonce must be strictly greater than the stored nonce
    pub nonce: u64,
    /// The entire DefuseIntents that must be FtWithdraw only
    pub defuse_intents: DefuseIntents,
    /// The portfolio ID so we can check we do indeed own it
    pub portfolio_id: PortfolioId,
}

#[near]
impl IntentsProxyMpcContract {
    /// WITHDRAW_FUNDS
    /// This accepts a single ephemeral message and a signature from the
    /// *portfolio owner’s* public key. We ensure the sub‐intents are only FtWithdraw,
    /// check + increment the user’s stored nonce, and then do an MPC sign call.
    #[payable]
    pub fn withdraw_funds(
        &mut self,
        withdrawal_data: WithdrawalData,
        signature: Base64VecU8,
    ) -> Promise {
        // Verify signature on the ephemeral JSON.
        let req_bytes = serde_json::to_vec(&withdrawal_data).expect("Serialization failed");
        let is_valid = verify_signature(&req_bytes, &signature, &withdrawal_data.owner_pubkey);

        require!(is_valid, "Invalid signature on ephemeral payload");
        // 2) Ensure the DefuseIntents are only FtWithdraw
        for intent in &withdrawal_data.defuse_intents.intents {
            match intent {
                Intent::FtWithdraw(_) => { /* ok */ }
                _ => panic!("withdraw_funds only allows FtWithdraw!"),
            }
        }

        // 3) Check user (OnChainUser) for ephemeral.owner_pubkey
        let mut user = self
            .owner_map
            .get(&withdrawal_data.owner_pubkey)
            .cloned()
            .expect("User not found in owner_map");

        require!(
            withdrawal_data.nonce > user.nonce,
            "Nonce must be greater than stored user nonce"
        );

        // 4) Bump the nonce
        user.nonce = withdrawal_data.nonce;

        // 5) Make sure ephemeral.portfolio_id is actually owned by ephemeral.owner_pubkey
        let pinfo = self
            .portfolio_info
            .get(&withdrawal_data.portfolio_id)
            .expect("Portfolio not found");
        require!(
            pinfo.owner_key == withdrawal_data.owner_pubkey,
            "Portfolio not owned by ephemeral signer"
        );

        let intent_hash = compute_erc191_hash(&withdrawal_data.defuse_intents);

        // 7) Build the sign payload for the MPC
        let sign_payload = MPCSignPayload {
            payload: intent_hash,
            path: public_key_to_string(&withdrawal_data.owner_pubkey),
            key_version: 0,
        };
        let sign_request_json = near_sdk::serde_json::json!({ "request": sign_payload });
        self.owner_map
            .insert(withdrawal_data.owner_pubkey, user.clone());

        // 8) Call the MPC
        near_sdk::Promise::new(self.mpc_contract_id.clone()).function_call(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request_json).unwrap(),
            near_sdk::NearToken::from_near(1),
            FETCH_MPC_SIGNATURE_GAS,
        )
    }
}
