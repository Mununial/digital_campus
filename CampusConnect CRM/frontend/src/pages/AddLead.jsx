import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Input from '../components/Input';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { LEAD_STATUSES, LEAD_SOURCES } from '../services/mockData';
import { leadService } from '../services/api';
import { Save, RotateCcw, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AddLead = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    parentPhone: '',
    courseInterested: '',
    city: '',
    state: '',
    source: 'Website',
    status: 'NEW',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = 'Full Name is required';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Must be exactly 10 digits';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.courseInterested) newErrors.courseInterested = 'Please select a course';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Only allow numbers for phone fields
    if ((name === 'phone' || name === 'parentPhone') && value && !/^\d*$/.test(value)) {
      return;
    }
    // Limit to 10 digits
    if ((name === 'phone' || name === 'parentPhone') && value.length > 10) {
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validate()) {
      try {
        setIsLoading(true);
        
        // Prepend +91 before sending to backend
        const dataToSave = {
          ...formData,
          phone: `+91${formData.phone}`,
          parentPhone: formData.parentPhone ? `+91${formData.parentPhone}` : ''
        };

        await leadService.createLead(dataToSave);
        toast.success('Lead added to database successfully!');
        navigate('/leads');
      } catch (error) {
        console.error('Error creating lead:', error);
        toast.error('Failed to create lead. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    }
  };


  const handleReset = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      parentPhone: '',
      courseInterested: '',
      city: '',
      state: '',
      source: 'Website',
      status: 'NEW',
      notes: '',
    });
    setErrors({});
  };

  return (
    <MainLayout title="Add New Lead">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-primary hover:border-primary/20 transition-all shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-secondary-900 tracking-tight">Create New Entry</h1>
              <p className="text-sm text-secondary/40 font-medium">Capture student details to initiate the admission process.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Primary Info Section */}
          <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6 border-b border-secondary/5 pb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Full Name" 
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                error={errors.fullName}
                required
              />
              <Input 
                label="Email Address" 
                name="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />
              <Input 
                label="Phone Number" 
                name="phone"
                prefix="+91"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                error={errors.phone}
                required
              />
              <Input 
                label="Parent/Guardian Phone" 
                name="parentPhone"
                prefix="+91"
                placeholder="9876543210"
                value={formData.parentPhone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Academic & Location Section */}
          <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6 border-b border-secondary/5 pb-4">Academic & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Course Interested" 
                name="courseInterested"
                placeholder="e.g. B.Tech CSE"
                value={formData.courseInterested}
                onChange={handleChange}
                error={errors.courseInterested}
                required
              />
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-secondary-900">Lead Source</label>
                <select 
                  name="source"
                  className="w-full px-4 py-3 bg-secondary/5 rounded-xl border border-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
                  value={formData.source}
                  onChange={handleChange}
                >
                  {LEAD_SOURCES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <Input 
                label="City" 
                name="city"
                placeholder="e.g. Mumbai"
                value={formData.city}
                onChange={handleChange}
              />
              <Input 
                label="State" 
                name="state"
                placeholder="e.g. Maharashtra"
                value={formData.state}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="glass p-8 rounded-3xl border border-white/40 shadow-sm">
            <h3 className="text-sm font-black text-secondary-900 uppercase tracking-widest mb-6 border-b border-secondary/5 pb-4">Additional Information</h3>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-secondary-900">Initial Status</label>
                <div className="flex flex-wrap gap-2">
                  {LEAD_STATUSES.slice(0, 3).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.status === s 
                          ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' 
                          : 'bg-white text-secondary/40 border-secondary/10 hover:border-primary/20'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-secondary-900">Notes / Remarks</label>
                <textarea 
                  name="notes"
                  rows="4"
                  placeholder="Enter any initial observations or student preferences..."
                  className="w-full px-4 py-3 bg-secondary/5 rounded-xl border border-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium resize-none"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-4 py-4">
            <Button 
              type="submit" 
              className="flex-1 gap-2 h-14 text-lg font-black shadow-xl shadow-primary/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Lead...</span>
                </div>
              ) : (
                <>
                  <Save size={20} /> Create Lead Entry
                </>
              )}
            </Button>

            <Button 
              type="button" 
              variant="outline" 
              className="gap-2 h-14 px-8 font-black text-secondary/60"
              onClick={handleReset}
            >
              <RotateCcw size={20} /> Reset
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default AddLead;
