const getApiBase = () => {
    if (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) {
        return window.APP_CONFIG.apiBaseUrl;
    }
    return '';
};

export const FirestoreService = {
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
     * Save student data to MySQL database via REST API
     */
    async saveStudent(studentId, data) {
        try {
            const res = await fetch(`${getApiBase()}/api/students/${studentId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errData = await res.json();
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
            const res = await fetch(`${getApiBase()}/api/students/${studentId}`);
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
            const url = new URL(`${window.location.origin}${getApiBase()}/api/students`);
            url.searchParams.append('limit', pageSize);
            if (searchName) url.searchParams.append('search', searchName.trim());

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error('Failed to fetch student list');

            const result = await res.json();
            return {
                students: result.students || [],
                lastVisibleDoc: null,
                hasMore: (result.offset + result.students.length) < result.total,
                totalCount: result.total
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
            const res = await fetch(`${getApiBase()}/api/students/${studentId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete student record');

            // Trigger optional Cloudinary file cleanup
            if (publicIds && publicIds.length > 0) {
                await fetch(`${getApiBase()}/api/delete-student-cloudinary`, {
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
