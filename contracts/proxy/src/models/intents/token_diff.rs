use std::{borrow::Cow, collections::BTreeMap};

use impl_tools::autoimpl;
use near_contract_standards::non_fungible_token::TokenId;
use near_sdk::{near, AccountId};
use serde_with::{serde_as, DisplayFromStr};

pub type TokenDeltas = TokenAmouts<BTreeMap<TokenId, i128>>;

#[cfg_attr(
    all(feature = "abi", not(target_arch = "wasm32")),
    serde_as(schemars = true)
)]
#[cfg_attr(
    not(all(feature = "abi", not(target_arch = "wasm32"))),
    serde_as(schemars = false)
)]
#[near(serializers = [borsh, json])]
#[derive(Debug, Clone, Default, PartialEq, Eq)]
#[autoimpl(Deref using self.diff)]
#[autoimpl(DerefMut using self.diff)]
pub struct TokenDiff {
    #[serde_as(as = "TokenAmounts<BTreeMap<_, DisplayFromStr>>")]
    pub diff: TokenDeltas,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub memo: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub referral: Option<AccountId>,
}

#[cfg_attr(
    all(feature = "abi", not(target_arch = "wasm32")),
    serde_as(schemars = true)
)]
#[cfg_attr(
    not(all(feature = "abi", not(target_arch = "wasm32"))),
    serde_as(schemars = false)
)]
#[near(serializers = [json])]
#[derive(Debug, Clone)]
pub struct TokenDiffEvent<'a> {
    #[serde(flatten)]
    pub diff: Cow<'a, TokenDiff>,

    #[serde_as(as = "TokenAmounts<BTreeMap<_, DisplayFromStr>>")]
    #[serde(skip_serializing_if = "TokenAmounts::is_empty")]
    pub fees_collected: TokenAmounts,
}
