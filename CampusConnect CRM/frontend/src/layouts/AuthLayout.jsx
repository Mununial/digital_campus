import React from 'react';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background blobs for premium look */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary rounded-2xl p-4 text-white shadow-xl shadow-primary/20 mb-4">
            <GraduationCap size={40} />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 tracking-tight">
            Admission<span className="text-primary">CRM</span>
          </h1>
          <p className="text-secondary/50 mt-2 text-center">
            The next generation admission management system.
          </p>

        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl shadow-secondary/5 border border-white/40">
          {children}
        </div>

        <p className="text-center text-sm text-secondary/40 mt-8">
          &copy; {new Date().getFullYear()} Admission CRM. All rights reserved.
        </p>

      </motion.div>
    </div>
  );
};

export default AuthLayout;
