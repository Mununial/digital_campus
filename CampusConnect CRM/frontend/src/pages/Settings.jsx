import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { 
  User, 
  Shield, 
  Bell, 
  Key, 
  Database, 
  Smartphone,
  Check,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  const tabs = [
    { id: 'profile', name: 'Profile', icon: <User size={18} /> },
    { id: 'security', name: 'Security', icon: <Key size={18} /> },
    { id: 'notifications', name: 'Notifications', icon: <Bell size={18} /> },
    { id: 'database', name: 'System', icon: <Database size={18} /> },
  ];

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  return (
    <MainLayout title="Settings">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-white text-secondary/40 hover:bg-secondary/5 hover:text-secondary-900 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-[2.5rem] p-8 md:p-10 border border-secondary/5 shadow-sm">
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-secondary/5">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
                    {user?.fullName?.charAt(0)}
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-white shadow-lg border border-secondary/5 flex items-center justify-center text-secondary/40 hover:text-primary transition-all group-hover:scale-110">
                    <Camera size={18} />
                  </button>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-secondary-900">{user?.fullName}</h3>
                  <p className="text-sm font-bold text-secondary/40 mb-3">{user?.email}</p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                    <Shield size={12} /> {user?.role}
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Full Name" defaultValue={user?.fullName} placeholder="Your full name" />
                <Input label="Email Address" defaultValue={user?.email} placeholder="Your email address" disabled />
                <Input label="Phone Number" placeholder="+91 00000 00000" />
                <Input label="Department" defaultValue="Admission" placeholder="Department" />
                <div className="md:col-span-2 pt-4">
                  <Button type="submit" className="h-14 px-10 shadow-xl shadow-primary/20 gap-2">
                    <Check size={20} /> Save Profile Changes
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
              <h3 className="text-2xl font-black text-secondary-900 mb-2">Security Settings</h3>
              <p className="text-sm font-bold text-secondary/30 mb-8">Keep your account secure by updating your credentials.</p>
              
              <form className="space-y-6">
                <Input label="Current Password" type="password" placeholder="••••••••" />
                <Input label="New Password" type="password" placeholder="••••••••" />
                <Input label="Confirm New Password" type="password" placeholder="••••••••" />
                <div className="pt-4">
                  <Button className="w-full h-14 shadow-xl shadow-primary/20">Update Password</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black text-secondary-900 mb-2">Notification Preferences</h3>
              <p className="text-sm font-bold text-secondary/30 mb-8">Choose how you want to be notified about CRM updates.</p>
              
              <div className="space-y-4">
                {[
                  { title: 'Email Notifications', desc: 'Receive updates about new leads via email.' },
                  { title: 'Push Notifications', desc: 'Get real-time browser alerts for follow-ups.' },
                  { title: 'SMS Alerts', desc: 'Critical notifications sent to your phone.' },
                  { title: 'Activity Digest', desc: 'Weekly summary of counselor activities.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-6 rounded-3xl bg-secondary/5 border border-secondary/5 group hover:bg-white hover:shadow-xl hover:shadow-secondary/5 transition-all">
                    <div>
                      <p className="text-sm font-black text-secondary-900">{item.title}</p>
                      <p className="text-xs font-bold text-secondary/40">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={idx < 2} />
                      <div className="w-12 h-6 bg-secondary/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'database' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-2xl font-black text-secondary-900 mb-2">System Information</h3>
              <p className="text-sm font-bold text-secondary/30 mb-8">Backend connectivity and system status.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-success/5 border border-success/10">
                  <div className="flex items-center gap-3 text-success mb-2">
                    <Database size={20} />
                    <span className="text-sm font-black uppercase tracking-widest">Database</span>
                  </div>
                  <p className="text-2xl font-black text-secondary-900">Connected</p>
                  <p className="text-xs font-bold text-success/60">Supabase PostgreSQL (Transaction Pooler)</p>
                </div>
                
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3 text-primary mb-2">
                    <Smartphone size={20} />
                    <span className="text-sm font-black uppercase tracking-widest">Version</span>
                  </div>
                  <p className="text-2xl font-black text-secondary-900">v1.2.0-pro</p>
                  <p className="text-xs font-bold text-primary/60">2026 Production Build</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
