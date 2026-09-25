# BRAIN.md - College Hostel Management System

This file serves as the permanent project memory, architecture specification, and documentation for the entire application. It must be updated at the completion of every development phase and whenever significant changes are made.

---

## 1. General Project Overview
* **Project Name**: College Hostel Management System (CHMS)
* **Project Purpose**: Provide a modern, mobile-first, robust web application to manage college hostel operations, room allocations, student registrations, attendance, fee details, and notices.
* **Project Vision**: Eliminate paper-based registers, prevent room double-booking, streamline superintendent oversight, and provide students with a modern portal for profiles, leaves, and notifications.
* **Current Development Phase**: Phase 17 — Master Data Management & Data Integrity Center (Complete)

---

## 2. Technology Stack

### Frontend
* **Core**: React (v19) via Vite
* **Routing**: React Router DOM (v6, configured with protected route layout groupings)
* **HTTP Client**: Axios (configured with base instance, credentials enabled, and global interceptors)
* **Styling**: Responsive Vanilla CSS design system (custom variables, fluid flexbox/grid layout, mobile-first breakpoints)
* **Build Tool**: Vite

### Backend
* **Runtime**: Node.js (v18+)
* **Framework**: Express.js
* **Cookie Parser**: `cookie-parser` (for extracting JWT token from secure HttpOnly cookies)
* **Security Middleware**: CORS, Helmet (HTTP headers)
* **Database Driver**: `mysql2/promise` (connection pooling, parameterized SQL queries)
* **Authentication Config**: JWT (jsonwebtoken) and bcryptjs structures
* **Environment Loader**: dotenv
* **File Upload**: Cloudinary SDK (v2) for student profile photos

### Database
* **Engine**: MySQL
* **Cloud Host**: Hostinger Cloud MySQL (`srv1334.hstgr.io:3306`)
* **Local Dev Port**: 3307 / 3306
* **Architecture**: Fully normalized relational design with foreign key constraints, unique validation, and indexing on search fields.

### File & Image Storage
* **Provider**: Cloudinary
* **Cloud Name**: qqv22ppu
* **Usage**: Student profile photo upload, update, and deletion

### Cloud Deployment Infrastructure
* **Frontend Hosting**: Firebase Hosting (`https://bechostels.web.app`, `https://bechostels.firebaseapp.com`)
  * SPA routing rewrites to `/index.html` configured via `frontend/firebase.json`
  * Default project: `bechostels` in `frontend/.firebaserc`
  * Build pipeline: Vite production build (`dist`)
* **Backend Hosting**: Render Web Service
  * Root Directory: `backend`
  * Build Command: `npm install`
  * Start Command: `node src/app.js`
  * CORS: Configured in `backend/src/app.js` to whitelist `https://bechostels.web.app`, `https://bechostels.firebaseapp.com`, `process.env.FRONTEND_URL`, and local Vite dev ports.
* **Branding & Assets**: 
  * College Logo: `frontend/src/assets/BEC LOGO FINAL.png` embedded in Navbar, Sidebar, and Login screen.
  * Favicon: `frontend/public/favicon.png` set in `frontend/index.html`.

---

## 3. Environment Configuration

### Backend (.env — never committed)
```
PORT=5001
NODE_ENV=development
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=<secret>
DB_NAME=hostel_management
JWT_SECRET=<secret>
CLOUDINARY_CLOUD_NAME=qqv22ppu
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
CLOUDINARY_URL=cloudinary://<key>:<secret>@qqv22ppu
```

### Frontend (.env — never committed)
```
VITE_API_BASE_URL=http://localhost:5001/api
```

### .env.example files
Both backend and frontend have `.env.example` files with placeholder values — these ARE committed and serve as setup templates.

### .gitignore
```
.env
.env.*
!.env.example
```
This pattern protects all env variants while keeping `.env.example` trackable.

---

## 4. Project Directory Structure
```
Hostel Management/
├── BRAIN.md                # Project Memory & Specs
├── README.md               # Project Setup & Installation Guide
├── .gitignore              # Multi-environment Git Ignore patterns
├── .env                    # Local root environment (ignored)
│
├── database/
│   ├── schema.sql          # DDL — all tables with constraints
│   └── seed.sql            # Six hostels, test users, roles
│
├── backend/
│   └── src/
│       ├── config/         # db.js, env.js, cloudinary.js
│       ├── controllers/    # hostelController, studentController, attendanceController,
│       │                   # bedController, floorController, roomController, authController
│       ├── middleware/     # authMiddleware.js, rateLimiter.js, errorHandler.js
│       ├── routes/         # authRoutes, hostelRoutes, studentRoutes, floorRoutes,
│       │                   # roomRoutes, bedRoutes, attendanceRoutes, dashboardRoutes
│       ├── services/       # hostelService, studentService, attendanceService,
│       │                   # floorService, roomService, bedService, dashboardService
│       ├── utils/          # password.js, authorization.js
│       └── app.js          # Server bootstrap
│
└── frontend/
    └── src/
        ├── components/     # StatCard, HostelCard, AttendanceChart, OccupancySummary,
        │                   # Navbar, Sidebar, Card, Button, Input, Loading, ProtectedRoute
        ├── context/        # AuthContext.jsx
        ├── layouts/        # DashboardLayout.jsx
        ├── pages/          # AdminDashboard, SuperintendentDashboard, DashboardPlaceholder,
        │                   # Login, HostelsPage, HostelDetailsPage, StudentsPage
        ├── services/       # api.js (Axios singleton, base URL from VITE_API_BASE_URL)
        └── App.jsx         # Router with RoleRedirect at root
```

