import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Target, 
  AlertCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

const GOAL_PRESETS = [
  'Emergency Fund',
  'Laptop',
  'Bike',
  'Car',
  'Vacation',
  'Education',
  'Home Deposit',
  'Other'
];

const GoalsPage: React.FC = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form State
  const [name, setName] = useState(GOAL_PRESETS[0]);
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Emergency Fund Calculator Widget Local State
  const [essentialExpenses, setEssentialExpenses] = useState(
    user?.profile?.monthly_expenses ? user.profile.monthly_expenses.toString() : '20000'
  );
  const [currentEmergencySaved, setCurrentEmergencySaved] = useState('10000');
  const [emergencyTargetMonths, setEmergencyTargetMonths] = useState<number>(6); // 3, 6, 9, 12 months

  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '$';

  const fetchGoals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/goals');
      setGoals(response.data.goals);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch financial goals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const openAddModal = () => {
    setEditingGoal(null);
    setName(GOAL_PRESETS[0]);
    setTargetAmount('');
    setCurrentAmount('0');
    // Default target date: 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setTargetDate(nextYear.toISOString().split('T')[0]);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount.toString());
    setCurrentAmount(goal.current_amount.toString());
    setTargetDate(goal.target_date);
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      setError(null);
      await api.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete goal.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }
    if (parseFloat(currentAmount) < 0) {
      setError('Current savings cannot be negative.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount),
        target_date: targetDate
      };

      if (editingGoal) {
        const response = await api.put(`/goals/${editingGoal.id}`, payload);
        setGoals(goals.map(g => g.id === editingGoal.id ? response.data.goal : g));
      } else {
        const response = await api.post('/goals', payload);
        setGoals([...goals, response.data.goal]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save savings goal.');
    } finally {
      setSaving(false);
    }
  };

  // Helper calculations for goals
  const calculateGoalMetrics = (goal: Goal) => {
    const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
    
    // Remaining days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(goal.target_date);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Remaining months for monthly savings calculation
    const diffMonths = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    const monthsRemaining = diffMonths <= 0 ? 1 : diffMonths;
    
    const needed = Math.max(0, goal.target_amount - goal.current_amount);
    const monthlySavingsNeeded = needed / monthsRemaining;
    
    return {
      progress: Math.min(100, progress),
      daysLeft: diffDays,
      monthlySavingsNeeded,
      needed
    };
  };

  // Emergency Fund Calculations
  const calculatedEmergencyTarget = parseFloat(essentialExpenses || '0') * emergencyTargetMonths;
  const currentSavedNum = parseFloat(currentEmergencySaved || '0');
  const emergencyRemaining = Math.max(0, calculatedEmergencyTarget - currentSavedNum);
  const emergencyProgress = calculatedEmergencyTarget > 0 ? (currentSavedNum / calculatedEmergencyTarget) * 100 : 0;
  const suggestedEmergencyMonthly = emergencyRemaining / 12; // save over 1 year

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Savings Goals</h1>
            <p className="text-slate-400 mt-1">Create milestones, calculate monthly quotas, and monitor progress.</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 shadow-black/25 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Create Goal</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-20 flex flex-col justify-center items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400 text-sm">Loading savings milestones...</span>
            </div>
          ) : goals.length === 0 ? (
            <div className="col-span-2 py-20 glass-card text-center rounded-2xl flex flex-col items-center justify-center max-w-md mx-auto p-8">
              <div className="p-4 bg-brand-500/5 rounded-2xl text-brand-400 mb-4 border border-brand-500/10">
                <Target className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-white mb-1">No Active Goals</h4>
              <p className="text-sm text-slate-400">Add custom savings goals like an Emergency Fund, Laptop, or Vacation to plan required savings.</p>
            </div>
          ) : (
            goals.map((g) => {
              const { progress, daysLeft, monthlySavingsNeeded, needed } = calculateGoalMetrics(g);
              const isCompleted = progress >= 100;
              
              return (
                <div key={g.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between space-y-4">
                  {/* Goal Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'}`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-white">{g.name}</h3>
                        <p className="text-xs text-slate-500">
                          {daysLeft > 0 ? (
                            <span>{daysLeft} days remaining ({g.target_date})</span>
                          ) : isCompleted ? (
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Goal Achieved!
                            </span>
                          ) : (
                            <span className="text-red-400 font-semibold">Target date passed</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => openEditModal(g)}
                        className="p-1.5 hover:bg-white/5 border border-transparent rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 hover:bg-red-500/10 border border-transparent rounded-lg text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress info */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Progress</span>
                      <span className={`font-bold ${isCompleted ? 'text-emerald-400' : 'text-brand-400'}`}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 bg-dark-900 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${isCompleted ? 'bg-emerald-500 shadow-md shadow-emerald-500/25' : 'bg-brand-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Bottom details block */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5 text-sm">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Saved</p>
                      <p className="font-extrabold text-slate-200 mt-0.5">
                        {currencySymbol}{g.current_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Target: {currencySymbol}{g.target_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>

                    <div className="text-right">
                      {!isCompleted ? (
                        <>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Monthly Savings Needed</p>
                          <p className="font-extrabold text-brand-400 mt-0.5 text-base">
                            {currencySymbol}{Math.ceil(monthlySavingsNeeded).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {currencySymbol}{needed.toLocaleString(undefined, { maximumFractionDigits: 0 })} left
                          </p>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-end">
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold">
                            <ShieldCheck className="w-4 h-4" />
                            Completed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Emergency Fund Calculator Widget */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            <div className="p-2 bg-gradient-to-tr from-brand-600 to-accent-500 rounded-xl text-white">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">Emergency Fund Calculator</h2>
              <p className="text-xs text-slate-400">Calculate suggested reserve funds using your essential expenses.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Inputs Block */}
            <div className="space-y-4">
              {/* Essential Expenses input */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Essential Monthly Expenses ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="20000"
                  value={essentialExpenses}
                  onChange={(e) => setEssentialExpenses(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none"
                />
              </div>

              {/* Saved Emergency input */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Current Emergency Savings ({currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  value={currentEmergencySaved}
                  onChange={(e) => setCurrentEmergencySaved(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none"
                />
              </div>

              {/* Target months selector buttons */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Cover Duration Target
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 9, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEmergencyTargetMonths(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border
                        ${emergencyTargetMonths === m
                          ? 'bg-brand-500/10 text-brand-300 border-brand-500/20 shadow-inner'
                          : 'bg-white/2 text-slate-400 border-white/5 hover:text-white hover:bg-white/5'
                        }
                      `}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Block */}
            <div className="bg-white/2 border border-white/5 p-5 rounded-2xl space-y-4 flex flex-col justify-between h-full">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Target Fund Goal</span>
                  <span className="font-extrabold text-sm text-white">
                    {currencySymbol}{calculatedEmergencyTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full h-2.5 bg-dark-900 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-600 to-accent-500 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, emergencyProgress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                    <span>{emergencyProgress.toFixed(0)}% Saved</span>
                    <span>Remaining: {currencySymbol}{emergencyRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>

              {/* Save advice */}
              <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Status</p>
                  <p className="font-bold text-sm text-slate-300 mt-1">
                    {emergencyRemaining === 0 ? 'Fully Funded' : 'Funding Needed'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Suggest contribution</p>
                  <p className="font-extrabold text-base text-accent-400 mt-1">
                    {currencySymbol}{Math.ceil(suggestedEmergencyMonthly).toLocaleString(undefined, { maximumFractionDigits: 0 })} /mo
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Calculated over a 12-month timeline</p>
                </div>
              </div>
            </div>
          </div>
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
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h3>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Preset Names Selection */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Goal Topic
                  </label>
                  <select
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl bg-dark-900 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-brand-500"
                  >
                    {GOAL_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>
                </div>

                {name === 'Other' && (
                  <div className="animate-fade-in">
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Custom Goal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dream Wedding, New Shoes"
                      required
                      value={editingGoal && editingGoal.name !== 'Other' ? name : name === 'Other' ? '' : name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Target Amount */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Target Goal ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 50000"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm font-semibold focus:outline-none"
                    />
                  </div>

                  {/* Current Savings */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Already Saved ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Target Milestone Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                  />
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
                    {saving ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
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

export default GoalsPage;
