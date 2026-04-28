/**
 * Migration: Add 'processing' status to delivery_status ENUM
 * 
 * This migration adds 'processing' as a valid value to the delivery_status ENUM
 * in the messages table. This status is used when a message is being actively
 * processed by the message worker.
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function migrate() {
  let connection;

  try {
    // Connect to database
    const dbConfig = {
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'enterprise_messaging',
    };

    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');

    // Check current ENUM values
    const [currentEnum] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'delivery_status'
    `, [dbConfig.database]);

    if (currentEnum.length === 0) {
      throw new Error('delivery_status column not found in messages table');
    }

    const currentType = currentEnum[0].COLUMN_TYPE;
    console.log('Current ENUM type:', currentType);

    // Check if 'processing' already exists
    if (currentType.includes("'processing'")) {
      console.log('✅ "processing" status already exists in ENUM');
      return;
    }

    // MySQL doesn't support direct ALTER to add ENUM values easily
    // We need to modify the column with all values
    const newEnumValues = "'queued','processing','sent','delivered','read','failed','cancelled'";
    
    console.log('Adding "processing" to delivery_status ENUM...');
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN delivery_status ENUM(${newEnumValues}) 
      DEFAULT 'queued' 
      NOT NULL
    `);

    console.log('✅ Successfully added "processing" status to delivery_status ENUM');

    // Verify the change
    const [updatedEnum] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'delivery_status'
    `, [dbConfig.database]);

    console.log('Updated ENUM type:', updatedEnum[0].COLUMN_TYPE);
    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;

