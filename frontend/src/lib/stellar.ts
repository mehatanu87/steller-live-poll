import {
  isConnected,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";
import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Address,
  nativeToScVal,
  xdr,
  Contract,
} from "@stellar/stellar-sdk";

export const NETWORK = {
  name: 'TESTNET',
  networkPassphrase: Networks.TESTNET,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  horizonUrl: 'https://horizon-testnet.stellar.org',
  explorerUrl: 'https://stellar.expert/explorer/testnet',
} as const;

export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  'CBLBZWNHE26XAVUK6SRWFBCGKSRNEWPFGRHYTLXPKKSZO2VEQVN2PLYP';

export const rpcServer = new SorobanRpc.Server(NETWORK.rpcUrl);

export type TxStatus = 'idle' | 'pending' | 'success' | 'error';

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

// Keep stats and proposals mocked for demo UI, but we fetch REAL balance and submit REAL txs
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
    description: 'Proposal to boost staking incentives by raising the per-block reward rate from 10 to 15 basis points.',
    proposer: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4',
    votesFor: 87,
    votesAgainst: 23,
    active: true,
    createdAt: Date.now() - 86_400_000,
  }
];

export async function fetchVaultStats(): Promise<VaultStats> {
  return _stats;
}

export async function fetchProposals(): Promise<Proposal[]> {
  return _proposals;
}

export async function connectWallet(): Promise<string> {
  if (await isConnected()) {
    const pubKey = await requestAccess();
    return pubKey;
  }
  throw new Error("Freighter is not installed");
}

export async function fetchUserPosition(address: string): Promise<UserPosition> {
  try {
    const res = await fetch(`${NETWORK.horizonUrl}/accounts/${address}`);
    if (!res.ok) return { balance: 0n, pendingRewards: 0n, hasVoted: {} };
    const data = await res.json();
    const nativeBal = data.balances.find((b: any) => b.asset_type === "native");
    return {
      balance: nativeBal ? xlmToStroops(parseFloat(nativeBal.balance)) : 0n,
      pendingRewards: 0n,
      hasVoted: {},
    };
  } catch (e) {
    return { balance: 0n, pendingRewards: 0n, hasVoted: {} };
  }
}

export async function vote(proposalId: number, voteFor: boolean, userAddress: string): Promise<string> {
  const account = await rpcServer.getAccount(userAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK.networkPassphrase })
    .addOperation(
      contract.call("vote",
        new Address(userAddress).toScVal(),
        nativeToScVal(proposalId, { type: 'u64' }),
        nativeToScVal(voteFor, { type: 'bool' })
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  const signedTxStr = await signTransaction(preparedTx.toXDR(), { network: NETWORK.name });
  const signedTx = xdr.TransactionEnvelope.fromXDR(signedTxStr, "base64");
  
  const sendRes = await rpcServer.sendTransaction(signedTx);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  const p = _proposals.find(p => p.id === proposalId);
  if (p) {
    if (voteFor) p.votesFor += 1;
    else p.votesAgainst += 1;
  }
  
  return sendRes.hash;
}

export async function deposit(amount: bigint, userAddress: string): Promise<string> {
  throw new Error("Deposit not yet implemented for real wallet integration.");
}

export async function withdraw(amount: bigint, userAddress: string): Promise<string> {
  throw new Error("Withdraw not yet implemented for real wallet integration.");
}

export async function claimRewards(userAddress: string): Promise<{ hash: string; amount: bigint }> {
  throw new Error("Claim not yet implemented for real wallet integration.");
}

export async function createProposal(title: string, description: string, address: string): Promise<number> {
  throw new Error("Create Proposal not yet implemented for real wallet integration.");
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
