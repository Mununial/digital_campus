-- MySQL Database Schema for College ERP System (Reporting & Management)
-- Compatible with Hostinger MySQL & Standard MySQL 5.7 / 8.0+

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',
    user_role VARCHAR(50) DEFAULT 'student',
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME
);

CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    registration_number VARCHAR(100),
    enrollment_number VARCHAR(100),
    roll_number VARCHAR(100),
    section VARCHAR(50),
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    verified BOOLEAN DEFAULT FALSE,
    id_card_generated BOOLEAN DEFAULT FALSE,
    remarks TEXT,
    personal_json JSON,
    reporting_json JSON,
    facilities_json JSON,
    fees_json JSON,
    documents_json JSON,
    hostel_json JSON,
    transport_json JSON,
    antiragging_json JSON,
    admin_json JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_reg (registration_number),
    INDEX idx_student_status (status),
    INDEX idx_student_verified (verified)
);

CREATE TABLE IF NOT EXISTS admins (
    id VARCHAR(100) PRIMARY KEY,
    uid VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    user_role VARCHAR(50) DEFAULT 'admin',
    is_admin BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(50),
    details_json JSON,
    ip_address VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
