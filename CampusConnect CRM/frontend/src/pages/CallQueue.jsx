import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  PhoneCall, 
  Clock, 
  Trash2, 
  Zap, 
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CallQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get('/calls/queue');
      setQueue(res.data);
    } catch (error) {
      toast.error('Failed to load call queue');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this call?')) {
      try {
        await api.post(`/calls/cancel/${id}`);
        toast.success('Call cancelled');
        fetchQueue();
      } catch (error) {
        toast.error('Failed to cancel call');
      }
    }
  };

  const filteredQueue = queue.filter(item => 
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.phone?.includes(searchTerm)
  );

  return (
    <MainLayout title="Live Call Queue">
      <div className="flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-secondary-900 tracking-tight">AI Calling Queue</h1>
            <p className="text-sm text-secondary/40 font-medium">Manage leads scheduled for automated AI outbound calls.</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-secondary/5 shadow-sm">
            <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-xl text-xs font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live System Active
            </div>
            <button 
              onClick={fetchQueue}
              className="p-2 hover:bg-secondary/5 rounded-xl transition-colors text-secondary/40"
            >
              <Zap size={20} />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-secondary/5 shadow-sm">
            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-1">Waiting in Queue</p>
            <h3 className="text-3xl font-black text-secondary-900">{queue.length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-secondary/5 shadow-sm">
            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-1">High Priority</p>
            <h3 className="text-3xl font-black text-primary">{queue.filter(q => q.priority > 1).length}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-secondary/5 shadow-sm">
            <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest mb-1">Avg. Wait Time</p>
            <h3 className="text-3xl font-black text-secondary-900">~2m</h3>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/30" size={20} />
          <input 
            type="text"
            placeholder="Search queue by student name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-secondary/5 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/10 transition-all outline-none"
          />
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-[2.5rem] border border-secondary/10 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-secondary/5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">
                  <th className="px-8 py-5">Priority</th>
                  <th className="px-8 py-5">Student Details</th>
                  <th className="px-8 py-5">Scheduled At</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-8 py-6 h-16 bg-secondary/5"></td>
                    </tr>
                  ))
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center text-secondary/30 font-bold">
                      Queue is empty. New leads will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-secondary/5 transition-colors group">
                      <td className="px-8 py-6">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                          item.priority > 1 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary/5 text-secondary/40'
                        }`}>
                          {item.priority}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-secondary-900">{item.full_name}</span>
                          <span className="text-xs font-bold text-secondary/40">{item.phone} • {item.course_interested}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-secondary/60">
                          <Clock size={14} /> {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          item.call_status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                          item.call_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                          item.call_status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                        }`}>
                          {item.call_status === 'PENDING' ? <Clock size={12} /> : 
                           item.call_status === 'IN_PROGRESS' ? <PhoneCall size={12} /> : <CheckCircle2 size={12} />}
                          {item.call_status}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleCancel(item.id)}
                          className="p-2 text-secondary/20 hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default CallQueue;
