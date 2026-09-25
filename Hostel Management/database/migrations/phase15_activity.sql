-- Phase 15: System Activity & Audit Center Schema Migration

CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  hostel_id INT NULL,
  student_id INT NULL,
  description TEXT NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE SET NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
  INDEX idx_activity_actor_created (actor_id, created_at),
  INDEX idx_activity_hostel_created (hostel_id, created_at),
  INDEX idx_activity_student_created (student_id, created_at),
  INDEX idx_activity_module_created (module, created_at),
  INDEX idx_activity_action_created (action, created_at),
  INDEX idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
