import { Store } from './store.js';
import { auth } from './services/firebase.js';
import { PdfService } from './services/PdfService.js';
import { FirestoreService } from './services/firestoreService.js';
import { AuthService, isUserAdmin, createAdminAccount, OFFICIAL_ADMIN_EMAILS } from './services/authService.js';
import { SessionService } from './services/sessionService.js';
import { Sanitizer } from './utils/sanitizer.js';
import { AuditService } from './services/auditService.js';
import { StorageService } from './services/storageService.js';
import { Footer } from './components/Footer.js';

let allStudentsList = [];
let filteredStudentsList = [];
let currentStudents = [];
let currentPage = 1;
let PAGE_SIZE = 10;
let selectedStudent = null;
let selectedStudentIndex = -1;
let currentRejectDocKey = null;
let currentUserIsSuperAdmin = false;

// Expose PDF and ZIP service methods to global scope for UI handlers
window.PdfService = PdfService;
window.downloadFormPdf = (type) => {
    if (!selectedStudent) {
        alert("No student selected.");
        return;
    }
    PdfService.downloadFormPdf(type, selectedStudent);
};
window.downloadAllZip = () => {
    if (!selectedStudent) {
        alert("No student selected.");
        return;
    }
    PdfService.downloadAllDocumentsZip(selectedStudent);
};

// Global Handler for Super Admin Student Deletion
window.deleteStudentUser = async (sId, sName) => {
    if (!currentUserIsSuperAdmin) {
        alert("Access Denied: Only Super Administrators have permission to delete student records.");
        return;
    }
    if (!confirm(`Are you sure you want to PERMANENTLY delete student "${sName}" (ID: ${sId}) and all their data from the database?`)) {
        return;
    }
    try {
        await FirestoreService.deleteStudent(sId);
        AuditService.log('ADMIN_DELETE_STUDENT', { studentId: sId, studentName: sName });
        alert(`Student "${sName}" and all their data deleted successfully!`);
        if (typeof window.loadAdminData === 'function') {
            await window.loadAdminData();
        } else {
            window.location.reload();
        }
    } catch(err) {
        alert('Failed to delete student: ' + err.message);
    }
};

// Cache key for ultra-fast instant rendering
const CACHE_KEY = 'bec_admin_students_cache';

function tryLoadCachedData() {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
                allStudentsList = parsed;
                updateStats(allStudentsList);
                filterStudents();
                return true;
            }
        }
    } catch (e) {
        console.warn("Cache load failed:", e);
    }
    return false;
}

function renderLoadingSkeleton() {
    const tbody = document.getElementById('students-table-body');
    if (!tbody || (allStudentsList && allStudentsList.length > 0)) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 36px 20px;">
                <div style="display: inline-flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="width: 20px; height: 20px; border: 2.5px solid #0284c7; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span style="color: #475569; font-weight: 600; font-size: 0.9rem;">Loading Student Records...</span>
                </div>
            </td>
        </tr>
    `;
}

// Search Debounce Timer
let searchDebounceTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Instant Cache Render (< 5ms load time)
    const hasCachedData = tryLoadCachedData();
    if (!hasCachedData) {
        renderLoadingSkeleton();
    }

    // 2. Parallel Setup of UI Listeners and Modals
    setupListeners();
    setupAdminManagementModal();
    setupChangePasswordModal();
    initServerStatusCheck();

    const footerEl = document.getElementById('footer-container');
    if (footerEl) footerEl.innerHTML = Footer();

    // 3. Fast Route Protection & Authorization Check
    const user = await AuthService.waitForAuth();
    const isAdmin = await isUserAdmin(user);

    if (!user || !isAdmin) {
        alert("Access Denied: Only authorized administrators can access the Admin Panel.");
        window.location.href = 'login.html';
        return;
    }

    // STRICT BLOCKED SUB-ADMIN GATEKEEPER (Zero Student Data Leak)
    if (user && user.email) {
        const isBlocked = await FirestoreService.isSubAdminBlocked(user.uid, user.email);
        if (isBlocked) {
            document.body.style.background = '#0f172a';
            document.body.innerHTML = `
                <div style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 20px;">
                    <div style="background: white; border: 3px solid #ef4444; padding: 40px 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); max-width: 520px; width: 100%;">
                        <div style="font-size: 4.2rem; margin-bottom: 12px; line-height: 1;">🚫</div>
                        <h2 style="color: #991b1b; margin-top: 0; margin-bottom: 8px; font-size: 1.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Account Blocked</h2>
                        <p style="color: #334155; font-size: 0.98rem; line-height: 1.5; margin-bottom: 20px;">
                            Your Sub-Admin account <strong style="color: #1e293b; background: #f1f5f9; padding: 3px 10px; border-radius: 6px; font-family: monospace;">${Sanitizer.sanitizeString(user.email)}</strong> has been <strong>BLOCKED</strong> by the Super Administrator.
                        </p>
                        <div style="background: #fef2f2; border: 1.5px solid #fecaca; color: #991b1b; padding: 14px; border-radius: 10px; font-size: 0.88rem; margin-bottom: 24px; font-weight: 600; text-align: left; line-height: 1.5;">
                            ⚠️ <strong>Access Restriction:</strong> You cannot view student data, download records, or perform administrative actions. Please contact the System Administrator to request account unblocking.
                        </div>
                        <button id="blocked-logout-btn" style="background: #dc2626; color: white; border: none; padding: 12px 36px; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: background 0.2s; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">
                            🔒 Logout Now
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('blocked-logout-btn')?.addEventListener('click', async () => {
                await AuthService.logout();
                window.location.href = 'login.html';
            });
            return;
        }
    }
    
    // Initialize 2-hour inactivity session monitor
    SessionService.init();

    // Inject Admin Profile Info & Header Buttons
    const cleanUserEmail = (user.email || '').toLowerCase().trim();
    const isSuperAdmin = OFFICIAL_ADMIN_EMAILS.some(e => e.toLowerCase() === cleanUserEmail);
    currentUserIsSuperAdmin = isSuperAdmin;

    const userDiv = document.getElementById('admin-user-info');
    if (userDiv) {
        userDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; background: rgba(255,255,255,0.15); padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25);">
                <div style="width:34px; height:34px; border-radius:50%; background:${isSuperAdmin ? '#8b5cf6' : '#0284c7'}; color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.9rem;">
                    ${isSuperAdmin ? '👑' : '🛡️'}
                </div>
                <div style="text-align: right; font-size: 0.85rem;">
                    <strong style="color: white; display: block; line-height: 1.2;">${Sanitizer.sanitizeString(user.displayName || user.email)}</strong>
                    <span style="background: ${isSuperAdmin ? '#8b5cf6' : '#0284c7'}; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 10px; font-weight: 700; text-transform: uppercase;">
                        ${isSuperAdmin ? 'SUPER ADMIN' : 'SUB ADMIN'}
                    </span>
                </div>
                <button id="admin-refresh-data-btn" class="btn" style="padding: 5px 12px; font-size: 0.8rem; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">🔄 Refresh Data</button>
                <button id="admin-change-pass-btn" class="btn" style="padding: 5px 12px; font-size: 0.8rem; background: #d97706; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">🔒 Change Password</button>
                ${isSuperAdmin ? `<button id="admin-manage-admins-btn" class="btn" style="padding: 5px 12px; font-size: 0.8rem; background: #8b5cf6; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">🔑 Manage Admins</button>` : ''}
                <button id="admin-logout-btn" class="btn" style="padding: 5px 12px; font-size: 0.8rem; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;">Logout</button>
            </div>
        `;
        document.getElementById('admin-logout-btn')?.addEventListener('click', () => {
            AuthService.logout();
        });
        document.getElementById('admin-refresh-data-btn')?.addEventListener('click', () => {
            loadAdminData();
        });
        document.getElementById('admin-change-pass-btn')?.addEventListener('click', () => {
            openChangePasswordModal();
        });
        document.getElementById('admin-manage-admins-btn')?.addEventListener('click', () => {
            openAdminManagementModal();
        });
    }

    try {
        await loadAdminData(hasCachedData);
        
        // Auto-refresh student data every 25 seconds to pull new student registrations
        setInterval(() => {
            loadAdminData(true);
        }, 25000);
    } catch(err) {
        console.error("Failed to load admin data:", err);
    }
});

async function loadAdminData(silent = false) {
    try {
        if (!silent && allStudentsList.length === 0) {
            renderLoadingSkeleton();
            document.body.style.cursor = 'wait';
        }

        const user = auth.currentUser || await AuthService.waitForAuth();
        if (user) {
            await FirestoreService.ensureAdminRole(user.uid, user.email).catch(() => {});
        }
        
        let allFetched = [];
        try {
            allFetched = await FirestoreService.getAllStudents();
        } catch (fetchErr) {
            console.warn("Direct getAllStudents error, ensuring admin role and retrying:", fetchErr);
            if (user) {
                await FirestoreService.ensureAdminRole(user.uid, user.email).catch(() => {});
                allFetched = await FirestoreService.getAllStudents();
            }
        }
        
        if (!allFetched || allFetched.length === 0) {
            console.warn("No students fetched from Firestore. Checking local Store fallback...");
            if (Store.data && Store.data.personal && (Store.data.personal.studentFullName || Store.data.personal.fullName)) {
                allFetched = [Store.data];
            } else {
                allFetched = [];
            }
        }

        allStudentsList = (allFetched || []).filter(s => {
            if (!s) return false;
            const emailKey = (s.email || s.personal?.studentEmail || s.admin?.email || '').toLowerCase().trim();

            // Exclude Admins, Super Admins & Staff accounts from Student Reporting table
            if (s.role === 'admin' || s.userRole === 'admin' || s.isAdmin === true) return false;
            if (emailKey && OFFICIAL_ADMIN_EMAILS.includes(emailKey)) return false;
            if (emailKey && (emailKey === 'admin@becbbsr.ac.in' || emailKey === 'academic@becbbsr.ac.in' || emailKey === 'principal@becbbsr.ac.in' || emailKey === 'admission@becbbsr.ac.in')) return false;
            if (emailKey === 'bhagyabratagantayat@gmail.com') return false;

            const hasName = !!(s.personal?.studentFullName || s.personal?.fullName || s.personalInfo?.fullName || s.name);
            const hasProgram = !!(s.reporting?.program || s.academic?.program);
            const hasId = !!(s.id || s.uid || s.admin?.studentId);
            const hasEmail = !!(s.email || s.personal?.studentEmail);
            
            return hasName || hasProgram || hasId || hasEmail;
        });

        allStudentsList.sort((a, b) => {
            const getTime = (s) => {
                if (!s) return 0;
                if (s.updatedAt?.seconds) return s.updatedAt.seconds * 1000;
                if (s.createdAt?.seconds) return s.createdAt.seconds * 1000;
                const timeVal = s.createdAt || s.updatedAt || s.linkedAt || s.lastLogin || s.admin?.lastUpdated || s.reporting?.reportingDate;
                if (timeVal) {
                    if (typeof timeVal === 'number') return timeVal;
                    const parsed = new Date(timeVal).getTime();
                    if (!isNaN(parsed) && parsed > 0) return parsed;
                }
                return 0;
            };
            return getTime(b) - getTime(a);
        });

        // Save fresh snapshot to fast cache
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(allStudentsList));
        } catch (e) {}

        updateStats(allStudentsList);
        filterStudents();
    } catch (e) {
        console.error("Error loading admin student data:", e);
        const tbody = document.getElementById('student-table-body') || document.getElementById('students-tbody');
        if (tbody && allStudentsList.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 24px; color:#ef4444; font-weight:600;">⚠️ Failed to load student data from database: ${Sanitizer.sanitizeString(e.message || 'Permission or network issue')}</td></tr>`;
        }
    } finally {
        if (!silent) document.body.style.cursor = 'default';
    }
}

function updateStats(students) {
    const total = students.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = students.filter(s => s.reporting?.reportingDate === todayStr).length;
    const completed = students.filter(s => s.admin?.status === 'COMPLETED').length;
    const progress = students.filter(s => s.admin?.status === 'IN_PROGRESS' || !s.admin?.status).length;
    
    const hostel = students.filter(s => (s.facilities?.hostelRequired || s.reporting?.hostelRequired) === 'Yes' || s.facilities?.hostelRequired === true).length;
    const transport = students.filter(s => (s.facilities?.transportRequired || s.reporting?.transportRequired) === 'Yes' || s.facilities?.transportRequired === true).length;
    
    const pendingReg = students.filter(s => !s.admin?.registrationNumber || s.admin?.registrationNumber === 'PENDING BY COLLEGE').length;
    const pendingId = students.filter(s => !s.idCard?.generated).length;

    const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setTxt('stat-total', total);
    setTxt('stat-today', today);
    setTxt('stat-completed', completed);
    setTxt('stat-progress', progress);
    setTxt('stat-hostel', hostel);
    setTxt('stat-transport', transport);
    setTxt('stat-pending-reg', pendingReg);
    setTxt('stat-pending-id', pendingId);
}

function getStudentDataField(s, fieldName) {
    if (!s) return '';
    const p = s.personal || s.personalInfo || {};
    const a = s.academic || s.reporting || s.academicInfo || {};
    const adm = s.admin || {};

    switch(fieldName) {
        case 'studentName':
            return p.studentFullName || p.fullName || s.studentFullName || s.fullName || s.personalInfo?.fullName || s.personalInfo?.studentFullName || s.name || s.displayName || s.email || 'Student';
        case 'program':
            return a.program || s.reporting?.program || s.academic?.program || s.academicInfo?.program || s.personal?.program || s.program || s.course || 'B.Tech';
        case 'branch':
            return a.branch || s.reporting?.branch || s.academic?.branch || s.academicInfo?.branch || s.personal?.branch || s.branch || s.rawBranch || s.department || 'CSE';
        case 'mobile':
            return p.studentMobile || p.mobile || s.personalInfo?.studentMobile || s.personalInfo?.mobile || s.studentMobile || s.mobile || s.phone || 'N/A';
        case 'email':
            return p.studentEmail || p.email || s.personalInfo?.email || s.studentEmail || s.email || 'N/A';
        case 'fatherName':
            return p.fatherName || s.personalInfo?.fatherName || s.fatherName || 'N/A';
        case 'motherName':
            return p.motherName || s.personalInfo?.motherName || s.motherName || 'N/A';
        case 'aadhaar':
            return p.aadhaarNumber || s.personalInfo?.aadhaarNumber || s.aadhaarNumber || 'N/A';
        case 'dob':
            return p.dob || s.personalInfo?.dob || s.dob || 'N/A';
        case 'gender':
            return p.gender || s.personalInfo?.gender || s.gender || 'N/A';
        case 'category':
            return p.category || p.caste || s.personalInfo?.category || s.category || 'N/A';
        case 'registrationNumber':
            return adm.registrationNumber || s.registrationNumber || s.rollNumber || s.rollNo || s.tempId || 'PENDING BY COLLEGE';
        case 'status':
            return adm.status || s.submission?.status || s.status || (s.verified ? 'VERIFIED' : 'IN_PROGRESS');
        case 'session':
            return a.academicSession || s.reporting?.academicSession || s.academicSession || 'N/A';
        case 'year':
            return a.academicYear || s.reporting?.academicYear || s.academicYear || 'N/A';
        default:
            return s[fieldName] || p[fieldName] || a[fieldName] || adm[fieldName] || 'N/A';
    }
}

function renderTable(students) {
    const tbody = document.getElementById('student-table-body') || document.getElementById('students-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color:#64748b;">No matching student records found.</td></tr>`;
        return;
    }
    
    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const rawPhoto = s.documents?.studentPhoto?.url || s.documents?.studentPhoto || s.studentPhotoUrl || s.photoUrl || null;
        const photoUrl = (typeof rawPhoto === 'string' && rawPhoto.startsWith('http')) ? rawPhoto : null;
        const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23cbd5e1'/><circle cx='50' cy='38' r='20' fill='%2364748b'/><path d='M 20 82 A 32 30 0 0 1 80 82 Z' fill='%2364748b'/></svg>";
        const photoImg = photoUrl 
            ? `<img src="${photoUrl}" class="student-photo" alt="Photo" onerror="this.src='${DEFAULT_AVATAR}'">` 
            : `<img src="${DEFAULT_AVATAR}" class="student-photo" alt="Photo">`;
        
        const studentId = s.id || s.uid || s.admin?.studentId || `BEC-${s.reporting?.academicSession?.substring(0,4) || '2026'}-${(i+1).toString().padStart(3, '0')}`;
        const studentName = Sanitizer.sanitizeString(getStudentDataField(s, 'studentName'));
        
        const progVal = getStudentDataField(s, 'program');
        const branchVal = getStudentDataField(s, 'branch');
        let courseBranch = `${Sanitizer.sanitizeString(progVal)} / ${Sanitizer.sanitizeString(branchVal)}`;
        if (progVal === 'N/A' && branchVal === 'N/A') {
            courseBranch = `<span style="color:#94a3b8; font-style:italic;">Form Pending</span>`;
        }
        const mobile = Sanitizer.sanitizeString(getStudentDataField(s, 'mobile'));
        
        // Facility Badges
        const isHostel = (s.facilities?.hostelRequired || s.reporting?.hostelRequired || s.hostelRequired) === 'Yes' || s.facilities?.hostelRequired === true;
        const isTransport = (s.facilities?.transportRequired || s.reporting?.transportRequired || s.transportRequired) === 'Yes' || s.facilities?.transportRequired === true;
        let facBadge = `<span class="badge-facility">Day Scholar</span>`;
        if (isHostel && isTransport) facBadge = `<span class="badge-facility hostel">Hostel</span> <span class="badge-facility transport">Transport</span>`;
        else if (isHostel) facBadge = `<span class="badge-facility hostel">Hostel</span>`;
        else if (isTransport) facBadge = `<span class="badge-facility transport">Transport</span>`;

        const regNo = Sanitizer.sanitizeString(getStudentDataField(s, 'registrationNumber')) || '<em style="color:#9CA3AF">Pending</em>';
        
        // Status Badge
        const status = getStudentDataField(s, 'status');
        let statusBadge = `<span class="badge badge-progress">In Progress</span>`;
        if (status === 'COMPLETED') statusBadge = `<span class="badge badge-completed">Completed</span>`;
        else if (status === 'SUBMITTED') statusBadge = `<span class="badge badge-submitted">Submitted</span>`;
        else if (status === 'VERIFIED') statusBadge = `<span class="badge badge-verified">Verified</span>`;
        else if (status === 'REVERTED') statusBadge = `<span class="badge" style="background:#fef3c7; color:#d97706; border:1px solid #f59e0b; font-weight:700;">✕ REVERTED</span>`;
        else if (status === 'Draft') statusBadge = `<span class="badge badge-draft">Draft</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Photo">${photoImg}</td>
            <td data-label="Student">
                <strong>${studentName}</strong><br>
                <span style="font-size:0.75rem; color:#64748b;">ID: ${studentId}</span>
            </td>
            <td data-label="Course / Branch">${courseBranch}</td>
            <td data-label="Mobile">${mobile}</td>
            <td data-label="Facility">${facBadge}</td>
            <td data-label="Registration No.">${regNo}</td>
            <td data-label="Status">${statusBadge}</td>
            <td data-label="Action" style="text-align: right; display:flex; gap:6px; justify-content:flex-end; align-items:center;">
                <button class="btn-manage" onclick="window.openStudentProfile('${studentId}')">Manage</button>
                ${currentUserIsSuperAdmin ? `<button class="btn" style="padding:4px 8px; font-size:0.75rem; background:#dc2626; color:white; border:none; border-radius:4px; font-weight:600; cursor:pointer;" onclick="window.deleteStudentUser('${studentId}', '${studentName.replace(/'/g, "\\'")}')">🗑️ Delete</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    }
}