---

## 5. Database Architecture & Schema

### Tables

1. **`roles`** — System authorization levels (`SUPER_ADMIN`, `SUPERINTENDENT`, `STUDENT`)
2. **`users`** — Main authentication table (id, role_id, username, email, password_hash, status)
3. **`hostels`** — Six hostels (BEC Boys 1/Girls 1, BEC Boys/Kara, Barmunda Boys/Girls)
4. **`floors`** — Floors inside hostels (hostel_id FK, floor_name, floor_number, status)
5. **`rooms`** — Rooms inside floors (hostel_id FK, floor_id FK, room_number, capacity, status)
6. **`beds`** — Individual beds (room_id FK, bed_number, status: AVAILABLE/OCCUPIED/MAINTENANCE)
7. **`students`** — Student profiles (user_id FK UNIQUE, bed_id FK UNIQUE, full_name, roll_number, photo_url, cloudinary_public_id, branch, course, year, semester, status)
8. **`superintendent_hostels`** — Many-to-many: superintendents to hostels
9. **`attendance`** — Daily roll-call (student_id FK, hostel_id FK, attendance_date, status: PRESENT/ABSENT, marked_by FK, UNIQUE on student_id+attendance_date)
10. **`notices`** — Announcement board (future phase)

---

## 6. API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login (returns HttpOnly JWT cookie) |
| POST | `/api/auth/logout` | Auth | Logout (clears cookie) |
| GET | `/api/auth/me` | Auth | Current user profile |

### Hostels
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hostels` | Auth | List hostels (scoped by role) |
| GET | `/api/hostels/:id` | Auth | Hostel details |
| POST | `/api/hostels` | SUPER_ADMIN | Create hostel |
| PUT | `/api/hostels/:id` | SUPER_ADMIN | Update hostel |
| GET | `/api/hostels/:id/floors` | Auth | Hostel floors |
| POST | `/api/hostels/:id/floors` | Admin | Add floor |
| GET | `/api/hostels/:id/rooms` | Auth | Hostel rooms |
| GET | `/api/hostels/:id/beds` | Auth | Hostel beds |

### Students
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/students` | Auth | List students (scoped by role) |
| GET | `/api/students/:id` | Auth | Student details |
| POST | `/api/students` | Admin | Create student (with Cloudinary photo) |
| PUT | `/api/students/:id` | Admin | Update student |
| DELETE | `/api/students/:id` | SUPER_ADMIN | Delete student |
| GET | `/api/students/profile/me` | STUDENT | Own profile |

### Attendance
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/attendance` | Auth | List/filter attendance |
| POST | `/api/attendance/mark` | Admin | Mark attendance |
| PUT | `/api/attendance/:id` | Admin | Edit attendance |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/overview` | Auth | Aggregated stats (role-scoped) |

---

## 7. Dashboard API — Data Contract

### `GET /api/dashboard/overview`

**Access:**
- `SUPER_ADMIN` → all 6 hostels, college-wide stats
- `SUPERINTENDENT` → assigned hostels only
- `STUDENT` → 403 Forbidden
- Unauthenticated → 401 Unauthorized

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalHostels": 6,
      "totalStudents": 120,
      "totalRooms": 45,
      "totalBeds": 180,
      "occupiedBeds": 120,
      "availableBeds": 50,
      "maintenanceBeds": 10,
      "present": 100,
      "absent": 15,
      "notMarked": 5,
      "attendancePercentage": 86.96,
      "occupancyPercentage": 70.59
    },
    "hostels": [
      {
        "hostelId": 1,
        "name": "BEC Boys Hostel 1",
        "totalStudents": 20,
        "present": 18,
        "absent": 2,
        "notMarked": 0,
        "attendancePercentage": 90.00,
        "totalRooms": 8,
        "totalBeds": 32,
        "occupiedBeds": 20,
        "availableBeds": 10,
        "maintenanceBeds": 2,
        "occupancyPercentage": 66.67
      }
    ]
  }
}
```

---

## 8. Statistics Formulas

### Attendance
```
Present    = active students with status='PRESENT' today
Absent     = active students with status='ABSENT' today
Not Marked = active students - students with ANY attendance record today

Attendance % = Present / (Present + Absent) × 100
             = 0 if nobody marked yet (never treat missing as absent)

Precision: 2 decimal places
```

### Occupancy
```
Usable Beds  = Occupied + Available  (excludes Maintenance)
Occupancy %  = Occupied / Usable Beds × 100
             = 0 if Usable Beds = 0

