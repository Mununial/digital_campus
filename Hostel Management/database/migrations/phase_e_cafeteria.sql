-- Phase E: Campus Cafeteria & Food Ordering System Database Migration
-- Target Engine: MySQL 8.0+ / MariaDB (Hostinger Cloud MySQL)

USE `hostel_management`;

-- 1. Cafeteria Menu Categories Table
CREATE TABLE IF NOT EXISTS `cafeteria_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `display_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Cafeteria Food Items Table
CREATE TABLE IF NOT EXISTS `cafeteria_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_vegetarian` TINYINT(1) DEFAULT 1,
  `image_url` VARCHAR(255) NULL,
  `is_available` TINYINT(1) DEFAULT 1,
  `preparation_time_mins` INT DEFAULT 15,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `cafeteria_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Cafeteria Orders Master Table
CREATE TABLE IF NOT EXISTS `cafeteria_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `hostel_id` INT NULL,
  `delivery_type` ENUM('PICKUP', 'ROOM_DELIVERY') DEFAULT 'PICKUP',
  `delivery_location` VARCHAR(255) NULL,
  `payment_method` ENUM('UPI', 'CASH', 'MESS_CREDIT') DEFAULT 'UPI',
  `payment_status` ENUM('PENDING', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('PLACED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED') DEFAULT 'PLACED',
  `special_instructions` TEXT NULL,
  `placed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `prepared_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Cafeteria Order Items Line Detail Table
CREATE TABLE IF NOT EXISTS `cafeteria_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `item_id` INT NOT NULL,
  `item_name` VARCHAR(150) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `cafeteria_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`item_id`) REFERENCES `cafeteria_items`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for high-performance querying
CREATE INDEX idx_cafeteria_items_cat ON `cafeteria_items`(`category_id`, `is_available`);
CREATE INDEX idx_cafeteria_orders_student ON `cafeteria_orders`(`student_id`, `status`);
CREATE INDEX idx_cafeteria_orders_num ON `cafeteria_orders`(`order_number`);
