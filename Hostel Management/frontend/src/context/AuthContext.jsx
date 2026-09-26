import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import ForcePasswordChangeModal from '../components/ForcePasswordChangeModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const initialToken = localStorage.getItem('authToken') ||
                       localStorage.getItem('portalToken') ||
                       localStorage.getItem('token') ||
                       localStorage.getItem('college_erp_token');

  const storedPortalUser = (() => {
    try {
      const raw = localStorage.getItem('bec_portal_user') ||
                  localStorage.getItem('user') ||
                  localStorage.getItem('college_erp_user') ||
                  localStorage.getItem('bec_session_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const roleStr = String(parsed.role || (parsed.isAdmin ? 'Admin' : '')).toUpperCase();
      const hostelRole = roleStr.includes('ADMIN') ? 'SUPER_ADMIN' : (roleStr.includes('TEACH') || roleStr.includes('FAC') || roleStr.includes('SUPER') ? 'SUPERINTENDENT' : 'STUDENT');
      const realPhoto = parsed.photo_url || parsed.studentPhotoUrl || parsed.photoUrl || null;
      return {
        ...parsed,
        role: hostelRole,
        username: parsed.rollNo || parsed.username || parsed.email?.split('@')[0],
        full_name: parsed.fullName || parsed.name,
        photo_url: realPhoto,
        photoUrl: realPhoto,
        studentPhotoUrl: realPhoto
      };
    } catch (e) {
      return null;
    }
  })();

  // Synchronize authToken in localStorage if portalToken or token was available
  if (initialToken && !localStorage.getItem('authToken')) {
    try {
      localStorage.setItem('authToken', initialToken);
    } catch (e) {}
  }

  const [user, setUser] = useState(storedPortalUser);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialToken || storedPortalUser));
  const [isLoading, setIsLoading] = useState(!initialToken && !storedPortalUser);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response && response.success && response.user) {
        const u = response.user;
        const photo = u.photo_url || u.studentPhotoUrl || u.photoUrl || storedPortalUser?.photo_url || null;
        setUser({
          ...u,
          photo_url: photo,
          photoUrl: photo,
          studentPhotoUrl: photo
        });
        setIsAuthenticated(true);
      } else if (!storedPortalUser && !initialToken) {
        localStorage.removeItem('authToken');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        if (!storedPortalUser) {
          localStorage.removeItem('authToken');
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Keep active portal session if available
          setUser(storedPortalUser);
          setIsAuthenticated(true);
        }
      }
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
