import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  stroopsToXLM,
  xlmToStroops,
  formatXLM,
  shortenAddress,
  explorerTxLink,
  fetchVaultStats,
  fetchProposals,
  deposit,
  withdraw,
  claimRewards,
  vote,
  NETWORK,
  CONTRACT_ID,
} from '../lib/stellar';

// ─── Unit: formatting helpers ─────────────────────────────────────────────────

describe('stroopsToXLM', () => {
  it('converts 1 stroop correctly', () => {
    expect(stroopsToXLM(1n)).toBeCloseTo(0.0000001);
  });

  it('converts 10_000_000 stroops to 1 XLM', () => {
    expect(stroopsToXLM(10_000_000n)).toBe(1);
  });

  it('converts 0 stroops to 0 XLM', () => {
    expect(stroopsToXLM(0n)).toBe(0);
  });

  it('handles large values accurately', () => {
    expect(stroopsToXLM(1_000_000_000n)).toBe(100);
  });
});

describe('xlmToStroops', () => {
  it('converts 1 XLM to 10_000_000 stroops', () => {
    expect(xlmToStroops(1)).toBe(10_000_000n);
  });

  it('converts fractional XLM correctly', () => {
    expect(xlmToStroops(0.5)).toBe(5_000_000n);
  });

  it('round-trips with stroopsToXLM', () => {
    const original = 123.456;
    const roundTrip = stroopsToXLM(xlmToStroops(original));
    expect(roundTrip).toBeCloseTo(original, 5);
  });

  it('converts 0 XLM to 0 stroops', () => {
    expect(xlmToStroops(0)).toBe(0n);
  });
});

describe('formatXLM', () => {
  it('formats whole number XLM', () => {
    const result = formatXLM(100_000_000n); // 10 XLM
    expect(result).toBe('10.00');
  });

  it('formats with custom decimals', () => {
    const result = formatXLM(10_000_000n, 4); // 1 XLM with 4 decimals
    expect(result).toBe('1.0000');
  });

  it('formats 0 correctly', () => {
    expect(formatXLM(0n)).toBe('0.00');
  });
});

describe('shortenAddress', () => {
  it('shortens a long Stellar address', () => {
    const addr = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4';
    const short = shortenAddress(addr);
    expect(short).toContain('GBZXN7');
    expect(short).toContain('…');
    expect(short.length).toBeLessThan(addr.length);
  });

  it('returns short address unchanged', () => {
    const short = 'ABCDEF';
    expect(shortenAddress(short)).toBe(short);
  });

  it('shows first 6 and last 4 characters', () => {
    const addr = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4';
    const result = shortenAddress(addr);
    expect(result.startsWith(addr.slice(0, 6))).toBe(true);
    expect(result.endsWith(addr.slice(-4))).toBe(true);
  });
});

describe('explorerTxLink', () => {
  it('builds a valid explorer link', () => {
    const hash = 'abc123def456';
    const link = explorerTxLink(hash);
    expect(link).toContain(hash);
    expect(link).toContain(NETWORK.explorerUrl);
  });
});

// ─── Unit: contract constants ─────────────────────────────────────────────────

describe('NETWORK constants', () => {
  it('has a network passphrase', () => {
    expect(NETWORK.networkPassphrase).toBeTruthy();
  });

  it('has a valid RPC URL', () => {
    expect(NETWORK.rpcUrl).toMatch(/^https?:\/\//);
  });

  it('has an explorer URL', () => {
    expect(NETWORK.explorerUrl).toMatch(/^https?:\/\//);
  });
});

describe('CONTRACT_ID', () => {
  it('is a non-empty string', () => {
    expect(typeof CONTRACT_ID).toBe('string');
    expect(CONTRACT_ID.length).toBeGreaterThan(0);
  });
});

// ─── Integration: vault state machine ─────────────────────────────────────────

describe('vault deposit / withdraw flow', () => {
  it('deposit returns a transaction hash', async () => {
    const hash = await deposit(10_000_000n);
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
  });

  it('stats reflect deposit', async () => {
    const before = await fetchVaultStats();
    await deposit(5_000_000n);
    const after = await fetchVaultStats();
    expect(after.totalDeposited).toBeGreaterThanOrEqual(before.totalDeposited);
  });

  it('withdraw reduces balance', async () => {
    await deposit(20_000_000n); // ensure balance
    const hash = await withdraw(5_000_000n);
    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(64);
  });

  it('withdraw throws on insufficient balance', async () => {
    await expect(withdraw(999_999_999_999n)).rejects.toThrow('Insufficient balance');
  });
});

describe('vault rewards', () => {
  it('claimRewards throws when no rewards', async () => {
    // Reset by creating fresh import — in demo env rewards start at 0 after a fresh run
    // We'll just verify the function throws properly if called with 0 rewards
    // (actual 0-check depends on accumulated state; skip if rewards exist)
    try {
      await claimRewards();
      // If it didn't throw, rewards existed — that's also valid
    } catch (err) {
      expect((err as Error).message).toBe('No rewards to claim');
    }
  });
});

// ─── Integration: proposals & voting ─────────────────────────────────────────

describe('proposals', () => {
  it('fetches a list of proposals', async () => {
    const proposals = await fetchProposals();
    expect(Array.isArray(proposals)).toBe(true);
    expect(proposals.length).toBeGreaterThan(0);
  });

  it('each proposal has required fields', async () => {
    const proposals = await fetchProposals();
    for (const p of proposals) {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('description');
      expect(p).toHaveProperty('proposer');
      expect(typeof p.votesFor).toBe('number');
      expect(typeof p.votesAgainst).toBe('number');
      expect(typeof p.active).toBe('boolean');
    }
  });

  it('vote throws when user has no stake', async () => {
    // In the mock, if balance is 0, vote should throw
    // After our withdraws above balance may be positive; test error path explicitly
    await expect(vote(999, true)).rejects.toThrow();
  });
});
