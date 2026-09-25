import React from 'react';
import { cn } from '../utils/cn';
import StatusBadge from './StatusBadge';

const ActivityTimeline = ({ activities }) => {
  return (
    <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-secondary/5">
      {activities.map((activity, idx) => (
        <div key={idx} className="relative pl-12">
          <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-4 border-secondary/5 flex items-center justify-center z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          </div>
          <div className="bg-white/40 p-5 rounded-2xl border border-secondary/5 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={activity.status} className="scale-90 origin-left" />
                <span className="text-sm font-bold text-secondary-900">{activity.user}</span>
              </div>
              <span className="text-xs text-secondary/40 font-medium">{activity.time}</span>
            </div>
            <p className="text-sm text-secondary/70 leading-relaxed">
              {activity.action} <span className="font-bold text-secondary-900">{activity.target}</span>
            </p>
            {activity.note && (
              <div className="mt-3 p-3 bg-secondary/5 rounded-xl text-xs text-secondary/60 italic border-l-2 border-primary/20">
                "{activity.note}"
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
