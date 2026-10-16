# FinWise AI — Explainable Investment Recommendation Engine

FinWise AI differentiates itself through **Financial Context-Aware Investment Guidance**.

The system NEVER asks an LLM to blindly guess stock or investment recommendations. Instead, it processes data through a 2-stage transparent pipeline:

```
[ User Financial Profile + Expenses + Income + Emergency Fund + Risk Tolerance ]
                                      │
                                      ▼
             Stage 1: Deterministic Financial Scoring Engine
                (Asset Allocation Rules, Fundamental Ratios)
                                      │
                                      ▼
                   Structured Recommendation Payload
                   - Asset Allocation (%)
                   - Recommended Stocks & Scoring
                   - Recommended Mutual Funds & ETFs
                                      │
                                      ▼
           Stage 2: LLM Explanation Layer (Gemini/OpenAI/Ollama)
            (Generates Beginner-Friendly Explainable Paragraph)
```

---

## 1. Asset Allocation Formula

Inputs:
- `risk_tolerance` (Conservative, Moderate, Aggressive)
- `investment_horizon_years`
- `monthly_investable` = `max(0, actual_income - actual_expenses)`

### Risk Profiles:
1. **Conservative**:
   - 60% Low-Risk Debt & Fixed Deposits
   - 20% Diversified Equity / Index Funds
   - 10% Gold
   - 10% Cash Cushion
2. **Moderate**:
   - 60% Diversified Equity & Flexi-Cap Funds
   - 25% Debt Funds & PPF
   - 10% Gold
   - 5% Cash
3. **Aggressive**:
   - 80% High-Growth Equities, Mid/Small-Cap Funds
   - 10% Debt
   - 5% Gold
   - 5% Cash

---

## 2. Stock & Mutual Fund Scoring Metrics

### Stock Scoring (Max 100):
- **Fundamental Score (40 pts)**: ROE > 15%, Low Debt-to-Equity, Profit Growth > 10%.
- **Valuation Score (30 pts)**: Reasonable P/E ratio relative to sector.
- **Stability Score (30 pts)**: Volatility rating & Market Cap strength.

### Mutual Fund Scoring (Max 100):
- **Consistency (40 pts)**: 3-year & 5-year CAGR.
- **Cost Efficiency (30 pts)**: Low Expense Ratio (< 1.0%).
- **Risk-Adjusted Return (30 pts)**: Fund AUM & Volatility index.

---

## 3. Explainability Standard
Every output answers: **"Why was this recommended?"** with explicit rationale matching the user's personal financial parameters.
