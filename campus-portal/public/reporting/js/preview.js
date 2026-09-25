import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Store } from './store.js';
import { FileStorage } from './services/FileStorage.js';
import { PdfService } from './services/PdfService.js';
import { enforceDocumentRuleOrBlock } from './utils/docValidator.js';

document.addEventListener('DOMContentLoaded', () => {
    const headerEl = document.getElementById('header-container');
    const footerEl = document.getElementById('footer-container');
    if (headerEl) headerEl.innerHTML = Header();
    if (footerEl) footerEl.innerHTML = Footer();

    renderPreview();
    
    const downloadPdfBtn = document.getElementById('download-preview-pdf-btn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            const originalText = downloadPdfBtn.innerHTML;
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.innerHTML = '⏳ Generating PDF...';
            try {
                await PdfService.downloadStudentLetterheadPdf(Store.data);
            } catch (e) {
                console.error('PDF download error:', e);
                window.open('print/reporting-print.html', '_blank');
            } finally {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = originalText;
            }
        });
    }

    const finalSubmitBtn = document.getElementById('final-submit-btn');
    if (finalSubmitBtn) {
        finalSubmitBtn.addEventListener('click', async () => {
            const canProceed = await enforceDocumentRuleOrBlock(Store, FileStorage, 'preview');
            if (!canProceed) return;

            Store.update('submission', 'isSubmitted', true);
            Store.update('submission', 'submissionDate', new Date().toISOString());
            Store.save();
            window.location.href = 'submission.html';
        });
    }
});

function createCard(title, editUrl, contentHtml) {
    return `
        <div class="card form-section" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: white; margin-bottom: var(--space-4);">
            <div class="card-header-flex">
                <h3>${title}</h3>
                <button class="edit-btn" onclick="window.location.href='${editUrl}'">Edit</button>
            </div>
            <div class="card-body">
                ${contentHtml}
            </div>
        </div>
    `;
}

function renderItem(label, value) {
    return `
        <div class="summary-item">
            <label>${label}</label>
            <span>${value ? value : '<em style="color:#9CA3AF">Not provided</em>'}</span>
        </div>
    `;
}

