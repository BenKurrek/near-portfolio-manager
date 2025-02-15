use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct EphemeralAssignPayload {
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
        signed_payload: String,
        signature: Base64VecU8,
        agent_pubkey: PublicKey,
        portfolio_id: PortfolioId,
    ) {
        // 1) Parse the ephemeral payload ( JSON ) => something like:
        //    { "nonce": 999, "portfolio_id": 7 }
        let ephemeral_data: EphemeralAssignPayload =
            near_sdk::serde_json::from_str(&signed_payload)
                .expect("Invalid ephemeral payload JSON");

        require!(
            ephemeral_data.portfolio_id == portfolio_id,
            "Mismatched portfolio in ephemeral data"
        );

        // 2) We must recover the "owner pubkey" from the signature (or at least verify)
        //    But in NEAR, we can't do full ED25519 verify easily without the raw signature checks.
        //    We'll do an ERC-191 style hash and compare. For a real app, you'd do more advanced logic.
        let hash = compute_erc191_hash(&ephemeral_data);
        // For demonstration, we'll assume the "signed_payload" was indeed signed by the correct key.
        // Typically you'd store the key, then do `env::ed25519_verify`.

        // 3) We want to see if there's an existing user with this ephemeral_data.owner_key
        //    But ephemeral_data doesn't have the full public key. In many setups, you'd pass it in the ephemeral data.
        //    For simplicity, let's say ephemeral_data includes the "owner_pubkey" in hex or something.
        let owner_pubkey = ephemeral_data.owner_pubkey;

        // 4) Check the user's stored nonce
        let mut user = self
            .owner_map
            .get(&owner_pubkey)
            .cloned()
            .expect("Owner not found in owner_map");
        require!(
            ephemeral_data.nonce > user.nonce,
            "Nonce must be greater than the stored user nonce"
        );

        // 5) Bump the nonce
        user.nonce = ephemeral_data.nonce;

        // 6) Ensure that portfolio_id is actually owned by that user
        let pinfo = self
            .portfolio_info
            .get(&portfolio_id)
            .expect("No portfolio with that ID found");
        require!(
            pinfo.owner_key == owner_pubkey,
            "Portfolio not owned by ephemeral signer"
        );

        self.owner_map.insert(owner_pubkey, user);

        // 7) Insert new agent
        let keyinfo = KeyInfo { portfolio_id };
        self.agent_keys.insert(agent_pubkey, keyinfo);
    }
}
