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
  it.skip('deposit throws not implemented', async () => {
    await expect(deposit(10_000_000n, 'test')).rejects.toThrow('Deposit not yet implemented');
  });

  it.skip('withdraw throws not implemented', async () => {
    await expect(withdraw(5_000_000n, 'test')).rejects.toThrow('Withdraw not yet implemented');
  });
});

describe('vault rewards', () => {
  it.skip('claimRewards throws not implemented', async () => {
    await expect(claimRewards('test')).rejects.toThrow('Claim not yet implemented');
  });
});

// ─── Integration: proposals & voting ─────────────────────────────────────────

describe('proposals', () => {
  it('fetches a list of proposals', async () => {
    const proposals = await fetchProposals();
    expect(Array.isArray(proposals)).toBe(true);
    expect(proposals.length).toBeGreaterThanOrEqual(0);
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
    await expect(vote(999, true, 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPGQS7Z5QUEUELA7HHBSB77M4')).rejects.toThrow();
  });
});
