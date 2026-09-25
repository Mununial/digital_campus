import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import becLogo from '../assets/BEC LOGO FINAL.png';

import { Eye, EyeOff, AlertTriangle, Info } from 'lucide-react';

const Login = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // If already authenticated, redirect to home immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginIdentifier.trim() || !password) {
      setErrorMsg('Please fill in both fields.');
      return;
    }

    const result = await login(loginIdentifier, password);
    if (result.success) {
      navigate('/');
    } else {
      setErrorMsg(result.message || 'Invalid username/email or password.');
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo-container">
            <img src={becLogo} alt="BEC College Logo" className="login-college-logo" />
          </div>
          <h1 className="login-title">BEC Hostel Portal</h1>
          <p className="login-subtitle">Sign in to manage room bookings, view profile and check notices</p>
        </div>

        {errorMsg && (
          <div className="login-error-alert">
            <span className="alert-icon"><AlertTriangle size={16} /></span>
            <span className="alert-text">{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <Input
            label="Registration No, Username or Email"
            id="loginIdentifier"
            placeholder="e.g. 2501316050, admin@bec.ac.in, or superadmin"
            value={loginIdentifier}
            onChange={(e) => setLoginIdentifier(e.target.value)}
            required
          />

          <div className="password-input-wrapper">
            <Input
              label="Password"
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <small style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '-10px', marginBottom: '14px', fontSize: '11.5px', color: '#64748b' }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Sign in with your Registration Number, Username, or Email and password.</span>
          </small>

          <Button
            type="submit"
            isLoading={isLoading}
            className="login-submit-btn"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
