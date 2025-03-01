//! src/models/intents/tokens.rs

use impl_tools::autoimpl;
use near_contract_standards::non_fungible_token::{self, TokenId};
use near_sdk::{json_types::U128, near, AccountId, NearToken};
use std::collections::BTreeMap;

#[near(serializers = [borsh, json])]
#[autoimpl(Deref using self.0)]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TokenAmounts<T = BTreeMap<TokenId, u128>>(T);

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct FtWithdraw {
    pub token: AccountId,
    pub receiver_id: AccountId,
    pub amount: U128,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_deposit: Option<NearToken>,
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct NftWithdraw {
    pub token: AccountId,
    pub receiver_id: AccountId,
    pub token_id: non_fungible_token::TokenId,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_deposit: Option<NearToken>,
}

#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct MtWithdraw {
    pub token: AccountId,
    pub receiver_id: AccountId,
    pub token_ids: Vec<TokenId>,
    pub amounts: Vec<U128>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub msg: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub storage_deposit: Option<NearToken>,
}

/// Withdraw native NEAR
#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct NativeWithdraw {
    pub receiver_id: AccountId,
    pub amount: NearToken,
}
