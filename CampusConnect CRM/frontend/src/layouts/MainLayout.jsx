import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { cn } from '../utils/cn';

const MainLayout = ({ children, title }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      
      <div className={cn(
        'flex-1 flex flex-col transition-all duration-300',
        isSidebarCollapsed ? 'ml-20' : 'ml-64'
      )}>
        <Navbar 
          onMenuClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
          title={title}
        />
        
        <main className="p-6 md:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
