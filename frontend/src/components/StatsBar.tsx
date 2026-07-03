import { TrendingUp, Users, Lock, Zap } from 'lucide-react';
import { VaultStats, formatXLM } from '../lib/stellar';

interface StatsBarProps {
  stats: VaultStats | null;
  loading: boolean;
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  const tvl = stats ? stats.totalDeposited - stats.totalWithdrawn : 0n;

  const items = [
    {
      icon: <Lock size={18} style={{ color: 'var(--cyan)' }} />,
      label: 'Total Value Locked',
      value: stats ? `${formatXLM(tvl)} XLM` : '—',
      accent: 'var(--cyan)',
    },
    {
      icon: <Users size={18} style={{ color: 'var(--violet)' }} />,
      label: 'Active Stakers',
      value: stats ? stats.totalStakers.toLocaleString() : '—',
      accent: 'var(--violet)',
    },
    {
      icon: <TrendingUp size={18} style={{ color: 'var(--emerald)' }} />,
      label: 'Total Deposited',
      value: stats ? `${formatXLM(stats.totalDeposited)} XLM` : '—',
      accent: 'var(--emerald)',
    },
    {
      icon: <Zap size={18} style={{ color: 'var(--amber)' }} />,
      label: 'Reward Rate',
      value: stats ? `${stats.rewardRate} bps/block` : '—',
      accent: 'var(--amber)',
    },
  ];

  return (
    <div id="dashboard" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 16,
      marginTop: 32,
    }}>
      {items.map(({ icon, label, value, accent }) => (
        <div key={label} className="card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
          {/* Subtle glow accent */}
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 100, height: 100, borderRadius: '50%',
            background: accent, opacity: 0.04,
            pointerEvents: 'none',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36,
              background: `${accent}15`,
              border: `1px solid ${accent}30`,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {icon}
            </div>
            <span className="stat-label">{label}</span>
          </div>
          {loading ? (
            <div style={{ height: 28, background: 'var(--bg-elevated)', borderRadius: 6, width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <div className="stat-value" style={{ color: accent }}>{value}</div>
          )}
        </div>
      ))}
    </div>
  );
}
