import { useState, useEffect, useCallback } from 'react';
import {
  fetchVaultStats, fetchUserPosition,
  deposit, withdraw, claimRewards,
  fetchProposals, createProposal, vote,
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

// ─── Wallet mock (replace with Freighter SDK) ─────────────────────────────────

const DEMO_ADDRESS = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4';

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
  }, [address]);

  useEffect(() => { refreshStats(); }, [refreshStats]);
  useEffect(() => {
    if (!address) return;
    refreshPosition();
    const iv = setInterval(refreshPosition, 8000);
    return () => clearInterval(iv);
  }, [address, refreshPosition]);

  // Poll stats every 15s
  useEffect(() => {
    const iv = setInterval(refreshStats, 15_000);
    return () => clearInterval(iv);
  }, [refreshStats]);

  const connect = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setConnected(true);
    setAddress(DEMO_ADDRESS);
    const pos = await fetchUserPosition(DEMO_ADDRESS);
    setPosition(pos);
    setLoading(false);
    addToast('success', 'Wallet connected successfully');
  }, [addToast]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress('');
    setPosition(null);
    addToast('info', 'Wallet disconnected');
  }, [addToast]);

  const handleDeposit = useCallback(async (xlmAmount: number) => {
    setLoading(true);
    try {
      const stroops = xlmToStroops(xlmAmount);
      const hash = await deposit(stroops);
      await refreshStats();
      await refreshPosition();
      addToast('success', `Deposited ${xlmAmount} XLM`, hash);
      return hash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deposit failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast, refreshStats, refreshPosition]);

  const handleWithdraw = useCallback(async (xlmAmount: number) => {
    setLoading(true);
    try {
      const stroops = xlmToStroops(xlmAmount);
      const hash = await withdraw(stroops);
      await refreshStats();
      await refreshPosition();
      addToast('success', `Withdrew ${xlmAmount} XLM`, hash);
      return hash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Withdraw failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast, refreshStats, refreshPosition]);

  const handleClaimRewards = useCallback(async () => {
    setLoading(true);
    try {
      const { hash, amount } = await claimRewards();
      await refreshPosition();
      addToast('success', `Claimed ${Number(amount) / 10_000_000} XLM rewards`, hash);
      return hash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Claim failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast, refreshPosition]);

  const handleCreateProposal = useCallback(async (title: string, description: string) => {
    setLoading(true);
    try {
      const id = await createProposal(title, description, address);
      await refreshStats();
      addToast('success', `Proposal #${id} created`);
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Create proposal failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast, address, refreshStats]);

  const handleVote = useCallback(async (proposalId: number, voteFor: boolean) => {
    setLoading(true);
    try {
      const hash = await vote(proposalId, voteFor);
      await refreshStats();
      await refreshPosition();
      addToast('success', `Vote cast on Proposal #${proposalId}`, hash);
      return hash;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vote failed';
      addToast('error', msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addToast, refreshStats, refreshPosition]);

  return {
    connected, address, stats, position, proposals,
    loading, statsLoading, toasts, removeToast,
    connect, disconnect,
    handleDeposit, handleWithdraw, handleClaimRewards,
    handleCreateProposal, handleVote,
  };
}
