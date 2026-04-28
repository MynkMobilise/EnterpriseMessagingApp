/**
 * Migration script to add WhatsApp manual configuration fields
 * Adds: whatsapp_app_id, whatsapp_app_secret, whatsapp_webhook_url
 */

const sequelize = require('../src/config/database');

async function migrate() {
  // Ensure database connection
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('Starting migration: Add WhatsApp manual configuration fields...');

    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'organization_settings' 
      AND COLUMN_NAME IN ('whatsapp_app_id', 'whatsapp_app_secret', 'whatsapp_webhook_url')
    `);

    const existingColumns = results.map(r => r.COLUMN_NAME);

    // Add whatsapp_app_id if it doesn't exist
    if (!existingColumns.includes('whatsapp_app_id')) {
      await queryInterface.addColumn('organization_settings', 'whatsapp_app_id', {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true,
        after: 'whatsapp_access_token',
      });
      console.log('✅ Added whatsapp_app_id column');
    } else {
      console.log('⏭️  whatsapp_app_id column already exists');
    }

    // Add whatsapp_app_secret if it doesn't exist
    if (!existingColumns.includes('whatsapp_app_secret')) {
      await queryInterface.addColumn('organization_settings', 'whatsapp_app_secret', {
        type: sequelize.Sequelize.TEXT,
        allowNull: true,
        after: 'whatsapp_app_id',
      });
      console.log('✅ Added whatsapp_app_secret column');
    } else {
      console.log('⏭️  whatsapp_app_secret column already exists');
    }

    // Add whatsapp_webhook_url if it doesn't exist
    if (!existingColumns.includes('whatsapp_webhook_url')) {
      await queryInterface.addColumn('organization_settings', 'whatsapp_webhook_url', {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true,
        after: 'whatsapp_webhook_verify_token',
      });
      console.log('✅ Added whatsapp_webhook_url column');
    } else {
      console.log('⏭️  whatsapp_webhook_url column already exists');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

