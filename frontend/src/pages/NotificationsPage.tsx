import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import SidebarLayout from '../components/SidebarLayout';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Target,
  PiggyBank,
  ShieldAlert,
  Trophy
} from 'lucide-react';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  budget_alert:      { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  goal_deadline:     { icon: <Target className="w-4 h-4" />,        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  savings_reminder:  { icon: <PiggyBank className="w-4 h-4" />,     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  anomaly:           { icon: <ShieldAlert className="w-4 h-4" />,   color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/20' },
  achievement:       { icon: <Trophy className="w-4 h-4" />,        color: 'text-brand-400',  bg: 'bg-brand-500/10 border-brand-500/20' },
};

const DEFAULT_CONFIG = { icon: <Bell className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' };

const timeAgo = (isoString: string): string => {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/notifications/generate');
      await fetchNotifications();
    } catch {
      setError('Failed to generate notifications.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: number) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleDelete = async (id: number) => {
    const notif = notifications.find(n => n.id === id);
    await api.delete(`/notifications/${id}`);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Bell className="w-8 h-8 text-brand-400" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-brand-600 text-white ml-1">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-slate-400 mt-1">Budget alerts, goal deadlines, and savings reminders.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Check Now
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl glass-card border border-white/5 text-slate-300 hover:text-white transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark All Read
              </button>
            )}
          </div>
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
        ) : notifications.length === 0 ? (
          <div className="glass-card rounded-2xl border border-white/5 p-16 flex flex-col items-center text-center space-y-3">
            <BellOff className="w-14 h-14 text-slate-700" />
            <p className="text-white font-bold">No Notifications</p>
            <p className="text-slate-500 text-xs">Click "Check Now" to scan your account for alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || DEFAULT_CONFIG;
              return (
                <div
                  key={n.id}
                  className={`glass-card rounded-2xl border p-4 transition-all ${cfg.bg} ${n.is_read ? 'opacity-60' : 'opacity-100'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                          {n.title}
                          {!n.is_read && (
                            <span className="ml-2 w-1.5 h-1.5 rounded-full bg-brand-400 inline-block" />
                          )}
                        </p>
                        <span className="text-[10px] text-slate-600 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 ml-1">
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          title="Mark as read"
                          className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        title="Delete"
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default NotificationsPage;
