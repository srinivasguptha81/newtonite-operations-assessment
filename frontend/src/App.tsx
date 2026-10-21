import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import { UserProfile } from './types';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { WorkItemsPage } from './pages/WorkItemsPage';
import { TeamsPage } from './pages/TeamsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { LoginPage } from './pages/LoginPage';
import { CreateWorkItemModal } from './components/CreateWorkItemModal';
import { WorkItemDetailModal } from './components/WorkItemDetailModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'items' | 'teams' | 'users' | 'audit'>('dashboard');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();

    const handleLogout = () => {
      setCurrentUser(null);
    };

    window.addEventListener('newtonite_auth_logout', handleLogout);
    window.addEventListener('newtonite_auth_expired', handleLogout);

    return () => {
      window.removeEventListener('newtonite_auth_logout', handleLogout);
      window.removeEventListener('newtonite_auth_expired', handleLogout);
    };
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('newtonite_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }

    try {
      const user = await api.auth.me();
      setCurrentUser(user);
    } catch {
      localStorage.removeItem('newtonite_token');
      localStorage.removeItem('newtonite_user');
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  };

  const handleUserSwitch = async (email: string) => {
    try {
      await api.auth.login(email, 'NewtoniteDemo2026!');
      const user = await api.auth.me();
      setCurrentUser(user);
    } catch (err) {
      console.error(err);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing Newtonite Operations...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={checkAuth} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab: any) => setCurrentTab(tab)}
        currentUser={currentUser}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onUserSwitch={handleUserSwitch}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && (
          <DashboardPage
            currentUser={currentUser}
            onSelectWorkItem={(id) => setSelectedItemId(id)}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        )}

        {currentTab === 'items' && (
          <WorkItemsPage
            currentUser={currentUser}
            onSelectWorkItem={(id) => setSelectedItemId(id)}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        )}

        {currentTab === 'teams' && <TeamsPage currentUser={currentUser} />}

        {currentTab === 'users' && <AdminUsersPage currentUser={currentUser} />}

        {currentTab === 'audit' && (
          <AuditLogPage onSelectWorkItem={(id) => setSelectedItemId(id)} />
        )}
      </main>

      {/* Global Modals */}
      <CreateWorkItemModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          // If on work items page or dashboard, trigger refresh
        }}
      />

      <WorkItemDetailModal
        itemId={selectedItemId}
        isOpen={!!selectedItemId}
        currentUser={currentUser}
        onClose={() => setSelectedItemId(null)}
        onItemUpdated={() => {
          // refresh triggers handled
        }}
      />
    </div>
  );
};
