import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import { Trophy, RefreshCw, Loader2, AlertTriangle, Lock } from 'lucide-react';

interface AchievementItem {
  code: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
}

const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [earnedCount, setEarnedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/achievements');
      setAchievements(res.data.achievements);
      setEarnedCount(res.data.earned_count);
      setTotalCount(res.data.total_count);
    } catch {
      setError('Failed to load achievements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await api.post('/achievements/check');
      await fetchAchievements();
    } catch {
      setError('Failed to check achievements.');
    } finally {
      setChecking(false);
    }
  };

  const progressPct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Trophy className="w-8 h-8 text-amber-400" />
              Achievements
            </h1>
            <p className="text-slate-400 mt-1">
              Track your financial milestones and earn badges for positive money habits.
            </p>
          </div>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Check for New
          </button>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Overall Progress</span>
            <span className="text-sm font-black text-white">{earnedCount} / {totalCount} Unlocked</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">{progressPct}% of all achievements unlocked</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Earned Section */}
            {earnedCount > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  Earned ({earnedCount})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.filter(a => a.earned).map(a => (
                    <div
                      key={a.code}
                      className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3 hover:border-amber-400/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{a.icon}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                          ✓ Earned
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{a.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{a.description}</p>
                      </div>
                      {a.earned_at && (
                        <p className="text-[10px] text-slate-600">
                          {new Date(a.earned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locked Section */}
            {achievements.filter(a => !a.earned).length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Locked ({achievements.filter(a => !a.earned).length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.filter(a => !a.earned).map(a => (
                    <div
                      key={a.code}
                      className="glass-card p-5 rounded-2xl border border-white/5 space-y-3 opacity-50 grayscale"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl">{a.icon}</span>
                        <Lock className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-300">{a.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
};

export default AchievementsPage;
