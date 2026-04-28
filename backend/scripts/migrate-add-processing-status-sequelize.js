/**
 * Migration: Add 'processing' status to delivery_status ENUM
 * 
 * This migration adds 'processing' as a valid value to the delivery_status ENUM
 * in the messages table. This status is used when a message is being actively
 * processed by the message worker.
 * 
 * Uses Sequelize connection to ensure it uses the same database config as the app.
 */

const sequelize = require('../src/config/database');

async function migrate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Get database name from connection
    const dbName = sequelize.config.database;
    console.log(`Using database: ${dbName}`);

    // Check current ENUM values
    const [currentEnum] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'delivery_status'
    `, {
      replacements: [dbName],
      type: sequelize.QueryTypes.SELECT,
    });

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
    console.log('Adding "processing" to delivery_status ENUM...');
    await sequelize.query(`
      ALTER TABLE messages 
      MODIFY COLUMN delivery_status ENUM('queued','processing','sent','delivered','read','failed','cancelled') 
      DEFAULT 'queued' 
      NOT NULL
    `);

    console.log('✅ Successfully added "processing" status to delivery_status ENUM');

    // Verify the change
    const [updatedEnum] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'messages' 
      AND COLUMN_NAME = 'delivery_status'
    `, {
      replacements: [dbName],
      type: sequelize.QueryTypes.SELECT,
    });

    console.log('Updated ENUM type:', updatedEnum[0].COLUMN_TYPE);
    console.log('✅ Migration completed successfully');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connection
    await sequelize.close();
    console.log('Database connection closed');
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

