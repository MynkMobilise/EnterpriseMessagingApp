/**
 * Migration: per-organization role permission overrides.
 *
 * Roles ship with sensible defaults (authService.getDefaultPermissions), but
 * admins of each org need to retune what their operators/managers can do.
 * This table stores per-org overrides; the middleware layers them between
 * the code defaults and per-user overrides.
 *
 * Schema:
 *   id              INT PK
 *   organization_id INT NOT NULL → organizations.id
 *   role            VARCHAR(32) NOT NULL  (super_admin, admin, manager, operator, viewer)
 *   permissions     JSON NOT NULL
 *   updated_by      INT NULL    → users.id
 *   updated_at      DATETIME
 *   UNIQUE (organization_id, role)
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Creating organization_role_permissions table…');

  const [tables] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organization_role_permissions'
  `);
  const exists = Array.isArray(tables) && tables.length > 0;

  if (!exists) {
    await qi.createTable('organization_role_permissions', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      organization_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organizations', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: sequelize.Sequelize.STRING(32),
        allowNull: false,
      },
      permissions: {
        type: sequelize.Sequelize.JSON,
        allowNull: false,
      },
      updated_by: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.NOW,
      },
    });
    console.log('  ✓ table created');
  } else {
    console.log('  ⏭️  table exists');
  }

  const [idx] = await sequelize.query(`
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organization_role_permissions'
  `);
  const idxNames = idx.map((r) => r.INDEX_NAME);

  if (!idxNames.includes('unique_org_role')) {
    await sequelize.query(`
      CREATE UNIQUE INDEX unique_org_role
        ON organization_role_permissions (organization_id, role)
    `);
    console.log('  ✓ unique_org_role');
  } else {
    console.log('  ⏭️  unique_org_role');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
