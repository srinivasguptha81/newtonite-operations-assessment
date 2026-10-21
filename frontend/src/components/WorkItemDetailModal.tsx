import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import {
  WorkItem,
  WorkItemStatus,
  WorkItemPriority,
  Comment,
  ActivityLog,
  UserSummary,
  UserProfile,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { CategoryBadge } from './CategoryBadge';
import {
  X,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  History,
  Info,
  User,
  Calendar,
  Send,
  ShieldAlert,
  CheckCircle,
  Play,
  Check,
  Ban,
  ArrowRight,
} from 'lucide-react';

interface Props {
  itemId: string | null;
  isOpen: boolean;
  currentUser: UserProfile | null;
  onClose: () => void;
  onItemUpdated: () => void;
}

export const WorkItemDetailModal: React.FC<Props> = ({
  itemId,
  isOpen,
  currentUser,
  onClose,
  onItemUpdated,
}) => {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserSummary[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'history'>('details');

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<{
    message: string;
    expectedVersion: number;
    currentVersion?: number;
  } | null>(null);

  // New comment input
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Status transition note modal
  const [transitionNote, setTransitionNote] = useState('');

  useEffect(() => {
    if (isOpen && itemId) {
      loadItemData(itemId);
    }
  }, [isOpen, itemId]);

  const loadItemData = async (id: string) => {
    setLoading(true);
    setError(null);
    setConflictError(null);
    try {
      const data = await api.workItems.get(id);
      setItem(data);

      // Load comments & activity in parallel
      const [comms, acts] = await Promise.all([
        api.comments.list(data.id),
        api.activity.listForItem(data.id),
      ]);
      setComments(comms);
      setActivities(acts);

      // Load team members for assignment
      if (data.team_id) {
        try {
          const teamDetail = await api.teams.get(data.team_id);
          setTeamMembers(teamDetail.memberships.map((m) => m.user));
        } catch {
          setTeamMembers([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load work item details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusTransition = async (targetStatus: WorkItemStatus, note?: string) => {
    if (!item) return;
    setActionLoading(true);
    setError(null);
    setConflictError(null);

    try {
      const updated = await api.workItems.transition(
        item.id,
        targetStatus,
        item.version,
        note || transitionNote || undefined
      );
      setItem(updated);
      setTransitionNote('');
      // Reload comments and activities
      const acts = await api.activity.listForItem(item.id);
      setActivities(acts);
      onItemUpdated();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError({
          message: err.message,
          expectedVersion: item.version,
          currentVersion: err.currentVersion,
        });
      } else {
        setError(err.message || 'Status transition failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!item) return;
    setActionLoading(true);
    setError(null);
    setConflictError(null);

    try {
      const updated = await api.workItems.assign(
        item.id,
        newAssigneeId || null,
        item.version
      );
      setItem(updated);
      const acts = await api.activity.listForItem(item.id);
      setActivities(acts);
      onItemUpdated();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError({
          message: err.message,
          expectedVersion: item.version,
          currentVersion: err.currentVersion,
        });
      } else {
        setError(err.message || 'Assignment update failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePriorityChange = async (newPriority: WorkItemPriority) => {
    if (!item) return;
    setActionLoading(true);
    setError(null);
    setConflictError(null);

    try {
      const updated = await api.workItems.update(item.id, {
        priority: newPriority,
        version: item.version,
      });
      setItem(updated);
      const acts = await api.activity.listForItem(item.id);
      setActivities(acts);
      onItemUpdated();
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError({
          message: err.message,
          expectedVersion: item.version,
          currentVersion: err.currentVersion,
        });
      } else {
        setError(err.message || 'Priority update failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !newComment.trim()) return;

    setCommentSubmitting(true);
    setError(null);
    try {
      const comment = await api.comments.create(item.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      // Reload activity timeline since comments produce an audit log
      const acts = await api.activity.listForItem(item.id);
      setActivities(acts);
    } catch (err: any) {
      setError(err.message || 'Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Test helper: deliberately triggers a 409 Conflict by sending a stale version (v - 1)
  const handleSimulateStaleConflict = async () => {
    if (!item) return;
    setActionLoading(true);
    setError(null);
    setConflictError(null);
    try {
      // Intentionally send stale version (e.g. 0 or item.version - 1)
      await api.workItems.update(item.id, {
        title: item.title,
        version: 0, // Stale version!
      });
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictError({
          message: err.message,
          expectedVersion: 0,
          currentVersion: err.currentVersion,
        });
      } else {
        setError(err.message);
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !itemId) return null;

  // Determine user permissions for item
  const isAdmin = currentUser?.system_role === 'admin';
  const isTeamManager =
    isAdmin ||
    currentUser?.team_memberships.some(
      (m) => m.team_id === item?.team_id && m.role === 'manager'
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-850 flex items-start justify-between">
          <div className="space-y-1 pr-4">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded border border-brand-500/20">
                {item?.key || itemId}
              </span>
              {item && <StatusBadge status={item.status} />}
              {item && <PriorityBadge priority={item.priority} />}
              {item && <CategoryBadge category={item.category} />}
              {item && (
                <span
                  className="font-mono text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700"
                  title="Concurrency Version for Optimistic Locking"
                >
                  Version: {item.version}
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-white pt-1">
              {item?.title || 'Loading Work Item...'}
            </h1>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optimistic Concurrency Conflict Alert Banner */}
        {conflictError && (
          <div className="px-6 py-3.5 bg-rose-950/80 border-b border-rose-800 flex items-center justify-between text-rose-200 text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-rose-300">
                  Optimistic Concurrency Conflict (HTTP 409)
                </p>
                <p className="text-[11px] text-rose-200/90">
                  {conflictError.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => item && loadItemData(item.id)}
              className="bg-rose-900 hover:bg-rose-850 border border-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Latest Version</span>
            </button>
          </div>
        )}

        {/* General Error Banner */}
        {error && !conflictError && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Operational Controls Bar */}
        {item && (
          <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Workflow Action Buttons */}
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Actions:</span>

              {item.status === 'open' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('in_progress')}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    <span>Start Work</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('blocked')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded font-medium border border-rose-500/30 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Mark Blocked</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('awaiting_approval')}
                    className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded font-medium border border-amber-500/40 transition-colors disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Request Approval</span>
                  </button>
                </>
              )}

              {item.status === 'in_progress' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('awaiting_approval')}
                    className="px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded font-medium border border-amber-500/40 transition-colors disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    <span>Submit for Approval</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('resolved')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    <span>Mark Resolved</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('blocked')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded font-medium border border-rose-500/30 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Mark Blocked</span>
                  </button>
                </>
              )}

              {item.status === 'blocked' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('in_progress')}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3 h-3" />
                    <span>Unblock & Resume</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('open')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <span>Move to Open</span>
                  </button>
                </>
              )}

              {item.status === 'awaiting_approval' && (
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 flex items-center">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {isTeamManager ? 'Manager Action' : 'Manager Required'}
                  </span>
                  <button
                    disabled={actionLoading || !isTeamManager}
                    onClick={() =>
                      handleStatusTransition(
                        'resolved',
                        `Approved by ${currentUser?.full_name} (${currentUser?.system_role})`
                      )
                    }
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold flex items-center space-x-1 transition-colors disabled:opacity-40"
                    title={
                      !isTeamManager
                        ? 'Only Team Managers or Administrators can approve this item'
                        : 'Sign off and mark as resolved'
                    }
                  >
                    <CheckCircle className="w-3 h-3" />
                    <span>Approve & Resolve</span>
                  </button>
                  <button
                    disabled={actionLoading || !isTeamManager}
                    onClick={() =>
                      handleStatusTransition(
                        'open',
                        `Approval rejected by ${currentUser?.full_name}`
                      )
                    }
                    className="px-2.5 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 rounded font-medium border border-rose-500/40 transition-colors disabled:opacity-40"
                  >
                    <span>Reject to Open</span>
                  </button>
                </div>
              )}

              {item.status === 'resolved' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('closed')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    <span>Close Item</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition('open')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-medium border border-amber-500/30 transition-colors disabled:opacity-50"
                  >
                    <span>Reopen</span>
                  </button>
                </>
              )}

              {item.status === 'closed' && isTeamManager && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition('open')}
                  className="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded font-medium transition-colors disabled:opacity-50"
                >
                  <span>Reopen Item (Manager Action)</span>
                </button>
              )}
            </div>

            {/* Simulated Conflict & Assignment Dropdowns */}
            <div className="flex items-center space-x-3">
              {/* Assignee Switcher */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-400">Assign:</span>
                <select
                  value={item.assignee_id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  disabled={actionLoading}
                  className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Switcher */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-400">Priority:</span>
                <select
                  value={item.priority}
                  onChange={(e) =>
                    handlePriorityChange(e.target.value as WorkItemPriority)
                  }
                  disabled={actionLoading}
                  className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-brand-500 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Stale Update Simulator Button */}
              <button
                type="button"
                onClick={handleSimulateStaleConflict}
                className="text-[10px] text-rose-400/90 hover:text-rose-300 underline font-mono px-1 py-0.5"
                title="Sends an update with a deliberately stale version to demonstrate optimistic locking and 409 Conflict handling"
              >
                [Simulate Stale 409]
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-900 flex space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Overview & Context</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'comments'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Collaboration ({comments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit History ({activities.length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading && !item ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Loading work item details...
            </div>
          ) : !item ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Work item not found or you lack permission to view this team's work.
            </div>
          ) : (
            <>
              {/* DETAILS TAB */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Metadata Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                    <div>
                      <span className="block text-slate-500 font-medium mb-1">
                        Assigned Team
                      </span>
                      <span className="font-semibold text-slate-200">
                        {item.team?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 font-medium mb-1">
                        Current Assignee
                      </span>
                      <span className="font-semibold text-slate-200 flex items-center space-x-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.assignee?.full_name || 'Unassigned'}</span>
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 font-medium mb-1">
                        Due Date
                      </span>
                      <span
                        className={`font-semibold flex items-center space-x-1 ${
                          item.due_date &&
                          new Date(item.due_date) < new Date() &&
                          item.status !== 'resolved' &&
                          item.status !== 'closed'
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {item.due_date
                            ? new Date(item.due_date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'None set'}
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 font-medium mb-1">
                        Created By
                      </span>
                      <span className="font-semibold text-slate-200">
                        {item.creator?.full_name || 'System'}
                      </span>
                    </div>
                  </div>

                  {/* Reason for Request / Justification */}
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Reason for Request / Operational Justification
                    </h2>
                    <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl text-slate-200 text-sm leading-relaxed">
                      {item.reason}
                    </div>
                  </div>

                  {/* Detailed Description */}
                  <div className="space-y-1.5">
                    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Detailed Technical & Incident Context
                    </h2>
                    <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {item.description}
                    </div>
                  </div>

                  {/* Timestamps & Version Footer */}
                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Created: {new Date(item.created_at).toLocaleString()}</span>
                    <span>Last Updated: {new Date(item.updated_at).toLocaleString()}</span>
                    <span>Lock Version: {item.version}</span>
                  </div>
                </div>
              )}

              {/* COMMENTS TAB */}
              {activeTab === 'comments' && (
                <div className="space-y-4">
                  {/* Comment Thread */}
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-center py-8 text-xs text-slate-500">
                        No collaboration comments recorded yet. Add the first update below.
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
                              <span className="w-5 h-5 rounded-full bg-brand-600/30 text-brand-300 flex items-center justify-center font-bold text-[10px]">
                                {c.author?.full_name?.charAt(0) || 'U'}
                              </span>
                              <span>{c.author?.full_name}</span>
                              <span className="text-[10px] text-slate-500 capitalize">
                                ({c.author?.system_role})
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed pl-6 whitespace-pre-wrap">
                            {c.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input Form */}
                  <form onSubmit={handleAddComment} className="pt-2">
                    <div className="flex flex-col space-y-2">
                      <textarea
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add operational investigation note, update, or handoff comment..."
                        className="w-full bg-slate-850 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={commentSubmitting || !newComment.trim()}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{commentSubmitting ? 'Posting...' : 'Post Comment'}</span>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* AUDIT HISTORY TAB */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                    Durable immutable audit log committed atomically with database transactions.
                  </div>

                  <div className="relative border-l border-slate-800 ml-4 space-y-6 pt-2">
                    {activities.map((a) => (
                      <div key={a.id} className="relative pl-6">
                        {/* Bullet Dot */}
                        <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-slate-700 border-2 border-slate-900" />

                        <div className="text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200">
                              {a.actor?.full_name || 'System'}
                            </span>
                            <span className="font-mono text-[10px] uppercase font-bold text-brand-400 px-1.5 py-0.2 bg-brand-500/10 rounded border border-brand-500/20">
                              {a.action.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono ml-auto">
                              {new Date(a.created_at).toLocaleString()}
                            </span>
                          </div>

                          {/* Details Diff */}
                          {a.details && Object.keys(a.details).length > 0 && (
                            <div className="mt-1.5 p-2 bg-slate-950/70 border border-slate-850 rounded font-mono text-[11px] text-slate-300">
                              {a.details.old_status && a.details.new_status && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-slate-400">{a.details.old_status}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <span className="text-brand-300 font-bold">{a.details.new_status}</span>
                                </div>
                              )}
                              {a.details.note && (
                                <p className="text-slate-400 text-xs italic mt-1 font-sans">
                                  Note: "{a.details.note}"
                                </p>
                              )}
                              {a.details.old_assignee_id !== undefined && (
                                <div>
                                  Assignee updated (New ID: {a.details.new_assignee_id || 'None'})
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
