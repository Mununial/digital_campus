import React from 'react';
import MainLayout from '../layouts/MainLayout';

const Followups = () => {
  return (
    <MainLayout title="Followups">
      <div className="glass rounded-3xl p-8 border border-white/40 shadow-sm min-h-[400px] flex items-center justify-center text-secondary/30">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2 text-secondary-900">Followups</h3>
          <p>This page will contain the scheduled followups and calendar.</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Followups;
