import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import {
  Briefcase,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Loader2,
  X,
  PieChart as ChartIcon,
  ShieldAlert,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';

interface Holding {
  id: number;
  asset_class: string;
  symbol: string;
  name: string;
  quantity: number;
  purchase_price: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  sector: string;
}

interface AllocationItem {
  name: string;
  value: number;
  percentage: number;
}

interface HealthSummary {
  score: number;
  issues: string[];
  suggestions: string[];
}

interface PortfolioSummary {
  total_invested: number;
  total_current: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
}

interface PortfolioResponse {
  holdings: Holding[];
  summary: PortfolioSummary;
  asset_allocation: AllocationItem[];
  sector_allocation: AllocationItem[];
  health: HealthSummary;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const PortfolioPage: React.FC = () => {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // Form State
  const [assetClass, setAssetClass] = useState('Stock');
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/portfolio');
      setData(response.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load portfolio.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!assetClass || !symbol || !name || !quantity || !purchasePrice) {
      setFormError('All fields are required.');
      return;
    }

    try {
      await api.post('/portfolio/holdings', {
        asset_class: assetClass,
        symbol: symbol.trim().toUpperCase(),
        name: name.trim(),
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice)
      });
      
      // Reset & Refresh
      setSymbol('');
      setName('');
      setQuantity('');
      setPurchasePrice('');
      setIsAddModalOpen(false);
      fetchPortfolio();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to add holding.');
    }
  };

  const handleEditHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingHolding || !quantity || !purchasePrice) {
      setFormError('All fields are required.');
      return;
    }

    try {
      await api.put(`/portfolio/holdings/${editingHolding.id}`, {
        quantity: parseFloat(quantity),
        purchase_price: parseFloat(purchasePrice)
      });

      setEditingHolding(null);
      setIsEditModalOpen(false);
      fetchPortfolio();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to update holding.');
    }
  };

  const handleDeleteHolding = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this holding?')) return;
    try {
      await api.delete(`/portfolio/holdings/${id}`);
      fetchPortfolio();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete holding.');
    }
  };

  const openEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setQuantity(holding.quantity.toString());
    setPurchasePrice(holding.purchase_price.toString());
    setIsEditModalOpen(true);
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 60) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  if (loading && !data) {
    return (
      <SidebarLayout>
        <div className="py-32 text-center">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium">Loading portfolio data...</p>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Briefcase className="w-8 h-8 text-brand-400" />
              Portfolio Tracker
            </h1>
            <p className="text-slate-400 mt-1">Manually log and verify asset allocations, returns, and portfolio health.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5" />
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Invested</span>
                <span className="text-2xl font-black text-white">
                  ₹{data.summary.total_invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Valuation</span>
                <span className="text-2xl font-black text-white">
                  ₹{data.summary.total_current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Absolute Returns</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-2xl font-black ${data.summary.total_gain_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{data.summary.total_gain_loss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {data.summary.total_gain_loss >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-400" />
                  )}
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Percentage Returns</span>
                <span className={`text-2xl font-black ${data.summary.total_gain_loss_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {data.summary.total_gain_loss_percent >= 0 ? '+' : ''}
                  {data.summary.total_gain_loss_percent.toFixed(2)}%
                </span>
              </div>

            </div>

            {/* Health Score & Allocation Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Portfolio Health Score Banner */}
              <div className={`p-6 rounded-2xl border flex flex-col justify-between space-y-4 lg:col-span-1 ${getHealthColor(data.health.score)}`}>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Portfolio Health Audit</span>
                    {data.health.score >= 80 ? (
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-white">{data.health.score}</span>
                    <span className="text-sm opacity-60">/100</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  {data.health.issues.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Detected Alerts</span>
                      <ul className="text-[11px] list-disc pl-4 space-y-1 text-slate-300">
                        {data.health.issues.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] font-black uppercase text-brand-400 tracking-wider">Actionable Recommendations</span>
                    <ul className="text-[11px] list-disc pl-4 space-y-1 text-slate-300">
                      {data.health.suggestions.map((sug, idx) => (
                        <li key={idx} className="leading-relaxed">{sug}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Allocation charts */}
              <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ChartIcon className="w-4 h-4 text-brand-400" />
                  Asset & Sector Allocations
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Asset Allocation */}
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-white block text-center">By Asset Class</span>
                    {data.asset_allocation.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">No data available</div>
                    ) : (
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.asset_allocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={50}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {data.asset_allocation.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                              itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Sector Allocation */}
                  <div className="space-y-2">
                    <span className="text-xs font-extrabold text-white block text-center">By Industry Sector</span>
                    {data.sector_allocation.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">No data available</div>
                    ) : (
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={data.sector_allocation}
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={50}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {data.sector_allocation.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                              itemStyle={{ color: '#cbd5e1', fontSize: '11px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Holdings Table */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">Logged Holdings</h3>
              
              {data.holdings.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Briefcase className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-slate-400 text-xs font-medium">Your portfolio is empty.</p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="text-xs text-brand-400 hover:text-brand-300 font-bold underline"
                  >
                    Add your first asset holding now
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-500 font-bold">
                        <th className="pb-2">Asset / Symbol</th>
                        <th className="pb-2">Class</th>
                        <th className="pb-2">Sector</th>
                        <th className="pb-2">Qty</th>
                        <th className="pb-2">Buy Price</th>
                        <th className="pb-2">Current Price</th>
                        <th className="pb-2">Invested</th>
                        <th className="pb-2">Current Value</th>
                        <th className="pb-2">Gain / Loss</th>
                        <th className="pb-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.holdings.map((h) => (
                        <tr key={h.id} className="text-slate-300 hover:bg-white/2 transition-colors">
                          <td className="py-3 font-bold text-white">
                            <span>{h.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase block">{h.symbol}</span>
                          </td>
                          <td className="py-3 font-semibold text-slate-400">{h.asset_class}</td>
                          <td className="py-3 text-slate-400">{h.sector}</td>
                          <td className="py-3">{h.quantity}</td>
                          <td className="py-3">₹{h.purchase_price.toFixed(2)}</td>
                          <td className="py-3 font-semibold text-slate-200">₹{h.current_price.toFixed(2)}</td>
                          <td className="py-3 font-semibold text-slate-200">₹{h.invested_value.toLocaleString()}</td>
                          <td className="py-3 font-bold text-white">₹{h.current_value.toLocaleString()}</td>
                          <td className={`py-3 font-black ${h.gain_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ₹{h.gain_loss.toLocaleString()} ({h.gain_loss_percent >= 0 ? '+' : ''}{h.gain_loss_percent.toFixed(1)}%)
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2.5">
                              <button
                                onClick={() => openEdit(h)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteHolding(h.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 rounded transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          </>
        )}

        {/* Dynamic Add / Edit Asset Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card max-w-md w-full border border-white/10 rounded-2xl shadow-2xl p-6 relative space-y-4">
              
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setEditingHolding(null);
                  setFormError(null);
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white">
                  {isEditModalOpen ? `Edit Asset Holding` : `Add New Asset Holding`}
                </h3>
                <p className="text-slate-400 text-xs">
                  {isEditModalOpen ? `Modify purchase metrics for ${editingHolding?.symbol}` : `Enter stock ticker, mutual fund code, or ETF parameters.`}
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={isEditModalOpen ? handleEditHolding : handleAddHolding} className="space-y-4">
                
                {!isEditModalOpen && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Asset Class</label>
                      <select
                        value={assetClass}
                        onChange={(e) => setAssetClass(e.target.value)}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-colors"
                      >
                        <option value="Stock">Stock / Equity</option>
                        <option value="Mutual Fund">Mutual Fund</option>
                        <option value="ETF">Exchange Traded Fund (ETF)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Symbol / Ticker</label>
                      <input
                        type="text"
                        placeholder="e.g. TCS.BSE, RELIANCE.BSE, PP_FLEXI"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors uppercase"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Tata Consultancy Services"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                        required
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Quantity</label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="0.00"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Purchase Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                      setEditingHolding(null);
                      setFormError(null);
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 hover:border-white/10 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-500/20"
                  >
                    {isEditModalOpen ? 'Save Changes' : 'Add Holding'}
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

export default PortfolioPage;
