import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Card } from './components/Card.js';
import { Input } from './components/Input.js';
import { DocumentUpload } from './components/DocumentUpload.js';
import { Store } from './store.js';
import { FileStorage } from './services/FileStorage.js';
import { enforceDocumentRuleOrBlock } from './utils/docValidator.js';

const DOCUMENTS = [
    { id: 'studentPhoto', label: 'Student Passport Photo', required: true },
    { id: 'studentSignature', label: 'Student Signature', required: true },
    { id: 'parentSignature', label: 'Parent / Guardian Signature', required: true },
    { id: 'certificate10th', label: '10th Original Certificate / Marksheet', required: true },
    { id: 'certificate12th', label: '12th Original Certificate / Marksheet (Optional)', required: false },
    { id: 'tcMigration', label: 'TC / CLC / Migration Certificate', required: true },
    { id: 'aadhaarCard', label: 'Aadhaar Card', required: true },
    { id: 'panCard', label: 'PAN Card (Optional)', required: false },
    { id: 'rationCard', label: 'Ration Card (Optional)', required: false },
    { id: 'cmKisanDoc', label: 'CM Kisan Beneficiary Document / Certificate (Optional)', required: false },
    { id: 'residenceCertificate', label: 'Residence Certificate', required: true },
    { id: 'casteCertificate', label: 'Caste Certificate (Optional)', required: false },
    { id: 'incomeCertificate', label: 'Income Certificate of Father (Optional)', required: false },
    { id: 'admissionLetter', label: 'Admission Allotment Letter', required: true },
    { id: 'bankPassbook', label: 'Bank Passbook (Optional)', required: false },
    { id: 'feeReceipt', label: 'Fee Payment Receipt(s)', required: true }
];

function getAllDocs() {
    const category = (Store.data && Store.data.personal && Store.data.personal.category) || '';
    const isScSt = (category === 'SC' || category === 'ST');
    const hasCmKisan = !isScSt && (Store.data && Store.data.personal && Store.data.personal.hasCmKisan === 'Yes');
    const customDocs = (Store.data && Store.data.customDocuments) ? Store.data.customDocuments : [];

    const docs = DOCUMENTS.filter(doc => {
        if (doc.id === 'rationCard') {
            if (isScSt && !(Store.data?.documents?.rationCard && Store.data.documents.rationCard.url)) {
                return false;
            }
            return true;
        }
        if (doc.id === 'cmKisanDoc') {
            if (isScSt && !(Store.data?.documents?.cmKisanDoc && Store.data.documents.cmKisanDoc.url)) {
                return false;
            }
            return hasCmKisan || (Store.data?.documents?.cmKisanDoc && Store.data.documents.cmKisanDoc.url);
        }
        return true;
    });

    return [...docs, ...customDocs];
}

document.addEventListener('DOMContentLoaded', () => {
    const headerEl = document.getElementById('header-container');
    const footerEl = document.getElementById('footer-container');
    if (headerEl) headerEl.innerHTML = Header();
    if (footerEl) footerEl.innerHTML = Footer();

    renderCards();
    bindDataToForm();
    setupListeners();
});

window.addEventListener('navigate-step', (e) => {
    if (e.detail && (e.detail.nextStep === 'documents' || e.detail.step === 'documents')) {
        renderCards();
        bindDataToForm();
        setupListeners();
    }
});

window.addEventListener('step-active', (e) => {
    if (e.detail && (e.detail.nextStep === 'documents' || e.detail.step === 'documents')) {
        renderCards();
        bindDataToForm();
        setupListeners();
    }
});

