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
    if (e.detail && (e.detail.nextStep === 'transport' || e.detail.step === 'transport')) {
        bindDataToForm();
    }
});

window.addEventListener('step-active', (e) => {
    if (e.detail && (e.detail.nextStep === 'transport' || e.detail.step === 'transport')) {
        bindDataToForm();
    }
});

function renderCards() {
    const prefilledContent = `
        <div class="grid-2">
            ${Input({ id: 'transStudentName', label: 'Student Name', disabled: true })}
            ${Input({ id: 'transRegdNo', label: 'Registration Number', disabled: true, placeholder: 'PENDING BY COLLEGE' })}
            ${Input({ id: 'transFatherName', label: 'Father Name', disabled: true })}
            ${Input({ id: 'transMobile', label: 'Mobile Number', disabled: true })}
            ${Input({ id: 'transCourse', label: 'Course', disabled: true })}
            ${Input({ id: 'transBranch', label: 'Branch', disabled: true })}
            ${Input({ id: 'transSession', label: 'Academic Session', disabled: true })}
            <div style="grid-column: 1 / -1;">
                ${Input({ id: 'transAddress', label: 'Address for Correspondence', disabled: true })}
            </div>
        </div>
    `;
    const cardInfo = document.getElementById('card-transport-prefilled-info');
    if (cardInfo) cardInfo.innerHTML = Card({ title: 'Student Information (Auto-filled from Master Data)', content: prefilledContent });

    const requirementsContent = `
        <div class="grid-2">
            ${Input({ id: 'stoppageName', name: 'stoppageName', label: 'Stoppage / Bus Stop Name', required: true })}
            ${Input({ id: 'pickupLocation', name: 'pickupLocation', label: 'Pickup Location', required: true })}
            ${Input({ id: 'dropLocation', name: 'dropLocation', label: 'Drop Location', required: true })}
        </div>
    `;
    const cardReq = document.getElementById('card-transport-requirements');
    if (cardReq) cardReq.innerHTML = Card({ title: 'Transport Specific Requirements', content: requirementsContent });
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

    const nameEl = document.getElementById('transStudentName');
    const regEl = document.getElementById('transRegdNo');
    const fatherEl = document.getElementById('transFatherName');
    const mobEl = document.getElementById('transMobile');
    const courseEl = document.getElementById('transCourse');
    const branchEl = document.getElementById('transBranch');
    const sessEl = document.getElementById('transSession');
    const addrEl = document.getElementById('transAddress');

    if (nameEl) nameEl.value = studentName;
    if (regEl) regEl.value = regNo;
    if (fatherEl) fatherEl.value = fatherName;
    if (mobEl) mobEl.value = mobile;
    if (courseEl) courseEl.value = course;
    if (branchEl) branchEl.value = branch;
    if (sessEl) sessEl.value = session;
    if (addrEl) addrEl.value = address;

    const stopEl = document.getElementById('stoppageName');
    const pickEl = document.getElementById('pickupLocation');
    const dropEl = document.getElementById('dropLocation');

    if (stopEl) stopEl.value = data.transport?.stoppageName || '';
    if (pickEl) pickEl.value = data.transport?.pickupLocation || '';
    if (dropEl) dropEl.value = data.transport?.dropLocation || '';
}

function setupListeners() {
    const form = document.getElementById('transport-form');
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
        Store.update('transport', name, val.trim());
    }
}

function validateForm() {
    const form = document.getElementById('transport-form');
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

    if (!isValid) {
        alert('Please fill in required transport stoppage details.');
    }
    return isValid;
}

function navigateNext() {
    Store.save();
    window.dispatchEvent(new CustomEvent('navigate-step', { detail: { nextStep: 'antiragging' } }));
}
