use crate::*;

pub type PortfolioId = u32;

#[derive(Clone)]
#[near(serializers = [json, borsh])]
pub struct PortfolioInfo {
    pub owner_key: PublicKey,
}
