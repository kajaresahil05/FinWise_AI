import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { 
  TrendingUp, 
  Receipt, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Sliders,
  Sparkles,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Zap,
  Info,
  Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface Summary {
  total_income: number;
  total_expense: number;
  net_savings: number;
  savings_rate: number;
}

interface CategoryDist {
  category: string;
  amount: number;
}

interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  description: string;
}

interface Goal {
  id: number;
  name: string;
  current_amount: number;
  target_amount: number;
  progress: number;
  target_date: string;
}

interface Budget {
  id: number;
  category: string;
  amount: number;
  warning_threshold_1: number;
  warning_threshold_2: number;
}

interface Expense {
  id: number;
  amount: number;
  category: string;
  date: string;
}

const PIE_COLORS = ['#38aaf8', '#22c55e', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#6366f1'];

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categoryDistribution, setCategoryDistribution] = useState<CategoryDist[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [healthScore, setHealthScore] = useState<number | null>(null);

  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '$';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [analyticsRes, budgetRes, expenseRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/budgets'),
        api.get('/expenses')
      ]);

      setSummary(analyticsRes.data.summary);
      setCategoryDistribution(analyticsRes.data.category_distribution);
      setMonthlyTrend(analyticsRes.data.monthly_trend);
      setRecentTransactions(analyticsRes.data.recent_transactions);
      setGoals(analyticsRes.data.goals);
      setBudgets(budgetRes.data.budgets);
      setExpenses(expenseRes.data.expenses);

      // Resilient fetch of health score
      try {
        const healthRes = await api.get('/financial-health/score');
        setHealthScore(healthRes.data.score);
      } catch (e) {
        console.warn("Could not retrieve health score:", e);
      }
    } catch (err: any) {
      console.error("Error loading dashboard data:", err);
      setError(err.response?.data?.error || 'Failed to fetch financial dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper: Sum current month's expenses for a category
  const getUsedAmount = (cat: string) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed
    
    return expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        const matchesMonth = expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth;
        if (!matchesMonth) return false;
        
        if (cat === 'Overall') return true;
        return exp.category.toLowerCase() === cat.toLowerCase();
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  // Generate dynamic insights
  const generateInsights = () => {
    const list: string[] = [];
    if (!summary) return list;
    
    const rate = summary.savings_rate;
    if (rate > 25) {
      list.push(`Great job! Your savings rate is ${rate.toFixed(1)}%, which is higher than the recommended 20% benchmark. You are on track to build wealth.`);
    } else if (rate > 10) {
      list.push(`Your savings rate is ${rate.toFixed(1)}%. You are doing okay, but boosting this to 20% will accelerate your goal achievement.`);
    } else if (rate > 0) {
      list.push(`Warning: Your savings rate is only ${rate.toFixed(1)}%. Consider analyzing your major spending categories to see where you can cut back.`);
    } else if (summary.total_income > 0) {
      list.push("Alert: You spent more than you earned this month. Review your budget categories immediately to avoid accumulating debt.");
    }

    if (categoryDistribution && categoryDistribution.length > 0) {
      const highest = [...categoryDistribution].sort((a, b) => b.amount - a.amount)[0];
      list.push(`Your highest spending category is "${highest.category}" at ${currencySymbol}${highest.amount.toLocaleString()}. Check if this aligns with your priorities.`);
    }

    const exceededBudgets = budgets.filter(b => {
      const spent = getUsedAmount(b.category);
      return spent > b.amount;
    });
    if (exceededBudgets.length > 0) {
      list.push(`Attention: You have exceeded your budget limit for ${exceededBudgets.map(b => b.category).join(', ')}. Try to freeze spending in these areas.`);
    } else {
      const closeBudgets = budgets.filter(b => {
        const spent = getUsedAmount(b.category);
        const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return percent >= b.warning_threshold_1 && percent <= 100;
      });
      if (closeBudgets.length > 0) {
        list.push(`Heads up: You are approaching budget thresholds in ${closeBudgets.map(b => b.category).join(', ')}. Keep an eye on your remaining limits.`);
      }
    }

    if (goals && goals.length > 0) {
      const closestGoal = [...goals].sort((a, b) => b.progress - a.progress)[0];
      if (closestGoal.progress >= 90 && closestGoal.progress < 100) {
        list.push(`So close! Your goal "${closestGoal.name}" is ${closestGoal.progress.toFixed(0)}% complete. Keep going to reach the finish line!`);
      } else if (closestGoal.progress < 100) {
        list.push(`Your goal "${closestGoal.name}" is at ${closestGoal.progress.toFixed(0)}% completion. Consistency is key!`);
      }
    }

    if (summary.total_income === 0 && summary.total_expense === 0) {
      list.push("Welcome! Add your monthly income streams and expenses to get started with AI-powered financial coaching.");
    }

    return list;
  };

  const insightsList = generateInsights();

  // Helper calculations for active budget alerts
  const budgetAlerts: { category: string; percent: number; limit: number; used: number; severity: 'warning' | 'critical' | 'exceeded' }[] = [];
  budgets.forEach(b => {
    const used = getUsedAmount(b.category);
    const percent = b.amount > 0 ? (used / b.amount) * 100 : 0;
    
    if (percent >= 100) {
      budgetAlerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'exceeded' });
    } else if (percent >= b.warning_threshold_2) {
      budgetAlerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'critical' });
    } else if (percent >= b.warning_threshold_1) {
      budgetAlerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'warning' });
    }
  });

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.profile?.name || 'Friend'}!
            </h1>
            <p className="text-slate-400 mt-1">Track smart, save better, and invest wisely. Here is your financial overview.</p>
          </div>
          <div className="flex gap-3">
            <Link 
              to="/expenses" 
              className="px-4 py-2 text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-xl text-slate-300 transition-all"
            >
              Add Expense
            </Link>
            <Link 
              to="/income" 
              className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl shadow-md transition-all shadow-brand-500/10"
            >
              Add Income
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-center gap-3.5 shadow-md">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-32 flex flex-col justify-center items-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-400 text-sm font-medium">Analyzing financial records...</span>
          </div>
        ) : (
          <>
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Total Inflow */}
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <TrendingUp className="w-16 h-16 text-white" />
                </div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Inflow</span>
                <h2 className="text-2xl font-bold mt-2 text-emerald-400">
                  {currencySymbol}{(summary?.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  <span>All time recorded income</span>
                </div>
              </div>

              {/* Total Outflow */}
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Receipt className="w-16 h-16 text-white" />
                </div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Outflow</span>
                <h2 className="text-2xl font-bold mt-2 text-red-400">
                  {currencySymbol}{(summary?.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500">
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                  <span>All time recorded expenses</span>
                </div>
              </div>

              {/* Net Balance */}
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Wallet className="w-16 h-16 text-white" />
                </div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Balance</span>
                <h2 className={`text-2xl font-bold mt-2 ${(summary?.net_savings || 0) >= 0 ? 'text-brand-400' : 'text-amber-500'}`}>
                  {currencySymbol}{(summary?.net_savings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 text-[10px] text-slate-500">
                  <span>Inflow - Outflow savings surplus</span>
                </div>
              </div>

              {/* Savings Rate */}
              <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Zap className="w-16 h-16 text-white" />
                </div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Savings Rate</span>
                <h2 className={`text-2xl font-bold mt-2 ${(summary?.savings_rate || 0) >= 20 ? 'text-emerald-400' : (summary?.savings_rate || 0) >= 10 ? 'text-brand-400' : 'text-amber-500'}`}>
                  {(summary?.savings_rate || 0).toFixed(1)}%
                </h2>
                <div className="mt-3 text-[10px] text-slate-500">
                  <span>Percentage of inflow saved</span>
                </div>
              </div>

              {/* Health Score */}
              <Link to="/financial-health" className="glass-card p-6 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all block">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Heart className="w-16 h-16 text-white group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Health Score</span>
                <h2 className={`text-2xl font-bold mt-2 ${
                  healthScore !== null 
                    ? healthScore >= 80 ? 'text-emerald-400' : healthScore >= 50 ? 'text-brand-400' : 'text-rose-400'
                    : 'text-slate-400'
                }`}>
                  {healthScore !== null ? `${healthScore}/100` : 'N/A'}
                </h2>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-500 group-hover:text-brand-400 transition-colors">
                  <span>View Diagnostics</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </Link>
            </div>

            {/* AI Insights and Budget Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Insights Card */}
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <h3 className="font-extrabold text-white">AI Financial Insights</h3>
                </div>
                <div className="space-y-3.5">
                  {insightsList.length === 0 ? (
                    <div className="flex items-center gap-3 text-slate-400 text-sm py-4">
                      <Info className="w-4 h-4 text-slate-500" />
                      <span>Gathering historical data to compile suggestions...</span>
                    </div>
                  ) : (
                    insightsList.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white/2 border border-white/5 p-3 rounded-xl">
                        <Sparkles className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">{insight}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Budget Alerts Panel */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Sliders className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-white">Budget Safeguards</h3>
                </div>
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {budgets.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      No budget limits configured.
                      <Link to="/budget" className="text-brand-400 hover:text-brand-300 font-semibold block mt-1">Set one up now</Link>
                    </div>
                  ) : budgetAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 text-xs gap-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-500/50" />
                      <span className="font-semibold text-slate-300">All limits under control</span>
                      <span className="text-[10px] text-slate-500">You are within your configured limits for this month.</span>
                    </div>
                  ) : (
                    budgetAlerts.map((alert) => {
                      const isExceeded = alert.severity === 'exceeded';
                      const isCritical = alert.severity === 'critical';
                      return (
                        <div 
                          key={alert.category} 
                          className={`p-3 rounded-xl border space-y-1.5 
                            ${isExceeded 
                              ? 'bg-red-500/10 border-red-500/25 text-red-200' 
                              : isCritical 
                                ? 'bg-amber-500/10 border-amber-500/25 text-amber-200' 
                                : 'bg-yellow-500/5 border-yellow-500/15 text-yellow-300'
                            }`}
                        >
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-white">{alert.category} Budget</span>
                            <span>{alert.percent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-dark-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isExceeded ? 'bg-red-500' : isCritical ? 'bg-amber-500' : 'bg-yellow-500'}`}
                              style={{ width: `${Math.min(alert.percent, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Used {currencySymbol}{Math.round(alert.used).toLocaleString()} of {currencySymbol}{Math.round(alert.limit).toLocaleString()} limit.
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Recharts Graphical Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Inflow vs Outflow */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">Inflow vs Outflow</h3>
                  <p className="text-[10px] text-slate-500">Historical trend comparing monthly income, expenses, and savings.</p>
                </div>
                <div className="w-full h-[300px] pt-4">
                  {monthlyTrend.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">No trend data available.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#252b36" vertical={false} />
                        <XAxis dataKey="month" stroke="#667789" fontSize={10} tickLine={false} />
                        <YAxis stroke="#667789" fontSize={10} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#252b36', 
                            borderColor: 'rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            color: '#e2e8f0',
                            fontSize: '11px'
                          }} 
                          formatter={(value) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']}
                        />
                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Bar name="Inflow" dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar name="Outflow" dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar name="Savings Surplus" dataKey="savings" fill="#38aaf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Expense Category Distribution */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">Category Distribution</h3>
                  <p className="text-[10px] text-slate-500">Breakdown of outbound expenses across budget categories.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center h-[300px]">
                  {categoryDistribution.length === 0 ? (
                    <div className="col-span-2 text-center text-slate-500 text-xs">No expense records found to distribute.</div>
                  ) : (
                    <>
                      <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="amount"
                              nameKey="category"
                            >
                              {categoryDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#252b36', 
                                borderColor: 'rgba(255,255,255,0.08)',
                                borderRadius: '12px',
                                color: '#e2e8f0',
                                fontSize: '11px'
                              }}
                              formatter={(value) => [`${currencySymbol}${Number(value).toLocaleString()}`, '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Custom Legend */}
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {categoryDistribution.map((item, idx) => {
                          const total = categoryDistribution.reduce((sum, d) => sum + d.amount, 0);
                          const pct = total > 0 ? (item.amount / total) * 100 : 0;
                          return (
                            <div key={item.category} className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                <span className="text-slate-300 truncate max-w-[100px]">{item.category}</span>
                              </div>
                              <span className="font-semibold text-slate-400">
                                {currencySymbol}{Math.round(item.amount).toLocaleString()} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Savings Goals and Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Savings Goals Progress */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="font-extrabold text-white flex items-center gap-2">
                    <Target className="w-4.5 h-4.5 text-brand-400" />
                    <span>Active Milestones</span>
                  </h3>
                  <Link to="/goals" className="text-xs text-brand-400 hover:text-brand-300 font-bold">
                    Manage
                  </Link>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {goals.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">
                      No active savings goals recorded.
                      <Link to="/goals" className="text-brand-400 hover:text-brand-300 font-semibold block mt-1">Create one now</Link>
                    </div>
                  ) : (
                    goals.map((g) => {
                      const isCompleted = g.progress >= 100;
                      
                      // Calculate required monthly contribution
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const target = new Date(g.target_date);
                      target.setHours(0,0,0,0);
                      const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
                      const monthsRemaining = diffMonths <= 0 ? 1 : diffMonths;
                      const needed = Math.max(0, g.target_amount - g.current_amount);
                      const monthlyTarget = needed / monthsRemaining;

                      return (
                        <div key={g.id} className="space-y-2 bg-white/2 border border-white/5 p-4 rounded-xl">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-white">{g.name}</h4>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>Target: {g.target_date}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-300">
                                {currencySymbol}{g.current_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                of {currencySymbol}{g.target_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                              <span>Progress</span>
                              <span>{g.progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-brand-500'}`}
                                style={{ width: `${g.progress}%` }}
                              />
                            </div>
                          </div>

                          {!isCompleted && needed > 0 && (
                            <p className="text-[10px] text-brand-400 font-semibold pt-1">
                              Requires saving {currencySymbol}{Math.ceil(monthlyTarget).toLocaleString()}/month to achieve
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Transactions Activity Log */}
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="font-extrabold text-white flex items-center gap-2">
                    <Receipt className="w-4.5 h-4.5 text-red-400" />
                    <span>Recent Activity</span>
                  </h3>
                  <div className="flex gap-3 text-xs font-bold">
                    <Link to="/expenses" className="text-slate-400 hover:text-white">Expenses</Link>
                    <span className="text-slate-700">|</span>
                    <Link to="/income" className="text-slate-400 hover:text-white">Income</Link>
                  </div>
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {recentTransactions.length === 0 ? (
                    <div className="py-16 text-center text-slate-500 text-xs">No recent transaction history found.</div>
                  ) : (
                    recentTransactions.map((tx) => {
                      const isIncome = tx.type === 'income';
                      return (
                        <div 
                          key={tx.id} 
                          className="flex justify-between items-center p-3 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all"
                        >
                          <div className="overflow-hidden pr-2">
                            <h4 className="text-xs font-bold text-white truncate">{tx.description}</h4>
                            <p className="text-[9px] text-slate-500 mt-1 font-semibold uppercase tracking-wider">
                              {tx.category} • {tx.date}
                            </p>
                          </div>
                          <span className={`text-xs font-bold flex-shrink-0 ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
};

export default DashboardPage;
