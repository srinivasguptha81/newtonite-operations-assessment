import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import { Team, UserSummary, WorkItemCategory, WorkItemPriority } from '../types';
import { X, ShieldCheck, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateWorkItemModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState<WorkItemCategory>('operational_task');
  const [priority, setPriority] = useState<WorkItemPriority>('medium');
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotentResult, setIdempotentResult] = useState<string | null>(null);

  // Generate new UUID key when opening modal
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(crypto.randomUUID());
      setError(null);
      setIdempotentResult(null);
      loadTeams();
    }
  }, [isOpen]);

  // Load team members when selected team changes
  useEffect(() => {
    if (teamId) {
      loadTeamMembers(teamId);
    } else {
      setTeamMembers([]);
    }
  }, [teamId]);

  const loadTeams = async () => {
    try {
      const teamList = await api.teams.list();
      setTeams(teamList);
      if (teamList.length > 0 && !teamId) {
        setTeamId(teamList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    }
  };

  const loadTeamMembers = async (tId: string) => {
    try {
      const detail = await api.teams.get(tId);
      setTeamMembers(detail.memberships.map((m) => m.user));
    } catch {
      setTeamMembers([]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, isRetryTest = false) => {
    if (e) e.preventDefault();
    if (!title.trim() || !description.trim() || !reason.trim() || !teamId) {
      setError('Please fill in all mandatory fields (Title, Reason, Description, and Team).');
      return;
    }

    setLoading(true);
    setError(null);
    setIdempotentResult(null);

    try {
      const result = await api.workItems.create(
        {
          title: title.trim(),
          description: description.trim(),
          reason: reason.trim(),
          category,
          priority,
          team_id: teamId,
          assignee_id: assigneeId || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        },
        idempotencyKey
      );

      if (result.isIdempotentHit) {
        setIdempotentResult(
          `Idempotency Verified! Request was safely replayed. Work Item '${result.item.key}' was returned without duplicate creation (Header X-Cache: IDEMPOTENT-HIT).`
        );
      } else {
        setIdempotentResult(
          `Work Item '${result.item.key}' created successfully! Idempotency key recorded.`
        );
      }

      setTimeout(() => {
        if (!isRetryTest) {
          onSuccess();
          onClose();
        }
      }, 1200);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create work item.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-850">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center">
              Create Operational Work Item
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Coordinate incidents, billing investigations, or compliance tasks under pressure
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Idempotency Protection Indicator */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium text-slate-400">Idempotency-Key:</span>
            <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 truncate max-w-[220px]">
              {idempotencyKey}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIdempotencyKey(crypto.randomUUID())}
            className="text-[11px] text-slate-400 hover:text-brand-300 flex items-center space-x-1 transition-colors"
            title="Generate a new idempotency key"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Regenerate Key</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {idempotentResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{idempotentResult}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Stripe webhook 500 error on recurring subscription invoices"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            />
          </div>

          {/* Category, Priority & Team */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as WorkItemCategory)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="operational_task">Operational Task</option>
                <option value="production_incident">Production Incident</option>
                <option value="payment_investigation">Payment Investigation</option>
                <option value="engineering_problem">Engineering Problem</option>
                <option value="compliance_request">Compliance Request</option>
                <option value="customer_issue">Customer Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assigned Team <span className="text-rose-400">*</span>
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assignee (Members of Team)
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Reason for Request */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Reason / Justification <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this item exists and what risk or operational goal it addresses..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Detailed Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed technical or operational context, error messages, affected systems..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          {/* Demonstration Retry Button */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(undefined, true)}
            className="text-xs text-brand-400 hover:text-brand-300 hover:underline flex items-center space-x-1 disabled:opacity-50"
            title="Demonstrate sending duplicate request with the exact same Idempotency-Key"
          >
            <span>Test Idempotent Duplicate Replay</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-brand-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Create Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
