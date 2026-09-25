# BEC Student Reporting Management System (SRMS)

Welcome to the BEC Student Reporting Management System. This is a robust, production-grade web application designed for Bhubaneswar Engineering College to digitize and manage the entire student reporting, registration, and document verification process.

## Architecture Overview
- **Frontend:** Vanilla HTML, CSS, JavaScript (ES6 Modules)
- **Backend/API:** Node.js, Express.js
- **Database:** Firebase Firestore (NoSQL)
- **File Storage:** Firebase Storage
- **Authentication:** Firebase Auth (Email/Password)

## Key Features
- **Offline-First Synchronization:** Students can fill out multi-part forms and data is synchronized seamlessly with Firestore via an intelligent background syncing mechanism (with exponential backoff).
- **Secure Document Upload:** Canvas-based client-side image compression combined with Firebase Storage for efficient document management.
- **Role-Based Access Control (RBAC):** Strict Firestore Security Rules separating Student, Staff, and Admin privileges.
- **Admin Dashboard:** High-performance cursor-based pagination and prefix searching for thousands of records without memory leaks.
- **PDF Generation:** Automated official College ID Card and Reporting Form generation directly from the browser (html2pdf).

## Getting Started
Please refer to the following documentation files for specific instructions:

- [INSTALL.md](./INSTALL.md): Instructions for local development setup.
- [DEPLOYMENT.md](./DEPLOYMENT.md): Comprehensive guide for production deployment.
- [ADMIN_GUIDE.md](./ADMIN_GUIDE.md): User manual for college staff and administrators.

## Version
**v1.0.0-prod**
