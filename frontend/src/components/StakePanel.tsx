import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Gift, Info } from 'lucide-react';
import { UserPosition, formatXLM } from '../lib/stellar';

interface StakePanelProps {
  connected: boolean;
  position: UserPosition | null;
  loading: boolean;
  onDeposit: (amount: number) => Promise<string | undefined>;
  onWithdraw: (amount: number) => Promise<string | undefined>;
  onClaim: () => Promise<string | undefined>;
}

type Mode = 'deposit' | 'withdraw';

export function StakePanel({ connected, position, loading, onDeposit, onWithdraw, onClaim }: StakePanelProps) {
  const [mode, setMode] = useState<Mode>('deposit');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const balance = position?.balance ?? 0n;
  const rewards = position?.pendingRewards ?? 0n;
  const balanceXLM = Number(balance) / 10_000_000;
  const rewardsXLM = Number(rewards) / 10_000_000;

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setBusy(true);
    try {
      if (mode === 'deposit') await onDeposit(val);
      else await onWithdraw(val);
      setAmount('');
    } finally {
      setBusy(false);
    }
  };

  const handleClaim = async () => {
    setBusy(true);
    try { await onClaim(); } finally { setBusy(false); }
  };

  const maxAmount = mode === 'withdraw' ? balanceXLM : undefined;

  return (
    <div id="stake" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Position card */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Your Position</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Staked balance &amp; accrued rewards</p>
          </div>
          {connected && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleClaim}
              disabled={!connected || busy || loading || rewards === 0n}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {busy ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <Gift size={13} />}
              Claim {rewardsXLM.toFixed(4)} XLM
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <PositionStat
            label="Staked Balance"
            value={connected ? `${formatXLM(balance)} XLM` : '—'}
            accent="var(--cyan)"
          />
          <PositionStat
            label="Pending Rewards"
            value={connected ? `${rewardsXLM.toFixed(6)} XLM` : '—'}
            accent="var(--emerald)"
          />
        </div>

        {!connected && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--text-muted)', fontSize: 13,
          }}>
            <Info size={14} style={{ flexShrink: 0 }} />
            Connect your wallet to see your position
          </div>
        )}
      </div>

      {/* Action card */}
      <div className="card" style={{ padding: 24 }}>
        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${mode === 'deposit' ? 'tab-active' : ''}`} onClick={() => setMode('deposit')}>
            <ArrowDownToLine size={13} style={{ display: 'inline', marginRight: 5 }} />
            Deposit
          </button>
          <button className={`tab ${mode === 'withdraw' ? 'tab-active' : ''}`} onClick={() => setMode('withdraw')}>
            <ArrowUpFromLine size={13} style={{ display: 'inline', marginRight: 5 }} />
            Withdraw
          </button>
        </div>

        {/* Amount input */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
              Amount (XLM)
            </label>
            {mode === 'withdraw' && connected && (
              <button
                onClick={() => setAmount(balanceXLM.toString())}
                style={{ fontSize: 11, color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                MAX {formatXLM(balance)}
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              type="number"
              min="0"
              max={maxAmount}
              step="0.1"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={!connected || busy}
              style={{ paddingRight: 52 }}
            />
            <span style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
            }}>XLM</span>
          </div>
        </div>

        {/* USD estimate */}
        {amount && parseFloat(amount) > 0 && (
          <div style={{ marginBottom: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            ≈ ${(parseFloat(amount) * 0.11).toFixed(2)} USD at current rate
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
          disabled={!connected || busy || loading || !amount || parseFloat(amount) <= 0}
        >
          {busy ? (
            <><span className="spinner" style={{ borderTopColor: '#080B14' }} />Processing…</>
          ) : mode === 'deposit' ? (
            <><ArrowDownToLine size={15} />Deposit XLM</>
          ) : (
            <><ArrowUpFromLine size={15} />Withdraw XLM</>
          )}
        </button>

        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Staking earns 10 bps per block. Rewards accrue in real-time and can be claimed at any time.
        </p>
      </div>
    </div>
  );
}

function PositionStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 700, color: accent, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}
