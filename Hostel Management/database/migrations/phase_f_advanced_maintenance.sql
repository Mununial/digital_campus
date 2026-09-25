-- Phase F: Advanced Maintenance System Database Migration
-- Target Engine: MySQL 8.0+ / MariaDB (Hostinger Cloud MySQL)

USE `hostel_management`;

-- 1. Technicians Directory Table
CREATE TABLE IF NOT EXISTS `technicians` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NULL,
  `skill_category` ENUM('ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'FAN_AC', 'NETWORK', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
  `assigned_hostel_id` INT NULL,
  `status` ENUM('AVAILABLE', 'ON_JOB', 'ON_LEAVE', 'INACTIVE') DEFAULT 'AVAILABLE',
  `rating` DECIMAL(3,2) DEFAULT 5.00,
  `total_jobs_done` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`assigned_hostel_id`) REFERENCES `hostels`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Maintenance Request Upvotes Table (for duplicate resolution & student upvoting)
CREATE TABLE IF NOT EXISTS `maintenance_upvotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `maintenance_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance_requests`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_maint_user_upvote` (`maintenance_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add Technician ID & Duplicate Tracking Columns to maintenance_requests (safely ignore if columns already exist)
-- Column additions handled dynamically in migration script to avoid SQL syntax errors on existing databases.
