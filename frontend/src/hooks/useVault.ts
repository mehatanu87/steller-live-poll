import { useState, useEffect, useCallback } from 'react';
import {
  fetchVaultStats, fetchUserPosition,
  deposit, withdraw, claimRewards,
  fetchProposals, createProposal, vote, connectWallet,
  VaultStats, UserPosition, Proposal,
  xlmToStroops,
} from '../lib/stellar';

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  txHash?: string;
}

let toastCounter = 0;

export function useVault() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress]     = useState('');
  const [stats, setStats]         = useState<VaultStats | null>(null);
  const [position, setPosition]   = useState<UserPosition | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const addToast = useCallback((type: Toast['type'], message: string, txHash?: string) => {
    const id = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id, type, message, txHash }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([fetchVaultStats(), fetchProposals()]);
      setStats(s);
      setProposals(p);
    } catch {
      // silent
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const refreshPosition = useCallback(async () => {
    if (!address) return;
    const pos = await fetchUserPosition(address);
    setPosition(pos);
    return pos;
  }, [address]);

  // Keeps retrying until a specific position field actually changes (Horizon/RPC needs 1-3s after tx)
  const refreshPositionUntilChanged = useCallback(async (
    oldValue?: bigint,
    field: 'walletBalance' | 'balance' | 'pendingRewards' = 'walletBalance'
  ) => {
    if (!address) return;
    for (let i = 0; i < 10; i++) {
      const pos = await fetchUserPosition(address);
      if (oldValue === undefined || pos[field] !== oldValue) {
        setPosition(pos);
        return;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    // Fallback: set whatever we last fetched
    await refreshPosition();
  }, [address, refreshPosition]);

  useEffect(() => { refreshStats(); }, [refreshStats]);
  
  useEffect(() => {
    if (!address) return;
    refreshPosition();
    // Refresh balance often to catch external incoming txs
    const iv = setInterval(refreshPosition, 5000);
    return () => clearInterval(iv);
  }, [address, refreshPosition]);

  // Poll stats every 15s
  useEffect(() => {
    const iv = setInterval(refreshStats, 15_000);
    return () => clearInterval(iv);
  }, [refreshStats]);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const pubKey = await connectWallet();
      setConnected(true);
      setAddress(pubKey);
      const pos = await fetchUserPosition(pubKey);
      setPosition(pos);
      addToast('success', 'Wallet connected successfully');
    } catch (e: any) {
      addToast('error', e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress('');
    setPosition(null);
    addToast('info', 'Wallet disconnected');
  }, [addToast]);

  const handleDeposit = useCallback(async (xlmAmount: number) => {
    if (!address) return;
    setLoading(true);
    const oldStaked = position?.balance; // deposit updates contract staked balance, NOT wallet
    const pendingId = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id: pendingId, type: 'info', message: `Confirming deposit of ${xlmAmount} XLM…` }]);
    try {
      const stroops = xlmToStroops(xlmAmount);
      const hash = await deposit(stroops, address);
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      await refreshStats();
      await refreshPositionUntilChanged(oldStaked, 'balance');
      addToast('success', `Deposited ${xlmAmount} XLM`, hash);
      return hash;
    } catch (err: unknown) {
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, position, addToast, refreshStats, refreshPositionUntilChanged]);

  const handleWithdraw = useCallback(async (xlmAmount: number) => {
    if (!address) return;
    setLoading(true);
    const oldStaked = position?.balance; // withdraw updates contract staked balance, NOT wallet
    const pendingId = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id: pendingId, type: 'info', message: `Confirming withdrawal of ${xlmAmount} XLM…` }]);
    try {
      const stroops = xlmToStroops(xlmAmount);
      const hash = await withdraw(stroops, address);
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      await refreshStats();
      await refreshPositionUntilChanged(oldStaked, 'balance');
      addToast('success', `Withdrew ${xlmAmount} XLM`, hash);
      return hash;
    } catch (err: unknown) {
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      const msg = err instanceof Error ? err.message : 'Withdraw failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, position, addToast, refreshStats, refreshPositionUntilChanged]);

  const handleClaimRewards = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const oldRewards = position?.pendingRewards; // claimRewards clears pending rewards
    const pendingId = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id: pendingId, type: 'info', message: 'Confirming reward claim…' }]);
    try {
      const { hash, amount } = await claimRewards(address);
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      await refreshPositionUntilChanged(oldRewards, 'pendingRewards');
      addToast('success', `Claimed rewards`, hash);
      return hash;
    } catch (err: unknown) {
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      const msg = err instanceof Error ? err.message : 'Claim failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, position, addToast, refreshPositionUntilChanged]);

  const handleCreateProposal = useCallback(async (title: string, description: string) => {
    if (!address) return;
    setLoading(true);
    const pendingId = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id: pendingId, type: 'info', message: 'Confirming proposal creation…' }]);
    try {
      const id = await createProposal(title, description, address);
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      await refreshStats(); // refreshStats fetches proposals too
      addToast('success', `Proposal created successfully`);
      return id;
    } catch (err: unknown) {
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      const msg = err instanceof Error ? err.message : 'Create proposal failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, addToast, refreshStats]);

  const handleVote = useCallback(async (proposalId: number, voteFor: boolean) => {
    if (!address) return;
    setLoading(true);
    const oldWallet = position?.walletBalance; // vote deducts 1 XLM fee from actual wallet
    const pendingId = `toast-${++toastCounter}`;
    setToasts(prev => [...prev, { id: pendingId, type: 'info', message: `Confirming vote on Proposal #${proposalId}…` }]);
    try {
      const hash = await vote(proposalId, voteFor, address);
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      await refreshStats(); // fetches updated proposal votes
      await refreshPositionUntilChanged(oldWallet, 'walletBalance'); // waits for 1 XLM fee to reflect
      addToast('success', `Vote cast on Proposal #${proposalId}`, hash);
      return hash;
    } catch (err: unknown) {
      setToasts(prev => prev.filter(t => t.id !== pendingId));
      const msg = err instanceof Error ? err.message : 'Vote failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [address, position, addToast, refreshStats, refreshPositionUntilChanged]);

  return {
    connected, address, stats, position, proposals,
    loading, statsLoading, toasts, removeToast,
    connect, disconnect,
    handleDeposit, handleWithdraw, handleClaimRewards,
    handleCreateProposal, handleVote,
  };
}
