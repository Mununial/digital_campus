-- Migration for Phase 13: Student Allocation, Room/Bed Transfer & Checkout Management

USE `hostel_management`;

-- 1. Create student_allocations table
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
    `active_student_key` INT GENERATED ALWAYS AS (IF(status = 'ACTIVE', student_id, NULL)) STORED,
    `active_bed_key` INT GENERATED ALWAYS AS (IF(status = 'ACTIVE', bed_id, NULL)) STORED,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (`allocated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `unique_active_student_allocation` (`active_student_key`),
    UNIQUE KEY `unique_active_bed_allocation` (`active_bed_key`)
) ENGINE=InnoDB;

-- 2. Indexes for efficient lookup & scoping
CREATE INDEX idx_allocations_student ON student_allocations(student_id, status);
CREATE INDEX idx_allocations_hostel ON student_allocations(hostel_id, status);
CREATE INDEX idx_allocations_room ON student_allocations(room_id, status);
CREATE INDEX idx_allocations_bed ON student_allocations(bed_id, status);
CREATE INDEX idx_allocations_dates ON student_allocations(allocated_from, allocated_until);

-- 3. Backfill active allocations for existing students with assigned beds
INSERT INTO student_allocations (student_id, hostel_id, room_id, bed_id, allocated_from, status, allocated_by)
SELECT 
    s.id AS student_id,
    r.hostel_id AS hostel_id,
    b.room_id AS room_id,
    s.bed_id AS bed_id,
    COALESCE(s.admission_date, CURRENT_DATE) AS allocated_from,
    'ACTIVE' AS status,
    s.user_id AS allocated_by
FROM students s
JOIN beds b ON s.bed_id = b.id
JOIN rooms r ON b.room_id = r.id
WHERE s.bed_id IS NOT NULL AND s.status = 'ACTIVE'
ON DUPLICATE KEY UPDATE student_allocations.id = student_allocations.id;
