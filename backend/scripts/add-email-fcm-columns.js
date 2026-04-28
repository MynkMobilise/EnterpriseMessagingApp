const mysql = require('mysql2/promise');
require('dotenv').config();

async function addEmailFcmColumns() {
  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('✅ Connected to database');

    // Check and add columns to messages table
    const messageColumns = [
      { name: 'recipient_email', type: 'VARCHAR(255)', after: 'recipient_phone' },
      { name: 'recipient_fcm_token', type: 'VARCHAR(500)', after: 'recipient_email' },
      { name: 'subject', type: 'VARCHAR(255)', after: 'content' },
    ];

    for (const col of messageColumns) {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'messages' 
        AND COLUMN_NAME = ?
      `, [process.env.DB_NAME, col.name]);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE messages 
          ADD COLUMN ${col.name} ${col.type} 
          AFTER ${col.after}
        `);
        console.log(`✅ Added column "${col.name}" to messages table`);
      } else {
        console.log(`✅ Column "${col.name}" already exists in messages table`);
      }
    }

    // Update channel ENUM in messages table
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN channel ENUM('whatsapp', 'sms', 'email', 'fcm') NOT NULL
    `);
    console.log('✅ Updated channel ENUM in messages table');

    // Update message_type ENUM in messages table
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN message_type ENUM('text', 'template', 'media', 'html') NOT NULL
    `);
    console.log('✅ Updated message_type ENUM in messages table');

    // Make recipient_phone nullable
    await connection.query(`
      ALTER TABLE messages 
      MODIFY COLUMN recipient_phone VARCHAR(20) NULL
    `);
    console.log('✅ Made recipient_phone nullable in messages table');

    // Check and add columns to templates table
    const templateColumns = [
      { name: 'html_body', type: 'TEXT', after: 'body' },
      { name: 'plain_text_body', type: 'TEXT', after: 'html_body' },
    ];

    for (const col of templateColumns) {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'templates' 
        AND COLUMN_NAME = ?
      `, [process.env.DB_NAME, col.name]);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE templates 
          ADD COLUMN ${col.name} ${col.type} 
          AFTER ${col.after}
        `);
        console.log(`✅ Added column "${col.name}" to templates table`);
      } else {
        console.log(`✅ Column "${col.name}" already exists in templates table`);
      }
    }

    // Update channel ENUM in templates table
    await connection.query(`
      ALTER TABLE templates 
      MODIFY COLUMN channel ENUM('whatsapp', 'sms', 'email', 'fcm', 'both') NOT NULL
    `);
    console.log('✅ Updated channel ENUM in templates table');

    // Check and add columns to organization_settings table
    const settingsColumns = [
      { name: 'email_provider', type: "ENUM('smtp', 'sendgrid', 'ses', 'mailgun', 'other')", after: 'sms_sender_id' },
      { name: 'email_from_address', type: 'VARCHAR(255)', after: 'email_provider' },
      { name: 'email_from_name', type: 'VARCHAR(255)', after: 'email_from_address' },
      { name: 'email_api_key_encrypted', type: 'TEXT', after: 'email_from_name' },
      { name: 'fcm_server_key_encrypted', type: 'TEXT', after: 'email_api_key_encrypted' },
      { name: 'fcm_project_id', type: 'VARCHAR(255)', after: 'fcm_server_key_encrypted' },
    ];

    for (const col of settingsColumns) {
      const [columns] = await connection.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'organization_settings' 
        AND COLUMN_NAME = ?
      `, [process.env.DB_NAME, col.name]);

      if (columns.length === 0) {
        await connection.query(`
          ALTER TABLE organization_settings 
          ADD COLUMN ${col.name} ${col.type} 
          AFTER ${col.after}
        `);
        console.log(`✅ Added column "${col.name}" to organization_settings table`);
      } else {
        console.log(`✅ Column "${col.name}" already exists in organization_settings table`);
      }
    }

    console.log('✅ All columns added successfully');

  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addEmailFcmColumns()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

