//! modules/send_funds.rs
//!
//! Defines the normal “send flow” for co-signing a BTC transaction with the platform’s main key.

use crate::*;

#[near]
impl IntentsProxyMpcContract {
    #[payable]
    pub fn request_intent_signature(
        &mut self,
        request: Intent,
        portfolio_id: PortfolioId,
    ) -> Promise {
        let portfolio = self
            .portfolio_info
            .get(&portfolio_id)
            .expect("No portfolio found");

        let request_payload =
            create_sign_request_from_transaction(request.to_vec(), portfolio.owner_id);

        Promise::new(self.mpc_contract_id.clone())
            .function_call(
                "sign".to_string(),
                serde_json::to_vec(&request_payload).unwrap(),
                NearToken::from_near(1), // Attach some NEAR as required by MPC
                FETCH_MPC_SIGNATURE_GAS,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(RESOLVE_MPC_SIGNATURE_GAS)
                    .on_mpc_signatures_received(1),
            )
    }

    /// Internal callback after each MPC signature has finished sending to refund any attached
    /// deposit and return the collection of signatures.
    #[private]
    pub fn on_mpc_signatures_received(&mut self, num_signatures: usize) -> Vec<SignResult> {
        // Refund the attached deposit used for signing all inputs
        Promise::new(env::signer_account_id()).transfer(
            NearToken::from_near(1)
                .checked_mul(num_signatures as u128)
                .expect("Overflow in deposit transfer calculation"),
        );

        let result_count = env::promise_results_count();
        let mut signatures: Vec<SignResult> = Vec::new();

        for i in 0..result_count {
            match env::promise_result(i) {
                PromiseResult::Successful(bytes) => {
                    log!("VAULT: Received {:?} for input {}", bytes, i);
                    if let Ok(sig) = serde_json::from_slice::<SignResult>(&bytes) {
                        signatures.push(sig);
                    }
                }
                _ => log!("VAULT: No MPC signature received for input {}", i),
            }
        }

        log!(
            "VAULT: Received {} MPC signatures for {} promises. Expected {}",
            signatures.len(),
            result_count,
            num_signatures
        );

        // Finally, return the collected signatures
        signatures
    }
}
