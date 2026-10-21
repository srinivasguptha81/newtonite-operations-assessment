import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { UserProfile, UserSummary, SystemRole } from '../types';
import { ShieldCheck, UserCheck, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
}

export const AdminUsersPage: React.FC<Props> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load system users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: SystemRole) => {
    setError(null);
    setSuccess(null);
    try {
      await api.users.updateRole(userId, newRole);
      setSuccess(`User role updated to '${newRole}' successfully.`);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user role');
    }
  };

  if (currentUser?.system_role !== 'admin') {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <h2 className="text-base font-bold">Access Denied</h2>
        <p className="text-xs text-rose-300 mt-1">
          Administrative privileges are required to manage users and access this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center">
            <ShieldCheck className="w-5 h-5 text-purple-400 mr-2" />
            <span>System Users & Privilege Administration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enforce role-based access control and system-level authority
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4 text-right">Role Assignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-100 flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-brand-300 font-bold text-xs flex items-center justify-center">
                        {u.full_name?.charAt(0) || 'U'}
                      </span>
                      <span>{u.full_name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                          u.system_role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : u.system_role === 'manager'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {u.system_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.system_role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as SystemRole)
                        }
                        className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500"
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
