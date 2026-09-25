import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  Calendar,
  Filter
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    conversion: '0%'
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [sourceData, setSourceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const leads = await api.get('/leads');
      const data = leads.data;
      
      const total = data.length;
      const active = data.filter(l => l.status === 'ENROLLED' || l.status === 'INTERESTED').length;
      const pending = data.filter(l => l.status === 'NEW' || l.status === 'FOLLOWUP').length;
      const conversion = total > 0 ? ((active / total) * 100).toFixed(1) + '%' : '0%';

      setStats({ total, active, pending, conversion });
      setRecentLeads(data.slice(0, 5));

      // Calculate Sources
      const sources = {};
      data.forEach(l => {
        const s = l.source || 'DIRECT';
        sources[s] = (sources[s] || 0) + 1;
      });
      setSourceData(Object.entries(sources).map(([name, count]) => ({ name, count })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Total Leads', 
      value: stats.total, 
      icon: <Users size={24} />, 
      color: 'from-blue-600 to-blue-400',
      trend: '+12%',
      isUp: true
    },
    { 
      label: 'Active Leads', 
      value: stats.active, 
      icon: <UserCheck size={24} />, 
      color: 'from-emerald-600 to-emerald-400',
      trend: '+5%',
      isUp: true
    },
    { 
      label: 'Pending Followups', 
      value: stats.pending, 
      icon: <Clock size={24} />, 
      color: 'from-amber-500 to-amber-300',
      trend: '-2%',
      isUp: false
    },
    { 
      label: 'Conversion Rate', 
      value: stats.conversion, 
      icon: <TrendingUp size={24} />, 
      color: 'from-purple-600 to-purple-400',
      trend: '+2.4%',
      isUp: true
    },
  ];

  return (
    <MainLayout title="Dashboard Overview">
      <div className="flex flex-col gap-10">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-secondary-900 tracking-tight">
              Hello, {user?.fullName?.split(' ')[0]}! 👋
            </h2>
            <p className="text-secondary/40 font-bold mt-1">Here's what's happening with your admissions today.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-black text-secondary/60 hover:bg-secondary/5 transition-all shadow-sm">
              <Calendar size={18} /> Last 30 Days
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-black text-secondary/60 hover:bg-secondary/5 transition-all shadow-sm">
              <Filter size={18} /> Filters
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => (
            <div 
              key={idx} 
              className="group relative bg-white rounded-3xl p-6 border border-secondary/10 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between h-full"
            >
              <div className={`absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full group-hover:scale-125 transition-transform duration-500`}></div>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-md`}>
                  {stat.icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${stat.isUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.trend}
                </div>
              </div>
              
              <div className="relative z-10 mt-auto">
                <h3 className="text-3xl font-black text-secondary-900 leading-none mb-1">{stat.value}</h3>
                <p className="text-xs font-black text-secondary/40 uppercase tracking-widest">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Section: Recent Activity & Performance Chart Placeholder */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Recent Leads */}
          <div className="xl:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-secondary/10 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-secondary-900">Recent Leads</h3>
              <button className="text-sm font-black text-primary hover:underline">View All Leads</button>
            </div>
            
            <div className="space-y-4">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="h-20 bg-secondary/5 rounded-3xl animate-pulse"></div>
                ))
              ) : recentLeads.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-secondary/40 font-bold">No leads found yet.</p>
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-6 rounded-3xl bg-secondary/5 border border-secondary/5 group hover:bg-white hover:shadow-xl hover:shadow-secondary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-secondary/5 flex items-center justify-center text-secondary-900 font-black shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                        {lead.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-secondary-900">{lead.full_name}</p>
                        <p className="text-xs font-bold text-secondary/40">{lead.course_interested || 'General Inquiry'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden md:block text-right">
                        <p className="text-xs font-black text-secondary-900">{new Date(lead.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">{lead.source || 'Direct'}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        lead.status === 'NEW' ? 'bg-blue-100 text-blue-600' : 
                        lead.status === 'ENROLLED' ? 'bg-success/10 text-success' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {lead.status}
                      </div>
                      <button className="p-2 text-secondary/20 hover:text-secondary-900 transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions / Activity Feed */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-secondary/10 shadow-sm space-y-10">
            <div>
              <h3 className="text-xl font-black text-secondary-900 mb-6">Lead Sources</h3>
              <div className="space-y-4">
                {sourceData.map((src, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <p className="text-xs font-black text-secondary/60 uppercase tracking-widest">{src.name}</p>
                    </div>
                    <p className="text-sm font-black text-secondary-900">{src.count}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-secondary-900 mb-8">System Activity</h3>

            <div className="space-y-6 relative">
              <div className="absolute left-6 top-4 bottom-4 w-px bg-secondary/10"></div>
              
              {[
                { type: 'LEAD', title: 'New lead added', user: 'System Admin', time: '2 mins ago', color: 'bg-primary' },
                { type: 'FOLLOWUP', title: 'Followup completed', user: 'Jane Counselor', time: '1 hour ago', color: 'bg-success' },
                { type: 'SYSTEM', title: 'Database backup', user: 'Auto System', time: '3 hours ago', color: 'bg-blue-500' },
                { type: 'AUTH', title: 'New counselor login', user: 'Mark Doe', time: '5 hours ago', color: 'bg-purple-500' },
              ].map((activity, idx) => (
                <div key={idx} className="relative flex items-start gap-4 group">
                  <div className={`relative z-10 w-12 h-12 rounded-2xl ${activity.color} flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                    {activity.type === 'LEAD' ? <Users size={18} /> : activity.type === 'FOLLOWUP' ? <CheckCircle size={18} /> : <Clock size={18} />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-black text-secondary-900">{activity.title}</p>
                    <p className="text-xs font-bold text-secondary/40">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-secondary/10">
              <button className="w-full h-12 bg-secondary/5 text-secondary-900 rounded-xl font-black text-sm hover:bg-secondary/10 transition-colors">
                View All Activities
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </MainLayout>


  );
};

// Internal Helper
const CheckCircle = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

export default Dashboard;
