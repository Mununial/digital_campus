import api from '../services/api';

/**
 * Fetch paginated activity log list.
 * @param {object} params - Filter and pagination query parameters
 */
export const getActivities = async (params = {}) => {
  const res = await api.get('/activity', { params });
  return res.data || res;
};

/**
 * Fetch stats summary for activity logging.
 */
export const getActivityStats = async () => {
  const res = await api.get('/activity/stats');
  return res.data || res;
};

/**
 * Fetch details of a single activity log.
 * @param {number} id
 */
export const getActivityById = async (id) => {
  const res = await api.get(`/activity/${id}`);
  return res.data || res;
};
