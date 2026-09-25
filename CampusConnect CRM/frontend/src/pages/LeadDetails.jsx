import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import api, { leadService } from '../services/api';
import LeadCard from '../components/LeadCard';
import ActivityTimeline from '../components/ActivityTimeline';
import FollowupCard from '../components/FollowupCard';
import Button from '../components/Button';
import EditLeadModal from '../components/EditLeadModal';
import { 
  ArrowLeft, 
  Edit2, 
  MessageSquare, 
  PhoneCall, 
  Calendar, 
  UserPlus, 
  Plus,
  History,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('activity');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

  const fetchLeadDetails = async () => {
    try {
      setIsLoading(true);
      const data = await leadService.getLeadById(id);
      
      const formattedLead = {
        ...data,
        fullName: data.full_name,
        parentPhone: data.parent_phone,
        courseInterested: data.course_interested,
        assignedCounselor: data.assigned_counselor,
        createdDate: data.created_at
      };
      
      setLead(formattedLead);
      setActivities(data.activities || []);
      setFollowups(data.followups || []);
      setCallLogs(data.callLogs || []);
    } catch (error) {
      console.error('Error fetching lead details:', error);
      toast.error('Failed to load lead details');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Loading Lead...">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-secondary/40 font-bold">Fetching lead profile...</p>
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout title="Lead Not Found">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <div className="text-6xl">🔍</div>
          <h2 className="text-2xl font-bold text-secondary-900">Lead with ID {id} not found</h2>
          <Button onClick={() => navigate('/leads')}>Back to Leads</Button>
        </div>
      </MainLayout>
    );
  }

  const handleSaveLead = async (updatedLead) => {
    try {
      const dataToSave = {
        fullName: updatedLead.fullName,
        phone: updatedLead.phone,
        email: updatedLead.email,
        parentPhone: updatedLead.parentPhone,
        courseInterested: updatedLead.courseInterested,
        city: updatedLead.city,
        state: updatedLead.state,
        source: updatedLead.source,
        notes: updatedLead.notes,
        status: updatedLead.status,
        assignedCounselor: updatedLead.assignedCounselor
      };
      
      await leadService.updateLead(id, dataToSave);
      toast.success('Lead updated successfully');
      setIsEditModalOpen(false);
      fetchLeadDetails();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleAddFollowup = async () => {
    const remarks = prompt('Enter followup remarks:');
    if (!remarks) return;
    
    try {
      await leadService.addFollowup(id, {
        followupDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        remarks,
        status: 'PENDING'
      });
      toast.success('Followup scheduled!');
      fetchLeadDetails();
    } catch (error) {
      toast.error('Failed to schedule followup');
    }
  };

  const handleSendEmail = async (templateName) => {
    try {
      await api.post('/emails/send', { leadId: id, templateName });
      toast.success('Email sent successfully!');
      fetchLeadDetails(); // Refresh activities to see the email log
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send email');
    }
  };


  return (
    <MainLayout title={`Lead Details: ${lead.fullName}`}>
      <div className="flex flex-col gap-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/leads')}
              className="p-2.5 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-primary hover:border-primary/20 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded">Admission CRM</span>
                <span className="text-secondary/20 font-bold">/</span>
                <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">{lead.id}</span>
              </div>
              <h1 className="text-2xl font-black text-secondary-900 tracking-tight">Student Profile</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2 font-bold" onClick={() => setIsEditModalOpen(true)}>
              <Edit2 size={18} /> Edit Profile
            </Button>
            <Button className="gap-2 font-bold shadow-lg shadow-primary/20" onClick={() => window.location.href = `tel:${lead.phone}`}>
              <PhoneCall size={18} /> Call Lead
            </Button>
            <Button variant="secondary" className="gap-2 font-bold shadow-lg shadow-accent/20" onClick={() => window.location.href = `mailto:${lead.email}`}>
              <MessageSquare size={18} /> Email
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Profile & Quick Info */}
          <div className="xl:col-span-2 flex flex-col gap-8">
            <LeadCard lead={lead} />

            {/* Tabs & Content */}
            <div className="glass rounded-3xl border border-white/40 shadow-sm overflow-hidden">
              <div className="flex border-b border-secondary/5 bg-white/30 overflow-x-auto">
                {['activity', 'communications', 'notes', 'ai calls'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-5 text-sm font-black uppercase tracking-widest transition-all relative ${
                      activeTab === tab ? 'text-primary' : 'text-secondary/30 hover:text-secondary/60'
                    }`}
                  >
                    {tab}
                    {activeTab === tab && (
                      <motion.div 
                        layoutId="activeTab" 
                        className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-8">
                <AnimatePresence mode="wait">
                  {activeTab === 'activity' && (
                    <motion.div
                      key="activity"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                          <History size={20} className="text-primary" /> Recent Activity
                        </h3>
                        <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">View Full Log</Button>
                      </div>
                      <ActivityTimeline activities={activities} />
                    </motion.div>
                  )}
                  {activeTab === 'communications' && (
                    <motion.div
                      key="comms"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center py-12 text-secondary/30"
                    >
                      <MessageSquare size={48} className="mb-4 opacity-20" />
                      <p className="font-bold">No communication history available.</p>
                      <p className="text-xs mt-1">Logs for WhatsApp, SMS and Email will appear here.</p>
                    </motion.div>
                  )}
                  {activeTab === 'notes' && (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-secondary-900">Counselor Notes</h3>
                        <Button size="sm" className="gap-2">
                          <Plus size={16} /> Add Note
                        </Button>
                      </div>
                      <div className="bg-secondary/5 p-6 rounded-2xl border border-secondary/5 mb-4">
                        <p className="text-sm text-secondary/70 leading-relaxed italic">
                          "{lead.notes || 'No notes available.'}"
                        </p>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-secondary/5">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                            {lead.assignedCounselor?.charAt(0)}
                          </div>
                          <span className="text-[10px] font-bold text-secondary/40">{lead.assignedCounselor} • Last updated {new Date(lead.updated_at || lead.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {activeTab === 'ai calls' && (
                    <motion.div
                      key="aicalls"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                          <PhoneCall size={20} className="text-primary" /> AI Call History
                        </h3>
                      </div>
                      
                      <div className="space-y-6">
                        {callLogs.length > 0 ? callLogs.map(log => (
                          <div key={log.id} className="bg-secondary/5 rounded-2xl border border-secondary/10 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-secondary/10">
                              <div>
                                <p className="text-xs font-black text-secondary/40 uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</p>
                                <h4 className="text-sm font-bold text-secondary-900">Status: <span className={log.call_status === 'COMPLETED' ? 'text-emerald-500' : 'text-rose-500'}>{log.call_status}</span></h4>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-secondary/40">Duration</p>
                                <p className="text-sm font-black text-secondary-900">{log.duration_seconds || 0} sec</p>
                              </div>
                            </div>
                            
                            {log.ai_summary && (
                              <div className="mb-4">
                                <p className="text-xs font-black text-secondary/60 uppercase tracking-widest mb-1">AI Summary</p>
                                <p className="text-sm text-secondary-900 bg-white p-3 rounded-xl border border-secondary/5 leading-relaxed">{log.ai_summary}</p>
                              </div>
                            )}

                            {log.transcript && (
                              <div>
                                <p className="text-xs font-black text-secondary/60 uppercase tracking-widest mb-1">Full Transcript</p>
                                <div className="text-sm text-secondary-900 bg-white p-4 rounded-xl border border-secondary/5 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed font-mono text-[13px]">
                                  {log.transcript}
                                </div>
                              </div>
                            )}
                          </div>
                        )) : (
                          <div className="text-center py-12">
                            <PhoneCall size={48} className="mx-auto mb-4 text-secondary/20" />
                            <p className="font-bold text-secondary/40">No AI calls have been made yet.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column - Secondary Actions & Followups */}
          <div className="flex flex-col gap-8">
            {/* Quick Actions */}
            <div className="glass p-6 rounded-3xl border border-white/40 shadow-sm">
              <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6">Quick Management</h3>
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  className="justify-start gap-3 h-12 border-secondary/5 hover:bg-secondary/5"
                  onClick={() => handleSendEmail('WELCOME_INQUIRY')}
                >
                  <Mail size={18} className="text-primary" /> Send Welcome Email
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start gap-3 h-12 border-secondary/5 hover:bg-secondary/5"
                  onClick={() => handleSendEmail('BROCHURE_DETAILS')}
                >
                  <Mail size={18} className="text-accent" /> Send Brochure
                </Button>
                <Button variant="outline" className="justify-start gap-3 h-12 border-secondary/5 hover:bg-secondary/5 text-danger hover:text-danger hover:bg-danger/5">
                  <Plus size={18} className="rotate-45" /> Mark as Lost
                </Button>
              </div>
            </div>

            {/* Scheduled Followups */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest">Follow-ups</h3>
                <button onClick={handleAddFollowup} className="text-xs font-bold text-primary hover:underline">Schedule</button>
              </div>
              {followups.length > 0 ? (
                followups.map((followup) => (
                  <FollowupCard 
                    key={followup.id} 
                    followup={{
                      ...followup,
                      leadName: lead.fullName,
                      time: new Date(followup.followup_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      date: new Date(followup.followup_date).toLocaleDateString(),
                      priority: 'Medium' // Default mock priority
                    }} 
                    onAction={() => toast.success('Followup logic coming soon')}
                  />
                ))
              ) : (
                <div className="text-center py-8 bg-white/30 rounded-3xl border border-secondary/5">
                  <p className="text-xs text-secondary/30 font-bold">No follow-ups scheduled</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <EditLeadModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lead={lead}
        onSave={handleSaveLead}
      />
    </MainLayout>
  );
};

export default LeadDetails;
