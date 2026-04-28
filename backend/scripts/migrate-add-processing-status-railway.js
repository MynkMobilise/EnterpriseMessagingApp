/**
 * Migration: Add 'processing' status to delivery_status ENUM
 * 
 * This migration adds 'processing' as a valid value to the delivery_status ENUM
 * in the messages table. This status is used when a message is being actively
 * processed by the message worker.
 * 
 * This script is designed to run on Render/Production where Railway environment
 * variables are available, or locally if Railway variables are set.
 */

const mysql = require('mysql2/promise');

async function migrate() {
  let connection;

  try {
    // Use Railway environment variables (available on Render)
    // Fall back to DB_ variables if Railway vars not available
    const dbConfig = {
      host: process.env.MYSQLHOST || process.env.MYSQL_HOST || process.env.DB_HOST,
      port: parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
      user: process.env.MYSQLUSER || process.env.DB_USER,
      password: process.env.MYSQLPASSWORD || process.env.MYSQL_ROOT_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    };

    // Validate configuration
    if (!dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.password) {
      const missing = [];
      if (!dbConfig.host) missing.push('host (MYSQLHOST or DB_HOST)');
      if (!dbConfig.database) missing.push('database (MYSQLDATABASE or DB_NAME)');
      if (!dbConfig.user) missing.push('user (MYSQLUSER or DB_USER)');
      if (!dbConfig.password) missing.push('password (MYSQLPASSWORD or DB_PASSWORD)');
      throw new Error(`Database configuration incomplete. Missing: ${missing.join(', ')}. Please set Railway variables in Render environment variables.`);
    }

    console.log('Database configuration:', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password ? '***SET***' : 'NOT SET',
    });

    console.log('Connecting to Railway database...');
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      connectTimeout: 30000,
    });
    console.log('✅ Connected to Railway database');

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
      console.log('✅ Migration already completed - no action needed');
      return;
    }

    // MySQL doesn't support direct ALTER to add ENUM values easily
    // We need to modify the column with all values
    console.log('Adding "processing" to delivery_status ENUM...');
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN delivery_status ENUM('queued','processing','sent','delivered','read','failed','cancelled') 
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
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout - please ensure Railway database is accessible');
    }
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
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;

