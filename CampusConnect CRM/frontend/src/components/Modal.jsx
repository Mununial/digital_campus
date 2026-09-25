import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, className }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              'relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-secondary/10',
              className
            )}
          >
            <div className="flex items-center justify-between border-b border-secondary/10 px-6 py-4">
              <h3 className="text-lg font-bold text-secondary-900">{title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose} className="p-1 h-auto">
                <X size={20} />
              </Button>
            </div>
            <div className="px-6 py-6 overflow-y-auto max-h-[80vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
