import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import {
  Search,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Layers,
  Scale,
  Briefcase,
  Loader2,
  CheckCircle2,
  Globe
} from 'lucide-react';

interface StockAnalysis {
  name: string;
  sector: string;
  market_cap: number;
  price: number;
  pe_ratio: number;
  pb_ratio: number;
  revenue_growth: number;
  profit_growth: number;
  roe: number;
  roce: number;
  debt_to_equity: number;
  dividend_yield: number;
  volatility: string;
  trend_indicator: string;
  fundamental_score: number;
  technical_score: number;
  risk_score: number;
  valuation_score: number;
  suitability_score: number;
  change?: number;
  change_percent?: number;
  is_live?: boolean;
  currency?: string;
  high_52w?: number;
  low_52w?: number;
}

interface SearchSuggestion {
  symbol: string;
  name: string;
  exch: string;
  type: string;
}

const POPULAR_TICKERS = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind' },
  { symbol: 'TCS.NS', name: 'TCS' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank' },
  { symbol: 'INFY.NS', name: 'Infosys' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors' },
  { symbol: 'SBIN.NS', name: 'State Bank' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank' },
  { symbol: 'AAPL', name: 'Apple' },
  { symbol: 'NVDA', name: 'NVIDIA' },
  { symbol: 'TSLA', name: 'Tesla' }
];

const StockAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [searchSymbol, setSearchSymbol] = useState('RELIANCE.NS');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fallbackCurrencySymbol = user?.profile?.currency === 'USD' ? '$' : '₹';

  const fetchStockAnalysis = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/investments/stocks/analysis/${symbol}`);
      setAnalysis(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load stock analysis. Make sure ticker is correct.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockAnalysis(searchSymbol);
  }, [searchSymbol]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    if (val.trim().length >= 1) {
      try {
        const res = await api.get(`/investments/stocks/search?q=${encodeURIComponent(val.trim())}`);
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (item: SearchSuggestion) => {
    setInputVal(item.symbol);
    setSearchSymbol(item.symbol);
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchSymbol(inputVal.trim().toUpperCase());
      setShowDropdown(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-500';
    if (score >= 60) return 'text-blue-400 stroke-blue-500';
    if (score >= 40) return 'text-amber-400 stroke-amber-500';
    return 'text-red-400 stroke-red-500';
  };

  const getScoreProgressBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (score >= 40) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const currencySymbol = (analysis?.currency === 'USD' || analysis?.currency === 'USD')
    ? '$'
    : (analysis?.currency === 'INR' ? '₹' : fallbackCurrencySymbol);

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-8 h-8 text-brand-400" />
              Stock Analysis System
            </h1>
            <p className="text-slate-400 mt-1">Real-time live prices, multi-factor fundamental screening and AI risk suitability mapping.</p>
          </div>
        </div>

        {/* Search Toolbar & Autocomplete */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <form onSubmit={handleSearchSubmit} className="relative flex gap-3">
              <div className="relative flex-1" ref={dropdownRef}>
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                  <Search className="w-4.5 h-4.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search any stock, company or symbol (e.g. RELIANCE, TCS, AAPL, Tesla)..."
                  value={inputVal}
                  onChange={handleInputChange}
                  onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-white text-sm focus:outline-none"
                />

                {/* Autocomplete Suggestions Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto backdrop-blur-xl">
                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 bg-white/5 flex justify-between items-center">
                      <span>Matching Stocks & Assets</span>
                      <span className="text-slate-500">{suggestions.length} results</span>
                    </div>
                    {suggestions.map((item) => (
                      <button
                        key={item.symbol}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex justify-between items-center border-b border-white/5 last:border-0 cursor-pointer"
                      >
                        <div>
                          <div className="text-white text-sm font-bold flex items-center gap-2">
                            <span>{item.symbol}</span>
                            <span className="text-[10px] bg-brand-500/20 text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded font-mono uppercase">
                              {item.exch}
                            </span>
                          </div>
                          <div className="text-slate-400 text-xs truncate max-w-xs mt-0.5">{item.name}</div>
                        </div>
                        <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded font-medium">{item.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-brand-500/20 flex-shrink-0"
              >
                Analyze
              </button>
            </form>
          </div>
          
          <div className="lg:col-span-5 flex flex-wrap gap-1.5 justify-start lg:justify-end items-center">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mr-1.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Popular:
            </span>
            {POPULAR_TICKERS.map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => {
                  setSearchSymbol(ticker.symbol);
                  setInputVal(ticker.symbol);
                }}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  searchSymbol === ticker.symbol
                    ? 'bg-brand-500/25 border-brand-500 text-white'
                    : 'bg-white/2 border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {ticker.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-32 flex flex-col justify-center items-center gap-3">
            <Loader2 className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin text-brand-500" />
            <span className="text-slate-400 text-sm font-medium">Fetching Live Market Quotes & Fundamental Audit...</span>
          </div>
        ) : (
          analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Stock Details Card & Score Indicators */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Core Details banner */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                    <Activity className="w-32 h-32 text-white" />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                          {analysis.sector}
                        </span>
                        {analysis.is_live && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            Live Market Data
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-black text-white mt-2.5">{analysis.name}</h2>
                      <p className="text-slate-500 text-xs font-bold mt-0.5">Ticker Ticker: {searchSymbol}</p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Today's Price</span>
                      <h3 className="text-3xl font-black text-white mt-1">
                        {currencySymbol}{analysis.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h3>
                      <div className="mt-1 flex items-center sm:justify-end gap-2">
                        {analysis.change !== undefined && analysis.change_percent !== undefined && (
                          <span className={`text-xs font-bold flex items-center gap-0.5 px-2 py-0.5 rounded ${analysis.change >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {analysis.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {analysis.change >= 0 ? '+' : ''}{analysis.change.toFixed(2)} ({analysis.change >= 0 ? '+' : ''}{analysis.change_percent.toFixed(2)}%)
                          </span>
                        )}
                        <span className={`text-xs font-bold ${analysis.trend_indicator === 'Bullish' ? 'text-emerald-400' : analysis.trend_indicator === 'Bearish' ? 'text-red-400' : 'text-slate-400'}`}>
                          Trend: {analysis.trend_indicator}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Breakdown Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  
                  <div className="glass-card p-4 rounded-xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Fundamental</span>
                    <span className={`text-3xl font-black mt-2 ${getScoreColor(analysis.fundamental_score)}`}>
                      {analysis.fundamental_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">Balance Sheet Health</span>
                  </div>

                  <div className="glass-card p-4 rounded-xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Technical Trend</span>
                    <span className={`text-3xl font-black mt-2 ${getScoreColor(analysis.technical_score)}`}>
                      {analysis.technical_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">Moving Averages</span>
                  </div>

                  <div className="glass-card p-4 rounded-xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Risk Index</span>
                    <span className={`text-3xl font-black mt-2 ${getScoreColor(analysis.risk_score)}`}>
                      {analysis.risk_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">Volatility Factor</span>
                  </div>

                  <div className="glass-card p-4 rounded-xl border border-white/5 text-center flex flex-col items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Valuation</span>
                    <span className={`text-3xl font-black mt-2 ${getScoreColor(analysis.valuation_score)}`}>
                      {analysis.valuation_score}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium mt-1">P/E vs Historicals</span>
                  </div>

                </div>

                {/* Audit Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Valuation & Share Stats */}
                  <div className="glass-card p-5 rounded-xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/5 pb-2">
                      <Scale className="w-4.5 h-4.5 text-brand-400" />
                      Key Fundamentals & Valuation
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Market Capitalization</span>
                        <span className="text-white font-bold">
                          {currencySymbol}{analysis.market_cap >= 100000 ? `${(analysis.market_cap / 100000).toFixed(2)} Lakh Cr` : `${analysis.market_cap.toLocaleString()} Cr`}
                        </span>
                      </div>
                      {analysis.high_52w !== undefined && analysis.low_52w !== undefined && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-medium">52-Week Range</span>
                          <span className="text-white font-bold">
                            {currencySymbol}{analysis.low_52w} - {currencySymbol}{analysis.high_52w}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">P/E (Price-to-Earnings)</span>
                        <span className="text-white font-bold">{analysis.pe_ratio}x</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">P/B (Price-to-Book)</span>
                        <span className="text-white font-bold">{analysis.pb_ratio}x</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Dividend Yield</span>
                        <span className="text-white font-bold">{analysis.dividend_yield.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Beta / Volatility Rating</span>
                        <span className="text-white font-bold">{analysis.volatility}</span>
                      </div>
                    </div>
                  </div>

                  {/* Growth & Leverage Parameters */}
                  <div className="glass-card p-5 rounded-xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/5 pb-2">
                      <Layers className="w-4.5 h-4.5 text-brand-400" />
                      Growth & Margin Efficiency
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Revenue Growth (YoY)</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {analysis.revenue_growth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Net Profit Growth (YoY)</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          {analysis.profit_growth.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Return on Equity (ROE)</span>
                        <span className="text-white font-bold">{analysis.roe.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Return on Capital (ROCE)</span>
                        <span className="text-white font-bold">{analysis.roce.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Debt-to-Equity Ratio</span>
                        <span className={`font-bold ${analysis.debt_to_equity > 1 ? 'text-red-400' : 'text-white'}`}>
                          {analysis.debt_to_equity.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* Right Column: Suitability Circular Wheel & Explanation */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Suitability Dial */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Overall suitability Score</span>
                  
                  {/* Custom CSS Circle Progress dial */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className="stroke-white/5"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="60"
                        className={`transition-all duration-1000 ${getScoreColor(analysis.suitability_score)}`}
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 60}
                        strokeDashoffset={2 * Math.PI * 60 * (1 - analysis.suitability_score / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black text-white">{analysis.suitability_score}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Points / 100</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getScoreProgressBg(analysis.suitability_score)}`}>
                    {analysis.suitability_score >= 80 ? 'Highly Suitable' : analysis.suitability_score >= 60 ? 'Suitable / Moderate' : 'Unsuitable / Speculative'}
                  </span>
                </div>

                {/* Analytical Reason explanation card */}
                <div className="glass-card p-5 rounded-xl border border-white/5 space-y-3">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Explainable Suitability
                  </h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    This asset presents a suitability grade of <strong className="text-white">{analysis.suitability_score}/100</strong>. It exhibits a <strong>{analysis.volatility.toLowerCase()}</strong> volatility profile and trading behavior, matching a <strong>{analysis.trend_indicator.toLowerCase()}</strong> structure. 
                    {analysis.debt_to_equity < 0.25 ? " The extremely low debt footprint ensures solid balance sheet resilience during high-interest cycles." : ""} 
                    {analysis.pe_ratio > 30 ? " However, the premium valuation multiples imply that high growth targets are already priced in." : " The moderate price-to-earnings multiple indicates potential value allocation room."}
                  </p>
                </div>

              </div>

            </div>
          )
        )}

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

export default StockAnalysisPage;