function renderCards() {
    const studentInfoContent = `
        <div class="grid-2">
            ${Input({ id: 'docStudentName', label: 'Student Name', disabled: true })}
            ${Input({ id: 'docCourse', label: 'Course', disabled: true })}
            ${Input({ id: 'docBranch', label: 'Branch', disabled: true })}
            ${Input({ id: 'docMobile', label: 'Mobile', disabled: true })}
            ${Input({ id: 'docSession', label: 'Session', disabled: true })}
            ${Input({ id: 'docStatus', label: 'Registration Status', disabled: true })}
        </div>
    `;
    const cardInfo = document.getElementById('card-docs-student-details');
    if (cardInfo) cardInfo.innerHTML = Card({ title: 'Student Information', content: studentInfoContent });

    const allDocs = getAllDocs();
    let checklistHtml = '';
    allDocs.forEach(doc => {
        checklistHtml += DocumentUpload({ id: doc.id, label: doc.label, required: doc.required, isCustom: !!doc.isCustom });
    });

    checklistHtml += `
        <div style="margin-top: 20px; padding-top: 16px; border-top: 2px dashed #E5E7EB;">
            <div id="custom-doc-form-container" style="display: none; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <h4 style="margin-top: 0; margin-bottom: 12px; font-size: 0.95rem; color: #1E293B; font-weight: 600;">Add Additional Document / Certificate</h4>
                
                <div style="margin-bottom: 12px;">
                    <label style="font-size: 0.85rem; font-weight: 500; color: #475569; display: block; margin-bottom: 6px;">Select Quick Suggestion or Type Document Title:</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
                        <button type="button" class="quick-doc-chip" data-title="Graduation Certificate / Marksheet" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ Graduation Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="+2 Marksheet & Certificate" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ +2 Marksheet & Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="Diploma Certificate / Marksheet" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ Diploma Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="ITI Certificate / Marksheet" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ ITI Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="Provisional / Pass Certificate" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ Provisional Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="Conduct / Character Certificate" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ Conduct Certificate</button>
                        <button type="button" class="quick-doc-chip" data-title="Gap Affidavit / Migration" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 20px; border: 1px solid #93C5FD; background: #EFF6FF; color: #1E40AF; cursor: pointer;">+ Gap Affidavit</button>
                    </div>
                    <input type="text" id="custom-doc-title-input" placeholder="e.g. ITI Certificate, Graduation Certificate, +2 Marksheet" class="form-input" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.9rem;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button type="button" id="cancel-custom-doc-btn" class="btn btn-secondary btn-sm" style="padding: 6px 14px;">Cancel</button>
                    <button type="button" id="save-custom-doc-btn" class="btn btn-primary btn-sm" style="padding: 6px 16px;">Add Document</button>
                </div>
            </div>

            <div style="text-align: center;">
                <button type="button" id="add-custom-doc-btn" class="btn btn-outline" style="border: 2px dashed #2563EB; color: #2563EB; background: #EFF6FF; padding: 10px 24px; font-weight: 600; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 0.95rem; transition: all 0.2s ease;">
                    <span style="font-size: 1.3rem; font-weight: bold; line-height: 1;">+</span> Add Additional Certificate / Document
                </button>
            </div>
        </div>
    `;

    const cardChecklist = document.getElementById('card-docs-checklist');
    if (cardChecklist) cardChecklist.innerHTML = Card({ title: 'Required & Supporting Documents Checklist', content: checklistHtml });
}

async function bindDataToForm() {
    const data = Store.data || {};
    const p = data.personal || data.personalInfo || {};
    const r = data.reporting || data.academic || {};
    const adm = data.admin || {};

    const nameEl = document.getElementById('docStudentName');
    const courseEl = document.getElementById('docCourse');
    const branchEl = document.getElementById('docBranch');
    const mobEl = document.getElementById('docMobile');
    const sessEl = document.getElementById('docSession');
    const statEl = document.getElementById('docStatus');

    const domName = document.getElementById('studentFullName')?.value || '';
    const domCourse = document.getElementById('program')?.value || '';
    const domBranch = document.getElementById('branch')?.value || '';
    const domMob = document.getElementById('studentMobile')?.value || '';
    const domSess = document.getElementById('academicSession')?.value || '';

    const sName = p.studentFullName || p.fullName || data.studentFullName || data.fullName || data.name || domName || '';
    const sCourse = r.program || r.course || data.academic?.program || data.program || data.course || domCourse || '';
    const sBranch = r.branch || r.department || data.academic?.branch || data.branch || data.department || domBranch || '';
    const sMob = p.studentMobile || p.mobile || data.studentMobile || data.mobile || data.phone || domMob || '';
    const sSess = r.academicSession || r.session || data.academic?.academicSession || data.academicSession || data.session || domSess || '';
    const sStat = adm.registrationNumber || data.registrationNumber || 'PENDING BY COLLEGE';

    if (nameEl) nameEl.value = sName;
    if (courseEl) courseEl.value = sCourse;
    if (branchEl) branchEl.value = sBranch;
    if (mobEl) mobEl.value = sMob;
    if (sessEl) sessEl.value = sSess;
    if (statEl) statEl.value = sStat;

    await updateProgress();
}

