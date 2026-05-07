/**
 * Migration: add SSO + welcome-email fields.
 *  organization_settings:
 *    + sso_enabled BOOLEAN NOT NULL DEFAULT 0
 *    + sso_secret_encrypted TEXT NULL
 *    + sso_default_role VARCHAR(50) NOT NULL DEFAULT 'operator'
 *  users:
 *    + auth_provider ENUM('local','sso') NOT NULL DEFAULT 'local'
 *    + last_sso_login_at DATETIME NULL
 * Idempotent — safe to re-run.
 */
const sequelize = require('../src/config/database');

async function migrate() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  console.log('Starting SSO/email schema migration...');

  // -- organization_settings --
  const [orgCols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organization_settings'
      AND COLUMN_NAME IN ('sso_enabled', 'sso_secret_encrypted', 'sso_default_role')
  `);
  const orgHas = (n) => orgCols.some((r) => r.COLUMN_NAME === n);

  if (!orgHas('sso_enabled')) {
    await qi.addColumn('organization_settings', 'sso_enabled', {
      type: sequelize.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    console.log('✅ organization_settings.sso_enabled');
  } else {
    console.log('⏭️  organization_settings.sso_enabled (exists)');
  }

  if (!orgHas('sso_secret_encrypted')) {
    await qi.addColumn('organization_settings', 'sso_secret_encrypted', {
      type: sequelize.Sequelize.TEXT,
      allowNull: true,
    });
    console.log('✅ organization_settings.sso_secret_encrypted');
  } else {
    console.log('⏭️  organization_settings.sso_secret_encrypted (exists)');
  }

  if (!orgHas('sso_default_role')) {
    await qi.addColumn('organization_settings', 'sso_default_role', {
      type: sequelize.Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'operator',
    });
    console.log('✅ organization_settings.sso_default_role');
  } else {
    console.log('⏭️  organization_settings.sso_default_role (exists)');
  }

  // -- users --
  const [userCols] = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('auth_provider', 'last_sso_login_at')
  `);
  const userHas = (n) => userCols.some((r) => r.COLUMN_NAME === n);

  if (!userHas('auth_provider')) {
    await qi.addColumn('users', 'auth_provider', {
      type: sequelize.Sequelize.ENUM('local', 'sso'),
      allowNull: false,
      defaultValue: 'local',
    });
    console.log('✅ users.auth_provider');
  } else {
    console.log('⏭️  users.auth_provider (exists)');
  }

  if (!userHas('last_sso_login_at')) {
    await qi.addColumn('users', 'last_sso_login_at', {
      type: sequelize.Sequelize.DATE,
      allowNull: true,
    });
    console.log('✅ users.last_sso_login_at');
  } else {
    console.log('⏭️  users.last_sso_login_at (exists)');
  }

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
