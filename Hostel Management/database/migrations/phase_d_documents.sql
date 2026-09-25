-- Phase D: Certificate & Document Request System Migration

CREATE TABLE IF NOT EXISTS `document_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `request_number` VARCHAR(50) NOT NULL UNIQUE,
    `student_id` INT NOT NULL,
    `hostel_id` INT NOT NULL,
    `document_type` ENUM('HOSTEL_RESIDENCE', 'NO_DUES', 'BONAFIDE', 'MESS_CLEARANCE', 'CONDUCT_CERTIFICATE') NOT NULL DEFAULT 'HOSTEL_RESIDENCE',
    `purpose` TEXT NOT NULL,
    `academic_session` VARCHAR(50) NULL DEFAULT '2026-2027',
    `status` ENUM('PENDING', 'APPROVED', 'ISSUED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `certificate_number` VARCHAR(100) NULL DEFAULT NULL UNIQUE,
    `issued_at` DATETIME NULL DEFAULT NULL,
    `approved_by` INT NULL DEFAULT NULL,
    `approved_at` DATETIME NULL DEFAULT NULL,
    `rejection_reason` TEXT NULL DEFAULT NULL,
    `remarks` TEXT NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_doc_student_status` (`student_id`, `status`),
    INDEX `idx_doc_hostel_status` (`hostel_id`, `status`),
    INDEX `idx_doc_request_number` (`request_number`),
    INDEX `idx_doc_certificate_number` (`certificate_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
