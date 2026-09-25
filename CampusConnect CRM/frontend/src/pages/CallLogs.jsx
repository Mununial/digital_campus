import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  History, 
  Search, 
  Filter, 
  MessageSquare, 
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BrainCircuit
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CallLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calls/logs');
      setLogs(res.data);
    } catch (error) {
      toast.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.phone?.includes(searchTerm) ||
    log.detected_intent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Call Analytics & History">
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-secondary-900 tracking-tight">Conversation Intelligence</h1>
            <p className="text-sm text-secondary/40 font-medium">Review AI transcripts, summaries, and student intent analysis.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-black text-secondary/60 hover:bg-secondary/5 transition-all shadow-sm">
              <Calendar size={18} /> Last 7 Days
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-primary/20">
              <TrendingUp size={18} /> Analytics Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30" size={20} />
            <input 
              type="text"
              placeholder="Search by student, phone or intent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-secondary/5 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 bg-white border border-secondary/5 rounded-2xl font-black text-xs uppercase tracking-widest text-secondary/60 hover:bg-secondary/5 transition-all">
            <Filter size={18} /> More Filters
          </button>
        </div>

        {/* Logs List */}
        <div className="space-y-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-secondary/5 rounded-[2.5rem] animate-pulse"></div>
            ))
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] py-24 border border-secondary/10 text-center">
              <History size={48} className="mx-auto text-secondary/10 mb-4" />
              <p className="text-secondary/30 font-black uppercase tracking-widest text-sm">No call logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="group bg-white rounded-[2.5rem] p-8 border border-secondary/5 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col md:flex-row md:items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                
                {/* Status & Icon */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    log.outcome === 'ANSWERED' ? 'bg-success shadow-success/20' : 'bg-danger shadow-danger/20'
                  }`}>
                    <BrainCircuit size={28} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-secondary/30">{log.duration_seconds}s</span>
                </div>

                {/* Lead Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black text-secondary-900">{log.full_name}</h3>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      log.detected_intent === 'INTERESTED' ? 'bg-success/10 text-success' :
                      log.detected_intent === 'CALLBACK' ? 'bg-primary/10 text-primary' : 'bg-secondary/5 text-secondary/40'
                    }`}>
                      {log.detected_intent || 'NEUTRAL'}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-secondary/40 line-clamp-2 italic">
                    "{log.ai_summary || 'No summary available for this call.'}"
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">Call Date</span>
                    <span className="text-sm font-black text-secondary-900">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">Outcome</span>
                    <span className={`text-sm font-black uppercase ${log.outcome === 'ANSWERED' ? 'text-success' : 'text-danger'}`}>{log.outcome}</span>
                  </div>
                </div>

                {/* Action */}
                <button className="p-4 bg-secondary/5 text-secondary/40 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  <ChevronRight size={24} />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </MainLayout>
  );
};

export default CallLogs;
