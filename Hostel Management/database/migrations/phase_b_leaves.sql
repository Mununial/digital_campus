-- Phase B: Student Leave Application System Migration

CREATE TABLE IF NOT EXISTS `leave_applications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `leave_number` VARCHAR(50) NOT NULL UNIQUE,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `leave_type` ENUM('HOME_LEAVE', 'MEDICAL_LEAVE', 'ACADEMIC_LEAVE', 'OTHER') NOT NULL DEFAULT 'HOME_LEAVE',
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `reason` TEXT NOT NULL,
    `destination_address` VARCHAR(255) NULL DEFAULT NULL,
    `emergency_phone` VARCHAR(20) NULL DEFAULT NULL,
    `document_url` VARCHAR(500) NULL DEFAULT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approved_by` INT NULL DEFAULT NULL,
    `approved_at` DATETIME NULL DEFAULT NULL,
    `rejection_reason` TEXT NULL DEFAULT NULL,
    `remarks` TEXT NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_leave_student_status` (`student_id`, `status`),
    INDEX `idx_leave_hostel_status` (`hostel_id`, `status`),
    INDEX `idx_leave_dates` (`start_date`, `end_date`),
    INDEX `idx_leave_number` (`leave_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
