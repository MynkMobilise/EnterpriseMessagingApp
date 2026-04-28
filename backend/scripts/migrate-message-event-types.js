/**
 * Migration script to update message_events table with new event types
 * 
 * This adds new event types: queued, processing, api_request, api_response,
 * provider_selected, fallback_attempted, retry_attempted, delivery_update
 */

require('dotenv').config();
const sequelize = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('Starting migration: Update message_events event_type enum...');

    // Get current enum values
    const [currentEnum] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'message_events' 
      AND COLUMN_NAME = 'event_type'
    `, { type: QueryTypes.SELECT });

    if (currentEnum) {
      console.log('Current enum values:', currentEnum.COLUMN_TYPE);
    }

    // MySQL doesn't support ALTER TYPE for ENUM, so we need to:
    // 1. Add a temporary column
    // 2. Copy data
    // 3. Drop old column
    // 4. Rename new column

    // Check if migration already done
    const [checkColumn] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'message_events' 
      AND COLUMN_NAME = 'event_type_new'
    `, { type: QueryTypes.SELECT });

    if (checkColumn) {
      console.log('✓ Migration already in progress or completed. Cleaning up...');
      
      // Try to complete the migration
      try {
        await sequelize.query(`ALTER TABLE message_events DROP COLUMN event_type`);
        await sequelize.query(`ALTER TABLE message_events CHANGE COLUMN event_type_new event_type ENUM('queued','processing','api_request','api_response','provider_selected','fallback_attempted','retry_attempted','delivery_update','sent','delivered','read','failed','clicked','bounced') NOT NULL`);
        console.log('✓ Migration completed successfully');
        process.exit(0);
      } catch (e) {
        console.log('Migration cleanup failed, continuing with full migration...');
      }
    }

    // Step 1: Add temporary column with new enum
    await sequelize.query(`
      ALTER TABLE message_events 
      ADD COLUMN event_type_new ENUM(
        'queued',
        'processing',
        'api_request',
        'api_response',
        'provider_selected',
        'fallback_attempted',
        'retry_attempted',
        'delivery_update',
        'sent',
        'delivered',
        'read',
        'failed',
        'clicked',
        'bounced'
      ) NOT NULL DEFAULT 'sent' AFTER message_id
    `);

    console.log('✓ Added temporary column');

    // Step 2: Copy data from old column to new
    await sequelize.query(`
      UPDATE message_events 
      SET event_type_new = event_type
      WHERE event_type IN ('sent', 'delivered', 'read', 'failed', 'clicked', 'bounced')
    `);

    console.log('✓ Copied existing data');

    // Step 3: Drop old column
    await sequelize.query(`ALTER TABLE message_events DROP COLUMN event_type`);

    console.log('✓ Dropped old column');

    // Step 4: Rename new column
    await sequelize.query(`
      ALTER TABLE message_events 
      CHANGE COLUMN event_type_new event_type ENUM(
        'queued',
        'processing',
        'api_request',
        'api_response',
        'provider_selected',
        'fallback_attempted',
        'retry_attempted',
        'delivery_update',
        'sent',
        'delivered',
        'read',
        'failed',
        'clicked',
        'bounced'
      ) NOT NULL
    `);

    console.log('✓ Renamed column');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate();

