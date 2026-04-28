/**
 * Migration script to add tls_options column to email_configurations table
 * This allows per-configuration TLS settings for corporate mail servers
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function addTlsOptionsColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'email_configurations' 
      AND COLUMN_NAME = 'tls_options'
    `);

    if (results.length > 0) {
      console.log('⚠️  Column tls_options already exists. Skipping migration.\n');
      return;
    }

    // Add the column
    console.log('📦 Adding tls_options column to email_configurations table...');
    await sequelize.query(`
      ALTER TABLE email_configurations 
      ADD COLUMN tls_options JSON NULL 
      COMMENT 'TLS configuration options (e.g., { rejectUnauthorized: false })'
    `);
    console.log('✅ Column tls_options added successfully\n');

    console.log('🎉 Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addTlsOptionsColumn();

