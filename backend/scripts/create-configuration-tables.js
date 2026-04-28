/**
 * Migration script to create email_configurations and sms_configurations tables
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { EmailConfiguration, SmsConfiguration } = require('../src/models');

async function createTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Sync models (create tables if they don't exist)
    console.log('📦 Creating email_configurations table...');
    await EmailConfiguration.sync({ alter: true });
    console.log('✅ email_configurations table created\n');

    console.log('📦 Creating sms_configurations table...');
    await SmsConfiguration.sync({ alter: true });
    console.log('✅ sms_configurations table created\n');

    console.log('🎉 Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createTables();
