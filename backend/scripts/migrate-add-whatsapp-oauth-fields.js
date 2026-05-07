const sequelize = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function addWhatsAppOAuthFields() {
  try {
    console.log('Adding WhatsApp OAuth fields to organization_settings...');

    // Check and add columns one by one (MySQL doesn't support IF NOT EXISTS with ADD COLUMN)
    const columns = [
      { name: 'meta_oauth_access_token', type: 'TEXT' },
      { name: 'meta_oauth_refresh_token', type: 'TEXT' },
      { name: 'meta_oauth_expires_at', type: 'DATETIME' },
      { name: 'waba_linked_at', type: 'DATETIME' },
      { name: 'waba_linked_by', type: 'CHAR(36)' },
      { name: 'waba_linked_via', type: "ENUM('manual', 'oauth') DEFAULT 'manual'" },
    ];

    for (const col of columns) {
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'organization_settings'
        AND COLUMN_NAME = '${col.name}'
      `, { type: QueryTypes.SELECT });

      if (results.count === 0) {
        await sequelize.query(`
          ALTER TABLE organization_settings
          ADD COLUMN ${col.name} ${col.type}
        `, { type: QueryTypes.RAW });
        console.log(`  ✓ Added column: ${col.name}`);
      } else {
        console.log(`  - Column already exists: ${col.name}`);
      }
    }

    // Add foreign key for waba_linked_by
    await sequelize.query(`
      ALTER TABLE organization_settings
      ADD CONSTRAINT IF NOT EXISTS fk_waba_linked_by
      FOREIGN KEY (waba_linked_by) REFERENCES users(id) ON DELETE SET NULL
    `, { type: QueryTypes.RAW }).catch(() => {
      // Foreign key might already exist, ignore error
    });

    console.log('✅ OAuth fields added to organization_settings');

    console.log('Creating whatsapp_oauth_states table...');

    // Create whatsapp_oauth_states table.
    // PKs and FK targets are INT auto_increment after the int-pk refactor —
    // matching column types here is required for the FK constraint to attach.
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_oauth_states (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        state VARCHAR(255) NOT NULL UNIQUE,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_state (state),
        INDEX idx_organization_id (organization_id),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, { type: QueryTypes.RAW });

    console.log('✅ whatsapp_oauth_states table created successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

addWhatsAppOAuthFields();

