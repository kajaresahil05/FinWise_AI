import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Bot,
  Target,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryComparison {
  current: number;
  previous: number;
  change_pct: number;
}

interface BudgetItem {
  category: string;
  allocated: number;
  used: number;
  remaining: number;
  pct_used: number;
  status: 'ok' | 'warning' | 'critical' | 'exceeded';
}

interface GoalItem {
  name: string;
  target: number;
  current: number;
  pct: number;
  target_date: string | null;
}

interface ReportData {
  year: number;
  month: number;
  month_name: string;
  income: { total: number; sources: Record<string, number> };
  expenses: {
    total: number;
    previous_month_total: number;
    change_pct: number;
    by_category: Record<string, number>;
    biggest_category: string;
    category_comparison: Record<string, CategoryComparison>;
  };
  savings: {
    total: number;
    savings_rate: number;
    previous_month_savings: number;
    savings_change_pct: number;
  };
  budget_performance: BudgetItem[];
  goal_progress: GoalItem[];
  portfolio: { holding_count: number; total_invested: number };
  health_score: number | null;
  health_breakdown: any[];
  ai_narrative: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

const formatAxisINR = (val: number) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}K`;
  return `₹${val}`;
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  ok: { color: 'text-emerald-400', icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> },
  warning: { color: 'text-amber-400', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> },
  critical: { color: 'text-orange-400', icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> },
  exceeded: { color: 'text-rose-400', icon: <XCircle className="w-3.5 h-3.5 text-rose-400" /> }
};



// ─── Main Component ───────────────────────────────────────────────────────────

const FinancialReportsPage: React.FC = () => {
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(`/ai/financial-report?year=${year}&month=${month}`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchReport]);

  const navigateMonth = (dir: -1 | 1) => {
    let m = selectedMonth + dir;
    let y = selectedYear;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  // Prepare category bar chart data safely
  const categoryChartData = data && data.expenses && data.expenses.category_comparison
    ? Object.entries(data.expenses.category_comparison)
        .sort((a, b) => (b[1]?.current || 0) - (a[1]?.current || 0))
        .slice(0, 8)
        .map(([cat, vals]) => ({
          name: cat,
          'This Month': vals?.current || 0,
          'Last Month': vals?.previous || 0
        }))
    : [];

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <FileText className="w-8 h-8 text-brand-400" />
              Financial Reports
            </h1>
            <p className="text-slate-400 mt-1">Monthly AI-generated overview of your income, expenses, savings, and financial health.</p>
          </div>

          {/* Month Navigator */}
          <div className="flex items-center gap-2 glass-card px-4 py-2.5 rounded-2xl border border-white/5">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white min-w-[130px] text-center">
              {MONTH_NAMES[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              disabled={selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1}
              className="p-1 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Generating your monthly report...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* ── Summary Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Income</span>
                <span className="text-xl font-black text-white">{formatINR(data.income?.total || 0)}</span>
              </div>
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Expenses</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black text-white">{formatINR(data.expenses?.total || 0)}</span>
                  {data.expenses?.change_pct !== undefined && data.expenses.change_pct !== 0 && (
                    <span className={`text-[10px] font-bold ${data.expenses.change_pct > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {data.expenses.change_pct > 0 ? '▲' : '▼'} {Math.abs(data.expenses.change_pct)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Savings</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xl font-black ${(data.savings?.total || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(data.savings?.total || 0)}
                  </span>
                  {(data.savings?.total || 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Savings Rate</span>
                <span className={`text-xl font-black ${(data.savings?.savings_rate || 0) >= 20 ? 'text-emerald-400' : (data.savings?.savings_rate || 0) >= 10 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {data.savings?.savings_rate || 0}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ── AI Narrative Card ──────────────────────────────── */}
              <div className="lg:col-span-1 glass-card p-6 rounded-2xl border border-brand-500/15 bg-brand-500/5 space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    AI Monthly Summary
                  </h3>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/20">
                    🤖 AI Generated
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed flex-1">
                  {data.ai_narrative || 'Monthly report summary created successfully.'}
                </p>
                <p className="text-[10px] text-slate-500 border-t border-white/5 pt-3">
                  This summary is generated based on your actual financial data and may be AI-assisted.
                </p>
              </div>

              {/* ── Health Score ───────────────────────────────────── */}
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Financial Health Score</h3>

                {data.health_score !== null && data.health_score !== undefined ? (
                  <div className="flex items-center gap-6">
                    <div className={`flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 flex-shrink-0 ${data.health_score >= 75 ? 'border-emerald-500/40' : data.health_score >= 50 ? 'border-amber-500/40' : 'border-rose-500/40'}`}>
                      <span className={`text-4xl font-black ${data.health_score >= 75 ? 'text-emerald-400' : data.health_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {data.health_score}
                      </span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {(Array.isArray(data.health_breakdown)
                        ? data.health_breakdown
                        : Object.entries(data.health_breakdown || {}).map(([key, val]: any) => ({
                            factor: key.replace(/_/g, ' '),
                            score: typeof val === 'object' ? val?.score || 0 : Number(val) || 0,
                            max: 100
                          }))
                      ).slice(0, 5).map((item: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400 capitalize">{item.factor}</span>
                            <span className="font-bold text-white">{item.score}/{item.max}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${Math.min(((item.score || 0) / (item.max || 100)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">Health score not available for this period.</p>
                )}

                {/* Income Sources */}
                <div className="pt-4 border-t border-white/5 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Income Sources</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.income?.sources || {}).map(([src, amt]) => (
                      <span key={src} className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-[10px] font-semibold text-emerald-300">
                        {src}: {formatINR(amt)}
                      </span>
                    ))}
                    {Object.keys(data.income?.sources || {}).length === 0 && (
                      <span className="text-[10px] text-slate-600">No income recorded this month.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Category Comparison Chart ──────────────────────────── */}
            {categoryChartData.length > 0 && (
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-brand-400" />
                  Spending by Category — vs Last Month
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} />
                      <YAxis tickFormatter={formatAxisINR} tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                        formatter={(val: any) => formatINR(Number(val))}
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                      <Bar dataKey="This Month" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Last Month" fill="#334155" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {data.expenses?.biggest_category && data.expenses.biggest_category !== 'N/A' && (
                  <p className="text-[11px] text-slate-400">
                    Biggest spending category: <strong className="text-white">{data.expenses.biggest_category}</strong> at{' '}
                    <strong className="text-white">{formatINR(data.expenses.by_category?.[data.expenses.biggest_category] || 0)}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Budget Performance ────────────────────────────────── */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Budget Performance</h3>
                {(data.budget_performance || []).length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">No budgets configured yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(data.budget_performance || []).map((b) => {
                      const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.ok;
                      return (
                        <div key={b.category} className="space-y-1">
                          <div className="flex justify-between items-center text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {cfg.icon}
                              <span className="font-semibold text-slate-200">{b.category}</span>
                            </div>
                            <span className={`font-bold ${cfg.color}`}>{b.pct_used}%</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${b.status === 'exceeded' ? 'bg-rose-500' : b.status === 'critical' ? 'bg-orange-400' : b.status === 'warning' ? 'bg-amber-400' : 'bg-brand-500'}`}
                              style={{ width: `${Math.min(b.pct_used, 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Used: {formatINR(b.used)}</span>
                            <span>Budget: {formatINR(b.allocated)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Goal Progress ─────────────────────────────────────── */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-brand-400" />
                  Savings Goal Progress
                </h3>
                {(data.goal_progress || []).length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">No savings goals set up yet.</p>
                ) : (
                  <div className="space-y-4">
                    {(data.goal_progress || []).map((g) => (
                      <div key={g.name} className="space-y-1.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">{g.name}</span>
                          <span className="font-black text-brand-400">{g.pct}%</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                            style={{ width: `${g.pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>Saved: {formatINR(g.current)}</span>
                          <span>Target: {formatINR(g.target)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Portfolio + Savings snapshot ─────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Portfolio Holdings</span>
                <span className="text-xl font-black text-white">{data.portfolio?.holding_count || 0} assets</span>
                <span className="text-[11px] text-slate-400">{formatINR(data.portfolio?.total_invested || 0)} invested</span>
              </div>
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Prev. Month Savings</span>
                <span className={`text-xl font-black ${(data.savings?.previous_month_savings || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(data.savings?.previous_month_savings || 0)}
                </span>
              </div>
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Savings Change</span>
                <span className={`text-xl font-black ${(data.savings?.savings_change_pct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(data.savings?.savings_change_pct || 0) >= 0 ? '+' : ''}{data.savings?.savings_change_pct || 0}%
                </span>
                <span className="text-[11px] text-slate-400">vs last month</span>
              </div>
            </div>

          </>
        )}


      </div>
    </SidebarLayout>
  );
};

export default FinancialReportsPage;
