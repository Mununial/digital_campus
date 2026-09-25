-- ============================================================================
-- Phase 8 Migration: Complaint & Grievance Management System
-- Safe, Non-Destructive DDL Script
-- Target Database: MySQL 8.0+ / MariaDB 10.3+
-- ============================================================================

-- 1. Create 'complaints' table if not exists
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
  `resolved_at` DATETIME DEFAULT NULL,
  `closed_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`hostel_id`) REFERENCES `hostels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create 'complaint_history' table if not exists
CREATE TABLE IF NOT EXISTS `complaint_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `changed_by` INT NOT NULL,
  `old_status` VARCHAR(30) DEFAULT NULL,
  `new_status` VARCHAR(30) DEFAULT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create 'complaint_comments' table if not exists
CREATE TABLE IF NOT EXISTS `complaint_comments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `complaint_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `comment` TEXT NOT NULL,
  `is_internal` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`complaint_id`) REFERENCES `complaints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Indexes for query optimization
CREATE INDEX `idx_complaints_student` ON `complaints` (`student_id`);
CREATE INDEX `idx_complaints_hostel` ON `complaints` (`hostel_id`);
CREATE INDEX `idx_complaints_status` ON `complaints` (`status`);
CREATE INDEX `idx_complaints_priority` ON `complaints` (`priority`);
CREATE INDEX `idx_complaints_category` ON `complaints` (`category`);
CREATE INDEX `idx_complaints_created` ON `complaints` (`created_at`);
CREATE INDEX `idx_complaints_assigned` ON `complaints` (`assigned_to`);
CREATE INDEX `idx_complaint_history_comp` ON `complaint_history` (`complaint_id`);
CREATE INDEX `idx_complaint_history_user` ON `complaint_history` (`changed_by`);
CREATE INDEX `idx_complaint_comments_comp` ON `complaint_comments` (`complaint_id`);
CREATE INDEX `idx_complaint_comments_user` ON `complaint_comments` (`user_id`);

-- ============================================================================
-- Migration Application Instructions:
-- mysql -u <username> -p <database_name> < database/migrations/phase8_complaints.sql
-- ============================================================================
