
#!/bin/bash
set -e

# Path to the mainnet environment file
ENV_FILE="scripts/env/.env.mainnet"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file not found at $ENV_FILE"
  exit 1
fi

# Source the environment variables from the env file
source "$ENV_FILE"

# Ensure required variables are set
if [ -z "$PROXY_CONTRACT_ID" ]; then
  echo "Error: PROXY_CONTRACT_ID is not set in $ENV_FILE"
  exit 1
fi

if [ -z "$AGENT_ACCOUNT_ID" ]; then
  echo "Error: AGENT_ACCOUNT_ID is not set in $ENV_FILE"
  exit 1
fi

if [ -z "$SPONSOR_ACCOUNT" ]; then
  echo "Error: SPONSOR_ACCOUNT is not set in $ENV_FILE"
  exit 1
fi

# Delete the proxy contract account
echo "Deleting proxy contract account: $PROXY_CONTRACT_ID"
NEAR_ENV=mainnet near delete-account "$PROXY_CONTRACT_ID" "$SPONSOR_ACCOUNT"

# Delete the agent account
echo "Deleting agent account: $AGENT_ACCOUNT_ID"
NEAR_ENV=mainnet near delete-account "$AGENT_ACCOUNT_ID" "$SPONSOR_ACCOUNT"

echo "Accounts deletion complete!"
