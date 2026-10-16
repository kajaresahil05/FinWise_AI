import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import {
  Search,
  Star,
  Award,
  Briefcase,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface MutualFund {
  name: string;
  category: string;
  nav: number;
  aum: number;
  expense_ratio: number;
  horizon: string;
  risk_level: string;
  volatility: string;
  rating: number;
  is_live?: boolean;
  nav_date?: string;
  change?: number;
  change_percent?: number;
  returns_available?: boolean;
  returns: {
    '1Y': number;
    '3Y': number;
    '5Y': number;
  };
}

interface HistoricalData {
  date: string;
  price: number;
  is_live?: boolean;
}

const CATEGORIES = [
  'All Categories',
  'Index Fund',
  'Large Cap',
  'Flexi Cap',
  'Mid Cap',
  'Small Cap',
  'Multi Cap',
  'Sectoral IT',
  'Sectoral Pharma',
  'Debt Fund',
  'Hybrid Fund',
  'ELSS'
];

const PREDEFINED_FUNDS = [
  { symbol: 'HDFC_NIF50', name: 'HDFC Nifty 50 Index Fund' },
  { symbol: 'SBI_BLUE', name: 'SBI Large Cap Fund' },
  { symbol: 'PP_FLEXI', name: 'Parag Parikh Flexi Cap Fund' },
  { symbol: 'NIPP_SMALL', name: 'Nippon India Small Cap Fund' },
  { symbol: 'AXIS_SMALL', name: 'Axis Small Cap Fund' },
  { symbol: 'MIRAE_LARGE', name: 'Mirae Asset Large Cap Fund' },
  { symbol: 'UTI_NIF50', name: 'UTI Nifty 50 Index Fund' },
  { symbol: 'QUANT_ACTIVE', name: 'Quant Multi Asset Fund' },
  { symbol: 'ICICI_TECH', name: 'ICICI Prudential Technology Fund' },
  { symbol: 'KOTAK_MID', name: 'Kotak Global Emerging Mkt FOF' },
  { symbol: 'DSP_HEALTH', name: 'DSP Healthcare Fund' },
  { symbol: 'TATA_DIGITAL', name: 'Tata Digital India Fund' }
];

const MutualFundsPage: React.FC = () => {
  const { user } = useAuth();
  const [funds, setFunds] = useState<Record<string, MutualFund>>({});
  const [selectedFundSymbol, setSelectedFundSymbol] = useState('HDFC_NIF50');
  const [selectedFundDetails, setSelectedFundDetails] = useState<MutualFund | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyIsLive, setHistoryIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [maxExpenseRatio, setMaxExpenseRatio] = useState(2.0);
  const [minRating, setMinRating] = useState(0);

  const currencySymbol = user?.profile?.currency === 'USD' ? '$' : '₹';

  const fetchFundDetails = async (symbol: string) => {
    try {
      const response = await api.get(`/investments/mutual-funds/analysis/${symbol}`);
      setFunds(prev => ({
        ...prev,
        [symbol]: response.data
      }));
      if (symbol === selectedFundSymbol) {
        setSelectedFundDetails(response.data);
      }
    } catch (err) {
      console.error("Failed to load fund metrics", err);
    }
  };

  const fetchHistory = async (symbol: string) => {
    try {
      setHistoryLoading(true);
      setHistoryData([]);
      setHistoryIsLive(false);
      const response = await api.get(`/investments/historical/${symbol}`);
      setHistoryData(response.data.history);
      setHistoryIsLive(response.data.history?.some((entry: HistoricalData) => entry.is_live) ?? false);
    } catch (err) {
      console.error("Failed to load history chart", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Pre-load all standard funds
  useEffect(() => {
    PREDEFINED_FUNDS.forEach(f => {
      fetchFundDetails(f.symbol);
    });
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchFundDetails(selectedFundSymbol);
      fetchHistory(selectedFundSymbol);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [selectedFundSymbol]);

  useEffect(() => {
    if (selectedFundSymbol) {
      fetchHistory(selectedFundSymbol);
      if (funds[selectedFundSymbol]) {
        setSelectedFundDetails(funds[selectedFundSymbol]);
      } else {
        fetchFundDetails(selectedFundSymbol);
      }
    }
  }, [selectedFundSymbol, funds]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const customSymbol = searchQuery.trim().replace(/\s+/g, '_').toUpperCase();
      setSelectedFundSymbol(customSymbol);
    }
  };

  const refreshSelectedFund = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchFundDetails(selectedFundSymbol),
      fetchHistory(selectedFundSymbol)
    ]);
    setRefreshing(false);
  };

  const getFilteredFunds = () => {
    return Object.entries(funds)
      .map(([symbol, data]) => ({ symbol, ...data }))
      .filter(fund => {
        // Category Filter
        if (selectedCategory !== 'All Categories' && fund.category !== selectedCategory) {
          return false;
        }
        // Search filter
        if (searchQuery.trim() && !fund.name.toLowerCase().includes(searchQuery.toLowerCase()) && !fund.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        // Expense ratio
        if (fund.expense_ratio > maxExpenseRatio) {
          return false;
        }
        // Rating
        if (fund.rating < minRating) {
          return false;
        }
        return true;
      });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'Very High' || risk === 'High') return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (risk === 'Moderately High' || risk === 'Moderate') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Award className="w-8 h-8 text-brand-400" />
            Mutual Fund Analysis
          </h1>
          <p className="text-slate-400 mt-1">Audit expense ratios, consistency ratings, assets under management (AUM), and historical performance metrics.</p>
        </div>

        {/* Filters and search panel */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Search */}
            <div className="md:col-span-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search funds or add custom symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs focus:outline-none"
                />
              </form>
            </div>

            {/* Category Select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-white text-xs focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Max Expense Ratio */}
            <div className="md:col-span-3 flex flex-col justify-center">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mb-1">
                <span>Max Expense Ratio</span>
                <span className="text-white">{maxExpenseRatio.toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.05"
                value={maxExpenseRatio}
                onChange={(e) => setMaxExpenseRatio(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Min Rating Stars */}
            <div className="md:col-span-2 flex items-center justify-between gap-2 border border-white/10 bg-dark-900 px-3.5 py-2.5 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Min Stars</span>
              <div className="flex gap-1">
                {[3, 4, 5].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                    className={`p-1 rounded text-xs font-black transition-all cursor-pointer ${
                      minRating === stars
                        ? 'bg-amber-500/20 border border-amber-500 text-amber-400'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {stars}★
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Main Grid View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Fund Cards List */}
          <div className="lg:col-span-5 space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {getFilteredFunds().map((fund) => {
              const isSelected = selectedFundSymbol === fund.symbol;
              return (
                <div
                  key={fund.symbol}
                  onClick={() => setSelectedFundSymbol(fund.symbol)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-3.5 ${
                    isSelected 
                      ? 'bg-brand-500/15 border-brand-500/40' 
                      : 'bg-white/2 hover:bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-white line-clamp-1">{fund.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{fund.symbol}</span>
                        <span className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/10 px-1.5 py-0.2 rounded font-semibold uppercase">
                          {fund.category}
                        </span>
                      </div>
                    </div>
                    {renderStars(fund.rating)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Latest NAV</span>
                      <span className="text-white text-xs font-black">
                        {fund.is_live ? `${currencySymbol}${fund.nav.toFixed(2)}` : 'Unavailable'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">AUM</span>
                      <span className="text-white text-xs font-black">
                        {fund.aum >= 1000 ? `${(fund.aum/1000).toFixed(1)}K Cr` : `${fund.aum} Cr`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">1Y Return</span>
                      <span className={`text-xs font-black ${fund.returns['1Y'] >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fund.returns_available ? `${fund.returns['1Y'] >= 0 ? '+' : ''}${fund.returns['1Y'].toFixed(1)}%` : 'Unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {getFilteredFunds().length === 0 && (
              <div className="py-20 text-center text-slate-500 text-xs glass-card rounded-xl border border-white/5">
                No funds match your filter parameters.
              </div>
            )}
          </div>

          {/* Fund Details and Charting */}
          <div className="lg:col-span-7">
            <div className="glass-card p-6 rounded-2xl border border-white/5 min-h-[500px] flex flex-col justify-between">
              
              {selectedFundDetails ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  
                  {/* Title and stats summary */}
                  <div className="flex justify-between items-start border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedFundDetails.rating)}
                        <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getRiskColor(selectedFundDetails.risk_level)}`}>
                          Risk: {selectedFundDetails.risk_level}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-2">{selectedFundDetails.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Symbol: {selectedFundSymbol}</p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Latest NAV</span>
                        {selectedFundDetails.is_live && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                            MFAPI
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-black text-white">
                        {selectedFundDetails.is_live ? `${currencySymbol}${selectedFundDetails.nav.toFixed(2)}` : 'Unavailable'}
                      </span>
                      {selectedFundDetails.nav_date && (
                        <span className="text-[9px] text-slate-500 block mt-0.5">as of {selectedFundDetails.nav_date}</span>
                      )}
                      {selectedFundDetails.is_live && selectedFundDetails.change !== undefined && (
                        <span className={`text-[10px] font-bold block mt-1 ${selectedFundDetails.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedFundDetails.change >= 0 ? '+' : ''}{currencySymbol}{selectedFundDetails.change.toFixed(2)} ({selectedFundDetails.change_percent?.toFixed(2)}%) latest change
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={refreshSelectedFund}
                        disabled={refreshing}
                        title="Refresh latest NAV"
                        aria-label="Refresh latest NAV"
                        className="mt-2 inline-flex items-center justify-center rounded-md border border-white/10 p-1.5 text-slate-400 hover:text-white disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Fund facts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/2 p-4 rounded-xl border border-white/5 text-center">
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Expense Ratio</span>
                      <span className="text-white text-xs font-bold">{selectedFundDetails.expense_ratio.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Fund Horizon</span>
                      <span className="text-white text-xs font-bold">{selectedFundDetails.horizon}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Volatility</span>
                      <span className="text-white text-xs font-bold">{selectedFundDetails.volatility}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase block">Total AUM</span>
                      <span className="text-white text-xs font-bold">{currencySymbol}{selectedFundDetails.aum.toLocaleString()} Cr</span>
                    </div>
                  </div>

                  {/* Performance history returns timeline */}
                  <div className="space-y-2">
                    <span className="text-xs text-brand-400 font-bold uppercase tracking-wider block">Historical Returns</span>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">1 Year Return</span>
                        <span className="text-emerald-400 text-sm font-black">{selectedFundDetails.returns_available ? `${selectedFundDetails.returns['1Y'] >= 0 ? '+' : ''}${selectedFundDetails.returns['1Y'].toFixed(2)}%` : 'Unavailable'}</span>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">3 Year Annualized</span>
                        <span className="text-emerald-400 text-sm font-black">{selectedFundDetails.returns_available ? `${selectedFundDetails.returns['3Y'] >= 0 ? '+' : ''}${selectedFundDetails.returns['3Y'].toFixed(2)}%` : 'Unavailable'}</span>
                      </div>
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">5 Year Annualized</span>
                        <span className="text-emerald-400 text-sm font-black">{selectedFundDetails.returns_available ? `${selectedFundDetails.returns['5Y'] >= 0 ? '+' : ''}${selectedFundDetails.returns['5Y'].toFixed(2)}%` : 'Unavailable'}</span>
                      </div>
                    </div>
                  </div>

                  {/* NAV Timeline chart */}
                  <div className="relative h-[180px] mt-4">
                    {historyLoading ? (
                      <div className="absolute inset-0 flex flex-col justify-center items-center gap-2">
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        <span className="text-[10px] text-slate-500">Retrieving NAV levels...</span>
                      </div>
                    ) : !historyIsLive ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500">
                        Live NAV history unavailable.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData}>
                          <defs>
                            <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                          <XAxis dataKey="date" hide />
                          <YAxis domain={['auto', 'auto']} hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              borderColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              color: '#fff',
                              fontSize: '10px'
                            }}
                            formatter={(val) => [`${currencySymbol}${parseFloat(val as string).toFixed(2)}`, 'NAV']}
                          />
                          <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNav)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                  Loading fund comparison details...
                </div>
              )}

            </div>
          </div>

        </div>

        {/* Disclaimer Footer */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2 bg-dark-900/50">
          <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span>Educational and Financial Disclaimer</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
            FinWise AI provides educational information and personalized analytical insights for informational purposes only. It is not a substitute for professional financial advice. Investment decisions involve risk, and past performance does not guarantee future results. Users should conduct their own research or consult a qualified financial professional before making investment decisions.
          </p>
        </div>

      </div>
    </SidebarLayout>
  );
};

export default MutualFundsPage;
