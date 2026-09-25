# MERGE NOTES — BEC DIGITAL CAMPUS STUDENT & ADMIN PORTAL

**Project:** Bhubaneswar Engineering College (BEC)  
**System:** Unified Student & Administrator Portal  
**Architecture:** Non-Destructive Gateway & Unified Shell  
**Port:** 5002 (Configurable via `PORT` in `.env`)  
**URL:** `http://localhost:5002`

---

## 1. WHAT WAS ADDED (NEW FILES ONLY)

All new logic, middleware, and shell pages were created inside the dedicated `campus-portal/` orchestrator folder:

| File Path | Description |
|-----------|-------------|
| `campus-portal/server.js` | Unified Express application entry point mounting all routers and static builds. |
| `campus-portal/package.json` | Master package descriptor with Express, CORS, JWT, MySQL2 dependencies. |
| `campus-portal/.env` | Unified environment configuration connecting all database and cloud services. |
| `campus-portal/middleware/authGateway.js` | Cross-module token validator supporting tokens from Module A, B, and C. |
| `campus-portal/middleware/roleMapper.js` | Role-based route guard ensuring students cannot reach admin endpoints. |
| `campus-portal/routes/gatewayAuth.js` | Universal login endpoint (`/api/auth/login`) with role toggles (Student / Faculty / Admin). |
| `campus-portal/routes/gatewayStudent.js` | REST aggregator providing live data across all 12 student views. |
| `campus-portal/routes/gatewayLibrary.js` | Central library catalog, issued book renewal, and reservation endpoints. |
| `campus-portal/routes/gatewayReporting.js` | Bridge router for student admission reporting, verification, and PDF generation. |
| `campus-portal/public/index.html` | Unified 12-Screen Student Portal matching approved reference design 1:1. |
| `campus-portal/public/admin.html` | Unified Administrator Portal Hub linking to Attendance, Hostel, Reporting, and Audit. |
| `campus-portal/public/shell/style.css` | Scoped design system (mobile frame, cards, gauges, color tokens, floating nav). |
| `campus-portal/public/shell/nav.js` | Screen router, history tracker, and bottom navigation bar controller. |
| `campus-portal/public/shell/auth.js` | Cross-module multi-store session synchronizer. |
| `campus-portal/public/shell/role.js` | DOM element visibility controller based on user role. |
| `campus-portal/public/assets/*` | Official BEC branding (logos, campus building photos, official templates). |
| `campus-portal/public/modules/*` | Sub-module mounts: `/attendance`, `/hostel`, `/reporting`. |

---

## 2. WHAT WAS NOT TOUCHED (EXISTING MODULE FILES)

Per Absolute Rules 1, 2, 3, 7, 9, 14, and 15, **zero files inside the original modules were modified or deleted**:

* `BEC-ATTENDANCCE-SYSTEM/` — **UNTOUCHED.** All source files, Firebase configuration, React components, and Firestore services remain in their original state.
* `Hostel Management/` — **UNTOUCHED.** All backend controllers, services, database schemas, and frontend source code remain in their original state.
* `BEC REPORTING APP/` — **UNTOUCHED.** All server routes, schemas, client pages, and document forms remain in their original state.
* `CampusConnect CRM/` — **UNTOUCHED.** All PostgreSQL schemas, leads, and automation routes remain isolated.
* **Databases:** Cloud Firestore (`bec-at-system`), MySQL (`hostel_management`), and Hostinger MySQL (`u847513759_ERP_COLLEGE`) remain completely untouched and separate.

---

## 3. HOW THE UNIFIED AUTHENTICATION WORKS

When a user logs in via `POST /api/auth/login`:
1. The gateway verifies credentials against the student/admin database records.
2. A Master Gateway JWT is signed and issued.
3. The frontend `auth.js` synchronizer immediately seeds the token into all required stores:
   * `localStorage.setItem('portalToken', token)`
   * `localStorage.setItem('authToken', token)` (Module B)
   * `localStorage.setItem('college_erp_token', token)` (Module C)
   * `localStorage.setItem('college_erp_user', JSON.stringify(user))`
   * `localStorage.setItem('bec_session_user', JSON.stringify(user))` (Module A)
4. Opening any sub-module (Attendance, Hostel, Reporting) automatically recognizes the active session without requiring re-login.

---

## 4. HOW THE 12 SCREENS MATCH THE APPROVED DESIGN 1:1

The student portal at `http://localhost:5002` implements the phone frame look and all 12 views:
1. **Login & Authentication:** Toggle between Student and Faculty/Admin; Roll number input; Password input; Remember Me; Login button.
2. **Student Dashboard:** Greeting bar ("Good Morning, Rohan Kumar"), 4 quick stat cards (Hostel, Attendance, Library, Fees), 8 colorful Quick Action buttons, Recent Activity list.
3. **Profile & Personal Details:** Personal, Academic, and Documents tabs; full student details.
4. **Campus Services:** 10-tile service grid (Hostel, Attendance, Library, Accounts, Mess, Gate Pass, Certificates, Notices, Help & Support, Feedback).
5. **Hostel Module:** Meridian Boys Hostel hero card, Room 204, Bed 2, Roommates (Amit, Rahul, Sourav), Leave, Gate Pass, Complaints, Room Change.
6. **Mess / Food:** Today's Menu vs Tomorrow toggle, meal cards with timings (Breakfast 7-9 AM, Lunch 12-2 PM, Dinner 7-9 PM), Feedback & Issue reporting.
7. **Library Module:** Search bar, Issued Books with Renewal buttons, Reservations, Rules, Fine payment.
8. **Attendance:** 86.4% circular progress gauge, >75% badge, This Semester / All Semesters toggle, subject breakdown.
9. **Accounts & Fees:** Total Fee ₹85,000, Paid ₹80,500, Due ₹4,500, Pay Now button, breakdown, history, receipt download.
10. **Notices & Announcements:** All / Important / Hostel / Academic tabs, circulars with category badges.
11. **Service Requests:** All / Pending / In Progress / Resolved tabs, real-time ticket tracking.
12. **Notifications & Activity:** Filterable activity timeline (Requests, Payments, System).

---

## 5. HOW TO RUN THE MERGED PORTAL

To start the unified server:
```bash
cd "COLLEGE ERP/campus-portal"
node server.js
```

Access points:
* **Student Portal:** `http://localhost:5002`
* **Admin Portal Hub:** `http://localhost:5002/admin`
* **Attendance Console:** `http://localhost:5002/attendance`
* **Hostel Management Console:** `http://localhost:5002/hostel`
* **Student SRMS Verification Console:** `http://localhost:5002/reporting/pages/admin.html`
* **System Health Endpoint:** `http://localhost:5002/api/health`
