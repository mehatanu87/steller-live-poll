import React from 'react';
import { Wallet, Hexagon, ChevronDown, ExternalLink, LogOut, Copy } from 'lucide-react';
import { shortenAddress, NETWORK } from '../lib/stellar';

interface HeaderProps {
  connected: boolean;
  address: string;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function Header({ connected, address, loading, onConnect, onDisconnect }: HeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setMenuOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(8,11,20,0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--cyan), var(--violet))',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Hexagon size={18} color="#080B14" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
            Stellar<span className="gradient-text">Vault</span>
          </span>
        </div>

        {/* Nav - desktop */}
        <nav style={{ display: 'flex', gap: 4 }} className="hide-mobile">
          {['Dashboard', 'Stake', 'Govern'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} style={{
              padding: '6px 14px',
              color: 'var(--text-secondary)',
              fontSize: 14,
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              textDecoration: 'none',
              borderRadius: 'var(--radius-sm)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >{item}</a>
          ))}
        </nav>

        {/* Network badge + wallet */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-amber hide-mobile">
            <span className="pulse-dot" style={{ background: 'var(--amber)' }} />
            {NETWORK.name}
          </span>

          {!connected ? (
            <button className="btn btn-primary btn-sm" onClick={onConnect} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Wallet size={14} />}
              {loading ? 'Connecting…' : 'Connect Wallet'}
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setMenuOpen(v => !v)}
                style={{ gap: 6 }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--emerald)',
                  boxShadow: '0 0 8px var(--emerald)',
                }} />
                {shortenAddress(address)}
                <ChevronDown size={13} style={{ opacity: 0.6 }} />
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: 8, minWidth: 200,
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  zIndex: 200,
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Connected</div>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', marginTop: 2, color: 'var(--text-secondary)' }}>{shortenAddress(address)}</div>
                  </div>
                  <MenuBtn icon={<Copy size={14} />} label="Copy Address" onClick={copyAddress} />
                  <MenuBtn
                    icon={<ExternalLink size={14} />}
                    label="View on Explorer"
                    onClick={() => { window.open(`${NETWORK.explorerUrl}/account/${address}`, '_blank'); setMenuOpen(false); }}
                  />
                  <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                  <MenuBtn icon={<LogOut size={14} />} label="Disconnect" onClick={() => { onDisconnect(); setMenuOpen(false); }} danger />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      width: '100%', padding: '8px 12px',
      background: 'transparent', border: 'none',
      borderRadius: 'var(--radius-sm)',
      color: danger ? 'var(--rose)' : 'var(--text-secondary)',
      fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 500,
      cursor: 'pointer', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = danger ? 'var(--rose)' : 'var(--text-primary)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = danger ? 'var(--rose)' : 'var(--text-secondary)'; }}
    >{icon}{label}</button>
  );
}
