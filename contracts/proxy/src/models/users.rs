use crate::*;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct UserInfo {
    pub required_spread: PortfolioSpread,
    pub near_intents_key: PublicKey,
}
