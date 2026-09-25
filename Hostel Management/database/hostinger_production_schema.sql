-- Hostinger Production Database Schema for u847513759_bec_hostel
-- Note: Do NOT add CREATE DATABASE or USE statements for Hostinger phpMyAdmin

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert mandatory base system roles only
INSERT IGNORE INTO `roles` (`id`, `name`) VALUES
(1, 'SUPER_ADMIN'),
(2, 'SUPERINTENDENT'),
(3, 'STUDENT');

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `role_id` INT NOT NULL,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `full_name` VARCHAR(150) NULL DEFAULT NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL DEFAULT NULL,
    `phone` VARCHAR(20) NULL DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    `must_change_password` TINYINT(1) NOT NULL DEFAULT 0,
    `last_login_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Hostels Table
CREATE TABLE IF NOT EXISTS `hostels` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `code` VARCHAR(10) NOT NULL UNIQUE,
    `gender` ENUM('MALE', 'FEMALE', 'COED') NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Floors Table
CREATE TABLE IF NOT EXISTS `floors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT NOT NULL,
    `floor_name` VARCHAR(50) NOT NULL,
    `floor_number` INT NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_hostel_floor` (`hostel_id`, `floor_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Rooms Table
CREATE TABLE IF NOT EXISTS `rooms` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT NOT NULL,
    `floor_id` INT NULL DEFAULT NULL,
    `room_number` VARCHAR(20) NOT NULL,
    `capacity` INT NOT NULL DEFAULT 4,
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY `unique_hostel_room` (`hostel_id`, `room_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Beds Table
CREATE TABLE IF NOT EXISTS `beds` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_id` INT NOT NULL,
    `bed_number` VARCHAR(20) NOT NULL,
    `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_room_bed` (`room_id`, `bed_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Students Table
CREATE TABLE IF NOT EXISTS `students` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `student_id` VARCHAR(50) NOT NULL UNIQUE,
    `roll_number` VARCHAR(50) NOT NULL UNIQUE,
    `full_name` VARCHAR(150) NOT NULL,
    `date_of_birth` DATE NULL DEFAULT NULL,
    `photo_url` VARCHAR(255) DEFAULT NULL,
    `cloudinary_public_id` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `branch` VARCHAR(100) NOT NULL,
    `course` VARCHAR(100) NOT NULL,
    `year` INT NOT NULL,
    `semester` INT NOT NULL,
    `bed_id` INT DEFAULT NULL UNIQUE,
    `admission_date` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'GRADUATED') DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Superintendent Hostels Table
CREATE TABLE IF NOT EXISTS `superintendent_hostels` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_superintendent_hostel` (`user_id`, `hostel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Attendance Table
CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `attendance_date` DATE NOT NULL,
    `status` ENUM('PRESENT', 'ABSENT') NOT NULL,
    `marked_by` INT NOT NULL,
    `marked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`marked_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `unique_student_date` (`student_id`, `attendance_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Notices Table
CREATE TABLE IF NOT EXISTS `notices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `created_by` INT NOT NULL,
    `hostel_id` INT DEFAULT NULL,
    `priority` ENUM('GENERAL', 'IMPORTANT', 'URGENT') DEFAULT 'GENERAL',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
    `published_at` TIMESTAMP DEFAULT NULL,
    `expires_at` TIMESTAMP DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Notice Reads Table
CREATE TABLE IF NOT EXISTS `notice_reads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `notice_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`notice_id`) REFERENCES `notices` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `unique_notice_user_read` (`notice_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Complaints Table
CREATE TABLE IF NOT EXISTS `complaints` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `category` ENUM('ROOM', 'ELECTRICITY', 'WATER', 'PLUMBING', 'CLEANLINESS', 'FAN_AC', 'FURNITURE', 'FOOD_MESS', 'INTERNET', 'SECURITY', 'MAINTENANCE', 'OTHER') NOT NULL DEFAULT 'ROOM',
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
    `assigned_to` INT DEFAULT NULL,
    `resolution` TEXT DEFAULT NULL,
    `resolved_at` TIMESTAMP DEFAULT NULL,
    `closed_at` TIMESTAMP DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Complaint History Table
CREATE TABLE IF NOT EXISTS `complaint_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT NOT NULL,
    `changed_by` INT NOT NULL,
    `old_status` VARCHAR(30) DEFAULT NULL,
    `new_status` VARCHAR(30) DEFAULT NULL,
    `comment` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Complaint Comments Table
CREATE TABLE IF NOT EXISTS `complaint_comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `complaint_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `comment` TEXT NOT NULL,
    `is_internal` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Visits Table
CREATE TABLE IF NOT EXISTS `visits` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `room_id` INT DEFAULT NULL,
    `bed_id` INT DEFAULT NULL,
    `visitor_name` VARCHAR(100) NOT NULL,
    `visitor_phone` VARCHAR(20) NOT NULL,
    `visitor_email` VARCHAR(100) DEFAULT NULL,
    `visitor_type` ENUM('PARENT', 'GUARDIAN', 'RELATIVE', 'FRIEND', 'OFFICIAL', 'OTHER') NOT NULL DEFAULT 'PARENT',
    `purpose` TEXT NOT NULL,
    `identification_type` VARCHAR(50) NOT NULL DEFAULT 'Aadhaar',
    `identification_last4` VARCHAR(10) NOT NULL,
    `visit_date` DATE NOT NULL,
    `expected_check_in` DATETIME NOT NULL,
    `expected_check_out` DATETIME NOT NULL,
    `actual_check_in` DATETIME DEFAULT NULL,
    `actual_check_out` DATETIME DEFAULT NULL,
    `status` ENUM('REQUESTED', 'APPROVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `created_by` INT NOT NULL,
    `approved_by` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Visitor History Table
CREATE TABLE IF NOT EXISTS `visitor_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `visit_id` INT NOT NULL,
    `changed_by` INT NOT NULL,
    `old_status` VARCHAR(50) DEFAULT NULL,
    `new_status` VARCHAR(50) NOT NULL,
    `comment` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`visit_id`) REFERENCES `visits` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Mess Menus Table
CREATE TABLE IF NOT EXISTS `mess_menus` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT DEFAULT NULL,
    `menu_date` DATE NOT NULL,
    `meal_type` ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER') NOT NULL,
    `meal_name` VARCHAR(255) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `is_available` TINYINT(1) DEFAULT 1,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Meal Participation / Attendance Table
CREATE TABLE IF NOT EXISTS `meal_attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `meal_date` DATE NOT NULL,
    `meal_type` ENUM('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER') NOT NULL,
    `status` ENUM('TAKING', 'NOT_TAKING') NOT NULL DEFAULT 'TAKING',
    `marked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uk_student_meal_date` (`student_id`, `meal_date`, `meal_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Fee Structures Table
CREATE TABLE IF NOT EXISTS `fee_structures` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT DEFAULT NULL,
    `fee_type` ENUM('HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT', 'OTHER') NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT DEFAULT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `frequency` ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'YEARLY') NOT NULL DEFAULT 'YEARLY',
    `academic_year` VARCHAR(20) NOT NULL,
    `applicable_course` VARCHAR(50) DEFAULT NULL,
    `applicable_branch` VARCHAR(50) DEFAULT NULL,
    `applicable_year` INT DEFAULT NULL,
    `is_active` TINYINT(1) DEFAULT 1,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Student Assigned Fees Table
CREATE TABLE IF NOT EXISTS `student_fees` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `fee_structure_id` INT DEFAULT NULL,
    `academic_year` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `due_date` DATE NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    `waiver_reason` TEXT DEFAULT NULL,
    `waived_by` INT DEFAULT NULL,
    `waived_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`waived_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Fee Payment Records Table
CREATE TABLE IF NOT EXISTS `fee_payments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_fee_id` INT NOT NULL,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `payment_method` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER') NOT NULL,
    `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
    `transaction_reference` VARCHAR(100) DEFAULT NULL,
    `payment_date` DATE NOT NULL,
    `received_by` INT NOT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_fee_id`) REFERENCES `student_fees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Fee Audit History Table
CREATE TABLE IF NOT EXISTS `fee_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_fee_id` INT NOT NULL,
    `changed_by` INT NOT NULL,
    `action` ENUM('ASSIGNED', 'PAYMENT_RECORDED', 'WAIVED', 'UPDATED', 'CORRECTED') NOT NULL,
    `old_value` VARCHAR(255) DEFAULT NULL,
    `new_value` VARCHAR(255) DEFAULT NULL,
    `reason` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_fee_id`) REFERENCES `student_fees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Student Allocations & Room Transfer History Table
CREATE TABLE IF NOT EXISTS `student_allocations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `bed_id` INT NOT NULL,
    `allocated_from` DATE NOT NULL,
    `allocated_until` DATE DEFAULT NULL,
    `status` ENUM('ACTIVE', 'TRANSFERRED', 'CHECKED_OUT', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `allocated_by` INT NOT NULL,
    `checkout_reason` ENUM('COURSE_COMPLETED', 'TRANSFERRED', 'LEFT_COLLEGE', 'HOSTEL_CHANGE', 'DISCIPLINARY', 'PERSONAL', 'OTHER') DEFAULT NULL,
    `transfer_reason` TEXT DEFAULT NULL,
    `custom_reason` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`allocated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_allocations_student` (`student_id`, `status`),
    INDEX `idx_allocations_hostel` (`hostel_id`, `status`),
    INDEX `idx_allocations_room` (`room_id`, `status`),
    INDEX `idx_allocations_bed` (`bed_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Security Audit Log Table
CREATE TABLE IF NOT EXISTS `security_audit_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `actor_id` INT NULL,
    `action` VARCHAR(50) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Activity Log Table
CREATE TABLE IF NOT EXISTS `activity_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `actor_id` INT NULL,
    `action` VARCHAR(50) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` INT NULL,
    `hostel_id` INT NULL,
    `student_id` INT NULL,
    `description` TEXT NOT NULL,
    `metadata` JSON NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Maintenance Requests Table
CREATE TABLE IF NOT EXISTS `maintenance_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT NOT NULL,
    `floor_id` INT NULL,
    `room_id` INT NULL,
    `bed_id` INT NULL,
    `category` ENUM('ELECTRICAL', 'PLUMBING', 'FURNITURE', 'BED', 'ROOM', 'BATHROOM', 'CLEANING', 'INTERNET', 'SAFETY', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `title` VARCHAR(150) NOT NULL,
    `description` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
    `reported_by` INT NOT NULL,
    `student_id` INT NULL,
    `assigned_to` INT NULL,
    `reported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `started_at` TIMESTAMP NULL DEFAULT NULL,
    `resolved_at` TIMESTAMP NULL DEFAULT NULL,
    `resolution_note` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Maintenance Updates Table
CREATE TABLE IF NOT EXISTS `maintenance_updates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `maintenance_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `message` TEXT NOT NULL,
    `old_status` VARCHAR(50) NULL,
    `new_status` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Room Inspections Table
CREATE TABLE IF NOT EXISTS `room_inspections` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `hostel_id` INT NOT NULL,
    `floor_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `inspected_by` INT NOT NULL,
    `inspection_date` DATE NOT NULL,
    `cleanliness_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `electrical_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `plumbing_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `furniture_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `bed_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `safety_status` ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`inspected_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
