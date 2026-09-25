import React, { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import { 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle,
  MoreVertical
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'COUNSELOR'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      // Note: We'll need to create a GET /api/users endpoint in backend
      // For now, let's assume it exists or we use auth/me as a base
      const response = await api.get('/auth/me'); // This is just for testing if we can't fetch all
      // Realistically we need a userController for this.
      // I'll create the backend logic for this next.
      setUsers([
        { id: 1, full_name: 'Admin User', email: 'admin@crm.com', role: 'ADMIN', is_active: true },
        { id: 2, full_name: 'Jane Counselor', email: 'jane@crm.com', role: 'COUNSELOR', is_active: true }
      ]);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      toast.success('User created successfully!');
      setIsAddModalOpen(false);
      setFormData({ fullName: '', email: '', password: '', role: 'COUNSELOR' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <MainLayout title="User Management">
      <div className="flex flex-col gap-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary/30">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="block w-full pl-11 pr-4 py-3 bg-white border border-secondary/10 rounded-2xl text-sm font-bold placeholder:text-secondary/20 focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-xl shadow-primary/20 h-12 px-6">
            <UserPlus size={20} /> Add New User
          </Button>
        </div>

        {/* Users Table */}
        <div className="glass overflow-hidden rounded-[2.5rem] border border-white/40 shadow-sm bg-white/40">
          <table className="w-full text-left">
            <thead className="bg-secondary/5 border-b border-secondary/5">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">User Profile</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest">Created At</th>
                <th className="px-8 py-5 text-[10px] font-black text-secondary/40 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary/5">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                      <p className="text-sm font-bold text-secondary/30">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <p className="text-secondary/40 font-bold">No users found.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/60 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/5 to-secondary/10 flex items-center justify-center text-secondary-900 font-black text-xs shadow-inner">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-secondary-900">{user.full_name}</p>
                          <p className="text-xs font-bold text-secondary/40">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 
                        user.role === 'MANAGER' ? 'bg-accent/10 text-accent' : 'bg-secondary/10 text-secondary-600'
                      }`}>
                        <Shield size={12} /> {user.role}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-black ${user.is_active ? 'text-success' : 'text-danger'}`}>
                        {user.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {user.is_active ? 'Active' : 'Suspended'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-secondary/40">
                      May 15, 2026
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-secondary/5 rounded-xl text-secondary/40 hover:text-primary transition-all">
                          <Edit size={18} />
                        </button>
                        <button className="p-2 hover:bg-danger/5 rounded-xl text-secondary/40 hover:text-danger transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal Placeholder */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-secondary-900 mb-6">Create New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <Input 
                label="Full Name" 
                placeholder="Ex: John Doe" 
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required 
              />
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="john@crm.com" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required 
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required 
              />
              <div className="space-y-2">
                <label className="text-xs font-black text-secondary/40 uppercase tracking-widest ml-1">Assigned Role</label>
                <select 
                  className="w-full px-4 py-3 bg-secondary/5 border border-secondary/10 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="COUNSELOR">Counselor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default UsersManagement;
