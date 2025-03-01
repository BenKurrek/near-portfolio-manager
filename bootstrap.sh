#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install

echo "Building contracts..."
./build.sh

echo "Deploying the proxy contract..."
pnpm run deploy:proxy

echo "Registering the agent..."
pnpm run deploy:register-agent

echo "Deployment and registration complete!"
