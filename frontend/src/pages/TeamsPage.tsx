import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Team, TeamDetail, UserProfile, UserSummary, TeamMemberRole } from '../types';
import { Users2, Shield, Plus, X, UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
}

export const TeamsPage: React.FC<Props> = ({ currentUser }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [allUsers, setAllUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Add member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<TeamMemberRole>('member');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create team modal state (admin only)
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  useEffect(() => {
    loadTeams();
    loadAllUsers();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await api.teams.list();
      setTeams(data);
      if (data.length > 0 && !selectedTeam) {
        loadTeamDetail(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetail = async (teamId: string) => {
    try {
      const detail = await api.teams.get(teamId);
      setSelectedTeam(detail);
    } catch (err: any) {
      setError(err.message || 'Failed to load team details');
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await api.users.list();
      setAllUsers(users);
    } catch {
      // Ignored
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !memberUserId) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.teams.addMember(selectedTeam.id, memberUserId, memberRole);
      setSuccess('Team member assigned successfully.');
      setShowAddMember(false);
      setMemberUserId('');
      loadTeamDetail(selectedTeam.id);
      loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to add member to team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;
    if (!confirm('Are you sure you want to remove this user from the team?')) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.teams.removeMember(selectedTeam.id, userId);
      loadTeamDetail(selectedTeam.id);
      loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to remove team member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.teams.create(newTeamName.trim(), newTeamDesc.trim() || undefined);
      setShowCreateTeam(false);
      setNewTeamName('');
      setNewTeamDesc('');
      loadTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  const isAdmin = currentUser?.system_role === 'admin';
  const isManagerInSelectedTeam =
    isAdmin ||
    currentUser?.team_memberships.some(
      (m) => m.team_id === selectedTeam?.id && m.role === 'manager'
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center">
            Teams & Operational Authorization
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage operational teams, boundaries, and manager approval responsibilities
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowCreateTeam(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-brand-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </button>
        )}
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

      {/* Two Column Layout: Teams List & Selected Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
            Operational Teams ({teams.length})
          </h2>

          <div className="space-y-1.5">
            {teams.map((t) => (
              <div
                key={t.id}
                onClick={() => loadTeamDetail(t.id)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedTeam?.id === t.id
                    ? 'bg-brand-500/10 border-brand-500 text-white shadow-sm'
                    : 'bg-slate-850/60 hover:bg-slate-800 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{t.name}</span>
                  <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                    {t.member_count} members
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                  {t.description || 'No description provided'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Team Members Detail */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          {selectedTeam ? (
            <>
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span>{selectedTeam.name}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedTeam.description}</p>
                </div>

                {isManagerInSelectedTeam && (
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-brand-400" />
                    <span>Assign Member</span>
                  </button>
                )}
              </div>

              {/* Members Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Team Role</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {selectedTeam.memberships.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No members currently assigned to this team.
                        </td>
                      </tr>
                    ) : (
                      selectedTeam.memberships.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-100 flex items-center space-x-2">
                            <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-brand-300 font-bold text-[10px] flex items-center justify-center">
                              {m.user?.full_name?.charAt(0) || 'U'}
                            </span>
                            <span>{m.user?.full_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                            {m.user?.email}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-mono ${
                                m.role === 'manager'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {m.role === 'manager' && (
                                <Shield className="w-2.5 h-2.5 mr-1 text-amber-400" />
                              )}
                              {m.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {isManagerInSelectedTeam && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id)}
                                className="text-slate-500 hover:text-rose-400 text-xs transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-slate-500 text-xs">
              Select a team on the left to view its roster and manage authorizations.
            </p>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                Assign Member to {selectedTeam.name}
              </h3>
              <button onClick={() => setShowAddMember(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Select User
                </label>
                <select
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="">Choose user...</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Role in Team
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as TeamMemberRole)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="member">Member (Create & Manage Work)</option>
                  <option value="manager">Manager (Approve Work & Manage Team)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !memberUserId}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal (Admin Only) */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Create Operational Team</h3>
              <button onClick={() => setShowCreateTeam(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Team Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Infrastructure & Reliability"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Scope of work and incident responsibility..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !newTeamName.trim()}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
