#!/bin/bash
set -e

echo "Building all contracts..."

for dir in ./contracts/*/
do
    (
        cd "$dir"
        cargo build --target wasm32-unknown-unknown --release
        CONTRACT_NAME=$(basename "$dir")
        mkdir -p ../../out
        cp ../../target/wasm32-unknown-unknown/release/"$CONTRACT_NAME".wasm ../../out/"$CONTRACT_NAME".wasm
    )
done

echo "All contracts have been built and stored in the 'out' directory."
