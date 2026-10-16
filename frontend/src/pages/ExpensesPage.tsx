import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Receipt, 
  Calendar, 
  Filter, 
  Search, 
  ArrowUpDown,
  AlertCircle,
  CreditCard,
  Sparkles,
  Camera,
  Mic,
  MicOff,
  Loader2
} from 'lucide-react';

interface Expense {
  id: number;
  amount: number;
  category: string;
  subcategory: string;
  date: string;
  payment_method: string;
  description: string;
  merchant: string;
  notes: string;
}

const EXPENSE_CATEGORIES = [
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

const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Net Banking',
  'Other'
];

const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [description, setDescription] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Quick Add state
  const [aiText, setAiText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [aiParsedOriginal, setAiParsedOriginal] = useState<{
    category: string;
    subcategory: string;
    merchant: string;
    amount: string;
  } | null>(null);
  const [parsedText, setParsedText] = useState('');

  // Voice Input & OCR States
  const [isListening, setIsListening] = useState(false);
  const [voiceSupport, setVoiceSupport] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Check voice support on mount
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupport(false);
    }
  }, []);

  const currencySymbol = user?.profile?.currency === 'INR' ? '₹' : '$';

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        sort_by: sortBy,
        order: sortOrder
      };
      
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/expenses', { params });
      setExpenses(response.data.expenses);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch expenses.');
    } finally {
      setLoading(false);
    }
  };

  // Re-run search/filters when state changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchExpenses();
    }, 300); // Debounce search changes

    return () => clearTimeout(delayDebounceFn);
  }, [search, categoryFilter, startDate, endDate, sortBy, sortOrder]);

  const openAddModal = () => {
    setEditingExpense(null);
    setAmount('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setSubcategory('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod(PAYMENT_METHODS[0]);
    setDescription('');
    setMerchant('');
    setNotes('');
    setError(null);
    setAiParsedOriginal(null);
    setParsedText('');
    setIsModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
    setSubcategory(expense.subcategory || '');
    setDate(expense.date);
    setPaymentMethod(expense.payment_method || PAYMENT_METHODS[0]);
    setDescription(expense.description || '');
    setMerchant(expense.merchant || '');
    setNotes(expense.notes || '');
    setError(null);
    setAiParsedOriginal(null);
    setParsedText('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      setError(null);
      await api.delete(`/expenses/${id}`);
      setExpenses(expenses.filter(exp => exp.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete expense record.');
    }
  };

  const handleAiParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    try {
      setParsing(true);
      setError(null);
      const response = await api.post('/ai/expense-categorize', { text: aiText });
      const data = response.data;

      setEditingExpense(null);
      setAmount(data.amount ? data.amount.toString() : '');
      const matchedCategory = EXPENSE_CATEGORIES.includes(data.category) ? data.category : 'Other';
      setCategory(matchedCategory);
      setSubcategory(data.subcategory || '');
      setDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setDescription(aiText);
      setMerchant(data.merchant || '');
      setNotes('');
      
      setAiParsedOriginal({
        category: matchedCategory,
        subcategory: data.subcategory || '',
        merchant: data.merchant || '',
        amount: data.amount ? data.amount.toString() : ''
      });
      setParsedText(aiText);
      setAiText(''); // Clear input
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to parse expense with AI.');
    } finally {
      setParsing(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiText(transcript);
      setIsListening(false);
      
      try {
        setParsing(true);
        const response = await api.post('/expenses/voice-entry', { text: transcript });
        const data = response.data;
        
        setEditingExpense(null);
        setAmount(data.amount ? data.amount.toString() : '');
        const matchedCategory = EXPENSE_CATEGORIES.includes(data.category) ? data.category : 'Other';
        setCategory(matchedCategory);
        setSubcategory(data.subcategory || '');
        setDate(data.date || new Date().toISOString().split('T')[0]);
        setPaymentMethod(PAYMENT_METHODS[0]);
        setDescription(data.description || transcript);
        setMerchant(data.merchant || '');
        setNotes('');
        
        setAiParsedOriginal({
          category: matchedCategory,
          subcategory: data.subcategory || '',
          merchant: data.merchant || '',
          amount: data.amount ? data.amount.toString() : ''
        });
        setParsedText(transcript);
        setIsModalOpen(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to parse voice input.');
      } finally {
        setParsing(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      setError(`Voice input error: ${event.error}. Please try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image size must be under 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      setScanning(true);
      setScanMessage("Extracting text with OCR...");
      setError(null);

      const response = await api.post('/expenses/scan-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const data = response.data;

      if (data.ocr_status === 'fallback') {
        alert(
          "⚠️ OCR Engine Notice:\n\n" +
          "Tesseract OCR is not installed or configured on the host server.\n" +
          "We are running in Simulation/Demo mode to demonstrate the parser.\n\n" +
          "Pre-populated receipt data: " + (data.merchant || "Mock merchant")
        );
      }

      setEditingExpense(null);
      setAmount(data.amount ? data.amount.toString() : '');
      const matchedCategory = EXPENSE_CATEGORIES.includes(data.category) ? data.category : 'Other';
      setCategory(matchedCategory);
      setSubcategory(data.subcategory || '');
      setDate(data.date || new Date().toISOString().split('T')[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setDescription(`Scanned receipt from ${data.merchant || 'Merchant'}`);
      setMerchant(data.merchant || '');
      setNotes(`Tax amount: ₹${data.tax || '0.00'}`);
      
      setAiParsedOriginal({
        category: matchedCategory,
        subcategory: data.subcategory || '',
        merchant: data.merchant || '',
        amount: data.amount ? data.amount.toString() : ''
      });
      setParsedText(data.ocr_text || `Receipt scan`);
      setIsModalOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to scan receipt image.');
    } finally {
      setScanning(false);
      setScanMessage(null);
      e.target.value = '';
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
        category,
        subcategory,
        date,
        payment_method: paymentMethod,
        description,
        merchant,
        notes
      };

      // Check and submit AI correction if values differ
      if (aiParsedOriginal && parsedText) {
        const isModified = 
          category !== aiParsedOriginal.category ||
          subcategory !== aiParsedOriginal.subcategory ||
          merchant !== aiParsedOriginal.merchant ||
          parseFloat(amount) !== parseFloat(aiParsedOriginal.amount || '0');

        if (isModified) {
          try {
            await api.post('/ai/expense-correct', {
              raw_text: parsedText,
              corrected_category: category,
              corrected_subcategory: subcategory,
              corrected_merchant: merchant,
              corrected_amount: parseFloat(amount)
            });
          } catch (corrErr) {
            console.error("Failed to record AI feedback correction:", corrErr);
          }
        }
      }

      if (editingExpense) {
        // Edit mode
        const response = await api.put(`/expenses/${editingExpense.id}`, payload);
        setExpenses(expenses.map(exp => exp.id === editingExpense.id ? response.data.expense : exp));
      } else {
        // Add mode
        const response = await api.post('/expenses', payload);
        setExpenses([response.data.expense, ...expenses]);
      }

      setAiParsedOriginal(null);
      setParsedText('');
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save expense entry.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Calculations
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate top spending category
  const categoryTotals: { [key: string]: number } = {};
  expenses.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  });
  let topCategory = 'None';
  let topCategoryAmount = 0;
  Object.keys(categoryTotals).forEach(cat => {
    if (categoryTotals[cat] > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = categoryTotals[cat];
    }
  });

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Expenses Tracker</h1>
            <p className="text-slate-400 mt-1">Keep tabs on where your money goes. Search and filter logs easily.</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-5 py-3 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 shadow-black/25 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Add Expense</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Receipt className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Cumulative Spend</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {currencySymbol}{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-red-400 mt-2">Active records outlay</p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Filter className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Top Spending Area</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {topCategory}
            </h2>
            <p className="text-xs text-brand-400 mt-2">
              {topCategoryAmount > 0 ? `${currencySymbol}${topCategoryAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent` : 'No expenses recorded'}
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Calendar className="w-24 h-24 text-white" />
            </div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Transactions Count</span>
            <h2 className="text-3xl font-bold mt-2 text-white">
              {expenses.length}
            </h2>
            <p className="text-xs text-slate-400 mt-2">Recorded logs list</p>
          </div>
        </div>

        {/* AI Quick Add Section */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-400" />
            <h3 className="font-bold text-white text-sm">AI Quick Entry</h3>
            <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full font-semibold">Smart Input</span>
          </div>
          <p className="text-xs text-slate-400">Add expenses quickly by typing details, scanning a receipt image, or speaking to the AI assistant.</p>
          
          <form onSubmit={handleAiParse} className="flex flex-col sm:flex-row gap-3 mt-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isListening ? "Listening..." : "e.g. Spent 1500 for groceries at Target"}
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                disabled={parsing || scanning || isListening}
                className="w-full pr-12 pl-4 py-2.5 rounded-xl glass-input text-white text-xs focus:outline-none disabled:opacity-70"
              />
              {voiceSupport && (
                <button
                  type="button"
                  onClick={handleVoiceInput}
                  disabled={parsing || scanning}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-red-500/20 text-red-400 animate-pulse' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title="Speak Expense Details"
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={parsing || scanning || isListening || !aiText.trim()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Parse Text</span>
                  </>
                )}
              </button>

              <label
                className={`flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer ${
                  (scanning || parsing || isListening) ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Receipt</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptScan}
                  className="hidden"
                  disabled={scanning || parsing || isListening}
                />
              </label>
            </div>
          </form>

          {/* Status Indicators */}
          {scanMessage && (
            <div className="flex items-center gap-2 text-xs text-brand-400 animate-pulse mt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{scanMessage}</span>
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-2 text-xs text-red-400 animate-pulse mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>Listening... Tell AI what you bought (e.g. "I spent 450 rupees on groceries today").</span>
            </div>
          )}
        </div>

        {/* Search & Filters Panel */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search merchant, notes, details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-white text-xs focus:outline-none"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-900 border border-white/10 rounded-xl text-slate-300 text-xs focus:outline-none"
              >
                <option value="">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Start Date"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-300 text-xs focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="End Date"
                className="w-full px-3 py-2.5 rounded-xl glass-input text-slate-300 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && !isModalOpen && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Expenses List */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
            <h3 className="font-bold text-white">Expense Records</h3>
            <span className="text-xs text-slate-500 font-semibold">{expenses.length} logs matching</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-slate-400 text-sm font-medium">Fetching expense logs...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="p-4 bg-brand-500/5 rounded-2xl text-brand-400 mb-4 border border-brand-500/10">
                <Receipt className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-white mb-1">No Expenses Logged</h4>
              <p className="text-sm text-slate-400">Click "Add Expense" or use the AI parser to start keeping track of your budget transactions.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/2 border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none">
                    <th onClick={() => toggleSort('category')} className="py-4 px-6 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Category</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-4 px-6">Merchant</th>
                    <th onClick={() => toggleSort('date')} className="py-4 px-6 cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-4 px-6">Details</th>
                    <th className="py-4 px-6">Payment</th>
                    <th onClick={() => toggleSort('amount')} className="py-4 px-6 text-right cursor-pointer hover:text-white transition-colors">
                      <div className="flex items-center gap-1 justify-end">
                        <span>Amount</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-white/2 transition-colors text-slate-300 text-sm">
                      <td className="py-4.5 px-6">
                        <div>
                          <p className="font-bold text-white">{expense.category}</p>
                          {expense.subcategory && (
                            <p className="text-[10px] text-slate-500 font-semibold">{expense.subcategory}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4.5 px-6 font-medium">{expense.merchant || '-'}</td>
                      <td className="py-4.5 px-6 font-medium text-slate-400">{expense.date}</td>
                      <td className="py-4.5 px-6 max-w-xs truncate text-slate-400">
                        {expense.description || '-'}
                      </td>
                      <td className="py-4.5 px-6 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                          <CreditCard className="w-3 h-3 text-brand-400" />
                          {expense.payment_method}
                        </span>
                      </td>
                      <td className="py-4.5 px-6 text-right font-extrabold text-red-400">
                        {currencySymbol}{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4.5 px-6">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
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
            
            <div className="relative glass-panel w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-white/10 z-10 overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-extrabold text-white mb-4">
                {editingExpense ? 'Edit Expense Record' : 'Record Expense'}
              </h3>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </div>
              )}

              {aiParsedOriginal && (
                <div className="bg-brand-500/10 border border-brand-500/20 text-slate-300 p-3.5 rounded-xl flex items-start gap-2.5 mb-4 text-xs font-semibold leading-relaxed">
                  <Sparkles className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-brand-400 font-bold block mb-0.5">AI Suggestion Loaded</span>
                    We parsed this using AI rules. Review the fields below, make any corrections, and save.
                  </div>
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

                <div className="grid grid-cols-2 gap-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-dark-900 border border-white/10 text-white text-sm focus:outline-none"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subcategory */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Subcategory
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Veggies, Uber, Dinner"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date selection */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3.5 py-3 bg-dark-900 border border-white/10 rounded-xl text-white text-sm focus:outline-none"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>{pm}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Merchant */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Merchant / Shop name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Starbuck, Walmart"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Description / Details
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Office dinner with colleagues"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    placeholder="Write details if any..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-white text-sm focus:outline-none h-20 resize-none"
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
                    {saving ? 'Saving...' : editingExpense ? 'Save Changes' : 'Record Expense'}
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

export default ExpensesPage;
