# College Hostel Management System (CHMS)

A robust, production-ready full-stack application built to streamline room bookings, attendance, notification boards, and profile management for university hostels.

## Features (Planned & Under Development)
- **Multi-Hostel Directory**: Management of 6 independent campuses (boys and girls branches).
- **Secure Authentication & RBAC**: JWT HttpOnly cookie-based session management with role-based routing (Super Admin, Superintendent, Student).
- **Floor-Room-Bed Allocation**: Normalized tracking to prevent double-booking.
- **Superintendent Oversight**: Assignment mapping for wardens to manage single/multiple buildings.
- **Direct Image Uploads**: Cloudinary-powered profile photo storage.
- **Roll-Call & Attendance**: Daily attendance check records.
- **Announcement Board**: Multi-hostel notices broadcast.
- **Reports & Analytics Center**: Centralized cross-functional reporting (Overview, Students, Attendance, Occupancy, Complaints, Visitors, Mess, Fees) with server-side role scoping and date range validation.
- **Student Allocation & Transfer Lifecycle**: Transaction-safe room allocations, bed transfers (with side-by-side current vs target confirmation), hostel checkouts (with valid reason enums), immutable historical tracking, and DB-level uniqueness constraints.

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), Axios, React Router v6, Responsive Vanilla CSS Core
- **Backend**: Node.js, Express, Helmet, CORS, Cookie Parser, Dotenv, MySQL (`mysql2/promise` with in-memory Mock DB fallback)
- **Database**: MySQL (Hosted on Hostinger)
- **Media Hosting**: Cloudinary

---

## 📂 Project Structure
```
Hostel Management/
├── BRAIN.md                # Persistent project details & Change Log
├── README.md                # Quickstart & setup documentation
├── .gitignore               # Multi-env git rule filters
├── .env.example             # Clean environment configuration keys
│
├── database/
│   ├── schema.sql           # MySQL database schema definition
│   └── seed.sql             # MySQL default seed roles, hostels, test users
│
├── backend/                 # Express REST API
│   ├── src/
│   │   ├── config/          # Environment variables validation, database and Cloudinary setup
│   │   ├── controllers/     # Route controllers (health, hostels, auth, students)
│   │   ├── middleware/      # Auth security filters & rate limiters
│   │   ├── routes/          # Express Router definitions
│   │   ├── services/        # Query execution and auth services
│   │   ├── utils/           # Password hashing (bcryptjs) & auth helpers
│   │   └── app.js           # Server initializer
│   └── package.json
│
└── frontend/                # React (Vite) User Portal
    ├── src/
    │   ├── components/      # UI components & ProtectedRoute route guards
    │   ├── context/         # AuthContext (State manager)
    │   ├── layouts/         # Layout modules (DashboardLayout)
    │   ├── pages/           # Pages (DashboardPlaceholder, Login)
    │   ├── services/        # Axios API configurations (credentials enabled)
    │   ├── App.jsx          # Root router mount
    │   └── main.jsx         # React application initializer
    └── package.json
```

---

## 🔑 Development Test Accounts
The database seeding script initializes the following pre-configured test users for testing authorization scopes.
* **Super Admin**: Username `superadmin` / Password `password123`
* **Superintendent (Warden)**: Username `warden` / Password `password123`
* **Student**: Username `student` / Password `password123`

> [!WARNING]
> These credentials are for local development and integration testing only. In a production environment, registration endpoints are closed to the public and passwords must be modified immediately.

---

## 🛡️ Authentication Security Architecture
- **HttpOnly Cookies**: Authentication JWT tokens are saved securely in browser cookies flagged with `HttpOnly` and `SameSite=Lax`. This blocks JavaScript-based XSS attacks from reading token keys.
- **Login Brute-Force Rate Limiting**: The login endpoint is guarded with an in-memory rate limiter permitting a maximum of 5 attempts per 15 minutes per IP address.
- **Input Sanitization**: Request bodies are validated for missing entries and length constraints before hitting database queries.
- **Generic Responses**: Returns unified "Invalid credentials" errors to prevent username/email enumeration.

---

## 🚀 Installation & Local Setup

### 1. Database Setup
1. Open your MySQL client (local or remote phpMyAdmin).
2. Execute the schema statements in [database/schema.sql](file:///d:/TEST%20PROJECT/Hostel%20Management/database/schema.sql) to initialize all core tables, foreign keys, and indexes.
3. Execute [database/seed.sql](file:///d:/TEST%20PROJECT/Hostel%20Management/database/seed.sql) to populate roles, hostels, and test accounts.
4. For Phase 7 Notice System update on existing databases, apply [database/migrations/phase7_notices.sql](file:///d:/TEST%20PROJECT/Hostel%20Management/database/migrations/phase7_notices.sql).

### 2. Environment Configuration
Create a `.env` file in the root workspace directory matching the variables in `.env.example`:
```env
# Server
PORT=5001
NODE_ENV=development

# MySQL DB
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=hostel_management

# JWT (Authentication)
JWT_SECRET=super_secret_local_dev_only_key_123456789

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

### 3. Backend Setup & Test Suite
1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the backend development server:
   ```bash
   npm run dev
   ```

The backend server is accessible at `http://localhost:5001`.

### 4. Frontend Setup
1. Open a terminal in the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```

The frontend client is accessible at `http://localhost:5173`.

---

## 📱 Mobile-First Guidelines
- Responsive sidebar navigates dynamically based on the user's role (Super Admin, Superintendent, Student).
- Protected pages verify role clearance and render customized layouts or secure Forbidden notices.
- Large, touch-friendly inputs (minimum 44x44px target) with a password visibility toggle.