async function updateProgress() {
    const allDocs = getAllDocs();
    let uploadedCount = 0;
    let requiredCount = allDocs.filter(d => d.required).length;
    let uploadedRequiredCount = 0;

    for (const doc of allDocs) {
        const fileData = await FileStorage.get(doc.id);
        const statusEl = document.getElementById(`${doc.id}-status`);
        const uploadBtn = document.getElementById(`${doc.id}-upload-btn`);
        const removeBtn = document.getElementById(`${doc.id}-remove-btn`);
        const previewBtn = document.getElementById(`${doc.id}-preview-btn`);
        const downloadBtn = document.getElementById(`${doc.id}-download-btn`);
        const errorEl = document.getElementById(`${doc.id}-error`);

        if (fileData) {
            uploadedCount++;
            if (doc.required) uploadedRequiredCount++;
            
            if (!Store.data.documents[doc.id]) {
                Store.update('documents', doc.id, true);
            }
            
            const sizeInMB = fileData.size ? (fileData.size / (1024 * 1024)).toFixed(2) : '0.00';
            
            if (statusEl) {
                statusEl.innerHTML = `
                    <span style="color:var(--success); font-weight: 500;">✓ Uploaded</span><br>
                    <span style="font-size: 0.75rem;">${fileData.name || 'File'} (${sizeInMB} MB)</span>
                `;
            }
            
            if (uploadBtn) uploadBtn.textContent = 'Replace';
            if (removeBtn) removeBtn.style.display = 'inline-block';
            if (previewBtn) previewBtn.style.display = 'inline-block';
            if (downloadBtn) downloadBtn.style.display = 'inline-block';
            if (errorEl) errorEl.style.display = 'none';
        } else {
            if (statusEl) statusEl.innerHTML = `Pending`;
            if (uploadBtn) uploadBtn.textContent = 'Upload';
            if (removeBtn) removeBtn.style.display = 'none';
            if (previewBtn) previewBtn.style.display = 'none';
            if (downloadBtn) downloadBtn.style.display = 'none';
        }
    }

    const progressText = document.getElementById('upload-progress-text');
    if (progressText) {
        progressText.textContent = `${uploadedCount} / ${allDocs.length} Uploaded (${uploadedRequiredCount}/${requiredCount} Required)`;
    }
}

