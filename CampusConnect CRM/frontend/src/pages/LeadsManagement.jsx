import React, { useState, useMemo, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout';
import LeadTable from '../components/LeadTable';
import SearchBar from '../components/SearchBar';
import LeadFilters from '../components/LeadFilters';
import Pagination from '../components/Pagination';
import Button from '../components/Button';
import EditLeadModal from '../components/EditLeadModal';
import { Plus, Download, FileUp } from 'lucide-react';

import { leadService } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const LeadsManagement = () => {
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const resultsPerPage = 8;

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const data = await leadService.getAllLeads();
      // Map database snake_case to frontend camelCase if necessary, 
      // but let's assume we use the same or handle it.
      // The pg result will have snake_case keys (full_name, etc.)
      const formattedLeads = data.map(l => ({
        ...l,
        fullName: l.full_name,
        parentPhone: l.parent_phone,
        courseInterested: l.course_interested,
        assignedCounselor: l.assigned_counselor,
        createdDate: l.created_at
      }));
      setLeads(formattedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads from database');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        (lead.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (lead.phone?.includes(searchTerm) || false);
      
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    }).sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
  }, [leads, searchTerm, statusFilter, sourceFilter]);

  const totalPages = Math.ceil(filteredLeads.length / resultsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

  const handleEdit = (lead) => {
    setSelectedLead(lead);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await leadService.deleteLead(id);
        toast.success('Lead deleted successfully');
        fetchLeads();
      } catch (error) {
        toast.error('Failed to delete lead');
      }
    }
  };

  const handleSaveLead = async (updatedLead) => {
    try {
      // Map camelCase back to snake_case for the backend
      const dataToSave = {
        fullName: updatedLead.fullName,
        phone: updatedLead.phone,
        email: updatedLead.email,
        parentPhone: updatedLead.parentPhone,
        courseInterested: updatedLead.courseInterested,
        city: updatedLead.city,
        state: updatedLead.state,
        source: updatedLead.source,
        notes: updatedLead.notes,
        status: updatedLead.status,
        assignedCounselor: updatedLead.assignedCounselor
      };
      
      await leadService.updateLead(updatedLead.id, dataToSave);
      toast.success('Lead updated successfully');
      setIsEditModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };


  return (
    <MainLayout title="Leads Management">
      <div className="flex flex-col gap-8">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-black text-secondary-900 tracking-tight">Leads Database</h1>
            <p className="text-sm text-secondary/40 font-medium">Manage and track all student inquiries in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2 font-bold shadow-sm">
              <Download size={18} /> Export
            </Button>
            <Link to="/leads/import">
              <Button variant="outline" className="gap-2 font-bold shadow-sm">
                <FileUp size={18} /> Bulk Import
              </Button>
            </Link>
            <Link to="/leads/add">
              <Button className="gap-2 font-bold shadow-lg shadow-primary/20">
                <Plus size={18} /> Add New Lead
              </Button>
            </Link>

          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass p-4 rounded-3xl border border-white/40 shadow-sm">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
          <LeadFilters 
            status={statusFilter} 
            onStatusChange={setStatusFilter}
            source={sourceFilter}
            onSourceChange={setSourceFilter}
          />
        </div>

        {/* Table Section */}
        <div className="flex flex-col gap-4">
          <LeadTable 
            leads={paginatedLeads} 
            onEdit={handleEdit} 
            onDelete={handleDelete}
            isLoading={isLoading}
          />
          
          {filteredLeads.length > 0 && (
            <div className="mt-4 px-2">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalResults={filteredLeads.length}
                resultsPerPage={resultsPerPage}
              />
            </div>
          )}
        </div>
      </div>

      <EditLeadModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lead={selectedLead}
        onSave={handleSaveLead}
      />
    </MainLayout>
  );
};

export default LeadsManagement;
