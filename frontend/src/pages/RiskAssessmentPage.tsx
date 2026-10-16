import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SidebarLayout from '../components/SidebarLayout';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  History,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  options: {
    label: string;
    points: number;
    description?: string;
  }[];
}

interface RiskProfileHistory {
  id: number;
  score: number;
  risk_level: string;
  answers: Record<string, number>;
  created_at: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'age',
    text: 'What is your current age group?',
    options: [
      { label: 'Over 60 years', points: 1, description: 'Shorter timeline to absorb market crashes; priority is security.' },
      { label: '46 to 60 years', points: 2, description: 'Preparing for transition towards retirement assets.' },
      { label: '30 to 45 years', points: 3, description: 'Prime earning years; balanced capacity to take risk.' },
      { label: 'Under 30 years', points: 4, description: 'Long path ahead to recover; can afford aggressive growth.' }
    ]
  },
  {
    id: 'horizon',
    text: 'What is your primary investment time horizon?',
    options: [
      { label: 'Short term (Under 3 years)', points: 1, description: 'May need funds soon; cash and debt instruments preferred.' },
      { label: 'Medium term (3 to 7 years)', points: 2, description: 'Balanced timeframe suitable for dynamic asset mixes.' },
      { label: 'Long term (7 to 10 years)', points: 3, description: 'Goal is growth; short term volatility is expected.' },
      { label: 'Very long term (Over 10 years)', points: 4, description: 'Highest compounding goal; can weather major market cycles.' }
    ]
  },
  {
    id: 'experience',
    text: 'How would you rate your knowledge & experience with investing?',
    options: [
      { label: 'None (Complete Beginner)', points: 1, description: 'Need simple, low-maintenance portfolios.' },
      { label: 'Limited (Basic understanding)', points: 2, description: 'Familiar with savings schemes and basic instruments.' },
      { label: 'Moderate (Understand mutual funds/stocks)', points: 3, description: 'Comfortable allocating across equities and debt.' },
      { label: 'Extensive (Active trading & complex assets)', points: 4, description: 'Can analyze individual equities, derivatives, etc.' }
    ]
  },
  {
    id: 'goal',
    text: 'What is the primary objective of this portfolio?',
    options: [
      { label: 'Capital Preservation', points: 1, description: 'Avoid losing money at all costs; beat inflation slightly.' },
      { label: 'Regular Income', points: 2, description: 'Yield regular dividends and interest payments.' },
      { label: 'Balanced Growth & Income', points: 3, description: 'Compounding capital while earning mild yield distributions.' },
      { label: 'Maximum Capital Growth', points: 4, description: 'Seek high returns via equities; tolerating substantial drops.' }
    ]
  },
  {
    id: 'reaction',
    text: 'If your portfolio drops by 20% in a month, what is your initial action?',
    options: [
      { label: 'Panic and sell all remaining holdings', points: 1, description: 'Extremely risk-averse behavior.' },
      { label: 'Sell some assets to prevent further loss', points: 2, description: 'Tending to lock in losses to feel secure.' },
      { label: 'Hold and wait for long-term recovery', points: 3, description: 'Understand markets behave in cycles.' },
      { label: 'Opportunistic: buy more at discount', points: 4, description: 'See downturns as a buying window.' }
    ]
  },
  {
    id: 'income_stability',
    text: 'How stable is your primary source of monthly income?',
    options: [
      { label: 'Highly volatile (Freelancer/Commission)', points: 1, description: 'Income varies massively; cash reserves are vital.' },
      { label: 'Somewhat stable (Gig worker/Business)', points: 2, description: 'Varying months but generally cover essential outlays.' },
      { label: 'Stable (Salaried Corporate/Govt)', points: 3, description: 'Regular fixed paychecks.' },
      { label: 'Highly stable with multiple cashflows', points: 4, description: 'Salary plus rent, dividends, or partner income.' }
    ]
  },
  {
    id: 'savings_rate',
    text: 'What percentage of your income are you able to save/invest?',
    options: [
      { label: 'Under 10%', points: 1, description: 'Limited buffer room; capital safety is critical.' },
      { label: '10% to 25%', points: 2, description: 'Standard savings habits.' },
      { label: '26% to 40%', points: 3, description: 'Strong surplus; can afford growth allocations.' },
      { label: 'Over 40%', points: 4, description: 'Exceptional savings surplus; high capacity for aggressive goals.' }
    ]
  },
  {
    id: 'obligations',
    text: 'What is your level of active debt and dependents obligations?',
    options: [
      { label: 'Very High (Multiple EMIs & dependents)', points: 1, description: 'Most income is pre-committed.' },
      { label: 'Moderate (Some loans, 1-2 dependents)', points: 2, description: 'Typical family financial layout.' },
      { label: 'Low (Minor debt, few dependents)', points: 3, description: 'High disposable income control.' },
      { label: 'None (No active debt or dependents)', points: 4, description: 'Complete freedom over surplus allocation.' }
    ]
  }
];

