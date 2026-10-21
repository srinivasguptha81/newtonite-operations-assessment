import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DashboardSummary, Team, UserProfile } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  AlertTriangle,
  Clock,
  Flame,
  ShieldAlert,
  UserCheck,
  CheckCircle,
  ArrowRight,
  Filter,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  onSelectWorkItem: (itemId: string) => void;
  onOpenCreateModal: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  currentUser,
  onSelectWorkItem,
  onOpenCreateModal,
}) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    loadDashboard(selectedTeamId);
  }, [selectedTeamId]);

  const loadTeams = async () => {
    try {
      const data = await api.teams.list();
      setTeams(data);
    } catch {
      // Handled silently
    }
  };

  const loadDashboard = async (tId?: string) => {
    setRefreshing(true);
    try {
      const data = await api.dashboard.getSummary(tId || undefined);
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const stats = summary?.stats;

  return (
    <div className="space-y-6">
      {/* Top Banner and Quick Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center">
            Operations Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-team incident coordination, approvals, and pressure management
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Team Filter Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Authorized Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadDashboard(selectedTeamId)}
            className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-brand-600/30 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Item</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Open */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Open</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {stats?.total_open ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Active operational items</div>
        </div>

        {/* Critical Attention */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical</span>
            <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {stats?.critical_count ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Highest pressure severity</div>
        </div>

        {/* High Priority */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>High Priority</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-orange-400">
            {stats?.high_count ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Elevated urgency</div>
        </div>

        {/* Overdue */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Overdue</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {stats?.overdue_count ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Exceeded due target</div>
        </div>

        {/* Awaiting Approval */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Awaiting Approval</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {stats?.awaiting_approval_count ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Manager sign-off needed</div>
        </div>

        {/* My Assigned */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Assigned to Me</span>
            <UserCheck className="w-4 h-4 text-brand-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-brand-400">
            {stats?.my_assigned_count ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Personal queue items</div>
        </div>
      </div>

      {/* Two Column Layout: Urgent Items & Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Attention Work Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center">
              <Flame className="w-4 h-4 text-rose-400 mr-2" />
              <span>Urgent Attention Required</span>
            </h2>
            <span className="text-xs text-slate-400">Top Priority Issues</span>
          </div>

          <div className="space-y-2">
            {!summary?.urgent_items || summary.urgent_items.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">
                No critical or high-priority items open. Everything under control.
              </p>
            ) : (
              summary.urgent_items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectWorkItem(item.id)}
                  className="p-3 bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-brand-400">
                        {item.key}
                      </span>
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                      <span>Team: {item.team?.name}</span>
                      <span>•</span>
                      <span>Assignee: {item.assignee?.full_name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 text-amber-400 mr-2" />
              <span>Pending Operational Sign-Offs</span>
            </h2>
            <span className="text-xs text-amber-400/80 font-mono">
              Requires Manager Sign-Off
            </span>
          </div>

          <div className="space-y-2">
            {!summary?.awaiting_approval_items || summary.awaiting_approval_items.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-500">
                No items currently awaiting approval.
              </p>
            ) : (
              summary.awaiting_approval_items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectWorkItem(item.id)}
                  className="p-3 bg-slate-850 hover:bg-slate-800 border border-amber-900/30 hover:border-amber-700/50 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[11px] font-bold text-amber-400">
                        {item.key}
                      </span>
                      <CategoryBadge category={item.category} />
                      <PriorityBadge priority={item.priority} />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-2">
                      <span>Reason: {item.reason}</span>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors shrink-0">
                    Review
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Operational Audit Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center">
          <span>Recent Operational Activity Stream</span>
        </h2>

        <div className="space-y-2">
          {!summary?.recent_activity || summary.recent_activity.length === 0 ? (
            <p className="text-center py-4 text-xs text-slate-500">
              No recent activity recorded.
            </p>
          ) : (
            summary.recent_activity.map((a) => (
              <div
                key={a.id}
                onClick={() => onSelectWorkItem(a.work_item_id)}
                className="p-2.5 bg-slate-850/60 hover:bg-slate-800 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-brand-300">
                    {a.actor?.full_name?.charAt(0) || 'U'}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-200">{a.actor?.full_name}</span>{' '}
                    <span className="text-slate-400">
                      {a.action === 'created' && 'created this work item'}
                      {a.action === 'status_changed' &&
                        `changed status to ${a.details?.new_status || 'updated'}`}
                      {a.action === 'approved' &&
                        `approved and resolved this item`}
                      {a.action === 'assigned' && 'updated assignment'}
                      {a.action === 'comment_added' && 'added collaboration note'}
                      {a.action === 'priority_changed' && 'changed priority'}
                      {a.action === 'updated' && 'updated work item'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[10px] text-slate-500">
                  {new Date(a.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
