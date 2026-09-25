-- Phase 16: Hostel Operations, Maintenance & Daily Task Management Schema Migration

-- 1. Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NOT NULL,
  floor_id INT NULL,
  room_id INT NULL,
  bed_id INT NULL,
  category ENUM(
    'ELECTRICAL', 'PLUMBING', 'FURNITURE', 'BED', 'ROOM',
    'BATHROOM', 'CLEANING', 'INTERNET', 'SAFETY', 'OTHER'
  ) NOT NULL DEFAULT 'OTHER',
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  status ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED') NOT NULL DEFAULT 'OPEN',
  reported_by INT NOT NULL,
  student_id INT NULL,
  assigned_to INT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL DEFAULT NULL,
  resolved_at TIMESTAMP NULL DEFAULT NULL,
  resolution_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_maint_hostel_status (hostel_id, status),
  INDEX idx_maint_student_status (student_id, status),
  INDEX idx_maint_priority_status (priority, status),
  INDEX idx_maint_assigned_status (assigned_to, status),
  INDEX idx_maint_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Maintenance Updates / Activity Timeline Table
CREATE TABLE IF NOT EXISTS maintenance_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  maintenance_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_maint_updates_maint (maintenance_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Room Inspections Table
CREATE TABLE IF NOT EXISTS room_inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NOT NULL,
  floor_id INT NOT NULL,
  room_id INT NOT NULL,
  inspected_by INT NOT NULL,
  inspection_date DATE NOT NULL,
  cleanliness_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  electrical_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  plumbing_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  furniture_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  bed_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  safety_status ENUM('GOOD', 'ATTENTION_REQUIRED', 'CRITICAL') NOT NULL DEFAULT 'GOOD',
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (inspected_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_insp_room_date (room_id, inspection_date),
  INDEX idx_insp_hostel_date (hostel_id, inspection_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
