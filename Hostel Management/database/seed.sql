-- Seed script for College Hostel Management System

USE `hostel_management`;

-- 1. Seed Roles
INSERT INTO `roles` (`id`, `name`) VALUES
(1, 'SUPER_ADMIN'),
(2, 'SUPERINTENDENT'),
(3, 'STUDENT')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. Seed Hostels
INSERT INTO `hostels` (`id`, `name`, `code`, `gender`, `location`, `status`) VALUES
(1, 'BEC Boys Hostel 1', 'BBH1', 'MALE', 'North Campus, Block A', 'ACTIVE'),
(2, 'BEC Girls Hostel 1', 'BGH1', 'FEMALE', 'North Campus, Block B', 'ACTIVE'),
(3, 'BEC Boys Hostel', 'BBH', 'MALE', 'West Campus, Sector 1', 'ACTIVE'),
(4, 'BEC Kara Hostel', 'BKH', 'FEMALE', 'West Campus, Sector 2', 'ACTIVE'),
(5, 'Barmunda Boys Hostel', 'BMBH', 'MALE', 'Barmunda Sub-campus', 'ACTIVE'),
(6, 'Barmunda Girls Hostel', 'BMGH', 'FEMALE', 'Barmunda Sub-campus', 'ACTIVE')
ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`), 
    `code` = VALUES(`code`), 
    `gender` = VALUES(`gender`), 
    `location` = VALUES(`location`), 
    `status` = VALUES(`status`);

-- 3. Seed Users (Password is 'password123' for all)
INSERT INTO `users` (`id`, `role_id`, `username`, `email`, `password_hash`, `status`) VALUES
(1, 1, 'superadmin', 'admin@hostel.com', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'ACTIVE'),
(2, 2, 'warden', 'warden@hostel.com', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'ACTIVE'),
(3, 3, 'student', 'student@hostel.com', '$2a$10$4Jxpj3KHrl97nGMI.WCJY.t.cIrps9.jO01O0kYZNZ6X1RoTtCyWe', 'ACTIVE')
ON DUPLICATE KEY UPDATE
    `role_id` = VALUES(`role_id`),
    `username` = VALUES(`username`),
    `email` = VALUES(`email`),
    `password_hash` = VALUES(`password_hash`),
    `status` = VALUES(`status`);

-- 4. Seed Superintendent to Hostel Assignments
INSERT INTO `superintendent_hostels` (`id`, `user_id`, `hostel_id`) VALUES
(1, 2, 1), -- warden manages BEC Boys Hostel 1
(2, 2, 3)  -- warden also manages BEC Boys Hostel
ON DUPLICATE KEY UPDATE
    `user_id` = VALUES(`user_id`),
    `hostel_id` = VALUES(`hostel_id`);

-- 5. Seed Student Record details
INSERT INTO `students` (`id`, `user_id`, `student_id`, `roll_number`, `full_name`, `phone`, `email`, `branch`, `course`, `year`, `semester`, `bed_id`, `admission_date`, `status`) VALUES
(1, 3, 'STD2026001', 'CSE-2026-089', 'John Doe', '9876543210', 'student@hostel.com', 'Computer Science', 'B.Tech', 3, 5, NULL, '2024-07-15', 'ACTIVE')
ON DUPLICATE KEY UPDATE
    `user_id` = VALUES(`user_id`),
    `student_id` = VALUES(`student_id`),
    `roll_number` = VALUES(`roll_number`),
    `full_name` = VALUES(`full_name`),
    `phone` = VALUES(`phone`),
    `email` = VALUES(`email`),
    `branch` = VALUES(`branch`),
    `course` = VALUES(`course`),
    `year` = VALUES(`year`),
    `semester` = VALUES(`semester`),
    `bed_id` = VALUES(`bed_id`),
    `admission_date` = VALUES(`admission_date`),
    `status` = VALUES(`status`);

-- 6. Seed Sample Notices
INSERT INTO `notices` (`id`, `title`, `description`, `created_by`, `target_hostel_id`, `priority`, `status`, `created_at`, `expires_at`) VALUES
(1, 'Welcome to New Semester 2026', 'All resident students are requested to complete physical registration and submit clearance documents at the warden office before Friday.', 1, NULL, 'NORMAL', 'PUBLISHED', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)),
(2, 'Water Tank Cleaning Notice - BEC Boys', 'The overhead water tank for BEC Boys Hostel 1 will undergo deep cleaning on Sunday between 8:00 AM and 1:00 PM. Water supply will be paused during this period.', 2, 1, 'URGENT', 'PUBLISHED', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY)),
(3, 'Library Extension Hours Notice', 'The sub-campus study hall and library reading rooms will remain open until 11:00 PM during the mid-semester examination period.', 1, NULL, 'GENERAL', 'PUBLISHED', NOW(), DATE_ADD(NOW(), INTERVAL 14 DAY)),
(4, 'Upcoming Hostel Sports Tournament Draft', 'Draft announcement for the annual Inter-Hostel Table Tennis and Carrom Championship.', 2, 1, 'GENERAL', 'DRAFT', NULL, NULL)
ON DUPLICATE KEY UPDATE
    `title` = VALUES(`title`),
    `description` = VALUES(`description`),
    `created_by` = VALUES(`created_by`),
    `hostel_id` = VALUES(`hostel_id`),
    `priority` = VALUES(`priority`),
    `status` = VALUES(`status`),
    `published_at` = VALUES(`published_at`),
    `expires_at` = VALUES(`expires_at`);
-- 7. Seed Complaints
INSERT INTO `complaints` (`id`, `student_id`, `hostel_id`, `category`, `priority`, `title`, `description`, `status`, `assigned_to`, `resolution`, `resolved_at`, `closed_at`) VALUES
(1, 1, 1, 'PLUMBING', 'HIGH', 'Bathroom Water Leakage in Room 101', 'Continuous water dripping from the sink tap creating a puddle near the door.', 'IN_PROGRESS', 2, NULL, NULL, NULL),
(2, 1, 1, 'ELECTRICITY', 'URGENT', 'Study Light Socket Short Circuit', 'Power outlet sparking when plugging in laptop charger. Needs urgent repair.', 'OPEN', NULL, NULL, NULL, NULL),
(3, 1, 1, 'FAN_AC', 'MEDIUM', 'Ceiling Fan Making Loud Noise', 'Ceiling fan wobble and squeaking sound at high speed setting.', 'RESOLVED', 2, 'Tightened fan mounting brackets and lubricated motor bearing.', NOW(), NULL)
ON DUPLICATE KEY UPDATE
    `student_id` = VALUES(`student_id`),
    `hostel_id` = VALUES(`hostel_id`),
    `category` = VALUES(`category`),
    `priority` = VALUES(`priority`),
    `title` = VALUES(`title`),
    `description` = VALUES(`description`),
    `status` = VALUES(`status`),
    `assigned_to` = VALUES(`assigned_to`),
    `resolution` = VALUES(`resolution`),
    `resolved_at` = VALUES(`resolved_at`),
    `closed_at` = VALUES(`closed_at`);

-- 8. Seed Complaint History
INSERT INTO `complaint_history` (`id`, `complaint_id`, `changed_by`, `old_status`, `new_status`, `comment`) VALUES
(1, 1, 3, NULL, 'OPEN', 'Complaint submitted by student.'),
(2, 1, 2, 'OPEN', 'IN_PROGRESS', 'Maintenance warden assigned plumbing team.'),
(3, 3, 3, NULL, 'OPEN', 'Complaint submitted by student.'),
(4, 3, 2, 'OPEN', 'IN_PROGRESS', 'Assigned electrician.'),
(5, 3, 2, 'IN_PROGRESS', 'RESOLVED', 'Tightened fan mounting brackets and lubricated motor bearing.')
ON DUPLICATE KEY UPDATE
    `complaint_id` = VALUES(`complaint_id`),
    `changed_by` = VALUES(`changed_by`),
    `old_status` = VALUES(`old_status`),
    `new_status` = VALUES(`new_status`),
    `comment` = VALUES(`comment`);

-- 9. Seed Visits
INSERT INTO `visits` (`id`, `student_id`, `hostel_id`, `room_id`, `bed_id`, `visitor_name`, `visitor_phone`, `visitor_email`, `visitor_type`, `purpose`, `identification_type`, `identification_last4`, `visit_date`, `expected_check_in`, `expected_check_out`, `actual_check_in`, `actual_check_out`, `status`, `created_by`, `approved_by`) VALUES
(1, 1, 1, 1, 1, 'Robert Doe', '9876543210', 'robert.doe@example.com', 'PARENT', 'Delivering personal belongings and books.', 'Aadhaar', '4321', CURDATE(), CONCAT(CURDATE(), ' 10:00:00'), CONCAT(CURDATE(), ' 16:00:00'), CONCAT(CURDATE(), ' 10:15:00'), NULL, 'CHECKED_IN', 3, 2),
(2, 1, 1, 1, 1, 'Michael Smith', '9123456789', 'michael.s@example.com', 'RELATIVE', 'Family weekend visit.', 'Voter ID', '8765', CURDATE(), CONCAT(CURDATE(), ' 14:00:00'), CONCAT(CURDATE(), ' 17:00:00'), NULL, NULL, 'APPROVED', 3, 2),
(3, 1, 1, 1, 1, 'David Miller', '9988776655', NULL, 'FRIEND', 'Project collaboration meeting.', 'Driving License', '1234', CURDATE(), CONCAT(CURDATE(), ' 09:00:00'), CONCAT(CURDATE(), ' 12:00:00'), CONCAT(CURDATE(), ' 09:05:00'), CONCAT(CURDATE(), ' 11:45:00'), 'CHECKED_OUT', 3, 2)
ON DUPLICATE KEY UPDATE
    `student_id` = VALUES(`student_id`),
    `hostel_id` = VALUES(`hostel_id`),
    `visitor_name` = VALUES(`visitor_name`),
    `visitor_phone` = VALUES(`visitor_phone`),
    `visitor_type` = VALUES(`visitor_type`),
    `status` = VALUES(`status`),
    `actual_check_in` = VALUES(`actual_check_in`),
    `actual_check_out` = VALUES(`actual_check_out`);

-- 10. Seed Visitor History
INSERT INTO `visitor_history` (`id`, `visit_id`, `changed_by`, `old_status`, `new_status`, `comment`) VALUES
(1, 1, 3, NULL, 'REQUESTED', 'Visitor request submitted by student.'),
(2, 1, 2, 'REQUESTED', 'APPROVED', 'Approved by warden.'),
(3, 1, 2, 'APPROVED', 'CHECKED_IN', 'Visitor checked in at main gate.'),
(4, 2, 3, NULL, 'REQUESTED', 'Visitor request submitted by student.'),
(5, 2, 2, 'REQUESTED', 'APPROVED', 'Approved by warden.')
ON DUPLICATE KEY UPDATE
    `visit_id` = VALUES(`visit_id`),
    `changed_by` = VALUES(`changed_by`),
    `old_status` = VALUES(`old_status`),
    `new_status` = VALUES(`new_status`),
    `comment` = VALUES(`comment`);

-- 11. Seed Mess Menus
INSERT INTO `mess_menus` (`id`, `hostel_id`, `menu_date`, `meal_type`, `meal_name`, `description`, `is_available`, `created_by`) VALUES
(1, 1, CURDATE(), 'BREAKFAST', 'Idli, Sambar & Coconut Chutney', 'Freshly steamed rice idlis with hot sambar and fresh chutney', 1, 2),
(2, 1, CURDATE(), 'LUNCH', 'Steamed Rice, Dal Tadka, Mix Veg & Curd', 'Balanced thali with seasonal vegetables and fresh curd', 1, 2),
(3, 1, CURDATE(), 'SNACKS', 'Masala Tea & Veg Cutlets', 'Evening refreshment with hot tea', 1, 2),
(4, 1, CURDATE(), 'DINNER', 'Butter Roti, Paneer Butter Masala & Jeera Rice', 'Rich dinner spread with dessert gulab jamun', 1, 2),
(5, NULL, CURDATE(), 'LUNCH', 'Common Special Meal', 'Common university mess menu', 1, 1)
ON DUPLICATE KEY UPDATE
    `hostel_id` = VALUES(`hostel_id`),
    `menu_date` = VALUES(`menu_date`),
    `meal_type` = VALUES(`meal_type`),
    `meal_name` = VALUES(`meal_name`),
    `description` = VALUES(`description`),
    `is_available` = VALUES(`is_available`);

-- 12. Seed Meal Attendance
INSERT INTO `meal_attendance` (`id`, `student_id`, `hostel_id`, `meal_date`, `meal_type`, `status`) VALUES
(1, 1, 1, CURDATE(), 'BREAKFAST', 'TAKING'),
(2, 1, 1, CURDATE(), 'LUNCH', 'TAKING'),
(3, 1, 1, CURDATE(), 'SNACKS', 'NOT_TAKING'),
(4, 1, 1, CURDATE(), 'DINNER', 'TAKING')
ON DUPLICATE KEY UPDATE
    `student_id` = VALUES(`student_id`),
    `hostel_id` = VALUES(`hostel_id`),
    `meal_date` = VALUES(`meal_date`),
    `meal_type` = VALUES(`meal_type`),
    `status` = VALUES(`status`);


