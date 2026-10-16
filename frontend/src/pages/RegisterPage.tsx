import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cpu, User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-12">
      {/* Decorative Orbs */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-brand-600 to-accent-500 rounded-2xl shadow-xl mb-4">
            <Cpu className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white font-sans tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Get started with FinWise AI</p>
        </div>

        {/* Register Card */}
        <div className="glass-card p-8 rounded-2xl border border-white/5 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-sm mb-6 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (Min. 6 chars)"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:border-brand-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-brand-500/25 flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-slate-400">Already have an account? </span>
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
