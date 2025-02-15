use crate::*;

#[near]
impl IntentsProxyMpcContract {
    // ---------------------------------------------------
    // CREATE_PORTFOLIO
    // Takes a single public key. Returns a new portfolio ID.
    // ---------------------------------------------------
    #[payable]
    pub fn create_portfolio(&mut self, owner_pubkey: PublicKey) -> PortfolioId {
        // 1) If user does not exist in owner_map, create them
        let mut user = self
            .owner_map
            .get(&owner_pubkey)
            .cloned()
            .unwrap_or_else(|| UserInfo {
                nonce: 0,
                portfolios: Vec::new(),
            });

        // 2) Generate a new portfolio ID
        let new_port_id = self.global_portfolio_counter + 1;
        self.global_portfolio_counter += 1;

        // 3) Insert a new portfolio record
        let portfolio_info = PortfolioInfo {
            owner_key: owner_pubkey.clone(),
        };
        self.portfolio_info.insert(new_port_id, portfolio_info);

        // 4) Update user to track this portfolio
        user.portfolios.push(new_port_id);
        self.owner_map.insert(owner_pubkey, user.clone());

        new_port_id
    }
}
