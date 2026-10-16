import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Heart, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Coins, 
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Save,
  LineChart as ChartIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface ScoreBreakdownItem {
  score: number;
  value: string;
  weight: string;
  description: string;
}

interface ScoreData {
  score: number;
  savings_score: number;
  budget_score: number;
  emergency_score: number;
  goal_score: number;
  debt_score: number;
  strengths: string[];
  improvements: string[];
  breakdown: {
    savings_rate: ScoreBreakdownItem;
    budget_adherence: ScoreBreakdownItem;
    emergency_fund: ScoreBreakdownItem;
    goal_progress: ScoreBreakdownItem;
    debt_burden: ScoreBreakdownItem;
  };
}

interface EmergencyData {
  essential_monthly: number;
  current_amount: number;
  target_months: number;
  target_amount: number;
  remaining: number;
  suggested_monthly_contribution: number;
}

interface HistoricalScore {
  id: number;
  score: number;
  created_at: string;
}

const FinancialHealthPage: React.FC = () => {
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [emergencyData, setEmergencyData] = useState<EmergencyData | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for Emergency Fund Calculator
  const [efCurrent, setEfCurrent] = useState('');
  const [efMonths, setEfMonths] = useState(6);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [scoreRes, emRes, histRes] = await Promise.all([
        api.get('/financial-health/score'),
        api.get('/financial-health/emergency'),
        api.get('/financial-health/history')
      ]);

      setScoreData(scoreRes.data);
      setEmergencyData(emRes.data);
      setHistoryData(histRes.data);

      setEfCurrent(emRes.data.current_amount.toString());
      setEfMonths(emRes.data.target_months);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load financial health diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEmergency(true);
      await api.post('/financial-health/emergency', {
        current_amount: parseFloat(efCurrent) || 0.0,
        target_months: efMonths
      });
      
      // Refresh score and calculations
      await fetchData();
      alert('Emergency fund targets updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save emergency targets.');
    } finally {
      setSavingEmergency(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="h-[60vh] flex flex-col justify-center items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-400 font-medium text-sm">Evaluating financial health metrics...</span>
        </div>
      </SidebarLayout>
    );
  }

  // Format dates for the history graph
  const chartData = historyData.map(h => ({
    date: new Date(h.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: h.score
  }));

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 50) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-emerald-500';
    if (score >= 50) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Heart className="w-8 h-8 text-brand-400 fill-brand-400/20" />
              <span>Financial Health Diagnostic</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Analyze savings rates, emergency cushions, and budget metrics to optimize your path.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Summary & Gauge Section */}
        {scoreData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Gauge Ring */}
            <div className="glass-card border border-white/5 p-6 flex flex-col items-center justify-center text-center rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-brand-400/20">
                <Sparkles className="w-16 h-16" />
              </div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Health Score Gauge</h3>
              
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    className="stroke-white/5"
                    strokeWidth="8"
                  />
                  {/* Progress Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    className={`transition-all duration-1000 ${getScoreRingColor(scoreData.score)}`}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - scoreData.score / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-white">{scoreData.score}</span>
                  <span className="text-[10px] font-bold text-slate-500 tracking-wider">OUT OF 100</span>
                </div>
              </div>

              <div className={`mt-6 px-4 py-1.5 rounded-full border text-xs font-bold ${getScoreColorClass(scoreData.score)}`}>
                {scoreData.score >= 80 ? 'Excellent Health' : scoreData.score >= 50 ? 'Fair Health' : 'Needs Optimization'}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="lg:col-span-2 glass-card border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Diagnostics Breakdown</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Strengths */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Key Strengths</span>
                    </h4>
                    <ul className="space-y-2">
                      {scoreData.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Needs Improvement */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Areas of Improvement</span>
                    </h4>
                    <ul className="space-y-2">
                      {scoreData.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed">
                          <span className="text-amber-500 mt-0.5">•</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-500 leading-relaxed">
                * Recommendations are recalculated dynamically on financial health updates. Ensure monthly profiles are fully filled.
              </div>
            </div>

          </div>
        )}

        {/* 5 Factors Cards Grid */}
        {scoreData && (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Core Grading Pillars</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(scoreData.breakdown).map(([key, item]: [string, any]) => {
                const labelMap: Record<string, string> = {
                  savings_rate: 'Savings Rate',
                  budget_adherence: 'Budget Limits',
                  emergency_fund: 'Emergency Buffer',
                  goal_progress: 'Goals Progress',
                  debt_burden: 'Debt Burden'
                };
                
                return (
                  <div key={key} className="glass-card border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-white">{labelMap[key]}</span>
                        <span className="text-[10px] font-bold text-slate-500">{item.weight}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed min-h-[2.5rem]">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Status</span>
                        <span className="text-[11px] text-slate-200 font-medium truncate max-w-[100px]" title={item.value}>
                          {item.value}
                        </span>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Score</span>
                        <span className={`text-base font-extrabold ${
                          item.score >= 80 ? 'text-emerald-400' : item.score >= 50 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {Math.round(item.score)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Emergency Fund Calculator & Scoring Methodology */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Emergency Fund Configurator */}
          <div className="glass-card border border-white/5 p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Coins className="w-5 h-5 text-brand-400" />
                <span>Emergency Fund Cushion Builder</span>
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Configure your essential expenses and buffer cushion to survive job losses or unexpected health emergencies.
              </p>
            </div>

            {emergencyData && (
              <div className="grid grid-cols-3 gap-4 bg-white/2 p-4 rounded-xl border border-white/5">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Essential Expenses</span>
                  <span className="text-sm font-bold text-white">
                    ₹{emergencyData.essential_monthly.toLocaleString()}
                    <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                  </span>
                </div>
                <div className="text-center border-x border-white/5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Cushion Target</span>
                  <span className="text-sm font-bold text-brand-400">
                    ₹{emergencyData.target_amount.toLocaleString()}
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase">Deficit</span>
                  <span className={`text-sm font-bold ${emergencyData.remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    ₹{emergencyData.remaining.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdateEmergency} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Current Saved Cushion (₹)
                  </label>
                  <input
                    type="number"
                    value={efCurrent}
                    onChange={(e) => setEfCurrent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white text-xs sm:text-sm focus:outline-none"
                    placeholder="Enter current saved amount..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Target Cushion Months
                  </label>
                  <select
                    value={efMonths}
                    onChange={(e) => setEfMonths(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-slate-200 text-xs sm:text-sm focus:outline-none"
                  >
                    <option value={3}>3 Months (Conservative Essential)</option>
                    <option value={6}>6 Months (Balanced Medium Risk)</option>
                    <option value={9}>9 Months (Aggressive Security)</option>
                    <option value={12}>12 Months (Maximum Freedom Cushion)</option>
                  </select>
                </div>
              </div>

              {emergencyData && emergencyData.remaining > 0 && (
                <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-[11px] text-brand-300 leading-relaxed">
                  💡 **Coach Suggestion:** To cover your remaining deficit of **₹{emergencyData.remaining.toLocaleString()}** in the next 12 months, aim to contribute **₹{Math.ceil(emergencyData.suggested_monthly_contribution).toLocaleString()} / month** directly into high-yield deposits or savings.
                </div>
              )}

              <button
                type="submit"
                disabled={savingEmergency}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold py-2.5 rounded-xl transition-all shadow-md text-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingEmergency ? 'Updating Targets...' : 'Update Cushion Targets'}</span>
              </button>
            </form>
          </div>

          {/* Scoring Methodology */}
          <div className="glass-card border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-400" />
                <span>Scoring Weights & Methodology</span>
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                The Financial Health Score is structured using professional monetary planning weights to ensure the index is not arbitrary.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Savings Rate (25% weight)</span>
                  <span className="text-slate-400">100 score reached at 30% savings rate.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Budget Limits (25% weight)</span>
                  <span className="text-slate-400">Based on how much you overspend category thresholds.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Emergency Buffer (20% weight)</span>
                  <span className="text-slate-400">Ratio of current emergency fund vs your selected months target.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Goals Progress (15% weight)</span>
                  <span className="text-slate-400">Average completion percentage across savings goals.</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Debt Burden (15% weight)</span>
                  <span className="text-slate-400">Measures loans/EMIs. Lower debt service ratios score higher.</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/2 border border-white/5 rounded-xl flex items-center justify-between text-xs text-brand-400 font-bold mt-6">
              <span>Need help optimizing this score?</span>
              <a href="/ai-coach" className="flex items-center gap-1.5 hover:underline">
                <span>Ask AI Coach</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

        </div>

        {/* History Chart */}
        {chartData.length > 0 && (
          <div className="glass-card border border-white/5 p-6 rounded-2xl">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <ChartIcon className="w-5 h-5 text-brand-400" />
              <span>Historical Diagnostic Progress</span>
            </h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#scoreColor)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  );
};

export default FinancialHealthPage;