Precision: 2 decimal places
```

---

## 9. Frontend Routing

| Path | Role | Component |
|------|------|-----------|
| `/` | Any | RoleRedirect → role dashboard |
| `/login` | Public | Login |
| `/admin/dashboard` | SUPER_ADMIN | AdminDashboard |
| `/admin/hostels` | SUPER_ADMIN | HostelsPage |
| `/admin/hostels/:id` | SUPER_ADMIN | HostelDetailsPage |
| `/admin/students` | SUPER_ADMIN | StudentsPage |
| `/admin/attendance` | SUPER_ADMIN | Placeholder (Phase 7) |
| `/superintendent/dashboard` | SUPERINTENDENT | SuperintendentDashboard |
| `/superintendent/hostels` | SUPERINTENDENT | HostelsPage |
| `/superintendent/hostels/:id` | SUPERINTENDENT | HostelDetailsPage |
| `/superintendent/students` | SUPERINTENDENT | StudentsPage |
| `/superintendent/attendance` | SUPERINTENDENT | Placeholder (Phase 7) |
| `/student/attendance` | STUDENT | Placeholder |

---

## 10. Security & Configuration Decisions

1. **HttpOnly Cookies**: JWT stored in HttpOnly cookie (no XSS access).
2. **SameSite Lax + Secure**: CSRF protection, HTTPS-only in production.
3. **Role enforcement on backend**: Frontend role checks are UX only. All data scoping happens server-side via `req.user.role`.
4. **Superintendent scoping**: `getAssignedHostels(userId)` always queried from DB, never trusted from client.
5. **No secrets in frontend**: Only `VITE_API_BASE_URL` is exposed to the browser.
6. **Login rate limiting**: 5 attempts per 15 minutes per IP.
7. **Parameterized queries**: All SQL uses `mysql2/promise` placeholders.
8. **Helmet.js**: Secure HTTP headers on all responses.

---

## 11. Completed Features (All Phases)

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Project foundation, DB schema, frontend shell | ✅ Complete |
| 2 | JWT auth, RBAC, login UI, ProtectedRoute | ✅ Complete |
| 3 | Hostel/Floor/Room/Bed CRUD management | ✅ Complete |
| 4 | Student management, Cloudinary photo upload | ✅ Complete |
| 5 | Daily attendance marking, history, stats | ✅ Complete |
| 6 | Dashboard backend aggregation, frontend UI | ✅ Complete |
| 6.5 | Dashboard verification, polish, hardening | ✅ Complete |
| 7 | Notices & Hostel Communication System | ✅ Complete |

### Not Yet Implemented (Future Phases)
- Fee management
- Reports / PDF / Excel export
- QR attendance / Face recognition
- Complaints management
- Visitor management
- Parent portal

---

## 12. Project Change Log

* **2026-08-23 (Phase 8) — Complaint & Grievance Management System**
  * **Objective**: Build an end-to-end complaint system enabling students to log room/hostel maintenance issues and staff to track, assign, resolve, comment, and audit status changes.
  * **Database Schema**:
    * Created `complaints` table (id, student_id, hostel_id, room_number, bed_number, title, description, category, priority, status, assigned_to, resolution, resolved_at, closed_at, timestamps).
    * Created `complaint_history` audit log table (complaint_id, changed_by, old_status, new_status, comment, created_at).
    * Created `complaint_comments` table (complaint_id, user_id, comment, is_internal, created_at).
    * Validated indexes on `(hostel_id, status)`, `(student_id, status)`, `(category)`, and `(assigned_to)`.
  * **Backend Service & API (`complaintService.js`, `complaintController.js`, `complaintRoutes.js`)**:
    * Enforced transaction-based status updates with history recording (`OPEN` ➔ `IN_PROGRESS` ➔ `RESOLVED` / `CLOSED` / `REOPENED`).
    * Role-aware scoping: Students only access their own complaints; Superintendents are restricted to assigned hostels; Super Admins have global access.
    * Mandated `resolution` text for marking complaints as `RESOLVED`.
    * Restricted internal comments (`is_internal: true`) to hostel staff only.
  * **Frontend UI Components & Pages**:
    * `ComplaintCard.jsx`: Displays category icon, status pill, priority tag, relative time, and student/hostel details.
    * `ComplaintFormModal.jsx`: Mobile-friendly modal for student complaint creation with category and priority selectors.
    * `ComplaintDetailsModal.jsx`: Comprehensive detail modal with status management transitions, self-assignment, internal note toggle, comment list, and timeline audit log.
    * `RecentComplaintsSection.jsx`: Integrated into Admin, Superintendent, and Student dashboards with KPI summary cards.
    * `ComplaintsPage.jsx`: Filterable page with status tabs, category/priority drop-downs, search bar, and role-appropriate actions.
  * **Testing & Mock DB**:
    * Updated `backend/src/config/db.js` mock database engine for complaint queries and transactions.
    * Verified via `test_phase8_complaints.js` (12/12 integration tests passed).
  * **Status**: Complete.

* **2026-08-23 (Phase 7.5) — Notice System Production Verification & Data Safety**
  * **Database Verification Result**: LOCAL DATABASE NOT VERIFIED (Local MySQL server on port 3307 offline; mock DB fallback verified 100% compliant with SQL schema & security filters).
  * **Migration File**: Created `database/migrations/phase7_notices.sql` with safe `IF NOT EXISTS` DDL for `notices` and `notice_reads` tables, foreign keys, and indexes.
  * **Notice Visibility & Scoping Security**: Verified server-side scoping rules. Students see only All-Hostels and assigned hostel notices. Superintendents are blocked (403) from creating All-Hostels notices or managing unassigned hostel notices.
  * **Draft & Expiration Security**: Verified `DRAFT` and expired (`expires_at <= NOW()`) notices are strictly excluded from student queries, recent notices, and unread counts.
  * **Read/Unread & IDOR**: Verified `POST /api/notices/:id/read` is idempotent using `ON DUPLICATE KEY UPDATE`. IDOR attempts by students accessing unassigned hostel notices return 403 Forbidden. Client-supplied user identity in read requests is ignored in favor of JWT identity.
  * **XSS & Input Validation**: Verified React text bindings render titles and descriptions safely without `dangerouslySetInnerHTML`. Validated input sanitization for invalid priority, status, target, and length constraints.
  * **Dashboard Isolation & Sidebar**: Verified dashboard overview stats remain functional even if notice aggregation fails. Formatted sidebar unread badge to display `99+` when unread count exceeds 99.
  * **Performance & Security**: Parameterized SQL queries used (`LIKE ?`). Clamped pagination `limit` parameter to 100 max. Zero N+1 queries.
  * **Status**: Complete.

* **2026-08-23 (Phase 7) — Hostel Notice & Communication System**
  * **Backend Implementation**:
    * Created `notices` and `notice_reads` SQL schema tables with indexes and ENUM priority/status support.
    * Developed `noticeService.js`, `noticeController.js`, and `noticeRoutes.js` supporting full CRUD, scope-based filtering (ALL_HOSTELS vs SPECIFIC_HOSTEL), read tracking, and unread notice aggregation.
    * Integrated recent notice retrieval into `dashboardService.js` and expanded mock engine fallback to support notice operations.
  * **Frontend Implementation**:
    * Created `NoticeCard.jsx` with priority icons, target tags, and read status badges.
    * Created `NoticeComposerModal.jsx` with hostel selector, date validation, priority setting, and character limits.
    * Created `NoticeDetailsModal.jsx` with safe plain-text rendering and automatic student read marking upon view.
    * Created `RecentNoticesSection.jsx` integrated into Admin, Superintendent, and Student Dashboards.
    * Created `NoticesPage.jsx` complete with search, priority filter, target filter, status filter, student read-state filter, and pagination.
    * Created `StudentDashboard.jsx` featuring welcome banner, unread alert card, quick tiles, and recent notices.
    * Updated `Sidebar.jsx` with Notice navigation item and dynamic unread badge bubble.
  * **Verification**: All backend notice integration tests passed and frontend built with 0 errors.

* **2026-08-23 (Phase 6.5) — Dashboard Verification, Polish & Production Hardening**
  * **Bugs Fixed**:
    * `frontend/.env` had wrong port `5000` → fixed to `5001`
    * Superintendent overall stats were college-wide (unscoped) → fixed to use hostel-scoped SQL
    * N+1 query: hostel name fetched separately per hostel → merged into single hostel list query
    * Hostel loop was sequential → converted to `Promise.all()` for parallel execution
    * `notMarked` calculation used separate query → merged into single attendance aggregation
    * `AttendanceChart`/`OccupancySummary` had no empty state → added proper empty messages
    * Sidebar Dashboard link went to `/` → now routes to `/admin/dashboard` or `/superintendent/dashboard`
    * Root `/` route showed `DashboardPlaceholder` for all roles → added `RoleRedirect` component
    * `.gitignore` missing `!.env.example` → fixed env pattern
  * **Security Changes**:
    * Confirmed no backend secrets exposed to frontend
    * `.gitignore` now uses `.env.*` wildcard + `!.env.example`
  * **UI Changes**:
    * `StatCard`: added `loading` skeleton, `subtitle`, `color` variants, aria labels
    * `AttendanceChart`: rebuilt as accessible segmented bar with legend and empty state
    * `OccupancySummary`: rebuilt with color dots, proper empty state, `occupancyPercentage` prop
    * `HostelCard`: full stat display (students, attendance, rooms, beds, occupancy), semantic HTML
    * `AdminDashboard`: skeleton loading, quick actions, hostel filter, error/retry UX
    * `SuperintendentDashboard`: same polish, scoped filter (hides if 1 hostel)
  * **Formula Decisions**:
    * Attendance %: `Present / (Present + Absent) × 100` — missing = not absent
    * Occupancy %: `Occupied / (Occupied + Available) × 100` — excludes maintenance
    * All percentages: 2 decimal places via `parseFloat(x.toFixed(2))`
  * **Performance**:
    * Dashboard uses `Promise.all()` for parallel per-hostel queries
    * Overall aggregation consolidated into parallel queries
  * **Routing**:
    * Added `attendance` placeholder routes for admin and superintendent
    * `RoleRedirect` at root sends users to role-specific dashboard
* **2026-08-23 (Phase 15) — System Activity & Audit Center**
  * **Objective**: Designed and implemented a centralized operational activity and audit logging system (`activity_log`) distinct from Phase 14's `security_audit_log`. Captured operational history across all core business modules (Authentication, Users, Students, Hostels, Attendance, Notices, Complaints, Visitors, Mess, Fees, Allocations).
  * **Database Architecture**: Created `activity_log` table with indexes on `(module, created_at)`, `(actor_id, created_at)`, `(hostel_id, created_at)`, `(student_id, created_at)`, and `(entity_type, entity_id)`.
  * **Backend Audit Layer**: Developed `activityService.js`, `activityController.js`, and `activityRoutes.js`. Integrated `activityService.logActivity` across business services (`authService`, `userService`, `studentService`, `noticeService`, `complaintService`, `visitorService`, `messService`, `feeService`, `allocationService`).
  * **Transactional & Privacy Safety**: Connected logging to active database transaction connections where applicable (`logActivity(..., connection)`). Automated metadata sanitization (`sanitizeMetadata`) to scrub passwords, tokens, API keys, and mask PII fields (Aadhaar, SSN, Passport).
  * **Role-Based Access & Scoping**: Enforced strict RBAC (Super Admin = cross-hostel view, Superintendent = assigned hostels view only, Student = blocked from activity audit APIs).
  * **Frontend UI Components**: Built `ActivityFilterBar.jsx`, `ActivityDetailsModal.jsx`, `ActivityTimeline.jsx`, `ActivityPage.jsx`, and `RecentActivity.jsx` widget. Embedded widget into `AdminDashboard` and `SuperintendentDashboard`. Added "Activity Log" link to `Sidebar.jsx`.
  * **Verification**: Authored automated test script `test_phase15_activity.js` validating statistics, paginated list querying, module filtering, detail fetching, and role-scoped hostel isolation.
  * **Status**: Complete.

* **2026-08-23 (Phase 14) — User Management, Authentication & Security Hardening**
  * **Objective**: Hardened the identity, authentication, user account management, and security audit layer.
  * **Database Architecture**: Added `must_change_password` and `last_login_at` to `users`. Created `security_audit_log` table storing audit events.
  * **Security & Authentication**:
    * Password complexity enforcement (8+ chars, 1 uppercase, 1 lowercase, 1 digit).
    * Forced initial password change workflow (`must_change_password`).
    * Real-time `status = 'ACTIVE'` session verification in `authMiddleware.js`.
    * Privacy scrubbing in `securityService.js` to strip passwords/tokens from audit logs.
    * Self-deactivation and last Super Admin demotion protection in `userService.js`.
  * **User Administration**:
    * Created REST endpoints `/api/users`, `/api/profile`, and `/api/security/audit`.
    * Superintendent hostel scoping controls (`superintendent_hostels`).
  * **Frontend UI Components**: Built `UserManagementPage.jsx`, `SecurityAuditPage.jsx`, `ProfilePage.jsx`, and `ForcePasswordChangeModal.jsx`.
  * **Verification**: Authored `backend/src/test_phase14_security.js`. All 12/12 automated security tests passed.
  * **Status**: Complete.

* **2026-08-23 (Phase 13) — Student Allocation, Room/Bed Transfer & Checkout Management System**
  * **Objective**: Implemented student accommodation lifecycle (Allocation → Transfer → Checkout) with immutable historical integrity, database-level uniqueness constraints, and transaction safety.
  * **Database Architecture**: Created `student_allocations` table with virtual columns (`active_student_key`, `active_bed_key`) and `UNIQUE` indexes guaranteeing strictly 1 active allocation per student and bed.
  * **Backend Service**: Developed `allocationService.js`, `allocationController.js`, and `allocationRoutes.js` with atomic transactions (`BEGIN`, `COMMIT`, `ROLLBACK`) and diagnostic consistency tool (`/api/allocations/consistency`).
  * **Frontend UI Components**: Created `AllocationModal.jsx`, `TransferModal.jsx`, `CheckoutModal.jsx`, `AllocationDetailsModal.jsx`, `AllocationsPage.jsx`, and `StudentAccommodationPage.jsx`.
  * **Verification**: Authored `backend/src/test_phase13_allocations.js`. All 12/12 automated integration tests passed.
  * **Status**: Complete.

* **2026-08-23 (Phase 12) — Reports & Analytics Center**
  * **Objective**: Designed and implemented a centralized, read-only Reports & Analytics Center combining data across Students, Hostels, Rooms, Beds, Attendance, Complaints, Visitors, Mess, and Fees.
  * **Architecture & Services**:
    * Created `reportService.js`, `reportController.js`, and `reportRoutes.js`.
    * No Phase 12 database tables added. All reporting calculations read directly from existing tables.
    * Server-side authorization and hostel scoping (Super Admin = cross-hostel, Superintendent = assigned hostels only, Student = blocked from admin report APIs).
    * Server-side date range validation (`YYYY-MM-DD`, `date_from <= date_to`, max 365 days range).
    * `DECIMAL`-safe SQL aggregation calculations for financial fee collections.
  * **API Endpoints**:
    * `GET /api/reports/overview`: Consolidated high-level KPIs.
    * `GET /api/reports/students`: Branch, Course, Year, and Hostel student distribution.
    * `GET /api/reports/attendance`: Daily attendance trends and hostel comparisons.
    * `GET /api/reports/occupancy`: Total beds, occupied/available/maintenance breakdowns, and hostel-wise occupancy rates.
    * `GET /api/reports/complaints`: Resolution rates, category/priority breakdowns, and daily inflow trends.
    * `GET /api/reports/visitors`: Visit status breakdowns, visitor relations, and daily visitor volume trends.
    * `GET /api/reports/mess`: Meal participation rates by meal type (Breakfast, Lunch, Snacks, Dinner).
    * `GET /api/reports/fees`: Expected, collected, pending, overdue, waived totals, collection rates, and daily revenue trends.
  * **Frontend UI Components**:
* **2026-08-27 (Phase 20) — Course & Branch Dropdowns, Student DOB & Automated Credentials**
  * **Objective**: Streamlined student registration data entry using institutional course and branch dropdowns, added student Date of Birth (DOB) tracking, and established standard login credentials where Registration Number is the User ID and DOB is the default Password.
  * **Database Architecture**: Added `date_of_birth DATE NULL DEFAULT NULL` to the `students` table across Hostinger Production MySQL, `schema.sql`, and `hostinger_production_schema.sql`.
  * **Backend Enhancements**:
    * `studentService.createStudent`: Accepted `date_of_birth`, stored in `students`, synchronized `users.full_name`, and hashed default password derived from student DOB (`DDMMYYYY`).
    * `studentService.updateStudent`: Enabled updating `date_of_birth` and keeping `users` credentials in sync.
    * `studentService.getStudents`: Supported filtering by `course` parameter and returned `date_of_birth` across all student queries.
    * `authService.getUserProfile`: Selected and returned `s.date_of_birth` in `student_profile`.
  * **Frontend UI Enhancements**:
    * `StudentsPage.jsx`:
      * Implemented `COURSE_PROGRAMS` (`B.Tech`, `Diploma`, `MBA`) and `COURSE_BRANCH_MAP` dynamically linking branches (e.g. Aeronautical, AME, Civil, Electrical, Mechanical for Diploma; Marketing, Finance, HR, Agri-Business for MBA; CSE, ECE, EE, CE, ME, AME, Aero, Agri for B.Tech) with custom branch fallback.
      * Labeled `Registration Number (User ID) *` with instructional copy.
      * Added `Date of Birth *` picker that automatically generates default password in `DDMMYYYY` format (e.g. `15082005`) with show/hide toggle.
      * Added `Filter by Course` dropdown in top toolbar for fast categorization.
      * Displayed Date of Birth in Student Profile Details drawer.
    * `ProfilePage.jsx`: Displayed Date of Birth under student accommodation & academic section.
  * **Verification**: Executed migration on live Hostinger MySQL; verified with `backend/src/scripts/test_student_dob_login.js` (User registration, DOB hashing, and login authentication passed 100%). Verified production build (`npm run build`).
  * **Status**: Complete & Live.

* **2026-08-27 (Phase 19) — Warden Gender & Self-Service Profile Management**
  * **Objective**: Added institutional gender tracking (MALE / FEMALE / OTHER) for wardens and system users, enabled wardens to view and edit their profile details directly, and added assigned hostel oversight to the profile page.
  * **Database Architecture**: Added `full_name VARCHAR(150)`, `gender ENUM('MALE', 'FEMALE', 'OTHER')`, and `phone VARCHAR(20)` columns to the `users` table across Hostinger Production MySQL, `schema.sql`, and `hostinger_production_schema.sql`.
  * **Backend Enhancements**:
    * `authService.getUserProfile`: Selected `u.full_name`, `u.gender`, `u.phone`; for `SUPERINTENDENT`, attached `assigned_hostels` with hostel name, code, type, and location.
    * `userService.updateSelfProfile`: Whitelisted and validated `full_name`, `gender` ('MALE', 'FEMALE', 'OTHER'), `phone`/`phone_number`, and unique `email`. Maintained student profile sync.
    * `userService.createUser` & `getUsers`: Supported `full_name`, `gender`, and `phone` in user management directory.
  * **Frontend UI Enhancements**:
    * `ProfilePage.jsx`: Added editable inputs for Full Name, Gender dropdown (Male 👨 / Female 👩 / Other 👤), Contact Phone, and Email Address. Added dynamic Gender badge in header and assigned hostels management cards for Superintendents.
    * `UserManagementPage.jsx`: Added Gender column to user directory and gender input in user creation modal.
  * **Verification**: Executed migration on live Hostinger MySQL; authored and verified `backend/src/scripts/test_warden_profile.js`. Verified production Vite build.
  * **Status**: Complete & Live.

* **2026-08-26 (Phase 18) — Cloud Deployment & Institutional Branding**
  * **Objective**: Successfully set up multi-cloud production deployment (Firebase Hosting for Frontend, Render for Backend, Hostinger for MySQL) and applied official BEC College branding across the entire portal.
  * **Frontend Cloud Hosting (Firebase)**: Configured `frontend/firebase.json` with SPA catch-all rewrite (`**` → `/index.html`) and `frontend/.firebaserc` pointing to project `bechostels`. Live at `https://bechostels.web.app`.
  * **Backend Cloud Service (Render)**: Set up Node.js service targeting `backend/` directory with `npm install` build step and `node src/app.js` entrypoint. Cloud database connection to Hostinger MySQL (`srv1334.hstgr.io:3306`). Service live at `https://bec-hostel-backend.onrender.com`.
  * **Cross-Domain Authentication (CORS & Dual-Token)**:
    * Whitelisted `https://bechostels.web.app` and `https://bechostels.firebaseapp.com` in `app.js` CORS configuration.
    * Implemented dual-token transport in `authMiddleware.js` and `authController.js`: supports both SameSite: None HttpOnly cookies AND `Authorization: Bearer <token>` from `localStorage` to completely bypass cross-site cookie restrictions on modern browsers (Safari, Chrome Incognito, iOS).
  * **Render Keep-Alive Strategy**: Endpoint `/api/health` monitored via external cron ping (e.g. cron-job.org / UptimeRobot every 10-14 mins) to prevent Render free tier cold starts.
  * **Institutional Branding**: Integrated official `BEC LOGO FINAL.png` into `Navbar.jsx`, `Sidebar.jsx`, `Login.jsx`, and as browser tab favicon in `frontend/index.html` via `favicon.png`.
  * **Status**: Complete & Live.

