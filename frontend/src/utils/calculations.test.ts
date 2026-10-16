import { describe, it, expect } from 'vitest';
import {
  calculateSIP,
  calculateLumpSum,
  calculateSavingsRate,
  calculateFinancialHealthScore,
  formatINR,
} from './calculations';

describe('FinWise AI Frontend Financial Calculation Tests', () => {
  it('should accurately calculate SIP returns', () => {
    const res = calculateSIP(5000, 12, 10);
    expect(res.totalInvestment).toBe(600000); // 5000 * 12 * 10
    expect(res.futureValue).toBeGreaterThan(600000);
    expect(res.estimatedReturns).toBe(res.futureValue - res.totalInvestment);
  });

  it('should handle 0% rate in SIP', () => {
    const res = calculateSIP(1000, 0, 5);
    expect(res.totalInvestment).toBe(60000);
    expect(res.futureValue).toBe(60000);
    expect(res.estimatedReturns).toBe(0);
  });

  it('should accurately calculate Lump Sum returns', () => {
    const res = calculateLumpSum(100000, 10, 5);
    expect(res.totalInvestment).toBe(100000);
    expect(res.futureValue).toBe(161051); // 100000 * (1.1)^5 = 161051
    expect(res.estimatedReturns).toBe(61051);
  });

  it('should calculate savings rate correctly', () => {
    expect(calculateSavingsRate(100000, 60000)).toBe(40);
    expect(calculateSavingsRate(50000, 50000)).toBe(0);
    expect(calculateSavingsRate(0, 10000)).toBe(0);
  });

  it('should calculate financial health score accurately', () => {
    const scoreHigh = calculateFinancialHealthScore(35, 70, 6);
    expect(scoreHigh).toBe(100);

    const scoreModerate = calculateFinancialHealthScore(15, 85, 2);
    expect(scoreModerate).toBeGreaterThanOrEqual(50);

    const scoreOverBudget = calculateFinancialHealthScore(5, 110, 0);
    expect(scoreOverBudget).toBeLessThan(60);
  });

  it('should format INR currency properly', () => {
    const formatted = formatINR(50000);
    expect(formatted).toContain('50,000');
  });
});
