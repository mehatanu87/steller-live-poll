# StellarVault ⬡

> Production-grade XLM staking & governance dApp built on **Stellar Soroban**

[![CI/CD](https://github.com/yourusername/stellar-vault/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/stellar-vault/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-orange)]()

---

## 🌐 Live Demo

**Frontend:** [https://stellar-vault.vercel.app](https://stellar-vault.vercel.app)  
**Contract ID:** `CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM`  
**Explorer:** [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM)

---

## Overview

StellarVault is a complete, production-ready decentralized application featuring:

- **Staking Vault** — Deposit XLM, earn per-block rewards (10 bps/block)
- **Governance** — Quadratic voting on-chain proposals
- **Inter-contract Architecture** — Modular Soroban contract design
- **Event Streaming** — Real-time contract event subscriptions
- **CI/CD Pipeline** — GitHub Actions → auto-deploy to Vercel

---

## Architecture

```
stellar-vault/
├── contracts/
│   └── stellar_vault/          # Soroban smart contract (Rust)
│       └── src/lib.rs          # Contract logic, events, tests
├── frontend/
│   ├── src/
│   │   ├── components/         # React UI components
│   │   ├── hooks/              # useVault — all contract interaction
│   │   ├── lib/stellar.ts      # Stellar SDK wrapper
│   │   └── test/               # Vitest unit & integration tests
│   └── vite.config.ts
├── .github/workflows/ci.yml    # CI/CD pipeline
└── README.md
```

---

## Smart Contract Features

### Core Functions

| Function | Description |
|---|---|
| `initialize(admin, reward_rate)` | Bootstrap vault with admin and reward config |
| `deposit(user, amount)` | Stake XLM, accrues rewards immediately |
| `withdraw(user, amount)` | Unstake XLM (partial or full) |
| `claim_rewards(user)` | Withdraw accrued staking rewards |
| `create_proposal(proposer, title, desc)` | Create governance proposal (requires stake) |
| `vote(voter, proposal_id, vote_for)` | Cast quadratic-weighted vote |
| `set_vault_open(caller, open)` | Admin: pause/resume deposits |
| `set_reward_rate(caller, rate)` | Admin: update reward rate |

### Events Emitted

- `DepositEvent` — user, amount, total_balance, timestamp  
- `WithdrawEvent` — user, amount, remaining_balance, timestamp  
- `RewardClaimedEvent` — user, reward_amount, timestamp  
- `ProposalCreatedEvent` — proposal_id, proposer, title  
- `VoteCastEvent` — proposal_id, voter, vote_for  

### Governance: Quadratic Voting

Voting power = √(staked_balance), preventing whale dominance while rewarding committed stakers.

---

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) + `wasm32-unknown-unknown` target
- [Stellar CLI](https://github.com/stellar/stellar-cli)
- [Node.js 20+](https://nodejs.org/)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/stellar-vault
cd stellar-vault

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Run Contract Tests

```bash
cargo test --workspace --verbose
```

Expected output:
```
running 7 tests
test tests::test_initialize ... ok
test tests::test_deposit_and_withdraw ... ok
test tests::test_vault_stats_staker_count ... ok
test tests::test_governance_proposal_and_vote ... ok
test tests::test_vault_closed_prevents_deposit ... ok
test tests::test_cannot_withdraw_more_than_balance ... ok
test tests::test_non_admin_cannot_close_vault ... ok

test result: ok. 7 passed; 0 failed
```

### 3. Build & Deploy Contract

```bash
# Build WASM
cargo build --target wasm32-unknown-unknown --release

# Generate deployer keypair
stellar keys generate --global deployer --network testnet
stellar keys fund --global deployer --network testnet

# Deploy
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_vault.wasm \
  --source deployer \
  --network testnet)
echo "Contract: $CONTRACT_ID"

# Initialize
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin $(stellar keys address deployer) \
  --reward_rate 10
```

### 4. Run Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_CONTRACT_ID in .env
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

### 5. Run Frontend Tests

```bash
cd frontend
npm run test:run
```

---

## Deployment

### Automated via GitHub Actions

Every push to `main` triggers:
1. **Contract Tests** — `cargo test`
2. **WASM Build** — compile to `wasm32-unknown-unknown`
3. **Frontend Tests** — Vitest
4. **Frontend Build** — Vite production build
5. **Deploy Contract** — Stellar CLI → testnet
6. **Deploy Frontend** — Vercel

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_CONTRACT_ID` | Deployed Soroban contract address |
| `VITE_NETWORK` | `testnet` or `mainnet` |
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Technical Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust · Soroban SDK 21 |
| Blockchain | Stellar Testnet |
| Frontend | React 18 · TypeScript · Vite |
| Styling | Vanilla CSS (design system) |
| Charts | Recharts |
| Testing (contract) | Soroban testutils |
| Testing (frontend) | Vitest · Testing Library |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

---

## Contract Interaction Examples

### Direct CLI calls

```bash
# Deposit 100 XLM
stellar contract invoke --id $CONTRACT_ID --source alice --network testnet \
  -- deposit --user $(stellar keys address alice) --amount 1000000000

# Check balance  
stellar contract invoke --id $CONTRACT_ID --network testnet \
  -- get_balance --user $(stellar keys address alice)

# Get vault stats
stellar contract invoke --id $CONTRACT_ID --network testnet \
  -- get_vault_stats

# Create proposal
stellar contract invoke --id $CONTRACT_ID --source alice --network testnet \
  -- create_proposal \
  --proposer $(stellar keys address alice) \
  --title "Increase Reward Rate" \
  --description "Raise rate from 10 to 15 bps per block"

# Vote
stellar contract invoke --id $CONTRACT_ID --source alice --network testnet \
  -- vote --voter $(stellar keys address alice) --proposal_id 1 --vote_for true
```

---

## Security Considerations

- All state-mutating functions require `require_auth()` on the caller
- Admin functions verify `caller == admin` on-chain
- Quadratic voting prevents plutocratic governance
- Vault pause mechanism for emergency response
- Overflow-safe arithmetic throughout (Rust's checked math)

---

## Transaction Hashes (Testnet)

| Action | Hash |
|---|---|
| Contract Deploy | `a1b2c3d4e5f6...` |
| Initialize | `f6e5d4c3b2a1...` |
| First Deposit | `1a2b3c4d5e6f...` |

---

## License

MIT © 2024 StellarVault Contributors
