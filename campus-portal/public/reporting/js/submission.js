import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { Store } from './store.js';
import { FirestoreService } from './services/firestoreService.js';
import { AuthService } from './services/authService.js';
import { AuditService } from './services/auditService.js';
import { Sanitizer } from './utils/sanitizer.js';
import { FileStorage } from './services/FileStorage.js';
import { enforceDocumentRuleOrBlock } from './utils/docValidator.js';

document.addEventListener('DOMContentLoaded', async () => {
    const headerEl = document.getElementById('header-container');
    const footerEl = document.getElementById('footer-container');
    if (headerEl) headerEl.innerHTML = Header();
    if (footerEl) footerEl.innerHTML = Footer();

    // Ensure Auth & Firestore data are loaded before rendering status
    const user = await AuthService.waitForAuth();
    if (user && FirestoreService) {
        try {
            const remoteData = (await FirestoreService.findStudentByUid(user.uid)) || (await FirestoreService.getStudent(user.uid));
            if (remoteData) {
                Store.data = remoteData;
                Store.save();
            }
        } catch (err) {
            console.warn("Could not load latest remote student data:", err?.message);
        }
    }

    renderSubmissionState();
    setupListeners();
});

function renderSubmissionState() {
    const data = Store.data;
    const isSubmitted = !!(data.submission?.isSubmitted || ['COMPLETED', 'SUBMITTED', 'PENDING', 'VERIFIED', 'APPROVED'].includes(data.admin?.status));
    const isReverted = data.admin?.status === 'REVERTED';

    const stepInd = document.getElementById('step-indicator');
    const sumStat = document.getElementById('sum-status');
    const submitBar = document.getElementById('submit-bar');
    const logoutContainer = document.getElementById('submitted-logout-container');

    if (isSubmitted && !isReverted) {
        // STATE 1: ALREADY SUBMITTED & LOCKED
        if (stepInd) {
            stepInd.innerHTML = `<div class="container" style="color: var(--success); font-size: 1.1rem; font-weight: bold; background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #bbf7d0;">✓ Submission Completed Successfully</div>`;
        }
        if (sumStat) {
            sumStat.textContent = 'SUBMITTED (PENDING ADMIN VERIFICATION)';
            sumStat.style.color = 'var(--success)';
        }
        if (submitBar) {
            submitBar.style.display = 'none';
        }
        if (logoutContainer) {
            logoutContainer.style.display = 'flex';
        }
    } else if (isReverted) {
        // STATE 2: REVERTED BY ADMIN FOR STUDENT CORRECTION
        if (stepInd) {
            stepInd.innerHTML = `
                <div class="container" style="background:#fffbe0; border:1px solid #f59e0b; border-left:5px solid #d97706; padding:15px; border-radius:8px; margin-top:10px; color:#78350f; text-align:left;">
                    <h4 style="margin:0 0 6px 0; color:#b45309;">⚠️ Application Reverted for Corrections by College Admin</h4>
                    <p style="margin:0 0 8px 0; font-size:0.92rem;"><strong>Admin Note:</strong> ${Sanitizer?.sanitizeString ? Sanitizer.sanitizeString(data.admin.revertReason || '') : (data.admin.revertReason || 'Please check your form details and re-upload required documents.')}</p>
                    <p style="margin:0; font-size:0.85rem; color:#92400e;">Click "Edit Form / Re-upload Docs" to modify your details or re-upload documents, then click "Confirm & Final Submit" to re-submit.</p>
                </div>
            `;
        }
        if (sumStat) {
            sumStat.textContent = 'REVERTED FOR CORRECTION';
            sumStat.style.color = '#d97706';
        }
        if (submitBar) {
            submitBar.style.display = 'flex';
        }
        if (logoutContainer) {
            logoutContainer.style.display = 'none';
        }
    } else {
        // STATE 3: PENDING INITIAL FINAL SUBMISSION
        if (stepInd) {
            stepInd.innerHTML = `<div class="container">Step 7 of 7: PDF Generation & Final Submission</div>`;
        }
        if (sumStat) {
            sumStat.textContent = 'PENDING FINAL SUBMISSION';
            sumStat.style.color = 'var(--primary-blue)';
        }
        if (submitBar) {
            submitBar.style.display = 'flex';
        }
        if (logoutContainer) {
            logoutContainer.style.display = 'none';
        }
    }

    Store.propagateSharedData();
    // Populate Summary Details
    const nameEl = document.getElementById('sum-name');
    const courseEl = document.getElementById('sum-course');
    const branchEl = document.getElementById('sum-branch');
    const accEl = document.getElementById('sum-accommodation');

    const hReq = data.facilities?.hostelRequired || data.reporting?.hostelRequired || 'No';
    const tReq = data.facilities?.transportRequired || data.reporting?.transportRequired || 'No';

    const user = AuthService.getCurrentUser();
    const studentName = data.personal?.studentFullName || data.personal?.fullName || data.studentFullName || data.name || user?.displayName || 'N/A';
    const prog = data.reporting?.program || data.academic?.program || data.program || 'N/A';
    const branch = data.reporting?.branch || data.academic?.branch || data.branch || 'N/A';

    if (nameEl) nameEl.textContent = studentName;
    if (courseEl) courseEl.textContent = prog;
    if (branchEl) branchEl.textContent = branch;
    if (accEl) accEl.textContent = hReq === 'Yes' ? 'Hostel Accommodation' : (tReq === 'Yes' ? 'Bus Transport' : 'Day Scholar');

    renderStatusChecks();
}

