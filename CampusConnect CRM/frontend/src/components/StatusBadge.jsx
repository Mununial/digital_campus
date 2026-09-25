import React from 'react';
import { cn } from '../utils/cn';

const statusColors = {
  NEW: 'bg-info/10 text-info border-info/20',
  CONTACTED: 'bg-primary/10 text-primary border-primary/20',
  INTERESTED: 'bg-accent/10 text-accent border-accent/20',
  FOLLOWUP: 'bg-warning/10 text-warning border-warning/20',
  DOCUMENT_PENDING: 'bg-secondary/10 text-secondary border-secondary/20',
  CONFIRMED: 'bg-success/10 text-success border-success/20',
  LOST: 'bg-danger/10 text-danger border-danger/20',
};

const StatusBadge = ({ status, className }) => {
  const colorClass = statusColors[status] || 'bg-secondary/10 text-secondary border-secondary/20';
  
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors',
      colorClass,
      className
    )}>
      {(status || 'UNKNOWN').replace('_', ' ')}
    </span>

  );
};

export default StatusBadge;
