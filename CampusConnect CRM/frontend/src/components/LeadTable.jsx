import React from 'react';
import { MoreVertical, Eye, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { cn } from '../utils/cn';

const LeadTable = ({ leads, onEdit, onDelete, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white/50 rounded-3xl border border-secondary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-bold text-secondary/40">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white/50 rounded-3xl border border-secondary/5">
        <p className="text-sm font-bold text-secondary/40">No leads found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-y-3">
        <thead>
          <tr className="text-left">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40">Lead info</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40">Course</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40">Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40">Source</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40">Counselor</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-secondary/40 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="group hover:scale-[1.005] transition-all duration-200">
              <td className="px-6 py-4 bg-white/60 first:rounded-l-2xl group-hover:bg-white transition-colors border-y border-l border-secondary/5">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-secondary/5 flex items-center justify-center font-bold text-secondary/40 group-hover:bg-primary group-hover:text-white transition-all">
                    {lead.fullName.charAt(0)}
                  </div>
                  <div>
                    <Link to={`/leads/${lead.id}`} className="text-sm font-bold text-secondary-900 hover:text-primary transition-colors block">
                      {lead.fullName}
                    </Link>
                    <p className="text-[10px] text-secondary/40 font-medium">{lead.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 bg-white/60 group-hover:bg-white transition-colors border-y border-secondary/5">
                <p className="text-sm font-bold text-secondary-900">{lead.courseInterested}</p>
                <p className="text-[10px] text-secondary/40 font-medium">{lead.city}</p>
              </td>
              <td className="px-6 py-4 bg-white/60 group-hover:bg-white transition-colors border-y border-secondary/5">
                <StatusBadge status={lead.status} />
              </td>
              <td className="px-6 py-4 bg-white/60 group-hover:bg-white transition-colors border-y border-secondary/5">
                <span className="text-xs font-bold text-secondary/60">{lead.source}</span>
              </td>
              <td className="px-6 py-4 bg-white/60 group-hover:bg-white transition-colors border-y border-secondary/5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                    {lead.assignedCounselor?.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-secondary/80">{lead.assignedCounselor}</span>
                </div>
              </td>
              <td className="px-6 py-4 bg-white/60 last:rounded-r-2xl group-hover:bg-white transition-colors border-y border-r border-secondary/5 text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/leads/${lead.id}`} className="p-2 rounded-lg hover:bg-secondary/5 text-secondary/40 hover:text-primary transition-all">
                    <Eye size={18} />
                  </Link>
                  <button onClick={() => onEdit(lead)} className="p-2 rounded-lg hover:bg-secondary/5 text-secondary/40 hover:text-accent transition-all">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => onDelete(lead.id)} className="p-2 rounded-lg hover:bg-danger/5 text-secondary/40 hover:text-danger transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="group-hover:hidden">
                  <MoreVertical size={18} className="text-secondary/20 ml-auto" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeadTable;
