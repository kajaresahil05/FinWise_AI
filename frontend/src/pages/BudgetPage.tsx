import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sliders, 
  AlertTriangle,
  AlertCircle
} from 'lucide-react';

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

const BUDGET_CATEGORIES = [
  'Overall',
  'Food',
  'Groceries',
  'Travel',
  'Shopping',
  'Bills',
  'Rent',
  'Education',
  'Healthcare',
  'Entertainment',
  'Subscriptions',
  'Transportation',
  'Other'
];

const BudgetPage: React.FC = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form State
  const [category, setCategory] = useState(BUDGET_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [t1, setT1] = useState('70');
  const [t2, setT2] = useState('90');
  const [saving, setSaving] = useState(false);

  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '$';

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [budRes, expRes] = await Promise.all([
        api.get('/budgets'),
        api.get('/expenses')
      ]);
      setBudgets(budRes.data.budgets);
      setExpenses(expRes.data.expenses);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch budget information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingBudget(null);
    setCategory(BUDGET_CATEGORIES[0]);
    setAmount('');
    setT1('70');
    setT2('90');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setAmount(budget.amount.toString());
    setT1(budget.warning_threshold_1.toString());
    setT2(budget.warning_threshold_2.toString());
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this budget category limit?')) return;
    try {
      setError(null);
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete budget limit.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        category,
        amount: parseFloat(amount),
        warning_threshold_1: parseFloat(t1),
        warning_threshold_2: parseFloat(t2)
      };

      if (editingBudget) {
        const response = await api.put(`/budgets/${editingBudget.id}`, payload);
        setBudgets(budgets.map(b => b.id === editingBudget.id ? response.data.budget : b));
      } else {
        const response = await api.post('/budgets', payload);
        setBudgets([...budgets, response.data.budget]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save budget settings.');
    } finally {
      setSaving(false);
    }
  };

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

  // Generate warning summaries
  const alerts: { category: string; percent: number; limit: number; used: number; severity: 'warning' | 'critical' | 'exceeded' }[] = [];
  
  budgets.forEach(b => {
    const used = getUsedAmount(b.category);
    const percent = b.amount > 0 ? (used / b.amount) * 100 : 0;
    
    if (percent >= 100) {
      alerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'exceeded' });
    } else if (percent >= b.warning_threshold_2) {
      alerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'critical' });
    } else if (percent >= b.warning_threshold_1) {
      alerts.push({ category: b.category, percent, limit: b.amount, used, severity: 'warning' });
    }
  });

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Monthly Budgets</h1>
            <p className="text-slate-400 mt-1">Set monthly category limits and monitor thresholds in real time.</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 shadow-black/25 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Set Limit</span>
          </button>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Budget Alerts</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => {
                const isExceeded = alert.severity === 'exceeded';
                const isCritical = alert.severity === 'critical';
                
                return (
                  <div 
                    key={alert.category} 
                    className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-md transition-all
                      ${isExceeded 
                        ? 'bg-red-500/10 border-red-500/35 text-red-200' 
                        : isCritical 
                          ? 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                          : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
                      }
                    `}
                  >
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 
                      ${isExceeded ? 'text-red-400' : 'text-amber-400'}
                    `} />
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {alert.category === 'Overall' ? 'Overall Budget Limit' : `${alert.category} Category Budget`}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {isExceeded ? (
                          <span>You have exceeded this budget! Used {currencySymbol}{alert.used.toLocaleString()} of {currencySymbol}{alert.limit.toLocaleString()} ({alert.percent.toFixed(0)}%).</span>
                        ) : (
                          <span>Approaching limit! Used {currencySymbol}{alert.used.toLocaleString()} of {currencySymbol}{alert.limit.toLocaleString()} ({alert.percent.toFixed(0)}%).</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-20 flex flex-col justify-center items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400 text-sm">Loading limits...</span>
            </div>
          ) : budgets.length === 0 ? (
            <div className="col-span-2 py-20 glass-card text-center rounded-2xl flex flex-col items-center justify-center max-w-md mx-auto p-8">
              <div className="p-4 bg-brand-500/5 rounded-2xl text-brand-400 mb-4 border border-brand-500/10">
                <Sliders className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-white mb-1">No Budgets Configured</h4>
              <p className="text-sm text-slate-400">Add spending limits for categories like Food, Bills, Rent, or set an Overall budget to track status.</p>
            </div>
          ) : (
            budgets.map((b) => {
              const used = getUsedAmount(b.category);
              const percent = b.amount > 0 ? (used / b.amount) * 100 : 0;
              const remaining = b.amount - used;
              
              // Color class based on threshold alerts
              let progressColorClass = 'bg-emerald-500';
              let textColorClass = 'text-emerald-400';
              if (percent >= 100) {
                progressColorClass = 'bg-red-500 shadow-lg shadow-red-500/30';
                textColorClass = 'text-red-400';
              } else if (percent >= b.warning_threshold_2) {
                progressColorClass = 'bg-red-500';
                textColorClass = 'text-red-400';
              } else if (percent >= b.warning_threshold_1) {
                progressColorClass = 'bg-amber-500';
                textColorClass = 'text-amber-400';
              }

              return (
                <div key={b.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  {/* Title & Actions */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-lg text-white">
                        {b.category}
                      </h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                        Limits: {b.warning_threshold_1}% / {b.warning_threshold_2}% warn
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(b)}
                        className="p-2 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(b.id)}
                        className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/5 rounded-xl text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Info */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 font-semibold">Progress</span>
                      <span className={`font-bold ${textColorClass}`}>
                        {percent.toFixed(0)}% Used
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-dark-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${progressColorClass}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial amounts */}
                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/5 text-center">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Spent</p>
                      <p className="font-bold text-sm text-slate-300 mt-0.5">
                        {currencySymbol}{used.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Limit</p>
                      <p className="font-bold text-sm text-white mt-0.5">
                        {currencySymbol}{b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Remaining</p>
                      <p className={`font-bold text-sm mt-0.5 ${remaining >= 0 ? 'text-slate-300' : 'text-red-400'}`}>
                        {remaining >= 0 ? `${currencySymbol}${remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `-${currencySymbol}${Math.abs(remaining).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div className="relative glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-white/10 z-10">
              <h3 className="text-xl font-extrabold text-white mb-4">
                {editingBudget ? 'Update Category Limit' : 'Configure Category Limit'}
              </h3>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Category Name
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={!!editingBudget} // category cannot be modified once set to avoid key issues
                    className="w-full px-3.5 py-3 rounded-xl bg-dark-900 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  >
                    {BUDGET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Monthly Limit ({currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full pl-8 pr-4 py-3 rounded-xl glass-input text-white text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Threshold Warning Configuration */}
                <div className="pt-2 space-y-4">
                  <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    Alert Thresholds (%)
                  </span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-500 text-[10px] font-semibold uppercase mb-1">
                        First warning (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={t1}
                        onChange={(e) => setT1(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none text-center font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 text-[10px] font-semibold uppercase mb-1">
                        Critical warning (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={t2}
                        onChange={(e) => setT2(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none text-center font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3.5 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-semibold py-3 rounded-xl transition-all border border-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Saving...' : editingBudget ? 'Save Changes' : 'Create Limit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default BudgetPage;
