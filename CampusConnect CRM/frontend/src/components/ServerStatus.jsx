import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database } from 'lucide-react';

const ServerStatus = () => {
  const [status, setStatus] = useState('checking'); // 'checking', 'active', 'inactive'
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Ping the health endpoint
        await axios.get('http://localhost:5000/health', { timeout: 5000 });
        setStatus('active');
      } catch (error) {
        setStatus('inactive');
      }
    };

    // Check immediately
    checkStatus();

    // Then check every 15 seconds
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/5 border border-secondary/10">
      <Database size={14} className="text-secondary/40" />
      <span className="text-xs font-black uppercase tracking-wider text-secondary-900 hidden md:block">
        DB Status
      </span>
      
      {status === 'checking' && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px] font-bold text-amber-600">Checking...</span>
        </div>
      )}
      
      {status === 'active' && (
        <div className="flex items-center gap-1.5">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-bold text-emerald-600">Active</span>
        </div>
      )}
      
      {status === 'inactive' && (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[10px] font-bold text-rose-600">Waking Up...</span>
        </div>
      )}
    </div>
  );
};

export default ServerStatus;
