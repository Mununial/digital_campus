/**
 * Central State Management for BEC SRMS
 * Manages the global `studentData` object and auto-saves to LocalStorage.
 */

const STORAGE_KEY = 'bec_srms_studentData';

export const FIELD_SECTION_MAP = {
    // Reporting & Academic Information
    reportingDate: 'reporting',
    reportingTime: 'reporting',
    academicSession: 'reporting',
    academicYear: 'reporting',
    program: 'reporting',
    branch: 'reporting',
    admissionType: 'reporting',
    admissionReference: 'reporting',
    referrerName: 'reporting',
    hostelRequired: 'facilities',
    transportRequired: 'facilities',

    // Personal & Contact Details
    studentFullName: 'personal',
    fatherName: 'personal',
    motherName: 'personal',
    dob: 'personal',
    gender: 'personal',
    bloodGroup: 'personal',
    category: 'personal',
    aadhaarNumber: 'personal',
    abcId: 'personal',
    panNumber: 'personal',
    otrNumber: 'personal',
    rationCardNo: 'personal',
    hasCmKisan: 'personal',
    cmKisanBeneficiaryId: 'personal',
    cmKisanBeneficiaryName: 'personal',
    cmKisanBeneficiaryAadhaar: 'personal',
    studentMobile: 'personal',
    whatsappNumber: 'personal',
    fatherMobile: 'personal',
    motherMobile: 'personal',
    studentEmail: 'personal',
    permanentAddress: 'personal',
    district: 'personal',
    state: 'personal',
    pinCode: 'personal',

    // Facilities Choice
    facilityHostel: 'facilities',
    facilityTransport: 'facilities',

    // Hostel Information
    medicalCondition: 'hostel',
    emergencyContactPerson: 'hostel',
    emergencyContactNumber: 'hostel',

    // Transport Information
    stoppageName: 'transport',
    pickupLocation: 'transport',
    dropLocation: 'transport',
    nearestBusStop: 'transport',

    // Anti-Ragging Affidavit
    agreeRules: 'antiragging',
    agreeDiscipline: 'antiragging',
    agreeTrueInfo: 'antiragging',
    agreeFollow: 'antiragging'
};

export const defaultStudentData = {
    id: '',
    role: 'student',
    userRole: 'student',
    isAdmin: false,
    admin: {
        registrationNumber: null,
        enrollmentNumber: null,
        rollNumber: null,
        studentId: null,
        section: '',
        remarks: '',
        status: 'IN_PROGRESS',
        verified: false,
        idCardGenerated: false,
        revertReason: '',
        uid: ''
    },
    reporting: {
        reportingDate: '',
        reportingTime: '',
        academicSession: '',
        academicYear: '',
        program: '',
        branch: '',
        admissionType: 'Regular',
        admissionReference: 'Direct',
        referrerName: '',
        hostelRequired: 'No',
        transportRequired: 'No'
    },
    facilities: {
        hostelRequired: 'No',
        transportRequired: 'No'
    },
    fees: {
        tuitionFeeAmount: '',
        tuitionReceiptNumber: '',
        tuitionReceiptDate: '',
        hostelFeeAmount: '',
        hostelReceiptNumber: '',
        hostelReceiptDate: '',
        transportFeeAmount: '',
        transportReceiptNumber: '',
        transportReceiptDate: '',
        oneTimeFeeAmount: '',
        oneTimeFeeReceiptNumber: '',
        oneTimeFeeReceiptDate: '',
        counsellingFeeAmount: '',
        counsellingFeeReceiptNumber: '',
        counsellingFeeReceiptDate: '',
        additionalFees: []
    },
    personal: {
        studentFullName: '',
        fatherName: '',
        motherName: '',
        category: '',
        aadhaarNumber: '',
        abcId: '',
        panNumber: '',
        otrNumber: '',
        rationCardNo: '',
        hasCmKisan: 'No',
        cmKisanBeneficiaryId: '',
        cmKisanBeneficiaryName: '',
        cmKisanBeneficiaryAadhaar: '',
        studentMobile: '',
        whatsappNumber: '',
        fatherMobile: '',
        motherMobile: '',
        studentEmail: '',
        permanentAddress: '',
        district: '',
        state: '',
        pinCode: '',
        dob: '',
        gender: '',
        bloodGroup: ''
    },
    documents: {
        certificate10th: false,
        certificate12th: false,
        tcMigration: false,
        aadhaar: false,
        pan: false,
        rationCard: false,
        cmKisanDoc: false,
        passportPhotos: false,
        admissionLetter: false,
        residenceCertificate: false,
        casteCertificate: false,
        incomeCertificate: false,
        bankDetails: false,
        studentPhoto: false,
        studentSignature: false,
        parentSignature: false
    },
    hostel: {
        medicalCondition: '',
        emergencyContactPerson: '',
        emergencyContactNumber: '',
        parentConsent: false,
        studentDeclaration: false
    },
    transport: {
        stoppageName: '',
        pickupLocation: '',
        dropLocation: '',
        nearestBusStop: '',
        emergencyContact: '',
        studentDeclaration: false
    },
    antiragging: {
        agreeRules: false,
        agreeDiscipline: false,
        agreeTrueInfo: false,
        agreeFollow: false,
        bloodGroup: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        parentGuardianName: '',
        relationship: 'Father'
    },
    submission: {
        isSubmitted: false,
        submissionDate: null
    },
    idCard: {
        generated: false,
        generatedAt: null
    }
};

