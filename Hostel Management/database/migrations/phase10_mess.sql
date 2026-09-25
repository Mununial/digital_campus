-- ============================================================================
-- PHASE 10: HOSTEL MESS & FOOD MANAGEMENT MIGRATION
-- ============================================================================

-- 1. Create Mess Menus Table
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
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX `idx_mess_menus_hostel_date` (`hostel_id`, `menu_date`),
    INDEX `idx_mess_menus_date_type` (`menu_date`, `meal_type`)
) ENGINE=InnoDB;

-- 2. Create Meal Participation / Attendance Table
-- Note: This is separate from hostel presence attendance (attendance table).
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
    UNIQUE KEY `uk_student_meal_date` (`student_id`, `meal_date`, `meal_type`),
    INDEX `idx_meal_att_hostel_date` (`hostel_id`, `meal_date`, `meal_type`),
    INDEX `idx_meal_att_student_date` (`student_id`, `meal_date`)
) ENGINE=InnoDB;
