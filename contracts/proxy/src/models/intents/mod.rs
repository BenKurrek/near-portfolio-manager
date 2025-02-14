pub mod token_diff;
pub mod tokens;

use derive_more::derive::From;
use near_sdk::near;
use tokens::NativeWithdraw;

use self::{
    token_diff::TokenDiff,
    tokens::{FtWithdraw, MtWithdraw, NftWithdraw, Transfer},
};

#[near(serializers = [borsh, json])]
#[derive(Debug, Clone)]
pub struct DefuseIntents {
    /// Sequence of intents to execute in given order. Empty list is also
    /// a valid sequence, i.e. it doesn't do anything, but still invalidates
    /// the `nonce` for the signer
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub intents: Vec<Intent>,
}

#[near(serializers = [borsh, json])]
#[serde(tag = "intent", rename_all = "snake_case")]
#[derive(Debug, Clone, From)]
pub enum Intent {
    Transfer(Transfer),

    FtWithdraw(FtWithdraw),
    NftWithdraw(NftWithdraw),
    MtWithdraw(MtWithdraw),
    NativeWithdraw(NativeWithdraw),

    TokenDiff(TokenDiff),
}

pub struct MetaIntent {
    pub intent: Intent,
}
