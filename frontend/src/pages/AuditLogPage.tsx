import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ActivityLog } from '../types';
import { History, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  onSelectWorkItem: (itemId: string) => void;
}

export const AuditLogPage: React.FC<Props> = ({ onSelectWorkItem }) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.activity.listSystem(50);
      setActivities(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center">
            <History className="w-5 h-5 text-brand-400 mr-2" />
            <span>Operational Audit Trail & Activity Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Durable, transaction-consistent mutation history across authorized operational domains
          </p>
        </div>

        <button
          onClick={loadActivities}
          className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 transition-colors"
          title="Refresh audit trail"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5">
        <div className="space-y-4">
          {loading ? (
            <p className="text-center py-12 text-xs text-slate-500">
              Loading audit logs...
            </p>
          ) : activities.length === 0 ? (
            <p className="text-center py-12 text-xs text-slate-500">
              No audit records found.
            </p>
          ) : (
            activities.map((a) => (
              <div
                key={a.id}
                onClick={() => onSelectWorkItem(a.work_item_id)}
                className="p-3.5 bg-slate-850 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-100 flex items-center space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-brand-300 flex items-center justify-center font-bold">
                        {a.actor?.full_name?.charAt(0) || 'U'}
                      </span>
                      <span>{a.actor?.full_name}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                      {a.action.replace('_', ' ')}
                    </span>
                  </div>

                  {a.details && (
                    <div className="text-[11px] text-slate-400 font-mono pl-6">
                      {a.details.old_status && a.details.new_status && (
                        <span className="flex items-center space-x-1.5">
                          <span>{a.details.old_status}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className="text-brand-300 font-bold">{a.details.new_status}</span>
                        </span>
                      )}
                      {a.details.note && (
                        <span className="block text-slate-400 font-sans italic mt-0.5">
                          "{a.details.note}"
                        </span>
                      )}
                      {a.details.title && (
                        <span>Title: "{a.details.title}"</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono sm:text-right shrink-0">
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4 text-slate-600 hidden sm:inline" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
