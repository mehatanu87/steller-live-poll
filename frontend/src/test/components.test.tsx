import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsBar } from '../components/StatsBar';
import { Header } from '../components/Header';

// ─── StatsBar tests ───────────────────────────────────────────────────────────

describe('StatsBar', () => {
  const mockStats = {
    totalDeposited: 2_847_000_000n,
    totalWithdrawn:  318_000_000n,
    totalStakers: 142,
    vaultOpen: true,
    rewardRate: 10,
  };

  it('renders all four stat cards', () => {
    render(<StatsBar stats={mockStats} loading={false} />);
    expect(screen.getByText('Total Value Locked')).toBeDefined();
    expect(screen.getByText('Active Stakers')).toBeDefined();
    expect(screen.getByText('Total Deposited')).toBeDefined();
    expect(screen.getByText('Reward Rate')).toBeDefined();
  });

  it('shows loading skeletons when loading=true', () => {
    const { container } = render(<StatsBar stats={null} loading={true} />);
    // Stat values should not be rendered
    expect(screen.queryByText('XLM')).toBeNull();
  });

  it('displays staker count from stats', () => {
    render(<StatsBar stats={mockStats} loading={false} />);
    expect(screen.getByText('142')).toBeDefined();
  });

  it('displays reward rate with unit', () => {
    render(<StatsBar stats={mockStats} loading={false} />);
    expect(screen.getByText('10 bps/block')).toBeDefined();
  });

  it('renders null stats gracefully without crashing', () => {
    expect(() => render(<StatsBar stats={null} loading={false} />)).not.toThrow();
  });
});

// ─── Header tests ─────────────────────────────────────────────────────────────

describe('Header', () => {
  const noop = () => {};

  it('renders the brand name', () => {
    render(
      <Header connected={false} address="" loading={false} onConnect={noop} onDisconnect={noop} />
    );
    expect(screen.getByText(/StellarVault|Stellar/)).toBeDefined();
  });

  it('shows Connect Wallet button when disconnected', () => {
    render(
      <Header connected={false} address="" loading={false} onConnect={noop} onDisconnect={noop} />
    );
    expect(screen.getByText('Connect Wallet')).toBeDefined();
  });

  it('shows shortened address when connected', () => {
    const addr = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4';
    render(
      <Header connected={true} address={addr} loading={false} onConnect={noop} onDisconnect={noop} />
    );
    // Should show shortened address (not full)
    expect(screen.queryByText(addr)).toBeNull();
    expect(screen.getByText(/GBZXN7/)).toBeDefined();
  });

  it('shows network badge', () => {
    render(
      <Header connected={false} address="" loading={false} onConnect={noop} onDisconnect={noop} />
    );
    expect(screen.getByText('TESTNET')).toBeDefined();
  });

  it('shows connecting state when loading', () => {
    render(
      <Header connected={false} address="" loading={true} onConnect={noop} onDisconnect={noop} />
    );
    expect(screen.getByText('Connecting…')).toBeDefined();
  });

  it('calls onConnect when button clicked', () => {
    const onConnect = vi.fn();
    render(
      <Header connected={false} address="" loading={false} onConnect={onConnect} onDisconnect={noop} />
    );
    screen.getByText('Connect Wallet').click();
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});
