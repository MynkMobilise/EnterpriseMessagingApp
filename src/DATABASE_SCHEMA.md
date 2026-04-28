# 🗄️ Complete Database Schema - MySQL
## WhatsApp Business API Platform - All Tables

---

## 📋 Table of Contents

1. [Database Configuration](#database-configuration)
2. [Core Tables](#core-tables)
3. [User Management Tables](#user-management-tables)
4. [Settings Tables](#settings-tables)
5. [API Management Tables](#api-management-tables)
6. [Contact Management Tables](#contact-management-tables)
7. [Template Management Tables](#template-management-tables)
8. [Message Management Tables](#message-management-tables)
9. [Analytics & Reporting Tables](#analytics--reporting-tables)
10. [Indexes & Optimization](#indexes--optimization)

---

## Database Configuration

### MySQL Version
- **Minimum Version**: MySQL 8.0+
- **Engine**: InnoDB (for transaction support)
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci

### Database Creation

```sql
CREATE DATABASE whatsapp_business_platform
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE whatsapp_business_platform;
```

---

## Core Tables

### 1. Organizations Table

```sql
CREATE TABLE organizations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    industry VARCHAR(100),
    
    -- Plan & Billing
    plan ENUM('starter', 'professional', 'enterprise') NOT NULL DEFAULT 'starter',
    status ENUM('active', 'trial', 'suspended', 'cancelled') NOT NULL DEFAULT 'trial',
    trial_ends_at DATETIME,
    subscription_starts_at DATETIME,
    
    -- Quotas
    max_users INT DEFAULT 5,
    max_messages_per_month INT DEFAULT 1000,
    used_messages INT DEFAULT 0,
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    address TEXT,
    
    -- Metadata
    logo_url VARCHAR(500),
    settings JSON,
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Indexes
    INDEX idx_organizations_slug (slug),
    INDEX idx_organizations_status (status),
    INDEX idx_organizations_deleted_at (deleted_at),
    INDEX idx_organizations_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## User Management Tables

### 2. Users Table

```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    
    -- Basic Information
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Role & Status
    role ENUM('super_admin', 'admin', 'manager', 'operator', 'viewer') NOT NULL DEFAULT 'operator',
    status ENUM('active', 'inactive', 'suspended', 'pending') NOT NULL DEFAULT 'pending',
    
    -- Contact & Profile
    phone_number VARCHAR(50),
    avatar_url VARCHAR(500),
    department VARCHAR(100),
    job_title VARCHAR(100),
    
    -- Security
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at DATETIME,
    password_reset_token VARCHAR(255),
    password_reset_expires_at DATETIME,
    last_login_at DATETIME,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME,
    
    -- Permissions (JSON for flexibility)
    permissions JSON,
    
    -- Metadata
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_users_organization_id (organization_id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status),
    INDEX idx_users_deleted_at (deleted_at),
    UNIQUE KEY unique_email_per_org (email, organization_id, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. Sessions Table

```sql
CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    
    -- Token Information
    refresh_token VARCHAR(500) NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    
    -- Expiration
    expires_at DATETIME NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_refresh_token (refresh_token(255)),
    INDEX idx_sessions_expires_at (expires_at),
    INDEX idx_sessions_revoked_at (revoked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Settings Tables

### 4. Organization Settings Table

```sql
CREATE TABLE organization_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) UNIQUE NOT NULL,
    
    -- WhatsApp Settings
    whatsapp_business_account_id VARCHAR(255),
    whatsapp_phone_number_id VARCHAR(255),
    whatsapp_api_version VARCHAR(20) DEFAULT 'v18.0',
    whatsapp_webhook_verify_token VARCHAR(255),
    whatsapp_access_token TEXT,
    
    -- SMS Settings
    sms_provider ENUM('twilio', 'nexmo', 'aws_sns', 'other') DEFAULT NULL,
    sms_api_key_encrypted TEXT,
    sms_sender_id VARCHAR(20),
    
    -- Message Settings
    default_message_expiry_hours INT DEFAULT 24,
    require_message_approval BOOLEAN DEFAULT TRUE,
    auto_approve_templates BOOLEAN DEFAULT FALSE,
    max_message_length INT DEFAULT 1600,
    
    -- Notification Settings
    email_notifications BOOLEAN DEFAULT TRUE,
    webhook_notifications BOOLEAN DEFAULT TRUE,
    slack_webhook_url VARCHAR(500),
    
    -- Security Settings
    two_factor_required BOOLEAN DEFAULT FALSE,
    password_expiry_days INT DEFAULT 90,
    session_timeout_minutes INT DEFAULT 60,
    ip_whitelist JSON,
    
    -- Integration Settings
    erp_integrations JSON,
    webhook_endpoints JSON,
    
    -- Branding
    company_logo_url VARCHAR(500),
    brand_color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Metadata
    custom_settings JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_org_settings_organization_id (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 5. User Preferences Table

```sql
CREATE TABLE user_preferences (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) UNIQUE NOT NULL,
    
    -- UI Preferences
    theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    time_format ENUM('12h', '24h') DEFAULT '12h',
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    desktop_notifications BOOLEAN DEFAULT TRUE,
    message_approval_alerts BOOLEAN DEFAULT TRUE,
    daily_digest BOOLEAN DEFAULT FALSE,
    
    -- Dashboard Preferences
    default_dashboard VARCHAR(50) DEFAULT 'home',
    dashboard_widgets JSON,
    
    -- Metadata
    custom_preferences JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_prefs_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## API Management Tables

### 6. API Keys Table

```sql
CREATE TABLE api_keys (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    -- Key Information
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_hint VARCHAR(20) NOT NULL,
    
    -- Environment
    environment ENUM('production', 'development', 'staging') NOT NULL DEFAULT 'production',
    
    -- Permissions & Scope
    scopes JSON,
    rate_limit_per_minute INT DEFAULT 60,
    rate_limit_per_day INT DEFAULT 10000,
    
    -- Security
    status ENUM('active', 'inactive', 'revoked') NOT NULL DEFAULT 'active',
    allowed_ips JSON,
    
    -- Usage Tracking
    last_used_at DATETIME,
    last_used_ip VARCHAR(45),
    total_requests BIGINT DEFAULT 0,
    
    -- Expiration
    expires_at DATETIME,
    
    -- Metadata
    description TEXT,
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL DEFAULT NULL,
    revoked_by CHAR(36),
    revoked_reason TEXT,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (revoked_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_api_keys_organization_id (organization_id),
    INDEX idx_api_keys_key_prefix (key_prefix),
    INDEX idx_api_keys_status (status),
    INDEX idx_api_keys_environment (environment),
    INDEX idx_api_keys_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 7. API Key Usage Logs Table

```sql
CREATE TABLE api_key_usage_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    api_key_id CHAR(36) NOT NULL,
    
    -- Request Information
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    
    -- Tracking
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_size_bytes INT,
    response_size_bytes INT,
    response_time_ms INT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_api_usage_api_key_id (api_key_id),
    INDEX idx_api_usage_created_at (created_at),
    INDEX idx_api_usage_endpoint (endpoint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 8. API Rate Limits Table

```sql
CREATE TABLE api_rate_limits (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    api_key_id CHAR(36) NOT NULL,
    
    -- Window Information
    window_start DATETIME NOT NULL,
    window_type ENUM('minute', 'hour', 'day') NOT NULL,
    request_count INT DEFAULT 0,
    
    -- Foreign Keys
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_rate_limits_api_key (api_key_id),
    INDEX idx_rate_limits_window (window_start),
    UNIQUE KEY unique_rate_limit_window (api_key_id, window_start, window_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Contact Management Tables

### 9. Contacts Table

```sql
CREATE TABLE contacts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    -- Basic Information
    phone_number VARCHAR(20) NOT NULL,
    country_code VARCHAR(5),
    name VARCHAR(255),
    email VARCHAR(255),
    
    -- Additional Information
    company VARCHAR(255),
    job_title VARCHAR(100),
    department VARCHAR(100),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Status
    status ENUM('active', 'inactive', 'blocked', 'unsubscribed') NOT NULL DEFAULT 'active',
    opt_in_status ENUM('pending', 'opted_in', 'opted_out') DEFAULT 'pending',
    opt_in_date DATETIME,
    opt_out_date DATETIME,
    
    -- WhatsApp Status
    whatsapp_verified BOOLEAN DEFAULT FALSE,
    last_message_at DATETIME,
    total_messages_sent INT DEFAULT 0,
    total_messages_received INT DEFAULT 0,
    
    -- Custom Fields
    custom_fields JSON,
    
    -- Tags (stored as JSON array)
    tags JSON,
    
    -- Metadata
    source VARCHAR(50),
    notes TEXT,
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_contacts_organization_id (organization_id),
    INDEX idx_contacts_phone_number (phone_number),
    INDEX idx_contacts_email (email),
    INDEX idx_contacts_status (status),
    INDEX idx_contacts_created_at (created_at),
    INDEX idx_contacts_deleted_at (deleted_at),
    UNIQUE KEY unique_phone_per_org (organization_id, phone_number, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 10. Contact Groups Table

```sql
CREATE TABLE contact_groups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    -- Group Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    
    -- Dynamic Group (based on filters)
    is_dynamic BOOLEAN DEFAULT FALSE,
    filter_conditions JSON,
    
    -- Metadata
    contact_count INT DEFAULT 0,
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_groups_organization_id (organization_id),
    INDEX idx_groups_deleted_at (deleted_at),
    UNIQUE KEY unique_group_name_per_org (organization_id, name, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 11. Contact Group Memberships Table

```sql
CREATE TABLE contact_group_memberships (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    contact_id CHAR(36) NOT NULL,
    group_id CHAR(36) NOT NULL,
    
    -- Tracking
    added_by CHAR(36),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_memberships_contact_id (contact_id),
    INDEX idx_memberships_group_id (group_id),
    UNIQUE KEY unique_contact_group (contact_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 12. Contact Imports Table

```sql
CREATE TABLE contact_imports (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    imported_by CHAR(36) NOT NULL,
    
    -- File Information
    filename VARCHAR(255),
    file_size INT,
    total_rows INT,
    successful_imports INT DEFAULT 0,
    failed_imports INT DEFAULT 0,
    duplicate_contacts INT DEFAULT 0,
    
    -- Status
    status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
    error_log JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_imports_organization_id (organization_id),
    INDEX idx_imports_status (status),
    INDEX idx_imports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Template Management Tables

### 13. Templates Table

```sql
CREATE TABLE templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    channel ENUM('whatsapp', 'sms', 'both') NOT NULL,
    category ENUM('marketing', 'transactional', 'utility', 'authentication') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    
    -- Template Content
    subject VARCHAR(255),
    body TEXT NOT NULL,
    footer TEXT,
    header_type ENUM('text', 'image', 'video', 'document', 'location'),
    header_content TEXT,
    
    -- Variables/Parameters
    variables JSON,
    variable_count INT DEFAULT 0,
    
    -- Buttons (for WhatsApp)
    buttons JSON,
    
    -- WhatsApp Specific
    whatsapp_template_id VARCHAR(255),
    whatsapp_status ENUM('draft', 'pending', 'approved', 'rejected'),
    whatsapp_rejection_reason TEXT,
    
    -- Status & Approval
    status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'archived') NOT NULL DEFAULT 'draft',
    approved_by CHAR(36),
    approved_at DATETIME,
    rejected_by CHAR(36),
    rejected_at DATETIME,
    rejection_reason TEXT,
    
    -- Usage Statistics
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_read INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    last_used_at DATETIME,
    
    -- Metadata
    description TEXT,
    tags JSON,
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (rejected_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_templates_organization_id (organization_id),
    INDEX idx_templates_status (status),
    INDEX idx_templates_channel (channel),
    INDEX idx_templates_category (category),
    INDEX idx_templates_whatsapp_id (whatsapp_template_id),
    INDEX idx_templates_deleted_at (deleted_at),
    INDEX idx_templates_created_at (created_at),
    UNIQUE KEY unique_template_name (organization_id, name, channel, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 14. Template Versions Table

```sql
CREATE TABLE template_versions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    template_id CHAR(36) NOT NULL,
    version_number INT NOT NULL,
    
    -- Snapshot of template at this version
    body TEXT NOT NULL,
    variables JSON,
    buttons JSON,
    
    -- Change tracking
    changed_by CHAR(36),
    change_description TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_versions_template_id (template_id),
    UNIQUE KEY unique_template_version (template_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Message Management Tables

### 15. Messages Table

```sql
CREATE TABLE messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    
    -- Sender Information
    sent_by CHAR(36) NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Recipient
    contact_id CHAR(36),
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    
    -- Message Content
    channel ENUM('whatsapp', 'sms') NOT NULL,
    message_type ENUM('text', 'template', 'media') NOT NULL,
    template_id CHAR(36),
    
    -- Content
    content TEXT NOT NULL,
    media_url VARCHAR(500),
    media_type ENUM('image', 'video', 'document', 'audio'),
    
    -- Approval Workflow
    requires_approval BOOLEAN DEFAULT TRUE,
    approval_status ENUM('pending', 'approved', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    approved_by CHAR(36),
    approved_at DATETIME,
    rejected_by CHAR(36),
    rejected_at DATETIME,
    rejection_reason TEXT,
    expires_at DATETIME,
    
    -- Priority
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    
    -- Scheduling
    scheduled_for DATETIME,
    
    -- Delivery Status
    delivery_status ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'cancelled') DEFAULT 'queued',
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    failed_at DATETIME,
    failure_reason TEXT,
    
    -- External IDs
    external_message_id VARCHAR(255),
    
    -- Cost
    estimated_cost DECIMAL(10, 4),
    actual_cost DECIMAL(10, 4),
    
    -- Metadata
    category VARCHAR(50),
    is_bulk_message BOOLEAN DEFAULT FALSE,
    bulk_batch_id CHAR(36),
    metadata JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by) REFERENCES users(id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (rejected_by) REFERENCES users(id),
    
    -- Indexes
    INDEX idx_messages_organization_id (organization_id),
    INDEX idx_messages_contact_id (contact_id),
    INDEX idx_messages_sent_by (sent_by),
    INDEX idx_messages_approval_status (approval_status),
    INDEX idx_messages_delivery_status (delivery_status),
    INDEX idx_messages_scheduled_for (scheduled_for),
    INDEX idx_messages_created_at (created_at),
    INDEX idx_messages_bulk_batch (bulk_batch_id),
    INDEX idx_messages_channel (channel),
    INDEX idx_messages_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 16. Bulk Message Batches Table

```sql
CREATE TABLE bulk_message_batches (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    created_by CHAR(36) NOT NULL,
    
    -- Batch Information
    name VARCHAR(255),
    template_id CHAR(36),
    
    -- Statistics
    total_recipients INT,
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    
    -- Status
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES templates(id),
    
    -- Indexes
    INDEX idx_batches_organization_id (organization_id),
    INDEX idx_batches_status (status),
    INDEX idx_batches_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 17. Message Events Table

```sql
CREATE TABLE message_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    message_id CHAR(36) NOT NULL,
    
    -- Event Information
    event_type ENUM('sent', 'delivered', 'read', 'failed', 'clicked', 'bounced') NOT NULL,
    event_data JSON,
    
    -- Timestamp
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_events_message_id (message_id),
    INDEX idx_events_type (event_type),
    INDEX idx_events_occurred_at (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Analytics & Reporting Tables

### 18. Daily Message Stats Table

```sql
CREATE TABLE daily_message_stats (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    
    -- Date
    stat_date DATE NOT NULL,
    
    -- Channel
    channel ENUM('whatsapp', 'sms', 'all') NOT NULL,
    
    -- Message Counts
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_read INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    
    -- Costs
    total_cost DECIMAL(10, 2) DEFAULT 0,
    
    -- Rates
    delivery_rate DECIMAL(5, 2) DEFAULT 0,
    read_rate DECIMAL(5, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_daily_stats_org_date (organization_id, stat_date),
    INDEX idx_daily_stats_date (stat_date),
    UNIQUE KEY unique_daily_stat (organization_id, stat_date, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 19. User Activity Logs Table

```sql
CREATE TABLE user_activity_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    organization_id CHAR(36) NOT NULL,
    
    -- Activity Information
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id CHAR(36),
    
    -- Details
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Metadata
    metadata JSON,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_activity_user_id (user_id),
    INDEX idx_activity_organization_id (organization_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 20. Webhook Events Table

```sql
CREATE TABLE webhook_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    organization_id CHAR(36) NOT NULL,
    
    -- Event Information
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(50),
    
    -- Payload
    payload JSON,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at DATETIME,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_webhook_events_org_id (organization_id),
    INDEX idx_webhook_events_type (event_type),
    INDEX idx_webhook_events_processed (processed),
    INDEX idx_webhook_events_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Complete Table Summary

### Total Tables: 20

#### Core (1 table)
1. organizations

#### User Management (3 tables)
2. users
3. sessions
4. user_preferences

#### Settings (1 table)
5. organization_settings

#### API Management (3 tables)
6. api_keys
7. api_key_usage_logs
8. api_rate_limits

#### Contact Management (4 tables)
9. contacts
10. contact_groups
11. contact_group_memberships
12. contact_imports

#### Template Management (2 tables)
13. templates
14. template_versions

#### Message Management (3 tables)
15. messages
16. bulk_message_batches
17. message_events

#### Analytics & Reporting (3 tables)
18. daily_message_stats
19. user_activity_logs
20. webhook_events

---

## Indexes & Optimization

### Index Strategy

1. **Primary Keys**: All tables use UUID (CHAR(36)) as primary keys
2. **Foreign Keys**: All foreign keys are indexed automatically
3. **Compound Indexes**: Used for common query patterns
4. **JSON Columns**: Used for flexible metadata storage
5. **Soft Deletes**: `deleted_at` column indexed for performance

### Performance Optimization

```sql
-- Enable Query Cache (if needed)
SET GLOBAL query_cache_size = 1048576;

-- Optimize Table Sizes
OPTIMIZE TABLE messages;
OPTIMIZE TABLE message_events;
OPTIMIZE TABLE api_key_usage_logs;

-- Analyze Tables Regularly
ANALYZE TABLE messages;
ANALYZE TABLE contacts;
ANALYZE TABLE templates;
```

---

## Data Retention & Archival

```sql
-- Archive old message events (older than 90 days)
CREATE TABLE message_events_archive LIKE message_events;

-- Move old data to archive
INSERT INTO message_events_archive 
SELECT * FROM message_events 
WHERE occurred_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Delete archived data
DELETE FROM message_events 
WHERE occurred_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

## Backup Strategy

### Daily Backups
```bash
# Full database backup
mysqldump -u root -p whatsapp_business_platform > backup_$(date +%Y%m%d).sql

# Compressed backup
mysqldump -u root -p whatsapp_business_platform | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Table-Specific Backups
```bash
# Backup critical tables only
mysqldump -u root -p whatsapp_business_platform \
  organizations users messages templates contacts \
  > critical_backup_$(date +%Y%m%d).sql
```

---

**Database Schema Complete** ✅
**Total Tables**: 20
**Storage Engine**: InnoDB
**Character Set**: utf8mb4
**Ready for Production** 🚀
