use near_sdk::{
    env, json_types::Base64VecU8, log, near, require, AccountId, Gas, NearToken, PanicOnDefault,
    Promise, PromiseResult, PublicKey,
};

#[near(contract_state, serializers = [borsh])]
#[derive(PanicOnDefault)]
pub struct Contract {}

#[near]
impl Contract {
    #[init]
    pub fn new() -> Self {
        log!("Hello World!");
        Self {}
    }
}
