import React from 'react';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <div className="antialiased font-sans text-secondary-900">
        <AppRoutes />
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}



export default App;



