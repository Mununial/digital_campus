-- ============================================================================
-- Phase 11 Migration: Hostel Fees & Payment Management
-- Non-destructive creation of fee tables and indexes
-- ============================================================================

CREATE TABLE IF NOT EXISTS fee_structures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hostel_id INT NULL COMMENT 'Null indicates globally applicable fee structure',
  fee_type ENUM('HOSTEL_FEE', 'MESS_FEE', 'MAINTENANCE_FEE', 'SECURITY_DEPOSIT', 'OTHER') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'YEARLY') NOT NULL DEFAULT 'YEARLY',
  academic_year VARCHAR(20) NOT NULL,
  applicable_course VARCHAR(50) NULL,
  applicable_branch VARCHAR(50) NULL,
  applicable_year INT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_fs_hostel_academic (hostel_id, academic_year),
  INDEX idx_fs_fee_type (fee_type),
  INDEX idx_fs_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_fees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  hostel_id INT NOT NULL,
  fee_structure_id INT NULL,
  academic_year VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL COMMENT 'Assigned snapshot amount',
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED') NOT NULL DEFAULT 'PENDING',
  waiver_reason TEXT NULL,
  waived_by INT NULL,
  waived_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT,
  FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE SET NULL,
  FOREIGN KEY (waived_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_sf_student_academic (student_id, academic_year),
  INDEX idx_sf_hostel_status (hostel_id, status),
  INDEX idx_sf_structure (fee_structure_id),
  INDEX idx_sf_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_fee_id INT NOT NULL,
  student_id INT NOT NULL,
  hostel_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER') NOT NULL,
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  transaction_reference VARCHAR(100) NULL,
  payment_date DATE NOT NULL,
  received_by INT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT,
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_fp_student_date (student_id, payment_date),
  INDEX idx_fp_hostel_date (hostel_id, payment_date),
  INDEX idx_fp_student_fee (student_fee_id),
  INDEX idx_fp_receipt (receipt_number),
  INDEX idx_fp_txn_ref (transaction_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fee_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_fee_id INT NOT NULL,
  changed_by INT NOT NULL,
  action ENUM('ASSIGNED', 'PAYMENT_RECORDED', 'WAIVED', 'UPDATED', 'CORRECTED') NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_fh_fee_date (student_fee_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
