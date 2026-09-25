import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';
import { LEAD_STATUSES, LEAD_SOURCES, COUNSELORS } from '../services/mockData';

const EditLeadModal = ({ isOpen, onClose, lead, onSave }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    courseInterested: '',
    status: '',
    assignedCounselor: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        fullName: lead.fullName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        courseInterested: lead.courseInterested || '',
        status: lead.status || '',
        assignedCounselor: lead.assignedCounselor || '',
      });
    }
  }, [lead]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...lead, ...formData });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Lead Details">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Full Name" 
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <Input 
            label="Email Address" 
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <Input 
            label="Phone Number" 
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <Input 
            label="Course Interested" 
            name="courseInterested"
            value={formData.courseInterested}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-secondary-900">Status</label>
            <select 
              name="status"
              className="w-full px-4 py-3 bg-secondary/5 rounded-xl border border-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              value={formData.status}
              onChange={handleChange}
            >
              {LEAD_STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-secondary-900">Assign Counselor</label>
            <select 
              name="assignedCounselor"
              className="w-full px-4 py-3 bg-secondary/5 rounded-xl border border-secondary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium"
              value={formData.assignedCounselor}
              onChange={handleChange}
            >
              <option value="">Select Counselor</option>
              {COUNSELORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditLeadModal;
