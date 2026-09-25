import React from 'react';
import { Filter } from 'lucide-react';
import { LEAD_STATUSES, LEAD_SOURCES } from '../services/mockData';
import { cn } from '../utils/cn';

const LeadFilters = ({ status, onStatusChange, source, onSourceChange, className }) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex items-center bg-white rounded-xl border border-secondary/10 px-3 py-2.5">
        <Filter size={18} className="text-secondary/30 mr-2" />
        <select 
          className="bg-transparent text-sm font-medium text-secondary/60 focus:outline-none cursor-pointer pr-2"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          {LEAD_STATUSES.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center bg-white rounded-xl border border-secondary/10 px-3 py-2.5">
        <select 
          className="bg-transparent text-sm font-medium text-secondary/60 focus:outline-none cursor-pointer"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
        >
          <option value="ALL">All Sources</option>
          {LEAD_SOURCES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LeadFilters;