const RiskAssessmentPage: React.FC = () => {
  const { refreshUser } = useAuth();
  
  // States
  const [activeStep, setActiveStep] = useState<number>(-1); // -1 = landing start page
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [latestProfile, setLatestProfile] = useState<{ risk_level: string; score: number; answers: Record<string, number> } | null>(null);
  const [history, setHistory] = useState<RiskProfileHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [latestRes, histRes] = await Promise.all([
        api.get('/investments/risk-profile/latest'),
        api.get('/investments/risk-profile/history')
      ]);
      setLatestProfile(latestRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error("Failed to load risk profiles", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleSelectOption = (questionId: string, points: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: points
    }));
  };

  const handleNext = () => {
    if (activeStep < QUESTIONS.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    } else {
      setActiveStep(-1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await api.post('/investments/risk-profile', { answers });
      await refreshUser(); // sync context
      await fetchProfileData();
      setActiveStep(-2); // -2 = completion summary page
    } catch (err) {
      console.error("Failed to submit profile questionnaire", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskIcon = (level: string) => {
    if (level === 'Conservative') return <Shield className="w-16 h-16 text-emerald-400" />;
    if (level === 'Moderate') return <ShieldCheck className="w-16 h-16 text-brand-400" />;
    return <ShieldAlert className="w-16 h-16 text-rose-400" />;
  };

  const getRiskDescription = (level: string) => {
    if (level === 'Conservative') {
      return 'You prioritize safety of principal and income stability. A typical portfolio allocation for you would emphasize low-risk bonds, fixed deposits, and defensive blue-chip dividend mutual funds to preserve savings.';
    }
    if (level === 'Moderate') {
      return 'You seek a balance between steady capital growth and volatility limits. A standard portfolio allocation comprises index/large-cap equities mixed with flexi-cap equity and debt components to buffer cycles.';
    }
    return 'You focus on long-term capital compounding and can tolerate severe price swings in search of high returns. Your ideal allocation favors index funds, mid-cap and small-cap assets, and thematic equities.';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Compass className="w-8 h-8 text-brand-400" />
            Risk Profile Assessment
          </h1>
          <p className="text-slate-400 mt-1">Calibrate asset allocation limits based on volatility tolerance, time horizons, and obligations.</p>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-3" />
            <span className="text-slate-400 text-xs font-medium">Synchronizing risk files...</span>
          </div>
        ) : (
          <>
            {/* Landing screen */}
            {activeStep === -1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Score Summary */}
                <div className="md:col-span-2 space-y-6">
                  
                  {/* Current profile status */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gradient-to-r from-dark-900 via-dark-900 to-brand-950/20">
                    <div className="flex items-center gap-4">
                      {latestProfile && getRiskIcon(latestProfile.risk_level)}
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Classification</span>
                        <h2 className="text-2xl font-black text-white">{latestProfile?.risk_level || 'Moderate'}</h2>
                        <p className="text-slate-400 text-xs mt-1 max-w-md">{getRiskDescription(latestProfile?.risk_level || 'Moderate')}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setAnswers({});
                        setActiveStep(0);
                      }}
                      className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:shadow-brand-500/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Take Assessment
                    </button>
                  </div>

                  {/* Questionnaire rationale explanation cards */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                      Why is Risk Profiling Core to your Plan?
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      FinWise AI recommendation engine matches your investments against your risk profile. An aggressive investor who buys low-risk liquid assets misses compounding targets. Conversely, a conservative investor exposed to small-caps may panic-sell during standard market declines. Complete the 8-question audit to keep algorithms aligned.
                    </p>
                  </div>

                </div>

                {/* History Column */}
                <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-4 flex flex-col">
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-white/5">
                    <History className="w-4 h-4 text-brand-400" />
                    Assessment History
                  </h3>
                  
                  <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
                    {history.map((record) => (
                      <div key={record.id} className="p-3 bg-white/2 border border-white/5 rounded-xl flex justify-between items-center">
                        <div>
                          <span className={`text-[10px] font-bold block ${
                            record.risk_level === 'Conservative' ? 'text-emerald-400' :
                            record.risk_level === 'Moderate' ? 'text-brand-400' : 'text-rose-400'
                          }`}>
                            {record.risk_level}
                          </span>
                          <span className="text-[9px] text-slate-500">{formatDate(record.created_at)}</span>
                        </div>
                        <span className="text-white text-xs font-black bg-white/5 px-2.5 py-1 rounded-lg">
                          {record.score} pts
                        </span>
                      </div>
                    ))}

                    {history.length === 0 && (
                      <div className="text-center py-12 text-slate-600 text-xs">
                        No previous records found.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Wizard Steps */}
            {activeStep >= 0 && activeStep < QUESTIONS.length && (
              <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                
                {/* Progress Indicators */}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Question {activeStep + 1} of {QUESTIONS.length}
                  </span>
                  <div className="flex gap-1">
                    {QUESTIONS.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-4 h-1.5 rounded-full transition-all ${
                          idx === activeStep
                            ? 'bg-brand-500 w-8'
                            : idx < activeStep
                            ? 'bg-brand-500/40'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Question Text */}
                <h2 className="text-lg font-black text-white">{QUESTIONS[activeStep].text}</h2>

                {/* Options List */}
                <div className="grid grid-cols-1 gap-3">
                  {QUESTIONS[activeStep].options.map((opt, oIdx) => {
                    const isSelected = answers[QUESTIONS[activeStep].id] === opt.points;
                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleSelectOption(QUESTIONS[activeStep].id, opt.points)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start gap-4 ${
                          isSelected
                            ? 'bg-brand-500/15 border-brand-500/60'
                            : 'bg-white/2 hover:bg-white/5 border-white/5'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-white block">{opt.label}</span>
                          {opt.description && (
                            <span className="text-[10px] text-slate-500 leading-normal block">{opt.description}</span>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-brand-500 bg-brand-500' : 'border-slate-600'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Wizard actions */}
                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-lg border border-white/10 bg-white/2 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  {activeStep === QUESTIONS.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || answers[QUESTIONS[activeStep].id] === undefined}
                      className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-brand-500/20"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Syncing Profile...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Calculate Profile
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      disabled={answers[QUESTIONS[activeStep].id] === undefined}
                      className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg hover:shadow-brand-500/20"
                    >
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* Results Completion summary screen */}
            {activeStep === -2 && (
              <div className="glass-card p-8 rounded-2xl border border-white/5 text-center space-y-6 max-w-xl mx-auto bg-gradient-to-b from-dark-900 to-brand-950/10">
                <div className="flex justify-center">
                  {latestProfile && getRiskIcon(latestProfile.risk_level)}
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Assessment Complete</span>
                  <h2 className="text-3xl font-black text-white">Your Risk Level: {latestProfile?.risk_level}</h2>
                  <p className="text-slate-400 text-xs mt-1">Total score: <strong className="text-white">{latestProfile?.score}</strong> points.</p>
                </div>

                <p className="text-slate-400 text-xs leading-relaxed px-4">
                  {latestProfile && getRiskDescription(latestProfile.risk_level)}
                </p>

                <div className="border-t border-white/5 pt-6 flex justify-center gap-4">
                  <button
                    onClick={() => {
                      setAnswers({});
                      setActiveStep(0);
                    }}
                    className="px-4 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Retake Questionnaire
                  </button>
                  <button
                    onClick={() => setActiveStep(-1)}
                    className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg hover:shadow-brand-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </SidebarLayout>
  );
};

export default RiskAssessmentPage;
