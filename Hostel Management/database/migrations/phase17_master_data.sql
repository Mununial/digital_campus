-- Phase 17 Migration: Master Data Management & Data Integrity Center
-- Supports INACTIVE status on beds table if not already present

USE `hostel_management`;

-- Update beds status ENUM to include INACTIVE
ALTER TABLE `beds` MODIFY COLUMN `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE') DEFAULT 'AVAILABLE';
