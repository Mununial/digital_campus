-- Phase 14: User Management, Authentication & Security Hardening Migration
USE `hostel_management`;

-- 1. Add must_change_password and last_login_at to users table
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `must_change_password` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN IF NOT EXISTS `last_login_at` TIMESTAMP NULL DEFAULT NULL AFTER `must_change_password`;

-- 2. Create security_audit_log table for tracking security events
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
    FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_actor` (`actor_id`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB;
