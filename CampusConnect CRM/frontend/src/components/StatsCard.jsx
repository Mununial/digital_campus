import React from 'react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, trend, color = 'primary', className }) => {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    info: 'text-info bg-info/10',
    accent: 'text-accent bg-accent/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        'p-5 rounded-2xl glass border border-white/40 shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', colorMap[color])}>
          {Icon && <Icon size={20} />}
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-bold px-2 py-1 rounded-lg',
            trend > 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-secondary/60 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-secondary-900">{value}</h3>
      </div>
    </motion.div>
  );
};

export default StatsCard;
