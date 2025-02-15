use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UserInfo {
    /// A simple incrementing nonce used whenever the user signs a message.
    pub nonce: u64,
    /// Track which portfolio(s) this user owns.
    pub portfolios: Vec<PortfolioId>,
}
