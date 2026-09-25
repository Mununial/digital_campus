-- ============================================================================
-- Phase 7 Migration: Hostel Notice & Communication System
-- Safe, Non-Destructive DDL Script
-- Target Database: MySQL 8.0+ / MariaDB 10.3+
-- ============================================================================

-- 1. Create 'notices' table if not exists
CREATE TABLE IF NOT EXISTS `notices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NOT NULL,
  `created_by` INT NOT NULL,
  `hostel_id` INT DEFAULT NULL COMMENT 'NULL indicates All-Hostels scope',
  `priority` ENUM('GENERAL', 'IMPORTANT', 'URGENT') NOT NULL DEFAULT 'GENERAL',
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `published_at` DATETIME DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`hostel_id`) REFERENCES `hostels`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create 'notice_reads' table if not exists
CREATE TABLE IF NOT EXISTS `notice_reads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `notice_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_notice_user_read` (`notice_id`, `user_id`),
  FOREIGN KEY (`notice_id`) REFERENCES `notices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Indexes for query optimization
CREATE INDEX `idx_notices_status_expires` ON `notices` (`status`, `expires_at`);
CREATE INDEX `idx_notices_hostel_id` ON `notices` (`hostel_id`);
CREATE INDEX `idx_notices_created_by` ON `notices` (`created_by`);
CREATE INDEX `idx_notice_reads_user_notice` ON `notice_reads` (`user_id`, `notice_id`);

-- ============================================================================
-- Migration Application Instructions:
-- 1. Connect to MySQL CLI: mysql -u <username> -p <database_name> < database/migrations/phase7_notices.sql
-- 2. Or execute in MySQL Workbench / DBeaver / phpMyAdmin.
-- Note: Uses IF NOT EXISTS to guarantee no data loss or overwrite of existing tables.
-- ============================================================================
