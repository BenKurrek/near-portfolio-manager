use crate::*;

/// A sign request for the MPC, containing the 32-byte payload and a path string.
#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct KeyInfo {
    pub portfolio_id: PortfolioId,
}
