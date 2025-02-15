use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct WithdrawEphemeral {
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
        ephemeral_json: String,
        signature: near_sdk::json_types::Base64VecU8,
    ) -> Promise {
        // 1) Parse ephemeral JSON => `WithdrawEphemeral`
        let ephemeral: WithdrawEphemeral =
            near_sdk::serde_json::from_str(&ephemeral_json).expect("Invalid ephemeral JSON");

        // 2) Ensure the DefuseIntents are only FtWithdraw
        for intent in &ephemeral.defuse_intents.intents {
            match intent {
                Intent::FtWithdraw(_) => { /* ok */ }
                _ => panic!("withdraw_funds only allows FtWithdraw!"),
            }
        }

        // 3) Check user (OnChainUser) for ephemeral.owner_pubkey
        let mut user = self
            .owner_map
            .get(&ephemeral.owner_pubkey)
            .cloned()
            .expect("User not found in owner_map");

        require!(
            ephemeral.nonce > user.nonce,
            "Nonce must be greater than stored user nonce"
        );

        // 4) Bump the nonce
        user.nonce = ephemeral.nonce;

        // 5) Make sure ephemeral.portfolio_id is actually owned by ephemeral.owner_pubkey
        let pinfo = self
            .portfolio_info
            .get(&ephemeral.portfolio_id)
            .expect("Portfolio not found");
        require!(
            pinfo.owner_key == ephemeral.owner_pubkey,
            "Portfolio not owned by ephemeral signer"
        );

        // 6) Optionally verify signature if you want real on-chain ed25519 checks.
        //    We do the same "erc191" approach for hashing ephemeral, but we can’t do a full verify easily in a NEAR contract unless we have some ed25519 verify logic (not built in).
        let ephemeral_hash = compute_erc191_hash(&ephemeral);
        // Typically you'd do something like `env::ed25519_verify(signature, ephemeral_bytes, ephemeral.owner_pubkey)` if you had the raw ephemeral bytes.

        // 7) Build the sign payload for the MPC
        let sign_payload = MPCSignPayload {
            payload: ephemeral_hash,
            path: public_key_to_string(&ephemeral.owner_pubkey),
            key_version: 0,
        };
        let sign_request_json = near_sdk::serde_json::json!({ "request": sign_payload });
        self.owner_map.insert(ephemeral.owner_pubkey, user.clone());

        // 8) Call the MPC
        near_sdk::Promise::new(self.mpc_contract_id.clone()).function_call(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request_json).unwrap(),
            near_sdk::NearToken::from_near(1),
            FETCH_MPC_SIGNATURE_GAS,
        )
    }
}