* **2026-08-23 (Phase 16) — Hostel Operations, Maintenance & Daily Task Management**
  * **Objective**: Designed and implemented the complete daily hostel operations, maintenance ticket management, and room inspection tracking system with state-machine workflow enforcement and security audit logging.
  * **Database Architecture**: Created `maintenance_requests`, `maintenance_updates`, and `room_inspections` tables with index optimization on `(hostel_id, status)`, `(student_id, status)`, and `(room_id, inspection_date)`.
  * **Workflow & State Machine**: Implemented status state machine (`OPEN` → `ASSIGNED` / `IN_PROGRESS` → `RESOLVED` → `CLOSED`, with student `REOPENED` workflow). Guarded priority elevation (`LOW`/`MEDIUM`/`HIGH` for students; `URGENT` restricted to staff or staff elevation).
  * **Location Validation & IDOR Protection**: Enforced strict location hierarchy checking (`hostel` → `floor` → `room` → `bed`) and role scoping (students see own requests/allocations; superintendents see assigned hostels).
  * **Frontend UI Components**: Built `MaintenancePage.jsx`, `InspectionsPage.jsx`, `OperationsDashboardPage.jsx`, `MaintenanceFormModal.jsx`, `MaintenanceDetailsModal.jsx`, `InspectionFormModal.jsx`, and `InspectionHistoryModal.jsx`. Updated `Sidebar.jsx` and `App.jsx` with operational route management.
  * **Activity Log Integration**: Integrated all maintenance creation, status changes, assignments, priority shifts, and room inspection events into Phase 15 `activity_log` under module `OPERATIONS`.
  * **Verification**: Authored `backend/src/scripts/test_phase16_operations.js`. All 24/24 automated operational audit tests passed successfully.
  * **Status**: Complete.