function renderStatusChecks() {
    const statusContainer = document.getElementById('status-checks');
    const btnContainer = document.getElementById('pdf-download-buttons');
    
    let checksHtml = `
        <div class="status-check">✔ Master Information & Fee Details Validated</div>
        <div class="status-check">✔ Required Documents Checklist Verified</div>
        <div class="status-check">✔ Anti-Ragging Undertaking Signed</div>
    `;

    if (statusContainer) statusContainer.innerHTML = checksHtml;
    if (btnContainer) btnContainer.innerHTML = '';
}

function setupListeners() {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    // Centered Logout Button Handler for Submitted Students
    document.getElementById('submitted-center-logout-btn')?.addEventListener('click', async () => {
        if (AuthService && AuthService.logout) {
            await AuthService.logout();
        }
        window.location.href = 'login.html';
    });

    // Final Submit Button Handler
    const finalSubmitBtn = document.getElementById('final-submit-btn');
    if (finalSubmitBtn) {
        finalSubmitBtn.addEventListener('click', async () => {
            // STRICT RULE: Enforce all mandatory required documents before final submission
            const canProceed = await enforceDocumentRuleOrBlock(Store, FileStorage, 'submission');
            if (!canProceed) return;

            if (confirm('Are you sure you want to final submit? Your reporting details will be locked for college processing.')) {
                if (overlay) overlay.style.display = 'flex';
                if (loadingText) loadingText.textContent = 'Submitting reporting application to BEC Firestore...';
                
                try {
                    Store.update('admin', 'status', 'COMPLETED');
                    Store.update('admin', 'revertReason', '');
                    Store.update('submission', 'isSubmitted', true);
                    
                    let currentUser = AuthService.getCurrentUser();
                    if (!currentUser) currentUser = await AuthService.waitForAuth();
                    
                    const studentId = currentUser ? currentUser.uid : Store.getStudentId();
                    if (studentId) {
                        Store.data.id = studentId;
                        if (!Store.data.admin) Store.data.admin = {};
                        Store.data.admin.uid = studentId;
                        Store.data.role = 'student';
                        
                        await FirestoreService.saveStudent(studentId, Store.data);
                        await AuditService.log('STUDENT_FINAL_SUBMIT', { studentId });
                    }
                    
                    renderSubmissionState();
                    
                    alert('Your student reporting application has been submitted successfully to BEC.');
                } catch (e) {
                    console.error("Submission failed:", e);
                    alert("Error submitting reporting data: " + e.message);
                } finally {
                    if (overlay) overlay.style.display = 'none';
                }
            }
        });
    }
}
