import React from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ServerStatus from './ServerStatus';

const Navbar = ({ title = "Admission CRM" }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-20 bg-white/60 backdrop-blur-md border-b border-secondary/10 px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-black text-secondary-900 tracking-tight">{title}</h1>
        <p className="text-[10px] font-black text-secondary/30 uppercase tracking-[0.2em]">Admission Management System</p>
      </div>

      <div className="flex items-center gap-8">
        <ServerStatus />

        <div className="hidden md:flex items-center gap-3 bg-secondary/5 px-4 py-2 rounded-2xl border border-secondary/5 group focus-within:border-primary/20 transition-all">
          <Search size={18} className="text-secondary/30 group-focus-within:text-primary" />
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-secondary/20 w-64"
          />
        </div>

        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-secondary/40 hover:bg-secondary/5 hover:text-primary transition-all relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
          </button>
          
          <div className="h-8 w-[1px] bg-secondary/10 mx-2"></div>

          <div className="flex items-center gap-3 pl-2 group cursor-pointer relative">
            <div className="text-right">
              <p className="text-sm font-black text-secondary-900 group-hover:text-primary transition-colors leading-tight">
                {user?.fullName}
              </p>
              <p className="text-[10px] font-black text-primary uppercase tracking-wider">
                {user?.role}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
              {user?.fullName?.charAt(0)}
            </div>

            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-secondary/10 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
              <button className="w-full text-left px-4 py-2 text-sm text-secondary/60 hover:bg-secondary/5 hover:text-primary flex items-center gap-2">
                <User size={16} /> Profile
              </button>
              <div className="h-px bg-secondary/5 my-1" />
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5 flex items-center gap-2 font-medium"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
