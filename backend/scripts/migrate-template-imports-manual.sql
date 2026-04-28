-- Manual SQL script to create template_imports table
-- Run this in your MySQL database when VPN connection is available

CREATE TABLE IF NOT EXISTS template_imports (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin PRIMARY KEY,
  organization_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  imported_by CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  filename VARCHAR(255),
  file_size INT,
  channel ENUM('sms', 'whatsapp', 'email', 'fcm') NOT NULL,
  total_rows INT,
  successful_imports INT DEFAULT 0,
  failed_imports INT DEFAULT 0,
  duplicate_templates INT DEFAULT 0,
  status ENUM('processing', 'completed', 'failed') DEFAULT 'processing' NOT NULL,
  error_log JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  INDEX idx_organization_id (organization_id),
  INDEX idx_status (status),
  INDEX idx_channel (channel),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

