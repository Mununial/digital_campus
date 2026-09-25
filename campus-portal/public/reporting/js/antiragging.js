import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Card } from './components/Card.js';
import { Input } from './components/Input.js';
import { Checkbox } from './components/Checkbox.js';
import { Store } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
    renderCards();
    bindDataToForm();
    setupListeners();
});

window.addEventListener('navigate-step', (e) => {
    if (e.detail && (e.detail.nextStep === 'antiragging' || e.detail.step === 'antiragging')) {
        bindDataToForm();
    }
});

window.addEventListener('step-active', (e) => {
    if (e.detail && (e.detail.nextStep === 'antiragging' || e.detail.step === 'antiragging')) {
        bindDataToForm();
    }
});

function renderCards() {
    // Card 1: Student Information (Auto-filled)
    const studentInfoContent = `
        <div class="grid-2">
            ${Input({ id: 'arStudentFullName', label: 'Student Name', disabled: true })}
            ${Input({ id: 'arRegistrationNumber', label: 'Registration Number', disabled: true, placeholder: 'PENDING BY COLLEGE' })}
            ${Input({ id: 'arFatherName', label: 'Parent / Guardian Name', disabled: true })}
            ${Input({ id: 'arProgram', label: 'Course', disabled: true })}
            ${Input({ id: 'arBranch', label: 'Branch', disabled: true })}
            ${Input({ id: 'arAcademicSession', label: 'Session', disabled: true })}
            ${Input({ id: 'arStudentMobile', label: 'Student Mobile', disabled: true })}
            ${Input({ id: 'arFatherMobile', label: 'Parent Mobile', disabled: true })}
            ${Input({ id: 'arStudentEmail', label: 'Email', disabled: true })}
            <div style="grid-column: 1 / -1;">
                ${Input({ id: 'arPermanentAddress', label: 'Address', disabled: true })}
            </div>
        </div>
    `;
    const cardInfo = document.getElementById('card-ar-student-info');
    if (cardInfo) cardInfo.innerHTML = Card({ title: '1. Student Information (Auto-filled from Master Data)', content: studentInfoContent });

    // Card 2: 17 Legal Clauses Declaration
    const declarationContent = `
        <div class="scrollable-declaration" style="max-height: 280px; overflow-y: auto; padding: 12px; border: 1px solid var(--border-color); background-color: #fafafa; border-radius: 4px; margin-bottom: var(--space-4); font-size: 0.88rem; line-height: 1.5;">
            <p style="margin-top:0; color: var(--primary-blue);"><strong>BHUBANESWAR ENGINEERING COLLEGE (BEC) - UNDERTAKING FROM STUDENT AND GUARDIAN (ANTI-RAGGING AFFIDAVIT)</strong></p>
            <p>1. That I have thorough knowledge about UGC/AICTE "Regulations on Curbing the Menace of Ragging in Higher Education Institutions, 2011".</p>
            <p>2. I have, in particular, perused clause 3 of the regulation and aware as to what constitutes ragging.</p>
            <p>3. I have also in particular, perused clause 9.1 of the Regulations and fully aware of the penal and administrative action that is liable to be taken against me in case I am found guilty of or abetting ragging, actively or passively, or being part of a conspiracy to promote ragging.</p>
            <p>4. I hereby solemnly aver and undertake that if found guilty of ragging I am liable for punishment according to clause 9.1 of the Regulations, without prejudice to any other criminal action that may be taken under any penal law.</p>
            <p>5. I hereby declare that I have not been expelled or debarred from admission in any institution in the country on account of being found guilty of abetting or being part of conspiracy to promote ragging.</p>
            <p>6. I shall abide by the admissible rules and regulations of Bhubaneswar Engineering College and follow the code of conduct for students.</p>
            <p>7. That I have read and understood the directives of the Hon'ble Supreme Court of India on anti ragging.</p>
            <p>8. That I understood the meaning of Ragging and know that ragging in any form is a punishable offence banned by Court of law.</p>
            <p>9. That I shall not resort to ragging in any form at any place and shall abide by the rules/ laws prescribed by Courts, Government, and Institute.</p>
            <p>10. I shall not indulge in any behavior or act that may come under the definition of indiscipline.</p>
            <p>11. That I shall participate fully and whole-heartedly in sports, games, and extra-curricular activities.</p>
            <p>12. That I shall have minimum attendance of 75% in order to qualify for examinations.</p>
            <p>13. That I shall never use violence or threat of violence or pressure in any disputes with co-students.</p>
            <p>14. That in any disputes with fellow students, I shall accept the judgment of the college authorities.</p>
            <p>15. I shall not resort to students strike or instigate other co-students to resort to strike.</p>
            <p>16. I shall deposit college fee/hostel fee and all other dues on time as per college rules.</p>
            <p>17. I shall not demand for placement midway or after completion of study, and declare I am not suffering from any serious/contagious ailment.</p>
        </div>
        <div style="display:flex; flex-direction:column; gap:var(--space-2);">
            ${Checkbox({ id: 'agreeRules', name: 'agreeRules', label: 'I have read, understood, and solemnly accept the 17 legal clauses of the Anti-Ragging Affidavit.', required: true })}
            ${Checkbox({ id: 'agreeFollow', name: 'agreeFollow', label: 'I agree to strictly abide by the Code of Conduct of Bhubaneswar Engineering College.', required: true })}
            ${Checkbox({ id: 'agreeDiscipline', name: 'agreeDiscipline', label: 'I understand that violation will lead to immediate expulsion and police action.', required: true })}
            ${Checkbox({ id: 'agreeTrueInfo', name: 'agreeTrueInfo', label: 'I solemnly affirm that all information provided is true and correct.', required: true })}
        </div>
    `;
    const cardDec = document.getElementById('card-ar-declaration');
    if (cardDec) cardDec.innerHTML = Card({ title: '2. Legal Clauses & Undertaking', content: declarationContent });

    // Hide unnecessary additional info container if empty
    const cardAdd = document.getElementById('card-ar-additional-info');
    if (cardAdd) cardAdd.innerHTML = '';
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
    const domEmail = document.getElementById('studentEmail')?.value;
    const domCourse = document.getElementById('program')?.value;
    const domBranch = document.getElementById('branch')?.value;
    const domSession = document.getElementById('academicSession')?.value;
    const domAddress = document.getElementById('permanentAddress')?.value;

    const studentName = p.studentFullName || data.studentFullName || data.name || domName || '';
    const regNo = adm.registrationNumber || data.registrationNumber || 'PENDING BY COLLEGE';
    const fatherName = p.fatherName || data.fatherName || domFather || '';
    const mobile = p.studentMobile || data.studentMobile || data.mobile || domMob || '';
    const fatherMob = p.fatherMobile || data.fatherMobile || domFatherMob || '';
    const email = p.studentEmail || data.studentEmail || data.email || domEmail || '';
    const course = r.program || data.program || domCourse || '';
    const branch = r.branch || data.branch || domBranch || '';
    const session = r.academicSession || data.academicSession || domSession || '';
    const address = p.permanentAddress || data.permanentAddress || domAddress || '';

    const nameEl = document.getElementById('arStudentFullName');
    const regEl = document.getElementById('arRegistrationNumber');
    const fatherEl = document.getElementById('arFatherName');
    const progEl = document.getElementById('arProgram');
    const branchEl = document.getElementById('arBranch');
    const sessEl = document.getElementById('arAcademicSession');
    const smobEl = document.getElementById('arStudentMobile');
    const fmobEl = document.getElementById('arFatherMobile');
    const emailEl = document.getElementById('arStudentEmail');
    const addrEl = document.getElementById('arPermanentAddress');

    if (nameEl) nameEl.value = studentName;
    if (regEl) regEl.value = regNo;
    if (fatherEl) fatherEl.value = fatherName;
    if (progEl) progEl.value = course;
    if (branchEl) branchEl.value = branch;
    if (sessEl) sessEl.value = session;
    if (smobEl) smobEl.value = mobile;
    if (fmobEl) fmobEl.value = fatherMob;
    if (emailEl) emailEl.value = email;
    if (addrEl) addrEl.value = address;

    const ar = data.antiragging || {};
    const rulesEl = document.getElementById('agreeRules');
    const followEl = document.getElementById('agreeFollow');
    const discEl = document.getElementById('agreeDiscipline');
    const trueEl = document.getElementById('agreeTrueInfo');

    if (rulesEl) rulesEl.checked = !!ar.agreeRules;
    if (followEl) followEl.checked = !!ar.agreeFollow;
    if (discEl) discEl.checked = !!ar.agreeDiscipline;
    if (trueEl) trueEl.checked = !!ar.agreeTrueInfo;
}

