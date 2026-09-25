import React from 'react';
import { Phone, Mail, MapPin, Calendar, User, Globe } from 'lucide-react';
import StatusBadge from './StatusBadge';

const LeadCard = ({ lead }) => {
  return (
    <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
            {lead.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-secondary-900 tracking-tight">{lead.fullName}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-secondary/50 font-bold text-sm tracking-wide">{lead.courseInterested}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="bg-white/50 px-4 py-2 rounded-xl border border-secondary/5 flex flex-col">
            <span className="text-[10px] text-secondary/30 uppercase font-black tracking-widest">Lead ID</span>
            <span className="text-sm font-bold text-secondary-900">{lead.id}</span>
          </div>
          <div className="bg-white/50 px-4 py-2 rounded-xl border border-secondary/5 flex flex-col">
            <span className="text-[10px] text-secondary/30 uppercase font-black tracking-widest">Assigned To</span>
            <span className="text-sm font-bold text-primary">{lead.assignedCounselor}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <Phone size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Phone Number</p>
            <p className="text-sm font-bold text-secondary-900">{lead.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <Mail size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Email Address</p>
            <p className="text-sm font-bold text-secondary-900">{lead.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Location</p>
            <p className="text-sm font-bold text-secondary-900">{lead.city}, {lead.state}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <Globe size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Source</p>
            <p className="text-sm font-bold text-secondary-900">{lead.source}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Created Date</p>
            <p className="text-sm font-bold text-secondary-900">{new Date(lead.createdDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/5 border border-transparent hover:border-primary/10 transition-all">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
            <User size={20} />
          </div>
          <div>
            <p className="text-[10px] text-secondary/30 uppercase font-black">Parent Phone</p>
            <p className="text-sm font-bold text-secondary-900">{lead.parentPhone}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
