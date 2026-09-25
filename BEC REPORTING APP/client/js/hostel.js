import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Card } from './components/Card.js';
import { Input } from './components/Input.js';
import { Store } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
    renderCards();
    bindDataToForm();
    setupListeners();
});

window.addEventListener('navigate-step', (e) => {
    if (e.detail && (e.detail.nextStep === 'hostel' || e.detail.step === 'hostel')) {
        bindDataToForm();
    }
});

window.addEventListener('step-active', (e) => {
    if (e.detail && (e.detail.nextStep === 'hostel' || e.detail.step === 'hostel')) {
        bindDataToForm();
    }
});

function renderCards() {
    const prefilledContent = `
        <div class="grid-2">
            ${Input({ id: 'hostelStudentName', label: 'Student Name', disabled: true })}
            ${Input({ id: 'hostelRegdNo', label: 'Registration Number', disabled: true, placeholder: 'PENDING BY COLLEGE' })}
            ${Input({ id: 'hostelFatherName', label: 'Father Name', disabled: true })}
            ${Input({ id: 'hostelMobile', label: 'Mobile Number', disabled: true })}
            ${Input({ id: 'hostelCourse', label: 'Course', disabled: true })}
            ${Input({ id: 'hostelBranch', label: 'Branch', disabled: true })}
            ${Input({ id: 'hostelSession', label: 'Academic Session', disabled: true })}
            <div style="grid-column: 1 / -1;">
                ${Input({ id: 'hostelAddress', label: 'Address for Correspondence', disabled: true })}
            </div>
        </div>
    `;
    const cardInfo = document.getElementById('card-hostel-prefilled-info');
    if (cardInfo) cardInfo.innerHTML = Card({ title: 'Student Information (Auto-filled from Master Data)', content: prefilledContent });

    const requirementsContent = `
        <div class="grid-2">
            ${Input({ id: 'medicalCondition', name: 'medicalCondition', label: 'Medical Condition (If any)', placeholder: 'e.g. None / Asthma' })}
            ${Input({ id: 'emergencyContactPerson', name: 'emergencyContactPerson', label: 'Emergency Contact Person', required: true })}
            ${Input({ id: 'emergencyContactNumber', name: 'emergencyContactNumber', label: 'Emergency Contact Phone Number', type: 'tel', required: true })}
        </div>
    `;
    const cardReq = document.getElementById('card-hostel-requirements');
    if (cardReq) cardReq.innerHTML = Card({ title: 'Hostel Specific Requirements', content: requirementsContent });
}

function bindDataToForm() {
    Store.propagateSharedData();
    const data = Store.data || {};
    const p = data.personal || {};
    const r = data.reporting || {};
    const adm = data.admin || {};

    const domName = document.getElementById('studentFullName')?.value;
    const domFather = document.getElementById('fatherName')?.value;
    const domMob = document.getElementById('studentMobile')?.value;
    const domFatherMob = document.getElementById('fatherMobile')?.value;
    const domCourse = document.getElementById('program')?.value;
    const domBranch = document.getElementById('branch')?.value;
    const domSession = document.getElementById('academicSession')?.value;
    const domAddress = document.getElementById('permanentAddress')?.value;

    const studentName = p.studentFullName || data.studentFullName || data.name || domName || '';
    const regNo = adm.registrationNumber || data.registrationNumber || 'PENDING BY COLLEGE';
    const fatherName = p.fatherName || data.fatherName || domFather || '';
    const mobile = p.studentMobile || data.studentMobile || data.mobile || domMob || '';
    const course = r.program || data.program || domCourse || '';
    const branch = r.branch || data.branch || domBranch || '';
    const session = r.academicSession || data.academicSession || domSession || '';
    const address = p.permanentAddress || data.permanentAddress || domAddress || '';

    const nameEl = document.getElementById('hostelStudentName');
    const regEl = document.getElementById('hostelRegdNo');
    const fatherEl = document.getElementById('hostelFatherName');
    const mobEl = document.getElementById('hostelMobile');
    const courseEl = document.getElementById('hostelCourse');
    const branchEl = document.getElementById('hostelBranch');
    const sessEl = document.getElementById('hostelSession');
    const addrEl = document.getElementById('hostelAddress');

    if (nameEl) nameEl.value = studentName;
    if (regEl) regEl.value = regNo;
    if (fatherEl) fatherEl.value = fatherName;
    if (mobEl) mobEl.value = mobile;
    if (courseEl) courseEl.value = course;
    if (branchEl) branchEl.value = branch;
    if (sessEl) sessEl.value = session;
    if (addrEl) addrEl.value = address;

    const medEl = document.getElementById('medicalCondition');
    const emPersonEl = document.getElementById('emergencyContactPerson');
    const emNumEl = document.getElementById('emergencyContactNumber');

    if (medEl) medEl.value = data.hostel?.medicalCondition || '';
    if (emPersonEl) emPersonEl.value = data.hostel?.emergencyContactPerson || fatherName || '';
    if (emNumEl) emNumEl.value = data.hostel?.emergencyContactNumber || p.fatherMobile || domFatherMob || mobile || '';
}

function setupListeners() {
    const form = document.getElementById('hostel-form');
    if (!form) return;

    form.addEventListener('input', (e) => {
        saveField(e.target);
    });

    form.addEventListener('change', (e) => {
        saveField(e.target);
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateForm()) {
            navigateNext();
        }
    });
}

function saveField(element) {
    if (element.disabled) return;
    const name = element.name || element.id;
    let val = element.value;
    if (name) {
        Store.update('hostel', name, val.trim());
    }
}

function validateForm() {
    const form = document.getElementById('hostel-form');
    let isValid = true;

    document.querySelectorAll('.validation-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-control').forEach(el => el.style.borderColor = 'var(--border-color)');

    if (!form.checkValidity()) {
        form.querySelectorAll(':invalid').forEach(el => {
            if (el.id) {
                el.style.borderColor = 'var(--danger)';
                const err = document.getElementById(`${el.id}-error`);
                if (err) {
                    err.textContent = 'This field is required.';
                    err.style.display = 'block';
                }
            }
        });
        isValid = false;
    }

    const emergency = document.getElementById('emergencyContactNumber');
    if (emergency && emergency.value && !/^\d{10}$/.test(emergency.value.trim())) {
        showError('emergencyContactNumber', 'Emergency Contact must be exactly 10 digits');
        isValid = false;
    }

    if (!isValid) {
        alert('Please complete required emergency contact information.');
    }
    return isValid;
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = 'var(--danger)';
    const err = document.getElementById(`${id}-error`);
    if (err) {
        err.textContent = message;
        err.style.display = 'block';
    }
}

function navigateNext() {
    Store.save();
    const tReq = Store.data.facilities?.transportRequired || Store.data.reporting?.transportRequired || 'No';
    let nextStep = 'antiragging';
    if (tReq === 'Yes') {
        nextStep = 'transport';
    }
    window.dispatchEvent(new CustomEvent('navigate-step', { detail: { nextStep } }));
}
