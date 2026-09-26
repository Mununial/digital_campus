const getApiBase = () => {
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl !== undefined && window.APP_CONFIG.apiBaseUrl !== null) {
        return window.APP_CONFIG.apiBaseUrl;
    }
    return '/api/reporting';
};

export const FirestoreService = {
    /**
     * Ensure Admin role check helper
     */
    async ensureAdminRole(uid, email) {
        return true;
    },

    /**
     * Check if a user UID or email belongs to an Admin
     */
    async checkIsAdmin(uid, email) {
        if (!email && !uid) return false;
        const userStr = localStorage.getItem('college_erp_user');
        if (userStr) {
            try {
                const u = JSON.parse(userStr);
                if (u && (u.isAdmin || u.role === 'admin' || u.userRole === 'admin')) return true;
            } catch (e) {}
        }
        return false;
    },

    async isSubAdminBlocked(uid, email) {
        return false;
    },

    /**
     * Get all students for Admin Dashboard
     */
    async getAllStudents() {
        try {
            const base = getApiBase() || '/api/reporting';
            const endpoint = base.endsWith('/students') ? base : `${base}/students`;
            const url = `${window.location.origin}${endpoint}?limit=2000`;
            const res = await fetch(url);
            if (!res.ok) {
                const staticRes = await fetch('/data/studentsMaster.json');
                if (staticRes.ok) {
                    const staticData = await staticRes.json();
                    return staticData || [];
                }
                throw new Error('Failed to fetch student list');
            }

            const result = await res.json();
            const list = result.students || result || [];
            if (Array.isArray(list) && list.length > 0) {
                return list;
            }

            const staticRes = await fetch('/data/studentsMaster.json');
            if (staticRes.ok) {
                const staticData = await staticRes.json();
                return staticData || [];
            }
            return list;
        } catch (error) {
            console.error("Error fetching all students:", error);
            try {
                const staticRes = await fetch('/data/studentsMaster.json');
                if (staticRes.ok) {
                    const staticData = await staticRes.json();
                    return staticData || [];
                }
            } catch (e) {}
            return [];
        }
    },

    /**
     * Save student data to MySQL database via REST API
     */
    async saveStudent(studentId, data) {
        try {
            const base = getApiBase() || '/api/reporting';
            const endpoint = base.endsWith('/students') ? base : `${base}/students`;
            const res = await fetch(`${endpoint}/${studentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save student record to MySQL');
            }
            return true;
        } catch (error) {
            console.error("Error saving student record:", error);
            throw error;
        }
    },

    /**
     * Get a single student record by ID
     */
    async getStudent(studentId) {
        try {
            const base = getApiBase() || '/api/reporting';
            const endpoint = base.endsWith('/students') ? base : `${base}/students`;
            const res = await fetch(`${endpoint}/${studentId}`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error('Failed to fetch student record');
            const data = await res.json();
            return data;
        } catch (error) {
            console.error("Error fetching student record:", error);
            return null;
        }
    },

    /**
     * Get paginated students list for Admin Dashboard
     */
    async getPaginatedStudents(lastVisible = null, pageSize = 10, searchName = '') {
        try {
            const base = getApiBase() || '/api/reporting';
            const endpoint = base.endsWith('/students') ? base : `${base}/students`;
            const url = new URL(`${window.location.origin}${endpoint}`);
            url.searchParams.append('limit', pageSize);
            if (searchName) url.searchParams.append('search', searchName.trim());

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to fetch student list');

            const result = await res.json();
            return {
                students: result.students || [],
                lastVisibleDoc: null,
                hasMore: (result.offset + (result.students || []).length) < (result.total || 0),
                totalCount: result.total || 0
            };
        } catch (error) {
            console.error("Error fetching paginated students:", error);
            return { students: [], lastVisibleDoc: null, hasMore: false, totalCount: 0 };
        }
    },

    /**
     * Delete a student record
     */
    async deleteStudent(studentId, publicIds = []) {
        try {
            const base = getApiBase() || '/api/reporting';
            const endpoint = base.endsWith('/students') ? base : `${base}/students`;
            const res = await fetch(`${endpoint}/${studentId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete student record');

            if (publicIds && publicIds.length > 0) {
                await fetch(`/api/reporting/delete-student-cloudinary`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ studentId, publicIds })
                }).catch(() => {});
            }

            return true;
        } catch (error) {
            console.error("Error deleting student record:", error);
            throw error;
        }
    },

    /**
     * Fetch all admin records
     */
    async getAllAdmins() {
        return [];
    }
};
