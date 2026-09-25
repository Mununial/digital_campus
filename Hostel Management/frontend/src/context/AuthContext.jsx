import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('authToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (loginIdentifier, password) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { loginIdentifier, password });
      if (response.success && response.user) {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message || 'Login failed.' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Network error or invalid credentials.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  // 1-Click Student Impersonation for Super Admin
  const impersonateStudent = async (studentId) => {
    setIsLoading(true);
    try {
      const response = await api.post(`/auth/impersonate-student/${studentId}`);
      if (response.success && response.user) {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      return { success: false, message: response.message || 'Could not switch to student account.' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Impersonation failed.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Exit Impersonation and return to Super Admin
  const exitImpersonation = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/exit-impersonation');
      if (response.success && response.user) {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true, user: response.user };
      }
      return { success: false, message: response.message || 'Could not restore admin account.' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to exit impersonation.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading, 
      login, 
      logout, 
      impersonateStudent, 
      exitImpersonation,
      isImpersonating: Boolean(user?.isImpersonating),
      refreshUser: checkAuthStatus 
    }}>
      {children}
      {isAuthenticated && Boolean(user?.must_change_password) && (
        <ForcePasswordChangeModal
          user={user}
          onPasswordChanged={checkAuthStatus}
          onClose={logout}
        />
      )}
    </AuthContext.Provider>
  );
};



export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