function exportToCSV() {
    if (!filteredStudentsList || filteredStudentsList.length === 0) {
        alert('No student data available to export.');
        return;
    }

    const headers = [
        'Student ID',
        'Full Name',
        'Program / Course',
        'Branch',
        'Admission Type',
        'Admission Reference',
        'Referrer Name',
        'Mobile',
        'Email',
        'Father Name',
        'Mother Name',
        'Aadhaar',
        'Gender',
        'Caste / Category',
        'Hostel',
        'Transport',
        'Registration No',
        'Status'
    ];

    const rows = filteredStudentsList.map(s => {
        const admType = s.reporting?.admissionType || s.academic?.admissionType || s.admissionType || 'Regular';
        const admRef = s.reporting?.admissionReference || s.academic?.admissionReference || s.admissionReference || 'Direct';
        const referrer = s.reporting?.referrerName || s.academic?.referrerName || s.referrerName || '';
        const caste = getStudentDataField(s, 'category');

        return [
            s.id || s.uid || s.admin?.studentId || '',
            `"${getStudentDataField(s, 'studentName').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'program').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'branch').replace(/"/g, '""')}"`,
            `"${admType.replace(/"/g, '""')}"`,
            `"${admRef.replace(/"/g, '""')}"`,
            `"${referrer.replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'mobile').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'email').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'fatherName').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'motherName').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'aadhaar').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'gender').replace(/"/g, '""')}"`,
            `"${caste.replace(/"/g, '""')}"`,
            `"${(s.facilities?.hostelRequired || s.reporting?.hostelRequired || s.hostelRequired) === 'Yes' || s.facilities?.hostelRequired === true ? 'Yes' : 'No'}"`,
            `"${(s.facilities?.transportRequired || s.reporting?.transportRequired || s.transportRequired) === 'Yes' || s.facilities?.transportRequired === true ? 'Yes' : 'No'}"`,
            `"${getStudentDataField(s, 'registrationNumber').replace(/"/g, '""')}"`,
            `"${getStudentDataField(s, 'status').replace(/"/g, '""')}"`
        ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BEC_Student_Reporting_List_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.exportToCSV = exportToCSV;

function renderCurrentPage() {
    const totalPages = Math.ceil(filteredStudentsList.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * PAGE_SIZE;
    currentStudents = filteredStudentsList.slice(startIdx, startIdx + PAGE_SIZE);

    renderTable(currentStudents);
    updatePaginationUI(totalPages);
}

function updatePaginationUI(totalPages) {
    const info = document.getElementById('page-info');
    const prev = document.getElementById('prev-page-btn');
    const next = document.getElementById('next-page-btn');

    const totalCount = filteredStudentsList ? filteredStudentsList.length : 0;
    if (info) {
        if (PAGE_SIZE >= 999999) {
            info.textContent = `Showing All ${totalCount} Students`;
        } else {
            info.textContent = `Page ${currentPage} of ${totalPages} (${totalCount} Total)`;
        }
    }
    if (prev) prev.disabled = currentPage === 1 || PAGE_SIZE >= 999999;
    if (next) next.disabled = currentPage >= totalPages || PAGE_SIZE >= 999999;
}

const COURSE_BRANCH_MAP = {
    'B.Tech': [
        'Aeronautical Engineering',
        'Aircraft Maintenance Engineering',
        'Agriculture Engineering',
        'Food Engineering',
        'Civil Engineering',
        'Civil and Environmental Engineering',
        'Computer Science Engineering',
        'CSE (Data Science)',
        'Electrical Engineering',
        'Electrical and Computer Engineering',
        'Mechanical Engineering',
        'Mechanical Mechatronics Engineering'
    ],
    'Diploma': [
        'Aeronautical Engineering',
        'Aircraft Maintenance Engineering (AME)',
        'Civil Engineering',
        'Electrical Engineering',
        'Mechanical Engineering'
    ],
    'MBA': [
        'Marketing',
        'Finance',
        'Human Resource',
        'Agri-Business'
    ]
};

function updateBranchDropdownForCourse(selectedCourse) {
    const branchSelect = document.getElementById('filter-branch');
    if (!branchSelect) return;
    
    const currentBranch = branchSelect.value;
    let allowedBranches = [];
    
    if (selectedCourse && COURSE_BRANCH_MAP[selectedCourse]) {
        allowedBranches = COURSE_BRANCH_MAP[selectedCourse];
    } else {
        const bSet = new Set();
        allStudentsList.forEach(s => {
            const br = (s.academic?.branch || s.reporting?.branch || '').trim();
            if (br) bSet.add(br);
        });
        Object.values(COURSE_BRANCH_MAP).flat().forEach(b => bSet.add(b));
        allowedBranches = Array.from(bSet);
    }
    
    let html = '<option value="">All Branches</option>';
    allowedBranches.sort().forEach(b => {
        html += `<option value="${Sanitizer.sanitizeString(b)}"${b === currentBranch ? ' selected' : ''}>${Sanitizer.sanitizeString(b)}</option>`;
    });
    branchSelect.innerHTML = html;
}

function isCourseMatch(studentProgram, filterCourse) {
    if (!filterCourse) return true;
    if (!studentProgram) return false;
    const sp = studentProgram.toLowerCase().trim();
    const fc = filterCourse.toLowerCase().trim();
    return sp === fc || sp.includes(fc) || fc.includes(sp);
}

function isBranchMatch(studentBranch, filterBranch) {
    if (!filterBranch) return true;
    if (!studentBranch) return false;
    
    const sb = studentBranch.toLowerCase().trim();
    const fb = filterBranch.toLowerCase().trim();
    
    if (sb === fb) return true;
    if (sb.includes(fb) || fb.includes(sb)) return true;
    
    const abbrevMap = {
        'cse': ['computer science', 'cse', 'data science'],
        'ece': ['electronics', 'ece', 'telecommunication'],
        'eee': ['electrical', 'eee'],
        'me': ['mechanical', 'mechatronics', 'me'],
        'ce': ['civil', 'ce', 'environmental'],
        'ae': ['aeronautical', 'aircraft', 'ame']
    };
    
    for (const [key, keywords] of Object.entries(abbrevMap)) {
        if (fb === key || keywords.includes(fb)) {
            if (keywords.some(k => sb.includes(k))) return true;
        }
    }
    
    return false;
}

function filterStudents() {
    const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const courseVal = document.getElementById('filter-course')?.value || '';
    const admTypeVal = document.getElementById('filter-admission-type')?.value || '';
    const branchVal = document.getElementById('filter-branch')?.value || '';
    const casteVal = document.getElementById('filter-caste')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';
    const facilityVal = document.getElementById('filter-facility')?.value || '';

    filteredStudentsList = allStudentsList.filter(s => {
        const name = getStudentDataField(s, 'studentName').toLowerCase();
        const sid = (s.id || s.uid || s.admin?.studentId || '').toLowerCase();
        const reg = getStudentDataField(s, 'registrationNumber').toLowerCase();
        const mob = getStudentDataField(s, 'mobile').toLowerCase();
        const aadhaar = getStudentDataField(s, 'aadhaar').toLowerCase();

        const matchesSearch = !searchVal || (name.includes(searchVal) || sid.includes(searchVal) || reg.includes(searchVal) || mob.includes(searchVal) || aadhaar.includes(searchVal));
        
        const prog = getStudentDataField(s, 'program');
        const matchesCourse = isCourseMatch(prog, courseVal);

        // Admission Type Filter (Regular vs LE vs combined options like BTech Regular / BTech LE)
        const studentAdmType = (s.reporting?.admissionType || s.academic?.admissionType || s.admissionType || 'Regular').trim();
        let matchesAdmType = true;
        if (admTypeVal === 'Regular') {
            matchesAdmType = studentAdmType.toLowerCase() === 'regular';
        } else if (admTypeVal === 'Lateral Entry') {
            matchesAdmType = studentAdmType.toLowerCase().includes('lateral') || studentAdmType.toLowerCase().includes('le');
        } else if (admTypeVal === 'BTech-Regular') {
            matchesAdmType = isCourseMatch(prog, 'B.Tech') && studentAdmType.toLowerCase() === 'regular';
        } else if (admTypeVal === 'BTech-LE') {
            matchesAdmType = isCourseMatch(prog, 'B.Tech') && (studentAdmType.toLowerCase().includes('lateral') || studentAdmType.toLowerCase().includes('le'));
        } else if (admTypeVal === 'Diploma-Regular') {
            matchesAdmType = isCourseMatch(prog, 'Diploma') && studentAdmType.toLowerCase() === 'regular';
        } else if (admTypeVal === 'Diploma-LE') {
            matchesAdmType = isCourseMatch(prog, 'Diploma') && (studentAdmType.toLowerCase().includes('lateral') || studentAdmType.toLowerCase().includes('le'));
        } else if (admTypeVal === 'MBA') {
            matchesAdmType = isCourseMatch(prog, 'MBA');
        }

        const br = getStudentDataField(s, 'branch');
        const matchesBranch = isBranchMatch(br, branchVal);

        // Caste / Category Filter
        const studentCaste = (getStudentDataField(s, 'category') || '').trim();
        let matchesCaste = true;
        if (casteVal) {
            matchesCaste = studentCaste.toLowerCase() === casteVal.toLowerCase() || studentCaste.toLowerCase().includes(casteVal.toLowerCase());
        }

        const st = getStudentDataField(s, 'status');
        const matchesStatus = !statusVal || st === statusVal;

        const isH = (s.facilities?.hostelRequired || s.reporting?.hostelRequired) === 'Yes' || s.facilities?.hostelRequired === true;
        const isT = (s.facilities?.transportRequired || s.reporting?.transportRequired) === 'Yes' || s.facilities?.transportRequired === true;
        
        let matchesFacility = true;
        if (facilityVal === 'Hostel') matchesFacility = isH && !isT;
        else if (facilityVal === 'Transport') matchesFacility = isT && !isH;
        else if (facilityVal === 'Both') matchesFacility = isH && isT;
        else if (facilityVal === 'None') matchesFacility = !isH && !isT;

        return matchesSearch && matchesCourse && matchesAdmType && matchesBranch && matchesCaste && matchesStatus && matchesFacility;
    });

    currentPage = 1;
    renderCurrentPage();
}

function setupListeners() {
    // Search input with debounce
    document.getElementById('search-input')?.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(filterStudents, 300);
    });

    // Course filter change updates available branches dynamically
    const filterCourseEl = document.getElementById('filter-course');
    if (filterCourseEl) {
        const handleCourseChange = (e) => {
            updateBranchDropdownForCourse(e.target.value);
            filterStudents();
        };
        filterCourseEl.addEventListener('change', handleCourseChange);
        filterCourseEl.addEventListener('input', handleCourseChange);
    }

    // Filters
    ['filter-admission-type', 'filter-branch', 'filter-caste', 'filter-status', 'filter-facility'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', filterStudents);
            el.addEventListener('input', filterStudents);
        }
    });

    // Clear filters
    document.getElementById('clear-filter-btn')?.addEventListener('click', () => {
        if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
        if (document.getElementById('filter-course')) document.getElementById('filter-course').value = '';
        if (document.getElementById('filter-admission-type')) document.getElementById('filter-admission-type').value = '';
        if (document.getElementById('filter-branch')) document.getElementById('filter-branch').value = '';
        if (document.getElementById('filter-caste')) document.getElementById('filter-caste').value = '';
        if (document.getElementById('filter-status')) document.getElementById('filter-status').value = '';
        if (document.getElementById('filter-facility')) document.getElementById('filter-facility').value = '';
        updateBranchDropdownForCourse('');
        filterStudents();
    });

    // Excel Export
    document.getElementById('export-excel-btn')?.addEventListener('click', exportToExcel);

    // Profile Panel Tabs
    document.querySelectorAll('.profile-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.profile-tab-pane').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                renderActiveTabContent(targetId);
            }
        });
    });

    // Panel Close
    document.getElementById('sp-close-btn')?.addEventListener('click', () => {
        document.getElementById('profile-panel-overlay')?.classList.remove('active');
    });

    // Pagination & Page Size
    const pageSizeEl = document.getElementById('page-size-select');
    if (pageSizeEl) {
        const handlePageSizeChange = (e) => {
            const val = e.target.value;
            PAGE_SIZE = val === 'all' ? 999999 : parseInt(val, 10);
            currentPage = 1;
            renderCurrentPage();
        };
        pageSizeEl.addEventListener('change', handlePageSizeChange);
        pageSizeEl.addEventListener('input', handlePageSizeChange);
    }
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderCurrentPage();
        }
    });
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredStudentsList.length / PAGE_SIZE) || 1;
        if (currentPage < totalPages) {
            currentPage++;
            renderCurrentPage();
        }
    });

    // Rejection Modal controls
    document.getElementById('btn-cancel-rejection')?.addEventListener('click', () => {
        document.getElementById('rejection-modal-overlay')?.classList.remove('active');
    });
    document.getElementById('btn-confirm-rejection')?.addEventListener('click', confirmDocumentRejection);
}

// FULL-WIDTH STUDENT PROFILE CONTROLLER
window.openStudentProfile = (identifier) => {
    let student = null;
    let idx = -1;

    if (typeof identifier === 'number') {
        idx = identifier;
        student = currentStudents[identifier] || filteredStudentsList[identifier] || allStudentsList[identifier];
    } else if (typeof identifier === 'string') {
        const num = parseInt(identifier, 10);
        if (!isNaN(num) && num >= 0 && currentStudents[num]) {
            idx = num;
            student = currentStudents[num];
        } else {
            student = allStudentsList.find(s => (s.id || s.uid || s.admin?.studentId) === identifier) ||
                      filteredStudentsList.find(s => (s.id || s.uid || s.admin?.studentId) === identifier) ||
                      currentStudents.find(s => (s.id || s.uid || s.admin?.studentId) === identifier);
            if (student) idx = currentStudents.indexOf(student);
        }
    }

    if (!student) {
        console.error("Student record not found for identifier:", identifier);
        alert("Unable to open profile: Selected student record could not be located.");
        return;
    }

    selectedStudentIndex = idx;
    selectedStudent = student;

    const sName = getStudentDataField(selectedStudent, 'studentName');
    const sProg = getStudentDataField(selectedStudent, 'program');
    const sBranch = getStudentDataField(selectedStudent, 'branch');
    const sReg = getStudentDataField(selectedStudent, 'registrationNumber');
    const sStatus = getStudentDataField(selectedStudent, 'status');
    const docs = selectedStudent.documents || {};

    // Header Banner
    const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23cbd5e1"/><circle cx="50" cy="38" r="20" fill="%2364748b"/><path d="M 20 82 A 32 30 0 0 1 80 82 Z" fill="%2364748b"/></svg>';
    const photoEl = document.getElementById('sp-banner-photo');
    if (photoEl) photoEl.src = docs.studentPhoto?.url || DEFAULT_AVATAR;

    const nameEl = document.getElementById('sp-banner-name');
    if (nameEl) nameEl.textContent = sName;

    const subEl = document.getElementById('sp-banner-sub');
    if (subEl) subEl.textContent = `${sProg} • ${sBranch} | Reg No: ${sReg}`;

    const statusEl = document.getElementById('sp-banner-status');
    if (statusEl) {
        statusEl.textContent = sStatus;
        statusEl.className = `badge ${sStatus === 'COMPLETED' ? 'badge-completed' : 'badge-progress'}`;
    }

    // Default to Overview tab
    document.querySelectorAll('.profile-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.profile-tab-pane').forEach(p => p.classList.remove('active'));
    
    const activeTabBtn = document.querySelector('.profile-nav-btn[data-tab="tab-overview"]');
    if (activeTabBtn) activeTabBtn.classList.add('active');
    
    const overviewPane = document.getElementById('tab-overview');
    if (overviewPane) overviewPane.classList.add('active');

    renderActiveTabContent('tab-overview');

    const overlay = document.getElementById('profile-panel-overlay');
    if (overlay) {
        overlay.classList.add('active');
    }
};

function renderActiveTabContent(tabId) {
    if (!selectedStudent) return;

    switch(tabId) {
        case 'tab-overview': renderOverviewTab(false); break;
        case 'tab-personal': renderPersonalTab(false); break;
        case 'tab-academic': renderAcademicTab(false); break;
        case 'tab-contact': renderContactTab(false); break;
        case 'tab-fees': renderFeesTab(); break;
        case 'tab-documents': renderDocumentsTab(); break;
        case 'tab-facilities': renderFacilitiesTab(); break;
        case 'tab-antiragging': renderAntiRaggingTab(); break;
        case 'tab-registration': renderRegistrationTab(); break;
        case 'tab-generated-forms': renderGeneratedFormsTab(); break;
        case 'tab-idcard': renderIdCardTab(); break;
        case 'tab-audit-log': renderAuditTab(); break;
    }
}

