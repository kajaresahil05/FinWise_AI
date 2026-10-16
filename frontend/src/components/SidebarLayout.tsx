import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X, 
  Cpu,
  Sliders,
  Target,
  Bot,
  Heart,
  LineChart,
  BarChart3,
  Compass,
  Briefcase,
  Calculator,
  FileText,
  Bell,
  Trophy
} from 'lucide-react';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'Income', href: '/income', icon: TrendingUp },
    { name: 'Budgets', href: '/budget', icon: Sliders },
    { name: 'Goals', href: '/goals', icon: Target },
    { name: 'AI Coach', href: '/ai-coach', icon: Bot },
    { name: 'Health Score', href: '/financial-health', icon: Heart },
    { name: 'Market Data', href: '/market', icon: LineChart },
    { name: 'Stock Analysis', href: '/stock-analysis', icon: BarChart3 },
    { name: 'Mutual Funds', href: '/mutual-funds', icon: TrendingUp },
    { name: 'Risk Profile', href: '/risk-assessment', icon: Compass },
    { name: 'Recommendations', href: '/recommendations', icon: Cpu },
    { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
    { name: 'Simulator', href: '/simulator', icon: Calculator },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Achievements', href: '/achievements', icon: Trophy },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-dark-950 text-slate-100 relative">
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2.5 bg-dark-900 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-all shadow-lg"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel border-r border-white/5 flex flex-col justify-between py-6 px-4
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="p-2.5 bg-gradient-to-tr from-brand-600 to-accent-500 rounded-xl shadow-lg">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-white via-brand-100 to-brand-400 bg-clip-text text-transparent">
              FinWise AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group
                    ${active 
                      ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20 shadow-inner' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-colors ${active ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.profile?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold py-3 rounded-xl transition-all border border-red-500/20 shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile drawer */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}
    </div>
  );
};

export default SidebarLayout;