* **2026-08-23 (Phase 17) — Master Data Management & Data Integrity Center**
  * **Objective**: Centralized master data administration for hostels, floors, rooms, beds, and academic structures with automated data integrity diagnostics and controlled safe repairs.
  * **Safety & Data Consistency**: Enforced relational integrity guards preventing deactivation or deletion of entities with active dependencies (occupied beds, active allocations, open maintenance).
  * **Diagnostic Center**: Implemented `integrityService.js` supporting diagnostic scanning across 15+ integrity rules and safe repair endpoints.
  * **Verification**: Authored `backend/src/scripts/test_phase17_master_data.js`. All 15/15 automated unit, safety guard, and integrity diagnostic tests passed successfully (100% pass rate).
  * **Status**: Complete.

* **2026-08-23 (Phase 15) — System Activity & Audit Center**
  * **Objective**: Built a centralized operational activity and audit logging system (`activity_log`) recording action, module, entityType, actor, hostel, and sanitized metadata.
  * **Security & Sanitization**: Stripped secrets/tokens and masked sensitive identification fields.
  * **Verification**: Authored `backend/src/scripts/test_phase15_activity.js`. All audit tests passed successfully.
  * **Status**: Complete.

* **2026-08-23 (Phase 11) — Hostel Fees & Payment Management System**
  * **Objective**: Implemented the complete financial tracking, fee structure management, student fee assignment, transaction-safe payment recording with receipt generation, fee waivers, and financial analytics.
  * **Database Architecture**: Added four new tables (`fee_structures`, `student_fees`, `fee_payments`, `fee_history`) in `schema.sql` and `migrations/phase11_fees.sql`.
  * **Financial & Data Safety**: Handled monetary values as `DECIMAL(10,2)`, transaction-safe payment recording, receipt generation (`FEE-YYYY-XXXXXX`), and status tracking (`PENDING`, `PARTIAL`, `PAID`, `OVERDUE`, `WAIVED`).
  * **Security & IDOR Protections**: Enforced Super Admin waiver permissions, derived student IDs strictly from JWT sessions, and blocked cross-student data viewing.
  * **Frontend UI Components**: Built `FeeSummaryCards.jsx`, `FeeCard.jsx`, `FeeStructureModal.jsx`, `AssignFeeModal.jsx`, `RecordPaymentModal.jsx`, `FeeWaiverModal.jsx`, `FeeReceiptModal.jsx`, `FeeDetailsModal.jsx`, and `FeeManagementPage.jsx`.
  * **Verification**: Authored `backend/src/test_phase11_fees.js`. All 17/17 automated financial audit tests passed successfully.
  * **Status**: Complete.