/* TAB 1: OVERVIEW */
function renderOverviewTab(isEditMode = false) {
    const s = selectedStudent;
    if (!s) return;

    const adm = s.admin || {};
    const sName = getStudentDataField(s, 'studentName');
    const sProg = getStudentDataField(s, 'program');
    const sBranch = getStudentDataField(s, 'branch');
    const sReg = getStudentDataField(s, 'registrationNumber');
    const sMob = getStudentDataField(s, 'mobile');
    const sEmail = getStudentDataField(s, 'email');
    const sStatus = getStudentDataField(s, 'status');
    const repDate = s.reporting?.reportingDate || s.reportingDate || 'N/A';
    const revertReason = s.admin?.revertReason || '';
    const docs = s.documents || {};
    const hostelReq = s.facilities?.hostelRequired || s.reporting?.hostelRequired || 'No';
    const transportReq = s.facilities?.transportRequired || s.reporting?.transportRequired || 'No';

    const toggleBtn = document.getElementById('btn-toggle-edit-overview');
    if (toggleBtn) {
        toggleBtn.textContent = isEditMode ? '✕ Cancel Edit' : '✏️ Edit / Add Details';
        toggleBtn.className = isEditMode ? 'btn btn-secondary' : 'btn btn-primary';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.8rem';
    }

    const primaryDocKeys = [
        ['studentPhoto', 'photo'],
        ['studentSignature', 'signature'],
        ['parentSignature'],
        ['certificate10th', 'tenthCert', 'tenthMarksheet'],
        ['certificate12th', 'twelfthCert', 'twelfthMarksheet'],
        ['tcMigration', 'tcClc'],
        ['aadhaarCard', 'aadhaarDoc']
    ];
    let verifiedCount = 0;
    primaryDocKeys.forEach(keys => {
        const isVerified = keys.some(k => docs[k]?.status === 'Verified');
        if (isVerified) verifiedCount++;
    });

    const content = document.getElementById('overview-pane-content');
    if (!content) return;

    if (!isEditMode) {
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Student Full Name</label><span>${sName}</span></div>
                <div class="detail-item"><label>Program & Branch</label><span>${sProg} - ${sBranch}</span></div>
                <div class="detail-item"><label>Registration Number</label><span>${sReg}</span></div>
                <div class="detail-item"><label>Student Mobile</label><span>${sMob}</span></div>
                <div class="detail-item"><label>Student Email</label><span>${sEmail}</span></div>
                <div class="detail-item"><label>Reporting Date</label><span>${repDate}</span></div>
                <div class="detail-item"><label>Facility Required</label><span>Hostel: ${hostelReq} | Transport: ${transportReq}</span></div>
                <div class="detail-item"><label>Document Verification Progress</label><span style="font-weight:bold; color:var(--primary-blue);">${verifiedCount} / ${primaryDocKeys.length} Verified</span></div>
            </div>

            <!-- APPLICATION REVERT CONTROL BOX -->
            <div style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0; margin-top:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                    <label style="font-size:0.78rem; font-weight:600; color:#64748b; text-transform:uppercase; display:block; margin-bottom:4px;">Application Status</label>
                    <span style="font-size:1.05rem; font-weight:bold; color:${adm.status === 'COMPLETED' ? '#16a34a' : (adm.status === 'REVERTED' ? '#d97706' : '#2563eb')};">${adm.status || 'IN_PROGRESS'}</span>
                    ${adm.revertReason ? `<div style="font-size:0.85rem; color:#b45309; margin-top:4px;"><strong>Revert Reason:</strong> ${Sanitizer.sanitizeString(adm.revertReason)}</div>` : ''}
                </div>
                <div>
                    <button class="btn" style="padding:8px 16px; font-size:0.85rem; background:#e11d48; color:white; border:none; border-radius:6px; font-weight:600; cursor:pointer;" onclick="window.revertStudentApplication()">↩️ Revert Application for Correction</button>
                </div>
            </div>
        `;
    } else {
        const programOptions = ['B.Tech', 'Diploma', 'MBA', 'M.Tech', 'MCA', 'BBA', 'BCA'];
        const allBranches = [
            'Aeronautical Engineering',
            'Aircraft Maintenance Engineering',
            'Agriculture Engineering',
            'Civil Engineering',
            'Civil and Environmental Engineering',
            'Computer Science Engineering',
            'CSE (Data Science)',
            'Electrical Engineering',
            'Electrical and Computer Engineering',
            'Food Engineering',
            'Mechanical Engineering',
            'Mechanical Mechatronics Engineering',
            'Marketing',
            'Finance',
            'Human Resource',
            'Agri-Business'
        ];

        content.innerHTML = `
            <form id="form-edit-overview" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Student Full Name *</label>
                        <input type="text" id="edit-ov-name" class="form-control" value="${sName !== 'N/A' ? sName : ''}" required placeholder="Full Name">
                    </div>
                    <div class="detail-item">
                        <label>Program / Course *</label>
                        <select id="edit-ov-prog" class="form-control" required>
                            ${programOptions.map(p => `<option value="${p}" ${sProg === p ? 'selected' : ''}>${p}</option>`).join('')}
                            ${!programOptions.includes(sProg) && sProg !== 'N/A' ? `<option value="${sProg}" selected>${sProg}</option>` : ''}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Branch / Department *</label>
                        <select id="edit-ov-branch" class="form-control" required>
                            ${allBranches.map(b => `<option value="${b}" ${sBranch === b ? 'selected' : ''}>${b}</option>`).join('')}
                            ${!allBranches.includes(sBranch) && sBranch !== 'N/A' ? `<option value="${sBranch}" selected>${sBranch}</option>` : ''}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Registration Number</label>
                        <input type="text" id="edit-ov-reg" class="form-control" value="${sReg !== 'N/A' ? sReg : ''}" placeholder="Registration No">
                    </div>
                    <div class="detail-item">
                        <label>Student Mobile (10 Digits)</label>
                        <input type="text" id="edit-ov-mob" class="form-control" maxlength="10" value="${sMob !== 'N/A' ? sMob : ''}" placeholder="Mobile number">
                    </div>
                    <div class="detail-item">
                        <label>Student Email</label>
                        <input type="email" id="edit-ov-email" class="form-control" value="${sEmail !== 'N/A' ? sEmail : ''}" placeholder="Email address">
                    </div>
                    <div class="detail-item">
                        <label>Reporting Date</label>
                        <input type="date" id="edit-ov-repdate" class="form-control" value="${repDate !== 'N/A' ? repDate : ''}">
                    </div>
                    <div class="detail-item">
                        <label>Hostel Required?</label>
                        <select id="edit-ov-hostel" class="form-control">
                            <option value="No" ${hostelReq === 'No' ? 'selected' : ''}>No</option>
                            <option value="Yes" ${hostelReq === 'Yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Transport Required?</label>
                        <select id="edit-ov-transport" class="form-control">
                            <option value="No" ${transportReq === 'No' ? 'selected' : ''}>No</option>
                            <option value="Yes" ${transportReq === 'Yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                </div>
                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary" style="padding: 7px 20px;">💾 Save Overview Changes</button>
                    <button type="button" class="btn btn-secondary" style="padding: 7px 16px;" id="btn-cancel-edit-overview">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('btn-cancel-edit-overview')?.addEventListener('click', () => renderOverviewTab(false));

        document.getElementById('form-edit-overview')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
            
            const nameVal = document.getElementById('edit-ov-name').value.trim();
            const progVal = document.getElementById('edit-ov-prog').value;
            const branchVal = document.getElementById('edit-ov-branch').value;
            const regVal = document.getElementById('edit-ov-reg').value.trim();
            const mobVal = document.getElementById('edit-ov-mob').value.trim();
            const emailVal = document.getElementById('edit-ov-email').value.trim();
            const repDateVal = document.getElementById('edit-ov-repdate').value;
            const hostelVal = document.getElementById('edit-ov-hostel').value;
            const transportVal = document.getElementById('edit-ov-transport').value;

            const updates = {
                'personal.studentFullName': nameVal,
                'personal.fullName': nameVal,
                'academic.program': progVal,
                'reporting.program': progVal,
                'academic.branch': branchVal,
                'reporting.branch': branchVal,
                'academic.registrationNumber': regVal,
                'reporting.registrationNumber': regVal,
                'contact.mobile': mobVal,
                'personal.mobile': mobVal,
                'contact.email': emailVal,
                'personal.email': emailVal,
                'reporting.reportingDate': repDateVal,
                'facilities.hostelRequired': hostelVal,
                'reporting.hostelRequired': hostelVal,
                'facilities.transportRequired': transportVal,
                'reporting.transportRequired': transportVal
            };

            try {
                for (const [k, v] of Object.entries(updates)) {
                    await FirestoreService.updateStudentField(sId, k, v);
                }

                if (!selectedStudent.personal) selectedStudent.personal = {};
                if (!selectedStudent.academic) selectedStudent.academic = {};
                if (!selectedStudent.contact) selectedStudent.contact = {};
                if (!selectedStudent.reporting) selectedStudent.reporting = {};
                if (!selectedStudent.facilities) selectedStudent.facilities = {};

                selectedStudent.personal.studentFullName = nameVal;
                selectedStudent.personal.fullName = nameVal;
                selectedStudent.personal.mobile = mobVal;
                selectedStudent.personal.email = emailVal;

                selectedStudent.academic.program = progVal;
                selectedStudent.reporting.program = progVal;

                selectedStudent.academic.branch = branchVal;
                selectedStudent.reporting.branch = branchVal;

                selectedStudent.academic.registrationNumber = regVal;
                selectedStudent.reporting.registrationNumber = regVal;

                selectedStudent.contact.mobile = mobVal;
                selectedStudent.contact.email = emailVal;

                selectedStudent.reporting.reportingDate = repDateVal;

                selectedStudent.facilities.hostelRequired = hostelVal;
                selectedStudent.reporting.hostelRequired = hostelVal;

                selectedStudent.facilities.transportRequired = transportVal;
                selectedStudent.reporting.transportRequired = transportVal;

                if (AuditService) {
                    await AuditService.log('ADMIN_EDIT_OVERVIEW', { studentId: sId, updates });
                }

                const bannerName = document.getElementById('sp-banner-name');
                if (bannerName) bannerName.textContent = nameVal;

                const bannerSub = document.getElementById('sp-banner-sub');
                if (bannerSub) bannerSub.textContent = `${progVal} • ${branchVal} | Reg No: ${regVal || 'N/A'}`;

                alert('✅ Overview details updated successfully!');
                renderOverviewTab(false);
                renderCurrentPage();
            } catch (err) {
                console.error("Overview update error:", err);
                alert('❌ Update failed: ' + err.message);
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.onclick = () => renderOverviewTab(!isEditMode);
    }
}

window.revertStudentApplication = async () => {
    if (!selectedStudent) return;
    
    const studentId = selectedStudent.id || selectedStudent.admin?.uid || selectedStudent.uid;
    if (!studentId) {
        alert("❌ Error: Could not locate student identifier.");
        return;
    }

    const reason = prompt(
        "Please enter the reason for reverting this application back to the student for correction:",
        "Please update incorrect information / re-upload clear document images as instructed by College Admin."
    );

    if (reason === null) return; // User cancelled prompt
    
    const revertReason = reason.trim() || "Information or documents require correction.";

    if (confirm(`Are you sure you want to REVERT this application for correction?\n\nStudent: ${selectedStudent.personal?.studentFullName || 'Student'}\nReason: ${revertReason}\n\nNote: The student's filled data will NOT be deleted. The student will be granted access to edit their form and re-upload documents.`)) {
        try {
            if (!selectedStudent.admin) selectedStudent.admin = {};
            selectedStudent.admin.status = 'REVERTED';
            selectedStudent.admin.revertReason = revertReason;
            if (!selectedStudent.submission) selectedStudent.submission = {};
            selectedStudent.submission.isSubmitted = false;

            // Update in Firestore
            await FirestoreService.saveStudent(studentId, selectedStudent);
            
            // Log audit if available
            if (window.AuditService) {
                await AuditService.log('ADMIN_REVERT_APPLICATION', { studentId, revertReason });
            }

            alert("✅ Application has been successfully REVERTED for student correction!");
            
            // Update UI status badge in banner
            const statusEl = document.getElementById('sp-banner-status');
            if (statusEl) {
                statusEl.textContent = 'REVERTED';
                statusEl.className = 'badge badge-progress';
                statusEl.style.background = '#f59e0b';
                statusEl.style.color = '#ffffff';
            }

            renderOverviewTab();
            renderCurrentPage();
        } catch (error) {
            console.error("Error reverting application:", error);
            alert("❌ Failed to revert application: " + error.message);
        }
    }
};

/* TAB 2: PERSONAL */
function renderPersonalTab(isEditMode) {
    const p = selectedStudent.personal || selectedStudent.personalInfo || {};
    const content = document.getElementById('personal-pane-content');
    if (!content) return;

    // Masked Aadhaar by default
    const rawAadhaar = p.aadhaarNumber || '';
    const maskedAadhaar = rawAadhaar.length >= 12 ? `XXXX XXXX ${rawAadhaar.slice(-4)}` : (rawAadhaar || 'N/A');
    const bloodGroupVal = p.bloodGroup || selectedStudent.antiragging?.bloodGroup || p.bg || 'N/A';
    const casteVal = p.category || p.caste || 'N/A';
    const isScSt = (casteVal === 'SC' || casteVal === 'ST');
    const otrVal = p.otrNumber || 'N/A';

    const toggleBtn = document.getElementById('btn-toggle-edit-personal');
    if (toggleBtn) {
        toggleBtn.textContent = isEditMode ? '✕ Cancel Edit' : '✏️ Edit / Add Details';
        toggleBtn.className = isEditMode ? 'btn btn-secondary' : 'btn btn-primary';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.8rem';
    }

    if (!isEditMode) {
        const hasCm = p.hasCmKisan || 'No';
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Student Full Name</label><span>${p.studentFullName || p.fullName || 'N/A'}</span></div>
                <div class="detail-item"><label>Father's Name</label><span>${p.fatherName || 'N/A'}</span></div>
                <div class="detail-item"><label>Mother's Name</label><span>${p.motherName || 'N/A'}</span></div>
                <div class="detail-item"><label>Date of Birth</label><span>${p.dob || 'N/A'}</span></div>
                <div class="detail-item"><label>Gender</label><span>${p.gender || 'N/A'}</span></div>
                <div class="detail-item"><label>Blood Group</label><span>${bloodGroupVal}</span></div>
                <div class="detail-item"><label>Caste / Category</label><span>${casteVal}</span></div>
                ${(isScSt || p.otrNumber) ? `<div class="detail-item"><label>OTR Number (NSP)</label><span>${otrVal}</span></div>` : ''}
                <div class="detail-item"><label>Aadhaar Number</label><span>${maskedAadhaar}</span></div>
                <div class="detail-item"><label>ABC ID Number</label><span>${p.abcId || 'N/A'}</span></div>
                <div class="detail-item"><label>PAN Card Number</label><span>${p.panNumber || 'N/A'}</span></div>
                ${!isScSt ? `
                    <div class="detail-item"><label>Ration Card No</label><span>${p.rationCardNo || 'N/A'}</span></div>
                    <div class="detail-item"><label>CM Kisan Beneficiary?</label><span>${hasCm}</span></div>
                    ${hasCm === 'Yes' ? `
                        <div class="detail-item"><label>CM Kisan Beneficiary ID</label><span>${p.cmKisanBeneficiaryId || 'N/A'}</span></div>
                        <div class="detail-item"><label>Beneficiary Name</label><span>${p.cmKisanBeneficiaryName || 'N/A'}</span></div>
                        <div class="detail-item"><label>Beneficiary Aadhaar No</label><span>${p.cmKisanBeneficiaryAadhaar || 'N/A'}</span></div>
                    ` : ''}
                ` : ''}
            </div>
        `;
    } else {
        const bgOptions = ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
        const genderOptions = ['', 'Male', 'Female', 'Other'];
        const catOptions = ['', 'General', 'OBC', 'SC', 'ST', 'SEBC', 'EWS', 'TFW'];

        content.innerHTML = `
            <form id="form-edit-personal" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Student Full Name *</label>
                        <input type="text" id="edit-p-name" class="form-control" value="${p.studentFullName || p.fullName || ''}" required>
                    </div>
                    <div class="detail-item">
                        <label>Father's Name</label>
                        <input type="text" id="edit-p-father" class="form-control" value="${p.fatherName || ''}">
                    </div>
                    <div class="detail-item">
                        <label>Mother's Name</label>
                        <input type="text" id="edit-p-mother" class="form-control" value="${p.motherName || ''}">
                    </div>
                    <div class="detail-item">
                        <label>Date of Birth</label>
                        <input type="date" id="edit-p-dob" class="form-control" value="${p.dob || ''}">
                    </div>
                    <div class="detail-item">
                        <label>Gender</label>
                        <select id="edit-p-gender" class="form-control">
                            ${genderOptions.map(g => `<option value="${g}" ${(p.gender || '') === g ? 'selected' : ''}>${g || 'Select Gender'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Blood Group</label>
                        <select id="edit-p-bg" class="form-control">
                            ${bgOptions.map(b => `<option value="${b}" ${(p.bloodGroup || p.bg || '') === b ? 'selected' : ''}>${b || 'Select Blood Group'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Caste / Category</label>
                        <select id="edit-p-category" class="form-control">
                            ${catOptions.map(c => `<option value="${c}" ${(p.category || p.caste || '') === c ? 'selected' : ''}>${c || 'Select Category / Caste'}</option>`).join('')}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>OTR Number (NSP)</label>
                        <input type="text" id="edit-p-otr" class="form-control" value="${p.otrNumber || ''}" placeholder="OTR Number from NSP">
                    </div>
                    <div class="detail-item">
                        <label>Aadhaar Number (12 Digits)</label>
                        <input type="text" id="edit-p-aadhaar" class="form-control" maxlength="12" value="${p.aadhaarNumber || ''}" placeholder="12-digit Aadhaar number">
                    </div>
                    <div class="detail-item">
                        <label>ABC ID Number</label>
                        <input type="text" id="edit-p-abc" class="form-control" value="${p.abcId || ''}" placeholder="e.g. 123-456-789-012">
                    </div>
                    <div class="detail-item">
                        <label>PAN Card Number</label>
                        <input type="text" id="edit-p-pan" class="form-control" value="${p.panNumber || ''}" placeholder="e.g. ABCDE1234F">
                    </div>
                    <div class="detail-item">
                        <label>Ration Card Number</label>
                        <input type="text" id="edit-p-ration" class="form-control" value="${p.rationCardNo || ''}" placeholder="Ration Card No.">
                    </div>
                    <div class="detail-item">
                        <label>CM Kisan Beneficiary?</label>
                        <select id="edit-p-cmkisan" class="form-control" onchange="document.getElementById('edit-cm-kisan-container').style.display = this.value === 'Yes' ? 'grid' : 'none';">
                            <option value="No" ${(p.hasCmKisan || 'No') === 'No' ? 'selected' : ''}>No</option>
                            <option value="Yes" ${(p.hasCmKisan || '') === 'Yes' ? 'selected' : ''}>Yes</option>
                        </select>
                    </div>
                </div>
                <div id="edit-cm-kisan-container" class="detail-grid" style="margin-top: 10px; padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; display: ${(p.hasCmKisan || 'No') === 'Yes' ? 'grid' : 'none'};">
                    <div class="detail-item">
                        <label>CM Kisan Beneficiary ID</label>
                        <input type="text" id="edit-p-cm-id" class="form-control" value="${p.cmKisanBeneficiaryId || ''}" placeholder="Beneficiary ID">
                    </div>
                    <div class="detail-item">
                        <label>Beneficiary Full Name</label>
                        <input type="text" id="edit-p-cm-name" class="form-control" value="${p.cmKisanBeneficiaryName || ''}" placeholder="Beneficiary Name">
                    </div>
                    <div class="detail-item">
                        <label>Beneficiary Aadhaar No (12 Digits)</label>
                        <input type="text" id="edit-p-cm-aadhaar" class="form-control" maxlength="12" value="${p.cmKisanBeneficiaryAadhaar || ''}" placeholder="12-digit Aadhaar">
                    </div>
                </div>
                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary" style="padding: 7px 20px;">💾 Save Personal Changes</button>
                    <button type="button" class="btn btn-secondary" style="padding: 7px 16px;" id="btn-cancel-edit-personal">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('btn-cancel-edit-personal')?.addEventListener('click', () => renderPersonalTab(false));

        document.getElementById('form-edit-personal')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
            const categoryVal = document.getElementById('edit-p-category').value.trim();
            const hasCmKisanVal = document.getElementById('edit-p-cmkisan').value;
            const updates = {
                'personal.studentFullName': document.getElementById('edit-p-name').value.trim(),
                'personal.fatherName': document.getElementById('edit-p-father').value.trim(),
                'personal.motherName': document.getElementById('edit-p-mother').value.trim(),
                'personal.dob': document.getElementById('edit-p-dob').value,
                'personal.gender': document.getElementById('edit-p-gender').value,
                'personal.bloodGroup': document.getElementById('edit-p-bg').value,
                'personal.category': categoryVal,
                'personal.caste': categoryVal,
                'personal.otrNumber': document.getElementById('edit-p-otr')?.value.trim() || '',
                'personal.aadhaarNumber': document.getElementById('edit-p-aadhaar').value.trim(),
                'personal.abcId': document.getElementById('edit-p-abc').value.trim(),
                'personal.panNumber': document.getElementById('edit-p-pan').value.trim(),
                'personal.rationCardNo': document.getElementById('edit-p-ration').value.trim(),
                'personal.hasCmKisan': hasCmKisanVal,
                'personal.cmKisanBeneficiaryId': hasCmKisanVal === 'Yes' ? (document.getElementById('edit-p-cm-id')?.value.trim() || '') : '',
                'personal.cmKisanBeneficiaryName': hasCmKisanVal === 'Yes' ? (document.getElementById('edit-p-cm-name')?.value.trim() || '') : '',
                'personal.cmKisanBeneficiaryAadhaar': hasCmKisanVal === 'Yes' ? (document.getElementById('edit-p-cm-aadhaar')?.value.trim() || '') : ''
            };

            try {
                for (const [k, v] of Object.entries(updates)) {
                    await FirestoreService.updateStudentField(sId, k, v);
                }

                if (!selectedStudent.personal) selectedStudent.personal = {};
                selectedStudent.personal.studentFullName = updates['personal.studentFullName'];
                selectedStudent.personal.fatherName = updates['personal.fatherName'];
                selectedStudent.personal.motherName = updates['personal.motherName'];
                selectedStudent.personal.dob = updates['personal.dob'];
                selectedStudent.personal.gender = updates['personal.gender'];
                selectedStudent.personal.bloodGroup = updates['personal.bloodGroup'];
                selectedStudent.personal.category = categoryVal;
                selectedStudent.personal.caste = categoryVal;
                selectedStudent.personal.otrNumber = updates['personal.otrNumber'];
                selectedStudent.personal.aadhaarNumber = updates['personal.aadhaarNumber'];
                selectedStudent.personal.abcId = updates['personal.abcId'];
                selectedStudent.personal.panNumber = updates['personal.panNumber'];
                selectedStudent.personal.rationCardNo = updates['personal.rationCardNo'];
                selectedStudent.personal.hasCmKisan = updates['personal.hasCmKisan'];
                selectedStudent.personal.cmKisanBeneficiaryId = updates['personal.cmKisanBeneficiaryId'];
                selectedStudent.personal.cmKisanBeneficiaryName = updates['personal.cmKisanBeneficiaryName'];
                selectedStudent.personal.cmKisanBeneficiaryAadhaar = updates['personal.cmKisanBeneficiaryAadhaar'];

                if (AuditService) {
                    await AuditService.log('ADMIN_EDIT_PERSONAL', { studentId: sId, updates });
                }

                const bannerName = document.getElementById('sp-banner-name');
                if (bannerName) bannerName.textContent = updates['personal.studentFullName'];

                alert('✅ Personal details updated successfully!');
                renderPersonalTab(false);
                renderCurrentPage();
            } catch(err) {
                console.error("Personal update error:", err);
                alert('❌ Update failed: ' + err.message);
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.onclick = () => renderPersonalTab(!isEditMode);
    }
}

/* TAB 3: ACADEMIC */
function renderAcademicTab(isEditMode) {
    const r = selectedStudent.reporting || selectedStudent.academic || {};
    const adm = selectedStudent.admin || {};
    const content = document.getElementById('academic-pane-content');
    if (!content) return;

    const toggleBtn = document.getElementById('btn-toggle-edit-academic');
    if (toggleBtn) {
        toggleBtn.textContent = isEditMode ? '✕ Cancel Edit' : '✏️ Edit / Add Details';
        toggleBtn.className = isEditMode ? 'btn btn-secondary' : 'btn btn-primary';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.8rem';
    }

    const sProgram = r.program || r.course || 'B.Tech';
    const sBranch = r.branch || r.department || 'N/A';
    const sAdmType = r.admissionType || 'Regular';
    const sAdmRef = r.admissionReference || 'Direct';
    const sReferrer = r.referrerName || '';
    const sSession = r.academicSession || '2026-2030';
    const sYear = r.academicYear || '1st Year';
    const sRepDate = r.reportingDate || 'N/A';
    const sRepTime = r.reportingTime || 'N/A';

    if (!isEditMode) {
        const refDisplay = sAdmRef === 'Referred by Person' 
            ? (sReferrer ? `Referred by: ${sReferrer}` : 'Referred by a Person')
            : 'Direct Admission';

        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Program / Course</label><span>${sProgram}</span></div>
                <div class="detail-item"><label>Branch / Department</label><span>${sBranch}</span></div>
                <div class="detail-item"><label>Admission Type</label><span>${sAdmType}</span></div>
                <div class="detail-item"><label>Admission Reference</label><span>${refDisplay}</span></div>
                <div class="detail-item"><label>Academic Session</label><span>${sSession}</span></div>
                <div class="detail-item"><label>Academic Year</label><span>${sYear}</span></div>
                <div class="detail-item"><label>Reporting Date</label><span>${sRepDate}</span></div>
                <div class="detail-item"><label>Reporting Time</label><span>${sRepTime}</span></div>
                <div class="detail-item"><label>Roll Number</label><span>${adm.rollNumber || 'PENDING'}</span></div>
                <div class="detail-item"><label>Enrollment Number</label><span>${adm.enrollmentNumber || 'PENDING'}</span></div>
                <div class="detail-item"><label>Section / Batch</label><span>${adm.section || 'PENDING'}</span></div>
            </div>
        `;
    } else {
        const allBranches = [
            'Aeronautical Engineering',
            'Aircraft Maintenance Engineering',
            'Agriculture Engineering',
            'Civil Engineering',
            'Civil and Environmental Engineering',
            'Computer Science Engineering',
            'CSE (Data Science)',
            'Electrical Engineering',
            'Electrical and Computer Engineering',
            'Food Engineering',
            'Mechanical Engineering',
            'Mechanical Mechatronics Engineering',
            'Marketing',
            'Finance',
            'Human Resource',
            'Agri-Business'
        ];

        content.innerHTML = `
            <form id="form-edit-academic" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Program / Course *</label>
                        <select id="edit-a-prog" class="form-control" required>
                            <option value="B.Tech" ${sProgram === 'B.Tech' ? 'selected' : ''}>B.Tech</option>
                            <option value="Diploma" ${sProgram === 'Diploma' ? 'selected' : ''}>Diploma</option>
                            <option value="MBA" ${sProgram === 'MBA' ? 'selected' : ''}>MBA</option>
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Branch / Department *</label>
                        <select id="edit-a-branch" class="form-control" required>
                            ${allBranches.map(b => `<option value="${b}" ${sBranch === b ? 'selected' : ''}>${b}</option>`).join('')}
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Admission Type</label>
                        <select id="edit-a-admtype" class="form-control">
                            <option value="Regular" ${sAdmType === 'Regular' ? 'selected' : ''}>Regular</option>
                            <option value="Lateral Entry" ${sAdmType === 'Lateral Entry' ? 'selected' : ''}>Lateral Entry (LE)</option>
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Admission Reference</label>
                        <select id="edit-a-admref" class="form-control">
                            <option value="Direct" ${sAdmRef === 'Direct' ? 'selected' : ''}>Direct</option>
                            <option value="Referred by Person" ${sAdmRef === 'Referred by Person' ? 'selected' : ''}>Referred by a Person</option>
                        </select>
                    </div>
                    <div class="detail-item" id="edit-a-refcontainer" style="${sAdmRef === 'Referred by Person' ? 'display:block;' : 'display:none;'}">
                        <label>Referrer Name</label>
                        <input type="text" id="edit-a-referrer" class="form-control" value="${sReferrer}" placeholder="Name of referring person">
                    </div>
                    <div class="detail-item">
                        <label>Academic Session</label>
                        <input type="text" id="edit-a-session" class="form-control" value="${sSession}" placeholder="e.g. 2026-2030">
                    </div>
                    <div class="detail-item">
                        <label>Academic Year</label>
                        <select id="edit-a-year" class="form-control">
                            <option value="1st Year" ${sYear === '1st Year' ? 'selected' : ''}>1st Year</option>
                            <option value="2nd Year" ${sYear === '2nd Year' ? 'selected' : ''}>2nd Year</option>
                            <option value="3rd Year" ${sYear === '3rd Year' ? 'selected' : ''}>3rd Year</option>
                            <option value="4th Year" ${sYear === '4th Year' ? 'selected' : ''}>4th Year</option>
                        </select>
                    </div>
                    <div class="detail-item">
                        <label>Reporting Date</label>
                        <input type="date" id="edit-a-repdate" class="form-control" value="${sRepDate !== 'N/A' ? sRepDate : ''}">
                    </div>
                    <div class="detail-item">
                        <label>Reporting Time</label>
                        <input type="time" id="edit-a-reptime" class="form-control" value="${sRepTime !== 'N/A' ? sRepTime : ''}">
                    </div>
                </div>
                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary" style="padding: 7px 20px;">💾 Save Academic Changes</button>
                    <button type="button" class="btn btn-secondary" style="padding: 7px 16px;" id="btn-cancel-edit-academic">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('edit-a-admref')?.addEventListener('change', (e) => {
            const container = document.getElementById('edit-a-refcontainer');
            if (container) {
                container.style.display = e.target.value === 'Referred by Person' ? 'block' : 'none';
            }
        });

        document.getElementById('btn-cancel-edit-academic')?.addEventListener('click', () => renderAcademicTab(false));

        document.getElementById('form-edit-academic')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
            const prog = document.getElementById('edit-a-prog').value;
            const branch = document.getElementById('edit-a-branch').value;
            const admType = document.getElementById('edit-a-admtype').value;
            const admRef = document.getElementById('edit-a-admref').value;
            const referrer = admRef === 'Referred by Person' ? (document.getElementById('edit-a-referrer')?.value.trim() || '') : '';
            const session = document.getElementById('edit-a-session').value.trim();
            const year = document.getElementById('edit-a-year').value;
            const repDate = document.getElementById('edit-a-repdate').value;
            const repTime = document.getElementById('edit-a-reptime').value;

            const updates = {
                'reporting.program': prog,
                'reporting.branch': branch,
                'reporting.admissionType': admType,
                'reporting.admissionReference': admRef,
                'reporting.referrerName': referrer,
                'reporting.academicSession': session,
                'reporting.academicYear': year,
                'reporting.reportingDate': repDate,
                'reporting.reportingTime': repTime,
                'academic.program': prog,
                'academic.branch': branch,
                'academic.admissionType': admType,
                'academic.admissionReference': admRef,
                'academic.referrerName': referrer,
                'academic.academicSession': session,
                'academic.academicYear': year
            };

            try {
                for (const [k, v] of Object.entries(updates)) {
                    await FirestoreService.updateStudentField(sId, k, v);
                }

                if (!selectedStudent.reporting) selectedStudent.reporting = {};
                if (!selectedStudent.academic) selectedStudent.academic = {};
                Object.assign(selectedStudent.reporting, {
                    program: prog,
                    branch: branch,
                    admissionType: admType,
                    admissionReference: admRef,
                    referrerName: referrer,
                    academicSession: session,
                    academicYear: year,
                    reportingDate: repDate,
                    reportingTime: repTime
                });
                Object.assign(selectedStudent.academic, {
                    program: prog,
                    branch: branch,
                    admissionType: admType,
                    admissionReference: admRef,
                    referrerName: referrer,
                    academicSession: session,
                    academicYear: year
                });

                if (AuditService) {
                    await AuditService.log('ADMIN_EDIT_ACADEMIC', { studentId: sId, updates });
                }

                const bannerSub = document.getElementById('sp-banner-sub');
                if (bannerSub) bannerSub.textContent = `${prog} • ${branch} | Reg No: ${getStudentDataField(selectedStudent, 'registrationNumber')}`;

                alert('✅ Academic details updated successfully!');
                renderAcademicTab(false);
                renderCurrentPage();
            } catch(err) {
                console.error("Academic update error:", err);
                alert('❌ Update failed: ' + err.message);
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.onclick = () => renderAcademicTab(!isEditMode);
    }
}

/* TAB 4: CONTACT */
function renderContactTab(isEditMode) {
    const p = selectedStudent.personal || selectedStudent.personalInfo || {};
    const content = document.getElementById('contact-pane-content');
    if (!content) return;

    const toggleBtn = document.getElementById('btn-toggle-edit-contact');
    if (toggleBtn) {
        toggleBtn.textContent = isEditMode ? '✕ Cancel Edit' : '✏️ Edit / Add Details';
        toggleBtn.className = isEditMode ? 'btn btn-secondary' : 'btn btn-primary';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.8rem';
    }

    if (!isEditMode) {
        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Student Mobile</label><span>${p.studentMobile || 'N/A'}</span></div>
                <div class="detail-item"><label>WhatsApp Number</label><span>${p.whatsappNumber || 'N/A'}</span></div>
                <div class="detail-item"><label>Student Email</label><span>${p.studentEmail || 'N/A'}</span></div>
                <div class="detail-item"><label>Father's Mobile</label><span>${p.fatherMobile || 'N/A'}</span></div>
                <div class="detail-item"><label>Mother's Mobile</label><span>${p.motherMobile || 'N/A'}</span></div>
                <div class="detail-item"><label>State</label><span>${p.state || 'N/A'}</span></div>
                <div class="detail-item"><label>District</label><span>${p.district || 'N/A'}</span></div>
                <div class="detail-item"><label>PIN Code</label><span>${p.pincode || p.pinCode || 'N/A'}</span></div>
                <div class="detail-item" style="grid-column: 1 / -1;"><label>Permanent Address</label><span>${p.permanentAddress || 'N/A'}</span></div>
            </div>
        `;
    } else {
        content.innerHTML = `
            <form id="form-edit-contact" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
                <div class="detail-grid">
                    <div class="detail-item"><label>Student Mobile</label><input type="tel" id="edit-c-mob" class="form-control" value="${p.studentMobile || ''}" placeholder="10-digit mobile number"></div>
                    <div class="detail-item"><label>WhatsApp Number</label><input type="tel" id="edit-c-wa" class="form-control" value="${p.whatsappNumber || ''}" placeholder="WhatsApp number"></div>
                    <div class="detail-item"><label>Student Email</label><input type="email" id="edit-c-email" class="form-control" value="${p.studentEmail || ''}" placeholder="Email address"></div>
                    <div class="detail-item"><label>Father's Mobile</label><input type="tel" id="edit-c-fmobile" class="form-control" value="${p.fatherMobile || ''}" placeholder="Father mobile number"></div>
                    <div class="detail-item"><label>Mother's Mobile</label><input type="tel" id="edit-c-mmobile" class="form-control" value="${p.motherMobile || ''}" placeholder="Mother mobile number"></div>
                    <div class="detail-item"><label>State</label><input type="text" id="edit-c-state" class="form-control" value="${p.state || 'Odisha'}"></div>
                    <div class="detail-item"><label>District</label><input type="text" id="edit-c-district" class="form-control" value="${p.district || ''}"></div>
                    <div class="detail-item"><label>PIN Code</label><input type="text" id="edit-c-pincode" class="form-control" value="${p.pincode || p.pinCode || ''}"></div>
                    <div class="detail-item" style="grid-column: 1 / -1;"><label>Permanent Address</label><textarea id="edit-c-addr" class="form-control" rows="2">${p.permanentAddress || ''}</textarea></div>
                </div>
                <div style="margin-top: 15px; display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary" style="padding: 7px 20px;">💾 Save Contact Changes</button>
                    <button type="button" class="btn btn-secondary" style="padding: 7px 16px;" id="btn-cancel-edit-contact">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('btn-cancel-edit-contact')?.addEventListener('click', () => renderContactTab(false));

        document.getElementById('form-edit-contact')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
            const updates = {
                'personal.studentMobile': document.getElementById('edit-c-mob').value.trim(),
                'personal.whatsappNumber': document.getElementById('edit-c-wa').value.trim(),
                'personal.studentEmail': document.getElementById('edit-c-email').value.trim(),
                'personal.fatherMobile': document.getElementById('edit-c-fmobile').value.trim(),
                'personal.motherMobile': document.getElementById('edit-c-mmobile').value.trim(),
                'personal.state': document.getElementById('edit-c-state').value.trim(),
                'personal.district': document.getElementById('edit-c-district').value.trim(),
                'personal.pincode': document.getElementById('edit-c-pincode').value.trim(),
                'personal.pinCode': document.getElementById('edit-c-pincode').value.trim(),
                'personal.permanentAddress': document.getElementById('edit-c-addr').value.trim()
            };

            try {
                for (const [k, v] of Object.entries(updates)) {
                    await FirestoreService.updateStudentField(sId, k, v);
                }

                if (!selectedStudent.personal) selectedStudent.personal = {};
                selectedStudent.personal.studentMobile = updates['personal.studentMobile'];
                selectedStudent.personal.whatsappNumber = updates['personal.whatsappNumber'];
                selectedStudent.personal.studentEmail = updates['personal.studentEmail'];
                selectedStudent.personal.fatherMobile = updates['personal.fatherMobile'];
                selectedStudent.personal.motherMobile = updates['personal.motherMobile'];
                selectedStudent.personal.state = updates['personal.state'];
                selectedStudent.personal.district = updates['personal.district'];
                selectedStudent.personal.pincode = updates['personal.pincode'];
                selectedStudent.personal.pinCode = updates['personal.pincode'];
                selectedStudent.personal.permanentAddress = updates['personal.permanentAddress'];

                if (AuditService) {
                    await AuditService.log('ADMIN_EDIT_CONTACT', { studentId: sId, updates });
                }

                alert('✅ Contact details updated successfully!');
                renderContactTab(false);
                renderCurrentPage();
            } catch(err) {
                console.error("Contact update error:", err);
                alert('❌ Update failed: ' + err.message);
            }
        });
    }

    if (toggleBtn) {
        toggleBtn.onclick = () => renderContactTab(!isEditMode);
    }
}

/* TAB 5: FEES (EDIT AND ADD UN-ADDED FEES ANY TIME) */
function renderFeesTab(isEditMode = false) {
    const f = selectedStudent.fees || {};
    const content = document.getElementById('fees-pane-content');
    if (!content) return;

    const toggleBtn = document.getElementById('btn-toggle-edit-fees');
    if (toggleBtn) {
        toggleBtn.textContent = isEditMode ? '✕ Cancel Edit' : '✏️ Edit / Add Fee Receipts';
        toggleBtn.className = isEditMode ? 'btn btn-secondary' : 'btn btn-primary';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.8rem';
        toggleBtn.onclick = () => renderFeesTab(!isEditMode);
    }

    const standardFees = [
        { key: 'tuition', label: 'Tuition Fee', amt: f.tuitionFeeAmount || f.tuition?.amount || '', receipt: f.tuitionReceiptNumber || f.tuition?.receiptNo || '', date: f.tuitionReceiptDate || f.tuition?.date || '' },
        { key: 'hostel', label: 'Hostel Fee', amt: f.hostelFeeAmount || f.hostel?.amount || '', receipt: f.hostelReceiptNumber || f.hostel?.receiptNo || '', date: f.hostelReceiptDate || f.hostel?.date || '' },
        { key: 'transport', label: 'Transport Fee', amt: f.transportFeeAmount || f.transport?.amount || '', receipt: f.transportReceiptNumber || f.transport?.receiptNo || '', date: f.transportReceiptDate || f.transport?.date || '' },
        { key: 'oneTime', label: 'One-Time Admission Fee', amt: f.oneTimeFeeAmount || f.oneTime?.amount || '', receipt: f.oneTimeFeeReceiptNumber || f.oneTime?.receiptNo || '', date: f.oneTimeFeeReceiptDate || f.oneTime?.date || '' },
        { key: 'counseling', label: 'Counseling Fee', amt: f.counsellingFeeAmount || f.counseling?.amount || '', receipt: f.counsellingFeeReceiptNumber || f.counseling?.receiptNo || '', date: f.counsellingFeeReceiptDate || f.counseling?.date || '' }
    ];

    const additionalFees = (f.additionalFees && Array.isArray(f.additionalFees)) ? f.additionalFees : [];

    if (!isEditMode) {
        let totalAmount = 0;
        standardFees.forEach(s => {
            if (s.amt) totalAmount += parseFloat(s.amt) || 0;
        });
        additionalFees.forEach(a => {
            if (a.amount) totalAmount += parseFloat(a.amount) || 0;
        });

        const rows = [
            ...standardFees.map(s => ({
                type: s.label,
                amount: s.amt,
                receiptNo: s.receipt,
                date: s.date
            })),
            ...additionalFees.map((add, idx) => ({
                type: add.feeType || `Additional Fee #${idx + 1}`,
                amount: add.amount,
                receiptNo: add.receiptNumber,
                date: add.receiptDate
            }))
        ];

        content.innerHTML = `
            <div style="background:white; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <span style="font-size:0.85rem; color:#64748b; font-weight:600; text-transform:uppercase;">Total Recorded Fees Paid</span>
                    <div style="font-size:1.4rem; font-weight:bold; color:var(--primary-blue);">₹ ${totalAmount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                    <span class="badge ${totalAmount > 0 ? 'badge-completed' : 'badge-draft'}" style="font-size:0.85rem; padding:6px 12px;">
                        ${totalAmount > 0 ? 'Fee Receipts Recorded' : 'No Receipts Recorded Yet'}
                    </span>
                </div>
            </div>

            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fee Type</th>
                        <th>Amount (₹)</th>
                        <th>Payment Date</th>
                        <th>Receipt Number</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => `
                        <tr>
                            <td><strong>${r.type}</strong></td>
                            <td>${r.amount ? '₹ ' + parseFloat(r.amount).toLocaleString('en-IN') : '<span style="color:#94a3b8;">-</span>'}</td>
                            <td>${r.date || '<span style="color:#94a3b8;">-</span>'}</td>
                            <td>${r.receiptNo || '<span style="color:#94a3b8;">-</span>'}</td>
                            <td>${r.receiptNo || r.amount ? `<span style="color:var(--success); font-weight:600;">✓ Recorded</span>` : '<span style="color:#94a3b8;">Pending</span>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        content.innerHTML = `
            <form id="form-edit-fees" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
                <h5 style="margin:0 0 15px 0; color:var(--primary-blue);">1. Standard Fee Receipts</h5>
                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                    ${standardFees.map(sf => `
                        <div style="display:grid; grid-template-columns: 180px 1fr 1fr 1fr; gap:10px; align-items:center; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                            <strong>${sf.label}</strong>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Amount (₹)</label>
                                <input type="number" step="any" id="fee-${sf.key}-amt" class="form-control" value="${sf.amt}" placeholder="₹ Amount">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Number</label>
                                <input type="text" id="fee-${sf.key}-no" class="form-control" value="${sf.receipt}" placeholder="Receipt No.">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Date</label>
                                <input type="date" id="fee-${sf.key}-date" class="form-control" value="${sf.date}">
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h5 style="margin:0; color:var(--primary-blue);">2. Additional Fee Receipts (Optional)</h5>
                    <button type="button" class="btn btn-secondary" style="padding:4px 10px; font-size:0.8rem;" id="btn-add-extra-fee">+ Add Additional Fee</button>
                </div>

                <div id="extra-fees-container" style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                    ${additionalFees.map((af, idx) => `
                        <div class="extra-fee-row" style="display:grid; grid-template-columns: 180px 1fr 1fr 1fr 40px; gap:10px; align-items:center; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Fee Type</label>
                                <input type="text" class="form-control extra-fee-type" value="${af.feeType || ''}" placeholder="e.g. Exam / Uniform Fee">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Amount (₹)</label>
                                <input type="number" step="any" class="form-control extra-fee-amt" value="${af.amount || ''}" placeholder="₹ Amount">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Number</label>
                                <input type="text" class="form-control extra-fee-no" value="${af.receiptNumber || ''}" placeholder="Receipt No.">
                            </div>
                            <div>
                                <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Date</label>
                                <input type="date" class="form-control extra-fee-date" value="${af.receiptDate || ''}">
                            </div>
                            <div style="text-align:center; padding-top:14px;">
                                <button type="button" class="btn" style="padding:4px 8px; background:#dc2626; color:white; border:none; border-radius:4px; font-size:0.8rem;" onclick="this.closest('.extra-fee-row').remove()">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="display:flex; gap:10px;">
                    <button type="submit" class="btn btn-primary" style="padding: 8px 24px;">💾 Save All Fee Receipts</button>
                    <button type="button" class="btn btn-secondary" style="padding: 8px 16px;" id="btn-cancel-edit-fees">Cancel</button>
                </div>
            </form>
        `;

        document.getElementById('btn-cancel-edit-fees')?.addEventListener('click', () => renderFeesTab(false));

        document.getElementById('btn-add-extra-fee')?.addEventListener('click', () => {
            const container = document.getElementById('extra-fees-container');
            if (!container) return;
            const newRow = document.createElement('div');
            newRow.className = 'extra-fee-row';
            newRow.style.cssText = 'display:grid; grid-template-columns: 180px 1fr 1fr 1fr 40px; gap:10px; align-items:center; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;';
            newRow.innerHTML = `
                <div>
                    <label style="font-size:0.75rem; color:#64748b; display:block;">Fee Type</label>
                    <input type="text" class="form-control extra-fee-type" placeholder="e.g. Exam / Uniform Fee">
                </div>
                <div>
                    <label style="font-size:0.75rem; color:#64748b; display:block;">Amount (₹)</label>
                    <input type="number" step="any" class="form-control extra-fee-amt" placeholder="₹ Amount">
                </div>
                <div>
                    <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Number</label>
                    <input type="text" class="form-control extra-fee-no" placeholder="Receipt No.">
                </div>
                <div>
                    <label style="font-size:0.75rem; color:#64748b; display:block;">Receipt Date</label>
                    <input type="date" class="form-control extra-fee-date">
                </div>
                <div style="text-align:center; padding-top:14px;">
                    <button type="button" class="btn" style="padding:4px 8px; background:#dc2626; color:white; border:none; border-radius:4px; font-size:0.8rem;" onclick="this.closest('.extra-fee-row').remove()">✕</button>
                </div>
            `;
            container.appendChild(newRow);
        });

        document.getElementById('form-edit-fees')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
            
            const tuitionAmt = document.getElementById('fee-tuition-amt')?.value.trim() || '';
            const tuitionNo = document.getElementById('fee-tuition-no')?.value.trim() || '';
            const tuitionDate = document.getElementById('fee-tuition-date')?.value || '';

            const hostelAmt = document.getElementById('fee-hostel-amt')?.value.trim() || '';
            const hostelNo = document.getElementById('fee-hostel-no')?.value.trim() || '';
            const hostelDate = document.getElementById('fee-hostel-date')?.value || '';

            const transportAmt = document.getElementById('fee-transport-amt')?.value.trim() || '';
            const transportNo = document.getElementById('fee-transport-no')?.value.trim() || '';
            const transportDate = document.getElementById('fee-transport-date')?.value || '';

            const oneTimeAmt = document.getElementById('fee-oneTime-amt')?.value.trim() || '';
            const oneTimeNo = document.getElementById('fee-oneTime-no')?.value.trim() || '';
            const oneTimeDate = document.getElementById('fee-oneTime-date')?.value || '';

            const counselingAmt = document.getElementById('fee-counseling-amt')?.value.trim() || '';
            const counselingNo = document.getElementById('fee-counseling-no')?.value.trim() || '';
            const counselingDate = document.getElementById('fee-counseling-date')?.value || '';

            const extraRows = document.querySelectorAll('.extra-fee-row');
            const newExtraFees = [];
            extraRows.forEach(row => {
                const feeType = row.querySelector('.extra-fee-type')?.value.trim();
                const amt = row.querySelector('.extra-fee-amt')?.value.trim();
                const recNo = row.querySelector('.extra-fee-no')?.value.trim();
                const recDate = row.querySelector('.extra-fee-date')?.value || '';
                if (feeType || amt || recNo) {
                    newExtraFees.push({
                        feeType: feeType || 'Additional Fee',
                        amount: amt || '',
                        receiptNumber: recNo || '',
                        receiptDate: recDate || ''
                    });
                }
            });

            const updates = {
                'fees.tuitionFeeAmount': tuitionAmt,
                'fees.tuitionReceiptNumber': tuitionNo,
                'fees.tuitionReceiptDate': tuitionDate,
                'fees.hostelFeeAmount': hostelAmt,
                'fees.hostelReceiptNumber': hostelNo,
                'fees.hostelReceiptDate': hostelDate,
                'fees.transportFeeAmount': transportAmt,
                'fees.transportReceiptNumber': transportNo,
                'fees.transportReceiptDate': transportDate,
                'fees.oneTimeFeeAmount': oneTimeAmt,
                'fees.oneTimeFeeReceiptNumber': oneTimeNo,
                'fees.oneTimeFeeReceiptDate': oneTimeDate,
                'fees.counsellingFeeAmount': counselingAmt,
                'fees.counsellingFeeReceiptNumber': counselingNo,
                'fees.counsellingFeeReceiptDate': counselingDate,
                'fees.additionalFees': newExtraFees
            };

            try {
                for (const [k, v] of Object.entries(updates)) {
                    await FirestoreService.updateStudentField(sId, k, v);
                }

                if (!selectedStudent.fees) selectedStudent.fees = {};
                selectedStudent.fees.tuitionFeeAmount = tuitionAmt;
                selectedStudent.fees.tuitionReceiptNumber = tuitionNo;
                selectedStudent.fees.tuitionReceiptDate = tuitionDate;
                selectedStudent.fees.hostelFeeAmount = hostelAmt;
                selectedStudent.fees.hostelReceiptNumber = hostelNo;
                selectedStudent.fees.hostelReceiptDate = hostelDate;
                selectedStudent.fees.transportFeeAmount = transportAmt;
                selectedStudent.fees.transportReceiptNumber = transportNo;
                selectedStudent.fees.transportReceiptDate = transportDate;
                selectedStudent.fees.oneTimeFeeAmount = oneTimeAmt;
                selectedStudent.fees.oneTimeFeeReceiptNumber = oneTimeNo;
                selectedStudent.fees.oneTimeFeeReceiptDate = oneTimeDate;
                selectedStudent.fees.counsellingFeeAmount = counselingAmt;
                selectedStudent.fees.counsellingFeeReceiptNumber = counselingNo;
                selectedStudent.fees.counsellingFeeReceiptDate = counselingDate;
                selectedStudent.fees.additionalFees = newExtraFees;

                if (AuditService) {
                    await AuditService.log('ADMIN_EDIT_FEES', { studentId: sId, updates });
                }

                alert('✅ Fee details and receipts updated successfully!');
                renderFeesTab(false);
                renderCurrentPage();
            } catch(err) {
                console.error("Fees update error:", err);
                alert('❌ Update failed: ' + err.message);
            }
        });
    }
}

/* TAB 6: DOCUMENTS (LAZY LOADED STORAGE URLS + VERIFICATION / REJECTION WORKFLOW) */
function renderDocumentsTab() {
    const docs = selectedStudent.documents || {};
    const content = document.getElementById('documents-pane-content');
    if (!content) return;

    const docMetaMap = {
        studentPhoto: 'Student Photo',
        studentSignature: 'Student Signature',
        parentSignature: 'Parent Signature',
        arStudentSignature: 'Anti-Ragging Student Signature',
        arParentSignature: 'Anti-Ragging Parent Signature',
        certificate10th: '10th Certificate / Marksheet',
        tenthCert: '10th Certificate / Marksheet',
        certificate12th: '12th / Diploma Certificate',
        twelfthCert: '12th / Diploma Certificate',
        tcMigration: 'TC / CLC / Migration Certificate',
        tcClc: 'TC / CLC Certificate',
        conductCert: 'Conduct Certificate',
        migrationCert: 'Migration Certificate',
        jeeRankCard: 'JEE / OJEE Rank Card',
        admissionLetter: 'College Allotment Letter',
        allotmentLetter: 'College Allotment Letter',
        residenceCertificate: 'Residence Certificate',
        casteCertificate: 'Caste Certificate',
        casteCert: 'Caste Certificate',
        incomeCertificate: 'Income Certificate',
        incomeCert: 'Income Certificate',
        aadhaarCard: 'Aadhaar Card Copy',
        aadhaarDoc: 'Aadhaar Card Copy',
        panCard: 'PAN Card Copy',
        panDoc: 'PAN Card Copy',
        rationCard: 'Ration Card Copy',
        cmKisanDoc: 'CM Kisan Beneficiary Document',
        bankPassbook: 'Bank Passbook Copy',
        feeReceipt: 'Fee Payment Receipt'
    };

    const allKeys = Array.from(new Set([...Object.keys(docMetaMap), ...Object.keys(docs)]));
    const docItems = allKeys.map(k => ({
        key: k,
        title: docMetaMap[k] || k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }));

    content.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Document Name</th>
                    <th>Status</th>
                    <th>Verified By (Admin)</th>
                    <th>Rejection Reason</th>
                    <th style="text-align: right;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${docItems.map(item => {
                    const docObj = docs[item.key] || {};
                    const isUploaded = !!docObj.url;
                    const status = docObj.status || (isUploaded ? 'Uploaded' : 'Missing');

                    let statusBadge = `<span class="badge badge-draft">Missing</span>`;
                    if (status === 'Uploaded') statusBadge = `<span class="badge badge-submitted">Uploaded</span>`;
                    else if (status === 'Verified') statusBadge = `<span class="badge badge-verified">✓ Verified</span>`;
                    else if (status === 'Rejected') statusBadge = `<span class="badge" style="background:#fee2e2; color:#b91c1c;">✕ Rejected</span>`;

                    const verifier = docObj.verifiedBy 
                        ? `<span style="font-size:0.75rem; color:#047857; font-weight:600;">✓ ${Sanitizer.sanitizeString(docObj.verifiedBy)}<br><small style="color:#64748b; font-weight:normal;">${docObj.verifiedAt || ''}</small></span>` 
                        : (docObj.uploadedByAdmin ? `<span style="font-size:0.75rem; color:#0284c7; font-weight:600;">📤 Admin Upload<br><small style="color:#64748b; font-weight:normal;">${Sanitizer.sanitizeString(docObj.uploadedBy || '')}</small></span>` : '<span style="color:#cbd5e1; font-size:0.75rem;">-</span>');

                    return `
                        <tr>
                            <td><strong>${item.title}</strong></td>
                            <td>${statusBadge}</td>
                            <td>${verifier}</td>
                            <td>${docObj.rejectionReason ? `<span style="font-size:0.8rem; color:#b91c1c;">${Sanitizer.sanitizeString(docObj.rejectionReason)}</span>` : '<span style="color:#cbd5e1;">-</span>'}</td>
                            <td style="text-align: right;">
                                ${isUploaded ? `
                                    <button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="window.viewDocUrl('${docObj.url}')">View</button>
                                    <button class="btn btn-secondary" style="padding:3px 8px; font-size:0.75rem;" onclick="window.downloadDocUrl('${docObj.url}', '${item.key}')">Download</button>
                                    ${status !== 'Verified' ? `<button class="btn" style="padding:3px 8px; font-size:0.75rem; background:var(--success); color:white; border:none;" onclick="window.verifyDocument('${item.key}')">Verify</button>` : ''}
                                    ${status !== 'Rejected' ? `<button class="btn" style="padding:3px 8px; font-size:0.75rem; background:#dc2626; color:white; border:none;" onclick="window.openRejectDocModal('${item.key}')">Reject</button>` : ''}
                                ` : `
                                    <input type="file" id="admin-doc-input-${item.key}" style="display:none;" accept="image/jpeg,image/png,image/webp,application/pdf" onchange="window.adminUploadMissedDocument('${item.key}', this)">
                                    <button type="button" class="btn btn-primary" id="btn-admin-upload-${item.key}" style="padding:4px 10px; font-size:0.75rem; background:#0284c7; color:white; border:none; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600;" onclick="document.getElementById('admin-doc-input-${item.key}').click()">
                                        <span>📤</span> Upload
                                    </button>
                                `}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    const zipBtn = document.getElementById('btn-dl-all-docs-zip');
    if (zipBtn) {
        zipBtn.onclick = async () => {
            if (!selectedStudent) return;
            const origHtml = zipBtn.innerHTML;
            zipBtn.disabled = true;
            zipBtn.innerHTML = '⏳ Zipping Files...';
            try {
                await PdfService.downloadAllDocumentsZip(selectedStudent, false);
            } catch (e) {
                alert('ZIP creation failed: ' + e.message);
            } finally {
                zipBtn.disabled = false;
                zipBtn.innerHTML = origHtml;
            }
        };
    }

    const dlVerifiedBtn = document.getElementById('btn-dl-verified-docs');
    if (dlVerifiedBtn) {
        dlVerifiedBtn.onclick = async () => {
            if (!selectedStudent) return;
            const origHtml = dlVerifiedBtn.innerHTML;
            dlVerifiedBtn.disabled = true;
            dlVerifiedBtn.innerHTML = '⏳ Zipping Verified...';
            try {
                await PdfService.downloadAllDocumentsZip(selectedStudent, true);
            } catch (e) {
                alert('Verified Docs ZIP creation failed: ' + e.message);
            } finally {
                dlVerifiedBtn.disabled = false;
                dlVerifiedBtn.innerHTML = origHtml;
            }
        };
    }

    const verifyAllBtn = document.getElementById('btn-verify-all-docs');
    if (verifyAllBtn) {
        verifyAllBtn.onclick = () => window.verifyAllDocuments();
    }
}

window.adminUploadMissedDocument = async (docKey, inputEl) => {
    if (!selectedStudent) {
        alert("No student selected.");
        return;
    }
    const file = inputEl && inputEl.files && inputEl.files[0];
    if (!file) return;

    const sId = selectedStudent.id || selectedStudent.admin?.studentId || selectedStudent.admin?.uid;
    if (!sId) {
        alert("❌ Error: Could not locate student identifier.");
        return;
    }

    const sName = selectedStudent.personal?.studentFullName || 'Student';
    const currentUser = AuthService.getCurrentUser() || auth.currentUser || (Store && Store.data && Store.data.admin) || {};
    const adminEmail = currentUser.email || 'Admin';
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    // Show visual loading status on the button
    const btn = document.getElementById(`btn-admin-upload-${docKey}`);
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Uploading...`;
        btn.style.opacity = '0.7';
    }

    try {
        const fileMeta = await StorageService.uploadFileForStudent(sId, docKey, file);
        if (!fileMeta || !fileMeta.url) {
            throw new Error("Failed to process file upload.");
        }

        fileMeta.status = 'Uploaded';
        fileMeta.uploadedBy = adminEmail;
        fileMeta.uploadedByAdmin = true;
        fileMeta.adminUploadedAt = nowStr;

        // 1. Update Firestore
        await FirestoreService.updateStudentField(sId, `documents.${docKey}`, fileMeta);

        // 2. Update local selectedStudent data
        if (!selectedStudent.documents) selectedStudent.documents = {};
        selectedStudent.documents[docKey] = fileMeta;

        // 3. Update memory list and session cache
        if (Array.isArray(allStudentsList)) {
            const idx = allStudentsList.findIndex(s => (s.id === sId || s.admin?.studentId === sId || s.admin?.uid === sId));
            if (idx !== -1) {
                if (!allStudentsList[idx].documents) allStudentsList[idx].documents = {};
                allStudentsList[idx].documents[docKey] = fileMeta;
            }
        }
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(allStudentsList));
        } catch(e) {}

        // 4. Audit Log
        if (AuditService) {
            await AuditService.log('ADMIN_UPLOAD_MISSED_DOC', {
                studentId: sId,
                studentName: sName,
                docKey,
                fileName: file.name,
                fileSize: file.size,
                uploadedBy: adminEmail
            });
        }

        alert(`✅ Document "${file.name}" uploaded successfully for ${sName}!`);
        
        // 5. Re-render documents tab immediately
        renderDocumentsTab();
    } catch (err) {
        console.error("Admin document upload error:", err);
        alert(`❌ Upload failed: ${err.message}`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            btn.style.opacity = '1';
        }
    } finally {
        if (inputEl) inputEl.value = '';
    }
};

window.viewDocUrl = (url) => { window.open(url, '_blank'); };
window.downloadDocUrl = (url, name) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedStudent.personal?.studentFullName || 'Student'}_${name}`;
    a.target = '_blank';
    a.click();
};

window.verifyAllDocuments = async () => {
    if (!selectedStudent) return;
    const docs = selectedStudent.documents || {};
    const uploadedKeys = Object.keys(docs).filter(k => docs[k] && docs[k].url);
    const currentUser = auth.currentUser || (Store && Store.data && Store.data.admin) || {};
    const adminEmail = currentUser.email || 'Admin';
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    
    if (uploadedKeys.length === 0) {
        alert('No uploaded documents found for this student to verify.');
        return;
    }

    if (!confirm(`Are you sure you want to verify all ${uploadedKeys.length} uploaded document(s) for ${selectedStudent.personal?.studentFullName || 'this student'}?`)) {
        return;
    }

    const sId = selectedStudent.id || selectedStudent.admin?.studentId;
    try {
        for (const k of uploadedKeys) {
            await FirestoreService.updateStudentField(sId, `documents.${k}.status`, 'Verified');
            await FirestoreService.updateStudentField(sId, `documents.${k}.rejectionReason`, '');
            await FirestoreService.updateStudentField(sId, `documents.${k}.verifiedBy`, adminEmail);
            await FirestoreService.updateStudentField(sId, `documents.${k}.verifiedAt`, nowStr);
            selectedStudent.documents[k] = selectedStudent.documents[k] || {};
            selectedStudent.documents[k].status = 'Verified';
            selectedStudent.documents[k].rejectionReason = '';
            selectedStudent.documents[k].verifiedBy = adminEmail;
            selectedStudent.documents[k].verifiedAt = nowStr;
        }
        AuditService.log('ADMIN_VERIFY_ALL_DOCS', { studentId: sId, count: uploadedKeys.length, verifiedBy: adminEmail });
        alert(`All ${uploadedKeys.length} uploaded document(s) verified successfully by ${adminEmail}!`);
        renderDocumentsTab();
    } catch(e) {
        alert('Batch verification failed: ' + e.message);
    }
};

window.revertStudentApplication = async () => {
    if (!selectedStudent) return;
    const sId = selectedStudent.id || selectedStudent.admin?.studentId || selectedStudent.admin?.uid;
    if (!sId) {
        alert("❌ Error: Could not locate student identifier.");
        return;
    }
    const name = selectedStudent.personal?.studentFullName || 'Student';
    const currentUser = AuthService.getCurrentUser() || auth.currentUser || {};
    const adminEmail = currentUser.email || 'Admin';
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    const reason = prompt(`Enter reason for reverting application for ${name} (e.g. Please correct father's name and re-upload 10th certificate):`);
    if (reason === null) return;
    if (!reason.trim()) {
        alert('Revert reason cannot be empty. Please state why the application is being reverted.');
        return;
    }

    try {
        await FirestoreService.updateStudentField(sId, 'admin.status', 'REVERTED');
        await FirestoreService.updateStudentField(sId, 'admin.revertReason', reason.trim());
        await FirestoreService.updateStudentField(sId, 'admin.revertedBy', adminEmail);
        await FirestoreService.updateStudentField(sId, 'admin.revertedAt', nowStr);
        await FirestoreService.updateStudentField(sId, 'submission.isSubmitted', false);
        if (AuditService) {
            await AuditService.log('ADMIN_REVERT_APPLICATION', { studentId: sId, reason: reason.trim(), revertedBy: adminEmail });
        }

        selectedStudent.admin = selectedStudent.admin || {};
        selectedStudent.admin.status = 'REVERTED';
        selectedStudent.admin.revertReason = reason.trim();
        selectedStudent.admin.revertedBy = adminEmail;
        selectedStudent.admin.revertedAt = nowStr;
        selectedStudent.submission = selectedStudent.submission || {};
        selectedStudent.submission.isSubmitted = false;

        alert(`Application for ${name} has been REVERTED by ${adminEmail}.`);
        
        const statusEl = document.getElementById('sp-banner-status');
        if (statusEl) {
            statusEl.textContent = 'REVERTED';
            statusEl.className = 'badge';
            statusEl.style.background = '#f59e0b';
            statusEl.style.color = 'white';
        }
        renderCurrentPage();
        renderOverviewTab();
    } catch(err) {
        alert('Failed to revert application: ' + err.message);
    }
};

window.verifyDocument = async (docKey) => {
    const sId = selectedStudent.id || selectedStudent.admin?.studentId;
    const currentUser = auth.currentUser || (Store && Store.data && Store.data.admin) || {};
    const adminEmail = currentUser.email || 'Admin';
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    try {
        await FirestoreService.updateStudentField(sId, `documents.${docKey}.status`, 'Verified');
        await FirestoreService.updateStudentField(sId, `documents.${docKey}.rejectionReason`, '');
        await FirestoreService.updateStudentField(sId, `documents.${docKey}.verifiedBy`, adminEmail);
        await FirestoreService.updateStudentField(sId, `documents.${docKey}.verifiedAt`, nowStr);
        AuditService.log('ADMIN_VERIFY_DOC', { studentId: sId, docKey, verifiedBy: adminEmail });
        alert(`Document verified by ${adminEmail}!`);
        selectedStudent.documents = selectedStudent.documents || {};
        selectedStudent.documents[docKey] = selectedStudent.documents[docKey] || {};
        selectedStudent.documents[docKey].status = 'Verified';
        selectedStudent.documents[docKey].rejectionReason = '';
        selectedStudent.documents[docKey].verifiedBy = adminEmail;
        selectedStudent.documents[docKey].verifiedAt = nowStr;
        renderDocumentsTab();
    } catch(e) { alert('Verification failed: ' + e.message); }
};

window.openRejectDocModal = (docKey) => {
    currentRejectDocKey = docKey;
    document.getElementById('rejection-reason-input').value = '';
    document.getElementById('rejection-modal-overlay')?.classList.add('active');
};

async function confirmDocumentRejection() {
    if (!currentRejectDocKey || !selectedStudent) return;
    const reason = document.getElementById('rejection-reason-input').value.trim();
    if (!reason) { alert('Please enter a rejection reason.'); return; }

    const sId = selectedStudent.id || selectedStudent.admin?.studentId;
    const currentUser = auth.currentUser || (Store && Store.data && Store.data.admin) || {};
    const adminEmail = currentUser.email || 'Admin';
    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
    try {
        await FirestoreService.updateStudentField(sId, `documents.${currentRejectDocKey}.status`, 'Rejected');
        await FirestoreService.updateStudentField(sId, `documents.${currentRejectDocKey}.rejectionReason`, reason);
        await FirestoreService.updateStudentField(sId, `documents.${currentRejectDocKey}.rejectedBy`, adminEmail);
        await FirestoreService.updateStudentField(sId, `documents.${currentRejectDocKey}.rejectedAt`, nowStr);
        AuditService.log('ADMIN_REJECT_DOC', { studentId: sId, docKey: currentRejectDocKey, reason, rejectedBy: adminEmail });
        
        document.getElementById('rejection-modal-overlay')?.classList.remove('active');
        alert(`Document rejected by ${adminEmail}.`);
        
        selectedStudent.documents = selectedStudent.documents || {};
        selectedStudent.documents[currentRejectDocKey] = selectedStudent.documents[currentRejectDocKey] || {};
        selectedStudent.documents[currentRejectDocKey].status = 'Rejected';
        selectedStudent.documents[currentRejectDocKey].rejectionReason = reason;
        selectedStudent.documents[currentRejectDocKey].rejectedBy = adminEmail;
        selectedStudent.documents[currentRejectDocKey].rejectedAt = nowStr;
        
        renderDocumentsTab();
    } catch(e) { alert('Rejection failed: ' + e.message); }
}

/* TAB 7: FACILITIES */
function renderFacilitiesTab() {
    const f = selectedStudent.facilities || {};
    const r = selectedStudent.reporting || {};
    const adm = selectedStudent.admin || {};
    const content = document.getElementById('facilities-pane-content');
    if (!content) return;

    const isHostel = (f.hostelRequired || r.hostelRequired) === 'Yes' || f.hostelRequired === true;
    const isTransport = (f.transportRequired || r.transportRequired) === 'Yes' || f.transportRequired === true;

    content.innerHTML = `
        <form id="form-facilities-allotment" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
            <!-- Hostel Facility Section -->
            <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h5 style="margin:0; color:var(--primary-blue);">🏢 Hostel Facility Management</h5>
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; margin-right:8px;">Hostel Required:</label>
                        <select id="fac-hostel-required" class="form-control" style="width:auto; display:inline-block; padding:3px 10px; font-size:0.85rem;">
                            <option value="Yes" ${isHostel ? 'selected' : ''}>Yes (Enrolled)</option>
                            <option value="No" ${!isHostel ? 'selected' : ''}>No (Not Required)</option>
                        </select>
                    </div>
                </div>
                <div class="detail-grid" id="fac-hostel-fields" style="${isHostel ? 'display:grid;' : 'display:none;'}">
                    <div class="detail-item"><label>Hostel Room Number</label><input type="text" id="fac-room" class="form-control" value="${adm.hostelRoomNo || ''}" placeholder="e.g. Room 204"></div>
                    <div class="detail-item"><label>Hostel Block / Building Name</label><input type="text" id="fac-hostel" class="form-control" value="${adm.hostelNo || ''}" placeholder="e.g. Boys Hostel 1 / Girls Hostel 2"></div>
                </div>
            </div>

            <!-- Transport Facility Section -->
            <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h5 style="margin:0; color:var(--primary-blue);">🚌 Transport / Bus Pass Management</h5>
                    <div>
                        <label style="font-size:0.8rem; font-weight:600; margin-right:8px;">Transport Required:</label>
                        <select id="fac-transport-required" class="form-control" style="width:auto; display:inline-block; padding:3px 10px; font-size:0.85rem;">
                            <option value="Yes" ${isTransport ? 'selected' : ''}>Yes (Enrolled)</option>
                            <option value="No" ${!isTransport ? 'selected' : ''}>No (Not Required)</option>
                        </select>
                    </div>
                </div>
                <div class="detail-grid" id="fac-transport-fields" style="${isTransport ? 'display:grid;' : 'display:none;'}">
                    <div class="detail-item"><label>Rider Pass Number</label><input type="text" id="fac-pass" class="form-control" value="${adm.riderPassNo || ''}" placeholder="e.g. PASS-2026-99"></div>
                    <div class="detail-item"><label>Bus Stoppage / Route Location</label><input type="text" id="fac-stoppage" class="form-control" value="${adm.stoppageName || selectedStudent.transport?.stoppageName || ''}" placeholder="e.g. Master Canteen / Khandagiri"></div>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" style="padding: 8px 24px;">💾 Save Facility Allotments</button>
        </form>
    `;

    document.getElementById('fac-hostel-required')?.addEventListener('change', (e) => {
        const fields = document.getElementById('fac-hostel-fields');
        if (fields) fields.style.display = e.target.value === 'Yes' ? 'grid' : 'none';
    });

    document.getElementById('fac-transport-required')?.addEventListener('change', (e) => {
        const fields = document.getElementById('fac-transport-fields');
        if (fields) fields.style.display = e.target.value === 'Yes' ? 'grid' : 'none';
    });

    document.getElementById('form-facilities-allotment')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sId = selectedStudent.id || selectedStudent.uid || selectedStudent.admin?.studentId;
        const hReq = document.getElementById('fac-hostel-required')?.value === 'Yes';
        const tReq = document.getElementById('fac-transport-required')?.value === 'Yes';

        const updates = {
            'facilities.hostelRequired': hReq ? 'Yes' : 'No',
            'reporting.hostelRequired': hReq ? 'Yes' : 'No',
            'facilities.transportRequired': tReq ? 'Yes' : 'No',
            'reporting.transportRequired': tReq ? 'Yes' : 'No',
            'admin.hostelRoomNo': hReq ? (document.getElementById('fac-room')?.value.trim() || '') : '',
            'admin.hostelNo': hReq ? (document.getElementById('fac-hostel')?.value.trim() || '') : '',
            'admin.riderPassNo': tReq ? (document.getElementById('fac-pass')?.value.trim() || '') : '',
            'admin.stoppageName': tReq ? (document.getElementById('fac-stoppage')?.value.trim() || '') : ''
        };

        try {
            for (const [k, v] of Object.entries(updates)) {
                await FirestoreService.updateStudentField(sId, k, v);
            }

            if (!selectedStudent.facilities) selectedStudent.facilities = {};
            if (!selectedStudent.reporting) selectedStudent.reporting = {};
            if (!selectedStudent.admin) selectedStudent.admin = {};

            selectedStudent.facilities.hostelRequired = updates['facilities.hostelRequired'];
            selectedStudent.reporting.hostelRequired = updates['reporting.hostelRequired'];
            selectedStudent.facilities.transportRequired = updates['facilities.transportRequired'];
            selectedStudent.reporting.transportRequired = updates['reporting.transportRequired'];
            selectedStudent.admin.hostelRoomNo = updates['admin.hostelRoomNo'];
            selectedStudent.admin.hostelNo = updates['admin.hostelNo'];
            selectedStudent.admin.riderPassNo = updates['admin.riderPassNo'];
            selectedStudent.admin.stoppageName = updates['admin.stoppageName'];

            if (AuditService) {
                await AuditService.log('ADMIN_UPDATE_FACILITIES', { studentId: sId, updates });
            }

            alert('✅ Facility allotments saved successfully!');
            renderFacilitiesTab();
            renderCurrentPage();
        } catch(err) {
            console.error("Facilities update failed:", err);
            alert('❌ Save failed: ' + err.message);
        }
    });
}

/* TAB 8: ANTI-RAGGING */
function renderAntiRaggingTab() {
    const ar = selectedStudent.antiRagging || {};
    const adm = selectedStudent.admin || {};
    const content = document.getElementById('antiragging-pane-content');
    if (!content) return;

    content.innerHTML = `
        <div style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
            <div class="detail-grid">
                <div class="detail-item"><label>Anti-Ragging Undertaking Status</label><span style="color:var(--success); font-weight:600;">✓ Agreed to 17 UGC Legal Clauses</span></div>
                <div class="detail-item"><label>Registration Number</label><span>${adm.registrationNumber || 'PENDING BY COLLEGE'}</span></div>
                <div class="detail-item"><label>Student Signature</label><span>${selectedStudent.documents?.studentSignature?.url ? '✓ Signed Digitally' : 'Missing'}</span></div>
                <div class="detail-item"><label>Parent Signature</label><span>${selectedStudent.documents?.parentSignature?.url ? '✓ Signed Digitally' : 'Missing'}</span></div>
            </div>
            <button class="btn btn-secondary" style="margin-top:15px; padding:6px 16px;" onclick="PdfService.downloadFormPdf('antiragging', selectedStudent)">Preview / Download Official Anti-Ragging PDF</button>
        </div>
    `;
}

/* TAB 9: REGISTRATION (ADMIN ONLY) */
function renderRegistrationTab() {
    const adm = selectedStudent.admin || {};
    const content = document.getElementById('registration-pane-content');
    if (!content) return;

    content.innerHTML = `
        <form id="form-admin-registration" style="background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0;">
            <div class="detail-grid">
                <div class="detail-item"><label>Official Registration Number *</label><input type="text" id="reg-num" class="form-control" value="${adm.registrationNumber || ''}" placeholder="e.g. BEC2026001"></div>
                <div class="detail-item"><label>Enrollment Number</label><input type="text" id="reg-enroll" class="form-control" value="${adm.enrollmentNumber || ''}" placeholder="e.g. ENR202699"></div>
                <div class="detail-item"><label>Roll Number</label><input type="text" id="reg-roll" class="form-control" value="${adm.rollNumber || ''}" placeholder="e.g. 26CSE01"></div>
                <div class="detail-item"><label>Section / Batch</label><input type="text" id="reg-sec" class="form-control" value="${adm.section || ''}" placeholder="e.g. Section-A"></div>
                <div class="detail-item">
                    <label>Admission Status</label>
                    <select id="reg-status" class="form-control">
                        <option value="IN_PROGRESS" ${adm.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                        <option value="SUBMITTED" ${adm.status === 'SUBMITTED' ? 'selected' : ''}>Submitted</option>
                        <option value="REVERTED" ${adm.status === 'REVERTED' ? 'selected' : ''}>Reverted for Correction</option>
                        <option value="VERIFIED" ${adm.status === 'VERIFIED' ? 'selected' : ''}>Verified</option>
                        <option value="COMPLETED" ${adm.status === 'COMPLETED' ? 'selected' : ''}>Completed & Approved</option>
                    </select>
                </div>
            </div>
            <button type="submit" class="btn btn-primary" style="margin-top:15px; padding: 6px 18px;">Save Registration Assignment</button>
        </form>
    `;

    document.getElementById('form-admin-registration')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sId = selectedStudent.id || selectedStudent.admin?.studentId;
        const regNo = document.getElementById('reg-num').value.trim();
        const enrollNo = document.getElementById('reg-enroll').value.trim();
        const rollNo = document.getElementById('reg-roll').value.trim();
        const sec = document.getElementById('reg-sec').value.trim();
        const status = document.getElementById('reg-status').value;

        try {
            await FirestoreService.updateStudentField(sId, 'admin.registrationNumber', regNo);
            await FirestoreService.updateStudentField(sId, 'admin.enrollmentNumber', enrollNo);
            await FirestoreService.updateStudentField(sId, 'admin.rollNumber', rollNo);
            await FirestoreService.updateStudentField(sId, 'admin.section', sec);
            await FirestoreService.updateStudentField(sId, 'admin.status', status);

            if (!selectedStudent.admin) selectedStudent.admin = {};
            selectedStudent.admin.registrationNumber = regNo;
            selectedStudent.admin.enrollmentNumber = enrollNo;
            selectedStudent.admin.rollNumber = rollNo;
            selectedStudent.admin.section = sec;
            selectedStudent.admin.status = status;

            AuditService.log('ADMIN_ASSIGN_REGISTRATION', { studentId: sId, regNo, rollNo, status });
            alert('Registration & Roll Number assigned successfully!');
            renderCurrentPage();
        } catch(err) { alert('Save failed: ' + err.message); }
    });
}

/* TAB 10: GENERATED FORMS */
function renderGeneratedFormsTab() {
    const content = document.getElementById('forms-pane-content');
    if (!content) return;

    const isHostel = PdfService.isFacilityRequested(selectedStudent, 'hostel');
    const isTransport = PdfService.isFacilityRequested(selectedStudent, 'transport');

    content.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; max-width:550px; background:white; padding:20px; border-radius:8px; border:1px solid #e2e8f0; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
            <button class="btn btn-primary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left;" onclick="window.downloadFormPdf('reporting')">📄 Download Official Consolidated Reporting Form PDF</button>
            
            ${isHostel ? `
                <button class="btn btn-secondary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left;" onclick="window.downloadFormPdf('hostel')">🏢 Download Official Hostel Application PDF</button>
            ` : `
                <button class="btn btn-secondary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left; opacity:0.6; cursor:not-allowed;" disabled>🏢 Hostel Application PDF (Not Applied by Student)</button>
            `}

            ${isTransport ? `
                <button class="btn btn-secondary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left;" onclick="window.downloadFormPdf('transport')">🚌 Download Official Transport Pass PDF</button>
            ` : `
                <button class="btn btn-secondary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left; opacity:0.6; cursor:not-allowed;" disabled>🚌 Transport Pass PDF (Not Applied by Student)</button>
            `}

            <button class="btn btn-secondary" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left;" onclick="window.downloadFormPdf('antiragging')">⚖️ Download Official Anti-Ragging Affidavit PDF</button>
            <button class="btn" style="padding:12px; font-size:0.92rem; font-weight:600; text-align:left; background:#1e3a8a; color:white;" onclick="window.downloadAllZip()">📦 Download Complete Documents Archive (ZIP)</button>
        </div>
    `;
}

/* TAB 11: ID CARD (ADMIN ONLY WITH VALIDATION GATE) */
function renderIdCardTab() {
    const s = selectedStudent || {};
    const adm = s.admin || {};
    const p = s.personal || {};
    const a = s.academic || s.reporting || {};
    const docs = s.documents || {};
    const content = document.getElementById('idcard-pane-content');
    if (!content) return;

    const studentPhotoUrl = docs.studentPhoto?.url || docs.photo?.url || '../assets/images/bec_logo.jpeg';
    const sName = getStudentDataField(s, 'studentName');
    const sReg = getStudentDataField(s, 'registrationNumber');
    const sProg = getStudentDataField(s, 'program');
    const sBranch = getStudentDataField(s, 'branch');
    const sDob = p.dob || 'N/A';
    const sMob = getStudentDataField(s, 'mobile');
    const validUpto = (window.PdfService && window.PdfService.computeValidUpto) ? window.PdfService.computeValidUpto(s) : 'July 2030';

    // Prerequisite Checklist
    const checks = [
        { label: 'Student Name', valid: !!p.studentFullName && p.studentFullName !== 'N/A' },
        { label: 'Student Photo', valid: !!docs.studentPhoto?.url || !!docs.photo?.url },
        { label: 'Registration Number', valid: !!sReg && sReg !== 'PENDING' && sReg !== 'PENDING BY COLLEGE' && sReg !== 'N/A' },
        { label: 'Course / Program', valid: !!sProg && sProg !== 'N/A' },
        { label: 'Branch', valid: !!sBranch && sBranch !== 'N/A' },
        { label: 'Date of Birth', valid: !!p.dob },
        { label: 'Contact Number', valid: !!sMob && sMob !== 'N/A' }
    ];

    const isAllValid = checks.every(c => c.valid);

    content.innerHTML = `
        <div style="display:flex; gap:25px; flex-wrap:wrap; align-items:flex-start;">
            <!-- Checklist Box -->
            <div style="flex:1; min-width:260px; max-width: 300px; background:white; padding:18px; border-radius:8px; border:1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <h5 style="margin-top:0; color:var(--primary-blue); font-size: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">ID Card Status Checklist</h5>
                <ul style="list-style:none; padding:0; margin:10px 0 15px 0;">
                    ${checks.map(c => `
                        <li style="padding:5px 0; font-size:0.85rem; color:${c.valid ? '#047857' : '#b91c1c'}; font-weight:${c.valid ? '600' : 'bold'}; display: flex; align-items: center; gap: 8px;">
                            <span>${c.valid ? '✓' : '✕'}</span>
                            <span>${c.label}</span>
                        </li>
                    `).join('')}
                </ul>
                ${!isAllValid ? `<div style="background:#fee2e2; color:#b91c1c; padding:10px 12px; border-radius:6px; font-size:0.8rem; line-height: 1.4;">⚠️ Complete missing student details above to enable official print.</div>` : ''}

                <div style="margin-top: 20px;">
                    <button class="btn btn-primary" id="btn-gen-idcard" style="width:100%; padding:10px 16px; background:${isAllValid ? 'var(--success)' : '#0284c7'}; border:none; font-weight:600; cursor:pointer; font-size: 0.88rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        📄 Download Official ID Card PDF
                    </button>
                    <button class="btn btn-secondary" id="btn-print-direct-idcard" style="width:100%; padding:8px 16px; margin-top: 8px; font-weight:600; cursor:pointer; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        🖨️ Print Direct Preview
                    </button>
                </div>
            </div>

            <!-- Side-by-Side ID Card Preview -->
            <div style="flex:2; min-width:320px; background:#f8fafc; padding:20px; border-radius:10px; border:1px solid #e2e8f0;">
                <h5 style="margin-top:0; margin-bottom: 15px; color:#1e293b; text-align:center; font-size: 1rem;">Official Student ID Card Layout (Standard CR-80 PVC • Front & Back)</h5>
                
                <div style="display: flex; gap: 24px; justify-content: center; flex-wrap: wrap;">
                    
                    <!-- FRONT SIDE PREVIEW (EXACT PHYSICAL TEMPLATE) -->
                    <div style="width: 310px; height: 485px; border: 1.5px solid #002b66; border-radius: 12px; overflow: hidden; background: #ffffff; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.12); box-sizing: border-box; flex-shrink: 0;">
                        <!-- Front Background Template -->
                        <img src="../assets/images/id_card_front_bg.jpeg" style="width: 100%; height: 100%; object-fit: fill; position: absolute; top: 0; left: 0; z-index: 1; display: block;" alt="ID Card Front">

                        <!-- Student Photo Overlay -->
                        <div style="position: absolute; top: 178px; left: 20px; width: 107px; height: 148px; border-radius: 6px; overflow: hidden; background: #f1f5f9; z-index: 2;">
                            <img src="${studentPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block;" alt="Photo">
                        </div>

                        <!-- Student Dynamic Data Overlay -->
                        <div style="position: absolute; top: 176px; left: 135px; right: 14px; z-index: 2;">
                            <div style="border-bottom: 2px solid #002b66; padding-bottom: 2px; margin-bottom: 5px;">
                                <span style="font-size: 13px; font-weight: 900; color: #002b66; text-transform: uppercase; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${sName}</span>
                            </div>
                            <table style="width: 100%; font-size: 9.5px; line-height: 1.45; border-collapse: collapse;">
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; width: 62px; padding: 1px 0;">Regd. No.</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${sReg}</span></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; padding: 1px 0;">Course</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${sProg}</span></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; padding: 1px 0;">Branch</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${sBranch}</span></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; padding: 1px 0;">D.O.B.</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${sDob}</span></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; padding: 1px 0;">Contact No.</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${sMob}</span></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: 800; color: #002b66; padding: 1px 0;">Valid Upto</td>
                                    <td style="color: #002b66;">: <span style="font-weight: 800; color: #0f172a;">${validUpto}</span></td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- BACK SIDE PREVIEW USING EXACT REFERENCE IMAGE -->
                    <div style="width: 310px; height: 485px; border: 1.5px solid #002b66; border-radius: 12px; overflow: hidden; background: #ffffff; position: relative; box-shadow: 0 4px 10px rgba(0,0,0,0.12); box-sizing: border-box; flex-shrink: 0;">
                        <img src="../assets/images/id card back side.jpeg" style="width: 100%; height: 100%; object-fit: fill; display: block;" alt="ID Card Back Side">
                    </div>

                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-gen-idcard')?.addEventListener('click', async () => {
        PdfService.downloadFormPdf('idcard', selectedStudent);
        const sId = selectedStudent.id || selectedStudent.admin?.studentId;
        if (sId) {
            await FirestoreService.updateStudentField(sId, 'idCard.generated', true);
            if (window.AuditService) {
                AuditService.log('ADMIN_GENERATE_IDCARD', { studentId: sId });
            }
        }
    });

    document.getElementById('btn-print-direct-idcard')?.addEventListener('click', () => {
        const copyData = JSON.parse(JSON.stringify(selectedStudent || {}));
        const docs = copyData.documents || {};
        copyData.photoUrl = docs.studentPhoto?.url || docs.photo?.url || '../assets/images/bec_logo.jpeg';
        copyData.validUpto = (window.PdfService && window.PdfService.computeValidUpto) 
            ? window.PdfService.computeValidUpto(copyData) 
            : validUpto;
        
        sessionStorage.setItem('print_idcard_student', JSON.stringify(copyData));
        window.open('print/idcard-print.html?autoprint=1', '_blank');
    });
}

/* TAB 12: AUDIT LOG (READ-ONLY) */
function renderAuditTab() {
    const logs = selectedStudent.auditLogs || [];
    const content = document.getElementById('audit-pane-content');
    if (!content) return;

    if (logs.length === 0) {
        content.innerHTML = `<div style="padding:20px; background:white; border-radius:8px; border:1px solid #e2e8f0; text-align:center; color:#64748b;">No audit logs recorded for this student yet.</div>`;
        return;
    }

    content.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date / Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td style="font-size:0.8rem;">${l.timestamp || 'N/A'}</td>
                        <td style="font-weight:600;">${Sanitizer.sanitizeString(l.adminEmail || 'System')}</td>
                        <td><span class="badge badge-submitted">${Sanitizer.sanitizeString(l.action)}</span></td>
                        <td style="font-size:0.8rem; color:#475569;">${Sanitizer.sanitizeString(JSON.stringify(l.details || {}))}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function exportToExcel() {
    const studentsToExport = (filteredStudentsList && filteredStudentsList.length > 0) ? filteredStudentsList : allStudentsList;
    if (!studentsToExport || studentsToExport.length === 0) {
        alert("No data available to export.");
        return;
    }

    const exportData = studentsToExport.map((s, idx) => {
        const p = s.personal || {};
        const a = s.academic || s.reporting || {};
        const adm = s.admin || {};
        const fac = s.facilities || {};
        const rep = s.reporting || {};
        const fees = s.fees || {};
        const docs = s.documents || {};
        const ar = s.antiragging || s.antiRagging || {};

        const docKeys = Object.keys(docs);
        const uploadedCount = docKeys.filter(k => docs[k] && docs[k].url).length;
        const verifiedCount = docKeys.filter(k => docs[k] && docs[k].status === 'Verified').length;

        const isHostel = (fac.hostelRequired || rep.hostelRequired) === 'Yes' || fac.hostelRequired === true;
        const isTransport = (fac.transportRequired || rep.transportRequired) === 'Yes' || fac.transportRequired === true;

        // Extract Document URLs with complete fallback mapping & Base64 sanitization
        const getUrl = (keys) => {
            for (const k of keys) {
                if (docs[k]) {
                    const u = docs[k].url || (typeof docs[k] === 'string' ? docs[k] : null);
                    if (u) {
                        if (typeof u === 'string' && u.startsWith('data:')) return '[Uploaded Base64 File]';
                        return u;
                    }
                }
            }
            return 'N/A';
        };

        const studentPhotoUrl = getUrl(['studentPhoto', 'photo']);
        const studentSigUrl = getUrl(['studentSignature', 'signature']);
        const parentSigUrl = getUrl(['parentSignature']);
        const tenthUrl = getUrl(['certificate10th', 'tenthCert', 'tenthMarksheet']);
        const twelfthUrl = getUrl(['certificate12th', 'twelfthCert', 'twelfthMarksheet']);
        const tcClcUrl = getUrl(['tcMigration', 'tcClc']);
        const conductUrl = getUrl(['conductCert']);
        const migrationUrl = getUrl(['migrationCert']);
        const rankCardUrl = getUrl(['jeeRankCard']);
        const allotmentUrl = getUrl(['admissionLetter', 'allotmentLetter']);
        const aadhaarDocUrl = getUrl(['aadhaarCard', 'aadhaarDoc']);
        const panDocUrl = getUrl(['panCard', 'panDoc']);
        const rationDocUrl = getUrl(['rationCard', 'rationCardDoc']);
        const cmKisanDocUrl = getUrl(['cmKisanDoc', 'cmKisanCertificate']);
        const casteCertUrl = getUrl(['casteCertificate', 'casteCert']);
        const incomeCertUrl = getUrl(['incomeCertificate', 'incomeCert']);
        const residenceCertUrl = getUrl(['residenceCertificate']);
        const bankPassbookUrl = getUrl(['bankPassbook']);
        const feeReceiptUrl = getUrl(['feeReceipt']);

        // Combine all available document URLs into a single string for quick reference
        const allDocUrlsCombined = docKeys
            .filter(k => docs[k] && (docs[k].url || (typeof docs[k] === 'string' && (docs[k].startsWith('http') || docs[k].startsWith('data:')))))
            .map(k => {
                const u = docs[k].url || docs[k];
                const displayVal = (typeof u === 'string' && u.startsWith('data:')) ? '[Base64 File]' : u;
                return `${k}: ${displayVal}`;
            })
            .join(' | ') || 'None';

        return {
            "Sl No": idx + 1,
            "Student ID": s.id || adm.studentId || 'N/A',
            "Registration No": adm.registrationNumber || 'PENDING',
            "Enrollment No": adm.enrollmentNumber || 'PENDING',
            "Roll No": adm.rollNumber || 'PENDING',
            "Section / Batch": adm.section || 'N/A',
            "Application Status": adm.status || 'IN_PROGRESS',
            "Revert Reason": adm.revertReason || '-',
            "Student Full Name": p.studentFullName || 'N/A',
            "Gender": p.gender || 'N/A',
            "DOB": p.dob || 'N/A',
            "Category": p.category || 'N/A',
            "OTR Number (NSP)": p.otrNumber || 'N/A',
            "Blood Group": p.bloodGroup || ar.bloodGroup || p.bg || 'N/A',
            "Aadhaar Number": p.aadhaarNumber || 'N/A',
            "PAN Number": p.panNumber || 'N/A',
            "ABC ID": p.abcId || 'N/A',
            "Ration Card No": p.rationCardNo || 'N/A',
            "CM Kisan Beneficiary": p.hasCmKisan || 'No',
            "CM Kisan Beneficiary ID": p.cmKisanBeneficiaryId || 'N/A',
            "CM Kisan Beneficiary Name": p.cmKisanBeneficiaryName || 'N/A',
            "CM Kisan Beneficiary Aadhaar": p.cmKisanBeneficiaryAadhaar || 'N/A',
            "Student Mobile": p.studentMobile || 'N/A',
            "Student WhatsApp": p.whatsappNumber || 'N/A',
            "Student Email": p.studentEmail || 'N/A',
            "Father Name": p.fatherName || 'N/A',
            "Father Mobile": p.fatherMobile || 'N/A',
            "Mother Name": p.motherName || 'N/A',
            "Mother Mobile": p.motherMobile || 'N/A',
            "Permanent Address": p.permanentAddress || 'N/A',
            "District": p.district || 'N/A',
            "State": p.state || 'N/A',
            "Pin Code": p.pinCode || 'N/A',
            "Program / Course": a.program || rep.program || 'N/A',
            "Branch / Stream": a.branch || rep.branch || 'N/A',
            "Admission Type": a.admissionType || rep.admissionType || 'Regular',
            "Admission Reference": rep.admissionReference || a.admissionReference || 'Direct',
            "Referrer Name": rep.referrerName || a.referrerName || '-',
            "Academic Session": a.academicSession || rep.academicSession || 'N/A',
            "Academic Year": a.academicYear || rep.academicYear || 'N/A',
            "Reporting Date": rep.reportingDate || 'N/A',
            "Reporting Time": rep.reportingTime || 'N/A',
            "Hostel Required": isHostel ? 'Yes' : 'No',
            "Hostel No": adm.hostelNo || 'N/A',
            "Room No": adm.hostelRoomNo || 'N/A',
            "Transport Required": isTransport ? 'Yes' : 'No',
            "Rider Pass No": adm.riderPassNo || 'N/A',
            "Pickup Stoppage": adm.stoppageName || s.transport?.stoppageName || 'N/A',
            "Tuition Fee (Rs)": fees.tuitionFeeAmount || '0',
            "Tuition Receipt No": fees.tuitionReceiptNumber || 'N/A',
            "Tuition Receipt Date": fees.tuitionReceiptDate || 'N/A',
            "Hostel Fee (Rs)": fees.hostelFeeAmount || '0',
            "Hostel Receipt No": fees.hostelReceiptNumber || 'N/A',
            "Transport Fee (Rs)": fees.transportFeeAmount || '0',
            "Transport Receipt No": fees.transportReceiptNumber || 'N/A',
            "One-Time Fee (Rs)": fees.oneTimeFeeAmount || '0',
            "One-Time Receipt No": fees.oneTimeFeeReceiptNumber || 'N/A',
            "Counselling Fee (Rs)": fees.counsellingFeeAmount || '0',
            "Counselling Receipt No": fees.counsellingFeeReceiptNumber || 'N/A',
            "Anti-Ragging Agreed": ar.agreeRules ? 'Yes' : 'No',
            "Uploaded Documents Count": uploadedCount,
            "Verified Documents Count": verifiedCount,
            "Student Photo URL": studentPhotoUrl,
            "Student Signature URL": studentSigUrl,
            "10th Marksheet URL": tenthUrl,
            "12th / Diploma Certificate URL": twelfthUrl,
            "TC / CLC Certificate URL": tcClcUrl,
            "Conduct Certificate URL": conductUrl,
            "Migration Certificate URL": migrationUrl,
            "JEE / Rank Card URL": rankCardUrl,
            "College Allotment Letter URL": allotmentUrl,
            "Aadhaar Card Document URL": aadhaarDocUrl,
            "PAN Card Document URL": panDocUrl,
            "Ration Card Document URL": rationDocUrl,
            "CM Kisan Document URL": cmKisanDocUrl,
            "Caste Certificate URL": casteCertUrl,
            "Income Certificate URL": incomeCertUrl,
            "Residence Certificate URL": residenceCertUrl,
            "Bank Passbook URL": bankPassbookUrl,
            "Fee Receipt URL": feeReceiptUrl,
            "Parent Signature URL": parentSigUrl,
            "All Document URLs (Combined)": allDocUrlsCombined,
            "Remarks": adm.remarks || '-'
        };
    });

    // Sanitize exportData to prevent cell length > 32767 characters (Excel Limit)
    const EXCEL_CELL_LIMIT = 32000;
    const safeExportData = exportData.map(row => {
        const cleanRow = {};
        for (const [k, v] of Object.entries(row)) {
            if (typeof v === 'string') {
                if (v.startsWith('data:')) {
                    cleanRow[k] = '[Uploaded Base64 File]';
                } else if (v.length > EXCEL_CELL_LIMIT) {
                    cleanRow[k] = v.substring(0, EXCEL_CELL_LIMIT) + '...';
                } else {
                    cleanRow[k] = v;
                }
            } else {
                cleanRow[k] = v;
            }
        }
        return cleanRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(safeExportData);

    // Auto-fit column widths
    const colWidths = Object.keys(exportData[0]).map(key => {
        const maxLen = Math.max(
            key.length,
            ...exportData.map(row => String(row[key] || '').length)
        );
        return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Student Master Report");
    XLSX.writeFile(workbook, `BEC_Complete_Student_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}
window.exportToExcel = exportToExcel;


async function loadAdminAccountsList() {
    const container = document.getElementById('admin-accounts-list-container');
    if (!container) return;

    container.innerHTML = '<div style="text-align: center; color: #94A3B8; font-size: 0.85rem; padding: 12px;">Loading admin accounts...</div>';

    try {
        const firestoreAdmins = await FirestoreService.getAllAdmins();
        let html = '';

        // Add whitelisted super admin
        OFFICIAL_ADMIN_EMAILS.forEach(email => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #EFF6FF; padding: 10px 14px; border-radius: 8px; border: 1px solid #BFDBFE;">
                    <div>
                        <strong style="color: #1E3A8A; font-size: 0.88rem; display: block;">${Sanitizer.sanitizeString(email)}</strong>
                        <span style="font-size: 0.75rem; color: #2563EB; font-weight: 600;">Super Administrator (Primary)</span>
                    </div>
                    <span style="font-size: 0.75rem; background: #DBEAFE; color: #1E40AF; padding: 3px 10px; border-radius: 12px; font-weight: 700;">👑 SUPER ADMIN</span>
                </div>
            `;
        });

        if (firestoreAdmins && firestoreAdmins.length > 0) {
            firestoreAdmins.forEach(adm => {
                const cleanEmail = (adm.email || '').toLowerCase().trim();
                if (OFFICIAL_ADMIN_EMAILS.includes(cleanEmail) || cleanEmail === 'bhagyabratagantayat@gmail.com') return;
                const isBlocked = adm.isBlocked === true;
                const statusBadge = isBlocked
                    ? '<span style="font-size: 0.72rem; background: #FEE2E2; color: #991B1B; padding: 2px 8px; border-radius: 12px; font-weight: 700;">⛔ BLOCKED</span>'
                    : '<span style="font-size: 0.72rem; background: #D1FAE5; color: #065F46; padding: 2px 8px; border-radius: 12px; font-weight: 700;">✅ ACTIVE</span>';
                
                const blockToggleBtn = isBlocked
                    ? `<button class="btn btn-sm btn-toggle-block-admin" data-id="${adm.docId}" data-email="${adm.email}" data-blocked="false" style="padding: 4px 10px; font-size: 0.75rem; background: #10B981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🟢 Unblock</button>`
                    : `<button class="btn btn-sm btn-toggle-block-admin" data-id="${adm.docId}" data-email="${adm.email}" data-blocked="true" style="padding: 4px 10px; font-size: 0.75rem; background: #F59E0B; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">⛔ Block</button>`;

                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: ${isBlocked ? '#FEF2F2' : 'white'}; padding: 10px 14px; border-radius: 8px; border: 1px solid ${isBlocked ? '#FECACA' : '#E2E8F0'}; transition: all 0.2s;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                                <strong style="color: #1E293B; font-size: 0.88rem;">${Sanitizer.sanitizeString(adm.displayName || adm.email)}</strong>
                                ${statusBadge}
                            </div>
                            <span style="font-size: 0.75rem; color: #64748B;">${Sanitizer.sanitizeString(adm.email)} &bull; Sub-Admin</span>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            ${blockToggleBtn}
                            <button class="btn btn-sm btn-delete-admin-account" data-id="${adm.docId}" data-email="${adm.email}" style="padding: 4px 10px; font-size: 0.75rem; background: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5; border-radius: 6px; cursor: pointer;">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html;

        // Attach Block/Unblock Listeners
        document.querySelectorAll('.btn-toggle-block-admin').forEach(btn => {
            btn.onclick = async (e) => {
                const docId = e.currentTarget.dataset.id;
                const email = e.currentTarget.dataset.email;
                const shouldBlock = e.currentTarget.dataset.blocked === 'true';
                
                const actionText = shouldBlock ? 'BLOCK' : 'UNBLOCK';
                if (confirm(`Are you sure you want to ${actionText} sub-admin "${email}"?`)) {
                    try {
                        await FirestoreService.setSubAdminBlockedStatus(docId, email, shouldBlock);
                        alert(`Success! Sub-Admin ${email} is now ${actionText}ED.`);
                        await loadAdminAccountsList();
                    } catch(err) {
                        alert(`Failed to ${actionText.toLowerCase()} sub-admin: ` + err.message);
                    }
                }
            };
        });

        // Attach Delete Listeners
        document.querySelectorAll('.btn-delete-admin-account').forEach(btn => {
            btn.onclick = async (e) => {
                const docId = e.currentTarget.dataset.id;
                const email = e.currentTarget.dataset.email;
                if (confirm(`Are you sure you want to remove admin privileges for ${email}?`)) {
                    try {
                        await FirestoreService.deleteAdmin(docId, email);
                        alert(`Admin ${email} removed successfully.`);
                        await loadAdminAccountsList();
                    } catch(err) {
                        alert("Failed to delete admin: " + err.message);
                    }
                }
            };
        });

    } catch(err) {
        console.error("Error loading admin accounts list:", err);
        container.innerHTML = '<div style="color: #EF4444; font-size: 0.85rem;">Failed to load admin list.</div>';
    }
}

export async function openAdminManagementModal() {
    const modalOverlay = document.getElementById('admin-management-modal-overlay');
    if (!modalOverlay) return;
    modalOverlay.style.display = 'flex';
    await loadAdminAccountsList();
}
window.openAdminManagementModal = openAdminManagementModal;

export function closeAdminManagementModal() {
    const modalOverlay = document.getElementById('admin-management-modal-overlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
}
window.closeAdminManagementModal = closeAdminManagementModal;

function setupAdminManagementModal() {
    const modalOverlay = document.getElementById('admin-management-modal-overlay');
    const closeModalBtn = document.getElementById('btn-close-admin-modal');
    const createAdminForm = document.getElementById('form-create-admin');

    if (closeModalBtn) {
        closeModalBtn.onclick = closeAdminManagementModal;
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeAdminManagementModal();
        });
    }

    if (createAdminForm) {
        createAdminForm.onsubmit = async (e) => {
            e.preventDefault();
            alert("🔒 Admin Registration Locked: Creation of new Sub-Admin accounts has been permanently restricted by system security policy!");
            return false;
        };
    }
}

export function openChangePasswordModal() {
    const modalOverlay = document.getElementById('change-password-modal-overlay');
    const form = document.getElementById('form-change-admin-password');
    const errorMsg = document.getElementById('change-pass-error-msg');
    const successMsg = document.getElementById('change-pass-success-msg');
    if (!modalOverlay) return;
    if (form) form.reset();
    if (errorMsg) errorMsg.style.display = 'none';
    if (successMsg) successMsg.style.display = 'none';
    modalOverlay.style.display = 'flex';
}
window.openChangePasswordModal = openChangePasswordModal;

export function closeChangePasswordModal() {
    const modalOverlay = document.getElementById('change-password-modal-overlay');
    if (modalOverlay) modalOverlay.style.display = 'none';
}
window.closeChangePasswordModal = closeChangePasswordModal;

function setupChangePasswordModal() {
    const modalOverlay = document.getElementById('change-password-modal-overlay');
    const closeBtn = document.getElementById('btn-close-change-pass-modal');
    const cancelBtn = document.getElementById('btn-cancel-change-pass');
    const form = document.getElementById('form-change-admin-password');
    const errorMsg = document.getElementById('change-pass-error-msg');
    const successMsg = document.getElementById('change-pass-success-msg');
    const submitBtn = document.getElementById('btn-submit-change-pass');

    if (closeBtn) closeBtn.onclick = closeChangePasswordModal;
    if (cancelBtn) cancelBtn.onclick = closeChangePasswordModal;

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeChangePasswordModal();
        });
    }

    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPass = document.getElementById('admin-current-password')?.value || '';
        const newPass = document.getElementById('admin-new-password')?.value || '';
        const confirmPass = document.getElementById('admin-confirm-password')?.value || '';

        if (errorMsg) errorMsg.style.display = 'none';
        if (successMsg) successMsg.style.display = 'none';

        if (newPass !== confirmPass) {
            if (errorMsg) {
                errorMsg.textContent = '❌ New password and confirmation password do not match!';
                errorMsg.style.display = 'block';
            }
            return;
        }

        if (newPass.length < 6) {
            if (errorMsg) {
                errorMsg.textContent = '❌ Password must be at least 6 characters long.';
                errorMsg.style.display = 'block';
            }
            return;
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Updating Password...';
            }

            await AuthService.changePassword(currentPass, newPass);

            if (successMsg) {
                successMsg.textContent = '✅ Password updated successfully! Your new password is now active.';
                successMsg.style.display = 'block';
            }

            setTimeout(() => {
                closeChangePasswordModal();
            }, 1800);

        } catch (err) {
            console.error("Change Password error:", err);
            let displayErr = err.message || 'Failed to update password. Please check your current password.';
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                displayErr = '❌ Incorrect Current Password. Please try again.';
            } else if (err.code === 'auth/weak-password') {
                displayErr = '❌ Weak Password. Please use at least 6 characters.';
            }
            if (errorMsg) {
                errorMsg.textContent = displayErr;
                errorMsg.style.display = 'block';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
            }
        }
    });
}

function initServerStatusCheck() {
    const serverBaseUrl = (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl)
        ? window.APP_CONFIG.apiBaseUrl
        : window.location.origin;

    const indicator = document.getElementById('server-status-indicator');
    const dot = document.getElementById('server-status-dot');
    const text = document.getElementById('server-status-text');

    async function pingServer() {
        if (!indicator || !dot || !text) return;
        try {
            const startTime = Date.now();
            const res = await fetch(`${serverBaseUrl}/api/health`, { cache: 'no-store' });
            const latency = Date.now() - startTime;

            if (res.ok) {
                indicator.style.background = 'rgba(16, 185, 129, 0.2)';
                indicator.style.borderColor = 'rgba(16, 185, 129, 0.5)';
                indicator.style.color = '#10B981';
                indicator.title = `Server Online & Active (${latency}ms latency) - Click to re-check`;
                dot.style.backgroundColor = '#10B981';
                dot.style.boxShadow = '0 0 8px #10B981';
                dot.style.animation = 'pulse-green 2s infinite';
                text.textContent = 'Server Active';
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (error) {
            indicator.style.background = 'rgba(239, 68, 68, 0.2)';
            indicator.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            indicator.style.color = '#EF4444';
            indicator.title = 'Server Unreachable / Offline - Click to re-check';
            dot.style.backgroundColor = '#EF4444';
            dot.style.boxShadow = '0 0 8px #EF4444';
            dot.style.animation = 'pulse-red 1.5s infinite';
            text.textContent = 'Server Offline';
        }
    }

    if (indicator) {
        indicator.onclick = () => pingServer();
    }

    // Ping immediately and repeat every 20 seconds
    pingServer();
    setInterval(pingServer, 20000);
}

// Global click event delegation for Admin Action Buttons & Password Eye Toggle
document.addEventListener('click', (e) => {
    // 1. Change Password Button
    if (e.target.closest('#admin-change-pass-btn') || e.target.closest('.btn-open-change-pass')) {
        openChangePasswordModal();
        return;
    }

    // 2. Manage Admins Button
    if (e.target.closest('#admin-manage-admins-btn') || e.target.closest('.btn-open-manage-admins')) {
        openAdminManagementModal();
        return;
    }

    // 3. Password Eye Visibility Toggle Buttons
    const toggleBtn = e.target.closest('.btn-toggle-password');
    if (toggleBtn) {
        const targetId = toggleBtn.dataset.target;
        const input = document.getElementById(targetId);
        if (!input) return;

        if (input.type === 'password') {
            input.type = 'text';
            toggleBtn.textContent = '🙈';
            toggleBtn.title = 'Hide Password';
        } else {
            input.type = 'password';
            toggleBtn.textContent = '👁️';
            toggleBtn.title = 'Show Password';
        }
    }
});


