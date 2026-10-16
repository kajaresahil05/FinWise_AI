import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Compass,
  TrendingUp,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Coins,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

interface AssetAllocation {
  asset_class: string;
  percentage: number;
  monthly_amount: number;
  sub_allocation: {
    type: string;
    percentage: number;
    monthly_amount: number;
  }[];
}

interface StockCandidate {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  fundamental_score: number;
  volatility: string;
  suitability_score: number;
}

interface MFCandidate {
  symbol: string;
  name: string;
  category: string;
  nav: number;
  expense_ratio: number;
  fund_consistency_score: number;
  suitability_score: number;
}

interface ETFCandidate {
  symbol: string;
  name: string;
  price: number;
  change_percent: number;
}

interface RecommendationResponse {
  risk_level: string;
  monthly_investable: number;
  allocation: AssetAllocation[];
  stocks: StockCandidate[];
  mutual_funds: MFCandidate[];
  etfs: ETFCandidate[];
  explanation: string;
  diversification_alerts: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const InvestmentRecommendationsPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [monthlyAmountInput, setMonthlyAmountInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (monthlyInvestable?: number) => {
    try {
      if (monthlyInvestable === undefined) {
        setLoading(true);
      } else {
        setUpdating(true);
      }
      setError(null);
      const response = await api.post('/investments/recommendations', monthlyInvestable === undefined ? {} : { monthly_investable: monthlyInvestable });
      setData(response.data);
      setMonthlyAmountInput(Number(response.data.monthly_investable).toFixed(2));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load recommendations.');
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleAmountSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const monthlyInvestable = Number(monthlyAmountInput);
    if (!Number.isFinite(monthlyInvestable) || monthlyInvestable <= 0) {
      setError('Enter a monthly investment amount greater than zero.');
      return;
    }
    fetchRecommendations(monthlyInvestable);
  };

  const getRiskIcon = (level: string) => {
    if (level === 'Conservative') return <Shield className="w-12 h-12 text-emerald-400" />;
    if (level === 'Moderate') return <ShieldCheck className="w-12 h-12 text-brand-400" />;
    return <ShieldAlert className="w-12 h-12 text-rose-400" />;
  };

  const getRiskColor = (level: string) => {
    if (level === 'Conservative') return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (level === 'Moderate') return 'text-brand-400 border-brand-500/20 bg-brand-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="py-32 text-center">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Analyzing your financial goals & generating recommendations...</p>
        </div>
      </SidebarLayout>
    );
  }

  // If user hasn't configured a profile or taken the risk assessment
  const hasNoRiskProfile = !data || !user?.profile?.risk_tolerance;

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Compass className="w-8 h-8 text-brand-400" />
              Investment Recommendations
            </h1>
            <p className="text-slate-400 mt-1">Personalized, context-aware suggestions mapped to your financial situation.</p>
          </div>
          <Link
            to="/risk-assessment"
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 hover:border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
          >
            Retake Risk Audit
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5" />
            {error}
          </div>
        )}

        {hasNoRiskProfile ? (
          <div className="glass-card p-8 rounded-2xl border border-white/5 text-center max-w-xl mx-auto space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Risk Profile Required</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                To offer personalized investment recommendations, FinWise AI needs to assess your risk tolerance, age group, and investment timeline first.
              </p>
            </div>
            <Link
              to="/risk-assessment"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-brand-500/20 transition-all"
            >
              Start Risk Assessment
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Summary and Chart */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Score & Profile Card */}
                <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row justify-between items-center gap-6 ${getRiskColor(data.risk_level)}`}>
                  <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                    {getRiskIcon(data.risk_level)}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Personal Risk Group</span>
                      <h2 className="text-2xl font-black text-white">{data.risk_level} Investor</h2>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Targeting a monthly investment of <strong className="text-white">₹{data.monthly_investable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </p>
                    </div>
                  </div>
                  
                  {data.diversification_alerts.length > 0 && (
                    <div className="flex items-start gap-2 bg-white/5 border border-white/5 p-3 rounded-xl max-w-xs">
                      <Info className="w-4.5 h-4.5 text-brand-400 flex-shrink-0 mt-0.5" />
                      <span className="text-[10px] text-slate-400 leading-normal">{data.diversification_alerts[0]}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAmountSubmit} className="glass-card p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <label htmlFor="monthly-investment" className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">
                      Monthly investment amount (₹)
                    </label>
                    <input
                      id="monthly-investment"
                      type="number"
                      min="0.01"
                      max="9999999999.99"
                      step="0.01"
                      required
                      value={monthlyAmountInput}
                      onChange={(event) => setMonthlyAmountInput(event.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updating || !monthlyAmountInput}
                    className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                    Update recommendations
                  </button>
                </form>

                {/* Allocation Chart */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-brand-400" />
                    Recommended Asset Allocation
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.allocation.map(a => ({ name: a.asset_class, value: a.percentage }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {data.allocation.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                            itemStyle={{ color: '#cbd5e1', fontSize: '12px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown list */}
                    <div className="space-y-3">
                      {data.allocation.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white/2 rounded-xl border border-white/5 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-white flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              {item.asset_class}
                            </span>
                            <span className="font-black text-brand-400">{item.percentage}% · ₹{item.monthly_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</span>
                          </div>
                          {item.sub_allocation && item.sub_allocation.length > 0 && (
                            <div className="pl-4 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                              {item.sub_allocation.map((sub, sIdx) => (
                                <span key={sIdx}>
                                  {sub.type}: <strong className="text-slate-400">{sub.percentage}% · ₹{sub.monthly_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Candidate Lists */}
                <div className="space-y-6">
                  
                  {/* Stocks */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                      <Coins className="w-4.5 h-4.5 text-brand-400" />
                      Suggested Equities / Stocks
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500 font-bold">
                            <th className="pb-2">Company</th>
                            <th className="pb-2">Sector</th>
                            <th className="pb-2">Price</th>
                            <th className="pb-2">Fund. Score</th>
                            <th className="pb-2 text-right">Suitability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.stocks.map((stock) => (
                            <tr key={stock.symbol} className="text-slate-300 hover:bg-white/2 transition-colors">
                              <td className="py-3 font-bold text-white">
                                <Link to={`/stock-analysis?symbol=${stock.symbol}`} className="hover:text-brand-400 flex items-center gap-1">
                                  {stock.name}
                                  <ExternalLink className="w-3 h-3 text-slate-500" />
                                </Link>
                                <span className="text-[10px] text-slate-500">{stock.symbol}</span>
                              </td>
                              <td className="py-3">{stock.sector}</td>
                              <td className="py-3 font-semibold text-slate-200">₹{stock.price.toFixed(2)}</td>
                              <td className="py-3 font-semibold text-emerald-400">{stock.fundamental_score}/100</td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 font-black text-[10px]">
                                  {stock.suitability_score}% Match
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mutual Funds */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                      <TrendingUp className="w-4.5 h-4.5 text-brand-400" />
                      Suggested Mutual Funds
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-500 font-bold">
                            <th className="pb-2">Scheme Name</th>
                            <th className="pb-2">Type</th>
                            <th className="pb-2">NAV</th>
                            <th className="pb-2">Expense Ratio</th>
                            <th className="pb-2 text-right">Suitability</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {data.mutual_funds.map((mf) => (
                            <tr key={mf.symbol} className="text-slate-300 hover:bg-white/2 transition-colors">
                              <td className="py-3 font-bold text-white">
                                <Link to={`/mutual-funds?symbol=${mf.symbol}`} className="hover:text-brand-400 flex items-center gap-1">
                                  {mf.name}
                                  <ExternalLink className="w-3 h-3 text-slate-500" />
                                </Link>
                                <span className="text-[10px] text-slate-500">{mf.symbol}</span>
                              </td>
                              <td className="py-3">{mf.category}</td>
                              <td className="py-3 font-semibold text-slate-200">₹{mf.nav.toFixed(2)}</td>
                              <td className="py-3">{mf.expense_ratio}%</td>
                              <td className="py-3 text-right">
                                <span className="px-2 py-1 rounded bg-brand-500/10 text-brand-400 font-black text-[10px]">
                                  {mf.suitability_score}% Match
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ETFs */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                      <Coins className="w-4.5 h-4.5 text-brand-400" />
                      Suggested Exchange Traded Funds (ETFs)
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {data.etfs.map((etf) => (
                        <div key={etf.symbol} className="p-4 bg-white/2 border border-white/5 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="font-extrabold text-white text-xs block">{etf.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{etf.symbol}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-slate-200 text-xs block">₹{etf.price.toFixed(2)}</span>
                            <span className={`text-[10px] font-bold ${etf.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {etf.change_percent >= 0 ? '+' : ''}{etf.change_percent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: AI Explanations & Alerts */}
              <div className="space-y-6">
                
                {/* AI Rationale Explanation Card */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4 bg-gradient-to-b from-dark-900 via-dark-900 to-brand-950/20">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 pb-2 border-b border-white/5">
                    <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    Explainable AI Insight
                  </h3>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {data.explanation}
                    </p>
                    
                    <div className="p-3.5 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                      <span className="text-[10px] font-black text-brand-400 block uppercase mb-1">Key Context Parameters Used</span>
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400">
                        <div>Risk Tolerance: <strong className="text-slate-300">{data.risk_level}</strong></div>
                        <div>Monthly Budget Capacity: <strong className="text-slate-300">₹{data.monthly_investable.toLocaleString()}</strong></div>
                        <div>Financial Goals Met: <strong className="text-slate-300">Active</strong></div>
                        <div>Cushion Guard: <strong className="text-slate-300">Verified</strong></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Advisory / Disclaimer Notice */}
                <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3 bg-amber-500/5">
                  <span className="text-xs font-black uppercase text-amber-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-4.5 h-4.5" />
                    Financial Disclaimer
                  </span>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    FinWise AI provides educational information and personalized analytical insights for informational purposes only. It is not a substitute for professional financial advice. Investment decisions involve risk, and past performance does not guarantee future results. Users should conduct their own research or consult a qualified financial professional before making investment decisions. No automated asset execution is committed by the system.
                  </p>
                </div>

              </div>

            </div>
          )
        )}

      </div>
    </SidebarLayout>
  );
};

export default InvestmentRecommendationsPage;
