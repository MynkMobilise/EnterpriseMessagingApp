/**
 * Migration script to add sms_template_id column to templates table
 * 
 * Run this script to add the sms_template_id field for storing
 * DOT (Department of Telecom) approved template IDs for SMS templates.
 * 
 * Usage: node backend/scripts/migrate-add-sms-template-id.js
 */

require('dotenv').config();
const sequelize = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function migrate() {
  try {
    console.log('Starting migration: Add sms_template_id to templates table...');

    // Check if column already exists. With QueryTypes.SELECT sequelize.query
    // returns the rows array directly (not a [rows, metadata] tuple) — the
    // previous `const [results]` destructure grabbed only the first row,
    // which is why this script kept hitting "Duplicate column name".
    const rows = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'templates'
      AND COLUMN_NAME = 'sms_template_id'
    `, { type: QueryTypes.SELECT });

    if (rows.length > 0) {
      console.log('✓ Column sms_template_id already exists. Migration skipped.');
      process.exit(0);
    }

    // Add the column
    await sequelize.query(`
      ALTER TABLE templates 
      ADD COLUMN sms_template_id VARCHAR(255) NULL 
      COMMENT 'DOT (Department of Telecom) approved template ID for SMS'
      AFTER whatsapp_template_id
    `);

    console.log('✓ Successfully added sms_template_id column to templates table');

    // Add index for better query performance
    try {
      await sequelize.query(`
        CREATE INDEX idx_templates_sms_template_id ON templates(sms_template_id)
      `);
      console.log('✓ Successfully added index on sms_template_id');
    } catch (error) {
      // Index might already exist, that's okay
      if (error.message.includes('Duplicate key name')) {
        console.log('ℹ Index on sms_template_id already exists');
      } else {
        throw error;
      }
    }

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