* **2026-08-23 (Phase 10) — Hostel Mess & Food Management System**
  * **Objective**: Designed and implemented end-to-end Mess & Food Management allowing staff to publish daily/weekly menus, track meal attendance (TAKING / NOT_TAKING), enforce meal cutoff rules, view mess analytics, and handle mess complaints.
  * **Database Tables**: Added `mess_menus` and `meal_attendance` tables with composite unique constraints `(hostel_id, menu_date, meal_type)` and `(student_id, meal_date, meal_type)`. Indexed `(hostel_id, menu_date)` and `(student_id, meal_date)`.
  * **Business & Security Logic**: Created `messService.js`, `messController.js`, and `messRoutes.js`. Built role-based menu scoping (Super Admin multi-hostel/common, Superintendent assigned hostels, Student read-only/own hostel). Derived `student_id` strictly from JWT session for IDOR protection. Implemented cutoff enforcement.
  * **Complaints Integration**: Integrated with existing `complaints` table under category `FOOD_MESS`.
  * **Frontend UI Components**: Developed `MealCard.jsx`, `WeeklyMenu.jsx` (desktop table grid & mobile accordion), `MenuFormModal.jsx`, `MessAnalyticsCard.jsx`, `RecentMessSection.jsx`, and `MessPage.jsx`. Connected Sidebar navigation and embedded widgets into Admin, Superintendent, and Student dashboards.
  * **Verification**: Authored `backend/src/test_phase10_mess.js`. All 10/10 automated tests passed successfully. Verified production build using `npm run build`.
  * **Status**: Complete.

