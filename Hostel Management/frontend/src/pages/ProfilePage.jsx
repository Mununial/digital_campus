import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('edit-profile');

  // Edit Profile Form State
  const [fullNameVal, setFullNameVal] = useState('');
  const [genderVal, setGenderVal] = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [phoneVal, setPhoneVal] = useState('');
  const [dobVal, setDobVal] = useState('');
  const [regNoVal, setRegNoVal] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [base64Photo, setBase64Photo] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const fileInputRef = useRef(null);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const passReqs = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    match: newPassword.length > 0 && newPassword === confirmPassword
  };

  const isPassFormValid = passReqs.length && passReqs.upper && passReqs.lower && passReqs.number && passReqs.match && currentPassword;

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getMe();
      const userData = res.user || res.data?.user || res.data;
      setProfile(userData);
      
      const st = userData?.student_profile;
      setFullNameVal(userData?.full_name || st?.full_name || '');
      setGenderVal(userData?.gender || '');
      setEmailVal(userData?.email || '');
      setPhoneVal(userData?.phone || st?.phone_number || '');
      setRegNoVal(st?.student_code || st?.student_id || userData?.username || '');
      
      // Format DOB for date input (YYYY-MM-DD)
      if (st?.date_of_birth) {
        try {
          const d = new Date(st.date_of_birth);
          setDobVal(d.toISOString().split('T')[0]);
        } catch (e) {
          setDobVal('');
        }
      }
      
      if (userData?.photo_url) {
        setPhotoPreview(userData.photo_url);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Unable to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Photo size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 800;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.88);
        setPhotoPreview(compressed);
        setBase64Photo(compressed);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        full_name: fullNameVal.trim(),
        gender: genderVal || null,
        email: emailVal.trim(),
        phone: phoneVal.trim(),
        phone_number: phoneVal.trim(),
      };

      if (profile?.role === 'STUDENT' && regNoVal.trim()) {
        payload.registration_no = regNoVal.trim();
      }

      if (dobVal) {
        payload.date_of_birth = dobVal;
      }
      if (base64Photo) {
        payload.base64Photo = base64Photo;
      }

      await api.updateSelfProfile(payload);
      setSuccess('Profile details updated successfully!');
      setBase64Photo('');
      fetchProfile();
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!isPassFormValid) return;

    setChangingPass(true);
    setError('');
    setSuccess('');

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setSuccess('Your password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading-skeleton">
          <div className="skeleton-spinner"></div>
          <p>Loading your profile details...</p>
        </div>
      </div>
    );
  }

  const st = profile?.student_profile;
  const displayName = fullNameVal || profile?.full_name || st?.full_name || profile?.username;
  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : 'U';

  return (
    <div className="profile-container">
      {/* Modern Hero Banner Card */}
      <div className="profile-hero-card">
        <div className="hero-background-overlay"></div>
        <div className="hero-content">
          <div className="hero-avatar-wrapper">
            <div className="hero-avatar">
              {photoPreview ? (
                <img src={photoPreview} alt="User Avatar" />
              ) : (
                <div className="hero-avatar-placeholder">{initials}</div>
              )}
            </div>
            
            {/* Change Photo Overlay Button */}
            <button 
              type="button" 
              className="change-photo-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload / Change Profile Photo"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <i className="fa-solid fa-camera"></i>
              <span>Change Photo</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoSelect} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>

          <div className="hero-details">
            <div className="hero-header-row">
              <h1 className="hero-name">{displayName}</h1>
              <div className="hero-badges">
                <span className={`badge badge-role role-${profile?.role?.toLowerCase()}`}>
                  <i className="fa-solid fa-shield-halved mr-1"></i>
                  {profile?.role}
                </span>
                <span className={`badge badge-status status-${profile?.status?.toLowerCase()}`}>
                  <i className="fa-solid fa-circle text-xs mr-1"></i> {profile?.status}
                </span>
                {profile?.gender && (
                  <span className={`badge badge-gender gender-${profile.gender?.toLowerCase() || 'male'}`}>
                    <i className={`fa-solid ${profile.gender === 'MALE' ? 'fa-mars' : profile.gender === 'FEMALE' ? 'fa-venus' : 'fa-genderless'} mr-1`}></i>
                    {profile.gender === 'MALE' ? 'Male' : profile.gender === 'FEMALE' ? 'Female' : 'Other'}
                  </span>
                )}
              </div>
            </div>

            <div className="hero-meta-row">
              <span className="meta-item">
                <i className="fa-solid fa-hashtag text-indigo-300 mr-1"></i>
                <strong>ID:</strong> #{profile?.id}
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-item">
                <i className="fa-solid fa-user text-indigo-300 mr-1"></i>
                <strong>Username:</strong> {profile?.username}
              </span>
              <span className="meta-divider">•</span>
              <span className="meta-item">
                <i className="fa-solid fa-envelope text-indigo-300 mr-1"></i>
                <strong>Email:</strong> {profile?.email}
              </span>
              {(st?.student_code || st?.student_id || (profile?.role === 'STUDENT' && profile?.username)) && (
                <>
                  <span className="meta-divider">•</span>
                  <span className="meta-item">
                    <i className="fa-solid fa-id-badge text-indigo-300 mr-1"></i>
                    <strong>Reg No:</strong> {st?.student_code || st?.student_id || profile?.username}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs-nav">
          <button 
            type="button"
            className={`tab-nav-btn ${activeTab === 'edit-profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('edit-profile'); setError(''); setSuccess(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-user-pen"></i> Edit Profile Info
          </button>
          
          {profile?.role === 'STUDENT' && (
            <button 
              type="button"
              className={`tab-nav-btn ${activeTab === 'academic-hostel' ? 'active' : ''}`}
              onClick={() => { setActiveTab('academic-hostel'); setError(''); setSuccess(''); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-graduation-cap"></i> Accommodation & Academics
            </button>
          )}

          <button 
            type="button"
            className={`tab-nav-btn ${activeTab === 'security-pass' ? 'active' : ''}`}
            onClick={() => { setActiveTab('security-pass'); setError(''); setSuccess(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-lock"></i> Security & Password
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="profile-alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
          <div className="alert-content">{error}</div>
          <button type="button" className="alert-close" onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className="profile-alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-circle-check text-emerald-500"></i>
          <div className="alert-content">{success}</div>
          <button type="button" className="alert-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Tab 1: Edit Profile Information */}
      {activeTab === 'edit-profile' && (
        <div className="profile-tab-content card">
          <div className="tab-header">
            <div>
              <h2>Personal Information & Details</h2>
              <p className="tab-subtitle">Update your personal identity, contact number, gender, registration number and details.</p>
            </div>
            {base64Photo && (
              <span className="pending-photo-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <i className="fa-solid fa-image"></i> New photo selected (Click Save to update)
              </span>
            )}
          </div>

          <form onSubmit={handleProfileUpdate} className="profile-edit-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Student / User Full Name *</label>
                <input
                  type="text"
                  className="modern-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullNameVal}
                  onChange={(e) => setFullNameVal(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp Contact Number</label>
                <input
                  type="tel"
                  className="modern-input"
                  placeholder="e.g. 9876543210"
                  value={phoneVal}
                  onChange={(e) => setPhoneVal(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="modern-input"
                  value={genderVal}
                  onChange={(e) => setGenderVal(e.target.value)}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {profile?.role === 'STUDENT' && (
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="modern-input"
                    value={dobVal}
                    onChange={(e) => setDobVal(e.target.value)}
                  />
                  <small className="form-hint">Used for student identification records.</small>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Login Email Address *</label>
                <input
                  type="email"
                  className="modern-input"
                  value={emailVal}
                  onChange={(e) => setEmailVal(e.target.value)}
                  required
                />
                <small className="form-hint">College registered email identifier.</small>
              </div>

              {profile?.role === 'STUDENT' ? (
                <div className="form-group">
                  <label className="form-label">College Registration Number (Reg No / User ID)</label>
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="e.g. 2301316095"
                    value={regNoVal}
                    onChange={(e) => setRegNoVal(e.target.value)}
                  />
                  <small className="form-hint" style={{ color: '#0284c7' }}>
                    1st-year students can enter/update their official registration number here. You can also use it to log in.
                  </small>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Account Username (Read-Only)</label>
                  <input
                    type="text"
                    className="modern-input read-only-input"
                    value={profile?.username || ''}
                    disabled
                  />
                  <small className="form-hint">System generated account identifier.</small>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-save-profile" 
                disabled={updatingProfile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-floppy-disk"></i>
                {updatingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Accommodation & Academic Profile (Student Only) */}
      {activeTab === 'academic-hostel' && profile?.role === 'STUDENT' && (
        <div className="profile-tab-content card">
          <div className="tab-header">
            <div>
              <h2>Accommodation & Academic Information</h2>
              <p className="tab-subtitle">Your allocated hostel room, bed assignment and enrolled program.</p>
            </div>
          </div>

          <div className="academics-grid">
            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-hotel text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Assigned Hostel</span>
                <span className="card-val highlight">{st?.hostel_name || 'Not Allocated'}</span>
              </div>
            </div>

            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-bed text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Room & Bed No</span>
                <span className="card-val">
                  {st?.room_number ? `Room ${st.room_number}, Bed ${st.bed_number}` : 'Pending Bed Allocation'}
                </span>
              </div>
            </div>

            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-graduation-cap text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Course & Branch</span>
                <span className="card-val">{st?.course || 'B.Tech'} - {st?.branch || 'General'}</span>
              </div>
            </div>

            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-calendar-check text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Academic Year</span>
                <span className="card-val">Year {st?.year_of_study || 1}</span>
              </div>
            </div>

            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-id-card text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Registration No (User ID)</span>
                <span className="card-val">{st?.student_code || profile?.username}</span>
              </div>
            </div>

            <div className="academic-card">
              <span className="card-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-cake-candles text-indigo-600"></i>
              </span>
              <div className="card-info">
                <span className="card-label">Date of Birth</span>
                <span className="card-val">
                  {st?.date_of_birth ? new Date(st.date_of_birth).toLocaleDateString('en-GB') : 'Not Provided'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Password */}
      {activeTab === 'security-pass' && (
        <div className="profile-tab-content card">
          <div className="tab-header">
            <div>
              <h2>Change Account Password</h2>
              <p className="tab-subtitle">Update your login security password regularly to protect your account.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="password-change-form">
            <div className="password-inputs-grid">
              <div className="form-group">
                <label className="form-label">Current Password *</label>
                <div className="input-password-wrapper">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="modern-input"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="pass-toggle-btn"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className={`fa-solid ${showCurrentPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password *</label>
                <div className="input-password-wrapper">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="modern-input"
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="pass-toggle-btn"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <i className={`fa-solid ${showNewPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="modern-input"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="password-requirements-box">
              <div className="req-title">Password Strength Requirements:</div>
              <div className="req-grid">
                <span className={`req-item ${passReqs.length ? 'met' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={`fa-solid ${passReqs.length ? 'fa-circle-check text-emerald-500' : 'fa-circle-dot text-slate-400'}`}></i>
                  At least 8 characters
                </span>
                <span className={`req-item ${passReqs.upper ? 'met' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={`fa-solid ${passReqs.upper ? 'fa-circle-check text-emerald-500' : 'fa-circle-dot text-slate-400'}`}></i>
                  1 uppercase letter
                </span>
                <span className={`req-item ${passReqs.lower ? 'met' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={`fa-solid ${passReqs.lower ? 'fa-circle-check text-emerald-500' : 'fa-circle-dot text-slate-400'}`}></i>
                  1 lowercase letter
                </span>
                <span className={`req-item ${passReqs.number ? 'met' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={`fa-solid ${passReqs.number ? 'fa-circle-check text-emerald-500' : 'fa-circle-dot text-slate-400'}`}></i>
                  1 number (0-9)
                </span>
                <span className={`req-item ${passReqs.match ? 'met' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <i className={`fa-solid ${passReqs.match ? 'fa-circle-check text-emerald-500' : 'fa-circle-dot text-slate-400'}`}></i>
                  Passwords match
                </span>
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn-save-profile" 
                disabled={!isPassFormValid || changingPass}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-key"></i>
                {changingPass ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