function renderPreview() {
    Store.propagateSharedData();
    const data = Store.data || {};
    const p = data.personal || {};
    const r = data.reporting || {};
    const f = data.fees || {};
    const fac = data.facilities || {};
    const h = data.hostel || {};
    const t = data.transport || {};
    const ar = data.antiragging || {};
    const docs = data.documents || {};

    const sectionsContainer = document.getElementById('preview-sections');
    if (!sectionsContainer) return;
    let html = '';

    // 1. Reporting & Academic Information
    const sCourse = r.program || r.course || data.program || '';
    const sBranch = r.branch || r.department || data.branch || '';
    const sSession = r.academicSession || r.session || data.academicSession || '';
    const sYear = r.academicYear || data.academicYear || '';
    const sAdmType = r.admissionType || data.admissionType || 'Regular';
    const sAdmRef = r.admissionReference || data.admissionReference || 'Direct';
    const sReferrer = r.referrerName || data.referrerName || '';
    const sRepDate = r.reportingDate || '';
    const sRepTime = r.reportingTime || '';

    const refDisplay = sAdmRef === 'Referred by Person' 
        ? (sReferrer ? `Referred by: ${sReferrer}` : 'Referred by a Person')
        : 'Direct Admission';

    const reportingHtml = `
        <div class="summary-grid">
            ${renderItem('Reporting Date & Time', (sRepDate || sRepTime) ? `${sRepDate} ${sRepTime}`.trim() : '')}
            ${renderItem('Academic Session', sSession)}
            ${renderItem('Academic Year', sYear)}
            ${renderItem('Program / Course', sCourse)}
            ${renderItem('Branch', sBranch)}
            ${renderItem('Admission Type', sAdmType)}
            ${renderItem('Admission Reference', refDisplay)}
        </div>
    `;
    html += createCard('1. Reporting & Academic Information', 'dashboard.html?step=reporting', reportingHtml);

    // 2. Personal Profile
    const sName = p.studentFullName || p.fullName || data.studentFullName || data.name || '';
    const sFather = p.fatherName || data.fatherName || '';
    const sMother = p.motherName || data.motherName || '';
    const sDob = p.dob || data.dob || '';
    const sGender = p.gender || data.gender || '';
    const sBlood = p.bloodGroup || data.bloodGroup || '';
    const sCategory = p.category || data.category || '';
    const sAadhaar = p.aadhaarNumber || data.aadhaarNumber || '';
    const sAbc = p.abcId || data.abcId || '';
    const sPan = p.panNumber || data.panNumber || '';
    const sOtr = p.otrNumber || data.otrNumber || '';
    const isScSt = (sCategory === 'SC' || sCategory === 'ST');
    const sRation = p.rationCardNo || data.rationCardNo || '';
    const sHasCmKisan = p.hasCmKisan || data.hasCmKisan || 'No';
    const sCmBenId = p.cmKisanBeneficiaryId || data.cmKisanBeneficiaryId || '';
    const sCmBenName = p.cmKisanBeneficiaryName || data.cmKisanBeneficiaryName || '';
    const sCmBenAadhaar = p.cmKisanBeneficiaryAadhaar || data.cmKisanBeneficiaryAadhaar || '';
    const sMobile = p.studentMobile || data.studentMobile || data.mobile || '';
    const sWhatsapp = p.whatsappNumber || data.whatsappNumber || '';
    const sFatherMob = p.fatherMobile || data.fatherMobile || '';
    const sMotherMob = p.motherMobile || data.motherMobile || '';
    const sEmail = p.studentEmail || data.studentEmail || data.email || '';

    const addrLine = p.permanentAddress || data.permanentAddress || '';
    const distLine = p.district || data.district || '';
    const stateLine = p.state || data.state || '';
    const pinLine = p.pinCode || data.pinCode || '';

    const addressParts = [addrLine, distLine, stateLine].filter(Boolean);
    const fullAddress = addressParts.length > 0 ? (addressParts.join(', ') + (pinLine ? ` - ${pinLine}` : '')) : '';

    const personalHtml = `
        <div class="summary-grid">
            ${renderItem('Student Full Name', sName)}
            ${renderItem('Father Name', sFather)}
            ${renderItem('Mother Name', sMother)}
            ${renderItem('Date of Birth', sDob)}
            ${renderItem('Gender', sGender)}
            ${renderItem('Blood Group', sBlood)}
            ${renderItem('Category', sCategory)}
            ${(isScSt || sOtr) ? renderItem('OTR Number (NSP)', sOtr) : ''}
            ${renderItem('Aadhaar Number', sAadhaar)}
            ${renderItem('ABC ID Number', sAbc)}
            ${renderItem('PAN Number', sPan)}
            ${!isScSt ? renderItem('Ration Card No', sRation) : ''}
            ${!isScSt ? renderItem('CM Kisan Beneficiary?', sHasCmKisan) : ''}
            ${(!isScSt && sHasCmKisan === 'Yes') ? renderItem('CM Kisan Beneficiary ID', sCmBenId) : ''}
            ${(!isScSt && sHasCmKisan === 'Yes') ? renderItem('CM Kisan Beneficiary Name', sCmBenName) : ''}
            ${(!isScSt && sHasCmKisan === 'Yes') ? renderItem('Beneficiary Aadhaar No', sCmBenAadhaar) : ''}
            ${renderItem('Student Mobile', sMobile)}
            ${renderItem('WhatsApp Mobile', sWhatsapp)}
            ${renderItem('Father Mobile', sFatherMob)}
            ${renderItem('Mother Mobile', sMotherMob)}
            ${renderItem('Student Email', sEmail)}
            ${renderItem('Permanent Address', fullAddress)}
        </div>
    `;
    html += createCard('2. Personal & Contact Details', 'dashboard.html?step=reporting', personalHtml);

    // 3. Fee Receipts
    let feeHtml = `
        <div class="summary-grid">
            ${renderItem('Tuition Fee Paid', f.tuitionFeeAmount ? `₹${f.tuitionFeeAmount} (Receipt: ${f.tuitionReceiptNumber || 'N/A'})` : '')}
            ${renderItem('Hostel Fee Paid', f.hostelFeeAmount ? `₹${f.hostelFeeAmount} (Receipt: ${f.hostelReceiptNumber || 'N/A'})` : '')}
            ${renderItem('Transport Fee Paid', f.transportFeeAmount ? `₹${f.transportFeeAmount} (Receipt: ${f.transportReceiptNumber || 'N/A'})` : '')}
            ${renderItem('One Time Fee Paid', f.oneTimeFeeAmount ? `₹${f.oneTimeFeeAmount} (Receipt: ${f.oneTimeFeeReceiptNumber || 'N/A'})` : '')}
            ${renderItem('Counselling Fee Paid', f.counsellingFeeAmount ? `₹${f.counsellingFeeAmount} (Receipt: ${f.counsellingReceiptNumber || 'N/A'})` : '')}
    `;
    if (f.additionalFees && f.additionalFees.length > 0) {
        f.additionalFees.forEach((addFee, idx) => {
            if (addFee.feeType || addFee.amount) {
                feeHtml += renderItem(`${addFee.feeType || 'Additional Fee #' + (idx+1)} Paid`, `₹${addFee.amount || 0} (Receipt: ${addFee.receiptNumber || 'N/A'}, Date: ${addFee.receiptDate || 'N/A'})`);
            }
        });
    }
    feeHtml += `</div>`;
    html += createCard('3. Fee Receipts Summary', 'dashboard.html?step=reporting', feeHtml);

    // 4. Documents Checklist Summary
    const docLabels = {
        studentPhoto: 'Student Passport Photo',
        studentSignature: 'Student Signature',
        parentSignature: 'Parent Signature',
        certificate10th: '10th Marksheet',
        certificate12th: '12th Marksheet',
        tcMigration: 'TC / CLC / Migration',
        aadhaarCard: 'Aadhaar Card',
        panCard: 'PAN Card',
        rationCard: 'Ration Card',
        cmKisanDoc: 'CM Kisan Beneficiary Document',
        residenceCertificate: 'Residence Certificate',
        casteCertificate: 'Caste Certificate',
        incomeCertificate: 'Income Certificate',
        admissionLetter: 'Admission Letter',
        bankPassbook: 'Bank Passbook',
        feeReceipt: 'Fee Receipts'
    };

    let docsListHtml = '<div class="summary-grid">';
    for (const [key, label] of Object.entries(docLabels)) {
        const isUploaded = !!docs[key];
        let status = '';
        if (isUploaded) {
            status = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap; margin-top:2px;">
                    <span style="color:var(--success); font-weight:600;">✓ Uploaded</span>
                    <button type="button" class="btn-preview-view-doc" data-key="${key}" style="font-size:0.75rem; padding:3px 10px; border-radius:4px; border:1px solid #2563eb; color:#2563eb; background:#eff6ff; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s;">
                        👁️ View Document
                    </button>
                </div>
            `;
        } else {
            status = '<span style="color:var(--text-muted)">Not Uploaded</span>';
        }
        docsListHtml += renderItem(label, status);
    }
    const customDocs = data.customDocuments || [];
    customDocs.forEach(cd => {
        const isUploaded = !!docs[cd.id];
        let status = '';
        if (isUploaded) {
            status = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; flex-wrap:wrap; margin-top:2px;">
                    <span style="color:var(--success); font-weight:600;">✓ Uploaded</span>
                    <button type="button" class="btn-preview-view-doc" data-key="${cd.id}" style="font-size:0.75rem; padding:3px 10px; border-radius:4px; border:1px solid #2563eb; color:#2563eb; background:#eff6ff; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px; transition:all 0.2s;">
                        👁️ View Document
                    </button>
                </div>
            `;
        } else {
            status = '<span style="color:var(--text-muted)">Not Uploaded</span>';
        }
        docsListHtml += renderItem(`${cd.label} (Custom)`, status);
    });
    docsListHtml += '</div>';
    html += createCard('4. Uploaded Documents Status', 'dashboard.html?step=documents', docsListHtml);

    // 5. Facility Selection Summary
    const hReq = fac.hostelRequired || r.hostelRequired || 'No';
    const tReq = fac.transportRequired || r.transportRequired || 'No';

    const facHtml = `
        <div class="summary-grid">
            ${renderItem('Hostel Required', hReq === 'Yes' ? '<strong style="color:var(--primary-blue)">Yes</strong>' : 'No (Day Scholar)')}
            ${renderItem('Transport Required', tReq === 'Yes' ? '<strong style="color:var(--primary-blue)">Yes</strong>' : 'No (Self Transport)')}
        </div>
    `;
    html += createCard('5. Facility Requirements Choice', 'dashboard.html?step=facilities', facHtml);

    // 6. Hostel Specific Details (If applicable)
    if (hReq === 'Yes') {
        const hostelHtml = `
            <div class="summary-grid">
                ${renderItem('Medical Condition', h.medicalCondition || 'None')}
                ${renderItem('Emergency Contact Person', h.emergencyContactPerson || p.fatherName)}
                ${renderItem('Emergency Contact Phone', h.emergencyContactNumber || p.fatherMobile)}
                ${renderItem('Room Allotment Status', '<em style="color:#475569">PENDING BY COLLEGE HOSTEL SUPERINTENDENT</em>')}
            </div>
        `;
        html += createCard('6. Hostel Specific Information', 'dashboard.html?step=hostel', hostelHtml);
    }

    // 7. Transport Specific Details (If applicable)
    if (tReq === 'Yes') {
        const transportHtml = `
            <div class="summary-grid">
                ${renderItem('Bus Stoppage Name', t.stoppageName || 'N/A')}
                ${renderItem('Pickup Location', t.pickupLocation || 'N/A')}
                ${renderItem('Drop Location', t.dropLocation || 'N/A')}
                ${renderItem('Rider Pass Status', '<em style="color:#475569">PENDING BY COLLEGE TRANSPORT SUPERVISOR</em>')}
            </div>
        `;
        html += createCard('7. Transport Specific Information', 'dashboard.html?step=transport', transportHtml);
    }

    // 8. Anti Ragging Status
    const arHtml = `
        <div class="summary-grid">
            ${renderItem('Legal Undertaking Status', '<span style="color:var(--success); font-weight:600;">✓ 17 UGC Legal Clauses Signed Digitally</span>')}
        </div>
    `;
    html += createCard('8. Anti-Ragging Affidavit', 'dashboard.html?step=antiragging', arHtml);

    sectionsContainer.innerHTML = html;

    // Attach View Document click handlers
    document.querySelectorAll('.btn-preview-view-doc').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation();
            const docKey = btn.dataset.key;
            if (!docKey) return;

            try {
                // 1. Try FileStorage service
                const fileData = await FileStorage.get(docKey);
                if (fileData && fileData.url) {
                    window.open(fileData.url, '_blank');
                    return;
                }

                // 2. Try Store object directly
                const docVal = Store.data.documents ? Store.data.documents[docKey] : null;
                if (docVal && typeof docVal === 'object' && docVal.url) {
                    window.open(docVal.url, '_blank');
                } else if (typeof docVal === 'string' && (docVal.startsWith('http') || docVal.startsWith('data:'))) {
                    window.open(docVal, '_blank');
                } else {
                    alert('Uploaded document preview link is unavailable. Please visit the Documents step to view or re-upload.');
                }
            } catch (err) {
                console.error('Failed to open document view', err);
                alert('Could not open document.');
            }
        };
    });
}

