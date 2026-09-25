-- Phase 9: Visitor Management Migration Script
-- Creates visits and visitor_history tables with indexes and foreign keys

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
) ENGINE=InnoDB;

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
) ENGINE=InnoDB;

-- Indexes for optimal querying
CREATE INDEX idx_visits_student ON visits(student_id);
CREATE INDEX idx_visits_hostel ON visits(hostel_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_phone ON visits(visitor_phone);
CREATE INDEX idx_visits_created ON visits(created_at);
CREATE INDEX idx_visits_expected_out ON visits(expected_check_out);
CREATE INDEX idx_visitor_history_visit ON visitor_history(visit_id);
CREATE INDEX idx_visitor_history_user ON visitor_history(changed_by);
