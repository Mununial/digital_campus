import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  Mail, 
  GraduationCap,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const InquiryForm = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    parentPhone: '',
    courseInterested: '',
    city: '',
    state: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const courses = [
    'B.Tech Computer Science',
    'B.Tech Mechanical',
    'B.Tech Civil',
    'BBA',
    'MBA',
    'BCA',
    'MCA'
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/public/inquiry', formData);
      setSubmitted(true);
      toast.success('Inquiry submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-['Outfit']">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-primary/10 p-12 text-center border border-secondary/5">
          <div className="w-20 h-20 bg-success/10 rounded-3xl flex items-center justify-center text-success mx-auto mb-8 animate-bounce">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-black text-secondary-900 mb-4">Thank You!</h2>
          <p className="text-secondary/60 font-bold leading-relaxed mb-8">
            Your inquiry has been received. Our admission counselor will contact you within 24 hours.
          </p>
          <button 
            onClick={() => setSubmitted(false)}
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-primary/25"
          >
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-['Outfit'] flex items-center justify-center p-6 py-12">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Branding */}
        <div className="space-y-8 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-2xl font-black text-secondary-900 tracking-tighter uppercase">CampusConnect</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl lg:text-6xl font-black text-secondary-900 leading-[1.1] tracking-tight">
              Start Your <span className="text-primary italic">Future</span> Journey Today.
            </h2>
            <p className="text-lg font-bold text-secondary/40 max-w-md leading-relaxed">
              Join our 2024-25 batch and unlock world-class education, global placements, and lifetime mentorship.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="p-6 bg-white rounded-3xl border border-secondary/5 shadow-sm">
              <p className="text-3xl font-black text-primary mb-1">100%</p>
              <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Placement Record</p>
            </div>
            <div className="p-6 bg-white rounded-3xl border border-secondary/5 shadow-sm">
              <p className="text-3xl font-black text-accent mb-1">500+</p>
              <p className="text-[10px] font-black text-secondary/40 uppercase tracking-widest">Recruiting Partners</p>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-sm font-black text-secondary-900/60 uppercase tracking-widest">
            <div className="flex items-center gap-3"><MapPin size={18} className="text-primary" /> Tech City, Innovation Hub</div>
            <div className="flex items-center gap-3"><Phone size={18} className="text-primary" /> +91 98765 43210</div>
            <div className="flex items-center gap-3"><Mail size={18} className="text-primary" /> admissions@campusconnect.edu</div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-primary/5 p-8 lg:p-12 border border-secondary/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          
          <div className="relative mb-10">
            <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-2">
              <Sparkles size={14} /> Official Inquiry Form
            </div>
            <h3 className="text-2xl font-black text-secondary-900">Admission Inquiry 2024</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Student Name</label>
                <input 
                  type="text" required name="fullName" value={formData.fullName} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                  type="tel" required name="phone" value={formData.phone} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="+91 98XXX XXXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" required name="email" value={formData.email} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Parent's Phone</label>
                <input 
                  type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="+91 88XXX XXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Course Interested In</label>
              <select 
                required name="courseInterested" value={formData.courseInterested} onChange={handleChange}
                className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all appearance-none"
              >
                <option value="">Select a Course</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">City</label>
                <input 
                  type="text" name="city" value={formData.city} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="Your City"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">State</label>
                <input 
                  type="text" name="state" value={formData.state} onChange={handleChange}
                  className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all"
                  placeholder="Your State"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-secondary/40 uppercase tracking-widest ml-1">Message (Optional)</label>
              <textarea 
                name="message" value={formData.message} onChange={handleChange}
                className="w-full px-5 py-4 bg-secondary/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all min-h-[100px]"
                placeholder="Any specific questions?"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : (
                <>Apply Now <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default InquiryForm;
