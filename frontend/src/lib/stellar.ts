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
  scValToNative,
  xdr,
  Contract,
  Account,
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
  walletBalance: bigint;
  pendingRewards: bigint;
  hasVoted: Record<number, boolean>;
}
// Helper to simulate read queries without needing a real user sequence
async function simulateQuery(method: string, args: xdr.ScVal[] = [], sourceAccount = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4') {
  try {
    const account = new Account(sourceAccount, "0");
    const contract = new Contract(CONTRACT_ID);
    const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: NETWORK.networkPassphrase })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30).build();
    const sim = await rpcServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationSuccess(sim)) {
      return scValToNative(sim.result.retval);
    }
  } catch (e) {
    console.warn(`Query failed for ${method}`, e);
  }
  return null;
}

export async function fetchVaultStats(): Promise<VaultStats> {
  const stats = await simulateQuery("get_vault_stats");
  if (stats) {
    return {
      totalDeposited: stats.total_deposited,
      totalWithdrawn: stats.total_withdrawn,
      totalStakers: stats.total_stakers,
      vaultOpen: stats.vault_open,
      rewardRate: stats.reward_rate,
    };
  }
  // Fallback to zeros if contract not readable yet
  return {
    totalDeposited: 0n,
    totalWithdrawn: 0n,
    totalStakers: 0,
    vaultOpen: true,
    rewardRate: 10,
  };
}

export async function fetchProposals(): Promise<Proposal[]> {
  const countRes = await simulateQuery("get_proposal_count");
  if (!countRes) return [];
  
  const count = Number(countRes);
  const props: Proposal[] = [];
  for (let i = 1; i <= count; i++) {
    const p = await simulateQuery("get_proposal", [nativeToScVal(i, { type: 'u64' })]);
    if (p) {
      props.push({
        id: Number(p.id),
        title: p.title,
        description: p.description,
        proposer: p.proposer,
        votesFor: Number(p.votes_for),
        votesAgainst: Number(p.votes_against),
        active: p.active,
        createdAt: Number(p.created_at) * 1000,
      });
    }
  }
  return props.sort((a,b) => b.id - a.id);
}

export async function connectWallet(): Promise<string> {
  if (await isConnected()) {
    const res = await requestAccess();
    if (res.error) throw new Error(res.error);
    return res.address;
  }
  throw new Error("Freighter is not installed");
}

export async function fetchUserPosition(address: string): Promise<UserPosition> {
  let walletBalance = 0n;
  try {
    const res = await fetch(`${NETWORK.horizonUrl}/accounts/${address}`);
    if (res.ok) {
      const data = await res.json();
      const nativeBal = data.balances.find((b: any) => b.asset_type === "native");
      if (nativeBal) {
        walletBalance = xlmToStroops(parseFloat(nativeBal.balance));
      }
    }
  } catch (e) {
    console.warn("Horizon fetch failed", e);
  }

  let stakedBalance = 0n;
  let pendingRewards = 0n;

  const balRes = await simulateQuery("get_balance", [new Address(address).toScVal()], address);
  if (balRes !== null) stakedBalance = balRes;

  const rewRes = await simulateQuery("get_pending_rewards", [new Address(address).toScVal()], address);
  if (rewRes !== null) pendingRewards = rewRes;

  return {
    balance: stakedBalance,
    walletBalance,
    pendingRewards,
    hasVoted: {}, // To fetch if needed
  };
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
  const signRes = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK.networkPassphrase });
  if (signRes.error) throw new Error(signRes.error);
  
  const signedTx = TransactionBuilder.fromXDR(signRes.signedTxXdr, NETWORK.networkPassphrase);
  
  const sendRes = await rpcServer.sendTransaction(signedTx as any);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  return sendRes.hash;
}

export async function deposit(amount: bigint, userAddress: string): Promise<string> {
  const account = await rpcServer.getAccount(userAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK.networkPassphrase })
    .addOperation(
      contract.call("deposit",
        new Address(userAddress).toScVal(),
        nativeToScVal(amount, { type: 'i128' })
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  const signRes = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK.networkPassphrase });
  if (signRes.error) throw new Error(signRes.error);
  
  const signedTx = TransactionBuilder.fromXDR(signRes.signedTxXdr, NETWORK.networkPassphrase);
  
  const sendRes = await rpcServer.sendTransaction(signedTx as any);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  return sendRes.hash;
}

export async function withdraw(amount: bigint, userAddress: string): Promise<string> {
  const account = await rpcServer.getAccount(userAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK.networkPassphrase })
    .addOperation(
      contract.call("withdraw",
        new Address(userAddress).toScVal(),
        nativeToScVal(amount, { type: 'i128' })
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  const signRes = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK.networkPassphrase });
  if (signRes.error) throw new Error(signRes.error);
  
  const signedTx = TransactionBuilder.fromXDR(signRes.signedTxXdr, NETWORK.networkPassphrase);
  
  const sendRes = await rpcServer.sendTransaction(signedTx as any);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  return sendRes.hash;
}

export async function claimRewards(userAddress: string): Promise<{ hash: string; amount: bigint }> {
  const account = await rpcServer.getAccount(userAddress);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK.networkPassphrase })
    .addOperation(
      contract.call("claim_rewards",
        new Address(userAddress).toScVal()
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  const signRes = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK.networkPassphrase });
  if (signRes.error) throw new Error(signRes.error);
  
  const signedTx = TransactionBuilder.fromXDR(signRes.signedTxXdr, NETWORK.networkPassphrase);
  
  const sendRes = await rpcServer.sendTransaction(signedTx as any);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  return { hash: sendRes.hash, amount: 0n };
}

export async function createProposal(title: string, description: string, address: string): Promise<number> {
  const account = await rpcServer.getAccount(address);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK.networkPassphrase })
    .addOperation(
      contract.call("create_proposal",
        new Address(address).toScVal(),
        nativeToScVal(title, { type: 'string' }),
        nativeToScVal(description, { type: 'string' })
      )
    )
    .setTimeout(60)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(tx);
  const signRes = await signTransaction(preparedTx.toXDR(), { networkPassphrase: NETWORK.networkPassphrase });
  if (signRes.error) throw new Error(signRes.error);
  
  const signedTx = TransactionBuilder.fromXDR(signRes.signedTxXdr, NETWORK.networkPassphrase);
  
  const sendRes = await rpcServer.sendTransaction(signedTx as any);
  if (sendRes.status === "ERROR") throw new Error("Transaction failed to submit");
  
  return 0; // Returning 0 since we'll refetch proposals anyway
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
