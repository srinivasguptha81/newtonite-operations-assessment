import React from 'react';
import { WorkItemStatus } from '../types';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, ShieldAlert, XCircle } from 'lucide-react';

interface Props {
  status: WorkItemStatus;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<Props> = ({ status, className = '', showIcon = true }) => {
  const configs: Record<
    WorkItemStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    open: {
      label: 'Open',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      icon: <Clock className="w-3.5 h-3.5 mr-1" />,
    },
    in_progress: {
      label: 'In Progress',
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
      icon: <PlayCircle className="w-3.5 h-3.5 mr-1" />,
    },
    blocked: {
      label: 'Blocked',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />,
    },
    awaiting_approval: {
      label: 'Awaiting Approval',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <ShieldAlert className="w-3.5 h-3.5 mr-1" />,
    },
    resolved: {
      label: 'Resolved',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    },
    closed: {
      label: 'Closed',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
    },
  };

  const config = configs[status] || configs.open;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};