function setupListeners() {
    const allDocs = getAllDocs();
    
    allDocs.forEach(doc => {
        const fileInput = document.getElementById(`${doc.id}-input`);
        if (!fileInput) return;
        
        // Remove existing listener clones to avoid double triggers
        const newFileInput = fileInput.cloneNode(true);
        if (fileInput.parentNode) fileInput.parentNode.replaceChild(newFileInput, fileInput);

        newFileInput.addEventListener('change', async (e) => {
            const errorEl = document.getElementById(`${doc.id}-error`);
            if (errorEl) errorEl.style.display = 'none';
            
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                
                const maxMB = 2;
                const maxSizeBytes = maxMB * 1024 * 1024;

                if (file.size > maxSizeBytes) {
                    const actualMB = (file.size / (1024 * 1024)).toFixed(2);
                    if (errorEl) {
                        errorEl.innerHTML = `⚠️ File size (${actualMB} MB) exceeds maximum limit of <strong>${maxMB} MB</strong>. Please select a smaller file under 2 MB.`;
                        errorEl.style.display = 'block';
                    }
                    newFileInput.value = '';
                    return;
                }
                
                const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

                if (!validTypes.includes(file.type)) {
                    if (errorEl) {
                        errorEl.textContent = 'Invalid file type. Only Image files (JPG, JPEG, PNG, WEBP) are allowed. PDFs are not accepted.';
                        errorEl.style.display = 'block';
                    }
                    newFileInput.value = '';
                    return;
                }

                try {
                    const statusEl = document.getElementById(`${doc.id}-status`);
                    if (statusEl) statusEl.innerHTML = 'Uploading...';
                    await FileStorage.upload(doc.id, file);
                    await updateProgress();
                } catch (err) {
                    console.error('File upload failed', err);
                    if (errorEl) {
                        errorEl.textContent = 'Failed to upload file.';
                        errorEl.style.display = 'block';
                    }
                }
            }
        });

        const uploadBtn = document.getElementById(`${doc.id}-upload-btn`);
        if (uploadBtn) {
            uploadBtn.onclick = () => newFileInput.click();
        }

        const removeBtn = document.getElementById(`${doc.id}-remove-btn`);
        if (removeBtn) {
            removeBtn.onclick = async () => {
                if (confirm('Are you sure you want to remove this document file?')) {
                    try {
                        await FileStorage.delete(doc.id);
                        Store.update('documents', doc.id, false);
                        newFileInput.value = '';
                        await updateProgress();
                    } catch (err) {
                        console.error('File remove failed', err);
                    }
                }
            };
        }
        
        const previewBtn = document.getElementById(`${doc.id}-preview-btn`);
        if (previewBtn) {
            previewBtn.onclick = () => openPreviewModal(doc.id, doc.label);
        }

        const downloadBtn = document.getElementById(`${doc.id}-download-btn`);
        if (downloadBtn) {
            downloadBtn.onclick = async () => {
                const fileData = await FileStorage.get(doc.id);
                if (fileData && (fileData.url || fileData.blob)) {
                    const url = fileData.url ? fileData.url : URL.createObjectURL(fileData.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileData.name || `${doc.id}.pdf`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (fileData.blob) URL.revokeObjectURL(url);
                }
            };
        }
    });

    // Handle Custom Document Form Actions
    const addCustomBtn = document.getElementById('add-custom-doc-btn');
    const formContainer = document.getElementById('custom-doc-form-container');
    const cancelCustomBtn = document.getElementById('cancel-custom-doc-btn');
    const saveCustomBtn = document.getElementById('save-custom-doc-btn');
    const titleInput = document.getElementById('custom-doc-title-input');

    if (addCustomBtn && formContainer) {
        addCustomBtn.onclick = () => {
            formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
            if (formContainer.style.display === 'block' && titleInput) {
                titleInput.focus();
            }
        };
    }

    if (cancelCustomBtn && formContainer) {
        cancelCustomBtn.onclick = () => {
            formContainer.style.display = 'none';
            if (titleInput) titleInput.value = '';
        };
    }

    document.querySelectorAll('.quick-doc-chip').forEach(chip => {
        chip.onclick = () => {
            if (titleInput) {
                titleInput.value = chip.dataset.title || chip.textContent.replace('+', '').trim();
                titleInput.focus();
            }
        };
    });

    if (saveCustomBtn && titleInput) {
        saveCustomBtn.onclick = () => {
            const title = titleInput.value.trim();
            if (!title) {
                alert('Please enter a document title (e.g. Graduation Certificate).');
                return;
            }

            const customId = 'customDoc_' + Date.now();
            const newDoc = {
                id: customId,
                label: title,
                required: false,
                isCustom: true
            };

            if (!Store.data.customDocuments) {
                Store.data.customDocuments = [];
            }
            Store.data.customDocuments.push(newDoc);
            Store.save();

            titleInput.value = '';
            if (formContainer) formContainer.style.display = 'none';

            renderCards();
            bindDataToForm();
            setupListeners();

            // Auto trigger upload file picker for newly created document
            setTimeout(() => {
                const newFileInput = document.getElementById(`${customId}-input`);
                if (newFileInput) newFileInput.click();
            }, 100);
        };
    }

    // Handle Delete Custom Document Row
    document.querySelectorAll('.delete-custom-doc-btn').forEach(btn => {
        btn.onclick = async (e) => {
            const docId = e.currentTarget.dataset.id;
            if (!docId) return;

            if (confirm('Are you sure you want to delete this custom document row?')) {
                try {
                    await FileStorage.delete(docId);
                    Store.update('documents', docId, false);
                    
                    if (Store.data.customDocuments) {
                        Store.data.customDocuments = Store.data.customDocuments.filter(d => d.id !== docId);
                        Store.save();
                    }

                    renderCards();
                    bindDataToForm();
                    setupListeners();
                } catch (err) {
                    console.error('Error deleting custom document row', err);
                }
            }
        };
    });

    const draftBtn = document.getElementById('docs-save-draft-btn');
    if (draftBtn) {
        draftBtn.onclick = () => {
            Store.save();
            alert('Document progress saved successfully!');
        };
    }

    const form = document.getElementById('documents-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const canProceed = await enforceDocumentRuleOrBlock(Store, FileStorage, 'documents');
            if (canProceed) {
                Store.save();
                window.dispatchEvent(new CustomEvent('navigate-step', { detail: { nextStep: 'facilities' } }));
            }
        };
    }
}

async function openPreviewModal(docId, label) {
    const fileData = await FileStorage.get(docId);
    if (!fileData || (!fileData.url && !fileData.blob)) return;

    const url = fileData.url ? fileData.url : URL.createObjectURL(fileData.blob);
    window.open(url, '_blank');
}