* **2026-08-23 (Phase 9) — Hostel Visitor Management System**
  * **Objective**: Built a secure, role-based visitor tracking workflow (REQUESTED → APPROVED → CHECKED_IN → CHECKED_OUT) with strict IDOR protections and privacy compliance.
  * **Database Tables**: Created `visits` and `visitor_history` with foreign key constraints and indexes on `(hostel_id, status)`, `(student_id, visit_date)`, `(status, expected_check_out)`.
  * **Privacy Compliance**: Enforced `identification_type` + `identification_last4` storage. Sensitive document numbers (e.g., Aadhaar/SSN) are masked.
  * **Backend Service**: Developed `visitorService.js`, `visitorController.js`, and `visitorRoutes.js`. Implemented student profile automatic derivation, superintendent hostel scoping, and status state machine guards.
  * **Frontend UI Components**: Built `VisitorCard.jsx`, `VisitorFormModal.jsx`, `VisitorDetailsModal.jsx`, `RecentVisitorsSection.jsx`, and `VisitorsPage.jsx` with real-time status tabs and search filtering.
  * **Verification**: Authored `test_phase9_visitors.js`. All 13 audit tests passed successfully.
  * **Status**: Complete.

* **2026-08-23 (Phase 6) — Main Dashboard & Hostel Analytics**
  * **Change**: Implemented backend dashboard aggregation service and frontend dashboard pages.
  * **Files Added**: `dashboardService.js`, `dashboardRoutes.js`, `AdminDashboard.jsx`, `SuperintendentDashboard.jsx`, `StatCard`, `HostelCard`, `AttendanceChart`, `OccupancySummary` components.
  * **Status**: Complete (refined in Phase 6.5).

