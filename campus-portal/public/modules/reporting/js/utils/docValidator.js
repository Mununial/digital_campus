/**
 * Document Validation Utility for BEC SRMS
 * Enforces mandatory document upload checks before form submission.
 */

export const REQUIRED_DOCUMENTS = [
    { id: 'studentPhoto', label: 'Student Passport Photo' },
    { id: 'studentSignature', label: 'Student Signature' },
    { id: 'parentSignature', label: 'Parent / Guardian Signature' },
    { id: 'certificate10th', label: '10th Original Certificate / Marksheet' },
    { id: 'tcMigration', label: 'TC / CLC / Migration Certificate' },
    { id: 'aadhaarCard', label: 'Aadhaar Card' },
    { id: 'residenceCertificate', label: 'Residence Certificate' },
    { id: 'admissionLetter', label: 'Admission Allotment Letter' },
    { id: 'feeReceipt', label: 'Fee Payment Receipt(s)' }
];

export async function checkDocumentUploaded(docType, Store, FileStorage) {
    if (!Store || !Store.data) return false;
    
    // Check Store documents map first
    const docState = Store.data.documents || {};
    const docMeta = docState[docType];

    if (docMeta) {
        if (typeof docMeta === 'boolean' && docMeta === true) return true;
        if (typeof docMeta === 'string' && docMeta.trim().length > 0) return true;
        if (typeof docMeta === 'object' && (docMeta.url || docMeta.uploaded || docMeta.status || docMeta.fileName)) return true;
    }

    // Fallback to FileStorage service check
    if (FileStorage && FileStorage.get) {
        try {
            const file = await FileStorage.get(docType);
            if (file && (file.url || file.name)) return true;
        } catch (e) {}
    }

    return false;
}

export async function getMissingRequiredDocuments(Store, FileStorage) {
    const missingDocs = [];

    for (const doc of REQUIRED_DOCUMENTS) {
        const isUploaded = await checkDocumentUploaded(doc.id, Store, FileStorage);
        if (!isUploaded) {
            missingDocs.push(doc.label);
        }
    }

    return missingDocs;
}

export async function enforceDocumentRuleOrBlock(Store, FileStorage, currentStep = 'documents') {
    const missingDocs = await getMissingRequiredDocuments(Store, FileStorage);

    if (missingDocs.length > 0) {
        const missingListStr = missingDocs.map(d => `  • ${d}`).join('\n');
        const alertMsg = `🔒 FORM SUBMISSION BLOCKED!\n\nYou cannot submit your application without uploading all mandatory required documents.\n\nMissing Required Documents (${missingDocs.length}):\n${missingListStr}\n\nPlease upload all required documents before final submission.`;
        
        alert(alertMsg);

        // If not on documents page, prompt redirect to documents page
        if (currentStep !== 'documents' && window.location.pathname.includes('submission.html')) {
            if (confirm('Would you like to go to the Documents upload page now to upload missing files?')) {
                window.location.href = 'documents.html';
            }
        }
        return false; // Validation Failed (Blocked)
    }

    return true; // All required documents uploaded
}
