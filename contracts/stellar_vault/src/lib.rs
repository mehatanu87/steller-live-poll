#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype,
    Address, Env, String,
    symbol_short, log,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TotalDeposited,
    TotalWithdrawn,
    UserBalance(Address),
    UserDeposits(Address),
    UserRewards(Address),
    VaultOpen,
    RewardRate,
    LastRewardBlock,
    TotalStakers,
    Proposal(u64),
    ProposalCount,
    Vote(u64, Address),
}

// ─── Data Types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositRecord {
    pub amount: i128,
    pub timestamp: u64,
    pub block: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultStats {
    pub total_deposited: i128,
    pub total_withdrawn: i128,
    pub total_stakers: u32,
    pub vault_open: bool,
    pub reward_rate: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub description: String,
    pub proposer: Address,
    pub votes_for: u64,
    pub votes_against: u64,
    pub active: bool,
    pub created_at: u64,
}

// ─── Events ───────────────────────────────────────────────────────────────────

#[contracttype]
pub struct DepositEvent {
    pub user: Address,
    pub amount: i128,
    pub total_balance: i128,
    pub timestamp: u64,
}

#[contracttype]
pub struct WithdrawEvent {
    pub user: Address,
    pub amount: i128,
    pub remaining_balance: i128,
    pub timestamp: u64,
}

#[contracttype]
pub struct RewardClaimedEvent {
    pub user: Address,
    pub reward_amount: i128,
    pub timestamp: u64,
}

#[contracttype]
pub struct ProposalCreatedEvent {
    pub proposal_id: u64,
    pub proposer: Address,
    pub title: String,
}

#[contracttype]
pub struct VoteCastEvent {
    pub proposal_id: u64,
    pub voter: Address,
    pub vote_for: bool,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct StellarVault;

#[contractimpl]
impl StellarVault {
    // ── Initialization ──────────────────────────────────────────────────────

    /// Initialize the vault with an admin, reward rate (basis points per block).
    pub fn initialize(env: Env, admin: Address, reward_rate: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalDeposited, &0_i128);
        env.storage().instance().set(&DataKey::TotalWithdrawn, &0_i128);
        env.storage().instance().set(&DataKey::VaultOpen, &true);
        env.storage().instance().set(&DataKey::RewardRate, &reward_rate);
        env.storage().instance().set(&DataKey::TotalStakers, &0_u32);
        env.storage().instance().set(&DataKey::ProposalCount, &0_u64);
        env.storage().instance().set(
            &DataKey::LastRewardBlock,
            &env.ledger().sequence(),
        );

        log!(&env, "StellarVault initialized by {}", admin);
    }

    // ── Deposit ─────────────────────────────────────────────────────────────

    /// Deposit XLM (in stroops) into the vault.
    pub fn deposit(env: Env, user: Address, amount: i128) -> i128 {
        user.require_auth();
        Self::assert_vault_open(&env);

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(user.clone()))
            .unwrap_or(0);

        // Accrue pending rewards before changing balance
        Self::accrue_rewards(&env, &user, current_balance);

        let new_balance = current_balance + amount;
        env.storage()
            .persistent()
            .set(&DataKey::UserBalance(user.clone()), &new_balance);

