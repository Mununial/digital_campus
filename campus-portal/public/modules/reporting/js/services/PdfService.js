import { Store } from '../store.js';
import { FileStorage } from './FileStorage.js';

export const PdfService = {
    /**
     * Helper to sanitize student name for default file naming
     */
    getSanitizedName(data) {
        const raw = (data && data.personal && data.personal.studentFullName) ? data.personal.studentFullName : 'STUDENT';
        return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    },

    /**
     * Compute valid expiry date for ID Card
     */
    computeValidUpto(data) {
        const session = (data && data.academic && data.academic.academicSession) || (data && data.reporting && data.reporting.academicSession) || '';
        const endYearMatch = session.match(/(\d{4})$/);
        if (endYearMatch) {
            return `July ${endYearMatch[1]}`;
        }
        
        const startYearMatch = session.match(/^(\d{4})/);
        const startYear = startYearMatch ? parseInt(startYearMatch[1], 10) : new Date().getFullYear();
        const prog = ((data && data.reporting && data.reporting.program) || 'B.Tech').toLowerCase();
        
        let duration = 4;
        if (prog.includes('diploma')) duration = 3;
        else if (prog.includes('mba')) duration = 2;

        return `July ${startYear + duration}`;
    },

    /**
     * Helper to retrieve image URL for signatures/photos
     */
    async getDocUrl(docId, studentData) {
        try {
            const docs = (studentData && studentData.documents) || (Store.data && Store.data.documents) || {};
            const docMeta = docs[docId];
            if (docMeta && typeof docMeta === 'object' && docMeta.url) return docMeta.url;
            
            const localFile = await FileStorage.get(docId);
            if (localFile && (localFile.url || localFile.blob)) {
                return localFile.url ? localFile.url : URL.createObjectURL(localFile.blob);
            }
        } catch (e) {
            console.warn(`Doc ${docId} image fetch warning:`, e);
        }
        return null;
    },

    /**
     * Check if a facility (hostel/transport) was requested by the student
     */
    isFacilityRequested(data, facilityType) {
        if (!data) return false;
        const fac = data.facilities || {};
        const r = data.reporting || data.academic || {};
        const val = facilityType === 'hostel' 
            ? (fac.hostelRequired !== undefined && fac.hostelRequired !== '' ? fac.hostelRequired : r.hostelRequired)
            : (fac.transportRequired !== undefined && fac.transportRequired !== '' ? fac.transportRequired : r.transportRequired);

        if (val === true || val === 1) return true;
        if (typeof val === 'string') {
            const clean = val.trim().toLowerCase();
            return clean === 'yes' || clean === 'true' || clean === 'requested';
        }
        return false;
    },

    getBackendUrl() {
        if (window.BACKEND_URL) return window.BACKEND_URL;

        const host = window.location.hostname;
        const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '';

        if (isLocalhost) {
            // Local development server on port 5000 / current origin
            return window.location.origin.includes(':') 
                ? window.location.origin.replace(/:\d+$/, ':5000') 
                : window.location.origin;
        }

        if (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) return window.APP_CONFIG.apiBaseUrl;
        return window.RENDER_BACKEND_URL || window.location.origin;
    },

    /**
     * Generate Native A4 PDF Blob via Puppeteer Express Backend Endpoint
     * (NO html2canvas, NO canvas DOM capture, NO hidden iframe, NO jsPDF/html2pdf)
     */
    async generateFormPdfBlob(templateType, data) {
        // Enforce valid photo URL & validUpto for ID card
        if (templateType === 'idcard') {
            const copyData = JSON.parse(JSON.stringify(data || {}));
            copyData.photoUrl = await this.getDocUrl('studentPhoto', data);
            copyData.validUpto = this.computeValidUpto(data);
            data = copyData;
        }

        const backendUrl = this.getBackendUrl();

        const response = await fetch(`${backendUrl}/api/pdf/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                templateType,
                data
            })
        });

        const contentType = response.headers.get('content-type') || '';
        if (!response.ok || contentType.includes('application/json')) {
            const errText = await response.text();
            throw new Error(`Puppeteer PDF generation failed (${response.status}): ${errText}`);
        }

        const blob = await response.blob();
        return blob;
    },

    /**
     * Download the consolidated College Letterhead PDF for Student
     */
    async downloadStudentLetterheadPdf(data) {
        return this.downloadFormPdf('reporting', data);
    },

    /**
     * Download individual PDF form for Admin
     */
    async downloadFormPdf(templateType, data) {
        if (templateType === 'hostel' && !this.isFacilityRequested(data, 'hostel')) {
            alert('Hostel Application PDF is not available because the student did not request hostel accommodation.');
            return;
        }
        if (templateType === 'transport' && !this.isFacilityRequested(data, 'transport')) {
            alert('Transport Pass PDF is not available because the student did not request bus transport.');
            return;
        }

        const nameSlug = this.getSanitizedName(data);
        const fileName = `${nameSlug}_${templateType.toUpperCase()}.pdf`;
        try {
            const blob = await this.generateFormPdfBlob(templateType, data);
            if (blob) {
                await this.triggerFileDownload(blob, fileName);
            }
            return blob;
        } catch (err) {
            console.error(`Error generating ${templateType} PDF via Puppeteer:`, err);
            alert(`Failed to generate ${templateType} PDF: ` + err.message);
        }
    },

    /**
    /**
     * Ensure JSZip library is available on the window
     */
    async ensureJSZip() {
        if (typeof window.JSZip !== 'undefined') return window.JSZip;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = () => resolve(window.JSZip);
            script.onerror = () => reject(new Error('Failed to load JSZip library from CDN'));
            document.head.appendChild(script);
        });
    },

    /**
     * Trigger browser file download using standard W3C Blob URL
     */
    async triggerFileDownload(blob, fileName) {
        if (!fileName) fileName = 'download.pdf';

        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = fileName;
        a.setAttribute('download', fileName);
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            if (document.body.contains(a)) {
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(blobUrl);
        }, 3000);
    },

    /**
     * Download Zip package containing all generated PDFs and uploaded documents
     */
    async downloadAllDocumentsZip(data, isVerifiedOnly = false) {
        const JSZipLib = await this.ensureJSZip();
        if (!JSZipLib) {
            alert('ZIP creation library could not be loaded. Please check your internet connection.');
            return;
        }

        const nameSlug = this.getSanitizedName(data);
        const zip = new JSZipLib();
        const pdfFolder = zip.folder("Official_Forms_PDF");
        const docFolder = zip.folder("Uploaded_Documents");

        const docMetaMap = {
            studentPhoto: '1_Student_Photo',
            studentSignature: '2_Student_Signature',
            parentSignature: '3_Parent_Signature',
            certificate10th: '4_10th_Certificate_Marksheet',
            tenthCert: '4_10th_Certificate_Marksheet',
            tenthCertificate: '4_10th_Certificate_Marksheet',
            certificate12th: '5_12th_Diploma_Certificate',
            twelfthCert: '5_12th_Diploma_Certificate',
            twelfthCertificate: '5_12th_Diploma_Certificate',
            tcMigration: '6_TC_CLC_Migration_Certificate',
            tcClc: '6_TC_CLC_Certificate',
            conductCert: '7_Conduct_Certificate',
            conductCertificate: '7_Conduct_Certificate',
            migrationCert: '8_Migration_Certificate',
            migrationCertificate: '8_Migration_Certificate',
            jeeRankCard: '9_JEE_OJEE_Rank_Card',
            rankCard: '9_JEE_OJEE_Rank_Card',
            admissionLetter: '10_College_Allotment_Letter',
            allotmentLetter: '10_College_Allotment_Letter',
            aadhaarCard: '11_Aadhaar_Card',
            aadhaarDoc: '11_Aadhaar_Card',
            panCard: '12_PAN_Card',
            panDoc: '12_PAN_Card',
            rationCard: '13_Ration_Card',
            cmKisanDoc: '14_CM_Kisan_Document',
            casteCertificate: '15_Caste_Certificate',
            casteCert: '15_Caste_Certificate',
            incomeCertificate: '16_Income_Certificate',
            incomeCert: '16_Income_Certificate',
            residenceCertificate: '17_Residence_Certificate',
            bankPassbook: '18_Bank_Passbook',
            feeReceipt: '19_Fee_Payment_Receipt',
            antiRaggingStudentSignature: '20_AntiRagging_Student_Signature',
            arStudentSignature: '20_AntiRagging_Student_Signature',
            antiRaggingParentSignature: '21_AntiRagging_Parent_Signature',
            arParentSignature: '21_AntiRagging_Parent_Signature'
        };

        const backendUrl = this.getBackendUrl();

        // Helper to fetch file as blob (with direct fetch + backend proxy fallback)
        const fetchBlobSafe = async (url) => {
            if (!url) return null;
            try {
                if (url.startsWith('data:')) {
                    const res = await fetch(url);
                    return await res.blob();
                }
                const res = await fetch(url, { mode: 'cors' });
                if (res.ok) return await res.blob();
            } catch (e) {
                console.warn(`Direct fetch failed for ${url}, trying proxy fallback:`, e.message);
            }
            try {
                const proxyUrl = `${backendUrl}/api/proxy-download?url=${encodeURIComponent(url)}`;
                const pRes = await fetch(proxyUrl);
                if (pRes.ok) return await pRes.blob();
            } catch (proxyErr) {
                console.warn(`Proxy fetch failed for ${url}:`, proxyErr.message);
            }
            return null;
        };

        try {
            // 1. Collect Uploaded Documents
            const docs = data.documents || {};
            const addedUrls = new Set();
            const allDocEntries = [];

            for (const [key, docObj] of Object.entries(docs)) {
                if (docObj && typeof docObj === 'object' && docObj.url) {
                    if (isVerifiedOnly && docObj.status !== 'Verified') continue;
                    allDocEntries.push({ key, url: docObj.url, title: docMetaMap[key] || key });
                }
            }

            // Also check signatures and personal photo if not already in docs
            if (!isVerifiedOnly) {
                if (data.personal?.photoUrl && !addedUrls.has(data.personal.photoUrl)) {
                    allDocEntries.push({ key: 'studentPhoto', url: data.personal.photoUrl, title: '1_Student_Photo' });
                }
                if (data.personal?.signatureUrl && !addedUrls.has(data.personal.signatureUrl)) {
                    allDocEntries.push({ key: 'studentSignature', url: data.personal.signatureUrl, title: '2_Student_Signature' });
                }
                if (data.signatures?.studentSignature && !addedUrls.has(data.signatures.studentSignature)) {
                    allDocEntries.push({ key: 'studentSignature', url: data.signatures.studentSignature, title: '2_Student_Signature' });
                }
                if (data.signatures?.parentSignature && !addedUrls.has(data.signatures.parentSignature)) {
                    allDocEntries.push({ key: 'parentSignature', url: data.signatures.parentSignature, title: '3_Parent_Signature' });
                }
            }

            for (const doc of allDocEntries) {
                if (!doc.url || addedUrls.has(doc.url)) continue;
                addedUrls.add(doc.url);
                try {
                    const blob = await fetchBlobSafe(doc.url);
                    if (blob) {
                        let ext = 'jpg';
                        if (blob.type.includes('png') || doc.url.includes('.png')) ext = 'png';
                        else if (blob.type.includes('pdf') || doc.url.includes('.pdf')) ext = 'pdf';
                        else if (blob.type.includes('webp') || doc.url.includes('.webp')) ext = 'webp';
                        else if (blob.type.includes('jpeg') || doc.url.includes('.jpeg')) ext = 'jpg';

                        const fileName = `${doc.title}.${ext}`;
                        docFolder.file(fileName, blob);
                    }
                } catch(e) {
                    console.warn(`Could not add doc ${doc.key} to archive:`, e);
                }
            }

            // 2. Official Forms PDF Generation
            if (!isVerifiedOnly) {
                // Reporting Form PDF
                try {
                    const letterheadBlob = await this.generateFormPdfBlob('reporting', data);
                    if (letterheadBlob) pdfFolder.file(`${nameSlug}_REPORTING_FORM.pdf`, letterheadBlob);
                } catch(e) { console.warn("Reporting Form PDF skip:", e.message); }

                // Anti-Ragging PDF
                try {
                    const arBlob = await this.generateFormPdfBlob('antiragging', data);
                    if (arBlob) pdfFolder.file(`${nameSlug}_ANTIRAGGING_AFFIDAVIT.pdf`, arBlob);
                } catch(e) { console.warn("Anti-Ragging PDF skip:", e.message); }

                // ID Card PDF
                try {
                    const idcardBlob = await this.generateFormPdfBlob('idcard', data);
                    if (idcardBlob) pdfFolder.file(`${nameSlug}_STUDENT_IDCARD.pdf`, idcardBlob);
                } catch(e) { console.warn("ID Card PDF skip:", e.message); }

                // Hostel PDF (if requested)
                if (this.isFacilityRequested(data, 'hostel')) {
                    try {
                        const hostelBlob = await this.generateFormPdfBlob('hostel', data);
                        if (hostelBlob) pdfFolder.file(`${nameSlug}_HOSTEL_APPLICATION.pdf`, hostelBlob);
                    } catch(e) { console.warn("Hostel PDF skip:", e.message); }
                }

                // Transport PDF (if requested)
                if (this.isFacilityRequested(data, 'transport')) {
                    try {
                        const transportBlob = await this.generateFormPdfBlob('transport', data);
                        if (transportBlob) pdfFolder.file(`${nameSlug}_TRANSPORT_PASS.pdf`, transportBlob);
                    } catch(e) { console.warn("Transport PDF skip:", e.message); }
                }
            }

            // 3. Generate ZIP file and trigger download
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const zipFileName = isVerifiedOnly
                ? `${nameSlug}_VERIFIED_DOCUMENTS.zip`
                : `${nameSlug}_ALL_DOCUMENTS.zip`;

            await this.triggerFileDownload(zipBlob, zipFileName);
        } catch(err) {
            console.error("Documents Archive ZIP Creation Failed:", err);
            alert("Error creating documents archive: " + err.message);
        }
    }
};
