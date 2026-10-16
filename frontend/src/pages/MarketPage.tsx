import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import {
  TrendingUp,
  TrendingDown,
  Search,
  LineChart as ChartIcon,
  Clock,
  Briefcase,
  Loader2
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

interface Asset {
  name: string;
  symbol: string;
  price?: number;
  nav?: number;
  change: number;
  change_percent: number;
  sector?: string;
  type?: string;
}

interface HistoricalData {
  date: string;
  price: number;
}

const MarketPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'stocks' | 'funds' | 'etfs'>('stocks');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [searching, setSearching] = useState(false);

  const defaultCurrencySymbol = user?.profile?.currency === 'USD' ? '$' : '₹';

  const getCurrencyForSymbol = (symbol?: string) => {
    if (!symbol) return defaultCurrencySymbol;
    if (['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'TSLA', 'META', '^GSPC', '^IXIC'].includes(symbol)) {
      return '$';
    }
    return defaultCurrencySymbol;
  };

  const fetchMarketSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/investments/market-summary');
      setMarketData(response.data);
      
      // Auto select first stock if available
      if (response.data?.stocks?.length > 0) {
        setSelectedAsset(response.data.stocks[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load market data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (symbol: string) => {
    try {
      setHistoryLoading(true);
      const response = await api.get(`/investments/historical/${symbol}`);
      setHistoryData(response.data.history);
    } catch (err: any) {
      console.error("Failed to load historical data", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketSummary();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      fetchHistory(selectedAsset.symbol);
    }
  }, [selectedAsset]);

  // Live remote search effect
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/investments/stocks/search?q=${encodeURIComponent(q)}`);
        const found = res.data || [];
        // fetch quotes for items not in current list
        const mapped: Asset[] = found.map((item: any) => ({
          name: item.name,
          symbol: item.symbol,
          price: 0,
          change: 0,
          change_percent: 0,
          type: item.type || 'EQUITY',
          sector: item.exch || 'EXCH'
        }));
        setSearchResults(mapped);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectAndLoadAsset = async (asset: Asset) => {
    // If asset has 0 price or is from search, load full quote
    if (!asset.price) {
      try {
        const res = await api.get(`/investments/stocks/analysis/${asset.symbol}`);
        if (res.data) {
          const enriched: Asset = {
            ...asset,
            name: res.data.name || asset.name,
            price: res.data.price,
            change: res.data.change || 0,
            change_percent: res.data.change_percent || 0,
            sector: res.data.sector || asset.sector
          };
          setSelectedAsset(enriched);
          // Also add to marketData stocks if not present
          setMarketData((prev: any) => {
            if (!prev) return prev;
            const exists = prev.stocks?.some((s: Asset) => s.symbol === asset.symbol);
            if (!exists) {
              return { ...prev, stocks: [enriched, ...(prev.stocks || [])] };
            }
            return prev;
          });
          return;
        }
      } catch (e) {
        // fallback
      }
    }
    setSelectedAsset(asset);
  };

  const filteredAssets = () => {
    if (!marketData) return [];
    
    let assets: Asset[] = [];
    if (activeTab === 'stocks') {
      assets = marketData.stocks || [];
    } else if (activeTab === 'funds') {
      assets = marketData.mutual_funds || [];
    } else {
      assets = marketData.etfs || [];
    }

    if (!searchQuery.trim()) return assets;
    
    const localMatches = assets.filter(
      a => 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Merge searchResults if on stocks tab
    if (activeTab === 'stocks' && searchResults.length > 0) {
      const existingSymbols = new Set(localMatches.map(m => m.symbol));
      const additional = searchResults.filter(sr => !existingSymbols.has(sr.symbol));
      return [...localMatches, ...additional];
    }

    return localMatches;
  };

  const getAssetPrice = (asset: Asset) => {
    return asset.price !== undefined ? asset.price : (asset.nav || 0);
  };

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <ChartIcon className="w-8 h-8 text-brand-400" />
              Market Dashboard
            </h1>
            <p className="text-slate-400 mt-1">Real-time indicators, stock performance charts, and mutual fund details.</p>
          </div>
          {marketData?.timestamp && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-4 py-2 rounded-xl text-xs text-slate-400">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>Updated: {marketData.timestamp}</span>
            </div>
          )}
        </div>

        {/* Live Market Feeds Indicator Banner */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <span className="text-sm font-bold text-emerald-400">Live Global Market Feeds Active</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time market indices, stock quotes, and ETF metrics synchronized directly with live exchanges.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">
            Real-Time Quotes
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-32 flex flex-col justify-center items-center gap-3">
            <Loader2 className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin text-brand-500" />
            <span className="text-slate-400 text-sm font-medium">Connecting to Live Market Provider...</span>
          </div>
        ) : (
          <>
            {/* Major Indices Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {marketData?.indices?.map((index: any) => (
                <div 
                  key={index.symbol} 
                  onClick={() => setSelectedAsset({ name: index.name, symbol: index.symbol, price: index.price, change: index.change, change_percent: index.change_percent })}
                  className={`glass-card p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${
                    selectedAsset?.symbol === index.symbol ? 'border-brand-500/40 bg-brand-500/5' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{index.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold">{index.symbol}</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mt-2">
                    {getCurrencyForSymbol(index.symbol)}{index.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    {index.change >= 0 ? (
                      <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <TrendingUp className="w-3 h-3" />
                        +{index.change.toFixed(2)} (+{index.change_percent.toFixed(2)}%)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <TrendingDown className="w-3 h-3" />
                        {index.change.toFixed(2)} ({index.change_percent.toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Main Interactive Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Asset Lists Panel */}
              <div className="lg:col-span-5 space-y-4">
                <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-4">
                  
                  {/* Search bar */}
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      {searching ? <Loader2 className="w-4 h-4 animate-spin text-brand-400" /> : <Search className="w-4 h-4" />}
                    </span>
                    <input
                      type="text"
                      placeholder="Search Any Stock, Company or Fund (e.g. Tata, Zomato, Reliance)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-white text-xs focus:outline-none"
                    />
                  </div>

                  {/* Tabs */}
                  <div className="flex bg-white/2 p-1 rounded-xl border border-white/5">
                    {(['stocks', 'funds', 'etfs'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          const list = tab === 'stocks' ? marketData.stocks : tab === 'funds' ? marketData.mutual_funds : marketData.etfs;
                          if (list?.length > 0) {
                            setSelectedAsset(list[0]);
                          }
                        }}
                        className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all capitalize cursor-pointer ${
                          activeTab === tab 
                            ? 'bg-brand-600 text-white shadow-md' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab === 'funds' ? 'Mutual Funds' : tab}
                      </button>
                    ))}
                  </div>

                  {/* Assets Table */}
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {filteredAssets().map((asset) => {
                      const price = getAssetPrice(asset);
                      const isSelected = selectedAsset?.symbol === asset.symbol;
                      return (
                        <div
                          key={asset.symbol}
                          onClick={() => selectAndLoadAsset(asset)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                            isSelected 
                              ? 'bg-brand-500/15 border-brand-500/40' 
                              : 'bg-white/2 hover:bg-white/5 border-white/5'
                          }`}
                        >
                          <div>
                            <h4 className="font-bold text-xs text-white truncate max-w-[180px]">{asset.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{asset.symbol}</span>
                              {asset.sector && (
                                <span className="text-[9px] bg-slate-500/10 text-slate-400 border border-slate-500/10 px-1.5 py-0.2 rounded font-semibold uppercase">
                                  {asset.sector}
                                </span>
                              )}
                              {asset.type && (
                                <span className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/10 px-1.5 py-0.2 rounded font-semibold uppercase">
                                  {asset.type}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-sm text-white">
                              {price > 0 ? `${getCurrencyForSymbol(asset.symbol)}${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Click to Load'}
                            </span>
                            <div className="text-[10px] font-bold mt-0.5">
                              {price > 0 ? (
                                asset.change >= 0 ? (
                                  <span className="text-emerald-400">+{asset.change_percent.toFixed(2)}%</span>
                                ) : (
                                  <span className="text-red-400">{asset.change_percent.toFixed(2)}%</span>
                                )
                              ) : (
                                <span className="text-brand-400">Live Quote</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredAssets().length === 0 && (
                      <div className="py-12 text-center text-slate-500 text-xs">
                        No assets found matching "{searchQuery}"
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Detail Chart Section */}
              <div className="lg:col-span-7 space-y-4">
                <div className="glass-card p-6 rounded-2xl border border-white/5 h-full flex flex-col justify-between">
                  {selectedAsset ? (
                    <div className="space-y-6 flex-1 flex flex-col justify-between">
                      {/* Selected Asset Header */}
                      <div className="flex justify-between items-start border-b border-white/5 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-brand-400 font-bold uppercase tracking-wider">Historical Trend</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Live Quote
                            </span>
                          </div>
                          <h2 className="text-xl font-black text-white mt-1">{selectedAsset.name}</h2>
                          <p className="text-slate-500 text-[10px] font-bold uppercase mt-0.5">Ticker ID: {selectedAsset.symbol}</p>
                        </div>
                        <div className="text-right">
                          <h3 className="text-2xl font-black text-white">
                            {getCurrencyForSymbol(selectedAsset.symbol)}{getAssetPrice(selectedAsset).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </h3>
                          <div className="mt-1 flex items-center justify-end gap-1.5">
                            {selectedAsset.change >= 0 ? (
                              <span className="text-xs font-bold text-emerald-400">+{selectedAsset.change.toFixed(2)} (+{selectedAsset.change_percent.toFixed(2)}%)</span>
                            ) : (
                              <span className="text-xs font-bold text-red-400">{selectedAsset.change.toFixed(2)} ({selectedAsset.change_percent.toFixed(2)}%)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chart Area */}
                      <div className="relative flex-1 min-h-[280px] mt-6">
                        {historyLoading ? (
                          <div className="absolute inset-0 flex flex-col justify-center items-center gap-2">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                            <span className="text-xs text-slate-500 font-medium">Fetching trend line...</span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData}>
                              <defs>
                                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis 
                                dataKey="date" 
                                stroke="#94a3b8" 
                                fontSize={10} 
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis 
                                domain={['auto', 'auto']}
                                stroke="#94a3b8" 
                                fontSize={10} 
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${getCurrencyForSymbol(selectedAsset.symbol)}${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                  borderColor: 'rgba(255, 255, 255, 0.1)',
                                  borderRadius: '12px',
                                  color: '#fff',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}
                                formatter={(val) => [`${getCurrencyForSymbol(selectedAsset.symbol)}${parseFloat(val as string).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Price']}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="price" 
                                stroke="#3b82f6" 
                                strokeWidth={2.5}
                                fillOpacity={1} 
                                fill="url(#colorPrice)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm">
                      Select an asset to view historical price charts.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}

        {/* Legal Disclaimer Required Section */}
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

export default MarketPage;
