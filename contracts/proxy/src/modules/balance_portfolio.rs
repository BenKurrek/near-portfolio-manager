use crate::*;
use hex::decode;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn balance_portfolio(
        &mut self,
        user_portfolio: AccountId,
        hash: String,
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

        // Update the user's activities vector with any TokenDiff intents as stringified JSON
        let user = self
            .user_info
            .get_mut(&user_portfolio)
            .expect("User not found");
        for intent in &defuse_intents.intents {
            if let Intent::TokenDiff(token_diff) = intent {
                // Create JSON object with agent_id, timestamp, and diffs (the TokenDiff)
                let json_value = serde_json::json!({
                    "agent_id": agent_id,
                    "timestamp": env::block_timestamp(),
                    "diffs": token_diff,
                });
                let json_str =
                    serde_json::to_string(&json_value).expect("Failed to serialize TokenDiff");
                user.activities.push(json_str);
            }
        }

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

        let raw_bytes = decode(&hash[2..]).expect("Decoding hex failed");
        let final_hash: [u8; 32] = vec_to_fixed(raw_bytes);
        let final_hash2 = compute_erc191_hash(&defuse_intents);
        require!(final_hash == final_hash2, "Hash mismatch!");
        log!(
            "contract hash: {}, passed in hash: {}",
            bs58::encode(&final_hash).into_string(),
            bs58::encode(&final_hash2).into_string()
        );
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
