import api from '../services/api';

// Maintenance APIs
export const getMaintenanceRequests = async (params = {}) => {
  const res = await api.get('/maintenance', { params });
  return res.data || res;
};

export const getMaintenanceById = async (id) => {
  const res = await api.get(`/maintenance/${id}`);
  return res.data || res;
};

export const createMaintenanceRequest = async (data) => {
  const res = await api.post('/maintenance', data);
  return res.data || res;
};

export const updateMaintenanceStatus = async (id, status, resolutionNote) => {
  const res = await api.patch(`/maintenance/${id}/status`, { status, resolutionNote });
  return res.data || res;
};

export const assignMaintenanceStaff = async (id, assigned_to) => {
  const res = await api.patch(`/maintenance/${id}/assign`, { assigned_to });
  return res.data || res;
};

export const updateMaintenancePriority = async (id, priority, reason) => {
  const res = await api.patch(`/maintenance/${id}/priority`, { priority, reason });
  return res.data || res;
};

export const addMaintenanceUpdate = async (id, message) => {
  const res = await api.post(`/maintenance/${id}/updates`, { message });
  return res.data || res;
};

// Room Inspection APIs
export const getInspections = async (params = {}) => {
  const res = await api.get('/inspections', { params });
  return res.data || res;
};

export const getInspectionById = async (id) => {
  const res = await api.get(`/inspections/${id}`);
  return res.data || res;
};

export const getRoomInspectionHistory = async (roomId) => {
  const res = await api.get(`/inspections/room/${roomId}/history`);
  return res.data || res;
};

export const createInspection = async (data) => {
  const res = await api.post('/inspections', data);
  return res.data || res;
};

// Operations Dashboard Summary API
export const getOperationsSummary = async () => {
  const res = await api.get('/operations/summary');
  return res.data || res;
};

// Phase F Advanced Maintenance APIs
export const checkDuplicateRequests = async (params = {}) => {
  const res = await api.checkDuplicateRequests(params);
  return res.data || res;
};

export const upvoteMaintenanceRequest = async (id) => {
  const res = await api.upvoteMaintenanceRequest(id);
  return res.data || res;
};

export const assignTechnicianToMaintenance = async (id, technician_id) => {
  const res = await api.assignTechnicianToMaintenance(id, technician_id);
  return res.data || res;
};

export const getMaintenanceAnalytics = async (params = {}) => {
  const res = await api.getMaintenanceAnalytics(params);
  return res.data || res;
};

export const getTechnicians = async (params = {}) => {
  const res = await api.getTechnicians(params);
  return res.data || res;
};

export const getTechnicianById = async (id) => {
  const res = await api.getTechnicianById(id);
  return res.data || res;
};

export const createTechnician = async (data) => {
  const res = await api.createTechnician(data);
  return res.data || res;
};

export const updateTechnician = async (id, data) => {
  const res = await api.updateTechnician(id, data);
  return res.data || res;
};

export const deleteTechnician = async (id) => {
  const res = await api.deleteTechnician(id);
  return res.data || res;
};

