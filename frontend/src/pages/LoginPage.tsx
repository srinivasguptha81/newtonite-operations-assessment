import React, { useState } from 'react';
import { api } from '../api/client';
import { Activity, ShieldCheck, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demoAccounts = [
    {
      name: 'Sarah Chen',
      email: 'admin@newtonite.internal',
      role: 'System Administrator',
      team: 'Global Admin Oversights',
      color: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    },
    {
      name: 'Marcus Vance',
      email: 'manager.eng@newtonite.internal',
      role: 'Engineering Lead (Manager)',
      team: 'Core Engineering',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    {
      name: 'Elena Rostova',
      email: 'manager.ops@newtonite.internal',
      role: 'Operations Lead (Manager)',
      team: 'Customer Support & Payments',
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    {
      name: 'Alex Rivera',
      email: 'alex.dev@newtonite.internal',
      role: 'Senior Engineer (Member)',
      team: 'Core Engineering',
      color: 'border-slate-700 bg-slate-800/80 text-slate-300',
    },
    {
      name: 'Priya Sharma',
      email: 'priya.dev@newtonite.internal',
      role: 'Backend Engineer (Member)',
      team: 'Engineering & Payments',
      color: 'border-slate-700 bg-slate-800/80 text-slate-300',
    },
    {
      name: 'Carlos Mendez',
      email: 'carlos.ops@newtonite.internal',
      role: 'Support Specialist (Member)',
      team: 'Customer Support',
      color: 'border-slate-700 bg-slate-800/80 text-slate-300',
    },
    {
      name: 'Dana Kim',
      email: 'dana.compliance@newtonite.internal',
      role: 'Compliance Officer (Manager)',
      team: 'Compliance & Legal',
      color: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
    },
  ];

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.auth.login(demoEmail, 'NewtoniteDemo2026!');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await api.auth.register(email, fullName, password);
        // Automatically login after registration
        await api.auth.login(email, password);
      } else {
        await api.auth.login(email, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 mx-auto flex items-center justify-center shadow-xl shadow-brand-500/25">
          <Activity className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Newtonite Operations
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          High-Reliability Multi-Team Incident Management & Concurrency-Guarded Coordination
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl space-y-6">
        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 rounded-2xl shadow-2xl">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`pb-3 text-sm font-semibold flex-1 text-center border-b-2 transition-colors ${
                !isRegister
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`pb-3 text-sm font-semibold flex-1 text-center border-b-2 transition-colors ${
                isRegister
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register New Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@newtonite.internal"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-sm shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? 'Create Operational Account'
                : 'Sign In to Operations'}
            </button>
          </form>

          {/* Quick Demo Evaluation Personas */}
          <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
                <span>1-Click Assessment Personas</span>
              </span>
              <span className="text-[11px] text-slate-500">Instant evaluation login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email)}
                  disabled={loading}
                  className={`p-2.5 text-left rounded-xl border text-xs transition-all hover:scale-[1.02] flex flex-col justify-between ${acc.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{acc.name}</span>
                    <UserCheck className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-[10px] opacity-80 mt-1">{acc.role}</div>
                  <div className="text-[9px] opacity-60 font-mono mt-0.5">{acc.team}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              All demo accounts configured with password: <span className="font-mono text-slate-400">NewtoniteDemo2026!</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
