//! src/models/intents/token_diff.rs

use super::tokens::TokenAmounts;
use impl_tools::autoimpl;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::{near, AccountId};
use serde_with::serde_as;
use std::{borrow::Cow, collections::BTreeMap};

pub type TokenDeltas = TokenAmounts<BTreeMap<TokenId, i128>>;

#[cfg_attr(not(target_arch = "wasm32"), serde_as(schemars = true))]
#[cfg_attr(target_arch = "wasm32", serde_as(schemars = false))]
#[near(serializers = [borsh, json])]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
#[autoimpl(Deref using self.diff)]
#[autoimpl(DerefMut using self.diff)]
pub struct TokenDiff {
    pub diff: BTreeMap<TokenId, i128>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub referral: Option<AccountId>,
}

#[cfg_attr(not(target_arch = "wasm32"), serde_as(schemars = true))]
#[cfg_attr(target_arch = "wasm32", serde_as(schemars = false))]
#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct TokenDiffEvent<'a> {
    #[serde(flatten)]
    pub diff: Cow<'a, TokenDiff>,
}
