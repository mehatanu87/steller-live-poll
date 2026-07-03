// ─── Stellar / Soroban Integration ───────────────────────────────────────────
// Wraps all contract calls and wallet interactions in a clean, typed API.

export const NETWORK = {
  name: 'TESTNET',
  networkPassphrase: 'Test SDF Network ; September 2015',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  explorerUrl: 'https://stellar.expert/explorer/testnet',
} as const;

export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

// Simulated on-chain state for demo (no real wallet required to explore UI)
export interface VaultStats {
  totalDeposited: bigint;
  totalWithdrawn: bigint;
  totalStakers: number;
  vaultOpen: boolean;
  rewardRate: number;
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  proposer: string;
  votesFor: number;
  votesAgainst: number;
  active: boolean;
  createdAt: number;
}

export interface UserPosition {
  balance: bigint;
  pendingRewards: bigint;
  hasVoted: Record<number, boolean>;
}

// ─── Mock contract state (swapped for real soroban calls in production) ────

let _stats: VaultStats = {
  totalDeposited: BigInt(2_847_000_000),
  totalWithdrawn:  BigInt(318_000_000),
  totalStakers: 142,
  vaultOpen: true,
  rewardRate: 10,
};

let _proposals: Proposal[] = [
  {
    id: 1,
    title: 'Increase Reward Rate to 15 bps',
    description: 'Proposal to boost staking incentives by raising the per-block reward rate from 10 to 15 basis points, attracting deeper liquidity.',
    proposer: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4',
    votesFor: 87,
    votesAgainst: 23,
    active: true,
    createdAt: Date.now() - 86_400_000,
  },
  {
    id: 2,
    title: 'Add Emergency Withdrawal Feature',
    description: 'Enable a 48-hour cooldown emergency withdrawal for stakers, capped at 10% penalty, to improve protocol safety during black swan events.',
    proposer: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W3',
    votesFor: 54,
    votesAgainst: 61,
    active: true,
    createdAt: Date.now() - 172_800_000,
  },
  {
    id: 3,
    title: 'Treasury Diversification into USDC',
    description: 'Allocate 20% of protocol treasury into USDC to hedge XLM volatility and fund future development milestones.',
    proposer: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W3',
    votesFor: 128,
    votesAgainst: 11,
    active: false,
    createdAt: Date.now() - 432_000_000,
  },
];

let _userPos: UserPosition = {
  balance: BigInt(0),
  pendingRewards: BigInt(0),
  hasVoted: {},
};

let _txCount = 0;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const fakeHash = () => Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchVaultStats(): Promise<VaultStats> {
  await sleep(400);
  return { ..._stats };
}

export async function fetchUserPosition(address: string): Promise<UserPosition> {
  await sleep(300);
  // Simulate small reward accrual
  if (_userPos.balance > 0n) {
    _userPos.pendingRewards += BigInt(Math.floor(Math.random() * 1000));
  }
  return { ..._userPos, hasVoted: { ..._userPos.hasVoted } };
}

export async function deposit(amount: bigint): Promise<string> {
  await sleep(1200);
  _userPos.balance += amount;
  _stats.totalDeposited += amount;
  if (_userPos.balance === amount) _stats.totalStakers += 1;
  _txCount++;
  return fakeHash();
}

export async function withdraw(amount: bigint): Promise<string> {
  await sleep(1200);
  if (_userPos.balance < amount) throw new Error('Insufficient balance');
  _userPos.balance -= amount;
  _stats.totalWithdrawn += amount;
  if (_userPos.balance === 0n && _stats.totalStakers > 0) _stats.totalStakers -= 1;
  _txCount++;
  return fakeHash();
}

export async function claimRewards(): Promise<{ hash: string; amount: bigint }> {
  await sleep(1200);
  if (_userPos.pendingRewards === 0n) throw new Error('No rewards to claim');
  const amount = _userPos.pendingRewards;
  _userPos.pendingRewards = 0n;
  _txCount++;
  return { hash: fakeHash(), amount };
}

export async function fetchProposals(): Promise<Proposal[]> {
  await sleep(350);
  return [..._proposals];
}

export async function createProposal(title: string, description: string, address: string): Promise<number> {
  await sleep(1500);
  if (_userPos.balance === 0n) throw new Error('Must have staked balance to propose');
  const id = _proposals.length + 1;
  _proposals.unshift({
    id, title, description,
    proposer: address,
    votesFor: 0,
    votesAgainst: 0,
    active: true,
    createdAt: Date.now(),
  });
  return id;
}

export async function vote(proposalId: number, voteFor: boolean): Promise<string> {
  await sleep(1000);
  if (_userPos.balance === 0n) throw new Error('Must have staked balance to vote');
  if (_userPos.hasVoted[proposalId]) throw new Error('Already voted');
  const p = _proposals.find(p => p.id === proposalId);
  if (!p) throw new Error('Proposal not found');
  if (!p.active) throw new Error('Proposal is closed');
  const power = Math.floor(Math.sqrt(Number(_userPos.balance / 10_000_000n)));
  if (voteFor) p.votesFor += Math.max(1, power);
  else p.votesAgainst += Math.max(1, power);
  _userPos.hasVoted[proposalId] = true;
  return fakeHash();
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export const stroopsToXLM = (stroops: bigint): number =>
  Number(stroops) / 10_000_000;

export const xlmToStroops = (xlm: number): bigint =>
  BigInt(Math.round(xlm * 10_000_000));

export const formatXLM = (stroops: bigint, decimals = 2): string =>
  stroopsToXLM(stroops).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const shortenAddress = (addr: string): string =>
  addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;

export const explorerTxLink = (hash: string) =>
  `${NETWORK.explorerUrl}/tx/${hash}`;
