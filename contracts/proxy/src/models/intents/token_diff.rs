//! src/models/intents/token_diff.rs

use super::tokens::TokenAmounts;
use impl_tools::autoimpl;
use indexmap::IndexMap;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::{near, AccountId};
use serde_with::serde_as;
use std::collections::{BTreeMap, HashMap};

pub type TokenDeltas = TokenAmounts<BTreeMap<TokenId, i128>>;

#[cfg_attr(not(target_arch = "wasm32"), serde_as(schemars = true))]
#[cfg_attr(target_arch = "wasm32", serde_as(schemars = false))]
#[near(serializers = [json])]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
#[autoimpl(Deref using self.diff)]
#[autoimpl(DerefMut using self.diff)]
pub struct TokenDiff {
    pub diff: IndexMap<TokenId, String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub referral: Option<AccountId>,
}
