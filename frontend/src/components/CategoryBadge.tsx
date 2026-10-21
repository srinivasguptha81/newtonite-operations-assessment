import React from 'react';
import { WorkItemCategory } from '../types';

interface Props {
  category: WorkItemCategory;
  className?: string;
}

export const CategoryBadge: React.FC<Props> = ({ category, className = '' }) => {
  const labels: Record<WorkItemCategory, { label: string; color: string }> = {
    payment_investigation: { label: 'Payment Investigation', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' },
    production_incident: { label: 'Production Incident', color: 'bg-red-950/60 text-red-300 border-red-800/40' },
    engineering_problem: { label: 'Engineering Problem', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/40' },
    compliance_request: { label: 'Compliance & Legal', color: 'bg-purple-950/60 text-purple-300 border-purple-800/40' },
    customer_issue: { label: 'Customer Issue', color: 'bg-blue-950/60 text-blue-300 border-blue-800/40' },
    operational_task: { label: 'Operational Task', color: 'bg-slate-800/80 text-slate-300 border-slate-700/40' },
  };

  const item = labels[category] || { label: category, color: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${item.color} ${className}`}
    >
      {item.label}
    </span>
  );
};
