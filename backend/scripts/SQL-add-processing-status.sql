-- Migration: Add 'processing' status to delivery_status ENUM
-- 
-- This SQL adds 'processing' as a valid value to the delivery_status ENUM
-- in the messages table. This status is used when a message is being actively
-- processed by the message worker.
--
-- Run this SQL on your Railway MySQL database

-- Check current ENUM values (for reference)
-- SELECT COLUMN_TYPE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND TABLE_NAME = 'messages' 
-- AND COLUMN_NAME = 'delivery_status';

-- Add 'processing' to the ENUM
ALTER TABLE messages 
MODIFY COLUMN delivery_status ENUM('queued','processing','sent','delivered','read','failed','cancelled') 
DEFAULT 'queued' 
NOT NULL;

-- Verify the change
-- SELECT COLUMN_TYPE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_SCHEMA = DATABASE()
-- AND TABLE_NAME = 'messages' 
-- AND COLUMN_NAME = 'delivery_status';

