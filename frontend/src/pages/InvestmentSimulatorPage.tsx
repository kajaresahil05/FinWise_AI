import React, { useState, useCallback } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  Calculator,
  TrendingUp,
  IndianRupee,
  Clock,
  Percent,
  AlertTriangle,
  Loader2,
  Info,
  BarChart2,
  Repeat
} from 'lucide-react';

interface Projection {
  year: number;
  total_invested: number;
  estimated_returns: number;
  future_value: number;
}

interface SimulationResult {
  type: string;
  amount: number;
  duration: number;
  return_rate: number;
  summary: {
    total_invested: number;
    estimated_returns: number;
    future_value: number;
  };
  projections: Projection[];
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);

const formatAxisINR = (val: number) => {
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  if (val >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val}`;
};

const SliderInput: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}> = ({ label, icon, value, min, max, step, unit, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="text-sm font-black text-white">
        {unit === '₹' ? formatINR(value) : `${value}${unit}`}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-brand-500 cursor-pointer"
    />
    <div className="flex justify-between text-[10px] text-slate-600">
      <span>{unit === '₹' ? formatINR(min) : `${min}${unit}`}</span>
      <span>{unit === '₹' ? formatINR(max) : `${max}${unit}`}</span>
    </div>
  </div>
);

const SummaryCard: React.FC<{
  label: string;
  value: string;
  accent?: string;
}> = ({ label, value, accent = 'text-white' }) => (
  <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-1">
    <span className="text-[10px] uppercase font-bold text-slate-500 block">{label}</span>
    <span className={`text-xl font-black ${accent}`}>{value}</span>
  </div>
);

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs shadow-2xl space-y-1.5">
        <p className="font-bold text-white mb-1">Year {label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex justify-between gap-6">
            <span style={{ color: entry.color }} className="font-semibold">{entry.name}</span>
            <span className="text-white font-bold">{formatINR(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const InvestmentSimulatorPage: React.FC = () => {
  const [simType, setSimType] = useState<'sip' | 'lump_sum'>('sip');

  // SIP state
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipDuration, setSipDuration] = useState(10);
  const [sipRate, setSipRate] = useState(12);

  // Lump Sum state
  const [lsAmount, setLsAmount] = useState(100000);
  const [lsDuration, setLsDuration] = useState(10);
  const [lsRate, setLsRate] = useState(10);

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload =
        simType === 'sip'
          ? { type: 'sip', amount: sipAmount, duration: sipDuration, return_rate: sipRate }
          : { type: 'lump_sum', amount: lsAmount, duration: lsDuration, return_rate: lsRate };

      const res = await api.post('/investments/simulate', payload);
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Simulation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [simType, sipAmount, sipDuration, sipRate, lsAmount, lsDuration, lsRate]);

  const wealthRatio = result
    ? ((result.summary.future_value / result.summary.total_invested - 1) * 100).toFixed(1)
    : null;

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Calculator className="w-8 h-8 text-brand-400" />
            Investment Simulator
          </h1>
          <p className="text-slate-400 mt-1">
            Project the future value of your SIP or lump sum investments using compound growth formulas.
          </p>
        </div>

        {/* Disclaimer Banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/15 bg-amber-500/5 text-amber-300 text-[11px] leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            <strong>Disclaimer:</strong> All projected values shown are <strong>estimates only</strong> and are based on
            a constant assumed rate of return. Actual returns will vary based on market conditions.
            Past performance does not guarantee future results. This tool is for <strong>educational purposes only</strong>{' '}
            and is not financial advice.
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Controls Panel */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab Selector */}
            <div className="glass-card rounded-2xl border border-white/5 p-1.5 flex gap-1">
              <button
                onClick={() => { setSimType('sip'); setResult(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  simType === 'sip'
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Repeat className="w-3.5 h-3.5" />
                SIP
              </button>
              <button
                onClick={() => { setSimType('lump_sum'); setResult(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  simType === 'lump_sum'
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                Lump Sum
              </button>
            </div>

            {/* Slider Controls */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
              {simType === 'sip' ? (
                <>
                  <SliderInput
                    label="Monthly Investment"
                    icon={<IndianRupee className="w-3 h-3" />}
                    value={sipAmount}
                    min={500}
                    max={200000}
                    step={500}
                    unit="₹"
                    onChange={setSipAmount}
                  />
                  <SliderInput
                    label="Investment Duration"
                    icon={<Clock className="w-3 h-3" />}
                    value={sipDuration}
                    min={1}
                    max={40}
                    step={1}
                    unit=" yr"
                    onChange={setSipDuration}
                  />
                  <SliderInput
                    label="Expected Annual Return"
                    icon={<Percent className="w-3 h-3" />}
                    value={sipRate}
                    min={1}
                    max={30}
                    step={0.5}
                    unit="%"
                    onChange={setSipRate}
                  />
                </>
              ) : (
                <>
                  <SliderInput
                    label="One-Time Investment"
                    icon={<IndianRupee className="w-3 h-3" />}
                    value={lsAmount}
                    min={1000}
                    max={10000000}
                    step={1000}
                    unit="₹"
                    onChange={setLsAmount}
                  />
                  <SliderInput
                    label="Investment Duration"
                    icon={<Clock className="w-3 h-3" />}
                    value={lsDuration}
                    min={1}
                    max={40}
                    step={1}
                    unit=" yr"
                    onChange={setLsDuration}
                  />
                  <SliderInput
                    label="Expected Annual Return"
                    icon={<Percent className="w-3 h-3" />}
                    value={lsRate}
                    min={1}
                    max={30}
                    step={0.5}
                    unit="%"
                    onChange={setLsRate}
                  />
                </>
              )}

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
                ) : (
                  <><TrendingUp className="w-4 h-4" /> Calculate Projection</>
                )}
              </button>

              {error && (
                <div className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-[11px] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Formula Info Card */}
            <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
              <h3 className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-brand-400" />
                Formula Used
              </h3>
              {simType === 'sip' ? (
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p className="font-mono text-brand-300 bg-brand-500/10 px-2 py-1 rounded-lg">
                    FV = P × [((1+r)ⁿ - 1) / r] × (1+r)
                  </p>
                  <p className="text-slate-400">where <strong className="text-slate-200">P</strong> = monthly amount, <strong className="text-slate-200">r</strong> = monthly rate, <strong className="text-slate-200">n</strong> = months</p>
                </div>
              ) : (
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <p className="font-mono text-brand-300 bg-brand-500/10 px-2 py-1 rounded-lg">
                    FV = P × (1 + R)ⁿ
                  </p>
                  <p className="text-slate-400">where <strong className="text-slate-200">P</strong> = principal, <strong className="text-slate-200">R</strong> = annual rate, <strong className="text-slate-200">n</strong> = years</p>
                </div>
              )}
            </div>

          </div>

          {/* Right: Results Panel */}
          <div className="lg:col-span-3 space-y-6">

            {!result ? (
              <div className="glass-card rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px] space-y-4">
                <Calculator className="w-16 h-16 text-slate-700" />
                <div>
                  <p className="text-white font-bold">No Simulation Run Yet</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Adjust the sliders on the left and click <strong className="text-brand-400">Calculate Projection</strong> to see your results.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <SummaryCard
                    label="Total Invested"
                    value={formatINR(result.summary.total_invested)}
                  />
                  <SummaryCard
                    label="Est. Returns"
                    value={formatINR(result.summary.estimated_returns)}
                    accent="text-emerald-400"
                  />
                  <SummaryCard
                    label="Future Value"
                    value={formatINR(result.summary.future_value)}
                    accent="text-brand-400"
                  />
                </div>

                {/* Wealth Ratio Badge */}
                {wealthRatio && (
                  <div className="glass-card p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
                    <span className="text-xs text-slate-300">
                      Your money grows by <strong className="text-white">{wealthRatio}%</strong> over{' '}
                      <strong className="text-white">{result.duration} years</strong> at{' '}
                      <strong className="text-white">{result.return_rate}% p.a.</strong>
                    </span>
                    <span className="text-2xl font-black text-emerald-400 ml-4">{wealthRatio}%</span>
                  </div>
                )}

                {/* Growth Chart */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-brand-400" />
                    Compound Growth Projection
                    <span className="ml-auto text-slate-600 font-medium normal-case">Estimated values only</span>
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={result.projections}
                        margin={{ top: 5, right: 5, left: 10, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="colorFV" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="year"
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          label={{ value: 'Years', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }}
                        />
                        <YAxis
                          tickFormatter={formatAxisINR}
                          tick={{ fill: '#64748b', fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<CUSTOM_TOOLTIP />} />
                        <Legend
                          wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '12px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_invested"
                          name="Total Invested"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#colorInvested)"
                          dot={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="future_value"
                          name="Future Value (Est.)"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#colorFV)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Year-by-Year Table */}
                <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Year-by-Year Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-500 font-bold">
                          <th className="pb-2">Year</th>
                          <th className="pb-2">Total Invested</th>
                          <th className="pb-2">Est. Returns</th>
                          <th className="pb-2">Future Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {result.projections.map((p) => (
                          <tr key={p.year} className="text-slate-300 hover:bg-white/2 transition-colors">
                            <td className="py-2 font-bold text-white">Yr {p.year}</td>
                            <td className="py-2">{formatINR(p.total_invested)}</td>
                            <td className="py-2 text-emerald-400 font-semibold">{formatINR(p.estimated_returns)}</td>
                            <td className="py-2 text-brand-400 font-bold">{formatINR(p.future_value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default InvestmentSimulatorPage;
