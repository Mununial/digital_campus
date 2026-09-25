import React from 'react';
import { Calendar, Clock, Phone, Mail, User } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from './Button';

const FollowupCard = ({ followup, onAction }) => {
  const priorityColors = {
    High: 'text-danger bg-danger/10',
    Medium: 'text-warning bg-warning/10',
    Low: 'text-success bg-success/10',
  };

  return (
    <div className="glass p-5 rounded-2xl border border-white/40 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            {followup.leadName.charAt(0)}
          </div>
          <div>
            <h4 className="font-bold text-secondary-900 group-hover:text-primary transition-colors">{followup.leadName}</h4>
            <div className={cn("text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block", priorityColors[followup.priority])}>
              {followup.priority} Priority
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 text-secondary/60 text-xs font-bold">
            <Clock size={14} className="text-primary" />
            {followup.time}
          </div>
          <div className="text-[10px] text-secondary/40 mt-1 font-medium">{followup.date}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-secondary/5">
        <div className="flex items-center gap-1.5 text-xs text-secondary/40">
          {followup.type === 'Call' ? <Phone size={14} /> : <Mail size={14} />}
          {followup.type}
        </div>
        <Button size="sm" className="h-8 text-[10px] font-bold" onClick={() => onAction(followup)}>
          Complete
        </Button>
      </div>
    </div>
  );
};

export default FollowupCard;
