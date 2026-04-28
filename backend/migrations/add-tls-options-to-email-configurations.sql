-- Migration: Add tls_options column to email_configurations table
-- This allows per-configuration TLS settings for corporate mail servers with self-signed certificates

ALTER TABLE email_configurations 
ADD COLUMN tls_options JSON NULL 
COMMENT 'TLS configuration options (e.g., { rejectUnauthorized: false })';

