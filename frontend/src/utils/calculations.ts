/**
 * FinWise AI - Financial Calculation Utilities
 */

export interface SIPResult {
  totalInvestment: number;
  estimatedReturns: number;
  futureValue: number;
}

export interface LumpSumResult {
  totalInvestment: number;
  estimatedReturns: number;
  futureValue: number;
}

/**
 * Calculates Future Value of a Systematic Investment Plan (SIP).
 */
export function calculateSIP(monthlyInvestment: number, annualRatePercent: number, years: number): SIPResult {
  const i = annualRatePercent / 12 / 100;
  const n = years * 12;
  const totalInvestment = monthlyInvestment * n;
  
  if (i === 0) {
    return {
      totalInvestment,
      estimatedReturns: 0,
      futureValue: totalInvestment,
    };
  }

  const futureValue = monthlyInvestment * (((Math.pow(1 + i, n) - 1) / i) * (1 + i));
  const estimatedReturns = futureValue - totalInvestment;

  return {
    totalInvestment: Math.round(totalInvestment),
    estimatedReturns: Math.round(estimatedReturns),
    futureValue: Math.round(futureValue),
  };
}

/**
 * Calculates Future Value of a Lump Sum Investment.
 */
export function calculateLumpSum(principal: number, annualRatePercent: number, years: number): LumpSumResult {
  const r = annualRatePercent / 100;
  const futureValue = principal * Math.pow(1 + r, years);
  const estimatedReturns = futureValue - principal;

  return {
    totalInvestment: Math.round(principal),
    estimatedReturns: Math.round(estimatedReturns),
    futureValue: Math.round(futureValue),
  };
}

/**
 * Calculates Monthly Savings Rate (%).
 */
export function calculateSavingsRate(totalIncome: number, totalExpense: number): number {
  if (totalIncome <= 0) return 0;
  const savings = Math.max(0, totalIncome - totalExpense);
  return Math.round((savings / totalIncome) * 100);
}

/**
 * Calculates Financial Health Score (0 - 100 scale).
 */
export function calculateFinancialHealthScore(
  savingsRate: number,
  budgetUsedPercent: number,
  emergencyFundMonths: number
): number {
  let score = 50; // base score

  // Savings rate contribution (max +25)
  if (savingsRate >= 30) score += 25;
  else if (savingsRate >= 20) score += 20;
  else if (savingsRate >= 10) score += 10;
  else score += Math.floor(savingsRate);

  // Budget adherence contribution (max +15)
  if (budgetUsedPercent <= 80 && budgetUsedPercent > 0) score += 15;
  else if (budgetUsedPercent <= 100) score += 10;
  else score -= 10; // Over budget penalty

  // Emergency fund contribution (max +10)
  if (emergencyFundMonths >= 6) score += 10;
  else if (emergencyFundMonths >= 3) score += 5;

  return Math.min(100, Math.max(0, score));
}

/**
 * Formats a numeric value into INR currency representation.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
