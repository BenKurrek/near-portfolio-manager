//! src/models/intents/mod.rs
pub mod token_diff;
pub mod tokens;

use derive_more::derive::From;
use near_sdk::near;

use token_diff::TokenDiff;
use tokens::{FtWithdraw, MtWithdraw, NativeWithdraw, NftWithdraw};

#[near(serializers = [borsh, json])]
#[derive(Debug, Clone)]
pub struct DefuseIntents {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub intents: Vec<Intent>,
}

#[near(serializers = [borsh, json])]
#[serde(tag = "intent", rename_all = "snake_case")]
#[derive(Debug, Clone, From)]
pub enum Intent {
    FtWithdraw(FtWithdraw),
    NftWithdraw(NftWithdraw),
    MtWithdraw(MtWithdraw),
    NativeWithdraw(NativeWithdraw),
    TokenDiff(TokenDiff),
}

pub struct MetaIntent {
    pub intent: Intent,
}
