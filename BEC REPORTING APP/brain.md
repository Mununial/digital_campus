# Project Vision
A modern, production-ready Student Reporting Management System (SRMS) for Bhubaneswar Engineering College (BEC). Designed as a highly scalable Government-style portal (similar to DigiLocker, UIDAI) with a clean, functional UI, without unnecessary animations or dark themes.

---

# Standardized Recommended Workflow

### STUDENT WORKFLOW
```
Login
  ↓
Master Information (Personal & Academic Details)
  ↓
Fees Information (Receipt Details)
  ↓
Documents Upload (Certificates, Photo, Signatures)
  ↓
Facility Selection (Hostel Required? YES/NO | Transport Required? YES/NO)
  ├── Hostel YES   → Hostel Form (Auto-filled master data, student inputs medical/emergency only)
  ├── Transport YES → Transport Form (Auto-filled master data, student inputs stoppage/pickup only)
  └── Neither      → Skip Facility Forms
  ↓
Anti-Ragging Undertaking (Auto-filled master data, student & parent legal declaration)
  ↓
Final Review (Clean single review of master details, documents, selected facilities, anti-ragging)
  ↓
Final Student Reporting PDF (Official BEC Letterhead: `STUDENT_NAME_REPORTING_FORM.pdf`)
  ↓
Submit & Success (Confirmation page. ID Card is COMPLETELY HIDDEN & ADMIN ONLY)
```

---

### ADMIN WORKFLOW
```
Login
  ↓
Dashboard (8 Summary Compact Cards: Total, Today's Reporting, Completed, In Progress, Hostel Req, Transport Req, Pending Regd, ID Cards Pending)
  ↓
Simple 8-Column Student Table (Photo | Student Name & ID | Course/Branch | Mobile | Facility Badges | Reg No | Status | [Manage Student])
  ↓
Manage Student (Full-Width Structured Student Profile Viewer with 12 Lazy-Loaded Tabs):
  ├── 1. Overview (Quick summary & document verification progress checklist e.g. 8/11)
  ├── 2. Personal (Structured details, masked Aadhaar `XXXX XXXX 1234`, Read/Edit toggle mode)
  ├── 3. Academic (Program, Course, Branch, Entry Type, Roll No, Enrollment No, Section)
  ├── 4. Contact (Mobiles, Email, WhatsApp, Address, Read/Edit toggle mode)
  ├── 5. Fees (Payment details, receipt numbers, status tracking)
  ├── 6. Documents (Lazy-loaded Storage URLs, View/Download/Verify/Reject with Reason, Download ZIP)
  ├── 7. Facilities (Hostel Room/Block Allotment & Transport Pass Allotment or "No Facility Requested")
  ├── 8. Anti-Ragging (Affidavit status, digital signatures, PENDING BY COLLEGE placeholder, PDF download)
  ├── 9. Registration Details (Admin Assignment: Registration No, Enrollment No, Roll No, Section, Status, Remarks)
  ├── 10. Generated Forms (Preview, Generate, Download, Print for Reporting, Hostel, Transport, Anti-Ragging, ZIP)
  ├── 11. ID Card (ADMIN ONLY: Automated Prerequisite Gate -> Generate CR-80 `STUDENT_NAME_ID_CARD.pdf` Front & Back)
  └── 12. Audit Log (Read-only track of all administrative edits)
```

---

# Reference Document Template Analysis (Source: `repoting app data/`)

### 1. Official Reporting Form (`1st reporting form page.pdf`)
- **Header:** College Header, Date, Time, Program, Branch, Reg/LE, AY.
- **Fee Receipt Details:** Tuition, Hostel, Transport, One-Time, Counseling.
- **Student Profile Fields (Numbered 1-13):** Student Name, Father Name, Mother Name, Caste, Aadhaar, ABC ID, PAN, Student Mobile/Whatsapp, Father Mobile, Mother Mobile, Email, Hostel Required (Yes/No), Transport Required (Yes/No), Permanent Address.
- **Required Document Checklist:** 10th, 12th, TC/CLC, Aadhaar, PAN, Photos, Allotment Letter, Residency Cert, Caste Cert, Income Cert, Bank Details.

