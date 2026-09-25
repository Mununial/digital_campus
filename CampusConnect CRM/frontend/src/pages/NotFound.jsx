import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search } from 'lucide-react';
import Button from '../components/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center relative z-10"
      >
        <div className="relative mb-8 flex justify-center">
          <span className="text-[180px] font-black text-secondary/5 leading-none select-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-8 glass rounded-full shadow-2xl border-white/40">
              <Search size={60} className="text-primary animate-pulse" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-secondary-900 mb-4">Page not found</h1>
        <p className="text-secondary/40 max-w-md mx-auto mb-10 font-medium">
          The page you are looking for doesn't exist or has been moved to another location.
        </p>

        <Link to="/">
          <Button className="gap-2 px-8 h-12 text-base shadow-xl shadow-primary/20">
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
