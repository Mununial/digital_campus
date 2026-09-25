import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browserInstance = null;

/**
 * Get or initialize Puppeteer headless browser instance
 * Supports local node environment and Vercel serverless environment (@sparticuz/chromium)
 */
async function getBrowser() {
    if (!browserInstance || !browserInstance.connected) {
        const isProductionOrCloud = Boolean(
            process.env.RENDER || 
            process.env.VERCEL || 
            process.env.AWS_LAMBDA_FUNCTION_NAME || 
            process.env.NODE_ENV === 'production'
        );

        if (isProductionOrCloud) {
            try {
                const chromiumModule = await import('@sparticuz/chromium');
                const chromium = chromiumModule.default || chromiumModule;
                const puppeteerCoreModule = await import('puppeteer-core');
                const puppeteerCore = puppeteerCoreModule.default || puppeteerCoreModule;

                const execPath = await chromium.executablePath();

                browserInstance = await puppeteerCore.launch({
                    args: [
                        ...chromium.args,
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--single-process',
                        '--no-zygote'
                    ],
                    defaultViewport: chromium.defaultViewport || { width: 794, height: 1123 },
                    executablePath: execPath,
                    headless: chromium.headless,
                    ignoreHTTPSErrors: true
                });
                console.log('[PDF Generator] Successfully launched @sparticuz/chromium browser instance.');
                return browserInstance;
            } catch (e) {
                console.warn('[PDF Generator] Production chromium launch failed, attempting local puppeteer fallback:', e.message);
            }
        }

        // Standard Local Node.js Environment (Localhost)
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        console.log('[PDF Generator] Successfully launched local Puppeteer browser instance.');
    }
    return browserInstance;
}

/**
 * Generate native A4 PDF buffer from HTML print templates using Puppeteer
 * @param {string} templateType - 'hostel' | 'transport' | 'antiragging' | 'student-reporting' | 'reporting' | 'idcard'
 * @param {Object} data - Student data record
 * @param {string} baseUrl - Origin URL for resolving relative assets (e.g. http://localhost:5000)
 * @returns {Promise<Buffer>} PDF Binary Buffer
 */