* **2026-08-22 (Phase 5) — Attendance Management**
  * **Change**: Implemented daily attendance marking, student attendance history, attendance stats.
  * **Files Added**: `attendanceService.js`, `attendanceController.js`, `attendanceRoutes.js`.
  * **Status**: Complete.

* **2026-08-22 (Phase 4) — Student Management & Cloudinary Integration**
  * **Change**: Full student CRUD, profile photos via Cloudinary, room/bed assignment.
  * **Files Added**: `studentService.js`, `studentController.js`, `studentRoutes.js`, Cloudinary config.
  * **Status**: Complete.

* **2026-08-22 (Phase 3) — Hostel/Floor/Room/Bed Management**
  * **Change**: Full infrastructure CRUD for hostels, floors, rooms, beds.
  * **Files Added**: `hostelService.js`, `floorService.js`, `roomService.js`, `bedService.js`, respective controllers and routes.
  * **Status**: Complete.

* **2026-08-22 (Phase 2) — Authentication & RBAC**
  * **Change**: Implemented secure authentication and Role-Based Access Control.
  * **Status**: Complete. 12/12 integration tests passed.

* **2026-09-18 (Phase 21) — Standard Authentication & First-Time Login Removal**
  * **Objective**: Streamlined login authentication across all roles (SUPER_ADMIN, SUPERINTENDENT, STUDENT) using standard credentials (Registration Number / Username / Email + Password).
  * **Removal of First-Time Login DOB Feature**:
    * Completely removed the "First Time Login?" tab, DOB activation inputs, and `/api/auth/student-first-login` endpoint per user request.
    * Restored clean, single-form login UI (`Login.jsx`) supporting Registration Number, Username, or Email with Password for all user roles.
  * **Password & Security Management**:
    * Retained `ForcePasswordChangeModal` with a clear Close / Cancel UI button for password change enforcement if required.
    * Maintained password security, JWT session authentication, cookie/bearer token handling, and role-based access control.
  * **Verification**: Verified frontend build (`npm run build` completed with 0 errors). Verified live Hostinger MySQL connection and backend API endpoints.
  * **Status**: Complete & Verified on Live Hostinger MySQL.

* **2026-08-22 (Phase 1) — Foundation**
  * **Change**: Initialized repository, backend and database structure, mobile-first frontend shell.
  * **Status**: Complete.

