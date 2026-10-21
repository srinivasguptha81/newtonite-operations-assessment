import React from 'react';
import { WorkItemPriority } from '../types';
import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react';

interface Props {
  priority: WorkItemPriority;
  className?: string;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<Props> = ({ priority, className = '', showIcon = true }) => {
  const configs: Record<
    WorkItemPriority,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    critical: {
      label: 'Critical',
      bg: 'bg-rose-500/15',
      text: 'text-rose-400 font-semibold',
      border: 'border-rose-500/40 shadow-sm shadow-rose-900/30',
      icon: <Flame className="w-3.5 h-3.5 mr-1 text-rose-400 animate-pulse" />,
    },
    high: {
      label: 'High',
      bg: 'bg-orange-500/15',
      text: 'text-orange-400 font-medium',
      border: 'border-orange-500/30',
      icon: <ArrowUp className="w-3.5 h-3.5 mr-1 text-orange-400" />,
    },
    medium: {
      label: 'Medium',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <Minus className="w-3.5 h-3.5 mr-1 text-amber-400" />,
    },
    low: {
      label: 'Low',
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-600/30',
      icon: <ArrowDown className="w-3.5 h-3.5 mr-1 text-slate-400" />,
    },
  };

  const config = configs[priority] || configs.medium;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};