function setupListeners() {
    const form = document.getElementById('antiragging-form');
    if (!form) return;

    form.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            saveCheckbox(e.target);
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Ensure all checkboxes are saved before navigating
            const rulesEl = document.getElementById('agreeRules');
            const followEl = document.getElementById('agreeFollow');
            const discEl = document.getElementById('agreeDiscipline');
            const trueEl = document.getElementById('agreeTrueInfo');
            
            if (rulesEl) Store.update('antiragging', 'agreeRules', rulesEl.checked);
            if (followEl) Store.update('antiragging', 'agreeFollow', followEl.checked);
            if (discEl) Store.update('antiragging', 'agreeDiscipline', discEl.checked);
            if (trueEl) Store.update('antiragging', 'agreeTrueInfo', trueEl.checked);
            
            Store.save();
            window.location.href = 'preview.html';
        }
    });
}

function saveCheckbox(element) {
    const name = element.name || element.id;
    if (name) {
        Store.update('antiragging', name, element.checked);
    }
}

function validateForm() {
    const rulesEl = document.getElementById('agreeRules');
    const followEl = document.getElementById('agreeFollow');
    const discEl = document.getElementById('agreeDiscipline');
    const trueEl = document.getElementById('agreeTrueInfo');

    if (!rulesEl?.checked || !followEl?.checked || !discEl?.checked || !trueEl?.checked) {
        alert('You must accept all mandatory Anti-Ragging undertakings to proceed.');
        return false;
    }
    return true;
}