export async function generatePdfFromTemplate(templateType, data, baseUrl = 'http://localhost:5000') {
    if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
        if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
            baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
        } else if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`;
        }
    }

    const templateFile = (templateType === 'reporting' || templateType === 'letterhead') 
        ? 'student-reporting-print.html' 
        : `${templateType}-print.html`;
    
    const targetUrl = `${baseUrl}/pages/print/${templateFile}`;
    console.log(`[PDF Generator] Targeted Print Page URL: ${targetUrl}`);

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        let loadedViaGoto = false;
        try {
            const gotoRes = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const status = gotoRes ? gotoRes.status() : 0;
            if (status >= 200 && status < 400) {
                loadedViaGoto = true;
            } else {
                console.warn(`[PDF Generator] page.goto returned HTTP ${status} for ${targetUrl}`);
            }
        } catch (gotoErr) {
            console.warn(`[PDF Generator] page.goto error for ${targetUrl}:`, gotoErr.message);
        }

        if (!loadedViaGoto) {
            const templatePath = path.join(__dirname, '../../client/pages/print', templateFile);
            let htmlContent;
            try {
                htmlContent = await fs.readFile(templatePath, 'utf8');
            } catch (err) {
                const res = await fetch(targetUrl);
                if (!res.ok) {
                    throw new Error(`Print template '${templateFile}' could not be loaded via page.goto or HTTP (${res.status}): ${targetUrl}`);
                }
                htmlContent = await res.text();
            }

            const baseTag = `<base href="${baseUrl}/pages/print/">`;
            htmlContent = htmlContent.includes('<head>') 
                ? htmlContent.replace('<head>', `<head>${baseTag}`)
                : `${baseTag}${htmlContent}`;

            await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 15000 });
        }

        // Populate dynamic placeholders inside Chromium DOM
        await page.evaluate((templateType, data) => {
            const p = data.personal || {};
            const r = data.reporting || data.academic || {};
            const f = data.fees || {};
            const fac = data.facilities || {};
            const h = data.hostel || {};
            const t = data.transport || {};
            const a = data.admin || {};
            const ar = data.antiragging || {};

            const setTxt = (id, val, fallback = 'N/A') => {
                const el = document.getElementById(id);
                if (el) el.textContent = (val !== null && val !== undefined && val !== '') ? val : fallback;
            };

            let acadYearFormatted = r.academicYear || '1st Year';
            if (acadYearFormatted && !acadYearFormatted.toLowerCase().includes('year')) {
                acadYearFormatted = `${acadYearFormatted} Year`;
            }

            // Shared placeholders across print templates
            setTxt('val-reportingDate', r.reportingDate || new Date().toISOString().split('T')[0]);
            setTxt('val-reportingTime', r.reportingTime || '10:00 AM');
            setTxt('val-studentFullName', p.studentFullName);
            setTxt('val-fatherName', p.fatherName);
            setTxt('val-motherName', p.motherName);
            setTxt('val-dob', p.dob);
            setTxt('val-gender', p.gender);
            setTxt('val-category', p.caste || p.category || 'General');
            setTxt('val-otrNumber', p.otrNumber || 'N/A');
            setTxt('val-bloodGroup', p.bloodGroup || ar.bloodGroup || 'N/A');
            setTxt('val-aadhaarNumber', p.aadhaarNumber);
            setTxt('val-abcId', p.abcId);
            setTxt('val-panNumber', p.panNumber || 'N/A');
            setTxt('val-rationCardNo', p.rationCardNo || 'N/A');
            setTxt('val-hasCmKisan', p.hasCmKisan || 'No');
            setTxt('val-cmKisanBeneficiaryId', p.cmKisanBeneficiaryId || 'N/A');
            setTxt('val-cmKisanBeneficiaryName', p.cmKisanBeneficiaryName || 'N/A');
            setTxt('val-cmKisanBeneficiaryAadhaar', p.cmKisanBeneficiaryAadhaar || 'N/A');

            const cmKisanRow = document.getElementById('cm-kisan-row');
            if (cmKisanRow) {
                cmKisanRow.style.display = (p.hasCmKisan === 'Yes') ? 'block' : 'none';
            }

            setTxt('val-studentMobile', p.studentMobile);
            setTxt('val-fatherMobile', p.fatherMobile || p.studentMobile);
            setTxt('val-motherMobile', p.motherMobile || 'N/A');
            setTxt('val-studentEmail', p.studentEmail);
            setTxt('val-permanentAddress', p.permanentAddress || `${p.district || ''}, ${p.state || ''}`.trim());

            setTxt('val-registrationNumber', a.registrationNumber || 'PENDING BY COLLEGE');
            setTxt('val-academicYear', acadYearFormatted);
            setTxt('val-admissionType', r.admissionType || 'Regular');
            setTxt('val-admissionReference', r.admissionReference || 'Direct');
            setTxt('val-referrerName', r.referrerName || '-');
            setTxt('val-program', r.program || r.course);
            setTxt('val-branch', r.branch);
            setTxt('val-academicSession', r.academicSession || '2026-2030');

            // Admin allotment fields
            setTxt('val-adm-studentName', p.studentFullName);
            setTxt('val-adm-registrationNumber', a.registrationNumber || 'PENDING BY COLLEGE');
            setTxt('val-adm-academicYear', acadYearFormatted);
            setTxt('val-adm-admissionType', r.admissionType || 'Regular');
            setTxt('val-adm-program', r.program || r.course);
            setTxt('val-adm-branch', r.branch);

            // Master letterhead placeholders (p-*)
            setTxt('p-date', r.reportingDate || new Date().toISOString().split('T')[0]);
            setTxt('p-time', r.reportingTime || '10:00 AM');
            setTxt('p-regno', a.registrationNumber || 'PENDING BY COLLEGE');
            setTxt('p-program', r.program || r.course);
            setTxt('p-branch', r.branch);
            setTxt('p-session', r.academicSession || '2026-2030');
            setTxt('p-entry', r.admissionType || 'Regular');
            setTxt('p-admission-ref', r.admissionReference || 'Direct');
            setTxt('p-referrer', r.referrerName || '-');

            setTxt('p-name', p.studentFullName);
            setTxt('p-dob', p.dob);
            setTxt('p-gender', p.gender);
            setTxt('p-father', p.fatherName);
            setTxt('p-mother', p.motherName);
            setTxt('p-bg', p.bloodGroup);
            setTxt('p-category', p.caste || p.category || 'General');
            setTxt('p-aadhaar', p.aadhaarNumber);
            setTxt('p-abc', p.abcId);
            setTxt('p-pan', p.panNumber || 'N/A');
            setTxt('p-ration', p.rationCardNo || 'N/A');
            setTxt('p-smobile', p.studentMobile);
            setTxt('p-email', p.studentEmail);
            setTxt('p-fmobile', p.fatherMobile);
            setTxt('p-mmobile', p.motherMobile);

            setTxt('p-address', p.permanentAddress || `${p.district || ''}, ${p.state || ''} ${p.pinCode || ''}`.trim());
            setTxt('p-district', p.district);
            setTxt('p-state', p.state);
            setTxt('p-pincode', p.pinCode);

            // Documents checklist
            const docs = data.documents || {};
            const setDocChk = (chkId, docKeys) => {
                const el = document.getElementById(chkId);
                if (!el) return;
                const hasDoc = docKeys.some(k => docs[k] && (docs[k].url || typeof docs[k] === 'string'));
                el.textContent = hasDoc ? '[ ✓ ]' : '[   ]';
            };

            setDocChk('chk-certificate10th', ['certificate10th', 'tenthCert']);
            setDocChk('chk-certificate12th', ['certificate12th', 'twelfthCert']);
            setDocChk('chk-tcMigration', ['tcMigration', 'tcClc']);
            setDocChk('chk-aadhaar', ['aadhaarCard', 'aadhaarDoc']);
            setDocChk('chk-pan', ['panCard', 'panDoc']);
            setDocChk('chk-passportPhotos', ['studentPhoto', 'photo']);
            setDocChk('chk-admissionLetter', ['admissionLetter', 'allotmentLetter']);
            setDocChk('chk-residenceCertificate', ['residenceCertificate']);
            setDocChk('chk-casteCertificate', ['casteCertificate', 'casteCert']);
            setDocChk('chk-incomeCertificate', ['incomeCertificate', 'incomeCert']);
            setDocChk('chk-bankDetails', ['bankPassbook']);
            setDocChk('chk-rationCard', ['rationCard', 'rationCardDoc']);
            setDocChk('chk-cmKisanDoc', ['cmKisanDoc', 'cmKisanCertificate']);

            // Fees
            setTxt('f-tuition-amt', f.tuitionFeeAmount ? `₹${f.tuitionFeeAmount}` : 'N/A');
            setTxt('f-tuition-no', f.tuitionReceiptNumber);
            setTxt('f-tuition-date', f.tuitionReceiptDate);

            setTxt('f-hostel-amt', f.hostelFeeAmount ? `₹${f.hostelFeeAmount}` : 'N/A');
            setTxt('f-hostel-no', f.hostelReceiptNumber);
            setTxt('f-hostel-date', f.hostelReceiptDate);

            setTxt('f-transport-amt', f.transportFeeAmount ? `₹${f.transportFeeAmount}` : 'N/A');
            setTxt('f-transport-no', f.transportReceiptNumber);
            setTxt('f-transport-date', f.transportReceiptDate);

            setTxt('f-onetime-amt', f.oneTimeFeeAmount ? `₹${f.oneTimeFeeAmount}` : 'N/A');
            setTxt('f-onetime-no', f.oneTimeFeeReceiptNumber);
            setTxt('f-onetime-date', f.oneTimeFeeReceiptDate);

            setTxt('f-counseling-amt', f.counsellingFeeAmount ? `₹${f.counsellingFeeAmount}` : 'N/A');
            setTxt('f-counseling-no', f.counsellingReceiptNumber);
            setTxt('f-counseling-date', f.counsellingReceiptDate);

            // Facilities
            const hReq = fac.hostelRequired || r.hostelRequired || 'No';
            const tReq = fac.transportRequired || r.transportRequired || 'No';

            setTxt('val-hostelRequired', hReq);
            setTxt('val-transportRequired', tReq);

            if (templateType === 'hostel') {
                setTxt('val-hostelRoomNo', a.hostelRoomNo || 'PENDING ALLOTMENT');
                setTxt('val-hostelNo', a.hostelNo || 'MAIN HOSTEL');
            }

            if (templateType === 'transport') {
                setTxt('val-riderPassNo', a.riderPassNo || 'PENDING ALLOTMENT');
                setTxt('val-riderPassFromDate', r.reportingDate || new Date().toISOString().split('T')[0]);
                setTxt('val-stoppageName', t.stoppageName || t.pickupLocation || 'N/A');
            }

            if (templateType === 'antiragging') {
                setTxt('val-parentGuardianName', ar.parentGuardianName || p.fatherName);
                const dobYear = p.dob ? parseInt(p.dob.split('-')[0], 10) : 2005;
                const age = new Date().getFullYear() - dobYear;
                setTxt('val-age', age > 0 ? age.toString() : '18');

                const today = new Date();
                setTxt('val-day', today.getDate().toString());
                const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                setTxt('val-month', monthNames[today.getMonth()]);
                setTxt('val-year', today.getFullYear().toString());

                setTxt('val-sig-branch', r.branch);
                setTxt('val-sig-regd', a.registrationNumber || 'PENDING BY COLLEGE');
                setTxt('val-sig-studentMob', p.studentMobile);
                setTxt('val-sig-parentName', ar.parentGuardianName || p.fatherName);
                setTxt('val-sig-parentAddr', p.permanentAddress || `${p.district || ''}, ${p.state || ''}`.trim());
                setTxt('val-sig-parentMob', p.fatherMobile || ar.emergencyContactNumber);
            }

            if (templateType === 'idcard') {
                if (data.photoUrl) {
                    const photoEl = document.getElementById('val-photo');
                    if (photoEl) photoEl.src = data.photoUrl;
                }
                const validEl = document.getElementById('val-validUpto');
                if (validEl && data.validUpto) validEl.textContent = data.validUpto;
            }
        }, templateType, data);

        // Generate Native A4 PDF with exact background images & colors enabled
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0mm',
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            },
            preferCSSPageSize: true
        });

        return pdfBuffer;
    } finally {
        await page.close();
    }
}
