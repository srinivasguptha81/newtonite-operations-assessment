import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  WorkItem,
  Team,
  UserProfile,
  WorkItemCategory,
  WorkItemPriority,
  WorkItemStatus,
} from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CategoryBadge } from '../components/CategoryBadge';
import {
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface Props {
  currentUser: UserProfile | null;
  onSelectWorkItem: (itemId: string) => void;
  onOpenCreateModal: () => void;
}

export const WorkItemsPage: React.FC<Props> = ({
  currentUser,
  onSelectWorkItem,
  onOpenCreateModal,
}) => {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [teamId, setTeamId] = useState<string>('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    loadItems();
  }, [page, pageSize, status, priority, category, teamId, onlyOverdue, onlyMine]);

  const loadTeams = async () => {
    try {
      const data = await api.teams.list();
      setTeams(data);
    } catch {
      // Handled silently
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await api.workItems.list({
        search: search.trim() || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
        team_id: teamId || undefined,
        assignee_id: onlyMine && currentUser ? currentUser.id : undefined,
        overdue: onlyOverdue || undefined,
        page,
        page_size: pageSize,
      });

      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadItems();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategory('');
    setTeamId('');
    setOnlyOverdue(false);
    setOnlyMine(false);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by issue key, title, error code, or description..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-20 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium"
            >
              Search
            </button>
          </form>

          {/* New Item Action Button */}
          <button
            onClick={onOpenCreateModal}
            className="bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-md shadow-brand-600/30 transition-all shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Work Item</span>
          </button>
        </div>

        {/* Filter Pills and Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 border-t border-slate-800/80">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Categories</option>
            <option value="payment_investigation">Payment Investigation</option>
            <option value="production_incident">Production Incident</option>
            <option value="engineering_problem">Engineering Problem</option>
            <option value="compliance_request">Compliance Request</option>
            <option value="customer_issue">Customer Issue</option>
            <option value="operational_task">Operational Task</option>
          </select>

          {/* Team */}
          <select
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-850 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Toggles */}
          <div className="flex items-center space-x-2 px-1">
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOverdue}
                onChange={(e) => {
                  setOnlyOverdue(e.target.checked);
                  setPage(1);
                }}
                className="rounded bg-slate-800 border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <span className="text-rose-400 font-medium">Overdue</span>
            </label>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => {
                  setOnlyMine(e.target.checked);
                  setPage(1);
                }}
                className="rounded bg-slate-800 border-slate-700 text-brand-500 focus:ring-brand-500"
              />
              <span>My Items</span>
            </label>

            <button
              onClick={handleResetFilters}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Work Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-850/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Title & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Team</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Version</th>
                <th className="py-3 px-4">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    Loading operational work items...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No work items found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try adjusting search terms or filter constraints
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isOverdue =
                    item.due_date &&
                    new Date(item.due_date) < new Date() &&
                    item.status !== 'resolved' &&
                    item.status !== 'closed';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectWorkItem(item.id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                    >
                      {/* Key */}
                      <td className="py-3 px-4 font-mono font-bold text-brand-400 whitespace-nowrap">
                        {item.key}
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 max-w-xs sm:max-w-md">
                        <div className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.reason}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <CategoryBadge category={item.category} />
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityBadge priority={item.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>

                      {/* Team */}
                      <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                        {item.team?.name || '—'}
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="flex items-center space-x-1.5 text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-brand-300 font-bold">
                            {item.assignee?.full_name?.charAt(0) || '?'}
                          </span>
                          <span className="truncate max-w-[120px]">
                            {item.assignee?.full_name || 'Unassigned'}
                          </span>
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {item.due_date ? (
                          <span
                            className={
                              isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                            }
                          >
                            {new Date(item.due_date).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Version Pill */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className="font-mono text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-medium"
                          title="Optimistic Concurrency Version"
                        >
                          v{item.version}
                        </span>
                      </td>

                      {/* Updated Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(item.updated_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bounded Pagination Controls */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, total)} of {total} items
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center space-x-1">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 rounded border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="font-mono text-slate-300">
              Page {page} of {totalPages || 1}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 rounded border border-slate-700 transition-colors flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
