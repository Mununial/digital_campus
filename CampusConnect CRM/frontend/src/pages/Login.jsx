import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../layouts/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { LogIn, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return toast.error('Please fill in all fields');
    }

    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-white">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-primary to-primary-600 text-white shadow-lg shadow-primary/20 mb-6">
            <LogIn size={32} />
          </div>
          <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Welcome Back</h1>
          <p className="text-secondary/40 font-bold mt-2">Sign in to manage your leads</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input 
            label="Email Address"
            type="email"
            placeholder="admin@crm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
            required
          />

          <Input 
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
            required
          />

          <div className="flex items-center justify-between py-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-5 h-5 rounded-lg border-secondary/10 text-primary focus:ring-primary/20 cursor-pointer" />
              <span className="text-sm font-bold text-secondary/60 group-hover:text-primary transition-colors">Remember me</span>
            </label>
            <a href="#" className="text-sm font-bold text-primary hover:underline">Forgot password?</a>
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying...</span>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn size={20} /> Login Now
              </span>
            )}
          </Button>

          {/* Demo Login Options */}
          <div className="pt-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary/5"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-secondary/20">
                <span className="bg-white px-4">Demo Access</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => { setEmail('admin@crm.com'); setPassword('admin123'); }}
                className="py-3 px-4 bg-primary/5 hover:bg-primary/10 border border-primary/10 rounded-2xl text-xs font-black text-primary transition-all text-center"
              >
                Admin Demo
              </button>
              <button 
                type="button"
                onClick={() => { setEmail('counselor@crm.com'); setPassword('counselor123'); }}
                className="py-3 px-4 bg-accent/5 hover:bg-accent/10 border border-accent/10 rounded-2xl text-xs font-black text-accent transition-all text-center"
              >
                Counselor Demo
              </button>
            </div>
            <p className="text-[10px] text-center text-secondary/30 font-bold">Click demo buttons to auto-fill, then hit "Login Now"</p>
          </div>
        </form>


        <div className="mt-10 pt-8 border-t border-secondary/5 text-center">
          <p className="text-sm font-bold text-secondary/30">
            Don't have an account? <a href="#" className="text-primary hover:underline">Contact Administrator</a>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
