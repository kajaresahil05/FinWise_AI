import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  TrendingUp, 
  Calendar, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Income {
  id: number;
  amount: number;
  source: string;
  date: string;
  description: string;
  is_recurring: boolean;
  recurrence_period: string | null;
}

const INCOME_SOURCES = [
  'Salary',
  'Freelancing',
  'Business',
  'Investments',
  'Rental Income',
  'Other Income'
];

const RECURRENCE_PERIODS = [
  'Weekly',
  'Monthly',
  'Yearly'
];

const IncomePage: React.FC = () => {
  const { user } = useAuth();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  
  // Form states
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(INCOME_SOURCES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePeriod, setRecurrencePeriod] = useState(RECURRENCE_PERIODS[1]); // default Monthly
  const [saving, setSaving] = useState(false);

  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '$';

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/income');
      setIncomes(response.data.incomes);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch income records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, []);

  const openAddModal = () => {
    setEditingIncome(null);
    setAmount('');
    setSource(INCOME_SOURCES[0]);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsRecurring(false);
    setRecurrencePeriod(RECURRENCE_PERIODS[1]);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (income: Income) => {
    setEditingIncome(income);
    setAmount(income.amount.toString());
    setSource(income.source);
    setDate(income.date);
    setDescription(income.description || '');
    setIsRecurring(income.is_recurring);
    setRecurrencePeriod(income.recurrence_period || RECURRENCE_PERIODS[1]);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this income entry?')) return;
    try {
      setError(null);
      await api.delete(`/income/${id}`);
      setIncomes(incomes.filter(inc => inc.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete income entry.');
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
        amount: parseFloat(amount),
        source,
        date,
        description,
        is_recurring: isRecurring,
        recurrence_period: isRecurring ? recurrencePeriod : null
      };

      if (editingIncome) {
        // Edit mode
        const response = await api.put(`/income/${editingIncome.id}`, payload);
        setIncomes(incomes.map(inc => inc.id === editingIncome.id ? response.data.income : inc));
      } else {
        // Add mode
        const response = await api.post('/income', payload);
        setIncomes([response.data.income, ...incomes]);
      }
      
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save income record.');
    } finally {
      setSaving(false);
    }
  };

  // Calculations
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const recurringTotal = incomes.filter(item => item.is_recurring).reduce((sum, item) => sum + item.amount, 0);

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Income Streams</h1>
            <p className="text-slate-400 mt-1">Track salary, freelancing, investments, and other inflows.</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 shadow-black/25 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Add Income</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <TrendingUp className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Cumulative Income</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-brand-400 mt-2">Combined recorded items</p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <RefreshCw className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Recurring Income</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {currencySymbol}{recurringTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-emerald-400 mt-2">
              {incomes.filter(item => item.is_recurring).length} recurring streams
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Calendar className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Inflows Recorded</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {incomes.length}
            </h2>
            <p className="text-xs text-slate-400 mt-2">Unique transactions</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && !isModalOpen && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Table & List Card */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
            <h3 className="font-bold text-white">Transaction Logs</h3>
            <span className="text-xs text-slate-500 font-semibold">{incomes.length} records found</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400 text-sm font-medium">Fetching transactions...</span>
            </div>
          ) : incomes.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="p-4 bg-brand-500/5 rounded-2xl text-brand-400 mb-4 border border-brand-500/10">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-white mb-1">No Inflows Recorded</h4>
              <p className="text-sm text-slate-400">Click "Add Income" to record your first stream of salary, freelance work, or other funding.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/2 border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Source</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 text-right">Amount</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {incomes.map((income) => (
                    <tr key={income.id} className="hover:bg-white/2 transition-colors text-slate-300 text-sm">
                      <td className="py-4.5 px-6 font-bold text-white">{income.source}</td>
                      <td className="py-4.5 px-6 font-medium text-slate-400">{income.date}</td>
                      <td className="py-4.5 px-6">
                        {income.is_recurring ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <RefreshCw className="w-2.5 h-2.5" />
                            {income.recurrence_period}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            One-time
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-6 max-w-xs truncate text-slate-400">
                        {income.description || '-'}
                      </td>
                      <td className="py-4.5 px-6 text-right font-extrabold text-emerald-400">
                        {currencySymbol}{income.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => openEditModal(income)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(income.id)}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <div className="relative glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-white/10 z-10">
              <h3 className="text-xl font-extrabold text-white mb-4">
                {editingIncome ? 'Edit Income Entry' : 'Add Income Stream'}
              </h3>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount input */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Amount ({currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full pl-8 pr-4 py-3 rounded-xl glass-input text-white text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Source Select */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Income Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-dark-900 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
                  >
                    {INCOME_SOURCES.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Date Received
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Freelance Web design payout"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                  />
                </div>

                {/* Recurring Options */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-white/10 bg-dark-900 text-brand-500 focus:ring-brand-500/20"
                    />
                    <span className="text-slate-300 text-sm font-semibold select-none">
                      This is a recurring income stream
                    </span>
                  </label>
                </div>

                {isRecurring && (
                  <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2 animate-fade-in">
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      Recurrence Frequency
                    </label>
                    <select
                      value={recurrencePeriod}
                      onChange={(e) => setRecurrencePeriod(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-white text-sm focus:outline-none"
                    >
                      {RECURRENCE_PERIODS.map((period) => (
                        <option key={period} value={period}>{period}</option>
                      ))}
                    </select>
                  </div>
                )}

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
                    {saving ? 'Saving...' : editingIncome ? 'Save Changes' : 'Record Income'}
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

export default IncomePage;
