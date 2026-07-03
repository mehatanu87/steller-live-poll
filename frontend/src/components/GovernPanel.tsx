import React, { useState } from 'react';
import { Plus, ThumbsUp, ThumbsDown, CheckCircle, Clock, XCircle, ChevronDown } from 'lucide-react';
import { Proposal, UserPosition, shortenAddress } from '../lib/stellar';

interface GovernPanelProps {
  proposals: Proposal[];
  position: UserPosition | null;
  connected: boolean;
  loading: boolean;
  onCreateProposal: (title: string, desc: string) => Promise<number | undefined>;
  onVote: (id: number, voteFor: boolean) => Promise<string | undefined>;
}

export function GovernPanel({ proposals, position, connected, loading, onCreateProposal, onVote }: GovernPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!title.trim() || !desc.trim()) return;
    setBusy(true);
    try {
      await onCreateProposal(title, desc);
      setTitle(''); setDesc(''); setShowCreate(false);
    } finally { setBusy(false); }
  };

  const handleVote = async (id: number, voteFor: boolean) => {
    setBusy(true);
    try { await onVote(id, voteFor); } finally { setBusy(false); }
  };

  const hasVoted = (id: number) => position?.hasVoted[id] ?? false;
  const hasStake = (position?.balance ?? 0n) > 0n;

  return (
    <div id="govern" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Governance</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Quadratic voting · {proposals.length} proposals
          </p>
        </div>
        {connected && hasStake && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowCreate(v => !v)}>
            <Plus size={13} />
            New Proposal
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card" style={{ padding: 24 }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Create Proposal</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Title</label>
              <input className="input" placeholder="Short, descriptive title" value={title} onChange={e => setTitle(e.target.value)} disabled={busy} maxLength={80} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Description</label>
              <textarea
                className="input"
                placeholder="Describe the change and its rationale…"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                disabled={busy}
                rows={4}
                maxLength={500}
                style={{ resize: 'vertical', minHeight: 90 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={handleCreate} disabled={busy || !title.trim() || !desc.trim()}>
                {busy ? <span className="spinner" style={{ width: 13, height: 13, borderTopColor: '#080B14' }} /> : <Plus size={13} />}
                Submit
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Proposals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {proposals.map(p => {
          const total = p.votesFor + p.votesAgainst;
          const forPct = total > 0 ? (p.votesFor / total) * 100 : 50;
          const voted = hasVoted(p.id);
          const isExpanded = expanded === p.id;

          return (
            <div key={p.id} className="card" style={{ padding: 20, cursor: 'pointer' }}>
              {/* Title row */}
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                onClick={() => setExpanded(isExpanded ? null : p.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>#{p.id}</span>
                    <StatusBadge active={p.active} />
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{p.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    by {shortenAddress(p.proposer)} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {/* Vote bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span style={{ color: 'var(--emerald)' }}>For: {p.votesFor}</span>
                  <span style={{ color: 'var(--rose)' }}>Against: {p.votesAgainst}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${forPct}%`, background: `linear-gradient(90deg, var(--emerald), var(--cyan))` }} />
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 16 }}>{p.description}</p>

                  {connected && p.active && !voted && hasStake && (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleVote(p.id, true); }}
                        disabled={busy || loading}
                        style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.3)', flex: 1 }}
                      >
                        {busy ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <ThumbsUp size={13} />}
                        Vote For
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleVote(p.id, false); }}
                        disabled={busy || loading}
                        style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--rose)', border: '1px solid rgba(244,63,94,0.25)', flex: 1 }}
                      >
                        {busy ? <span className="spinner" style={{ width: 13, height: 13 }} /> : <ThumbsDown size={13} />}
                        Vote Against
                      </button>
                    </div>
                  )}

                  {voted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--emerald)', fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                      <CheckCircle size={14} /> You voted on this proposal
                    </div>
                  )}

                  {!p.active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
                      <XCircle size={14} /> Voting has ended · {forPct >= 50 ? '✓ Passed' : '✗ Rejected'}
                    </div>
                  )}

                  {!connected && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Connect wallet to vote</p>
                  )}
                  {connected && !hasStake && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stake XLM to participate in governance</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {proposals.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No proposals yet. Stake XLM to create the first one.
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="badge badge-green">
      <Clock size={10} /> Active
    </span>
  ) : (
    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
      Closed
    </span>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
