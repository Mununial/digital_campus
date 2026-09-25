import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const EmailLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/emails/logs');
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to load email logs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (leadId, templateName) => {
    try {
      await api.post('/emails/send', { leadId, templateName });
      toast.success('Email resent successfully');
      fetchLogs();
    } catch (error) {
      toast.error('Failed to resend email');
    }
  };

  return (
    <MainLayout title="Email Communication Logs">
      <div className="flex flex-col gap-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/30">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by recipient or subject..."
              className="block w-full pl-11 pr-4 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-black text-secondary/60 hover:bg-secondary/5 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /> Refresh Logs
          </button>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-[2.5rem] border border-secondary/10 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-secondary/5">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Recipient</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Subject & Template</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/5">
              {isLoading ? (
                <tr><td colSpan="4" className="py-20 text-center animate-pulse font-bold text-secondary/30">Syncing with Resend API...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="4" className="py-20 text-center font-bold text-secondary/30">No emails sent yet.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/5 transition-colors group">
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-black text-secondary-900">{log.lead_name || 'Deleted Lead'}</p>
                        <p className="text-xs font-bold text-secondary/40">{log.recipient_email}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-bold text-secondary-900 truncate max-w-xs">{log.subject}</p>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-md">
                          {log.template_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1">
                        <div className={`inline-flex items-center gap-1.5 text-xs font-black ${log.send_status === 'SENT' ? 'text-success' : 'text-danger'}`}>
                          {log.send_status === 'SENT' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {log.send_status}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-secondary/30">
                          <Clock size={10} /> {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => handleResend(log.lead_id, log.template_name)}
                        className="p-3 hover:bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                        title="Resend Email"
                      >
                        <Send size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmailLogs;
