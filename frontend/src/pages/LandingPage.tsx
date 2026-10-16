import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, Wallet, LineChart } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-3xl animate-pulse-slow"></div>

      {/* Header */}
      <header className="glass-panel sticky top-0 z-50 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-brand-600 to-accent-500 rounded-xl shadow-lg">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-2xl bg-gradient-to-r from-white via-brand-100 to-brand-400 bg-clip-text text-transparent">FinWise AI</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Login
          </Link>
          <Link to="/register" className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-brand-500/20 shadow-black/10">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col items-center text-center relative z-10">
        <span className="bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider mb-6">
          AI-Powered Personal Finance
        </span>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight mb-6">
          Take Control of Your Money. <br />
          <span className="bg-gradient-to-r from-brand-400 via-brand-200 to-accent-400 bg-clip-text text-transparent">
            Track Smart. Save Better. Invest Wisely.
          </span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          FinWise AI blends personal expense management with structured, context-aware AI recommendations to help you build stable wealth.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20 w-full sm:w-auto">
          <Link to="/register" className="bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-brand-500/25 shadow-black/25 flex items-center justify-center gap-2">
            Create Free Account
          </Link>
          <Link to="/login" className="glass-card text-white hover:bg-white/10 font-semibold px-8 py-4 rounded-xl transition-all flex items-center justify-center border border-white/10">
            Sign In
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
          <div className="glass-card p-8 rounded-2xl text-left">
            <div className="p-3 bg-brand-500/10 rounded-xl w-fit mb-6 text-brand-400">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Expense & Income Tracking</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Seamlessly record financial items with support for natural language inputs, AI categorizations, and voice recognition.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl text-left">
            <div className="p-3 bg-accent-500/10 rounded-xl w-fit mb-6 text-accent-400">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Explainable AI Recommendations</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Custom investment portfolio recommendations designed logically from your risk profile, age, savings, and goals.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl text-left">
            <div className="p-3 bg-indigo-500/10 rounded-xl w-fit mb-6 text-indigo-400">
              <LineChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Advanced Simulation</h3>
            <p className="text-slate-400 leading-relaxed text-sm">
              Simulate investment options through SIP/Lump Sum metrics and experiment with "What-If" scenarios.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-slate-500 text-sm glass-panel mt-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© 2026 FinWise AI. Major Project / ROSPL Lab Submission.</p>
          <div className="max-w-md text-xs text-slate-600 leading-relaxed text-center md:text-right">
            Disclaimer: FinWise AI offers analytical insights for educational purposes only. Past results are not guarantees.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
