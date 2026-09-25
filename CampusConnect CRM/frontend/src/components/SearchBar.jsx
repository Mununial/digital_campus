import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils/cn';

const SearchBar = ({ value, onChange, placeholder = "Search leads...", className }) => {
  return (
    <div className={cn("relative group w-full md:w-80", className)}>
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/30 group-focus-within:text-primary transition-colors" 
        size={18} 
      />
      <input 
        type="text" 
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