### 2. Residency Allotment Application (`hostel form template.pdf`)
- **Header:** Director (A&A) / Principal Application. Regd No default: `PENDING BY COLLEGE`.
- **Auto-filled:** Student Name, Father Name, Mobile, Address, Course, Branch, Session.
- **Student Inputs:** Medical Condition, Emergency Contact Person & Mobile.
- **Admin-Only Allotment:** Room No, Hostel No, Caretaker & Superintendent signatures.

### 3. Transport Allotment Application (`transport page form.pdf`)
- **Header:** Director (A&A) / Principal Application. Regd No default: `PENDING BY COLLEGE`.
- **Auto-filled:** Student Name, Father Name, Mobile, Address, Course, Branch, Session.
- **Student Inputs:** Stoppage Name, Pickup/Drop Location.
- **Admin-Only Allotment:** Rider Pass No, From Date, Transport Supervisor signature.

### 4. Anti-Ragging Undertaking (`Antiragging.docx`)
- **Header:** BEC Anti-Ragging Affidavit. Regd No default: `PENDING BY COLLEGE`.
- **Auto-filled:** Student Name, Parent Name, Address, Branch, Course, Mobile.
- **Student Inputs:** Agree to UGC 17 legal clauses.
- **Signatures:** Reuses uploaded `studentSignature` and `parentSignature`.

### 5. Official College ID Card (`id card .pdf`, `id card backside image.jpeg`) - ADMIN ONLY
- **Format:** CR-80 Vertical ID Card (Front & Back).
- **Validation Rules:** Requires Student Name, Photo, Registration Number, Course, Branch, DOB, Blood Group, Contact Number.
- **Front Side:** Title banner, Logo, Photo, Blood Group icon, Name, Regd No, Course, Branch, DOB, Contact No, Valid Upto, Director Signature.
- **Back Side:** Instructions, College Name, Building Image (`id card backside image.jpeg`).

---

# Central Master Data Model (`studentData`)

```json
{
  "personal": {
    "studentFullName": "",
    "fatherName": "",
    "motherName": "",
    "caste": "",
    "aadhaarNumber": "",
    "abcId": "",
    "panNumber": "",
    "studentEmail": "",
    "studentMobile": "",
    "whatsappNumber": "",
    "fatherMobile": "",
    "motherMobile": "",
    "permanentAddress": "",
    "dob": "",
    "bloodGroup": ""
  },
  "academic": {
    "program": "B.Tech",
    "branch": "",
    "entryType": "Regular",
    "academicYear": "1st Year",
    "academicSession": "2026-2030"
  },
  "fees": {
    "tuition": { "amount": "", "date": "", "receiptNo": "" },
    "hostel": { "amount": "", "date": "", "receiptNo": "" },
    "transport": { "amount": "", "date": "", "receiptNo": "" },
    "oneTime": { "amount": "", "date": "", "receiptNo": "" },
    "counseling": { "amount": "", "date": "", "receiptNo": "" }
  },
  "reporting": {
    "reportingDate": "",
    "reportingTime": ""
  },
  "facilities": {
    "hostelRequired": false,
    "transportRequired": false
  },
  "hostel": {
    "medicalCondition": "",
    "emergencyContactNumber": ""
  },
  "transport": {
    "stoppageName": "",
    "pickupDropLocation": ""
  },
  "antiRagging": {
    "agreedToClauses": true
  },
  "documents": {},
  "admin": {
    "registrationNumber": null,
    "rollNumber": null,
    "enrollmentNumber": null,
    "section": null,
    "hostelRoomNo": null,
    "hostelNo": null,
    "riderPassNo": null,
    "riderPassFromDate": null,
    "verified": false,
    "status": "REGISTRATION_PENDING",
    "lastUpdated": ""
  },
  "idCard": {
    "generated": false,
    "generatedAt": null
  }
}
```
