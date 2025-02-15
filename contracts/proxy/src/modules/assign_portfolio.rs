use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct PortfolioAssignPayload {
    pub owner_pubkey: PublicKey,
    pub nonce: u64,
    pub portfolio_id: PortfolioId,
}

#[near]
impl IntentsProxyMpcContract {
    // ---------------------------------------------------
    // ASSIGN_PORTFOLIO_AGENT
    // Allows the *owner* of the portfolio to sign a message that
    // authorizes a new "agent" public key to manage the portfolio (token diff).
    // ---------------------------------------------------
    ///
    /// The user must pass in:
    /// - `signed_payload` for an ephemeral signature from their key
    /// - `signature`
    /// - `agent_pubkey` to add
    /// - `portfolio_id`
    ///
    /// The ephemeral message should contain e.g. `nonce`, `portfolio_id`, etc.
    #[payable]
    pub fn assign_portfolio_agent(
        &mut self,
        portolio_data: PortfolioAssignPayload,
        signature: Base64VecU8,
        agent_pubkey: PublicKey,
    ) {
        let owner_pubkey = portolio_data.owner_pubkey.clone();
        let mut user = self
            .owner_map
            .get(&owner_pubkey)
            .cloned()
            .expect("Owner not found in owner_map");
        require!(
            portolio_data.nonce > user.nonce,
            "Nonce must be greater than the stored user nonce"
        );

        let req_bytes = serde_json::to_vec(&portolio_data).expect("Serialization failed");
        // Verify signature on the ephemeral JSON.
        let is_valid = verify_signature(&req_bytes, &signature, &owner_pubkey);
        require!(is_valid, "Invalid signature on ephemeral payload");

        // 5) Bump the nonce
        user.nonce = portolio_data.nonce;

        // 6) Ensure that portfolio_id is actually owned by that user
        let pinfo = self
            .portfolio_info
            .get(&portolio_data.portfolio_id)
            .expect("No portfolio with that ID found");
        require!(
            pinfo.owner_key == owner_pubkey,
            "Portfolio not owned by ephemeral signer"
        );

        self.owner_map.insert(owner_pubkey, user);

        // 7) Insert new agent
        let keyinfo = KeyInfo {
            portfolio_id: portolio_data.portfolio_id,
        };
        self.agent_keys.insert(agent_pubkey, keyinfo);
    }
}
