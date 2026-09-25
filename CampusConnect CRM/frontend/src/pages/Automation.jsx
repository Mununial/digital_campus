import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/Button';
import { 
  Zap, 
  Settings2, 
  History, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const Automation = () => {
  const [rules, setRules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('rules');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_event: 'LEAD_CREATED',
    action_type: 'CREATE_ACTIVITY',
    action_config_text: '{}'
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeTab === 'rules') {
        const response = await api.get('/automation/rules');
        setRules(response.data);
      } else {
        const response = await api.get('/automation/logs');
        setLogs(response.data);
      }
    } catch (error) {
      toast.error('Failed to load automation data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRule = async (id, currentStatus) => {
    try {
      await api.patch(`/automation/rules/${id}/toggle`, { isActive: !currentStatus });
      toast.success(`Rule ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      let configJson = {};
      try {
        configJson = JSON.parse(newRule.action_config_text);
      } catch (e) {
        toast.error('Invalid JSON in Action Config');
        return;
      }
      
      await api.post('/automation/rules', {
        name: newRule.name,
        trigger_event: newRule.trigger_event,
        action_type: newRule.action_type,
        action_config: configJson,
        is_active: true
      });
      
      toast.success('Rule created successfully!');
      setIsModalOpen(false);
      setNewRule({ name: '', trigger_event: 'LEAD_CREATED', action_type: 'CREATE_ACTIVITY', action_config_text: '{}' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create rule');
    }
  };

  return (
    <MainLayout title="Automation Engine">
      <div className="flex flex-col gap-8">
        {/* Header Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-secondary/10 shadow-sm">
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'rules' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary/40 hover:text-secondary-900'
              }`}
            >
              <Settings2 size={18} /> Active Rules
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all ${
                activeTab === 'logs' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-secondary/40 hover:text-secondary-900'
              }`}
            >
              <History size={18} /> Execution Logs
            </button>
          </div>
          
          {activeTab === 'rules' && (
            <Button className="h-12 shadow-sm" onClick={() => setIsModalOpen(true)}>
              + Create Rule
            </Button>
          )}
        </div>

        {activeTab === 'rules' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-48 bg-secondary/5 rounded-[2.5rem] animate-pulse"></div>
              ))
            ) : rules.map((rule) => (
              <div key={rule.id} className={`group bg-white rounded-[2.5rem] p-8 border ${rule.is_active ? 'border-primary/20' : 'border-secondary/10 opacity-60'} transition-all hover:shadow-xl relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${rule.is_active ? 'bg-primary text-white' : 'bg-secondary/10 text-secondary/40'}`}>
                    <Zap size={24} />
                  </div>
                  <button 
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      rule.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-secondary/10 text-secondary/60 hover:bg-secondary/20'
                    }`}
                  >
                    {rule.is_active ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
                    {rule.is_active ? 'Running' : 'Paused'}
                  </button>
                </div>
                
                <h3 className="text-xl font-black text-secondary-900 mb-2">{rule.name}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-secondary/5 rounded-lg text-[10px] font-black text-secondary/40 uppercase tracking-wider">
                    IF: {rule.trigger_event}
                  </span>
                  <ArrowRight size={14} className="text-secondary/20" />
                  <span className="px-3 py-1 bg-primary/5 rounded-lg text-[10px] font-black text-primary uppercase tracking-wider">
                    THEN: {rule.action_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-secondary/10 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-secondary/5">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Execution Time</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Trigger & Lead</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Action</th>
                  <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                {isLoading ? (
                  <tr><td colSpan="4" className="py-20 text-center text-sm font-bold text-secondary/30 animate-pulse">Loading execution history...</td></tr>
                ) : logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/5 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-bold text-secondary/40">
                        <Clock size={14} />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div>
                        <p className="text-sm font-black text-secondary-900">{log.trigger_event}</p>
                        <p className="text-xs font-bold text-primary">{log.lead_name || `Lead #${log.lead_id}`}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-secondary-600">{log.action_type}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-black ${log.execution_status === 'SUCCESS' ? 'text-success' : 'text-danger'}`}>
                        {log.execution_status === 'SUCCESS' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {log.execution_status}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-secondary/10 flex justify-between items-center">
              <h2 className="text-xl font-black text-secondary-900">Create Custom Automation</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-secondary/40 hover:text-danger transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-black text-secondary/60 uppercase tracking-widest mb-2">Rule Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Followup Reminder"
                  className="w-full h-12 bg-secondary/5 border border-secondary/10 rounded-xl px-4 text-sm font-bold text-secondary-900 focus:outline-none focus:border-primary/50 transition-colors"
                  value={newRule.name}
                  onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-secondary/60 uppercase tracking-widest mb-2">Trigger (IF)</label>
                  <select 
                    className="w-full h-12 bg-secondary/5 border border-secondary/10 rounded-xl px-4 text-sm font-bold text-secondary-900 focus:outline-none focus:border-primary/50 transition-colors"
                    value={newRule.trigger_event}
                    onChange={(e) => setNewRule({...newRule, trigger_event: e.target.value})}
                  >
                    <option value="LEAD_CREATED">LEAD_CREATED</option>
                    <option value="LEAD_STATUS_CHANGED">LEAD_STATUS_CHANGED</option>
                    <option value="FOLLOWUP_CREATED">FOLLOWUP_CREATED</option>
                    <option value="FOLLOWUP_MISSED">FOLLOWUP_MISSED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-secondary/60 uppercase tracking-widest mb-2">Action (THEN)</label>
                  <select 
                    className="w-full h-12 bg-secondary/5 border border-secondary/10 rounded-xl px-4 text-sm font-bold text-secondary-900 focus:outline-none focus:border-primary/50 transition-colors"
                    value={newRule.action_type}
                    onChange={(e) => setNewRule({...newRule, action_type: e.target.value})}
                  >
                    <option value="CREATE_ACTIVITY">CREATE_ACTIVITY</option>
                    <option value="SEND_EMAIL">SEND_EMAIL</option>
                    <option value="ENQUEUE_CALL">ENQUEUE_CALL</option>
                    <option value="AUTO_ASSIGN">AUTO_ASSIGN</option>
                    <option value="CHANGE_STATUS">CHANGE_STATUS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-secondary/60 uppercase tracking-widest mb-2">Action Config (JSON)</label>
                <textarea 
                  rows="3"
                  className="w-full bg-secondary/5 border border-secondary/10 rounded-xl p-4 text-sm font-mono text-secondary-900 focus:outline-none focus:border-primary/50 transition-colors"
                  value={newRule.action_config_text}
                  onChange={(e) => setNewRule({...newRule, action_config_text: e.target.value})}
                ></textarea>
                <p className="text-[10px] text-secondary/40 mt-1 font-bold">Example: {`{"template": "WELCOME_INQUIRY"}`}</p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-secondary/5">
                <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">Save & Enable</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Automation;
