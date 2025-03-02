# Fluxfolio: A Trustless, AI‐Assisted Crypto Portfolio Manager

Welcome to Fluxfolio! This repository contains everything you need to **deploy** the proxy contract on NEAR, run the **Next.js** frontend, and optionally **register** an agent that can programmatically rebalance user portfolios under specified rules. The architecture is designed to let non-crypto-native users easily deposit stablecoins, buy curated bundles, or rely on an automated AI balancer, while maintaining **trustless** control of their funds thanks to an MPC-protected proxy contract.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Requirements & Dependencies](#requirements--dependencies)
5. [Quick Start](#quick-start)
   - [1. Clone the Repo & Install PNPM](#1-clone-the-repo--install-pnpm)
   - [2. Bootstrap Scripts](#2-bootstrap-scripts)
   - [3. Optional: Deploy Your Own Contracts](#3-optional-deploy-your-own-contracts)
   - [4. Run the Frontend Locally](#4-run-the-frontend-locally)
6. [Deployment (Smart Contracts)](#deployment-smart-contracts)
   - [Using Pre-Deployed Contracts](#using-pre-deployed-contracts)
   - [Full Deployment](#full-deployment)
     - [1. Create/Update `.env` Files](#1-createupdate-env-files)
     - [2. Build and Deploy](#2-build-and-deploy)
     - [3. Register an Agent](#3-register-an-agent)
7. [Running the Frontend](#running-the-frontend)
   - [Environment Variables](#environment-variables)
   - [Local Development](#local-development)
8. [Template `.env` File](#template-env-file)
9. [Scripts & Usage](#scripts--usage)
10. [Contributing](#contributing)
11. [License](#license)

---

## Overview

**Fluxfolio** provides a **trustless, AI-assisted** way for users to manage crypto portfolios on NEAR. Users can:

- Deposit stablecoins to a unified deposit address.
- Buy curated “bundles” of crypto (e.g. 20% ETH, 30% SOL, etc.).
- Let an AI agent continuously rebalance their portfolio based on thresholds.

**Key Points**:

- A **proxy contract** on NEAR manages users’ deposits (the stablecoins + cross-chain assets).
- An **MPC network** holds key shares that sign transactions only after the proxy checks the AI agent’s **intents**.
- The **Next.js** frontend handles user interactions (register/login with passkeys, deposit, buy bundles, track portfolio).
- A Python-based **AI agent** can be plugged in to watch conditions, propose swaps, and post these swaps (intents) to the contract.

---

## Architecture

```plaintext
+---------------------+       +-----------------------+
|     Next.js App     |       |     Python AI Agent   |
|  (Frontend + API)   |       | (Monitoring & Rebal)  |
|                     |       |                       |
| - React UI          |       | - Watches user conds  |
| - Passkey Auth      |  ---> | - Proposes swaps      |
| - Manages .env vars |       | - Posts to NEAR Proxy |
+---------------------+       +----------+------------+
                              |                       v
                   +--------------------------+
                   |     NEAR Proxy Contract  |
                   |   (MPC-protected vault)  |
                   |--------------------------|
                   | - Checks agent perms     |
                   | - Forwards sign req to   |
                   |   the MPC contract       |
                   +-----------+--------------+
                              |                       v
                   +--------------------------+
                   |     MPC Contract         |
                   |    (MultiParty Sign)     |
                   +--------------------------+

```

---

## Repository Structure

```plaintext
.
├── contracts/
│   └── proxy/                  # Rust-based MPC proxy contract
│       ├── Cargo.toml
│       ├── build.sh
│       └── src/
│           ├── lib.rs          # Entry point for the contract
│           └── modules/        # Contract modules (create portfolio, balance, etc.)
├── frontend/
│   ├── pages/                  # Next.js routes (api + frontend pages)
│   ├── src/                    # React components, contexts, utils
│   ├── prisma/                 # SQLite migrations/schema
│   ├── package.json
│   └── dockerfile
├── scripts/
│   ├── env/                    # Example .env.* environment files for mainnet/testnet
│   ├── deployContract.ts       # Script to deploy new contract accounts
│   ├── registerAgent.ts        # Script to register an agent
│   └── ...
├── build.sh                    # Builds all contracts (in this workspace)
├── bootstrap.sh                # Installs deps, builds, deploys and registers an agent
├── package.json                # Root-level package with scripts for contract building
└── ...
```

---

## Requirements & Dependencies

- **Rust & Cargo** (for building NEAR smart contracts)
- **Node.js >= 18** (LTS recommended)
- **pnpm >= 8** (for JavaScript dependencies)
- **NEAR CLI** (optional if you wish to do low-level interactions)
- **Docker** (optional, for container-based deployment)

---

## Quick Start

### 1\. Clone the Repo & Install PNPM

```bash
git clone https://github.com/BenKurrek/near-portfolio-manager.git
cd near-portfolio-manager

# Make sure you have PNPM installed
npm install -g pnpm
pnpm install
```

### 2\. Bootstrap Scripts

We provide a `bootstrap.sh` script that:

1.  Installs dependencies (via `pnpm install`)
2.  Builds the contracts (via `./build.sh`)
3.  Deploys the proxy contract (runs `pnpm run deploy:proxy`)
4.  Registers the agent (runs `pnpm run deploy:register-agent`)

To run it:

```bash
./bootstrap.sh
```

> **Note**: This script expects that you have already configured environment variables for your NEAR sponsor account, MPC contract, etc. If you just want to use **pre-built** contracts (i.e. you do **not** need to own your own NEAR contract accounts), see the next sections on environment setup.

### 3\. Optional: Deploy Your Own Contracts

If you want to host your own instance of the proxy contract on NEAR, you can use the included scripts. Otherwise, you can point your frontend to a **pre-deployed** contract address.

### 4\. Run the Frontend Locally

Inside `frontend`, do:

```bash
pnpm install
pnpm dev:mainnet
```

Then navigate to http://localhost:3000.

---

## Deployment (Smart Contracts)

### Using Pre-Deployed Contracts

If you **do not** want to deploy your own NEAR proxy, you can skip directly to [Running the Frontend](#running-the-frontend).

> In this scenario, you simply reference an existing contract ID in `.env` and `.env.mainnet` or `.env.testnet`.

### Full Deployment

#### 1\. Create/Update `.env` Files

Inside `scripts/env`, we have placeholders like `.env.mainnet` or `.env.testnet`. You must supply:

```bash
# scripts/env/.env.mainnet

SPONSOR_ACCOUNT="your-sponsor-mainnet-account.near"
MPC_CONTRACT="v1.signer"  # The MPC contract for mainnet

# The contract ID and agent ID will be automatically set by the scripts:
PROXY_CONTRACT_ID=""
PROXY_CONTRACT_KEY=""
AGENT_ACCOUNT_ID=""
AGENT_PRIVATE_KEY=""
```

- **SPONSOR_ACCOUNT**: The “funder” NEAR account that will pay for the deployment costs.
- **MPC_CONTRACT**: The MPC signer contract ID (e.g. `v1.signer` on NEAR mainnet).

You’ll also want to place your NEAR credentials for `SPONSOR_ACCOUNT` in your local key store. Typically, NEAR CLI stores them in `~/.near-credentials/mainnet/`.

#### 2\. Build and Deploy

From the repository root, run:

```bash
pnpm install      # Install dependencies
./build.sh        # Build the contracts
pnpm run deploy:proxy
```

This will create a brand new NEAR sub-account for the proxy contract if successful.

#### 3\. Register an Agent

To register an agent that can orchestrate rebalancing on behalf of users:

```bash
pnpm run deploy:register-agent
```

This script:

- Creates a new `agent-<timestamp>.near` account
- Calls `proxy_contract.register_agent(agent_id)`
- Updates the `.env.mainnet` with `AGENT_ACCOUNT_ID` and `AGENT_PRIVATE_KEY`

---

## Running the Frontend

In the `frontend/` directory, the Next.js app is set up to connect to your chosen NEAR environment. You can define environment variables in `.env.mainnet` or `.env.testnet` (for example) that specify:

- `NEXT_PUBLIC_APP_NETWORK_ID`: `"testnet"` or `"mainnet"`
- `NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID`: (the sponsor or platform ID if needed)
- `NEXT_PUBLIC_CONTRACT_ID`: The deployed proxy contract ID
- `NEXT_AGENT_ACCOUNT_ID`: The agent ID used for some advanced features

### Environment Variables

See the [Template `.env` File](#template-env-file) section below for a recommended environment file content. Copy it into your `frontend/.env.mainnet` or `frontend/.env.testnet`

### Local Development

```bash

cd frontend
pnpm install
pnpm dev
```

The Next.js app starts at http://localhost:3000.

## Template `.env` File

Below is a **template** you can adapt for **`frontend/.env`** (or `.env.mainnet`, `.env.testnet`, etc.). Adjust values to match your environment:

```plaintext
NEXT_PUBLIC_WEBAUTHN_RP_ID=localhost
NEXT_PUBLIC_WEBAUTHN_ORIGIN=http://localhost:3000
SESSION_PASSWORD=complex_password_at_least_32_characters_long
NEXT_PUBLIC_APP_NETWORK_ID=mainnet

NEXT_PUBLIC_CONTRACT_ID = proxy-1740901684353.near
NEXT_AGENT_ACCOUNT_ID = agent-1740901697549.near
NEXT_AGENT_PRIVATE_KEY = AGENT_PRIVATE_KEY
NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_ID = SOME_SPONSOR_ACCOUNT
NEXT_PUBLIC_NEAR_PLATFORM_SIGNER_KEY = SOME_SPONSOR_PRIVATE_KEY
```

Place this in `frontend/` as `.env.local`, `.env.mainnet`, or whichever naming you prefer.

> **Note**: The `scripts/env/.env.mainnet` or `scripts/env/.env.testnet` files are used for **contract** deployments. The `frontend/.env.*` are for the Next.js **runtime** environment. You might share some variables but typically keep them separate.

---

## Scripts & Usage

**Root-level `package.json`** has scripts for building contracts and patching:

- **`pnpm build`**: Runs `./build.sh`, which compiles Rust contracts into `out/`.
- **`pnpm contract:patch`**: Rebuilds and re-deploys the proxy contract in-place.
- **`pnpm deploy:proxy`**: Deploys a fresh instance of the proxy contract.
- **`pnpm deploy:register-agent`**: Creates a new agent sub-account and registers with the proxy.

**`bootstrap.sh`**: Installs dependencies, builds contracts, deploys the proxy, and registers an agent in one step.

**In `frontend/`**:

- **`pnpm dev`**: Run Next.js dev server.
- **`pnpm build`**: Production build for Next.js.
- **`pnpm start`**: Start the Next.js production server.
- **`pnpm prisma`**: Manage the local SQLite DB (generate client, migrations, etc.).

---

## Contributing

1.  Fork or clone the repository.
2.  Make sure you have the correct environment variables set up.
3.  Write clear commit messages and open pull requests.

---

## License

MIT License © 2023 Fluxfolio authors and contributors. Feel free to fork and adapt.
