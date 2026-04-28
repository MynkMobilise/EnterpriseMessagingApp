/**
 * Migration script to add WhatsApp manual configuration fields to Railway database
 * Adds: whatsapp_app_id, whatsapp_app_secret, whatsapp_webhook_url
 */

require('dotenv').config({ path: '.env' });
const { Sequelize } = require('sequelize');

// Use Railway database credentials
const railwayConfig = {
  database: process.env.MYSQLDATABASE || process.env.RAILWAY_DB_NAME || 'railway',
  username: process.env.MYSQLUSER || process.env.RAILWAY_DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.RAILWAY_DB_PASSWORD || process.env.MYSQL_ROOT_PASSWORD,
  host: process.env.MYSQLHOST || process.env.RAILWAY_DB_HOST || 'shuttle.proxy.rlwy.net',
  port: parseInt(process.env.MYSQLPORT || process.env.RAILWAY_DB_PORT || '17433'),
  dialect: 'mysql',
  logging: console.log,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

console.log('Connecting to Railway database...');
console.log(`Host: ${railwayConfig.host}`);
console.log(`Port: ${railwayConfig.port}`);
console.log(`Database: ${railwayConfig.database}`);
console.log(`User: ${railwayConfig.username}`);

const sequelize = new Sequelize(railwayConfig);

async function migrate() {
  try {
    // Ensure database connection
    await sequelize.authenticate();
    console.log('✅ Connected to Railway database successfully');
    
    const queryInterface = sequelize.getQueryInterface();

    console.log('\nStarting migration: Add WhatsApp manual configuration fields...');

    // Check if columns already exist
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'organization_settings' 
      AND COLUMN_NAME IN ('whatsapp_app_id', 'whatsapp_app_secret', 'whatsapp_webhook_url')
    `);

    const existingColumns = results.map(r => r.COLUMN_NAME);
    console.log(`Found existing columns: ${existingColumns.join(', ') || 'none'}`);

    // Add whatsapp_app_id if it doesn't exist
    if (!existingColumns.includes('whatsapp_app_id')) {
      await queryInterface.addColumn('organization_settings', 'whatsapp_app_id', {
        type: Sequelize.STRING(255),
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
        type: Sequelize.TEXT,
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
        type: Sequelize.STRING(500),
        allowNull: true,
        after: 'whatsapp_webhook_verify_token',
      });
      console.log('✅ Added whatsapp_webhook_url column');
    } else {
      console.log('⏭️  whatsapp_webhook_url column already exists');
    }

    // Verify the columns were added
    const [verifyResults] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'organization_settings' 
      AND COLUMN_NAME IN ('whatsapp_app_id', 'whatsapp_app_secret', 'whatsapp_webhook_url')
      ORDER BY COLUMN_NAME
    `);

    console.log('\n📋 Verification:');
    verifyResults.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    console.log('\n✅ Migration completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();

