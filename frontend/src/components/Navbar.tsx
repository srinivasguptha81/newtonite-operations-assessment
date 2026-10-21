import React, { useState } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/client';
import {
  LayoutDashboard,
  Layers,
  Users2,
  ShieldCheck,
  History,
  PlusCircle,
  LogOut,
  ChevronDown,
  Activity,
  UserCheck,
} from 'lucide-react';

interface Props {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentUser: UserProfile | null;
  onOpenCreateModal: () => void;
  onUserSwitch: (email: string) => void;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenCreateModal,
  onUserSwitch,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const demoAccounts = [
    { name: 'Sarah Chen', email: 'admin@newtonite.internal', role: 'System Admin', team: 'Global Admin' },
    { name: 'Marcus Vance', email: 'manager.eng@newtonite.internal', role: 'Manager', team: 'Core Engineering' },
    { name: 'Elena Rostova', email: 'manager.ops@newtonite.internal', role: 'Manager', team: 'Support & Payments' },
    { name: 'Alex Rivera', email: 'alex.dev@newtonite.internal', role: 'Member', team: 'Core Engineering' },
    { name: 'Priya Sharma', email: 'priya.dev@newtonite.internal', role: 'Member', team: 'Engineering & Payments' },
    { name: 'Carlos Mendez', email: 'carlos.ops@newtonite.internal', role: 'Member', team: 'Customer Support' },
    { name: 'Dana Kim', email: 'dana.compliance@newtonite.internal', role: 'Manager', team: 'Compliance & Legal' },
  ];

  const handleLogout = () => {
    api.auth.logout();
  };

  const isAdmin = currentUser?.system_role === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => onTabChange('dashboard')}
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Activity className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center">
                  Newtonite <span className="text-brand-400 font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">OPERATIONS</span>
                </span>
                <span className="block text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Under Pressure</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onTabChange('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => onTabChange('items')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  currentTab === 'items'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Work Items</span>
              </button>

              <button
                onClick={() => onTabChange('teams')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  currentTab === 'teams'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users2 className="w-4 h-4" />
                <span>Teams</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => onTabChange('users')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                    currentTab === 'users'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Users</span>
                </button>
              )}

              <button
                onClick={() => onTabChange('audit')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  currentTab === 'audit'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Trail</span>
              </button>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Create Work Item CTA */}
            <button
              onClick={onOpenCreateModal}
              className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-1.5 shadow-md shadow-brand-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Item</span>
            </button>

            {/* Quick Demo Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
                title="Switch test persona without retyping credentials"
              >
                <UserCheck className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden lg:inline text-slate-300">Demo Persona:</span>
                <span className="text-white font-semibold truncate max-w-[100px]">
                  {currentUser?.full_name?.split(' ')[0] || 'Switch'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDemoMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-800">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Active Persona
                    </p>
                    <p className="text-xs text-slate-500">
                      Instant 1-click test switching for evaluation
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {demoAccounts.map((acc) => (
                      <button
                        key={acc.email}
                        onClick={() => {
                          setShowDemoMenu(false);
                          onUserSwitch(acc.email);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                          currentUser?.email === acc.email
                            ? 'bg-brand-500/10 text-brand-400 border-l-2 border-brand-500'
                            : 'text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-slate-100">{acc.name}</div>
                          <div className="text-[10px] text-slate-400">{acc.team}</div>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                            acc.role === 'System Admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : acc.role === 'Manager'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {acc.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge */}
            <div className="hidden sm:flex items-center pl-2 border-l border-slate-800 space-x-2">
              <div className="text-right">
                <span className="block text-xs font-semibold text-slate-200">
                  {currentUser?.full_name}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono capitalize">
                  {currentUser?.system_role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
