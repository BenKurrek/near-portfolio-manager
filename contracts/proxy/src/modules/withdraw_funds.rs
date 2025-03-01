use crate::*;
#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn withdraw_funds(&mut self, defuse_intent: DefuseIntents) -> Promise {
        let owner_id = env::predecessor_account_id();

        let intent_hash = compute_erc191_hash(&defuse_intent);

        let sign_payload = MPCSignPayload {
            payload: intent_hash,
            path: owner_id.to_string(),
            key_version: 0,
        };
        let sign_request_json = near_sdk::serde_json::json!({ "request": sign_payload });

        // 8) Call the MPC
        near_sdk::Promise::new(self.mpc_contract_id.clone()).function_call(
            "sign".to_string(),
            near_sdk::serde_json::to_vec(&sign_request_json).unwrap(),
            near_sdk::NearToken::from_near(1),
            FETCH_MPC_SIGNATURE_GAS,
        )
    }
}
