# StellarVault ⬡

> **Level 3 – Orange Belt Submission**  
> Production-grade XLM staking & governance dApp built on **Stellar Soroban**

[![CI/CD](https://github.com/mehatanu87/steller-live-poll/actions/workflows/ci.yml/badge.svg)](https://github.com/mehatanu87/steller-live-poll/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Testnet](https://img.shields.io/badge/Network-Stellar%20Testnet-orange)]()
[![Commits](https://img.shields.io/badge/Commits-37%2B-green)]()

---

## 🌐 Live Links

| Resource | Link |
|---|---|
| **Live Demo** | https://steller-live-poll.vercel.app |
| **GitHub Repo** | https://github.com/mehatanu87/steller-live-poll |
| **Contract ID** | `CBLBZWNHE26XAVUK6SRWFBCGKSRNEWPFGRHYTLXPKKSZO2VEQVN2PLYP` |
| **Contract on Explorer** | [stellar.expert](https://stellar.expert/explorer/testnet/contract/CBLBZWNHE26XAVUK6SRWFBCGKSRNEWPFGRHYTLXPKKSZO2VEQVN2PLYP) |
| **Demo Video** | https://drive.google.com/file/d/1hLldHjdqzWlXSTjrroFL0gkVigf5LCpy/view?usp=sharing |

---

## 📋 Submission Checklist

| Requirement | Status |
|---|---|
| ✅ Public GitHub repository | [github.com/mehatanu87/steller-live-poll](https://github.com/mehatanu87/steller-live-poll) |
| ✅ README with complete documentation | This file |
| ✅ Minimum 10+ meaningful commits | **37 commits** |
| ✅ Live demo link | https://steller-live-poll.vercel.app |
| ✅ Contract deployment address | `CBLBZWNHE26XAVUK6SRWFBCGKSRNEWPFGRHYTLXPKKSZO2VEQVN2PLYP` |
| ✅ Transaction hash for contract interaction | See [Transaction Hashes](#transaction-hashes) section |
| ✅ Mobile responsive UI screenshot | See [Screenshots](#screenshots) section |
| ✅ CI/CD pipeline running | GitHub Actions — contract tests → build → deploy |
| ✅ Test output with 3+ passing tests | 7 contract tests + 36 frontend tests |
| ✅ Demo video (1–2 min) | https://drive.google.com/file/d/1hLldHjdqzWlXSTjrroFL0gkVigf5LCpy/view?usp=sharing |

---

## 📸 Screenshots

### 1. Mobile Responsive UI
![Mobile UI](images/mobile_UI.png)

### 2. CI/CD Pipeline Running
![CI/CD Pipeline](images/CICD_pipeline%20_running.png)

### 3. Test Output
![Test Output](images/test_output.png)

---

## 🔗 Transaction Hashes (Testnet)

| Action | Transaction Hash / Link |
|---|---|
| Contract Interaction (Vote) | View on [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBLBZWNHE26XAVUK6SRWFBCGKSRNEWPFGRHYTLXPKKSZO2VEQVN2PLYP) |

## 🏗️ Overview

StellarVault is a **complete end-to-end Stellar dApp** featuring a Soroban smart contract for XLM staking with:

- 💰 **Real XLM Staking** — Deposit actual XLM into the contract vault using inter-contract token transfer (Stellar Asset Contract)
- 📈 **Per-block Rewards** — Earn 10 basis points per ledger block, accruing automatically on-chain
- 🗳️ **Quadratic Governance** — Create & vote on proposals; voting power = √(staked XLM) to prevent whale dominance
- 🔴 **Live Balances** — Real-time wallet & staked balance via Horizon API + Soroban RPC simulation
- 🔔 **Event Streaming** — On-chain events emitted for every deposit, withdraw, vote, and reward claim
- ⚙️ **CI/CD Pipeline** — Full GitHub Actions pipeline: test → build WASM → deploy contract → deploy Vercel

---

## 📐 Architecture

```
steller-live-poll/
├── contracts/
│   └── stellar_vault/
│       └── src/lib.rs          # Soroban smart contract (Rust)
│                               # 7 unit tests, all passing
├── frontend/
│   ├── src/
│   │   ├── components/         # Header, StakePanel, GovernPanel, etc.
│   │   ├── hooks/
│   │   │   └── useVault.ts     # All contract interaction & state
│   │   ├── lib/
│   │   │   └── stellar.ts      # Stellar SDK wrapper, Freighter API
│   │   └── test/               # Integration & UI tests
│   └── vite.config.ts
├── .github/
│   └── workflows/
│       └── ci.yml              # 4-job CI/CD pipeline
└── README.md
```

---

## 🔐 Smart Contract Features (`contracts/stellar_vault/src/lib.rs`)

### Inter-Contract Communication
The contract communicates with the **Stellar Asset Contract (SAC)** to handle real XLM deposits, withdrawals, and voting fees dynamically on-chain.

### Governance: Quadratic Voting
Voting power is calculated as `sqrt(staked_balance)`, preventing whale dominance while still rewarding committed stakers.

---

## 🧪 Tests

### Contract Tests (7 tests — all passing)

```
test tests::test_initialize                    ... ok
test tests::test_deposit_and_withdraw          ... ok
test tests::test_vault_stats_staker_count      ... ok
test tests::test_governance_proposal_and_vote  ... ok
test tests::test_vault_closed_prevents_deposit ... ok
test tests::test_cannot_withdraw_more_than_balance ... ok
test tests::test_non_admin_cannot_close_vault  ... ok
```

### Frontend Tests (36 tests — all passing)

```
✓ src/test/components.test.tsx  (11 tests)
✓ src/test/stellar.test.ts      (25 tests | 3 skipped)

Test Files: 2 passed
Tests:      36 passed | 3 skipped
```

---

## ⚙️ CI/CD Pipeline (`.github/workflows/ci.yml`)

Every push to `main` triggers 4 jobs automatically:
1. **Contract Tests** (`cargo test`)
2. **Frontend Tests** (Vitest)
3. **Deploy Contract** (Builds WASM & deploys to Stellar Testnet)
4. **Deploy Frontend** (Deploys to Vercel with the newly generated `CONTRACT_ID`)

---