function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    const result = Array.isArray(target) ? [...target] : { ...target };
    
    for (const key of Object.keys(source)) {
        if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else if (source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}

export function ensureCompleteStructure(data) {
    const base = JSON.parse(JSON.stringify(defaultStudentData));
    if (!data || typeof data !== 'object') return base;
    return deepMerge(base, data);
}

// Generate UUID helper
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize internal state from LocalStorage or defaults
let rawStored = null;
try {
    rawStored = JSON.parse(localStorage.getItem(STORAGE_KEY));
} catch (e) {
    console.warn('Could not parse stored data:', e);
}

let internalData = ensureCompleteStructure(rawStored);

export const Store = {
    data: internalData,

    getStudentId() {
        if (this.data.admin && this.data.admin.uid) {
            return this.data.admin.uid;
        }
        if (this.data.id) {
            return this.data.id;
        }
        if (!this.data.admin.studentId) {
            this.data.admin.studentId = generateUUID();
            this.saveLocally();
        }
        return this.data.admin.studentId;
    },

    saveLocally() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    },

    save() {
        this.propagateSharedData();
        this.saveLocally();
        if (window.SyncService && window.SyncService.syncNow) {
            window.SyncService.syncNow();
        }
    },

    markSynced() {},

    update(section, key, value) {
        if (!this.data[section] || typeof this.data[section] !== 'object') {
            this.data[section] = {};
        }
        this.data[section][key] = value;
        this.propagateSharedData();
        this.save();
    },

    syncDOMInputs(container = document) {
        if (!container) return;
        const inputs = container.querySelectorAll('input:not([type="file"]), select, textarea');
        inputs.forEach(el => {
            const name = el.name || el.id;
            if (!name) return;
            let val = el.type === 'checkbox' ? el.checked : el.value;
            if (typeof val === 'string') val = val.trim();
            if (val === '') return;

            const sec = FIELD_SECTION_MAP[name];
            if (sec) {
                if (!this.data[sec]) this.data[sec] = {};
                this.data[sec][name] = val;
            } else {
                for (const s of ['reporting', 'personal', 'fees', 'facilities', 'hostel', 'transport', 'antiragging']) {
                    if (this.data[s] && name in this.data[s]) {
                        this.data[s][name] = val;
                        break;
                    }
                }
            }
        });
        this.propagateSharedData();
        this.saveLocally();
    },

    propagateSharedData() {
        const p = this.data.personal || {};
        const r = this.data.reporting || {};
        const f = this.data.facilities || {};

        // Sync Root Aliases
        const studentName = p.studentFullName || p.fullName || this.data.studentFullName || this.data.name || '';
        if (studentName) {
            this.data.name = studentName;
            this.data.studentFullName = studentName;
            if (!p.studentFullName) p.studentFullName = studentName;
        }

        const studentEmail = p.studentEmail || p.email || this.data.email || '';
        if (studentEmail) {
            this.data.email = studentEmail;
            if (!p.studentEmail) p.studentEmail = studentEmail;
        }

        const courseVal = r.program || r.course || this.data.program || '';
        const branchVal = r.branch || r.department || this.data.branch || '';
        const sessVal = r.academicSession || r.session || this.data.academicSession || '';

        // Sync Facilities across sections
        const hReq = f.hostelRequired || r.hostelRequired || 'No';
        const tReq = f.transportRequired || r.transportRequired || 'No';
        if (!this.data.facilities) this.data.facilities = {};
        if (!this.data.reporting) this.data.reporting = {};
        this.data.facilities.hostelRequired = hReq;
        this.data.facilities.transportRequired = tReq;
        this.data.reporting.hostelRequired = hReq;
        this.data.reporting.transportRequired = tReq;

        // Sync Hostel fallbacks
        if (this.data.hostel) {
            if (!this.data.hostel.emergencyContactPerson && (p.fatherName || p.motherName)) {
                this.data.hostel.emergencyContactPerson = p.fatherName || p.motherName;
            }
            if (!this.data.hostel.emergencyContactNumber && (p.fatherMobile || p.studentMobile)) {
                this.data.hostel.emergencyContactNumber = p.fatherMobile || p.studentMobile;
            }
        }

        // Sync Transport fallbacks
        if (this.data.transport) {
            if (!this.data.transport.emergencyContact && (p.fatherMobile || p.studentMobile)) {
                this.data.transport.emergencyContact = p.fatherMobile || p.studentMobile;
            }
        }

        // Sync Anti-Ragging fallbacks
        if (this.data.antiragging) {
            if (!this.data.antiragging.parentGuardianName && (p.fatherName || p.motherName)) {
                this.data.antiragging.parentGuardianName = p.fatherName || p.motherName;
            }
            if (!this.data.antiragging.emergencyContactNumber && (p.fatherMobile || p.studentMobile)) {
                this.data.antiragging.emergencyContactNumber = p.fatherMobile || p.studentMobile;
            }
            if (!this.data.antiragging.bloodGroup && p.bloodGroup) {
                this.data.antiragging.bloodGroup = p.bloodGroup;
            }
        }
    },

    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        internalData = JSON.parse(JSON.stringify(defaultStudentData));
        this.data = internalData;
    },

    overrideData(newData) {
        this.data = ensureCompleteStructure(newData);
        this.propagateSharedData();
        this.saveLocally();
    },

    getAllStudents() {
        const students = [];
        if (this.data && this.data.personal && (this.data.personal.studentFullName || this.data.personal.studentEmail)) {
            students.push(this.data);
        }
        return students;
    }
};

import { SyncService } from './services/syncService.js';
window.SyncService = SyncService;