        // Update total deposited
        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalDeposited)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalDeposited, &(total + amount));

        // Track staker count
        if current_balance == 0 {
            let stakers: u32 = env
                .storage()
                .instance()
                .get(&DataKey::TotalStakers)
                .unwrap_or(0);
            env.storage()
                .instance()
                .set(&DataKey::TotalStakers, &(stakers + 1));
        }

        // Emit event
        env.events().publish(
            (symbol_short!("deposit"), user.clone()),
            DepositEvent {
                user: user.clone(),
                amount,
                total_balance: new_balance,
                timestamp: env.ledger().timestamp(),
            },
        );

        new_balance
    }

    // ── Withdraw ────────────────────────────────────────────────────────────

    /// Withdraw XLM from the vault.
    pub fn withdraw(env: Env, user: Address, amount: i128) -> i128 {
        user.require_auth();
        Self::assert_vault_open(&env);

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(user.clone()))
            .unwrap_or(0);

        if current_balance < amount {
            panic!("insufficient balance");
        }

        // Accrue rewards before reducing balance
        Self::accrue_rewards(&env, &user, current_balance);

        let new_balance = current_balance - amount;
        env.storage()
            .persistent()
            .set(&DataKey::UserBalance(user.clone()), &new_balance);

        // Update total withdrawn
        let total_withdrawn: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalWithdrawn)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalWithdrawn, &(total_withdrawn + amount));

        // Decrement staker count if fully withdrawn
        if new_balance == 0 {
            let stakers: u32 = env
                .storage()
                .instance()
                .get(&DataKey::TotalStakers)
                .unwrap_or(1);
            if stakers > 0 {
                env.storage()
                    .instance()
                    .set(&DataKey::TotalStakers, &(stakers - 1));
            }
        }

        env.events().publish(
            (symbol_short!("withdraw"), user.clone()),
            WithdrawEvent {
                user: user.clone(),
                amount,
                remaining_balance: new_balance,
                timestamp: env.ledger().timestamp(),
            },
        );

        new_balance
    }

    // ── Claim Rewards ────────────────────────────────────────────────────────

    /// Claim accumulated staking rewards.
    pub fn claim_rewards(env: Env, user: Address) -> i128 {
        user.require_auth();

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(user.clone()))
            .unwrap_or(0);

        Self::accrue_rewards(&env, &user, balance);

        let rewards: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserRewards(user.clone()))
            .unwrap_or(0);

        if rewards == 0 {
            panic!("no rewards to claim");
        }

        env.storage()
            .persistent()
            .set(&DataKey::UserRewards(user.clone()), &0_i128);

        env.events().publish(
            (symbol_short!("reward"), user.clone()),
            RewardClaimedEvent {
                user: user.clone(),
                reward_amount: rewards,
                timestamp: env.ledger().timestamp(),
            },
        );

        rewards
    }

    // ── Governance ───────────────────────────────────────────────────────────

    /// Create a governance proposal. Requires staked balance > 0.
    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
    ) -> u64 {
        proposer.require_auth();

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(proposer.clone()))
            .unwrap_or(0);
        if balance == 0 {
            panic!("must have staked balance to propose");
        }

        let count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0);
        let proposal_id = count + 1;

        let proposal = Proposal {
            id: proposal_id,
            title: title.clone(),
            description,
            proposer: proposer.clone(),
            votes_for: 0,
            votes_against: 0,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCount, &proposal_id);

        env.events().publish(
            (symbol_short!("propose"), proposer.clone()),
            ProposalCreatedEvent {
                proposal_id,
                proposer,
                title,
            },
        );

        proposal_id
    }

    /// Vote on a governance proposal.
    pub fn vote(env: Env, voter: Address, proposal_id: u64, vote_for: bool) {
        voter.require_auth();

        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(voter.clone()))
            .unwrap_or(0);
        if balance == 0 {
            panic!("must have staked balance to vote");
        }

        let vote_key = DataKey::Vote(proposal_id, voter.clone());
        if env.storage().persistent().has(&vote_key) {
            panic!("already voted on this proposal");
        }

        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found");

        if !proposal.active {
            panic!("proposal is not active");
        }

        // Voting power = sqrt(staked balance) for quadratic voting
        let voting_power = Self::sqrt(balance as u64);

        if vote_for {
            proposal.votes_for += voting_power;
        } else {
            proposal.votes_against += voting_power;
        }

        env.storage()
            .instance()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().persistent().set(&vote_key, &vote_for);

        env.events().publish(
            (symbol_short!("vote"), voter.clone()),
            VoteCastEvent {
                proposal_id,
                voter,
                vote_for,
            },
        );
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// Toggle vault open/closed (admin only).
    pub fn set_vault_open(env: Env, caller: Address, open: bool) {
        caller.require_auth();
        Self::assert_admin(&env, &caller);
        env.storage().instance().set(&DataKey::VaultOpen, &open);
    }

    /// Update reward rate (admin only).
    pub fn set_reward_rate(env: Env, caller: Address, new_rate: u32) {
        caller.require_auth();
        Self::assert_admin(&env, &caller);
        env.storage().instance().set(&DataKey::RewardRate, &new_rate);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    pub fn get_balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::UserBalance(user))
            .unwrap_or(0)
    }

    pub fn get_pending_rewards(env: Env, user: Address) -> i128 {
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserBalance(user.clone()))
            .unwrap_or(0);
        let accrued: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserRewards(user))
            .unwrap_or(0);

        let reward_rate: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RewardRate)
            .unwrap_or(10);
        let last_block: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LastRewardBlock)
            .unwrap_or(0);
        let current_block = env.ledger().sequence();
        let blocks_elapsed = (current_block - last_block) as i128;
        let new_rewards = balance * reward_rate as i128 * blocks_elapsed / 10_000_i128;

        accrued + new_rewards
    }

    pub fn get_vault_stats(env: Env) -> VaultStats {
        VaultStats {
            total_deposited: env
                .storage()
                .instance()
                .get(&DataKey::TotalDeposited)
                .unwrap_or(0),
            total_withdrawn: env
                .storage()
                .instance()
                .get(&DataKey::TotalWithdrawn)
                .unwrap_or(0),
            total_stakers: env
                .storage()
                .instance()
                .get(&DataKey::TotalStakers)
                .unwrap_or(0),
            vault_open: env
                .storage()
                .instance()
                .get(&DataKey::VaultOpen)
                .unwrap_or(false),
            reward_rate: env
                .storage()
                .instance()
                .get(&DataKey::RewardRate)
                .unwrap_or(0),
        }
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        env.storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .expect("proposal not found")
    }

    pub fn get_proposal_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::ProposalCount)
            .unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized")
    }

    // ── Internal Helpers ─────────────────────────────────────────────────────

    fn assert_vault_open(env: &Env) {
        let open: bool = env
            .storage()
            .instance()
            .get(&DataKey::VaultOpen)
            .unwrap_or(false);
        if !open {
            panic!("vault is closed");
        }
    }

    fn assert_admin(env: &Env, caller: &Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        if admin != *caller {
            panic!("unauthorized: caller is not admin");
        }
    }

    fn accrue_rewards(env: &Env, user: &Address, balance: i128) {
        if balance == 0 {
            return;
        }
        let reward_rate: u32 = env
            .storage()
            .instance()
            .get(&DataKey::RewardRate)
            .unwrap_or(10);
        let last_block: u32 = env
            .storage()
            .instance()
            .get(&DataKey::LastRewardBlock)
            .unwrap_or(0);
        let current_block = env.ledger().sequence();
        if current_block <= last_block {
            return;
        }
        let blocks_elapsed = (current_block - last_block) as i128;
        let new_rewards = balance * reward_rate as i128 * blocks_elapsed / 10_000_i128;

        let existing: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::UserRewards(user.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::UserRewards(user.clone()), &(existing + new_rewards));
        env.storage()
            .instance()
            .set(&DataKey::LastRewardBlock, &current_block);
    }

    /// Integer square root (for quadratic voting power)
    fn sqrt(n: u64) -> u64 {
        if n == 0 {
            return 0;
        }
        let mut x = n;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }
        x
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, Address, String};

    fn setup_env() -> (Env, Address, StellarVaultClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, StellarVault);
        let client = StellarVaultClient::new(&env, &contract_id);
        client.initialize(&admin, &10u32);
        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, admin, client) = setup_env();
        let stats = client.get_vault_stats();
        assert!(stats.vault_open);
        assert_eq!(stats.total_deposited, 0);
        assert_eq!(stats.reward_rate, 10);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    fn test_deposit_and_withdraw() {
        let (env, _admin, client) = setup_env();
        let user = Address::generate(&env);

        // Deposit
        let balance_after_deposit = client.deposit(&user, &1_000_000_i128);
        assert_eq!(balance_after_deposit, 1_000_000);
        assert_eq!(client.get_balance(&user), 1_000_000);

        // Partial withdraw
        let balance_after_withdraw = client.withdraw(&user, &400_000_i128);
        assert_eq!(balance_after_withdraw, 600_000);
        assert_eq!(client.get_balance(&user), 600_000);

        // Check vault stats
        let stats = client.get_vault_stats();
        assert_eq!(stats.total_deposited, 1_000_000);
        assert_eq!(stats.total_withdrawn, 400_000);
    }

    #[test]
    fn test_vault_stats_staker_count() {
        let (env, _admin, client) = setup_env();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.deposit(&user1, &500_000_i128);
        client.deposit(&user2, &300_000_i128);
        assert_eq!(client.get_vault_stats().total_stakers, 2);

        client.withdraw(&user1, &500_000_i128);
        assert_eq!(client.get_vault_stats().total_stakers, 1);
    }

    #[test]
    fn test_governance_proposal_and_vote() {
        let (env, _admin, client) = setup_env();
        let proposer = Address::generate(&env);
        let voter = Address::generate(&env);

        // Need stake to propose/vote
        client.deposit(&proposer, &1_000_000_i128);
        client.deposit(&voter, &2_000_000_i128);

        let title = String::from_str(&env, "Increase Reward Rate");
        let desc = String::from_str(&env, "Proposal to increase reward rate from 10 to 20 bps");
        let proposal_id = client.create_proposal(&proposer, &title, &desc);
        assert_eq!(proposal_id, 1);

        client.vote(&voter, &1u64, &true);
        client.vote(&proposer, &1u64, &false);

        let proposal = client.get_proposal(&1u64);
        assert!(proposal.votes_for > 0);
        assert!(proposal.votes_against > 0);
        assert_eq!(proposal.id, 1);
    }

    #[test]
    #[should_panic]
    fn test_vault_closed_prevents_deposit() {
        let (env, admin, client) = setup_env();
        let user = Address::generate(&env);

        client.set_vault_open(&admin, &false);
        client.deposit(&user, &100_000_i128);
    }

    #[test]
    #[should_panic]
    fn test_cannot_withdraw_more_than_balance() {
        let (env, _admin, client) = setup_env();
        let user = Address::generate(&env);
        client.deposit(&user, &100_000_i128);
        client.withdraw(&user, &999_999_i128);
    }

    #[test]
    #[should_panic]
    fn test_non_admin_cannot_close_vault() {
        let (env, _admin, client) = setup_env();
        let attacker = Address::generate(&env);
        client.set_vault_open(&attacker, &false);
    }
}
