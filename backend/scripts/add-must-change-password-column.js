const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMustChangePasswordColumn() {
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

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'must_change_password'
    `, [process.env.DB_NAME]);

    if (columns.length > 0) {
      console.log('✅ Column "must_change_password" already exists');
      return;
    }

    // Add the column
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE 
      AFTER locked_until
    `);

    console.log('✅ Column "must_change_password" added successfully');

    // Update existing users to have must_change_password = false
    await connection.query(`
      UPDATE users 
      SET must_change_password = FALSE 
      WHERE must_change_password IS NULL
    `);

    console.log('✅ Updated existing users');

  } catch (error) {
    console.error('❌ Error adding column:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addMustChangePasswordColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

