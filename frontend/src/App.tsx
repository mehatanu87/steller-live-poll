import React from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { StakePanel } from './components/StakePanel';
import { GovernPanel } from './components/GovernPanel';
import { ActivityChart } from './components/ActivityChart';
import { ToastContainer } from './components/Toast';
import { useVault } from './hooks/useVault';
import { CONTRACT_ID, NETWORK, shortenAddress } from './lib/stellar';
import { Shield, Github, ExternalLink, Hexagon } from 'lucide-react';

export default function App() {
  const vault = useVault();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        connected={vault.connected}
        address={vault.address}
        balance={vault.position?.walletBalance}
        loading={vault.loading}
        onConnect={vault.connect}
        onDisconnect={vault.disconnect}
      />

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(0,229,255,0.04) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '48px 0 32px',
      }}>
        <div className="container">
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="badge badge-cyan">
                <span className="pulse-dot" style={{ background: 'var(--cyan)' }} />
                Live on Stellar {NETWORK.name}
              </span>
            </div>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14 }}>
              Stake. Earn. <span className="gradient-text">Govern.</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(14px, 2vw, 17px)', lineHeight: 1.65, maxWidth: 480 }}>
              A production-grade Soroban smart contract for XLM staking with real-time rewards, 
              quadratic governance, and fully on-chain proposal voting.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px' }}>
                <Shield size={12} style={{ color: 'var(--emerald)' }} />
                {shortenAddress(CONTRACT_ID)}
              </div>
              <a
                href={`${NETWORK.explorerUrl}/contract/${CONTRACT_ID}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <ExternalLink size={12} />
                Explorer
              </a>
              <a
                href="https://github.com/yourusername/stellar-vault"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-sm"
              >
                <Github size={12} />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: '32px 0 64px' }}>
        <div className="container">
          {/* Stats */}
          <StatsBar stats={vault.stats} loading={vault.statsLoading} />

          {/* Chart */}
          <div style={{ marginTop: 24 }}>
            <ActivityChart />
          </div>

          {/* Two-column layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr)',
            gap: 24,
            marginTop: 24,
            alignItems: 'start',
          }}
          className="main-grid"
          >
            <StakePanel
              connected={vault.connected}
              position={vault.position}
              loading={vault.loading}
              onDeposit={vault.handleDeposit}
              onWithdraw={vault.handleWithdraw}
              onClaim={vault.handleClaimRewards}
            />
            <GovernPanel
              proposals={vault.proposals}
              position={vault.position}
              connected={vault.connected}
              loading={vault.loading}
              onCreateProposal={vault.handleCreateProposal}
              onVote={vault.handleVote}
            />
          </div>

          {/* Contract info */}
          <div className="card" style={{ padding: 20, marginTop: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <InfoItem label="Contract ID" value={shortenAddress(CONTRACT_ID)} mono />
              <InfoItem label="Network" value={NETWORK.name} />
              <InfoItem label="Reward Rate" value="10 bps/block" />
              <InfoItem label="Voting Mechanism" value="Quadratic Voting" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 0',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Hexagon size={14} style={{ color: 'var(--cyan)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>StellarVault</span>
            <span>· Built on Soroban</span>
          </div>
          <div>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginLeft: 20 }}>Docs</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginLeft: 20 }}>Audit</a>
            <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginLeft: 20 }}>GitHub</a>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={vault.toasts} onRemove={vault.removeToast} />

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
          .main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-display)', fontWeight: 500, color: 'var(--text-secondary)' }}>{value}</div>
    </div>
  );
}
